'use client';

import React from 'react';
import { useSocket, ToastMessage } from '../context/SocketContext';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
} from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useSocket();

  if (toasts.length === 0) return null;

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-5 h-5 text-black shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-black shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-black shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-black shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'alert':
        return 'border-black bg-white text-black ring-1 ring-black/10';
      case 'success':
        return 'border-zinc-300 bg-white text-black';
      case 'error':
        return 'border-black bg-zinc-50 text-black';
      case 'info':
      default:
        return 'border-zinc-300 bg-white text-black';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${getBorderColor(
            toast.type
          )}`}
        >
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-black tracking-tight font-mono">
              {toast.title}
            </h4>
            <p className="mt-1 text-xs text-zinc-600 leading-relaxed break-words">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 text-zinc-400 hover:text-black rounded-md transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
