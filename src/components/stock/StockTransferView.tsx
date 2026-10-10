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
  Search,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import type { StockTransferStatus } from '../../types';
import { usePOS } from '../../context/POSContext';
import { formatDateTime } from '../../utils/formatters';

interface StockTransferViewProps {
  initialProductId?: string;
  onBackToProducts: () => void;
}

// Match the local calendar day used by formatDateTime in the record list.
const transferDate = (timestamp: string) => {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

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
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StockTransferStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const isDateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const filteredTransfers = useMemo(() => stockTransfers.filter((transfer) => {
    if (isDateRangeInvalid) return false;
    if (filterStatus !== 'all' && transfer.status !== filterStatus) return false;
    if (dateFrom || dateTo) {
      const day = transferDate(transfer.createdAt);
      if (!day || (dateFrom && day < dateFrom) || (dateTo && day > dateTo)) return false;
    }
    const query = search.trim().toLowerCase();
    return !query || [transfer.transferNo, transfer.productName, transfer.sku, transfer.fromBranchName, transfer.toBranchName].some((value) => String(value || '').toLowerCase().includes(query));
  }), [stockTransfers, search, filterStatus, dateFrom, dateTo, isDateRangeInvalid]);

  const handleResetFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setDateFrom('');
    setDateTo('');
  };

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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-white p-4 sm:p-6">
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

      <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-[1_1_500px]">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-[#2D241E]">Transfer Stok Antar-Cabang (Mutasi Fisik)</h2>
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {selectedBranch.name} ({selectedBranch.city})
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#8C7B6C]">
            Kirim stok berlebih atau terima kiriman barang antar cabang bakery. Produk Made-to-Order tidak dapat ditransfer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isCreateOpen && (
            <button
              id="transfer-create-btn"
              type="button"
              disabled={isInactive}
              onClick={() => {
                setIsCreateOpen(true);
                if (!selectedProductId && readyStockProducts.length > 0) {
                  setSelectedProductId(readyStockProducts[0].id);
                }
              }}
              className="flex h-10 items-center gap-2 rounded-lg bg-[#D97706] px-4 text-xs font-black text-white shadow-xs transition hover:bg-amber-700 active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Transfer Stok</span>
            </button>
          )}
          <button type="button" onClick={onBackToProducts} className="flex h-10 items-center rounded-lg border border-[#E5DACE] bg-white px-4 text-xs font-bold text-[#6D5D50] transition hover:bg-[#FDFBF7]">
            Kembali ke Daftar Produk
          </button>
        </div>
      </header>

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

      <section aria-label="Filter transfer stok" className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative min-w-0 flex-[2_1_260px]">
            <span className="sr-only">Cari transfer stok</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7B6C]" aria-hidden="true" />
            <input id="transfer-search" type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nomor dokumen, produk, atau cabang..." className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white pl-9 pr-3 text-xs font-semibold text-[#2D241E] outline-none placeholder:text-[#8C7B6C] focus:border-[#D97706]" />
          </label>
          <label className="min-w-0 flex-[1_1_160px]">
            <span className="sr-only">Status transfer</span>
            <select id="transfer-status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as StockTransferStatus | 'all')} className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]">
              <option value="all">Status: Semua</option>
              <option value="in_transit">Dalam Pengiriman</option>
              <option value="received">Diterima</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </label>
          <fieldset className="min-w-0 flex-[2_1_260px]">
            <legend className="sr-only">Tanggal dokumen transfer</legend>
            <div className="flex items-center gap-2">
              <input id="transfer-date-from" type="date" aria-label="Tanggal transfer awal" aria-invalid={isDateRangeInvalid} aria-describedby={isDateRangeInvalid ? 'transfer-date-error' : undefined} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-[#E5DACE] bg-white px-2 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]" />
              <span className="text-xs text-[#8C7B6C]">–</span>
              <input id="transfer-date-to" type="date" aria-label="Tanggal transfer akhir" aria-invalid={isDateRangeInvalid} aria-describedby={isDateRangeInvalid ? 'transfer-date-error' : undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-[#E5DACE] bg-white px-2 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]" />
            </div>
          </fieldset>
          <button id="transfer-reset-filters" type="button" onClick={handleResetFilters} className="flex h-10 items-center gap-2 rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-bold text-[#2D241E] hover:bg-[#FDFBF7]">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset Filter
          </button>
        </div>
        {isDateRangeInvalid && <p id="transfer-date-error" role="alert" className="text-xs font-bold text-rose-700">Tanggal awal tidak boleh lebih besar dari tanggal akhir.</p>}
      </section>

      {/* CREATE TRANSFER FORM (PANEL) */}
      {isCreateOpen && (
        <div className="shrink-0">
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
        </div>
      )}

      {/* Existing transfer documents; filters only change what is displayed. */}
      <div id="transfer-record-list" className="min-h-[240px] min-w-0 flex-1 overflow-auto rounded-xl border border-[#E5DACE] bg-white">
        {filteredTransfers.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center p-6 text-center text-[#8C7B6C]">
            <Truck className="mb-2 h-10 w-10 text-[#8C7B6C] opacity-30" />
            <p className="text-sm font-black text-[#2D241E]">{stockTransfers.length === 0 ? 'Belum Ada Riwayat Transfer Cabang' : 'Tidak ada transfer yang sesuai filter'}</p>
            <p className="mt-1 max-w-sm text-xs">
              {stockTransfers.length === 0 ? 'Klik "Buat Transfer Stok" untuk mengirim produk ready stock ke cabang lain.' : 'Ubah pencarian, status, atau rentang tanggal untuk melihat transfer lainnya.'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-[#E5DACE] bg-[#FDFBF7] text-[10px] font-bold uppercase tracking-wide text-[#8C7B6C]">
              <tr>
                <th className="px-4 py-3">No. Dokumen</th>
                <th className="px-3 py-3">Produk</th>
                <th className="px-3 py-3">Cabang Pengirim</th>
                <th className="px-3 py-3">Cabang Penerima</th>
                <th className="px-3 py-3 text-center">Jumlah</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACE]/60">
              {filteredTransfers.map((trf) => {
                const isOutgoing = trf.fromBranchId === selectedBranch.id;
                const isIncoming = trf.toBranchId === selectedBranch.id;
                const product = products.find((candidate) => candidate.id === trf.productId) || products.find((candidate) => candidate.sku === trf.sku || candidate.name === trf.productName);
                const sourceBranch = branches.find((branch) => branch.id === trf.fromBranchId);
                const targetBranch = branches.find((branch) => branch.id === trf.toBranchId);
                return (
                  <tr key={trf.id} data-transfer-id={trf.id} className="transition hover:bg-[#FDFBF7]/80">
                    <td className="px-4 py-3.5">
                      <div className="whitespace-nowrap font-black text-[#2D241E]">{trf.transferNo}</div>
                      <div className="mt-1 text-[10px] text-[#8C7B6C]">{formatDateTime(trf.createdAt)}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex min-w-[190px] max-w-[260px] items-center gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5DACE] bg-[#FDFBF7]">
                          <Package className="h-5 w-5 text-[#8C7B6C]" aria-hidden="true" />
                          {product?.image && <img src={product.image} alt={trf.productName} className="absolute inset-0 h-full w-full rounded-lg object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black leading-relaxed text-[#2D241E]">{trf.productName}</div>
                          <div className="mt-1 text-[10px] font-semibold text-[#8C7B6C]">{trf.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-start gap-1.5 font-bold text-[#2D241E]">
                        {isOutgoing && <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />}
                        <span>{trf.fromBranchName}</span>
                      </div>
                      {sourceBranch?.address && <div className="mt-1 max-w-[210px] text-[10px] leading-relaxed text-[#8C7B6C]">{sourceBranch.address}</div>}
                      <div className="mt-1 text-[10px] text-[#8C7B6C]">Dibuat: {trf.createdBy}</div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-start gap-1.5 font-bold text-[#2D241E]">
                        {isIncoming && <ArrowDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                        <span>{trf.toBranchName}</span>
                      </div>
                      {targetBranch?.address && <div className="mt-1 max-w-[210px] text-[10px] leading-relaxed text-[#8C7B6C]">{targetBranch.address}</div>}
                      {trf.receivedBy && <div className="mt-1 text-[10px] text-emerald-700">Diterima: {trf.receivedBy}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-center text-sm font-black tabular-nums text-[#2D241E]">{trf.quantity} pcs</td>
                    <td className="px-3 py-3.5 text-center">
                      {trf.status === 'in_transit' ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-900">
                          <Clock className="h-3 w-3" />
                          Dalam Pengiriman
                        </span>
                      ) : trf.status === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-800">
                          <XCircle className="h-3 w-3" />
                          Dibatalkan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-900">
                          <CheckCircle2 className="h-3 w-3" />
                          Diterima
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isIncoming && trf.status === 'in_transit' ? (
                        <button
                          type="button"
                          disabled={isInactive}
                          onClick={() => handleReceive(trf.id)}
                          className="whitespace-nowrap rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-black text-white shadow-xs transition hover:bg-emerald-800 active:scale-95 disabled:opacity-50"
                        >
                          Terima Transfer
                        </button>
                      ) : <span className="text-[11px] text-[#8C7B6C]">{trf.status === 'received' ? 'Selesai' : '—'}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-[#8C7B6C]">Menampilkan {filteredTransfers.length} dari {stockTransfers.length} transfer stok</p>
        <button type="button" onClick={onBackToProducts} className="rounded-lg border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#2D241E] transition hover:bg-[#FDFBF7]">
          Tutup
        </button>
      </div>
    </div>
  );
};
