import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  Building2,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { formatDateTime } from '../../utils/formatters';

interface BadStockViewProps {
  initialProductId?: string;
  onBackToProducts: () => void;
}

export const BadStockView: React.FC<BadStockViewProps> = ({
  initialProductId,
  onBackToProducts,
}) => {
  const {
    selectedBranch,
    isBranchReadOnly,
    products,
    badStocks,
    recordBadStock,
  } = usePOS();

  const [isFormOpen, setIsFormOpen] = useState(Boolean(initialProductId));
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [quantity, setQuantity] = useState<string>('2');
  const [reason, setReason] = useState<'expired' | 'damaged' | 'spoiled' | 'other'>('expired');
  const [disposition, setDisposition] = useState<'disposed' | 'returned_supplier'>('disposed');
  const [notes, setNotes] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ready Stock products in current branch only (MTO excluded!)
  const readyStockProducts = useMemo(() => {
    return products.filter((p) => !p.isMadeToOrder && p.stock > 0);
  }, [products]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const isInactive = isBranchReadOnly || selectedBranch.status === 'inactive';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setStatusMsg({ type: 'error', text: 'Pilih produk yang mengalami stok buruk.' });
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setStatusMsg({ type: 'error', text: 'Jumlah stok buruk harus lebih dari 0.' });
      return;
    }

    const res = recordBadStock({
      branchId: selectedBranch.id,
      productId: selectedProductId,
      quantity: qty,
      reason,
      disposition,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      setIsFormOpen(false);
      setQuantity('2');
      setNotes('');
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-6 space-y-4">
      {/* Top Banner / Inactive Mode Notice */}
      {isInactive && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              Cabang <strong>{selectedBranch.name}</strong> nonaktif. Pencatatan stok buruk dinonaktifkan (Hanya Baca).
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DACE] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base text-[#2D241E]">
              Stok Buruk & Kedaluwarsa (Disposisi / Afkir)
            </h3>
            <span className="rounded-md bg-rose-100 text-rose-900 px-2 py-0.5 text-[11px] font-bold">
              {selectedBranch.name}
            </span>
          </div>
          <p className="text-xs text-[#8C7B6C] mt-0.5">
            Pencatatan produk bakery basi, rusak fisik, atau expired. Mengurangi stok jual dan masuk audit disposisi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isFormOpen && (
            <button
              type="button"
              disabled={isInactive}
              onClick={() => {
                setIsFormOpen(true);
                if (!selectedProductId && readyStockProducts.length > 0) {
                  setSelectedProductId(readyStockProducts[0].id);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-rose-700 px-4 py-2 text-xs font-black text-white hover:bg-rose-800 shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Stok Buruk</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToProducts}
            className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#6D5D50] hover:bg-[#FDFBF7] transition"
          >
            Kembali ke Daftar Produk
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`rounded-2xl p-3 text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* RECORD BAD STOCK FORM */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-rose-200 pb-2.5">
            <h4 className="font-black text-sm text-rose-950 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-700" />
              <span>Formulir Pencatatan Stok Buruk / Kedaluwarsa</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E]"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Product (Ready Stock only) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">
                Pilih Produk Ready Stock *
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:outline-none focus:border-rose-600"
              >
                <option value="">Pilih Produk</option>
                {readyStockProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stok: {p.stock} pcs
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">
                Jumlah Rusak / Expired (pcs) *
              </label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.stock || 999}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:outline-none focus:border-rose-600"
              />
              {selectedProduct && (
                <span className="text-[10px] text-[#8C7B6C] block">
                  Maksimal: {selectedProduct.stock} pcs dari stok etalase
                </span>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Alasan Kerusakan *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:outline-none focus:border-rose-600"
              >
                <option value="expired">Kedaluwarsa (Melewati Batas Best Before)</option>
                <option value="spoiled">Basi / Tengik / Berjamur</option>
                <option value="damaged">Rusak Fisik / Hancur / Defect Cetakan</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Disposition */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Tindakan / Disposisi *</label>
              <select
                value={disposition}
                onChange={(e) => setDisposition(e.target.value as any)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:outline-none focus:border-rose-600"
              >
                <option value="disposed">Dimusnahkan / Dibuang (Afkir)</option>
                <option value="returned_supplier">Retur ke Supplier Konsinyasi</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Catatan Tambahan (Opsional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Ditemukan basi saat cek pagi, roti bantat..."
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-medium text-[#2D241E] focus:outline-none focus:border-rose-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isInactive}
              className="rounded-xl bg-rose-700 px-5 py-2 text-xs font-black text-white hover:bg-rose-800 shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              Simpan & Potong Stok Jual
            </button>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#6D5D50] hover:bg-[#E5DACE] transition"
            >
              Tutup
            </button>
          </div>
        </form>
      )}

      {/* LIST OF BAD STOCK RECORDS */}
      <div className="flex-1 overflow-y-auto rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs">
        {badStocks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-[#8C7B6C]">
            <AlertTriangle className="h-10 w-10 opacity-30 mb-2 text-[#8C7B6C]" />
            <p className="font-black text-sm text-[#2D241E]">Belum Ada Catatan Stok Buruk</p>
            <p className="text-xs text-[#8C7B6C] max-w-sm mt-1">
              Semua produk di cabang ini dalam kondisi baik atau belum pernah diafkir.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#FDFBF7] border-b-2 border-[#E5DACE] text-[11px] font-black uppercase text-[#8C7B6C]">
              <tr>
                <th className="py-3 px-3.5">No. Dokumen</th>
                <th className="py-3 px-3">Produk</th>
                <th className="py-3 px-3 text-center">Jumlah</th>
                <th className="py-3 px-3">Alasan Kerusakan</th>
                <th className="py-3 px-3">Tindakan</th>
                <th className="py-3 px-3">Pencatat</th>
                <th className="py-3 px-3.5">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACE]/60">
              {badStocks.map((rec) => (
                <tr key={rec.id} className="hover:bg-[#FDFBF7]/80 transition">
                  <td className="py-2.5 px-3.5">
                    <div className="font-mono font-black text-[#2D241E]">{rec.recordNo}</div>
                    <div className="text-[10px] text-[#8C7B6C]">{formatDateTime(rec.createdAt)}</div>
                  </td>

                  <td className="py-2.5 px-3">
                    <div className="font-black text-[#2D241E]">{rec.productName}</div>
                    <div className="text-[10px] text-[#8C7B6C] font-mono">{rec.sku}</div>
                  </td>

                  <td className="py-2.5 px-3 text-center font-black text-sm text-rose-700">
                    -{rec.quantity} pcs
                  </td>

                  <td className="py-2.5 px-3">
                    <span className="inline-block rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-900">
                      {rec.reason === 'expired'
                        ? 'Kedaluwarsa'
                        : rec.reason === 'spoiled'
                        ? 'Basi / Jamur'
                        : rec.reason === 'damaged'
                        ? 'Rusak Fisik'
                        : 'Lainnya'}
                    </span>
                  </td>

                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 font-bold text-xs text-[#2D241E]">
                      {rec.disposition === 'disposed' ? (
                        <>
                          <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                          <span>Dimusnahkan</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 text-purple-700" />
                          <span>Retur Supplier</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-[#6D5D50] font-medium">
                    {rec.recordedBy}
                  </td>

                  <td className="py-2.5 px-3.5 text-[#8C7B6C]">
                    {rec.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  );
};
