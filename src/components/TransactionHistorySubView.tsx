import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Printer,
  Ban,
  RotateCcw,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  DollarSign,
  Filter,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Order, PaymentMethod } from '../types';
import { formatIDR, formatDateTime, posSound } from '../utils/formatters';
import { SupervisorPinModal } from './SupervisorPinModal';

interface TransactionHistorySubViewProps {
  onBackToCashier: () => void;
}

export const TransactionHistorySubView: React.FC<TransactionHistorySubViewProps> = ({
  onBackToCashier,
}) => {
  const {
    orders,
    currentUser,
    setActiveReceiptOrder,
    voidOrder,
    refundOrder,
    reprintReceipt,
    settleMadeToOrder,
  } = usePOS();

  const isCashier = currentUser.role === 'cashier';

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>(
    isCashier ? 'today' : 'today'
  );
  const [selectedCashier, setSelectedCashier] = useState<string>(
    isCashier ? currentUser.id : 'all'
  );

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Settlement for DP state (single modal)
  const [isSettling, setIsSettling] = useState(false);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('cash');

  // Refund state (single modal)
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('Pelanggan Membatalkan / Produk Rusak');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'qris' | 'deposit'>('cash');

  // Void state (single modal)
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidReasonInput, setVoidReasonInput] = useState('Salah Input Menu di Kasir');

  // Feedback toast
  const [feedback, setFeedback] = useState<string>('');

  // Supervisor PIN Modal
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onSuccess: (spvName: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onSuccess: () => {},
  });

  // Filter orders according to role and active filters (POS-US-048)
  const filteredOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    return orders.filter((o) => {
      // Cashier scope: restricted to own transactions today by default
      if (isCashier) {
        if (o.cashierId !== currentUser.id) return false;
        if (!o.createdAt.startsWith(todayStr)) return false;
      } else {
        // Management scope: apply date filter
        if (dateFilter === 'today' && !o.createdAt.startsWith(todayStr)) return false;
        if (dateFilter === '7days' && new Date(o.createdAt) < weekAgo) return false;
        if (dateFilter === '30days' && new Date(o.createdAt) < monthAgo) return false;

        // Cashier filter
        if (selectedCashier !== 'all' && o.cashierId !== selectedCashier) return false;
      }

      // Status filter
      if (filterStatus !== 'all' && o.orderStatus !== filterStatus) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchReceipt = o.receiptNumber.toLowerCase().includes(q);
        const matchCustomer = o.customer.name.toLowerCase().includes(q);
        const matchCashier = o.cashierName.toLowerCase().includes(q);
        if (!matchReceipt && !matchCustomer && !matchCashier) return false;
      }

      return true;
    });
  }, [orders, isCashier, currentUser.id, dateFilter, selectedCashier, filterStatus, search]);

  const uniqueCashiers = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => map.set(o.cashierId, o.cashierName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  const getGracePeriodRemaining = (createdAt: string): number => {
    const elapsedMinutes = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60);
    return Math.max(0, Math.ceil(5 - elapsedMinutes));
  };

  // Trigger Void flow (POS-US-016)
  const handleTriggerVoid = (order: Order) => {
    const remainingMin = getGracePeriodRemaining(order.createdAt);
    if (remainingMin <= 0) {
      setFeedback('Masa tenggang void (5 menit) sudah habis. Silakan lakukan proses Refund.');
      posSound.error();
      return;
    }

    setPinModal({
      isOpen: true,
      title: 'Otorisasi Void Transaksi',
      description: `Batalkan transaksi nota ${order.receiptNumber} (${formatIDR(order.total)}). Masukkan PIN Supervisor:`,
      onSuccess: () => {
        const res = voidOrder(order.id, voidReasonInput, '8888');
        setFeedback(res.message);
        setIsVoiding(false);
      },
    });
  };

  // Trigger Refund flow (POS-US-017)
  const handleTriggerRefund = (order: Order) => {
    const amt = parseInt(refundAmountInput || '0', 10);
    if (amt <= 0 || amt > order.paidAmount) {
      setFeedback('Jumlah refund tidak valid!');
      posSound.error();
      return;
    }

    setPinModal({
      isOpen: true,
      title: 'Otorisasi Refund / Retur Transaksi',
      description: `Pengembalian dana ${formatIDR(amt)} untuk nota ${order.receiptNumber}. Masukkan PIN Supervisor:`,
      onSuccess: () => {
        const res = refundOrder(order.id, amt, refundReasonInput, refundMethod, '8888');
        setFeedback(res.message);
        setIsRefunding(false);
      },
    });
  };

  // Trigger Settlement for Made-to-Order (POS-US-014)
  const handleTriggerSettlement = (order: Order) => {
    const res = settleMadeToOrder(order.id, {
      method: settleMethod,
      amount: order.remainingBalance,
      timestamp: new Date().toISOString(),
    });
    setFeedback(res.message);
    setIsSettling(false);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white border-2 border-[#E5DACE] rounded-[2rem] shadow-sm">
      {/* Sub-view Navigation Header with Breadcrumb & Back button (POS-US-048) */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-[#E5DACE] bg-amber-50/70 px-5 py-3.5 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="back-to-cashier-btn"
            onClick={onBackToCashier}
            className="flex items-center gap-1.5 rounded-xl border border-[#D97706] bg-white px-3 py-1.5 text-xs font-bold text-[#D97706] hover:bg-amber-50 active:scale-95 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kasir</span>
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-[#8C7B6C] font-semibold">
              <span>Kasir</span>
              <span>/</span>
              <span className="text-[#D97706] font-bold">Riwayat Transaksi</span>
            </div>
            <h2 className="text-base font-black text-[#2D241E]">
              Riwayat Transaksi & Nota Kasir
            </h2>
          </div>
        </div>

        {/* Scope pill */}
        <div className="flex items-center gap-2">
          {isCashier ? (
            <span className="rounded-xl border border-amber-300 bg-amber-100/70 px-3 py-1 text-xs font-bold text-amber-900">
              Shift Anda Hari Ini ({currentUser.name})
            </span>
          ) : (
            <span className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
              Akses Manajemen ({currentUser.role.toUpperCase()})
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] bg-[#FDFBF7] px-5 py-3 shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C7B6C]" />
          <input
            id="history-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no nota, pelanggan, atau kasir..."
            className="w-full rounded-xl border border-[#E5DACE] bg-white pl-10 pr-4 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
          />
        </div>

        {/* Management Date & Cashier Filters (hidden for cashier) */}
        {!isCashier && (
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
            >
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
              <option value="all">Semua Periode</option>
            </select>

            <select
              value={selectedCashier}
              onChange={(e) => setSelectedCashier(e.target.value)}
              className="rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
            >
              <option value="all">Semua Kasir</option>
              {uniqueCashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          {[
            { id: 'all', label: 'Semua Nota' },
            { id: 'completed', label: 'Selesai' },
            { id: 'awaiting_settlement', label: 'Menunggu Pelunasan (DP)' },
            { id: 'voided', label: 'Dibatalkan (Void)' },
            { id: 'refunded', label: 'Refund' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`rounded-xl px-3 py-1.5 transition ${
                filterStatus === f.id
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'bg-white text-[#8C7B6C] border border-[#E5DACE] hover:bg-[#FDFBF7]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className="bg-amber-100 border-b border-amber-200 px-5 py-2 text-xs font-bold text-amber-900 flex items-center justify-between shrink-0">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="font-bold">✕</button>
        </div>
      )}

      {/* Main Content: Split List and Order Detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Orders Table/List */}
        <div className="flex-1 overflow-y-auto p-4 border-r border-[#E5DACE]">
          {filteredOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <Receipt className="h-12 w-12 text-[#8C7B6C]/40 mb-3" />
              <p className="font-bold text-sm text-[#2D241E]">Tidak ada riwayat transaksi</p>
              <p className="text-xs text-[#8C7B6C] mt-1">
                {isCashier
                  ? 'Belum ada nota yang dibuat pada shift Anda hari ini.'
                  : 'Tidak ada nota yang cocok dengan filter yang dipilih.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                const graceRemaining = getGracePeriodRemaining(order.createdAt);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border-2 p-3.5 transition ${
                      isSelected
                        ? 'border-[#D97706] bg-amber-50/50 shadow-xs'
                        : 'border-[#E5DACE] bg-white hover:border-[#D97706]/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#2D241E]">
                          {order.poNumber || order.receiptNumber}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-black ${
                            order.orderStatus === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.orderStatus === 'awaiting_settlement'
                              ? 'bg-amber-100 text-amber-800'
                              : order.orderStatus === 'voided'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {order.orderStatus === 'completed'
                            ? 'Selesai'
                            : order.orderStatus === 'awaiting_settlement'
                            ? 'Menunggu Pelunasan'
                            : order.orderStatus === 'voided'
                            ? 'Dibatalkan (Void)'
                            : 'Refund'}
                        </span>
                        {order.isMadeToOrder && (
                          <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[9px] font-bold text-purple-800">
                            Custom Cake
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#8C7B6C] flex items-center gap-2">
                        <span>{formatDateTime(order.createdAt)}</span>
                        <span>•</span>
                        <span>Kasir: {order.cashierName}</span>
                        <span>•</span>
                        <span>Pelanggan: <strong className="text-[#2D241E]">{order.customer.name}</strong></span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-[#2D241E]">
                        {formatIDR(order.total)}
                      </div>
                      <div className="text-[11px] text-[#8C7B6C] mt-0.5">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} item
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Selected Order Details & Actions */}
        <div className="w-96 flex flex-col overflow-hidden bg-[#FDFBF7] p-4">
          {selectedOrder ? (
            <div className="flex h-full flex-col justify-between overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="border-b border-[#E5DACE] pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm text-[#2D241E]">
                      {selectedOrder.receiptNumber}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        selectedOrder.orderStatus === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedOrder.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8C7B6C] mt-1">
                    {formatDateTime(selectedOrder.createdAt)} • Kasir: {selectedOrder.cashierName}
                  </p>
                  <p className="text-xs font-bold text-[#2D241E] mt-0.5">
                    Pelanggan: {selectedOrder.customer.name}
                  </p>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-[#8C7B6C]">Daftar Pesanan:</span>
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#2D241E]">{it.productName}</span>
                        <span className="text-[#8C7B6C] ml-1.5">x{it.quantity}</span>
                      </div>
                      <span className="font-bold text-[#2D241E]">{formatIDR(it.unitPrice * it.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t border-[#E5DACE] pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-[#8C7B6C]">
                    <span>Subtotal</span>
                    <span>{formatIDR(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Diskon</span>
                      <span>-{formatIDR(selectedOrder.discountAmount)}</span>
                    </div>
                  )}
                  {selectedOrder.taxApplied && (
                    <div className="flex justify-between text-[#8C7B6C]">
                      <span>PPN (11%)</span>
                      <span>{formatIDR(selectedOrder.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-[#2D241E] pt-1 border-t border-[#E5DACE]">
                    <span>Total Transaksi</span>
                    <span>{formatIDR(selectedOrder.total)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Sudah Dibayar</span>
                    <span>{formatIDR(selectedOrder.paidAmount)}</span>
                  </div>
                  {selectedOrder.remainingBalance > 0 && (
                    <div className="flex justify-between text-amber-700 font-black">
                      <span>Sisa Tagihan (Pelunasan)</span>
                      <span>{formatIDR(selectedOrder.remainingBalance)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-[#E5DACE] pt-3 space-y-2 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveReceiptOrder(selectedOrder)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[#D97706] bg-white py-2 text-xs font-bold text-[#D97706] hover:bg-amber-50 active:scale-95 transition"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Lihat Struk</span>
                  </button>

                  <button
                    onClick={() => reprintReceipt(selectedOrder.id)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1F2937] py-2 text-xs font-bold text-white hover:bg-black active:scale-95 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Cetak Ulang ({selectedOrder.reprintCount})</span>
                  </button>
                </div>

                {/* Made-to-Order Settle */}
                {selectedOrder.orderStatus === 'awaiting_settlement' && (
                  <button
                    onClick={() => setIsSettling(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-2.5 text-xs font-black text-white hover:bg-amber-700 active:scale-95 transition shadow-xs"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Pelunasan Sisa Tagihan ({formatIDR(selectedOrder.remainingBalance)})</span>
                  </button>
                )}

                {/* Void or Refund */}
                {selectedOrder.orderStatus === 'completed' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsVoiding(true)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 active:scale-95 transition"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Void ({getGracePeriodRemaining(selectedOrder.createdAt)} mnt)</span>
                    </button>

                    <button
                      onClick={() => {
                        setRefundAmountInput(selectedOrder.paidAmount.toString());
                        setIsRefunding(true);
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 active:scale-95 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Refund / Retur</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center p-4 text-xs text-[#8C7B6C]">
              Pilih salah satu nota di sebelah kiri untuk melihat rincian dan tindakan.
            </div>
          )}
        </div>
      </div>

      {/* SINGLE-LAYER MODAL: VOID ORDER */}
      {isVoiding && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#FDFBF7] border-2 border-[#E5DACE] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
              <h3 className="font-black text-base text-rose-900">Batalkan Nota (Void)</h3>
              <span className="text-xs font-bold text-[#8C7B6C]">{selectedOrder.receiptNumber}</span>
            </div>

            <p className="text-xs text-[#8C7B6C]">
              Void hanya diperbolehkan dalam masa tenggang 5 menit sejak transaksi dibuat.
              Masa tenggang tersisa: <strong>{getGracePeriodRemaining(selectedOrder.createdAt)} menit</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Alasan Pembatalan (Wajib)</label>
              <input
                type="text"
                value={voidReasonInput}
                onChange={(e) => setVoidReasonInput(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
              <button
                type="button"
                onClick={() => handleTriggerVoid(selectedOrder)}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-700 active:scale-95 transition"
              >
                Konfirmasi Void
              </button>
              <button
                type="button"
                onClick={() => setIsVoiding(false)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE-LAYER MODAL: REFUND ORDER */}
      {isRefunding && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#FDFBF7] border-2 border-[#E5DACE] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
              <h3 className="font-black text-base text-purple-900">Proses Refund / Retur</h3>
              <span className="text-xs font-bold text-[#8C7B6C]">{selectedOrder.receiptNumber}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Jumlah Refund (Maks: {formatIDR(selectedOrder.paidAmount)})</label>
              <input
                type="number"
                max={selectedOrder.paidAmount}
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Metode Pengembalian</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value as any)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                <option value="cash">Tunai (Cash Drawer)</option>
                <option value="qris">Transfer / QRIS</option>
                <option value="deposit">Saldo Deposit Pelanggan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Alasan Refund</label>
              <input
                type="text"
                value={refundReasonInput}
                onChange={(e) => setRefundReasonInput(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
              <button
                type="button"
                onClick={() => handleTriggerRefund(selectedOrder)}
                className="rounded-xl bg-purple-700 px-5 py-2 text-xs font-black text-white hover:bg-purple-800 active:scale-95 transition"
              >
                Minta Otorisasi Refund
              </button>
              <button
                type="button"
                onClick={() => setIsRefunding(false)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE-LAYER MODAL: MADE-TO-ORDER SETTLEMENT */}
      {isSettling && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#FDFBF7] border-2 border-[#E5DACE] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
              <h3 className="font-black text-base text-[#2D241E]">Pelunasan Sisa Tagihan Pesanan</h3>
              <span className="text-xs font-bold text-[#8C7B6C]">{selectedOrder.receiptNumber}</span>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs">
              <div className="flex justify-between font-bold text-[#8C7B6C]">
                <span>Total Pesanan:</span>
                <span>{formatIDR(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800 mt-1">
                <span>DP yang telah dibayar:</span>
                <span>{formatIDR(selectedOrder.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-amber-900 text-sm mt-1 pt-1 border-t border-amber-200">
                <span>Sisa yang harus dilunasi:</span>
                <span>{formatIDR(selectedOrder.remainingBalance)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Metode Pembayaran Pelunasan</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMethod('cash')}
                  className={`rounded-xl border-2 p-2.5 text-xs font-bold transition ${
                    settleMethod === 'cash'
                      ? 'border-[#D97706] bg-amber-50 text-[#D97706]'
                      : 'border-[#E5DACE] bg-white text-[#8C7B6C]'
                  }`}
                >
                  Tunai (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => setSettleMethod('qris')}
                  className={`rounded-xl border-2 p-2.5 text-xs font-bold transition ${
                    settleMethod === 'qris'
                      ? 'border-[#D97706] bg-amber-50 text-[#D97706]'
                      : 'border-[#E5DACE] bg-white text-[#8C7B6C]'
                  }`}
                >
                  QRIS / Transfer
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
              <button
                type="button"
                onClick={() => handleTriggerSettlement(selectedOrder)}
                className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 active:scale-95 transition"
              >
                Konfirmasi Pelunasan
              </button>
              <button
                type="button"
                onClick={() => setIsSettling(false)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Pin Verification Modal */}
      <SupervisorPinModal
        isOpen={pinModal.isOpen}
        onClose={() => setPinModal((p) => ({ ...p, isOpen: false }))}
        title={pinModal.title}
        description={pinModal.description}
        onSuccess={pinModal.onSuccess}
      />
    </div>
  );
};
