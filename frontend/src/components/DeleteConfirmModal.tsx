'use client';

import React, { useState } from 'react';
import { Product } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { AlertCircle, Loader2, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: (deletedId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      await api.deleteProduct(product.id);
      onSuccess(product.id);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to delete product.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-black border border-zinc-300">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Delete Product</h3>
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

        {/* Body */}
        <div className="p-6 space-y-4">
          {error ? (
            <div className="p-3 text-xs font-mono font-medium text-black bg-zinc-100 border border-zinc-400 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-black" />
              <div>{error}</div>
            </div>
          ) : (
            <p className="text-sm text-zinc-800">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-black">{product.name}</span>? This action cannot be undone.
            </p>
          )}

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs text-zinc-600 space-y-1 font-mono">
            <p>
              <strong className="text-black">Compliance Note:</strong> Products with existing active or historical reorders cannot be deleted to preserve inventory audit logs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-700 hover:text-black bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2 text-xs font-mono uppercase tracking-wider font-bold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Delete</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
