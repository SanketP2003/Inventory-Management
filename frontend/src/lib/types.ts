export type ReorderStatus =
  | 'PENDING_APPROVAL'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lowStockThreshold: number;
  costPrice: number | string;
  supplierName: string;
  reorderQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reorder {
  id: string;
  productId: string;
  quantityOrdered: number;
  supplierName: string;
  totalValue: number | string;
  status: ReorderStatus;
  otpHash?: string | null;
  otpExpiresAt?: string | null;
  otpAttempts: number;
  failureReason?: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
    costPrice: number | string;
    quantity?: number;
    lowStockThreshold?: number;
  };
}

export interface LowStockEvent {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  lowStockThreshold: number;
  reorderQuantity: number;
  timestamp: string;
}

export interface ReorderUpdateEvent {
  id: string;
  productId: string;
  productName?: string;
  sku?: string;
  quantityOrdered: number;
  supplierName: string;
  totalValue: number | string;
  status: ReorderStatus;
  failureReason?: string | null;
  attempts: number;
  approvedAt?: string | null;
  updatedAt: string;
  otp?: string;
}

export interface NotificationItem {
  id: string;
  type: 'LOW_STOCK' | 'REORDER_STATUS';
  title: string;
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
  read: boolean;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
