import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock3,
  User,
  Phone,
  Printer,
  ChevronRight,
  Sparkles,
  Copy,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  Split,
  History,
  ShieldAlert,
  ArrowRight,
  CalendarDays,
  X,
  Package,
  Plus,
  LayoutGrid,
  List,
  DollarSign,
  Layers,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Order, CartItem, PaymentComponent } from '../types';
import { formatIDR, formatDateTime, posSound } from '../utils/formatters';
import { CreateMtoModal } from './CreateMtoModal';

interface PesananWorkspaceProps {
  onNavigateToPOS?: () => void;
}

export const PesananWorkspace: React.FC<PesananWorkspaceProps> = ({ onNavigateToPOS }) => {
  const {
    orders,
    currentUser,
    products,
    customers,
    createMtoOrder,
    updatePoPickupTime,
    settlePoPayment,
    markPoReadyForPickup,
    confirmPoPickup,
    cancelPoWithSupervisor,
    duplicatePoToCart,
    setActiveReceiptOrder,
  } = usePOS();

  // Primary workspace tabs & view mode
  const [activeTab, setActiveTab] = useState<'active' | 'schedule' | 'history'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isCreateMtoOpen, setIsCreateMtoOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState<'all' | 'today' | 'unpaid' | 'ready' | 'overdue'>('all');

  // Single Overlay Selected PO Detail
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Detail Drawer Action States
  const [isEditingPickupTime, setIsEditingPickupTime] = useState(false);
  const [newPickupTimeInput, setNewPickupTimeInput] = useState('');
  const [collectorNameInput, setCollectorNameInput] = useState('');

  // Settlement Form State (In-drawer)
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [settlementMethod, setSettlementMethod] = useState<'cash' | 'qris' | 'deposit' | 'split'>('cash');
  const [settlementAmountInput, setSettlementAmountInput] = useState('');
  const [settlementSplitCashInput, setSettlementSplitCashInput] = useState('');

  // Cancellation Form State (In-drawer)
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [supervisorPinInput, setSupervisorPinInput] = useState('');
  const [cancelErrorMsg, setCancelErrorMsg] = useState('');

  // Duplicate PO item selection
  const [selectedItemIdsForDup, setSelectedItemIdsForDup] = useState<string[]>([]);

  // Action message feedback
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // Filter to Made-to-Order orders only
  const mtoOrders = useMemo(() => {
    return orders.filter((o) => o.isMadeToOrder || Boolean(o.poNumber));
  }, [orders]);

  // Check if an order is overdue
  const isOrderOverdue = (order: Order) => {
    if (order.orderStatus === 'picked_up' || order.orderStatus === 'cancelled' || order.orderStatus === 'voided') {
      return false;
    }
    if (order.orderStatus === 'overdue') return true;
    if (!order.pickupDate) return false;

    const timeStr = order.pickupTime || '23:59';
    const scheduled = new Date(`${order.pickupDate}T${timeStr}:00`);
    return scheduled.getTime() < Date.now();
  };

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filtered orders based on active tab and search/chips
  const displayedOrders = useMemo(() => {
    return mtoOrders.filter((order) => {
      // 1. Tab filtering
      const isOverdue = isOrderOverdue(order);
      if (activeTab === 'active') {
        if (order.orderStatus === 'picked_up' || order.orderStatus === 'cancelled' || order.orderStatus === 'voided') {
          return false;
        }
      } else if (activeTab === 'history') {
        if (order.orderStatus !== 'picked_up' && order.orderStatus !== 'cancelled' && order.orderStatus !== 'voided') {
          return false;
        }
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const poMatch = (order.poNumber || '').toLowerCase().includes(q);
        const receiptMatch = order.receiptNumber.toLowerCase().includes(q);
        const customerMatch = order.customer.name.toLowerCase().includes(q);
        const phoneMatch = (order.customer.phone || '').toLowerCase().includes(q);
        const itemMatch = order.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!poMatch && !receiptMatch && !customerMatch && !phoneMatch && !itemMatch) {
          return false;
        }
      }

      // 3. Quick Chips
      if (filterChip === 'today') {
        if (order.pickupDate !== todayStr) return false;
      } else if (filterChip === 'unpaid') {
        if (order.remainingBalance <= 0) return false;
      } else if (filterChip === 'ready') {
        if (order.orderStatus !== 'ready_for_pickup') return false;
      } else if (filterChip === 'overdue') {
        if (!isOverdue) return false;
      }

      return true;
    });
  }, [mtoOrders, activeTab, searchQuery, filterChip, todayStr]);

  // Counts for Badges & Summary KPIs
  const activeCount = useMemo(() => {
    return mtoOrders.filter(
      (o) => o.orderStatus === 'active' || o.orderStatus === 'ready_for_pickup' || isOrderOverdue(o)
    ).length;
  }, [mtoOrders]);

  const overdueCount = useMemo(() => {
    return mtoOrders.filter((o) => isOrderOverdue(o)).length;
  }, [mtoOrders]);

  const readyCount = useMemo(() => {
    return mtoOrders.filter((o) => o.orderStatus === 'ready_for_pickup').length;
  }, [mtoOrders]);

  const todayCount = useMemo(() => {
    return mtoOrders.filter(
      (o) =>
        o.pickupDate === todayStr &&
        o.orderStatus !== 'picked_up' &&
        o.orderStatus !== 'cancelled' &&
        o.orderStatus !== 'voided'
    ).length;
  }, [mtoOrders, todayStr]);

  const activeTotalValue = useMemo(() => {
    return mtoOrders
      .filter((o) => o.orderStatus !== 'picked_up' && o.orderStatus !== 'cancelled' && o.orderStatus !== 'voided')
      .reduce((sum, o) => sum + o.total, 0);
  }, [mtoOrders]);

  const activeRemainingBalance = useMemo(() => {
    return mtoOrders
      .filter((o) => o.orderStatus !== 'picked_up' && o.orderStatus !== 'cancelled' && o.orderStatus !== 'voided')
      .reduce((sum, o) => sum + o.remainingBalance, 0);
  }, [mtoOrders]);

  // Current selected order for drawer
  const selectedOrder = useMemo(() => {
    return mtoOrders.find((o) => o.id === selectedOrderId) || null;
  }, [mtoOrders, selectedOrderId]);

  // Open detail drawer
  const handleOpenDetail = (order: Order) => {
    setSelectedOrderId(order.id);
    setIsEditingPickupTime(false);
    setNewPickupTimeInput(order.pickupTime || '');
    setCollectorNameInput(order.collectorName || order.customer.name);
    setIsSettlementOpen(false);
    setSettlementAmountInput(order.remainingBalance > 0 ? String(order.remainingBalance) : '');
    setSettlementSplitCashInput('');
    setIsCancelOpen(false);
    setCancelReasonInput('');
    setSupervisorPinInput('');
    setCancelErrorMsg('');
    setSelectedItemIdsForDup(order.items.map((i) => i.id));
    posSound.beep();
  };

  const handleCloseDetail = () => {
    setSelectedOrderId(null);
    setIsEditingPickupTime(false);
    setIsSettlementOpen(false);
    setIsCancelOpen(false);
  };

  // 1. Action: Update Pickup Time
  const handleSavePickupTime = () => {
    if (!selectedOrder) return;
    if (!newPickupTimeInput.trim()) {
      showFeedback('Jam pengambilan baru wajib diisi!', 'error');
      return;
    }
    const res = updatePoPickupTime(selectedOrder.id, newPickupTimeInput);
    if (res.success) {
      showFeedback(res.message, 'success');
      setIsEditingPickupTime(false);
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // 2. Action: Mark Ready for Pickup
  const handleMarkReady = () => {
    if (!selectedOrder) return;
    const res = markPoReadyForPickup(selectedOrder.id);
    if (res.success) {
      showFeedback(res.message, 'success');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // 3. Action: Confirm Pickup
  const handleConfirmPickup = () => {
    if (!selectedOrder) return;
    if (!collectorNameInput.trim()) {
      showFeedback('Nama pengambil wajib diisi!', 'error');
      return;
    }
    const res = confirmPoPickup(selectedOrder.id, collectorNameInput);
    if (res.success) {
      showFeedback(res.message, 'success');
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // 4. Action: Settle Payment
  const handleExecuteSettlement = () => {
    if (!selectedOrder) return;
    const amountToPay = parseInt(settlementAmountInput || '0', 10);
    if (amountToPay <= 0) {
      showFeedback('Nominal pelunasan tidak valid!', 'error');
      return;
    }
    if (amountToPay > selectedOrder.remainingBalance) {
      showFeedback('Nominal pelunasan melebihi sisa tagihan!', 'error');
      return;
    }

    const timestamp = new Date().toISOString();
    const payments: PaymentComponent[] = [];

    if (settlementMethod === 'cash') {
      payments.push({
        method: 'cash',
        amount: amountToPay,
        tenderedCash: amountToPay,
        change: 0,
        timestamp,
      });
    } else if (settlementMethod === 'qris') {
      payments.push({
        method: 'qris',
        amount: amountToPay,
        reference: 'QRIS-LUNAS-' + Date.now().toString().slice(-4),
        timestamp,
      });
    } else if (settlementMethod === 'deposit') {
      if (selectedOrder.customer.depositBalance < amountToPay) {
        showFeedback(
          `Saldo deposit pelanggan (Rp ${selectedOrder.customer.depositBalance.toLocaleString('id-ID')}) tidak mencukupi!`,
          'error'
        );
        return;
      }
      payments.push({
        method: 'deposit',
        amount: amountToPay,
        reference: `DEPOSIT-LUNAS-${selectedOrder.customer.id}`,
        timestamp,
      });
    } else if (settlementMethod === 'split') {
      const cashPortion = parseInt(settlementSplitCashInput || '0', 10);
      const qrisPortion = amountToPay - cashPortion;
      if (cashPortion <= 0 || qrisPortion <= 0) {
        showFeedback('Masukkan porsi tunai dan QRIS yang valid!', 'error');
        return;
      }
      payments.push({
        method: 'cash',
        amount: cashPortion,
        tenderedCash: cashPortion,
        change: 0,
        timestamp,
      });
      payments.push({
        method: 'qris',
        amount: qrisPortion,
        reference: 'SPLIT-QRIS-LUNAS-' + Date.now().toString().slice(-4),
        timestamp,
      });
    }

    const res = settlePoPayment(selectedOrder.id, payments);
    if (res.success) {
      showFeedback(res.message, 'success');
      setIsSettlementOpen(false);
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // 5. Action: Cancel PO with Supervisor
  const handleExecuteCancel = () => {
    if (!selectedOrder) return;
    setCancelErrorMsg('');
    if (!cancelReasonInput.trim()) {
      setCancelErrorMsg('Alasan pembatalan pesanan wajib diisi!');
      return;
    }
    if (!supervisorPinInput.trim()) {
      setCancelErrorMsg('PIN Supervisor wajib dimasukkan!');
      return;
    }

    const res = cancelPoWithSupervisor(selectedOrder.id, cancelReasonInput, supervisorPinInput);
    if (res.success) {
      showFeedback(res.message, 'success');
      setIsCancelOpen(false);
    } else {
      setCancelErrorMsg(res.message);
      showFeedback(res.message, 'error');
    }
  };

  // 6. Action: Duplicate PO (From completed order)
  const handleExecuteDuplicate = () => {
    if (!selectedOrder) return;
    const res = duplicatePoToCart(selectedOrder.id, selectedItemIdsForDup);
    if (res.success) {
      showFeedback(res.message, 'success');
      handleCloseDetail();
      if (onNavigateToPOS) {
        onNavigateToPOS();
      }
    } else {
      showFeedback(res.message, 'error');
    }
  };

  // Helper for status badge
  const renderStatusBadge = (order: Order) => {
    const isOverdue = isOrderOverdue(order);

    if (order.orderStatus === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 border border-rose-200">
          <XCircle className="h-3.5 w-3.5" />
          Batal
        </span>
      );
    }
    if (order.orderStatus === 'picked_up') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Selesai / Diambil
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs animate-pulse">
          <AlertTriangle className="h-3.5 w-3.5" />
          Terlambat
        </span>
      );
    }
    if (order.orderStatus === 'ready_for_pickup') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800 border border-teal-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Siap Diambil
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
        <Clock className="h-3.5 w-3.5" />
        Diproses
      </span>
    );
  };

  // Helper for payment status badge
  const renderPaymentBadge = (order: Order) => {
    if (order.orderStatus === 'cancelled' && order.paymentStatus === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800">
          Deposit Ref
        </span>
      );
    }
    if (order.remainingBalance === 0 || order.paymentStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
          Lunas
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
        DP (Sisa {formatIDR(order.remainingBalance)})
      </span>
    );
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-[#F7F7F5] select-none text-[#1F2937]">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-xl transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Top Workspace Header */}
      <div className="shrink-0 border-b border-[#E5E7EB] bg-white px-4 sm:px-6 py-3.5 space-y-3">
        {/* Top Row: Title, KPI Quick Metrics ribbon, & Primary Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D97706] text-white shadow-xs">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#1F2937] truncate">
                Manajemen Pesanan (PO Made-to-Order)
              </h2>
              <p className="text-xs text-[#6B7280] truncate">
                Operasional Purchase Order kustom, jadwal penyerahan, dan pelunasan tagihan.
              </p>
            </div>
          </div>

          {/* KPI Metrics Chips on the right side of header */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden xl:flex items-center gap-2 rounded-xl bg-[#FDFBF7] border border-[#E5DACE] px-3 py-1.5 text-xs font-semibold text-[#2D241E]">
              <span className="text-[#8C7B6C]">Nilai Aktif:</span>
              <strong className="text-[#D97706]">{formatIDR(activeTotalValue)}</strong>
            </div>

            {activeRemainingBalance > 0 && (
              <div className="hidden lg:flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900">
                <span className="text-amber-700">Sisa DP/Tagihan:</span>
                <strong>{formatIDR(activeRemainingBalance)}</strong>
              </div>
            )}

            {/* Upper Right Action Button */}
            <button
              onClick={() => {
                setIsCreateMtoOpen(true);
                posSound.beep();
              }}
              className="flex items-center gap-1.5 shrink-0 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-xs active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create MTO</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Tab Switcher & Full-Width Search/Filters & View Mode */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2.5 border-t border-[#F3F4F6]">
          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-1 rounded-xl bg-[#F7F7F5] border border-[#E5E7EB] p-1 shrink-0 self-start">
            <button
              onClick={() => {
                setActiveTab('active');
                posSound.beep();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'active'
                  ? 'bg-white text-[#1F2937] shadow-xs font-bold'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Pesanan Aktif</span>
              {activeCount > 0 && (
                <span className="rounded-full bg-[#D97706] px-1.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('schedule');
                posSound.beep();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'schedule'
                  ? 'bg-white text-[#1F2937] shadow-xs font-bold'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Jadwal Ambil</span>
              {todayCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                  {todayCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                posSound.beep();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-white text-[#1F2937] shadow-xs font-bold'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Selesai & Batal</span>
            </button>
          </div>

          {/* Search, Filter Chips & View Mode (Fills the right side evenly) */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
            {/* Responsive Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. PO, nota, pelanggan, telp, atau nama roti..."
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] pl-9 pr-7 py-1.5 text-xs text-[#1F2937] placeholder-[#9CA3AF] focus:border-[#D97706] focus:bg-white focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#1F2937]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'today', label: 'Hari Ini' },
                { id: 'unpaid', label: 'Belum Lunas' },
                { id: 'ready', label: 'Siap Diambil' },
                { id: 'overdue', label: 'Terlambat' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => {
                    setFilterChip(chip.id as any);
                    posSound.beep();
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
                    filterChip === chip.id
                      ? 'bg-[#1F2937] text-white shadow-xs'
                      : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-[#E5E7EB] bg-white p-0.5 shadow-2xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
                title="Tampilan Grid Kartu"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
                title="Tampilan Tabel Lengkap"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-28 scrollbar-thin">
        {displayedOrders.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E5E7EB] bg-white p-6 text-center text-[#6B7280]">
            <ClipboardList className="h-12 w-12 text-[#9CA3AF] mb-2 stroke-[1.5]" />
            <h4 className="text-sm font-bold text-[#1F2937]">Tidak Ada Pesanan PO Ditemukan</h4>
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm">
              {searchQuery || filterChip !== 'all'
                ? 'Tidak ada pesanan yang cocok dengan pencarian atau filter yang dipilih.'
                : activeTab === 'active'
                ? 'Belum ada pesanan Made-to-Order aktif saat ini. Buat PO baru dari menu Kasir (POS).'
                : 'Belum ada data pesanan pada tab ini.'}
            </p>
            {onNavigateToPOS && (
              <button
                onClick={onNavigateToPOS}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
              >
                <span>Buka Menu Kasir</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {displayedOrders.map((order) => {
              const isOverdue = isOrderOverdue(order);
              return (
                <div
                  key={order.id}
                  onClick={() => handleOpenDetail(order)}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-xs transition hover:shadow-md cursor-pointer ${
                    isOverdue
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : order.orderStatus === 'ready_for_pickup'
                      ? 'border-teal-300 ring-1 ring-teal-200'
                      : 'border-[#E5E7EB] hover:border-[#D97706]'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-[#F3F4F6] pb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-[#D97706]">
                            {order.poNumber || order.receiptNumber}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF]">
                            ({order.receiptNumber})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User className="h-3.5 w-3.5 text-[#6B7280]" />
                          <span className="text-xs font-bold text-[#1F2937]">
                            {order.customer.name}
                          </span>
                          {order.customer.category && (
                            <span className="text-[10px] text-[#6B7280]">
                              • {order.customer.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {renderStatusBadge(order)}
                        {renderPaymentBadge(order)}
                      </div>
                    </div>

                    {/* Schedule Badge */}
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-[#F7F7F5] p-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#D97706]" />
                        <span className="font-semibold text-[#1F2937]">
                          {order.pickupDate || 'Hari Ini'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
                        <span className="font-bold text-[#1F2937]">
                          Pukul {order.pickupTime || '14:00'} WIB
                        </span>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="mt-3 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-[#374151] font-medium truncate max-w-[200px]">
                            {item.quantity}x {item.productName}
                          </span>
                          <span className="font-semibold text-[#1F2937]">
                            {formatIDR(item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Customization notes snippet */}
                    {order.customizationNotes && (
                      <div className="mt-2 rounded-lg bg-amber-50/70 border border-amber-200/60 p-2 text-[11px] text-amber-900 line-clamp-2">
                        <span className="font-bold block text-[10px] text-amber-800">Catatan Khusus:</span>
                        {order.customizationNotes}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Info & Detail Link */}
                  <div className="mt-4 pt-3 border-t border-[#F3F4F6] flex items-center justify-between text-xs">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-[#9CA3AF]">
                        Total Nilai PO
                      </span>
                      <span className="text-sm font-bold text-[#1F2937]">
                        {formatIDR(order.total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[#D97706] font-bold group-hover:translate-x-0.5 transition">
                      <span>Kelola PO</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View: Full width presentation without dead empty space */
          <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F7F5] text-[#6B7280] font-black uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">No. PO & Nota</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-4">Jadwal Pengambilan</th>
                  <th className="py-3 px-4">Ringkasan Item</th>
                  <th className="py-3 px-4 text-center">Status Produksi</th>
                  <th className="py-3 px-4 text-center">Status Bayar</th>
                  <th className="py-3 px-4 text-right">Total Nilai</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/70">
                {displayedOrders.map((order) => {
                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenDetail(order)}
                      className="hover:bg-[#FDFBF7] cursor-pointer transition"
                    >
                      {/* PO & Receipt */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#D97706] text-xs">
                          {order.poNumber || order.receiptNumber}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF]">{order.receiptNumber}</div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1F2937]">{order.customer.name}</div>
                        <div className="text-[10px] text-[#6B7280]">
                          {order.customer.phone || 'Tanpa no. telp'}
                        </div>
                      </td>

                      {/* Schedule */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1F2937]">
                          {order.pickupDate || 'Hari Ini'}
                        </div>
                        <div className="text-[10px] text-[#6B7280]">
                          Pukul {order.pickupTime || '14:00'} WIB
                        </div>
                      </td>

                      {/* Items summary */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="line-clamp-1 text-xs text-[#374151] font-medium">
                          {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </div>
                        {order.customizationNotes && (
                          <div className="text-[10px] text-amber-800 line-clamp-1 italic">
                            "{order.customizationNotes}"
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {renderStatusBadge(order)}
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4 text-center">
                        {renderPaymentBadge(order)}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right font-bold text-[#1F2937]">
                        {formatIDR(order.total)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(order);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-bold text-[#D97706] hover:bg-amber-50 hover:border-amber-300 transition"
                        >
                          <span>Kelola</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SINGLE OVERLAY: PO DETAIL DRAWER (No Popups over Popups, with Bottom-Right Tutup) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-fadeIn">
          <div className="flex h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F7F7F5] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97706] text-white shadow-xs">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-[#1F2937]">
                      PO: {selectedOrder.poNumber || selectedOrder.receiptNumber}
                    </h3>
                    {renderStatusBadge(selectedOrder)}
                    {renderPaymentBadge(selectedOrder)}
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    Dibuat {formatDateTime(selectedOrder.createdAt)} • Kasir: {selectedOrder.cashierName}
                  </p>
                </div>
              </div>

              {/* Close Button Top Right */}
              <button
                onClick={handleCloseDetail}
                className="rounded-lg p-2 text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#1F2937] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Customer Info Card */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-[#D97706]">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                        Pelanggan Pemesan
                      </span>
                      <h4 className="text-sm font-bold text-[#1F2937]">
                        {selectedOrder.customer.name}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-[#6B7280] block">No. Telepon / WhatsApp:</span>
                    <span className="font-semibold text-[#1F2937]">
                      {selectedOrder.customer.phone || '-'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F3F4F6] flex items-center justify-between text-xs text-[#6B7280]">
                  <span>Kategori: <strong className="text-[#1F2937]">{selectedOrder.customer.category}</strong></span>
                  <span>Saldo Deposit Saat Ini: <strong className="text-emerald-700">{formatIDR(selectedOrder.customer.depositBalance)}</strong></span>
                </div>
              </div>

              {/* Section 2: Order Items & Customization (Locked from accidental edits) */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Daftar Item Pesanan (Terkunci)
                  </span>
                  <span className="text-xs text-[#6B7280]">
                    {selectedOrder.items.length} jenis item
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex-1">
                        <span className="font-bold text-[#1F2937]">{item.productName}</span>
                        <span className="text-[#6B7280] ml-2">
                          {item.quantity} x {formatIDR(item.unitPrice)}
                        </span>
                        {item.isMadeToOrder && (
                          <span className="ml-2 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                            Custom Cake
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-[#1F2937]">
                        {formatIDR(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Customization Notes */}
                {selectedOrder.customizationNotes && (
                  <div className="mt-3 rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-950">
                    <span className="font-bold block text-amber-900 mb-1">
                      Catatan Kustomisasi / Instruksi Khusus:
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">
                      {selectedOrder.customizationNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 3: Schedule & Pickup Time Management (Allowed to edit pickup time with audit log) */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Jadwal Pengambilan Pesanan
                  </span>
                  {selectedOrder.orderStatus !== 'picked_up' && selectedOrder.orderStatus !== 'cancelled' && (
                    <button
                      onClick={() => setIsEditingPickupTime(!isEditingPickupTime)}
                      className="rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-semibold text-[#1F2937] hover:border-[#D97706] hover:bg-[#F7F7F5] transition"
                    >
                      {isEditingPickupTime ? 'Batal Ubah' : 'Ubah Jam Ambil'}
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#D97706]" />
                    <span>Tanggal: <strong className="text-[#1F2937]">{selectedOrder.pickupDate || 'Hari Ini'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#D97706]" />
                    <span>Jam Pengambilan: <strong className="text-[#1F2937]">{selectedOrder.pickupTime || '14:00'} WIB</strong></span>
                  </div>
                </div>

                {/* Edit Form for Pickup Time */}
                {isEditingPickupTime && (
                  <div className="rounded-xl bg-[#F7F7F5] border border-[#E5E7EB] p-3 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                        Masukkan Jam Pengambilan Baru (WIB)
                      </label>
                      <input
                        type="time"
                        value={newPickupTimeInput}
                        onChange={(e) => setNewPickupTimeInput(e.target.value)}
                        className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#1F2937] focus:border-[#D97706] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSavePickupTime}
                        className="rounded-lg bg-[#D97706] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
                      >
                        Simpan Perubahan Jam
                      </button>
                      <button
                        onClick={() => setIsEditingPickupTime(false)}
                        className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#1F2937]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {/* Pickup Time Audit History */}
                {selectedOrder.pickupTimeHistory && selectedOrder.pickupTimeHistory.length > 0 && (
                  <div className="mt-2 space-y-1 pt-2 border-t border-[#F3F4F6]">
                    <span className="text-[11px] font-bold text-[#6B7280] flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Riwayat Perubahan Jam Pengambilan:
                    </span>
                    {selectedOrder.pickupTimeHistory.map((log, idx) => (
                      <p key={idx} className="text-[11px] text-[#6B7280]">
                        • {log.previousTime} → <strong>{log.newTime} WIB</strong> oleh {log.updatedBy} ({formatDateTime(log.timestamp)})
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Financial & Settlement Section */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Status Keuangan & Pembayaran
                  </span>
                  {selectedOrder.remainingBalance > 0 && selectedOrder.orderStatus !== 'cancelled' && (
                    <button
                      onClick={() => setIsSettlementOpen(!isSettlementOpen)}
                      className="rounded-lg bg-[#059669] px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                    >
                      {isSettlementOpen ? 'Tutup Pelunasan' : 'Pelunasan Sisa Tagihan'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-[#F7F7F5] p-2.5">
                    <span className="block text-[10px] font-bold uppercase text-[#6B7280]">Total Pesanan</span>
                    <span className="text-sm font-bold text-[#1F2937]">{formatIDR(selectedOrder.total)}</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-2.5">
                    <span className="block text-[10px] font-bold uppercase text-emerald-800">Sudah Terbayar</span>
                    <span className="text-sm font-bold text-emerald-800">{formatIDR(selectedOrder.paidAmount)}</span>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-2.5">
                    <span className="block text-[10px] font-bold uppercase text-rose-800">Sisa Tagihan</span>
                    <span className="text-sm font-bold text-rose-800">{formatIDR(selectedOrder.remainingBalance)}</span>
                  </div>
                </div>

                {/* Settlement Form (Integrated directly inside drawer) */}
                {isSettlementOpen && selectedOrder.remainingBalance > 0 && (
                  <div className="mt-3 rounded-xl bg-emerald-50/60 border border-emerald-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-emerald-700" />
                        Form Pelunasan Sisa Tagihan ({formatIDR(selectedOrder.remainingBalance)})
                      </h5>
                    </div>

                    {/* Method Selector */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'cash', label: 'Tunai (Cash)', icon: Banknote },
                        { id: 'qris', label: 'QRIS', icon: QrCode },
                        { id: 'deposit', label: 'Akun Deposit', icon: Wallet },
                        { id: 'split', label: 'Split (Cash+QRIS)', icon: Split },
                      ].map((m) => {
                        const Icon = m.icon;
                        const isSelected = settlementMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSettlementMethod(m.id as any)}
                            className={`flex flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                                : 'bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100/50'
                            }`}
                          >
                            <Icon className="h-4 w-4 mb-1" />
                            <span className="text-[11px]">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Nominal Input */}
                    <div>
                      <label className="block text-xs font-semibold text-emerald-950 mb-1">
                        Nominal Pembayaran Pelunasan
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center rounded-lg border border-emerald-300 bg-white px-3 py-1.5">
                          <span className="text-xs font-bold text-[#6B7280] mr-2">Rp</span>
                          <input
                            type="number"
                            value={settlementAmountInput}
                            onChange={(e) => setSettlementAmountInput(e.target.value)}
                            className="w-full text-xs font-bold text-[#1F2937] focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSettlementAmountInput(String(selectedOrder.remainingBalance))}
                          className="rounded-lg bg-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-300 transition"
                        >
                          Lunasi Penuh
                        </button>
                      </div>
                    </div>

                    {/* Split details if split */}
                    {settlementMethod === 'split' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-950 mb-1">Porsi Tunai</label>
                          <input
                            type="number"
                            value={settlementSplitCashInput}
                            onChange={(e) => setSettlementSplitCashInput(e.target.value)}
                            placeholder="Rp Tunai"
                            className="w-full rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-bold text-[#1F2937]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-emerald-950 mb-1">Porsi QRIS (Otomatis)</label>
                          <div className="rounded-lg border border-emerald-300 bg-emerald-100/50 px-2.5 py-1 text-xs font-bold text-emerald-900">
                            {formatIDR(
                              Math.max(
                                0,
                                parseInt(settlementAmountInput || '0', 10) -
                                  parseInt(settlementSplitCashInput || '0', 10)
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {settlementMethod === 'deposit' && (
                      <p className="text-[11px] text-emerald-800">
                        Saldo Akun Deposit Pelanggan: <strong>{formatIDR(selectedOrder.customer.depositBalance)}</strong>
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleExecuteSettlement}
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition"
                      >
                        Konfirmasi Pelunasan
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 5: Fulfillment Actions (Ready & Pickup) */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Status Operasional & Pengambilan
                </span>

                {selectedOrder.orderStatus === 'active' && (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-3">
                    <div>
                      <h5 className="text-xs font-bold text-amber-900">Pesanan Sedang Dipersiapkan / Dipanggang</h5>
                      <p className="text-[11px] text-amber-800">
                        Tandai pesanan ini siap diambil jika koki / pastry chef sudah menyelesaikan pesanan.
                      </p>
                    </div>
                    <button
                      onClick={handleMarkReady}
                      className="rounded-xl bg-[#D97706] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition whitespace-nowrap"
                    >
                      Tandai Siap Diambil
                    </button>
                  </div>
                )}

                {(selectedOrder.orderStatus === 'ready_for_pickup' || isOrderOverdue(selectedOrder)) && (
                  <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-teal-900">
                          Konfirmasi Penyerahan Pesanan (Pickup)
                        </h5>
                        <p className="text-[11px] text-teal-800">
                          Pastikan barang diserahkan ke pelanggan / kurir yang valid. Stok produk akan dipotong saat ini.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={collectorNameInput}
                        onChange={(e) => setCollectorNameInput(e.target.value)}
                        placeholder="Nama Pengambil Pesanan (Wajib)..."
                        className="flex-1 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none"
                      />
                      <button
                        onClick={handleConfirmPickup}
                        className="rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-800 active:scale-95 transition whitespace-nowrap"
                      >
                        Konfirmasi Diambil
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.orderStatus === 'picked_up' && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Pesanan Telah Diserahkan / Selesai</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Diambil oleh: <strong>{selectedOrder.collectorName || selectedOrder.customer.name}</strong> • Waktu: {formatDateTime(selectedOrder.pickedUpAt || selectedOrder.createdAt)}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Petugas Penyerahan: {selectedOrder.pickedUpBy || selectedOrder.cashierName} • Stok bahan dasar telah dipotong secara otomatis.
                    </p>
                  </div>
                )}

                {selectedOrder.orderStatus === 'cancelled' && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-950 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <XCircle className="h-4 w-4 text-rose-600" />
                      <span>Pesanan Dibatalkan</span>
                    </div>
                    <p className="text-[11px]">Alasan: {selectedOrder.cancellationReason}</p>
                    <p className="text-[11px]">Disetujui oleh: {selectedOrder.cancellationApprovedBy} • {formatDateTime(selectedOrder.cancelledAt || '')}</p>
                    <p className="text-[11px] font-mono text-purple-800 font-bold">
                      Referensi Kredit Saldo: {selectedOrder.cancellationCreditRef}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 6: Duplikasi Pesanan (Strictly from completed orders) */}
              {selectedOrder.orderStatus === 'picked_up' && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <Copy className="h-4 w-4 text-indigo-700" />
                        Duplikat Pesanan ke Kasir
                      </h5>
                      <p className="text-[11px] text-indigo-800">
                        Membuat draf keranjang belanja baru untuk pelanggan {selectedOrder.customer.name} dengan item pesanan ini.
                      </p>
                    </div>
                    <button
                      onClick={handleExecuteDuplicate}
                      className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 transition"
                    >
                      Duplikat ke Kasir
                    </button>
                  </div>

                  {/* Checklist of items */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-indigo-950">Pilih item yang ingin diduplikasi:</span>
                    {selectedOrder.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-xs text-[#1F2937] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedItemIdsForDup.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItemIdsForDup((prev) => [...prev, item.id]);
                            } else {
                              setSelectedItemIdsForDup((prev) => prev.filter((id) => id !== item.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{item.quantity}x {item.productName} ({formatIDR(item.unitPrice)})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 7: Supervisor Cancellation Form */}
              {selectedOrder.orderStatus !== 'picked_up' && selectedOrder.orderStatus !== 'cancelled' && (
                <div className="pt-2">
                  {!isCancelOpen ? (
                    <button
                      onClick={() => setIsCancelOpen(true)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Batalkan Pesanan PO Ini (Memerlukan Otorisasi Supervisor)</span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-rose-700" />
                          Pembatalan Pesanan PO & Kredit Saldo Deposit
                        </h5>
                        <button
                          onClick={() => setIsCancelOpen(false)}
                          className="text-xs text-rose-700 hover:underline"
                        >
                          Tutup
                        </button>
                      </div>

                      <p className="text-[11px] text-rose-900">
                        Total pembayaran yang telah diterima sebesar <strong>{formatIDR(selectedOrder.paidAmount)}</strong> akan dikreditkan secara otomatis ke Akun Saldo Deposit milik {selectedOrder.customer.name}.
                      </p>

                      <div>
                        <label className="block text-xs font-semibold text-rose-950 mb-1">
                          Alasan Pembatalan *
                        </label>
                        <input
                          type="text"
                          value={cancelReasonInput}
                          onChange={(e) => setCancelReasonInput(e.target.value)}
                          placeholder="Misal: Pelanggan membatalkan acara / perubahan rencana..."
                          className="w-full rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-rose-950 mb-1">
                          PIN Supervisor (4 Digit) *
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          value={supervisorPinInput}
                          onChange={(e) => setSupervisorPinInput(e.target.value)}
                          placeholder="Masukkan PIN SPV..."
                          className="w-48 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-mono text-[#1F2937] focus:outline-none"
                        />
                      </div>

                      {cancelErrorMsg && (
                        <p className="text-xs text-rose-700 font-bold">{cancelErrorMsg}</p>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={handleExecuteCancel}
                          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition"
                        >
                          Konfirmasi Pembatalan & Kreditkan Dana
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar (Mandatory Visible Tutup button at bottom right) */}
            <div className="border-t border-[#E5E7EB] bg-[#F7F7F5] p-4 flex items-center justify-between">
              {/* Thermal Print PO Document */}
              <button
                type="button"
                onClick={() => {
                  setActiveReceiptOrder(selectedOrder);
                  posSound.beep();
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-xs font-bold text-[#1F2937] shadow-xs hover:bg-gray-50 active:scale-95 transition"
              >
                <Printer className="h-4 w-4 text-[#6B7280]" />
                <span>Cetak Dokumen PO / Nota</span>
              </button>

              {/* VISIBLE TUTUP BUTTON AT BOTTOM RIGHT */}
              <button
                type="button"
                onClick={handleCloseDetail}
                className="rounded-xl bg-[#1F2937] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-black active:scale-95 transition text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create MTO Modal */}
      <CreateMtoModal isOpen={isCreateMtoOpen} onClose={() => setIsCreateMtoOpen(false)} />
    </div>
  );
};


