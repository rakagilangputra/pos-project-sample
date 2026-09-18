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
  ChevronDown,
  ChevronUp,
  Pencil,
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
  DollarSign,
  Layers,
  MessageSquare,
  Eye,
  EyeOff,
  Building2,
  Tag,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Order, CartItem, PaymentComponent } from '../types';
import { formatIDR, formatDateTime, posSound } from '../utils/formatters';
import { CreateMtoModal } from './CreateMtoModal';
import { SupplierNotificationWorkspace } from './SupplierNotificationWorkspace';

interface PesananWorkspaceProps {
  onNavigateToPOS?: () => void;
}

export const PesananWorkspace: React.FC<PesananWorkspaceProps> = ({ onNavigateToPOS }) => {
  const {
    orders,
    currentUser,
    products,
    categories,
    customers,
    createMtoOrder,
    updatePoPickupTime,
    settlePoPayment,
    markPoReadyForPickup,
    confirmPoPickup,
    cancelPoWithSupervisor,
    duplicatePoToCart,
    setActiveReceiptOrder,
    suppliers,
    supplierNotificationBatches,
  } = usePOS();

  // Primary workspace tabs (viewMode removed - strictly row style)
  const [activeTab, setActiveTab] = useState<'active' | 'schedule' | 'history' | 'supplier_notification'>('active');
  const [isCreateMtoOpen, setIsCreateMtoOpen] = useState(false);
  const [expandedPreviewOrderId, setExpandedPreviewOrderId] = useState<string | null>(null);

  // Helper to extract Supplier names for an order
  const getOrderSuppliers = (order: Order) => {
    const names = new Set<string>();
    order.items.forEach((item) => {
      if (item.supplierName && item.supplierName.trim()) {
        names.add(item.supplierName);
      } else if (item.supplierId) {
        if (item.supplierId === 'internal') {
          names.add('Produksi Sendiri');
        } else {
          const found = suppliers?.find((s) => s.id === item.supplierId);
          names.add(found ? found.name : item.supplierId);
        }
      } else {
        const prod = products?.find((p) => p.id === item.productId || p.name === item.productName);
        if (prod?.supplierName && prod.supplierName.trim()) {
          names.add(prod.supplierName);
        } else if (prod?.supplierId) {
          if (prod.supplierId === 'internal') {
            names.add('Produksi Sendiri');
          } else {
            const found = suppliers?.find((s) => s.id === prod.supplierId);
            names.add(found ? found.name : prod.supplierId);
          }
        } else {
          names.add('Produksi Sendiri');
        }
      }
    });
    return names.size > 0 ? Array.from(names) : ['Produksi Sendiri'];
  };

  // Helper to extract POS Product Categories (NOT Master Category)
  const getOrderProductCategories = (order: Order) => {
    const cats = new Set<string>();
    order.items.forEach((item) => {
      const prod = products?.find((p) => p.id === item.productId || p.name === item.productName);
      if (prod?.categoryLabel) {
        cats.add(prod.categoryLabel);
      } else if (item.category) {
        const found = categories?.find((c) => c.id === item.category);
        if (found && found.name && found.id !== 'all') {
          cats.add(found.name);
        } else {
          const catMap: Record<string, string> = {
            bread: 'Roti Manis',
            cake: 'Kue & Tart',
            pastry: 'Pastry & Croissant',
            beverage: 'Minuman',
            mto: 'Made-to-Order',
          };
          cats.add(catMap[item.category] || item.category);
        }
      }
    });
    return cats.size > 0 ? Array.from(cats) : ['Made-to-Order'];
  };

  // Helper to get individual item's product category
  const getItemCategoryLabel = (item: CartItem) => {
    const prod = products?.find((p) => p.id === item.productId || p.name === item.productName);
    if (prod?.categoryLabel) return prod.categoryLabel;
    if (item.category) {
      const found = categories?.find((c) => c.id === item.category);
      if (found && found.name && found.id !== 'all') return found.name;
      const catMap: Record<string, string> = {
        bread: 'Roti Manis',
        cake: 'Kue & Tart',
        pastry: 'Pastry & Croissant',
        beverage: 'Minuman',
        mto: 'Made-to-Order',
      };
      return catMap[item.category] || item.category;
    }
    return 'Made-to-Order';
  };

  // Helper to get individual item's supplier
  const getItemSupplierName = (item: CartItem) => {
    if (item.supplierName && item.supplierName.trim()) return item.supplierName;
    if (item.supplierId) {
      if (item.supplierId === 'internal') return 'Produksi Sendiri';
      const found = suppliers?.find((s) => s.id === item.supplierId);
      return found ? found.name : item.supplierId;
    }
    const prod = products?.find((p) => p.id === item.productId || p.name === item.productName);
    if (prod?.supplierName && prod.supplierName.trim()) return prod.supplierName;
    if (prod?.supplierId) {
      if (prod.supplierId === 'internal') return 'Produksi Sendiri';
      const found = suppliers?.find((s) => s.id === prod.supplierId);
      return found ? found.name : prod.supplierId;
    }
    return 'Produksi Sendiri';
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChip, setFilterChip] = useState<'all' | 'today' | 'unpaid' | 'ready' | 'overdue'>('all');

  // Single Overlay Selected PO Detail
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Accordion Collapsible States for PO Detail Balloons
  const [isCustomerAccordionOpen, setIsCustomerAccordionOpen] = useState(true);
  const [isOrderItemsAccordionOpen, setIsOrderItemsAccordionOpen] = useState(true);

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

  // Count of suppliers with unsent consignment notifications
  const unsentSupplierCount = useMemo(() => {
    return suppliers.filter((supplier) => {
      const eligibleOrders = orders.filter((order) => {
        if (order.orderStatus === 'voided') return false;
        return order.items.some((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const itemSupplierId = item.supplierId || prod?.supplierId;
          const isConsignment =
            item.ownershipType === 'consignment' || prod?.ownershipType === 'consignment';
          return isConsignment && itemSupplierId === supplier.id;
        });
      });
      const batches = supplierNotificationBatches.filter((b) => b.supplierId === supplier.id);
      const batchedOrderIds = new Set(batches.flatMap((b) => b.orderIds));
      const unsent = eligibleOrders.filter((o) => !batchedOrderIds.has(o.id));
      return unsent.length > 0;
    }).length;
  }, [suppliers, orders, products, supplierNotificationBatches]);

  // Current selected order for drawer
  const selectedOrder = useMemo(() => {
    return mtoOrders.find((o) => o.id === selectedOrderId) || null;
  }, [mtoOrders, selectedOrderId]);

  // Open detail drawer
  const handleOpenDetail = (order: Order) => {
    setSelectedOrderId(order.id);
    setIsCustomerAccordionOpen(true);
    setIsOrderItemsAccordionOpen(true);
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
    if (order.paidAmount === 0 || order.paymentStatus === 'unpaid' || order.payments.some((p) => p.method === 'pay_tomorrow')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200">
          Dibayar Besok ({formatIDR(order.remainingBalance)})
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
              id="tab-btn-pesanan-history"
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

            <button
              id="tab-btn-notifikasi-supplier"
              onClick={() => {
                setActiveTab('supplier_notification');
                posSound.beep();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'supplier_notification'
                  ? 'bg-white text-[#1F2937] shadow-xs font-bold'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>Notifikasi Supplier</span>
              {unsentSupplierCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                  {unsentSupplierCount}
                </span>
              )}
            </button>
          </div>

          {/* Search, Filter Chips & View Mode (Fills the right side evenly, hidden on supplier_notification) */}
          {activeTab !== 'supplier_notification' ? (
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
              {/* Responsive Search Input */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari no. PO, pelanggan, telp, atau nama roti..."
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
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-end gap-2 text-xs text-[#6B7280]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp Gateway Kue Titipan (Konsinyasi)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Row-Style PO Table */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${activeTab === 'supplier_notification' ? 'p-3 sm:p-5' : 'p-4 sm:p-6 pb-28'} scrollbar-thin`}>
        {activeTab === 'supplier_notification' ? (
          <SupplierNotificationWorkspace onNavigateToPOS={onNavigateToPOS} />
        ) : displayedOrders.length === 0 ? (
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
        ) : (
          /* Row Style PO Table */
          <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F7F7F5] text-[#6B7280] font-black uppercase tracking-wider text-[10px]">
                    {/* 1. Jadwal Pengambilan */}
                    <th className="py-3 px-4 min-w-[170px]">
                      <div className="flex items-center gap-1.5 text-[#1F2937]">
                        <Calendar className="h-3.5 w-3.5 text-[#D97706]" />
                        <span>1. Jadwal Pengambilan</span>
                      </div>
                    </th>

                    {/* 2. Supplier */}
                    <th className="py-3 px-4 min-w-[150px]">
                      <div className="flex items-center gap-1.5 text-[#1F2937]">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                        <span>2. Supplier</span>
                      </div>
                    </th>

                    {/* 3. Kategori Produk (not master kategori) */}
                    <th className="py-3 px-4 min-w-[150px]">
                      <div className="flex items-center gap-1.5 text-[#1F2937]">
                        <Tag className="h-3.5 w-3.5 text-emerald-600" />
                        <span>3. Kategori Produk</span>
                      </div>
                    </th>

                    {/* 4. List product (can be shown by preview) */}
                    <th className="py-3 px-4 min-w-[240px]">
                      <div className="flex items-center gap-1.5 text-[#1F2937]">
                        <Package className="h-3.5 w-3.5 text-purple-600" />
                        <span>4. List Produk (Preview)</span>
                      </div>
                    </th>

                    {/* No. PO & Pelanggan */}
                    <th className="py-3 px-4 min-w-[150px]">No. PO & Pelanggan</th>

                    {/* Status */}
                    <th className="py-3 px-4 min-w-[120px] text-center">Status</th>

                    {/* Aksi */}
                    <th className="py-3 px-4 text-right min-w-[90px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]/70">
                  {displayedOrders.map((order) => {
                    const isOverdue = isOrderOverdue(order);
                    const isToday = order.pickupDate === todayStr;
                    const orderSuppliers = getOrderSuppliers(order);
                    const orderCategories = getOrderProductCategories(order);
                    const isPreviewExpanded = expandedPreviewOrderId === order.id;

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          onClick={() => handleOpenDetail(order)}
                          className={`hover:bg-[#FDFBF7] cursor-pointer transition ${
                            isPreviewExpanded ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          {/* 1. Jadwal Pengambilan */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`p-1.5 rounded-xl shrink-0 ${
                                  isOverdue
                                    ? 'bg-rose-100 text-rose-700'
                                    : isToday
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                <Calendar className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-bold text-[#1F2937] text-xs flex items-center gap-1.5 flex-wrap">
                                  <span>{order.pickupDate || 'Hari Ini'}</span>
                                  {isToday && (
                                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800">
                                      HARI INI
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-800">
                                      TERLAMBAT
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-semibold text-[#6B7280] flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3 text-[#9CA3AF]" />
                                  <span>Pukul {order.pickupTime || '14:00'} WIB</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Supplier */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="space-y-1">
                              {orderSuppliers.map((sup, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
                                    sup === 'Produksi Sendiri'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-900 border-amber-200'
                                  }`}
                                >
                                  <Building2 className="h-3 w-3 shrink-0 text-blue-600" />
                                  <span className="truncate max-w-[130px]">{sup}</span>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* 3. Kategori Produk (not master kategori) */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex flex-wrap gap-1">
                              {orderCategories.map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 text-[11px] font-bold text-[#374151]"
                                >
                                  <Tag className="h-2.5 w-2.5 text-[#8C7B6C]" />
                                  <span>{cat}</span>
                                </span>
                              ))}
                            </div>
                            <p className="text-[9px] text-[#9CA3AF] mt-1 italic">
                              Kategori Produk POS
                            </p>
                          </td>

                          {/* 4. List product (can be shown by preview) */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="space-y-1.5">
                              {/* Product Items Summary */}
                              <div className="text-xs font-semibold text-[#1F2937] line-clamp-2">
                                {order.items
                                  .map((it) => `${it.quantity}x ${it.productName}`)
                                  .join(', ')}
                              </div>

                              {/* Interactive Preview Button */}
                              <div className="flex items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedPreviewOrderId(
                                      isPreviewExpanded ? null : order.id
                                    );
                                    posSound.beep();
                                  }}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition shadow-2xs ${
                                    isPreviewExpanded
                                      ? 'bg-[#1F2937] text-white border border-[#1F2937]'
                                      : 'bg-amber-50 text-[#D97706] border border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                                  }`}
                                >
                                  {isPreviewExpanded ? (
                                    <>
                                      <EyeOff className="h-3.5 w-3.5" />
                                      <span>Tutup Preview</span>
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>Preview ({order.items.length} Produk)</span>
                                    </>
                                  )}
                                </button>

                                {order.customizationNotes && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    Ada Catatan
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* No. PO & Pelanggan */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="font-mono font-bold text-[#D97706] text-xs">
                              {order.poNumber || order.receiptNumber}
                            </div>
                            <div className="font-bold text-[#1F2937] text-xs mt-0.5">
                              {order.customer.name}
                            </div>
                            <div className="text-[10px] text-[#6B7280]">
                              {order.customer.phone || 'Tanpa no. telp'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-top text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              {renderStatusBadge(order)}
                              {renderPaymentBadge(order)}
                            </div>
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 align-top text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(order);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#D97706] hover:bg-amber-50 hover:border-amber-300 transition shadow-2xs"
                            >
                              <span>Kelola</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>

                        {/* Inline Preview Drawer for List Product */}
                        {isPreviewExpanded && (
                          <tr className="bg-[#FFFDF9] border-b-2 border-amber-300/80">
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="rounded-2xl border-2 border-amber-200/80 bg-white p-4 shadow-sm space-y-3">
                                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                      <Package className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-[#1F2937]">
                                        Preview Rincian Produk: {order.poNumber || order.receiptNumber}
                                      </h4>
                                      <p className="text-[10px] text-[#6B7280]">
                                        {order.items.length} item produk pesanan untuk {order.customer.name}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPreviewOrderId(null)}
                                    className="text-[#9CA3AF] hover:text-[#1F2937] p-1 rounded-lg hover:bg-gray-100 text-xs font-bold flex items-center gap-1"
                                  >
                                    <X className="h-4 w-4" />
                                    <span>Tutup Preview</span>
                                  </button>
                                </div>

                                {/* Product Cards Grid Preview */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {order.items.map((item, itmIdx) => (
                                    <div
                                      key={itmIdx}
                                      className="rounded-xl border border-[#E5E7EB] bg-[#FDFBF7] p-3 space-y-2"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="font-bold text-xs text-[#1F2937] truncate">
                                            {item.productName}
                                          </div>
                                          <div className="text-[10px] text-[#8C7B6C] flex items-center gap-1 mt-0.5">
                                            <span className="font-semibold text-[#D97706]">
                                              {item.quantity} pcs
                                            </span>
                                            <span>• @{formatIDR(item.unitPrice)}</span>
                                          </div>
                                        </div>
                                        <span className="font-black text-xs text-[#1F2937] shrink-0">
                                          {formatIDR(item.unitPrice * item.quantity)}
                                        </span>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1 text-[10px] pt-1 border-t border-[#E5DACE]/60">
                                        <span className="rounded bg-gray-100 text-[#4B5563] px-1.5 py-0.5 font-bold">
                                          {getItemCategoryLabel(item)}
                                        </span>
                                        <span className="rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 font-bold">
                                          {getItemSupplierName(item)}
                                        </span>
                                      </div>

                                      {item.customizationNotes && (
                                        <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2 text-[10px] text-amber-900">
                                          <span className="font-bold block text-[9px] text-amber-800">
                                            Catatan Item:
                                          </span>
                                          {item.customizationNotes}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {order.customizationNotes && (
                                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                                    <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="block text-[11px] text-amber-800 font-black">
                                        Catatan Pesanan Khusus (MTO):
                                      </strong>
                                      <p className="text-xs mt-0.5">
                                        {order.customizationNotes}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
                                  <div className="text-xs">
                                    <span className="text-[#6B7280]">Total Nilai Item: </span>
                                    <strong className="text-sm font-black text-[#1F2937]">
                                      {formatIDR(order.total)}
                                    </strong>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetail(order)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#D97706] px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs transition"
                                  >
                                    <span>Buka Kelola Lengkap</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Balon 1: STATUS KEUANGAN & PEMBAYARAN (Paling Atas) */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                      Status Keuangan & Pembayaran
                    </span>
                  </div>
                  {selectedOrder.remainingBalance === 0 && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      Lunas
                    </span>
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

                {/* Tombol Pelunasan di pojok kanan bawah di bawah Sisa Tagihan */}
                {selectedOrder.remainingBalance > 0 && selectedOrder.orderStatus !== 'cancelled' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSettlementOpen(!isSettlementOpen)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>{isSettlementOpen ? 'Tutup Pelunasan' : 'Pelunasan Sisa Tagihan'}</span>
                    </button>
                  </div>
                )}

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

              {/* Balon 2: PELANGGAN PEMESAN (Collapsible List / Accordion) */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs transition">
                <button
                  type="button"
                  onClick={() => setIsCustomerAccordionOpen(!isCustomerAccordionOpen)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#FDFBF7] text-left transition"
                  aria-expanded={isCustomerAccordionOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-[#D97706] shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                          Pelanggan Pemesan
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#1F2937]">
                        {selectedOrder.customer.name}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                    <span className="text-[11px] text-[#9CA3AF] hidden sm:inline">
                      {isCustomerAccordionOpen ? 'Perkecil' : 'Perluas'}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F7F7F5] text-[#1F2937]">
                      {isCustomerAccordionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {isCustomerAccordionOpen && (
                  <div className="border-t border-[#F3F4F6] p-4 pt-3 bg-white space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#6B7280] block text-[11px]">No. Telepon / WhatsApp:</span>
                        <span className="font-semibold text-[#1F2937]">
                          {selectedOrder.customer.phone || '-'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#6B7280] block text-[11px]">Kategori:</span>
                        <strong className="text-[#1F2937]">{selectedOrder.customer.category}</strong>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between text-xs text-[#6B7280]">
                      <span>Saldo Deposit Saat Ini:</span>
                      <strong className="text-emerald-700 font-bold">{formatIDR(selectedOrder.customer.depositBalance)}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Balon 3: DAFTAR ITEM PESANAN (Collapsible List / Accordion) */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-xs transition">
                <button
                  type="button"
                  onClick={() => setIsOrderItemsAccordionOpen(!isOrderItemsAccordionOpen)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#FDFBF7] text-left transition"
                  aria-expanded={isOrderItemsAccordionOpen}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block">
                        Daftar Item Pesanan (Terkunci)
                      </span>
                      <span className="text-xs font-bold text-[#1F2937]">
                        {selectedOrder.items.length} jenis item ({selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} pcs)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                    <span className="text-[11px] text-[#9CA3AF] hidden sm:inline">
                      {isOrderItemsAccordionOpen ? 'Perkecil' : 'Perluas'}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F7F7F5] text-[#1F2937]">
                      {isOrderItemsAccordionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {isOrderItemsAccordionOpen && (
                  <div className="border-t border-[#F3F4F6] p-4 pt-3 bg-white space-y-3">
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-1 border-b border-[#F9FAFB] last:border-0">
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
                )}
              </div>

              {/* Balon 4: JADWAL PENGAMBILAN PESANAN */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    Jadwal Pengambilan Pesanan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tanggal Pengambilan Card */}
                  <div className="flex items-center gap-3 rounded-lg bg-[#F9FAFB] border border-[#F3F4F6] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-[#D97706] shrink-0">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280] block">
                        Tanggal Pengambilan
                      </span>
                      <strong className="text-xs font-bold text-[#1F2937]">
                        {selectedOrder.pickupDate || 'Hari Ini'}
                      </strong>
                    </div>
                  </div>

                  {/* Jam Pengambilan Card with integrated inline Edit action */}
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F9FAFB] border border-[#F3F4F6] p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-[#D97706] shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280] block">
                          Jam Pengambilan
                        </span>
                        <strong className="text-xs font-bold text-[#1F2937]">
                          {selectedOrder.pickupTime || '14:00'} WIB
                        </strong>
                      </div>
                    </div>

                    {selectedOrder.orderStatus !== 'picked_up' && selectedOrder.orderStatus !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => setIsEditingPickupTime(!isEditingPickupTime)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition shadow-2xs shrink-0 ${
                          isEditingPickupTime
                            ? 'border-neutral-300 bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-neutral-100'
                            : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:border-amber-400 active:scale-95'
                        }`}
                        title="Ubah jam pengambilan pesanan ini"
                      >
                        <Pencil className="h-3.5 w-3.5 text-[#D97706]" />
                        <span>{isEditingPickupTime ? 'Batal' : 'Ubah Jam'}</span>
                      </button>
                    )}
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
                        className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-bold text-[#1F2937] focus:border-[#D97706] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSavePickupTime}
                        className="rounded-lg bg-[#D97706] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
                      >
                        Simpan Perubahan Jam
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingPickupTime(false)}
                        className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#1F2937]"
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

              {/* Balon 5: STATUS OPERASIONAL & PENGAMBILAN (Tidak Ada yang Diubah) */}
              <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3 shadow-xs">
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
                        className="flex-1 rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs text-[#1F2937] focus:outline-none"
                      />
                      <button
                        onClick={handleConfirmPickup}
                        className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 active:scale-95 transition whitespace-nowrap"
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

              {/* Duplikasi Pesanan (Strictly for completed orders) */}
              {selectedOrder.orderStatus === 'picked_up' && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3 shadow-xs">
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

              {/* Balon 6: Batalkan Pesanan PO (Dibuat dalam bentuk Button untuk kemudahan layar sentuh) */}
              {selectedOrder.orderStatus !== 'picked_up' && selectedOrder.orderStatus !== 'cancelled' && (
                <div className="pt-2">
                  {!isCancelOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsCancelOpen(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3.5 text-xs sm:text-sm font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-400 active:scale-98 transition shadow-xs"
                    >
                      <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Batalkan Pesanan PO</span>
                    </button>
                  ) : (
                    <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-rose-700" />
                          Pembatalan Pesanan PO & Kredit Saldo Deposit
                        </h5>
                        <button
                          type="button"
                          onClick={() => setIsCancelOpen(false)}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 active:scale-95 transition"
                        >
                          Tutup
                        </button>
                      </div>

                      <p className="text-[11px] text-rose-900 leading-relaxed">
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
                          className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs text-[#1F2937] focus:outline-none"
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
                          className="w-48 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-mono text-[#1F2937] focus:outline-none"
                        />
                      </div>

                      {cancelErrorMsg && (
                        <p className="text-xs text-rose-700 font-bold">{cancelErrorMsg}</p>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleExecuteCancel}
                          className="w-full sm:w-auto rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition"
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


