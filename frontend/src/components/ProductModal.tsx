'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { X, Loader2, Sparkles } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  productToEdit?: Product | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState<number | string>(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(10);
  const [costPrice, setCostPrice] = useState<number | string>(99.99);
  const [supplierName, setSupplierName] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState<number | string>(20);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setQuantity(productToEdit.quantity);
      setLowStockThreshold(productToEdit.lowStockThreshold);
      setCostPrice(Number(productToEdit.costPrice));
      setSupplierName(productToEdit.supplierName);
      setReorderQuantity(productToEdit.reorderQuantity);
    } else {
      setName('');
      setSku('');
      setQuantity(15);
      setLowStockThreshold(10);
      setCostPrice(149.50);
      setSupplierName('Global Supply Co');
      setReorderQuantity(25);
    }
    setErrors({});
    setServerError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!sku.trim()) errs.sku = 'SKU is required';
    else if (!/^[A-Za-z0-9-_]+$/.test(sku.trim())) {
      errs.sku = 'SKU may only contain letters, numbers, hyphens, and underscores';
    }

    const q = Number(quantity);
    if (isNaN(q) || q < 0) errs.quantity = 'Quantity must be >= 0';

    const t = Number(lowStockThreshold);
    if (isNaN(t) || t < 0) errs.lowStockThreshold = 'Threshold must be >= 0';

    const cp = Number(costPrice);
    if (isNaN(cp) || cp <= 0) errs.costPrice = 'Cost price must be > 0';

    if (!supplierName.trim()) errs.supplierName = 'Supplier name is required';

    const rq = Number(reorderQuantity);
    if (isNaN(rq) || rq <= 0) errs.reorderQuantity = 'Reorder quantity must be > 0';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        quantity: Math.floor(Number(quantity)),
        lowStockThreshold: Math.floor(Number(lowStockThreshold)),
        costPrice: Number(Number(costPrice).toFixed(2)),
        supplierName: supplierName.trim(),
        reorderQuantity: Math.floor(Number(reorderQuantity)),
      };

      let result: Product;
      if (productToEdit) {
        result = await api.updateProduct(productToEdit.id, payload);
      } else {
        result = await api.createProduct(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred while saving.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(productToEdit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-black border border-zinc-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-black">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p className="text-xs text-zinc-500">
                {isEditing
                  ? 'Update product specs or stock threshold limits'
                  : 'Register inventory item with automated reorder metrics'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="p-3 text-xs font-mono font-medium text-black bg-zinc-100 border border-zinc-400 rounded-lg">
              ERROR: {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apple MacBook Pro 16 M3"
                className={`w-full px-3.5 py-2.5 bg-zinc-50 border rounded-lg text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black ${
                  errors.name ? 'border-black ring-1 ring-black' : 'border-zinc-300'
                }`}
              />
              {errors.name && <p className="text-xs text-black font-mono mt-1">{errors.name}</p>}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                SKU (Stock Keeping Unit) *
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. MBP-16-M3"
                className={`w-full px-3.5 py-2.5 bg-zinc-50 border rounded-lg text-sm font-mono text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black ${
                  errors.sku ? 'border-black ring-1 ring-black' : 'border-zinc-300'
                }`}
              />
              {errors.sku && <p className="text-xs text-black font-mono mt-1">{errors.sku}</p>}
            </div>

            {/* Supplier Name */}
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Supplier Name *
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Apple Global Logistics"
                className={`w-full px-3.5 py-2.5 bg-zinc-50 border rounded-lg text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black ${
                  errors.supplierName ? 'border-black ring-1 ring-black' : 'border-zinc-300'
                }`}
              />
              {errors.supplierName && (
                <p className="text-xs text-black font-mono mt-1">{errors.supplierName}</p>
              )}
            </div>

            {/* Current Stock */}
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Available Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-zinc-50 border rounded-lg text-sm font-mono text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black ${
                  errors.quantity ? 'border-black ring-1 ring-black' : 'border-zinc-300'
                }`}
              />
              {errors.quantity && (
                <p className="text-xs text-black font-mono mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Low Stock Threshold */}
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Low Stock Threshold *
              </label>
              <input
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-zinc-50 border rounded-lg text-sm font-mono text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black ${
                  errors.lowStockThreshold ? 'border-black ring-1 ring-black' : 'border-zinc-300'
                }`}
              />
              {errors.lowStockThreshold && (
                <p className="text-xs text-black font-mono mt-1">{errors.lowStockThreshold}</p>
              )}
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Cost Price (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className={`w-full pl-8 pr-3.5 py-2.5 bg-zinc-50 border rounded-lg text-sm font-mono text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black ${
                    errors.costPrice ? 'border-black ring-1 ring-black' : 'border-zinc-300'
                  }`}
                />
              </div>
              {errors.costPrice && (
                <p className="text-xs text-black font-mono mt-1">{errors.costPrice}</p>
              )}
            </div>

            {/* Reorder Quantity */}
            <div>
              <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                Reorder Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-zinc-50 border rounded-lg text-sm font-mono text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black ${
                  errors.reorderQuantity ? 'border-black ring-1 ring-black' : 'border-zinc-300'
                }`}
              />
              {errors.reorderQuantity && (
                <p className="text-xs text-black font-mono mt-1">{errors.reorderQuantity}</p>
              )}
            </div>
          </div>

          {/* Reorder Value Estimate Badge */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-mono">Estimated Reorder Total:</span>
            <span className="font-mono font-bold text-black">
              ${(Number(costPrice || 0) * Number(reorderQuantity || 0)).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-700 hover:text-black bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-mono uppercase tracking-wider font-bold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
