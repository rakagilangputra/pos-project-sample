import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { formatDateTime } from '../../utils/formatters';

interface StockTransferViewProps {
  initialProductId?: string;
  onBackToProducts: () => void;
}

export const StockTransferView: React.FC<StockTransferViewProps> = ({
  initialProductId,
  onBackToProducts,
}) => {
  const {
    branches,
    selectedBranch,
    isBranchReadOnly,
    products,
    stockTransfers,
    createStockTransfer,
    receiveStockTransfer,
  } = usePOS();

  const [isCreateOpen, setIsCreateOpen] = useState(Boolean(initialProductId));
  const [targetBranchId, setTargetBranchId] = useState<string>(() => {
    const other = branches.find((b) => b.id !== selectedBranch.id && b.status === 'active');
    return other?.id || '';
  });
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [quantity, setQuantity] = useState<string>('5');
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

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranchId) {
      setStatusMsg({ type: 'error', text: 'Pilih cabang tujuan transfer.' });
      return;
    }
    if (!selectedProductId) {
      setStatusMsg({ type: 'error', text: 'Pilih produk yang akan ditransfer.' });
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setStatusMsg({ type: 'error', text: 'Jumlah transfer harus lebih dari 0.' });
      return;
    }

    const res = createStockTransfer({
      fromBranchId: selectedBranch.id,
      toBranchId: targetBranchId,
      productId: selectedProductId,
      quantity: qty,
      notes: notes.trim() || undefined,
    });

    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      setIsCreateOpen(false);
      setQuantity('5');
      setNotes('');
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  const handleReceive = (transferId: string) => {
    const res = receiveStockTransfer(transferId);
    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
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
              Cabang <strong>{selectedBranch.name}</strong> nonaktif. Operasi transfer dinonaktifkan (Hanya Baca).
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DACE] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base text-[#2D241E]">
              Transfer Stok Antar-Cabang (Mutasi Fisik)
            </h3>
            <span className="rounded-md bg-cyan-100 text-cyan-900 px-2 py-0.5 text-[11px] font-bold">
              {selectedBranch.name}
            </span>
          </div>
          <p className="text-xs text-[#8C7B6C] mt-0.5">
            Kirim stok berlebih atau terima kiriman barang antar cabang bakery. Produk Made-to-Order tidak dapat ditransfer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isCreateOpen && (
            <button
              type="button"
              disabled={isInactive}
              onClick={() => {
                setIsCreateOpen(true);
                if (!selectedProductId && readyStockProducts.length > 0) {
                  setSelectedProductId(readyStockProducts[0].id);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Transfer Stok</span>
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

      {/* CREATE TRANSFER FORM (PANEL) */}
      {isCreateOpen && (
        <form
          onSubmit={handleCreateTransfer}
          className="rounded-2xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-[#E5DACE] pb-2.5">
            <h4 className="font-black text-sm text-[#2D241E] flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#D97706]" />
              <span>Formulir Pengiriman Transfer Stok</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E]"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Source Branch */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Cabang Asal (Pengirim)</label>
              <input
                type="text"
                disabled
                value={selectedBranch.name}
                className="w-full rounded-xl border border-[#E5DACE] bg-gray-100 px-3 py-2 text-xs font-bold text-[#2D241E]"
              />
            </div>

            {/* Destination Branch */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Cabang Tujuan (Penerima) *</label>
              <select
                required
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:outline-none focus:border-[#D97706]"
              >
                <option value="">Pilih Cabang Tujuan</option>
                {branches
                  .filter((b) => b.id !== selectedBranch.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city}) {b.status === 'inactive' ? '— (Nonaktif)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Product (Ready Stock only!) */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">
                Produk Ready Stock * {selectedProduct ? `(Stok: ${selectedProduct.stock} pcs)` : ''}
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:outline-none focus:border-[#D97706]"
              >
                <option value="">Pilih Produk</option>
                {readyStockProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stok: {p.stock} pcs
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Jumlah Dikirim (pcs) *</label>
              <input
                type="number"
                min="1"
                max={selectedProduct?.stock || 999}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:outline-none focus:border-[#D97706]"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Catatan Pengiriman (Opsional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Titip kurir sore, permintaan tambahan roti..."
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-medium text-[#2D241E] focus:outline-none focus:border-[#D97706]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isInactive}
              className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              Kirim Transfer Stok
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#6D5D50] hover:bg-[#E5DACE] transition"
            >
              Tutup
            </button>
          </div>
        </form>
      )}

      {/* LIST OF TRANSFERS */}
      <div className="flex-1 overflow-y-auto rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs">
        {stockTransfers.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-[#8C7B6C]">
            <Truck className="h-10 w-10 opacity-30 mb-2 text-[#8C7B6C]" />
            <p className="font-black text-sm text-[#2D241E]">Belum Ada Riwayat Transfer Cabang</p>
            <p className="text-xs text-[#8C7B6C] max-w-sm mt-1">
              Klik "Buat Transfer Stok" untuk mengirim produk ready stock ke cabang lain.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-[#FDFBF7] border-b-2 border-[#E5DACE] text-[11px] font-black uppercase text-[#8C7B6C]">
              <tr>
                <th className="py-3 px-3.5">No. Dokumen</th>
                <th className="py-3 px-3">Produk</th>
                <th className="py-3 px-3">Cabang Pengirim</th>
                <th className="py-3 px-3">Cabang Penerima</th>
                <th className="py-3 px-3 text-center">Jumlah</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACE]/60">
              {stockTransfers.map((trf) => {
                const isOutgoing = trf.fromBranchId === selectedBranch.id;
                const isIncoming = trf.toBranchId === selectedBranch.id;

                return (
                  <tr key={trf.id} className="hover:bg-[#FDFBF7]/80 transition">
                    <td className="py-2.5 px-3.5">
                      <div className="font-mono font-black text-[#2D241E]">{trf.transferNo}</div>
                      <div className="text-[10px] text-[#8C7B6C]">{formatDateTime(trf.createdAt)}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-black text-[#2D241E]">{trf.productName}</div>
                      <div className="text-[10px] text-[#8C7B6C] font-mono">{trf.sku}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-[#2D241E]">
                        {isOutgoing && <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />}
                        <span>{trf.fromBranchName}</span>
                      </div>
                      <div className="text-[10px] text-[#8C7B6C]">Dibuat: {trf.createdBy}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-[#2D241E]">
                        {isIncoming && <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />}
                        <span>{trf.toBranchName}</span>
                      </div>
                      {trf.receivedBy && (
                        <div className="text-[10px] text-emerald-700">Diterima: {trf.receivedBy}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-black text-sm text-[#2D241E]">
                      {trf.quantity} pcs
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {trf.status === 'in_transit' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 text-cyan-900 px-2.5 py-0.5 text-[10px] font-black">
                          <Clock className="h-3 w-3" />
                          Dalam Pengiriman
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-[10px] font-black">
                          <CheckCircle2 className="h-3 w-3" />
                          Diterima
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-right">
                      {isIncoming && trf.status === 'in_transit' ? (
                        <button
                          type="button"
                          disabled={isInactive}
                          onClick={() => handleReceive(trf.id)}
                          className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-800 shadow-xs active:scale-95 transition disabled:opacity-50"
                        >
                          Terima Transfer
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#8C7B6C]">Selesai</span>
                      )}
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
          onClick={onBackToProducts}
          className="rounded-xl border border-[#E5DACE] bg-white px-6 py-2 text-xs font-black text-[#2D241E] hover:bg-[#E5DACE] active:scale-95 transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
