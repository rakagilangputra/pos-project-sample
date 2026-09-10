import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Calendar,
  AlertCircle,
  Building2,
  Check,
  Save,
  ArrowLeft,
  Search,
  Filter,
  Layers,
  History,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Category, Product, CategoryClosingSession, CategoryClosingItemRow } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { usePOS } from '../../context/POSContext';

interface CategoryClosingViewProps {
  initialCategoryId?: string;
  onBackToProducts: () => void;
}

export const CategoryClosingView: React.FC<CategoryClosingViewProps> = ({
  initialCategoryId,
  onBackToProducts,
}) => {
  const {
    categories,
    products,
    selectedBranch,
    isBranchReadOnly,
    currentUser,
    categoryClosings,
    submitCategoryClosing,
    saveCategoryClosingDraft,
  } = usePOS();

  // Active closing category ID being counted (or null to show category selection)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(initialCategoryId || null);
  const [closingDate, setClosingDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Session rows for the active category
  const [rows, setRows] = useState<CategoryClosingItemRow[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ready Stock products in active category (EXCLUDING MTO products as required!)
  const activeCategoryProducts = useMemo(() => {
    if (!activeCategoryId) return [];
    return products.filter((p) => p.category === activeCategoryId && !p.isMadeToOrder);
  }, [products, activeCategoryId]);

  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === activeCategoryId);
  }, [categories, activeCategoryId]);

  // When opening a category closing session, initialize rows
  const handleOpenCategoryClosing = (catId: string) => {
    setActiveCategoryId(catId);
    setStatusMessage(null);

    // Check if there is an existing draft for this category & branch today
    const existingDraft = categoryClosings.find(
      (c) => c.categoryId === catId && c.branchId === selectedBranch.id && c.status === 'draft'
    );

    const readyProds = products.filter((p) => p.category === catId && !p.isMadeToOrder);

    if (existingDraft) {
      setClosingDate(existingDraft.closingDate);
      setRows(existingDraft.rows);
    } else {
      const initialRows: CategoryClosingItemRow[] = readyProds.map((prod) => ({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        systemStock: prod.stock,
        actualClosingStock: prod.stock,
        variance: 0,
        remark: '',
      }));
      setRows(initialRows);
    }
  };

  const handleActualStockChange = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    const actual = isNaN(num) ? 0 : Math.max(0, num);

    setRows((prev) =>
      prev.map((row) => {
        if (row.productId !== productId) return row;
        const variance = actual - row.systemStock;
        return {
          ...row,
          actualClosingStock: actual,
          variance,
        };
      })
    );
  };

  const handleRemarkChange = (productId: string, remark: string) => {
    setRows((prev) =>
      prev.map((row) => (row.productId === productId ? { ...row, remark } : row))
    );
  };

  const handleSubmit = (isDraft: boolean) => {
    if (!activeCategoryId || !activeCategory) return;

    // Check remarks for non-zero variance when submitting (mandatory as per POS-US-069)
    if (!isDraft) {
      for (const row of rows) {
        if (row.variance !== 0 && !row.remark.trim()) {
          setStatusMessage({
            type: 'error',
            text: `Alasan selisih (remark) wajib diisi untuk produk "${row.productName}" (selisih: ${row.variance > 0 ? '+' : ''}${row.variance}).`,
          });
          return;
        }
      }
    }

    const session: CategoryClosingSession = {
      id: `cls-${selectedBranch.id}-${activeCategoryId}-${closingDate}`,
      branchId: selectedBranch.id,
      branchName: selectedBranch.name,
      categoryId: activeCategoryId,
      categoryName: activeCategory.name,
      closingDate,
      rows,
      status: isDraft ? 'draft' : 'submitted',
      createdAt: new Date().toISOString(),
    };

    if (isDraft) {
      const res = saveCategoryClosingDraft(session);
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      const res = submitCategoryClosing(session);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        setTimeout(() => {
          setActiveCategoryId(null);
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    }
  };

  const isInactive = isBranchReadOnly || selectedBranch.status === 'inactive';

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 space-y-4">
      {/* Top Banner / Inactive Mode Notice */}
      {isInactive && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              Cabang <strong>{selectedBranch.name}</strong> sedang nonaktif. Penutupan stok harian hanya dalam mode lihat (Hanya Baca).
            </span>
          </div>
        </div>
      )}

      {/* VIEW A: CATEGORY SELECTION LIST */}
      {!activeCategoryId ? (
        <div className="flex flex-1 flex-col overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DACE] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#2D241E]">
                  Penutupan Stok Harian per Kategori (Closing)
                </h3>
                <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] font-bold">
                  {selectedBranch.name}
                </span>
              </div>
              <p className="text-xs text-[#8C7B6C] mt-0.5">
                Hitung fisik barang Ready Stock di akhir shift/hari. Produk Made-to-Order otomatis dikecualikan.
              </p>
            </div>

            <button
              type="button"
              onClick={onBackToProducts}
              className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#6D5D50] hover:bg-[#FDFBF7] self-start transition"
            >
              Kembali ke Daftar Produk
            </button>
          </div>

          {/* Categories Grid (4 Cards per row on desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pr-0.5">
            {categories
              .filter((c) => c.id !== 'all')
              .map((cat) => {
                // Count Ready Stock products only!
                const readyCount = products.filter(
                  (p) => p.category === cat.id && !p.isMadeToOrder
                ).length;

                const hasDraft = categoryClosings.some(
                  (cls) => cls.categoryId === cat.id && cls.branchId === selectedBranch.id && cls.status === 'draft'
                );

                const lastSession = categoryClosings
                  .filter((cls) => cls.categoryId === cat.id && cls.branchId === selectedBranch.id && cls.status === 'submitted')
                  .sort((a, b) => new Date(b.submittedAt || '').getTime() - new Date(a.submittedAt || '').getTime())[0];

                return (
                  <div
                    key={cat.id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-3.5 shadow-xs hover:border-[#D97706] hover:shadow-sm transition group"
                  >
                    <div>
                      {/* Top Row: Icon + Title & Draft Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg border border-amber-200/80 group-hover:scale-105 transition">
                            {cat.icon || '🏷️'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-xs sm:text-sm text-[#2D241E] truncate group-hover:text-[#D97706] transition">
                              {cat.name}
                            </h4>
                            <span className="inline-block text-[10px] font-bold text-[#8C7B6C]">
                              {readyCount} SKU Ready
                            </span>
                          </div>
                        </div>

                        {hasDraft && (
                          <span className="shrink-0 rounded-md bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[9px] font-black">
                            Draft
                          </span>
                        )}
                      </div>

                      {/* Last Closing Metadata */}
                      {lastSession ? (
                        <div className="mt-2.5 rounded-xl bg-[#FDFBF7] border border-[#E5DACE]/80 px-2.5 py-1.5 text-[10px] text-[#8C7B6C] flex items-center justify-between">
                          <span className="truncate">Terakhir: <strong>{lastSession.closingDate}</strong></span>
                          <span className="text-[9px] text-[#8C7B6C] truncate ml-1">({lastSession.submittedBy})</span>
                        </div>
                      ) : (
                        <div className="mt-2.5 rounded-xl bg-[#FDFBF7]/50 border border-dashed border-[#E5DACE]/60 px-2.5 py-1.5 text-[10px] text-[#8C7B6C]/70">
                          Belum ada closing sebelumnya
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-3 pt-2.5 border-t border-[#E5DACE]/60">
                      <button
                        type="button"
                        onClick={() => handleOpenCategoryClosing(cat.id)}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#D97706] hover:bg-amber-700 active:bg-amber-800 px-3 py-2 text-xs font-black text-white shadow-xs active:scale-[0.98] transition cursor-pointer"
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Sesuaikan Stok Penutupan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bottom-Right Tutup button */}
          <div className="flex items-center justify-end border-t border-[#E5DACE] pt-3">
            <button
              type="button"
              onClick={onBackToProducts}
              className="rounded-xl border border-[#E5DACE] bg-white px-6 py-2 text-xs font-black text-[#2D241E] hover:bg-[#E5DACE] active:scale-95 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : (
        /* VIEW B: ACTIVE CATEGORY COUNTING SHEET */
        <div className="flex flex-1 flex-col overflow-hidden space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DACE] pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveCategoryId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-[#F5EFEB] transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="font-black text-base text-[#2D241E]">
                  Form Penutupan Fisik: {activeCategory?.name}
                </h3>
                <p className="text-xs text-[#8C7B6C]">
                  {selectedBranch.name} • Hanya produk Ready Stock • Tanggal:{' '}
                  <input
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="rounded-md border border-[#E5DACE] bg-white px-1.5 py-0.5 text-xs font-bold text-[#2D241E]"
                  />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isInactive}
                onClick={() => handleSubmit(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#6D5D50] hover:bg-amber-50 transition disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan Draft</span>
              </button>
              <button
                type="button"
                disabled={isInactive}
                onClick={() => handleSubmit(false)}
                className="flex items-center gap-1.5 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>Submit Penyesuaian</span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`rounded-2xl p-3 text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-y-auto rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs">
            {rows.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C7B6C]">
                Tidak ada produk Ready Stock pada kategori ini.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-[#FDFBF7] border-b-2 border-[#E5DACE] text-[11px] font-black uppercase text-[#8C7B6C]">
                  <tr>
                    <th className="py-3 px-3.5">Produk</th>
                    <th className="py-3 px-3 text-center w-24">Stok Sistem</th>
                    <th className="py-3 px-3 text-center w-32">Stok Fisik Aktual</th>
                    <th className="py-3 px-3 text-center w-24">Selisih</th>
                    <th className="py-3 px-3.5">Alasan Selisih (Remark Wajib Jika Selisih ≠ 0)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACE]/60">
                  {rows.map((row) => {
                    const isDiff = row.variance !== 0;
                    return (
                      <tr key={row.productId} className={isDiff ? 'bg-amber-50/40' : ''}>
                        <td className="py-2.5 px-3.5">
                          <div className="font-black text-[#2D241E]">{row.productName}</div>
                          <div className="text-[10px] text-[#8C7B6C] font-mono">{row.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-[#6D5D50]">
                          {row.systemStock} pcs
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            disabled={isInactive}
                            value={row.actualClosingStock}
                            onChange={(e) => handleActualStockChange(row.productId, e.target.value)}
                            className="w-20 rounded-xl border-2 border-[#E5DACE] bg-white px-2 py-1 text-center font-black text-[#2D241E] focus:border-[#D97706] focus:outline-none disabled:bg-gray-100"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-black">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs ${
                              row.variance > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.variance < 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'text-[#8C7B6C]'
                            }`}
                          >
                            {row.variance > 0 ? `+${row.variance}` : row.variance}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5">
                          <input
                            type="text"
                            disabled={isInactive}
                            value={row.remark}
                            onChange={(e) => handleRemarkChange(row.productId, e.target.value)}
                            placeholder={isDiff ? 'Wajib: contoh Rusak, Tertukar, Opname Dapur...' : 'Catatan opsional...'}
                            className={`w-full rounded-xl border px-3 py-1 text-xs focus:outline-none ${
                              isDiff && !row.remark.trim()
                                ? 'border-rose-300 bg-rose-50/50 text-[#2D241E] focus:border-rose-500'
                                : 'border-[#E5DACE] bg-[#FDFBF7] text-[#2D241E] focus:border-[#D97706]'
                            } disabled:bg-gray-100`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom-Right Tutup button */}
          <div className="flex items-center justify-end border-t border-[#E5DACE] pt-3">
            <button
              type="button"
              onClick={() => setActiveCategoryId(null)}
              className="rounded-xl border border-[#E5DACE] bg-white px-6 py-2 text-xs font-black text-[#2D241E] hover:bg-[#E5DACE] active:scale-95 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
