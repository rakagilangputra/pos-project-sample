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
  FolderPlus,
  PackagePlus,
  Building2,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddProduct?: () => void;
  onOpenAddCategory?: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  onOpenAddProduct,
  onOpenAddCategory,
}) => {
  const { products, manualAdjustStock, stockAdjustments } = usePOS();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'consignment'>('all');
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
    if (filter === 'consignment' && p.ownershipType !== 'consignment') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.sku.toLowerCase().includes(q) &&
        !(p.supplierName && p.supplierName.toLowerCase().includes(q))
      ) {
        return false;
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm">
      <div className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-amber-100/60 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-sm font-black">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2D241E]">Stok Produk & Penyesuaian Inventori</h3>
              <p className="text-xs text-[#8C7B6C] font-semibold">
                Pantau stok roti & sesuaikan stok fisik secara akuntabel (POS-US-021 & POS-US-029)
              </p>
            </div>
          </div>

          <button
            id="close-inventory-modal-btn"
            onClick={onClose}
            className="rounded-xl p-2 text-[#8C7B6C] hover:bg-[#E5DACE] hover:text-[#2D241E] transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab & Action Navigation Bar (aligned with Konsinyasi popup layout) */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-white px-6 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(false)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                !showHistory
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E]'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Daftar Produk ({products.length})</span>
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                showHistory
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E]'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Riwayat Koreksi</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddCategory && (
              <button
                id="inv-add-category-btn"
                onClick={onOpenAddCategory}
                className="flex items-center gap-1.5 rounded-xl border border-[#D97706] bg-amber-50 px-3 py-1.5 text-xs font-black text-[#D97706] hover:bg-amber-100 transition shadow-xs"
              >
                <FolderPlus className="h-4 w-4 text-[#D97706]" />
                <span className="hidden sm:inline">+ Kategori</span>
              </button>
            )}

            {onOpenAddProduct && (
              <button
                id="inv-add-product-btn"
                onClick={onOpenAddProduct}
                className="flex items-center gap-1.5 rounded-xl bg-[#D97706] px-3.5 py-1.5 text-xs font-black text-white hover:bg-amber-700 shadow-xs transition"
              >
                <PackagePlus className="h-4 w-4" />
                <span>+ Tambah Produk</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        {!showHistory && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E5DACE] bg-white px-6 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C7B6C]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama roti, SKU, atau supplier..."
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] pl-10 pr-4 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filter === 'all'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE]'
                }`}
              >
                Semua ({products.length})
              </button>
              <button
                onClick={() => setFilter('low_stock')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filter === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE]'
                }`}
              >
                Menipis
              </button>
              <button
                onClick={() => setFilter('out_of_stock')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filter === 'out_of_stock'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE]'
                }`}
              >
                Habis (0)
              </button>
              <button
                onClick={() => setFilter('consignment')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filter === 'consignment'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE]'
                }`}
              >
                🤝 Konsinyasi ({products.filter((p) => p.ownershipType === 'consignment').length})
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
              <h4 className="text-sm font-black text-[#2D241E]">Riwayat Penyesuaian Stok Manual</h4>
              {stockAdjustments.length === 0 ? (
                <p className="text-sm text-[#8C7B6C] text-center py-8">Belum ada catatan koreksi stok manual.</p>
              ) : (
                stockAdjustments.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-3.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#2D241E] text-sm">{rec.productName}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold ${
                            rec.type === 'increase' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.type === 'increase' ? `+${rec.quantity}` : `-${rec.quantity}`} pcs
                        </span>
                      </div>
                      <div className="text-[#8C7B6C] mt-1">
                        <span>Alasan: <strong className="text-[#2D241E]">{rec.reason}</strong></span>
                        <span className="mx-2">•</span>
                        <span>Operator: {rec.adminName}</span>
                        <span className="mx-2">•</span>
                        <span>{formatDateTime(rec.timestamp)}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[#8C7B6C] block text-[10px]">Perubahan Stok:</span>
                      <span className="font-black text-[#2D241E]">{rec.previousStock} → {rec.resultingStock} pcs</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((prod) => {
                const isOut = prod.stock <= 0;
                const isLow = prod.stock > 0 && prod.stock < prod.lowStockThreshold;
                const isConsignment = prod.ownershipType === 'consignment';

                return (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-3.5 transition hover:border-[#D97706] shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="h-14 w-14 rounded-xl object-cover border border-[#E5DACE]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[#2D241E] text-sm leading-snug">{prod.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-emerald-800 font-black">{formatIDR(prod.price)}</span>
                          <span className="text-[10px] text-[#8C7B6C] font-semibold">SKU: {prod.sku}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                              isOut
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Stok: {prod.stock} pcs
                          </span>

                          {isConsignment && (
                            <span className="rounded-full bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-black">
                              🤝 Konsinyasi: {prod.supplierName || 'Mitra'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedProduct(prod);
                        setAdjustQtyInput('5');
                        setAdjustType('increase');
                      }}
                      className="flex items-center gap-1 rounded-xl bg-[#D97706] px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 shrink-0"
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

        {/* Modal Footer with Close button (POS-US-040) */}
        <div className="border-t border-[#E5DACE] bg-white px-6 py-3 flex justify-end">
          <button
            id="inventory-modal-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* ADJUSTMENT MODAL (POS-US-021) */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmAdjust}
            className="w-full max-w-md rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
              <div>
                <h3 className="text-base font-black text-[#2D241E]">Penyesuaian Stok Fisik</h3>
                <p className="text-xs text-[#8C7B6C]">{selectedProduct.name}</p>
              </div>
              <span className="rounded-xl bg-white border border-[#E5DACE] px-2.5 py-1 text-xs font-bold text-[#2D241E]">
                Stok Saat Ini: {selectedProduct.stock} pcs
              </span>
            </div>

            {/* Type: Increase or Decrease */}
            <div className="grid grid-cols-2 gap-2 bg-white border border-[#E5DACE] p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setAdjustType('increase');
                  setAdjustReason('Restock Dapur Pagi');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  adjustType === 'increase'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-[#8C7B6C] hover:bg-[#FDFBF7]'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Stok (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustType('decrease');
                  setAdjustReason('Rusak / Basi / Defect');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  adjustType === 'decrease'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-[#8C7B6C] hover:bg-[#FDFBF7]'
                }`}
              >
                <Minus className="h-4 w-4" />
                <span>Kurangi Stok (-)</span>
              </button>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Jumlah Penyesuaian (pcs)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQtyInput}
                  onChange={(e) => setAdjustQtyInput(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-base font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>
              {/* Quick Qty Badges */}
              <div className="flex gap-1.5">
                {['1', '5', '10', '20', '50'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAdjustQtyInput(q)}
                    className="rounded-lg border border-[#E5DACE] bg-white px-2.5 py-1 text-xs font-bold text-[#8C7B6C] hover:border-[#D97706] hover:text-[#D97706]"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason (POS-US-021 AC-04) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Alasan Penyesuaian (Wajib & Diaudit)</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                {adjustType === 'increase' ? (
                  <>
                    <option value="Restock Dapur Pagi">Restock Dapur Pagi</option>
                    <option value="Produksi Tambahan Sore">Produksi Tambahan Sore</option>
                    <option value="Pengiriman Titipan Konsinyasi Masuk">Pengiriman Titipan Konsinyasi Masuk</option>
                    <option value="Koreksi Hitung Fisik (Opname +)">Koreksi Hitung Fisik (Opname +)</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                ) : (
                  <>
                    <option value="Rusak / Basi / Defect">Rusak / Basi / Defect</option>
                    <option value="Tester / Sampling Pelanggan">Tester / Sampling Pelanggan</option>
                    <option value="Retur Barang Konsinyasi ke Supplier">Retur Barang Konsinyasi ke Supplier</option>
                    <option value="Koreksi Hitung Fisik (Opname -)">Koreksi Hitung Fisik (Opname -)</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
              <button
                type="submit"
                className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition"
              >
                Simpan Penyesuaian
              </button>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
