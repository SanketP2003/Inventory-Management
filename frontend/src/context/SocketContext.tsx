'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  LowStockEvent,
  ReorderUpdateEvent,
  NotificationItem,
} from '../lib/types';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface ToastMessage {
  id: string;
  type: 'alert' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

interface SocketContextType {
  socket: Socket | null;
  status: ConnectionStatus;
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastMessage[];
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  dismissToast: (id: string) => void;
  // Subscribers for live inventory & reorder table updates
  onLowStock: (listener: (event: LowStockEvent) => void) => () => void;
  onReorderUpdated: (listener: (event: ReorderUpdateEvent) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const lowStockListeners = useRef<Set<(event: LowStockEvent) => void>>(new Set());
  const reorderUpdateListeners = useRef<Set<(event: ReorderUpdateEvent) => void>>(new Set());

  const addToast = useCallback((toast: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id, timestamp: Date.now() };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const onLowStock = useCallback((listener: (event: LowStockEvent) => void) => {
    lowStockListeners.current.add(listener);
    return () => {
      lowStockListeners.current.delete(listener);
    };
  }, []);

  const onReorderUpdated = useCallback((listener: (event: ReorderUpdateEvent) => void) => {
    reorderUpdateListeners.current.add(listener);
    return () => {
      reorderUpdateListeners.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    s.on('connect', () => {
      setStatus('connected');
    });

    s.on('disconnect', () => {
      setStatus('disconnected');
    });

    s.on('connect_error', () => {
      setStatus('disconnected');
    });

    s.on('low-stock', (event: LowStockEvent) => {
      // 1. Notify listeners (e.g. inventory page table updater)
      lowStockListeners.current.forEach((fn) => fn(event));

      // 2. Add to live notification feed
      const notification: NotificationItem = {
        id: `low-${event.id}-${Date.now()}`,
        type: 'LOW_STOCK',
        title: `Low Stock Alert: ${event.name}`,
        message: `Current stock: ${event.quantity} units (Threshold: ${event.lowStockThreshold}). Automated reorder of ${event.reorderQuantity} units triggered.`,
        timestamp: event.timestamp || new Date().toISOString(),
        meta: event as unknown as Record<string, unknown>,
        read: false,
      };
      setNotifications((prev) => [notification, ...prev]);

      // 3. Show floating toast
      addToast({
        type: 'alert',
        title: '⚠️ Low Stock Detected',
        message: `${event.name} (${event.sku}) has reached ${event.quantity} units (Threshold: ${event.lowStockThreshold}).`,
      });
    });

    s.on('reorder-updated', (event: ReorderUpdateEvent) => {
      // 1. Notify listeners (e.g. reorders page table updater & inventory page)
      reorderUpdateListeners.current.forEach((fn) => fn(event));

      // 2. Add to live notification feed
      let title = `Reorder Status: ${event.status}`;
      let message = `Reorder for ${event.productName || 'product'} (${event.quantityOrdered} units) is now ${event.status}.`;
      let toastType: 'info' | 'success' | 'error' = 'info';

      if (event.status === 'PENDING_APPROVAL') {
        title = `Approval Required: $${Number(event.totalValue).toFixed(2)}`;
        message = `High-value reorder for ${event.supplierName} requires OTP approval. ${event.otp ? `[DEV OTP: ${event.otp}]` : ''}`;
        toastType = 'alert' as any;
      } else if (event.status === 'COMPLETED') {
        title = `Reorder Completed & Stock Replenished`;
        message = `Supplier ${event.supplierName} fulfilled ${event.quantityOrdered} units. Inventory has been updated!`;
        toastType = 'success';
      } else if (event.status === 'FAILED') {
        title = `Reorder Failed`;
        message = `Reorder failed after ${event.attempts} attempt(s). Reason: ${event.failureReason || 'Supplier API rejected'}`;
        toastType = 'error';
      }

      const notification: NotificationItem = {
        id: `reorder-${event.id}-${event.status}-${Date.now()}`,
        type: 'REORDER_STATUS',
        title,
        message,
        timestamp: event.updatedAt || new Date().toISOString(),
        meta: event as unknown as Record<string, unknown>,
        read: false,
      };
      setNotifications((prev) => [notification, ...prev]);

      // Toast for important status shifts
      if (['PENDING_APPROVAL', 'COMPLETED', 'FAILED'].includes(event.status)) {
        addToast({
          type: toastType,
          title,
          message,
        });
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [addToast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        status,
        notifications,
        unreadCount,
        toasts,
        markAllNotificationsRead,
        clearNotifications,
        dismissToast,
        onLowStock,
        onReorderUpdated,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
