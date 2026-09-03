import React, { useState } from 'react';
import {
  History,
  Search,
  Printer,
  Ban,
  RotateCcw,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Order, PaymentMethod } from '../types';
import { formatIDR, formatDateTime, posSound } from '../utils/formatters';
import { SupervisorPinModal } from './SupervisorPinModal';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    orders,
    setActiveReceiptOrder,
    voidOrder,
    refundOrder,
    reprintReceipt,
    settleMadeToOrder,
  } = usePOS();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Settlement for DP state
  const [isSettling, setIsSettling] = useState(false);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('cash');

  // Refund state
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('Pelanggan Membatalkan / Produk Rusak');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'qris' | 'deposit'>('cash');

  // Void state
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

  if (!isOpen) return null;

  const filteredOrders = orders.filter((o) => {
    if (filterStatus !== 'all' && o.orderStatus !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchReceipt = o.receiptNumber.toLowerCase().includes(q);
      const matchCustomer = o.customer.name.toLowerCase().includes(q);
      const matchCashier = o.cashierName.toLowerCase().includes(q);
      if (!matchReceipt && !matchCustomer && !matchCashier) return false;
    }
    return true;
  });

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
      title: 'Otorisasi Refund Dana',
      description: `Pengembalian dana ${formatIDR(amt)} untuk nota ${order.receiptNumber}. Masukkan PIN Supervisor:`,
      onSuccess: () => {
        const res = refundOrder(order.id, amt, refundReasonInput, refundMethod, '8888');
        setFeedback(res.message);
        setIsRefunding(false);
      },
    });
  };

  // Trigger Reprint flow (POS-US-019)
  const handleTriggerReprint = (order: Order) => {
    if (order.reprintCount >= 3) {
      setFeedback('Batas cetak ulang struk (3x) telah tercapai.');
      posSound.error();
      return;
    }

    setPinModal({
      isOpen: true,
      title: 'Otorisasi Cetak Ulang Struk',
      description: `Cetak ulang struk ${order.receiptNumber} (Reprint #${order.reprintCount + 1} dari maks 3). Masukkan PIN Supervisor:`,
      onSuccess: () => {
        const res = reprintReceipt(order.id, '8888');
        setFeedback(res.message);
        if (res.order) {
          setActiveReceiptOrder(res.order);
        }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Riwayat Transaksi & Nota Kasir</h3>
              <p className="text-xs text-amber-900 font-semibold">
                Void (Maks 5 menit), Refund Pengembalian Dana, Pelunasan DP, & Cetak Ulang Struk
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor nota, nama pelanggan, atau kasir..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto text-xs font-bold">
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
                className={`rounded-xl px-3 py-2 transition ${
                  filterStatus === f.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <div className="bg-amber-100 border-b border-amber-200 px-6 py-2.5 text-xs font-bold text-amber-900 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback('')} className="text-amber-800">✕</button>
          </div>
        )}

        {/* Content Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-gray-400">
              <History className="h-12 w-12 text-gray-300 mb-2" />
              <p className="font-bold text-gray-600">Belum ada riwayat transaksi yang cocok.</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const graceRemaining = getGracePeriodRemaining(order.createdAt);
              const canVoid = order.orderStatus === 'completed' && graceRemaining > 0;
              const canRefund = order.orderStatus === 'completed' || order.orderStatus === 'partially_refunded';
              const canSettle = order.orderStatus === 'awaiting_settlement';

              return (
                <div
                  key={order.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-amber-300"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-900 text-base">{order.receiptNumber}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          order.orderStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.orderStatus === 'awaiting_settlement'
                            ? 'bg-rose-100 text-rose-800'
                            : order.orderStatus === 'voided'
                            ? 'bg-gray-200 text-gray-700 line-through'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {order.orderStatus === 'completed'
                          ? 'Selesai'
                          : order.orderStatus === 'awaiting_settlement'
                          ? 'DP (Menunggu Pelunasan)'
                          : order.orderStatus === 'voided'
                          ? 'Void (Batal)'
                          : 'Refund'}
                      </span>

                      {order.reprintCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          Reprint #{order.reprintCount}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>{formatDateTime(order.createdAt)}</span>
                      <span>•</span>
                      <span className="font-semibold text-gray-700">{order.customer.name}</span>
                      <span>•</span>
                      <span>Kasir: {order.cashierName}</span>
                    </div>

                    <div className="text-xs text-gray-600">
                      <span>{order.items.length} item: </span>
                      <span className="font-medium text-gray-800">
                        {order.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                      </span>
                    </div>

                    {order.isMadeToOrder && order.customizationNotes && (
                      <p className="text-[11px] text-rose-700 italic bg-rose-50 p-1.5 rounded-lg">
                        Catatan Cake: {order.customizationNotes}
                      </p>
                    )}
                  </div>

                  {/* Right side: Amounts & Actions */}
                  <div className="flex flex-col md:items-end gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">Total Transaksi</span>
                      <span className="text-xl font-black text-gray-900">{formatIDR(order.total)}</span>
                      {order.remainingBalance > 0 && (
                        <span className="text-xs font-bold text-rose-700 block">
                          Sisa DP: {formatIDR(order.remainingBalance)}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* View / Print Receipt */}
                      <button
                        onClick={() => setActiveReceiptOrder(order)}
                        className="flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 active:scale-95"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Lihat Struk</span>
                      </button>

                      {/* Reprint Receipt with Approval */}
                      <button
                        onClick={() => handleTriggerReprint(order)}
                        className="flex items-center gap-1 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200 active:scale-95"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Cetak Ulang ({order.reprintCount}/3)</span>
                      </button>

                      {/* Settle Made-to-Order Balance */}
                      {canSettle && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsSettling(true);
                          }}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>Pelunasan ({formatIDR(order.remainingBalance)})</span>
                        </button>
                      )}

                      {/* Void (5 min grace period) */}
                      {canVoid && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsVoiding(true);
                          }}
                          className="flex items-center gap-1 rounded-xl bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200 active:scale-95"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Void ({graceRemaining}m)</span>
                        </button>
                      )}

                      {/* Refund */}
                      {canRefund && !canVoid && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setRefundAmountInput(String(order.paidAmount));
                            setIsRefunding(true);
                          }}
                          className="flex items-center gap-1 rounded-xl bg-purple-100 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-200 active:scale-95"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Refund</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Close button (POS-US-040) */}
        <div className="border-t border-gray-100 bg-white px-6 py-3 flex justify-end">
          <button
            id="transaction-history-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* DIALOG 1: PELUNASAN MADE-TO-ORDER CAKE */}
      {isSettling && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-gray-900">
              Pelunasan Pesanan Kue Custom
            </h3>
            <p className="text-xs text-gray-500">
              Nota: <strong>{selectedOrder.receiptNumber}</strong> ({selectedOrder.customer.name})
            </p>

            <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between">
                <span>Total Pesanan:</span>
                <span className="font-bold">{formatIDR(selectedOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>DP yang Sudah Dibayar:</span>
                <span className="font-bold">{formatIDR(selectedOrder.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-emerald-800 pt-1 border-t border-amber-200">
                <span>Sisa yang Harus Dilunasi:</span>
                <span>{formatIDR(selectedOrder.remainingBalance)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Metode Pelunasan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettleMethod('cash')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    settleMethod === 'cash' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200'
                  }`}
                >
                  Tunai (Cash)
                </button>
                <button
                  type="button"
                  onClick={() => setSettleMethod('qris')}
                  className={`py-2 rounded-xl text-xs font-bold border ${
                    settleMethod === 'qris' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200'
                  }`}
                >
                  QRIS
                </button>
              </div>
            </div>

            {/* Dialog Footer with primary before Close (POS-US-040) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleTriggerSettlement(selectedOrder)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
              >
                Konfirmasi Lunas
              </button>
              <button
                type="button"
                onClick={() => setIsSettling(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2: VOID CONFIRMATION */}
      {isVoiding && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <Ban className="h-6 w-6" />
              <h3 className="text-base font-black text-gray-900">Void Transaksi</h3>
            </div>
            <p className="text-xs text-gray-500">
              Transaksi {selectedOrder.receiptNumber} akan dibatalkan, pembayaran dikembalikan, dan stok roti dipulihkan kembali ke etalase.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Alasan Pembatalan (Void) *
              </label>
              <input
                type="text"
                value={voidReasonInput}
                onChange={(e) => setVoidReasonInput(e.target.value)}
                placeholder="Alasan pembatalan..."
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-rose-500 focus:outline-none"
              />
            </div>

            {/* Dialog Footer with primary before Close (POS-US-040) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleTriggerVoid(selectedOrder)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95"
              >
                Otorisasi SPV
              </button>
              <button
                type="button"
                onClick={() => setIsVoiding(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 3: REFUND */}
      {isRefunding && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-purple-600">
              <RotateCcw className="h-6 w-6" />
              <h3 className="text-base font-black text-gray-900">Proses Refund Dana</h3>
            </div>
            <p className="text-xs text-gray-500">
              Nota: <strong>{selectedOrder.receiptNumber}</strong>. Total Dibayar: {formatIDR(selectedOrder.paidAmount)}
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nominal Pengembalian Dana (Rp) *
              </label>
              <input
                type="number"
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-base font-bold focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Metode Pengembalian:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['cash', 'qris', 'deposit'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRefundMethod(m)}
                    className={`py-2 rounded-xl text-[11px] font-bold border uppercase ${
                      refundMethod === m ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Alasan Refund *
              </label>
              <input
                type="text"
                value={refundReasonInput}
                onChange={(e) => setRefundReasonInput(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Dialog Footer with primary before Close (POS-US-040) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleTriggerRefund(selectedOrder)}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-700 active:scale-95"
              >
                Minta Otorisasi SPV
              </button>
              <button
                type="button"
                onClick={() => setIsRefunding(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95"
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
