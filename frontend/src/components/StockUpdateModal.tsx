'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { X, Layers, AlertTriangle, Loader2 } from 'lucide-react';

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: (updatedProduct: Product) => void;
}

export const StockUpdateModal: React.FC<StockUpdateModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number | string>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setQuantity(product.quantity);
      setError(null);
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentQty = product.quantity;
  const newQty = Number(quantity);
  const willTriggerLowStock =
    !isNaN(newQty) && newQty < product.lowStockThreshold;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(newQty) || newQty < 0) {
      setError('Quantity must be an integer greater than or equal to 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await api.updateStock(product.id, Math.floor(newQty));
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update stock.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-black border border-zinc-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Update Stock Level</h3>
              <p className="text-xs text-zinc-500 font-mono">{product.sku}</p>
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
          {error && (
            <div className="p-3 text-xs font-mono font-medium text-black bg-zinc-100 border border-zinc-400 rounded-lg">
              ERROR: {error}
            </div>
          )}

          <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-600">
              <span>Item:</span>
              <span className="text-black font-semibold">{product.name}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Current Stock:</span>
              <span className="text-black font-bold font-mono">{currentQty} units</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Low-Stock Threshold:</span>
              <span className="text-black font-bold font-mono">{product.lowStockThreshold} units</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
              New Available Quantity *
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-300 rounded-lg text-lg text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono text-center font-bold"
              />
            </div>
          </div>

          {/* Quick preset adjusters */}
          <div className="flex items-center justify-between gap-1.5">
            {[0, product.lowStockThreshold - 1, product.lowStockThreshold, product.lowStockThreshold + 10].map(
              (val, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuantity(Math.max(0, val))}
                  className="flex-1 py-1.5 text-[11px] bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 rounded-md transition-colors font-mono font-semibold shadow-sm"
                >
                  {val === product.lowStockThreshold - 1
                    ? 'Trigger Low'
                    : val === 0
                    ? 'Deplete (0)'
                    : `${val}`}
                </button>
              )
            )}
          </div>

          {willTriggerLowStock && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-100 border border-zinc-400 text-black text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 text-black mt-0.5" />
              <div>
                <p className="font-bold">Automated Reorder Trigger Notice</p>
                <p className="text-[11px] text-zinc-700 mt-0.5">
                  Stock falls below {product.lowStockThreshold}. An automated reorder of{' '}
                  <span className="font-bold text-black">{product.reorderQuantity} units</span> will be queued.
                </p>
              </div>
            </div>
          )}

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
                  <span>Updating...</span>
                </>
              ) : (
                <span>Confirm Update</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
