'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '../../lib/types';
import { api, ApiError } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { ProductModal } from '../../components/ProductModal';
import { StockUpdateModal } from '../../components/StockUpdateModal';
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [productForStock, setProductForStock] = useState<Product | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const { onLowStock, onReorderUpdated } = useSocket();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch inventory products.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Real-time synchronization listeners
  useEffect(() => {
    const unsubLowStock = onLowStock((event) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === event.id
            ? { ...p, quantity: event.quantity, lowStockThreshold: event.lowStockThreshold }
            : p
        )
      );
    });

    const unsubReorder = onReorderUpdated((event) => {
      if (event.status === 'COMPLETED') {
        fetchProducts();
      }
    });

    return () => {
      unsubLowStock();
      unsubReorder();
    };
  }, [onLowStock, onReorderUpdated, fetchProducts]);

  // Derived stock status
  const getStockStatus = (p: Product): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' => {
    if (p.quantity === 0) return 'OUT_OF_STOCK';
    if (p.quantity < p.lowStockThreshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const getStockStatusBadge = (status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK') => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 text-black border border-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
            IN STOCK
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-black text-white border border-black shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" />
            LOW STOCK
          </span>
        );
      case 'OUT_OF_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-50 text-zinc-400 border border-zinc-200">
            <XCircle className="w-3.5 h-3.5 text-zinc-400" />
            DEPLETED
          </span>
        );
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

    const status = getStockStatus(p);
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const lowStockCount = products.filter((p) => p.quantity < p.lowStockThreshold && p.quantity > 0).length;
  const outOfStockCount = products.filter((p) => p.quantity === 0).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Stats Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
            <Boxes className="w-4 h-4 text-black" />
            <span>CATALOG & STOCKS</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black uppercase">
            Inventory Directory
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Real-time stock monitoring with automatic reorder triggers and pessimistic transaction locks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchProducts()}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-zinc-100 text-zinc-700 hover:text-black rounded-lg border border-zinc-300 transition-colors shadow-sm"
            title="Refresh inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setProductToEdit(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Total Items</span>
          <p className="text-2xl font-black font-mono text-black mt-1">{products.length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">In Stock</span>
          <p className="text-2xl font-black font-mono text-black mt-1">
            {products.length - lowStockCount - outOfStockCount}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Low Stock Alerts</span>
          <p className="text-2xl font-black font-mono text-black mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] font-mono uppercase text-zinc-500 font-semibold">Depleted / 0 Qty</span>
          <p className="text-2xl font-black font-mono text-zinc-400 mt-1">{outOfStockCount}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU, or supplier..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-300 rounded-lg text-xs font-mono text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
                statusFilter === filter
                  ? 'bg-black text-white font-bold shadow-sm'
                  : 'bg-white text-zinc-600 hover:text-black border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              {filter === 'ALL'
                ? 'All Items'
                : filter === 'IN_STOCK'
                ? 'In Stock'
                : filter === 'LOW_STOCK'
                ? 'Low Stock'
                : 'Depleted'}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-300 text-black text-xs font-mono flex items-center justify-between">
          <span>ERROR: {error}</span>
          <button
            onClick={() => fetchProducts()}
            className="underline font-bold hover:text-zinc-600"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase font-mono font-bold text-zinc-600 tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Available Quantity</th>
                <th className="px-6 py-4">Reorder Policy</th>
                <th className="px-6 py-4">Stock Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-black" />
                      <p className="text-xs font-mono">LOADING INVENTORY DATA...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-8 h-8 text-zinc-400" />
                      <p className="text-sm font-bold text-zinc-700 font-mono">NO PRODUCTS FOUND</p>
                      <p className="text-xs text-zinc-500">
                        {searchTerm
                          ? 'Try adjusting your search criteria.'
                          : 'Get started by creating your first inventory product.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const status = getStockStatus(p);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-zinc-50/80 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-black tracking-tight">
                            {p.name}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            Supplier: <span className="text-zinc-700">{p.supplierName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-zinc-800 font-bold">
                        {p.sku}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-base ${
                              p.quantity === 0
                                ? 'text-zinc-400 line-through'
                                : p.quantity < p.lowStockThreshold
                                ? 'text-black underline decoration-zinc-400'
                                : 'text-black'
                            }`}
                          >
                            {p.quantity}
                          </span>
                          <span className="text-xs text-zinc-500 font-mono">units</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-zinc-800 text-xs">
                          Threshold: {p.lowStockThreshold} units
                        </span>
                        <span className="block text-[11px] text-zinc-500 font-mono">
                          Reorder Qty: +{p.reorderQuantity}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {getStockStatusBadge(status)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setProductForStock(p);
                              setIsStockModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-black border border-zinc-300 text-xs font-mono uppercase transition-colors"
                            title="Update current stock"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Stock</span>
                          </button>

                          <button
                            onClick={() => {
                              setProductToEdit(p);
                              setIsProductModalOpen(true);
                            }}
                            className="p-1.5 rounded-md bg-white hover:bg-zinc-100 text-zinc-600 hover:text-black border border-zinc-200 transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setProductToDelete(p);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-md bg-white hover:bg-zinc-100 text-zinc-500 hover:text-black border border-zinc-200 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
        onSuccess={() => fetchProducts()}
      />

      <StockUpdateModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        product={productForStock}
        onSuccess={() => fetchProducts()}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        product={productToDelete}
        onSuccess={() => fetchProducts()}
      />
    </div>
  );
}
