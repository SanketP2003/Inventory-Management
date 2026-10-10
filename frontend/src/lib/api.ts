import {
  Product,
  Reorder,
  ReorderStatus,
  ApiErrorResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorBody = data as ApiErrorResponse;
    const message = errorBody?.error?.message || response.statusText || 'Unknown API error occurred';
    const code = errorBody?.error?.code || 'UNKNOWN_ERROR';
    const details = errorBody?.error?.details;
    throw new ApiError(response.status, code, message, details);
  }

  return data as T;
}

export const api = {
  // Products
  async getProducts(): Promise<Product[]> {
    const res = await request<{ data: Product[] }>('/products');
    return res.data;
  },

  async getProduct(id: string): Promise<Product> {
    const res = await request<{ data: Product }>(`/products/${id}`);
    return res.data;
  },

  async createProduct(product: {
    name: string;
    sku: string;
    quantity: number;
    lowStockThreshold: number;
    costPrice: number;
    supplierName: string;
    reorderQuantity: number;
  }): Promise<Product> {
    const res = await request<{ data: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return res.data;
  },

  async updateProduct(
    id: string,
    product: Partial<{
      name: string;
      sku: string;
      quantity: number;
      lowStockThreshold: number;
      costPrice: number;
      supplierName: string;
      reorderQuantity: number;
    }>
  ): Promise<Product> {
    const res = await request<{ data: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
    return res.data;
  },

  async updateStock(id: string, quantity: number): Promise<Product> {
    const res = await request<{ data: Product }>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    return res.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Reorders
  async getReorders(params?: {
    status?: ReorderStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Reorder[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request(`/reorders${qs}`);
  },

  async getReorder(id: string): Promise<Reorder> {
    const res = await request<{ data: Reorder }>(`/reorders/${id}`);
    return res.data;
  },

  async approveReorder(id: string, otp: string): Promise<Reorder> {
    const res = await request<{ message: string; data: Reorder }>(`/reorders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
    });
    return res.data;
  },

  async resendOtp(id: string): Promise<{ message: string; expiresAt: string; devOtp?: string }> {
    return request(`/reorders/${id}/otp/resend`, {
      method: 'POST',
    });
  },

  // Health
  async getHealth(): Promise<{ status: string; database?: string; redis?: string }> {
    return request('/health');
  },
};
