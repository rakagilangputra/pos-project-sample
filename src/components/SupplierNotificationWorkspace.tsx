import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  WifiOff,
  Clock,
  Phone,
  Eye,
  Search,
  Filter,
  Check,
  Building2,
  FileText,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import {
  Supplier,
  Order,
  SupplierNotificationBatch,
  SupplierDeliveryLogEntry,
  NotificationDeliveryResult,
} from '../types';
import { formatIDR } from '../utils/formatters';

interface SupplierNotificationWorkspaceProps {
  onNavigateToPOS?: () => void;
}

export const SupplierNotificationWorkspace: React.FC<SupplierNotificationWorkspaceProps> = ({
  onNavigateToPOS,
}) => {
  const {
    suppliers,
    products,
    orders,
    currentUser,
    supplierNotificationBatches,
    supplierDeliveryLogs,
    sendSupplierWhatsAppNotification,
    resendSupplierWhatsAppNotification,
    generateSupplierWhatsAppMessage,
  } = usePOS();

  // Active Sub-Menu Tab
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'history'>('queue');

  // Search & Filter state for Queue
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'needs_attention' | 'all_sent'>('all');

  // Search & Filter state for History
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historySupplierFilter, setHistorySupplierFilter] = useState('all');
  const [historyResultFilter, setHistoryResultFilter] = useState<string>('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');

  // Modal State for Sending / Resending
  const [sendModalConfig, setSendModalConfig] = useState<{
    isOpen: boolean;
    mode: 'send' | 'resend';
    supplier?: Supplier;
    orders?: Order[];
    batch?: SupplierNotificationBatch;
    simulationOutcome: NotificationDeliveryResult;
  }>({
    isOpen: false,
    mode: 'send',
    simulationOutcome: 'success',
  });

  // Modal State for Message Inspection
  const [inspectMessageModal, setInspectMessageModal] = useState<{
    isOpen: boolean;
    title: string;
    recipientName: string;
    recipientPhone: string;
    messageText: string;
    result?: NotificationDeliveryResult;
    timestamp?: string;
    actor?: string;
    errorMessage?: string;
  } | null>(null);

  // Success / Status Toast
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setActionFeedback({ type, title, message });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const isCashier = currentUser.role === 'cashier';

  // 1. Identify all eligible orders: today's orders containing consignment items
  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper to extract consignment items for a specific supplier from an order
  const getConsignmentItemsForSupplier = (order: Order, supplierId: string) => {
    return order.items.filter((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const itemSupplierId = item.supplierId || prod?.supplierId;
      const isConsignment = item.ownershipType === 'consignment' || prod?.ownershipType === 'consignment';
      return isConsignment && itemSupplierId === supplierId;
    });
  };

  // Group today's orders by Supplier
  const supplierGroups = useMemo(() => {
    // Find all suppliers that have consignment products
    return suppliers.map((supplier) => {
      // Find orders that contain consignment items for this supplier
      const eligibleOrders = orders.filter((order) => {
        // Exclude completely voided/cancelled orders without sales impact if desired
        if (order.orderStatus === 'voided') return false;

        const matchingItems = getConsignmentItemsForSupplier(order, supplier.id);
        return matchingItems.length > 0;
      });

      // Find all batches for this supplier
      const batches = supplierNotificationBatches.filter((b) => b.supplierId === supplier.id);

      // Collect order IDs already grouped in existing batches
      const batchedOrderIds = new Set(batches.flatMap((b) => b.orderIds));

      // Unsent orders: eligible orders not yet in any batch
      const unsentOrders = eligibleOrders.filter((o) => !batchedOrderIds.has(o.id));

      // Calculate total unsent consignment items count
      const unsentItemsCount = unsentOrders.reduce((sum, order) => {
        const items = getConsignmentItemsForSupplier(order, supplier.id);
        return sum + items.reduce((iSum, i) => iSum + i.quantity, 0);
      }, 0);

      // Check if there are failed batches needing attention
      const failedBatchesCount = batches.filter(
        (b) => b.status === 'failed' || b.status === 'no_internet' || b.status === 'other'
      ).length;

      return {
        supplier,
        eligibleOrders,
        unsentOrders,
        unsentItemsCount,
        batches,
        failedBatchesCount,
        hasUnsent: unsentOrders.length > 0,
        needsAttention: unsentOrders.length > 0 || failedBatchesCount > 0,
      };
    });
  }, [suppliers, products, orders, supplierNotificationBatches]);

  // Suppliers with at least one eligible order or batch
  const activeSupplierGroups = useMemo(() => {
    return supplierGroups.filter((g) => g.eligibleOrders.length > 0 || g.batches.length > 0);
  }, [supplierGroups]);

  // Filtered supplier groups in Queue view
  const filteredQueueGroups = useMemo(() => {
    return activeSupplierGroups.filter((group) => {
      // Status Filter
      if (queueStatusFilter === 'needs_attention' && !group.needsAttention) return false;
      if (queueStatusFilter === 'all_sent' && group.needsAttention) return false;

      // Search Query
      if (queueSearchQuery.trim()) {
        const q = queueSearchQuery.toLowerCase();
        const matchName = group.supplier.name.toLowerCase().includes(q);
        const matchPic = (group.supplier.picName || '').toLowerCase().includes(q);
        const matchPhone = (group.supplier.phone || '').includes(q);
        const matchOrder = group.eligibleOrders.some(
          (o) =>
            (o.receiptNumber && o.receiptNumber.toLowerCase().includes(q)) ||
            (o.poNumber && o.poNumber.toLowerCase().includes(q)) ||
            (o.customer.name && o.customer.name.toLowerCase().includes(q))
        );
        return matchName || matchPic || matchPhone || matchOrder;
      }

      return true;
    });
  }, [activeSupplierGroups, queueStatusFilter, queueSearchQuery]);

  // Global Counts
  const totalUnsentSuppliersCount = useMemo(() => {
    return activeSupplierGroups.filter((g) => g.hasUnsent).length;
  }, [activeSupplierGroups]);

  const totalFailedBatchesCount = useMemo(() => {
    return supplierNotificationBatches.filter(
      (b) => b.status === 'failed' || b.status === 'no_internet' || b.status === 'other'
    ).length;
  }, [supplierNotificationBatches]);

  // Filtered Delivery Logs in History view
  const filteredHistoryLogs = useMemo(() => {
    return supplierDeliveryLogs.filter((log) => {
      // Supplier filter
      if (historySupplierFilter !== 'all' && log.supplierId !== historySupplierFilter) {
        return false;
      }

      // Result filter
      if (historyResultFilter !== 'all' && log.result !== historyResultFilter) {
        return false;
      }

      // Type filter
      if (historyTypeFilter !== 'all' && log.attemptType !== historyTypeFilter) {
        return false;
      }

      // Search query
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const matchSupplier = log.supplierName.toLowerCase().includes(q);
        const matchBatch = log.batchId.toLowerCase().includes(q);
        const matchActor = log.actorName.toLowerCase().includes(q);
        const matchReceipts = log.orderReceipts.some((r) => r.toLowerCase().includes(q));
        const matchPhone = log.supplierPhone.includes(q);
        return matchSupplier || matchBatch || matchActor || matchReceipts || matchPhone;
      }

      return true;
    });
  }, [
    supplierDeliveryLogs,
    historySupplierFilter,
    historyResultFilter,
    historyTypeFilter,
    historySearchQuery,
  ]);

  // Handler: Open Send Modal
  const handleOpenSendModal = (supplier: Supplier, unsentOrders: Order[]) => {
    if (isCashier) {
      showToast(
        'error',
        'Akses Terbatas',
        'Pengiriman notifikasi WhatsApp hanya dapat dilakukan oleh akun Supervisor atau Superadmin.'
      );
      return;
    }

    if (!supplier.phone || supplier.phone.trim() === '') {
      showToast(
        'warning',
        'Nomor WhatsApp Belum Ada',
        `Supplier ${supplier.name} belum memiliki nomor telepon WhatsApp. Silakan lengkapi pada Master Data Supplier.`
      );
      return;
    }

    setSendModalConfig({
      isOpen: true,
      mode: 'send',
      supplier,
      orders: unsentOrders,
      simulationOutcome: 'success',
    });
  };

  // Handler: Open Resend Modal
  const handleOpenResendModal = (batch: SupplierNotificationBatch) => {
    if (isCashier) {
      showToast(
        'error',
        'Akses Terbatas',
        'Pengiriman ulang notifikasi WhatsApp hanya dapat dilakukan oleh Supervisor atau Superadmin.'
      );
      return;
    }

    const supplier = suppliers.find((s) => s.id === batch.supplierId);
    const includedOrders = orders.filter((o) => batch.orderIds.includes(o.id));

    setSendModalConfig({
      isOpen: true,
      mode: 'resend',
      supplier,
      orders: includedOrders,
      batch,
      simulationOutcome: 'success',
    });
  };

  // Handler: Confirm Send / Resend
  const handleConfirmSendOrResend = () => {
    if (sendModalConfig.mode === 'send') {
      if (!sendModalConfig.supplier || !sendModalConfig.orders) return;

      const orderIds = sendModalConfig.orders.map((o) => o.id);
      const res = sendSupplierWhatsAppNotification(
        sendModalConfig.supplier.id,
        orderIds,
        sendModalConfig.simulationOutcome
      );

      if (res.success) {
        showToast('success', 'WhatsApp Terkirim', res.message);
      } else {
        showToast(
          'error',
          res.result === 'no_internet' ? 'Gangguan Koneksi' : 'Gagal Mengirim',
          res.message
        );
      }
    } else {
      if (!sendModalConfig.batch) return;

      const res = resendSupplierWhatsAppNotification(
        sendModalConfig.batch.id,
        sendModalConfig.simulationOutcome
      );

      if (res.success) {
        showToast('success', 'Kirim Ulang Berhasil', res.message);
      } else {
        showToast(
          'error',
          res.result === 'no_internet' ? 'Gangguan Koneksi' : 'Kirim Ulang Gagal',
          res.message
        );
      }
    }

    setSendModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // Result Badge Component
  const renderResultBadge = (result?: NotificationDeliveryResult) => {
    switch (result) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Terkirim Berhasil
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            Gagal Terkirim
          </span>
        );
      case 'no_internet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
            Gangguan Koneksi
          </span>
        );
      case 'other':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
            Lainnya / Error
          </span>
        );
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#F8F9FA] rounded-2xl border border-stone-200 shadow-sm">
      {/* Toast Feedback Notification */}
      {actionFeedback && (
        <div
          className={`fixed top-16 right-6 z-50 flex items-start gap-3 rounded-2xl p-4 shadow-2xl border max-w-md animate-slideDown transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : actionFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : actionFeedback.type === 'error' ? (
            <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="text-sm font-bold">{actionFeedback.title}</h4>
            <p className="text-xs mt-0.5 text-stone-700 leading-relaxed">
              {actionFeedback.message}
            </p>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Sub-Navigation */}
      <div className="bg-white border-b border-stone-200 px-5 py-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                Notifikasi Supplier
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  WhatsApp Gateway
                </span>
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Pemberitahuan manual pesanan produk kue titipan (konsinyasi) per supplier via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200 self-start md:self-auto">
          <button
            id="subtab-queue-btn"
            onClick={() => setActiveSubTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'queue'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="h-4 w-4 text-emerald-600" />
            <span>Antrean Notifikasi</span>
            {totalUnsentSuppliersCount > 0 && (
              <span className="rounded-full bg-amber-500 text-white px-2 py-0.2 text-[10px] font-bold">
                {totalUnsentSuppliersCount} Perlu Dikirim
              </span>
            )}
          </button>

          <button
            id="subtab-history-btn"
            onClick={() => setActiveSubTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeSubTab === 'history'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Clock className="h-4 w-4 text-stone-500" />
            <span>Riwayat Pengiriman</span>
            <span className="rounded-full bg-stone-200 text-stone-700 px-2 py-0.2 text-[10px] font-bold">
              {supplierDeliveryLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Cashier Warning Banner (POS-US-060 AC-02, AC-07) */}
      {isCashier && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Mode Kasir:</strong> Anda masuk sebagai Kasir. Tombol & aksi pengiriman notifikasi WhatsApp dinonaktifkan (khusus Supervisor / Superadmin).
            </span>
          </div>
          <span className="text-[11px] font-semibold bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md">
            Hanya Lihat
          </span>
        </div>
      )}

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* SUBTAB 1: ANTREAN NOTIFIKASI (Active Queues grouped by Supplier) */}
        {activeSubTab === 'queue' && (
          <div className="space-y-6">
            {/* Filter & Summary Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    id="queue-search-input"
                    type="text"
                    value={queueSearchQuery}
                    onChange={(e) => setQueueSearchQuery(e.target.value)}
                    placeholder="Cari nama supplier, PIC, no nota, atau nama pelanggan..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {queueSearchQuery && (
                    <button
                      onClick={() => setQueueSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-xs text-stone-400 hover:text-stone-700"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-stone-500 font-medium mr-1 hidden lg:inline">
                  Filter:
                </span>
                <button
                  onClick={() => setQueueStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    queueStatusFilter === 'all'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  Semua ({activeSupplierGroups.length})
                </button>
                <button
                  onClick={() => setQueueStatusFilter('needs_attention')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    queueStatusFilter === 'needs_attention'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Perlu Perhatian (
                  {activeSupplierGroups.filter((g) => g.needsAttention).length}
                  )
                </button>
                <button
                  onClick={() => setQueueStatusFilter('all_sent')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    queueStatusFilter === 'all_sent'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  Sudah Terkirim (
                  {activeSupplierGroups.filter((g) => !g.needsAttention).length}
                  )
                </button>
              </div>
            </div>

            {/* Empty State: No consignment orders today */}
            {activeSupplierGroups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-lg mx-auto shadow-sm my-8">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  Tidak Ada Pesanan Konsinyasi Hari Ini
                </h3>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                  Belum ada pesanan pelanggan yang memuat produk kue titipan (konsinyasi) pada hari ini ({todayStr}). Notifikasi akan otomatis muncul ketika kasir mencatat penjualan produk konsinyasi.
                </p>
                {onNavigateToPOS && (
                  <button
                    onClick={onNavigateToPOS}
                    className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-sm"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Buka Kasir (POS) untuk Transaksi
                  </button>
                )}
              </div>
            ) : filteredQueueGroups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
                Tidak ada data supplier yang cocok dengan filter pencarian "{queueSearchQuery}".
              </div>
            ) : (
              /* Supplier Group Cards */
              <div className="space-y-6">
                {filteredQueueGroups.map((group) => {
                  const { supplier, unsentOrders, unsentItemsCount, batches, needsAttention } = group;
                  const hasPhone = supplier.phone && supplier.phone.trim() !== '';

                  return (
                    <div
                      key={supplier.id}
                      id={`supplier-group-${supplier.id}`}
                      className={`bg-white rounded-2xl border transition shadow-sm overflow-hidden ${
                        needsAttention
                          ? 'border-amber-300 ring-1 ring-amber-200'
                          : 'border-stone-200'
                      }`}
                    >
                      {/* Supplier Group Header */}
                      <div className="p-4 sm:p-5 border-b border-stone-100 bg-[#FCFDFD] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-stone-900">
                                {supplier.name}
                              </h3>
                              <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                PIC: {supplier.picName || 'Belum diisi'}
                              </span>

                              {needsAttention ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                                  {unsentOrders.length} Pesanan Belum Dikirim
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  Semua Batch Terkirim
                                </span>
                              )}
                            </div>

                            {/* Contact info & address */}
                            <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-stone-500">
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                {hasPhone ? (
                                  <span className="font-mono text-stone-800 font-semibold">
                                    {supplier.phone}
                                  </span>
                                ) : (
                                  <span className="text-rose-600 font-semibold italic">
                                    Nomor WhatsApp Belum Terdaftar
                                  </span>
                                )}
                              </span>
                              <span>•</span>
                              <span>Komisi: {supplier.commissionRate}%</span>
                              <span>•</span>
                              <span>Total Riwayat Batch Hari Ini: {batches.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Direct Action in Header if Unsent */}
                        {unsentOrders.length > 0 && (
                          <div className="flex items-center gap-2 sm:self-center">
                            <button
                              id={`btn-send-whatsapp-${supplier.id}`}
                              disabled={isCashier || !hasPhone}
                              onClick={() => handleOpenSendModal(supplier, unsentOrders)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                                isCashier || !hasPhone
                                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                              }`}
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Kirim WhatsApp ({unsentOrders.length} Pesanan)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content Area: Unsent Batch Card + Sent Batches */}
                      <div className="p-4 sm:p-5 space-y-5">
                        {/* SECTION A: CURRENT UNSENT BATCH */}
                        {unsentOrders.length > 0 ? (
                          <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-4 relative">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                                <div>
                                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                                    Batch Belum Dikirim (Baru)
                                    <span className="px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                                      {unsentOrders.length} Pesanan • {unsentItemsCount} Item Konsinyasi
                                    </span>
                                  </h4>
                                  <p className="text-[11px] text-amber-700 mt-0.5">
                                    Pesanan ini akan digabung menjadi 1 pesan WhatsApp resmi untuk {supplier.name}.
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-auto">
                                <button
                                  onClick={() => {
                                    const previewMsg = generateSupplierWhatsAppMessage(
                                      supplier,
                                      unsentOrders
                                    );
                                    setInspectMessageModal({
                                      isOpen: true,
                                      title: `Draf Pesan WhatsApp - ${supplier.name}`,
                                      recipientName: supplier.name,
                                      recipientPhone: supplier.phone || '-',
                                      messageText: previewMsg,
                                    });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-bold text-amber-800 hover:bg-amber-100/50 transition"
                                >
                                  <Eye className="h-3.5 w-3.5 text-amber-700" />
                                  <span>Lihat Draf Pesan</span>
                                </button>

                                <button
                                  disabled={isCashier || !hasPhone}
                                  onClick={() => handleOpenSendModal(supplier, unsentOrders)}
                                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                                    isCashier || !hasPhone
                                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>Kirim Sekarang</span>
                                </button>
                              </div>
                            </div>

                            {/* List of Orders in this Unsent Batch */}
                            <div className="mt-3 divide-y divide-amber-200/50">
                              {unsentOrders.map((order) => {
                                const supplierItems = getConsignmentItemsForSupplier(
                                  order,
                                  supplier.id
                                );
                                const orderRef = order.poNumber || order.receiptNumber;

                                return (
                                  <div
                                    key={order.id}
                                    className="py-2.5 first:pt-1 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                                        <FileText className="h-3.5 w-3.5" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-stone-900">
                                            {orderRef}
                                          </span>
                                          <span className="text-stone-500">•</span>
                                          <span className="font-medium text-stone-700">
                                            Pelanggan: {order.customer.name}
                                          </span>
                                          <span className="text-stone-400 text-[11px]">
                                            (
                                            {new Date(order.createdAt).toLocaleTimeString(
                                              'id-ID',
                                              { hour: '2-digit', minute: '2-digit' }
                                            )}{' '}
                                            WIB)
                                          </span>
                                        </div>

                                        {/* Products for this supplier */}
                                        <div className="mt-1 flex flex-wrap gap-2">
                                          {supplierItems.map((item, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-amber-200 text-stone-800 text-[11px]"
                                            >
                                              <strong className="text-amber-700">
                                                {item.quantity}x
                                              </strong>{' '}
                                              {item.productName}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                                        Status: Belum Terkirim
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-stone-200 p-3 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              Tidak ada pesanan baru yang belum terkirim untuk {supplier.name}.
                            </span>
                            <span className="text-[11px] text-stone-400">
                              Semua pesanan konsinyasi telah diproses dalam batch di bawah.
                            </span>
                          </div>
                        )}

                        {/* SECTION B: PREVIOUSLY SENT BATCHES FOR THIS SUPPLIER */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                              <span>Riwayat Batch Hari Ini</span>
                              <span className="rounded-full bg-stone-200 text-stone-700 px-2 py-0.2 text-[10px] font-bold">
                                {batches.length} Batch
                              </span>
                            </h4>
                          </div>

                          {batches.length === 0 ? (
                            <div className="p-4 rounded-xl border border-stone-100 bg-stone-50/40 text-center text-xs text-stone-400">
                              Belum ada batch pengiriman yang tercatat hari ini untuk supplier ini.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {batches.map((batch) => {
                                const isSuccess = batch.status === 'success';
                                const isFailed = batch.status === 'failed' || batch.status === 'no_internet' || batch.status === 'other';

                                return (
                                  <div
                                    key={batch.id}
                                    id={`batch-card-${batch.id}`}
                                    className={`rounded-xl border p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                      isSuccess
                                        ? 'bg-white border-stone-200 hover:border-emerald-300'
                                        : 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-200'
                                    }`}
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono font-bold text-xs text-stone-900">
                                          {batch.id}
                                        </span>
                                        {renderResultBadge(batch.status)}
                                        <span className="text-xs text-stone-500">•</span>
                                        <span className="text-xs text-stone-600">
                                          {batch.orderIds.length} Pesanan Terangkum
                                        </span>
                                        {batch.attemptsCount > 1 && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                                            {batch.attemptsCount}x Kirim
                                          </span>
                                        )}
                                      </div>

                                      {/* Timestamp & Sent By */}
                                      <div className="text-[11px] text-stone-500 flex flex-wrap items-center gap-3">
                                        <span>
                                          Dikirim:{' '}
                                          <strong className="text-stone-700">
                                            {batch.sentAt
                                              ? new Date(batch.sentAt).toLocaleTimeString('id-ID', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })
                                              : new Date(batch.createdAt).toLocaleTimeString('id-ID', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                })}{' '}
                                            WIB
                                          </strong>
                                        </span>
                                        <span>•</span>
                                        <span>Operator: {batch.sentBy || 'Supervisor'}</span>
                                      </div>

                                      {/* Error Message if Failed */}
                                      {batch.lastErrorMessage && (
                                        <div className="text-xs text-rose-700 font-medium flex items-center gap-1.5 mt-1 bg-rose-100/60 px-2 py-1 rounded-md border border-rose-200">
                                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                                          <span>{batch.lastErrorMessage}</span>
                                        </div>
                                      )}

                                      {/* Included Order Tags */}
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                        <span className="text-[11px] text-stone-400">Nota:</span>
                                        {batch.orderIds.map((orderId) => {
                                          const ord = orders.find((o) => o.id === orderId);
                                          const label = ord ? ord.poNumber || ord.receiptNumber : orderId;
                                          return (
                                            <span
                                              key={orderId}
                                              className="font-mono text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200"
                                            >
                                              {label}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Batch Action Buttons: View Message & Resend */}
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                      <button
                                        onClick={() => {
                                          const includedOrders = orders.filter((o) =>
                                            batch.orderIds.includes(o.id)
                                          );
                                          const message = generateSupplierWhatsAppMessage(
                                            supplier,
                                            includedOrders
                                          );
                                          setInspectMessageModal({
                                            isOpen: true,
                                            title: `Detail Batch - ${batch.id}`,
                                            recipientName: batch.supplierName,
                                            recipientPhone: batch.supplierPhone,
                                            messageText: message,
                                            result: batch.status,
                                            timestamp: batch.sentAt || batch.createdAt,
                                            actor: batch.sentBy,
                                            errorMessage: batch.lastErrorMessage,
                                          });
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-stone-500" />
                                        <span>Lihat Pesan</span>
                                      </button>

                                      {/* Kirim Ulang (Resend) Button (POS-US-061) */}
                                      <button
                                        id={`btn-resend-batch-${batch.id}`}
                                        disabled={isCashier || !hasPhone}
                                        onClick={() => handleOpenResendModal(batch)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                                          isCashier || !hasPhone
                                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                            : isFailed
                                            ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95'
                                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                        }`}
                                      >
                                        <RotateCw className="h-3.5 w-3.5" />
                                        <span>Kirim Ulang</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: RIWAYAT PENGIRIMAN (POS-US-063: Full Audit Trail & Delivery Logs) */}
        {activeSubTab === 'history' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    id="history-search-input"
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Cari nomor nota, batch ID, nama supplier, no telp, atau operator..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-xs text-stone-400 hover:text-stone-700"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Supplier Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-stone-500">Supplier:</span>
                    <select
                      id="history-filter-supplier"
                      value={historySupplierFilter}
                      onChange={(e) => setHistorySupplierFilter(e.target.value)}
                      className="text-xs rounded-lg border border-stone-200 py-1.5 px-2 bg-white text-stone-800 focus:outline-none"
                    >
                      <option value="all">Semua Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Result Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-stone-500">Hasil:</span>
                    <select
                      id="history-filter-result"
                      value={historyResultFilter}
                      onChange={(e) => setHistoryResultFilter(e.target.value)}
                      className="text-xs rounded-lg border border-stone-200 py-1.5 px-2 bg-white text-stone-800 focus:outline-none"
                    >
                      <option value="all">Semua Hasil</option>
                      <option value="success">Berhasil (Success)</option>
                      <option value="failed">Gagal (Failed)</option>
                      <option value="no_internet">Gangguan Koneksi (No Internet)</option>
                      <option value="other">Lainnya</option>
                    </select>
                  </div>

                  {/* Type Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-stone-500">Tipe:</span>
                    <select
                      id="history-filter-type"
                      value={historyTypeFilter}
                      onChange={(e) => setHistoryTypeFilter(e.target.value)}
                      className="text-xs rounded-lg border border-stone-200 py-1.5 px-2 bg-white text-stone-800 focus:outline-none"
                    >
                      <option value="all">Semua Tipe</option>
                      <option value="send">Kirim Baru (Send)</option>
                      <option value="resend">Kirim Ulang (Resend)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
                <span>
                  Menampilkan <strong>{filteredHistoryLogs.length}</strong> log pengiriman WhatsApp
                </span>
                {(historySearchQuery ||
                  historySupplierFilter !== 'all' ||
                  historyResultFilter !== 'all' ||
                  historyTypeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setHistorySearchQuery('');
                      setHistorySupplierFilter('all');
                      setHistoryResultFilter('all');
                      setHistoryTypeFilter('all');
                    }}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* History Table */}
            {filteredHistoryLogs.length === 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
                Tidak ada riwayat pengiriman notifikasi yang sesuai dengan kriteria filter.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">Waktu & Operator</th>
                        <th className="py-3 px-4">Supplier & Kontak</th>
                        <th className="py-3 px-4">No. Batch & Tipe</th>
                        <th className="py-3 px-4">Nota / Pesanan Terkait</th>
                        <th className="py-3 px-4">Hasil Pengiriman</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-stone-700">
                      {filteredHistoryLogs.map((log) => {
                        return (
                          <tr key={log.id} className="hover:bg-stone-50/60 transition">
                            <td className="py-3 px-4">
                              <div className="font-medium text-stone-900">
                                {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                                ,{' '}
                                {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                WIB
                              </div>
                              <div className="text-[11px] text-stone-500">
                                {log.actorName} ({log.actorRole})
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-stone-900">{log.supplierName}</div>
                              <div className="text-[11px] font-mono text-emerald-700">
                                {log.supplierPhone}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-mono font-bold text-stone-800">
                                {log.batchId}
                              </div>
                              <div className="mt-0.5">
                                {log.attemptType === 'send' ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                    Kirim Baru
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                    Kirim Ulang
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 max-w-xs">
                              <div className="flex flex-wrap gap-1">
                                {log.orderReceipts.map((rcpt, idx) => (
                                  <span
                                    key={idx}
                                    className="font-mono text-[10px] bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded border border-stone-200"
                                  >
                                    {rcpt}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div>{renderResultBadge(log.result)}</div>
                              {log.errorMessage && (
                                <div className="text-[11px] text-rose-600 mt-1 max-w-xs truncate" title={log.errorMessage}>
                                  {log.errorMessage}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setInspectMessageModal({
                                    isOpen: true,
                                    title: `Detail Log Pengiriman - ${log.id}`,
                                    recipientName: log.supplierName,
                                    recipientPhone: log.supplierPhone,
                                    messageText: log.messageText,
                                    result: log.result,
                                    timestamp: log.timestamp,
                                    actor: `${log.actorName} (${log.actorRole})`,
                                    errorMessage: log.errorMessage,
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                              >
                                <Eye className="h-3 w-3 text-stone-500" />
                                <span>Detail</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: SEND / RESEND CONFIRMATION & GATEWAY SIMULATOR */}
      {sendModalConfig.isOpen && sendModalConfig.supplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-stone-200 bg-[#FDFBF7] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900">
                    {sendModalConfig.mode === 'send'
                      ? 'Kirim Pesan WhatsApp ke Supplier'
                      : 'Kirim Ulang Pesan WhatsApp'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Pemberitahuan manual untuk pesanan produk konsinyasi (Kue Titipan)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSendModalConfig((prev) => ({ ...prev, isOpen: false }))}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Recipient Details Card */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900 text-sm">
                    {sendModalConfig.supplier.name}
                  </div>
                  <div className="text-stone-500 mt-0.5">
                    PIC: <strong>{sendModalConfig.supplier.picName || 'Bapak/Ibu'}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-stone-400">Nomor WhatsApp Tujuan:</div>
                  <div className="font-mono text-sm font-bold text-emerald-700 flex items-center gap-1 justify-end">
                    <Phone className="h-3.5 w-3.5" />
                    {sendModalConfig.supplier.phone}
                  </div>
                </div>
              </div>

              {/* Order summary */}
              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-amber-900">
                <div className="font-bold flex items-center justify-between">
                  <span>Pesanan yang disertakan:</span>
                  <span className="font-mono text-xs">
                    {sendModalConfig.orders?.length || 0} Pesanan
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {sendModalConfig.orders?.map((o) => (
                    <span
                      key={o.id}
                      className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-amber-200 text-stone-800"
                    >
                      {o.poNumber || o.receiptNumber} ({o.customer.name})
                    </span>
                  ))}
                </div>
              </div>

              {/* Formatted Message Preview */}
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Pratinjau Pesan Resmi (WhatsApp Format):
                </label>
                <div className="bg-emerald-950 text-emerald-50 rounded-xl p-3.5 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all max-h-48 overflow-y-auto border border-emerald-900">
                  {sendModalConfig.orders &&
                    generateSupplierWhatsAppMessage(
                      sendModalConfig.supplier,
                      sendModalConfig.orders
                    )}
                </div>
              </div>

              {/* Interactive Gateway Simulation Option (for testing POS-US-060 AC-03 & AC-04) */}
              <div className="p-3 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                    Simulasi Respons Gateway WhatsApp:
                  </label>
                  <span className="text-[10px] text-stone-400">Pengujian & QA</span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Pilih skenario gateway untuk menguji perilaku sistem saat sukses, gagal kirim, atau kehilangan koneksi:
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setSendModalConfig((prev) => ({ ...prev, simulationOutcome: 'success' }))
                    }
                    className={`py-2 px-2.5 rounded-lg border text-center transition font-bold text-[11px] ${
                      sendModalConfig.simulationOutcome === 'success'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    ✓ Berhasil (200 OK)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSendModalConfig((prev) => ({ ...prev, simulationOutcome: 'no_internet' }))
                    }
                    className={`py-2 px-2.5 rounded-lg border text-center transition font-bold text-[11px] ${
                      sendModalConfig.simulationOutcome === 'no_internet'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    ⚠ Gangguan Koneksi (504)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSendModalConfig((prev) => ({ ...prev, simulationOutcome: 'failed' }))
                    }
                    className={`py-2 px-2.5 rounded-lg border text-center transition font-bold text-[11px] ${
                      sendModalConfig.simulationOutcome === 'failed'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    ✕ Gagal Gateway (400)
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSendModalConfig((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition"
              >
                Batal
              </button>

              <button
                id="btn-confirm-send-whatsapp"
                type="button"
                onClick={handleConfirmSendOrResend}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 active:scale-95 transition shadow-sm"
              >
                <Send className="h-4 w-4" />
                <span>
                  {sendModalConfig.mode === 'send'
                    ? 'Konfirmasi & Kirim Pesan'
                    : 'Konfirmasi Kirim Ulang'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT MESSAGE CONTENT */}
      {inspectMessageModal && inspectMessageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-stone-200 bg-[#FCFDFD] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900">
                  {inspectMessageModal.title}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Penerima: <strong>{inspectMessageModal.recipientName}</strong> (
                  {inspectMessageModal.recipientPhone})
                </p>
              </div>
              <button
                onClick={() => setInspectMessageModal(null)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {inspectMessageModal.result && (
                <div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                  <span className="text-stone-500">Status Pengiriman:</span>
                  <div>{renderResultBadge(inspectMessageModal.result)}</div>
                </div>
              )}

              {inspectMessageModal.timestamp && (
                <div className="flex items-center justify-between text-stone-500 text-[11px] px-1">
                  <span>Waktu: {new Date(inspectMessageModal.timestamp).toLocaleString('id-ID')}</span>
                  {inspectMessageModal.actor && <span>Operator: {inspectMessageModal.actor}</span>}
                </div>
              )}

              {inspectMessageModal.errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <strong>Pesan Error Gateway:</strong> {inspectMessageModal.errorMessage}
                </div>
              )}

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Isi Pesan WhatsApp:
                </label>
                <div className="bg-stone-900 text-stone-100 rounded-xl p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all max-h-72 overflow-y-auto">
                  {inspectMessageModal.messageText}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-stone-200 bg-stone-50 text-right">
              <button
                onClick={() => setInspectMessageModal(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
