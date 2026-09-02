import React, { useState } from 'react';
import {
  Package,
  Plus,
  Minus,
  AlertTriangle,
  Search,
  CheckCircle2,
  X,
  SlidersHorizontal,
  History,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose }) => {
  const { products, manualAdjustStock, stockAdjustments, currentUser } = usePOS();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Adjustment state
  const [adjustType, setAdjustType] = useState<'increase' | 'decrease'>('increase');
  const [adjustQtyInput, setAdjustQtyInput] = useState<string>('5');
  const [adjustReason, setAdjustReason] = useState<string>('Restock Dapur Pagi');
  const [toastMsg, setToastMsg] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  if (!isOpen) return null;

  const filtered = products.filter((p) => {
    if (filter === 'low_stock' && (p.stock >= p.lowStockThreshold || p.stock <= 0)) return false;
    if (filter === 'out_of_stock' && p.stock > 0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseInt(adjustQtyInput || '0', 10);
    const res = manualAdjustStock(selectedProduct.id, adjustType, qty, adjustReason);
    if (res.success) {
      setToastMsg(res.message);
      setSelectedProduct(null);
      setTimeout(() => setToastMsg(''), 3000);
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Stok Produk & Penyesuaian Inventori</h3>
              <p className="text-xs text-amber-900 font-semibold">
                Pantau ketersediaan roti & sesuaikan stok fisik dengan alasan akuntabel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
            >
              <History className="h-4 w-4" />
              <span>{showHistory ? 'Daftar Produk' : 'Riwayat Koreksi'}</span>
            </button>
            <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        {!showHistory && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama roti atau SKU..."
                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-1.5 text-xs font-bold">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-xl px-3 py-2 transition ${
                  filter === 'all' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Semua ({products.length})
              </button>
              <button
                onClick={() => setFilter('low_stock')}
                className={`rounded-xl px-3 py-2 transition ${
                  filter === 'low_stock' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Menipis (&lt; Batas)
              </button>
              <button
                onClick={() => setFilter('out_of_stock')}
                className={`rounded-xl px-3 py-2 transition ${
                  filter === 'out_of_stock' ? 'bg-rose-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                Habis (0)
              </button>
            </div>
          </div>
        )}

        {toastMsg && (
          <div className="bg-emerald-100 border-b border-emerald-200 px-6 py-2.5 text-xs font-bold text-emerald-900 flex items-center justify-between">
            <span>{toastMsg}</span>
            <button onClick={() => setToastMsg('')}>✕</button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {showHistory ? (
            /* HISTORY OF MANUAL ADJUSTMENTS (POS-US-021) */
            <div className="space-y-3">
              <h4 className="text-base font-black text-gray-900">Riwayat Penyesuaian Stok Manual</h4>
              {stockAdjustments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Belum ada catatan koreksi stok manual.</p>
              ) : (
                stockAdjustments.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm">{rec.productName}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold ${
                            rec.type === 'increase' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.type === 'increase' ? `+${rec.quantity}` : `-${rec.quantity}`} pcs
                        </span>
                      </div>
                      <div className="text-gray-500 mt-1">
                        <span>Alasan: <strong className="text-gray-700">{rec.reason}</strong></span>
                        <span className="mx-2">•</span>
                        <span>Operator: {rec.adminName}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDateTime(rec.timestamp)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-gray-400 block">Perubahan Stok:</span>
                      <span className="font-black text-gray-900">{rec.previousStock} → {rec.resultingStock} pcs</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* PRODUCT INVENTORY LIST (POS-US-020) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((prod) => {
                const isOut = prod.stock <= 0;
                const isLow = !isOut && prod.stock < prod.lowStockThreshold;

                return (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 shadow-xs transition hover:border-amber-400"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-snug">{prod.name}</h4>
                        <span className="text-xs text-emerald-700 font-black">{formatIDR(prod.price)}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              isOut
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Stok: {prod.stock} pcs {isLow && `(Batas min: ${prod.lowStockThreshold})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedProduct(prod);
                        setAdjustQtyInput('5');
                        setAdjustType('increase');
                      }}
                      className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 shrink-0"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Sesuaikan</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADJUSTMENT MODAL (POS-US-021) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmAdjust}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Penyesuaian Stok Fisik</h3>
                <p className="text-xs text-gray-500">{selectedProduct.name}</p>
              </div>
              <span className="rounded-xl bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-800">
                Stok Saat Ini: {selectedProduct.stock} pcs
              </span>
            </div>

            {/* Type: Increase or Decrease */}
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setAdjustType('increase')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition ${
                  adjustType === 'increase' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Stok (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('decrease')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition ${
                  adjustType === 'decrease' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600'
                }`}
              >
                <Minus className="h-4 w-4" />
                <span>Kurangi Stok (-)</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Jumlah Penyesuaian (pcs) *
              </label>
              <input
                type="number"
                min="1"
                value={adjustQtyInput}
                onChange={(e) => setAdjustQtyInput(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-3 text-xl font-black text-gray-900 focus:border-amber-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Alasan Penyesuaian (Wajib Akuntabel) *
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  'Restock Dapur Pagi',
                  'Gosong / Rusak Saat Panggang',
                  'Kedaluwarsa (Expired)',
                  'Selisih Hitungan Fisik',
                  'Tester / Sampling Pelanggan',
                ].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAdjustReason(r)}
                    className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-amber-100"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Tulis alasan lain..."
                className="w-full rounded-xl border border-gray-300 p-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
              >
                Simpan Penyesuaian
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
