import React, { useState, useMemo } from 'react';
import {
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Receipt,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  CreditCard,
  FileText,
  DollarSign,
  ChevronRight,
  UserPlus,
  Info,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { SupplierSettlementCycle } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';
import { AddSupplierModal } from './AddSupplierModal';

type ConsignmentLocalView = 'summary' | 'ledger' | 'settlement' | 'suppliers';
type DateFilterPeriod = 'today' | 'week' | 'month' | 'all';

export const ConsignmentWorkspace: React.FC = () => {
  const {
    suppliers,
    products,
    commissionLedger,
    settlementCycles,
    recordSettlementPayment,
    generateSettlementCycles,
    currentUser,
    verifySupervisorPin,
  } = usePOS();

  // Local View Navigation (Ringkasan default, Buku Besar Komisi, Settlement, Mitra Supplier)
  const [activeView, setActiveView] = useState<ConsignmentLocalView>('summary');

  // Single modal for Add Supplier
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  // Filters
  const [datePeriod, setDatePeriod] = useState<DateFilterPeriod>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'due' | 'overdue' | 'settled'>('all');

  // Record Settlement Payment Modal (single layer, POS-US-035 & POS-US-049)
  const [paymentCycle, setPaymentCycle] = useState<SupplierSettlementCycle | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'qris' | 'other'>('transfer');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payPin, setPayPin] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Filtered Commission Ledger
  const filteredLedger = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    return commissionLedger.filter((entry) => {
      // Date filter
      if (datePeriod === 'today' && !entry.createdAt.startsWith(todayStr)) return false;
      if (datePeriod === 'week' && new Date(entry.createdAt) < weekAgo) return false;
      if (datePeriod === 'month' && new Date(entry.createdAt) < monthAgo) return false;

      // Supplier filter
      if (selectedSupplierId !== 'all' && entry.supplierId !== selectedSupplierId) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProd = entry.productName.toLowerCase().includes(q);
        const matchSup = entry.supplierName.toLowerCase().includes(q);
        const matchRec = entry.receiptNumber.toLowerCase().includes(q);
        if (!matchProd && !matchSup && !matchRec) return false;
      }

      return true;
    });
  }, [commissionLedger, datePeriod, selectedSupplierId, searchQuery]);

  // Primary KPIs (POS-US-051 AC-03: No more than 4 primary summary cards)
  const kpis = useMemo(() => {
    const valid = filteredLedger.filter((e) => e.status !== 'reversed');
    const netConsignmentSales = valid.reduce((sum, e) => sum + e.netAmount, 0);
    const storeCommission = valid.reduce((sum, e) => sum + e.commissionAmount, 0);

    // Unpaid settlements (due and overdue)
    const dueOrOverdueCycles = settlementCycles.filter((s) => s.status === 'due' || s.status === 'overdue');
    const totalDueOrOverduePayable = dueOrOverdueCycles.reduce((sum, s) => sum + s.storeNetAfterCommission, 0);

    // Nearest due date
    const unpaidWithDueDate = settlementCycles
      .filter((s) => s.status !== 'settled')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const nearestDue = unpaidWithDueDate[0] || null;

    return {
      totalDueOrOverduePayable,
      dueOrOverdueCount: dueOrOverdueCycles.length,
      nearestDueDate: nearestDue ? nearestDue.dueDate : '-',
      nearestDueSupplier: nearestDue ? nearestDue.supplierName : 'Tidak Ada',
      storeCommission,
      netConsignmentSales,
    };
  }, [filteredLedger, settlementCycles]);

  // Attention Required Items (Overdue and Due Today cycles)
  const attentionItems = useMemo(() => {
    return settlementCycles.filter((c) => c.status === 'overdue' || c.status === 'due');
  }, [settlementCycles]);

  // Supplier Recap Table (POS-US-051 AC-03)
  const supplierRecap = useMemo(() => {
    return suppliers.map((sup) => {
      const supEntries = filteredLedger.filter((e) => e.supplierId === sup.id && e.status !== 'reversed');
      const netSales = supEntries.reduce((s, e) => s + e.netAmount, 0);
      const commission = supEntries.reduce((s, e) => s + e.commissionAmount, 0);
      const payable = netSales - commission;

      const supCycles = settlementCycles
        .filter((c) => c.supplierId === sup.id && c.status !== 'settled')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const nextCycle = supCycles[0];

      return {
        supplier: sup,
        netSales,
        commission,
        payable,
        nextDueDate: nextCycle ? nextCycle.dueDate : sup.nextDueDate || '-',
        hasOverdue: supCycles.some((c) => c.status === 'overdue'),
        hasDueToday: supCycles.some((c) => c.status === 'due'),
      };
    });
  }, [suppliers, filteredLedger, settlementCycles]);

  // Filtered Settlement Cycles
  const filteredCycles = useMemo(() => {
    return settlementCycles.filter((c) => {
      if (settlementFilter !== 'all' && c.status !== settlementFilter) return false;
      if (selectedSupplierId !== 'all' && c.supplierId !== selectedSupplierId) return false;
      return true;
    });
  }, [settlementCycles, settlementFilter, selectedSupplierId]);

  // Handle Payment Submit (POS-US-035 & POS-US-049)
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPayError('');
    setPaySuccess('');

    if (!paymentCycle) return;

    if (currentUser.role !== 'admin') {
      if (!payPin) {
        setPayError('PIN Supervisor diperlukan untuk mencatat pembayaran settlement!');
        return;
      }
      const auth = verifySupervisorPin(payPin);
      if (!auth.success) {
        setPayError(auth.message);
        return;
      }
    }

    setIsSubmittingPay(true);
    const res = recordSettlementPayment(
      paymentCycle.id,
      payMethod,
      payReference,
      payNotes,
      payPin
    );
    setIsSubmittingPay(false);

    if (!res.success) {
      setPayError(res.message);
      return;
    }

    setPaySuccess(res.message);
    setTimeout(() => {
      setPaymentCycle(null);
      setPayReference('');
      setPayNotes('');
      setPayPin('');
      setPaySuccess('');
    }, 700);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white border-2 border-[#E5DACE] rounded-[2rem] shadow-sm">
      {/* Workspace Header with 4 Local Views (POS-US-051) */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-3.5 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-700 text-white shadow-xs font-black">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#2D241E]">
              Workspace Konsinyasi & Pembayaran Mitra
            </h2>
            <p className="text-xs text-[#8C7B6C] font-semibold">
              Kewajiban Supplier, Buku Besar Komisi, & Settlement (POS-US-051)
            </p>
          </div>
        </div>

        {/* Local View Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-purple-100/60 p-1 border border-purple-200">
          <button
            onClick={() => setActiveView('summary')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeView === 'summary'
                ? 'bg-white text-purple-950 shadow-xs'
                : 'text-[#8C7B6C] hover:text-purple-900'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Ringkasan</span>
          </button>

          <button
            onClick={() => setActiveView('ledger')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeView === 'ledger'
                ? 'bg-white text-purple-950 shadow-xs'
                : 'text-[#8C7B6C] hover:text-purple-900'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Buku Besar Komisi</span>
          </button>

          <button
            onClick={() => setActiveView('settlement')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeView === 'settlement'
                ? 'bg-white text-purple-950 shadow-xs'
                : 'text-[#8C7B6C] hover:text-purple-900'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Settlement</span>
            {attentionItems.length > 0 && (
              <span className="rounded-full bg-rose-600 text-white text-[9px] px-1.5 py-0.2 font-black">
                {attentionItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('suppliers')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeView === 'suppliers'
                ? 'bg-white text-purple-950 shadow-xs'
                : 'text-[#8C7B6C] hover:text-purple-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Mitra Supplier ({suppliers.length})</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {activeView === 'settlement' && (
            <button
              onClick={() => {
                const res = generateSettlementCycles();
                alert(`Siklus settlement diperbarui! ${res.count} siklus terdeteksi.`);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-purple-300 bg-white px-3 py-2 text-xs font-bold text-purple-800 hover:bg-purple-50 active:scale-95 transition shadow-xs"
              title="Periksa transaksi baru dan sinkronkan siklus settlement"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Sinkronkan Siklus</span>
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          LOCAL VIEW 1: RINGKASAN (POS-US-051 AC-03)
          ------------------------------------------------------------- */}
      {activeView === 'summary' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Period Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8C7B6C]">
              <span>Periode Data:</span>
              <div className="flex gap-1">
                {[
                  { id: 'today', label: 'Hari Ini' },
                  { id: 'week', label: '7 Hari Terakhir' },
                  { id: 'month', label: '30 Hari Terakhir' },
                  { id: 'all', label: 'Semua Periode' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setDatePeriod(p.id as DateFilterPeriod)}
                    className={`rounded-lg px-2.5 py-1 transition ${
                      datePeriod === p.id
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-[#FDFBF7] text-[#8C7B6C] border border-[#E5DACE] hover:bg-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Consignment product origin banner reminder */}
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#8C7B6C] bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
              <Info className="h-3.5 w-3.5 text-[#D97706] shrink-0" />
              <span>
                Penambahan barang titipan dilakukan dari <strong>Stok &gt; Tambah Produk</strong> dengan memilih kepemilikan Konsinyasi.
              </span>
            </div>
          </div>

          {/* KPI Cards (No more than 4 primary summary cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Supplier Payable Due/Overdue */}
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                <span>Hutang Jatuh Tempo / Overdue</span>
                <Clock className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-rose-900">
                {formatIDR(kpis.totalDueOrOverduePayable)}
              </div>
              <p className="text-[10px] text-rose-700 font-semibold">
                {kpis.dueOrOverdueCount > 0
                  ? `${kpis.dueOrOverdueCount} siklus menunggu pembayaran segera`
                  : 'Tidak ada hutang terlambat saat ini'}
              </p>
            </div>

            {/* KPI 2: Nearest Due Date */}
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                <span>Jatuh Tempo Terdekat</span>
                <Calendar className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-amber-900">
                {kpis.nearestDueDate}
              </div>
              <p className="text-[10px] text-amber-700 font-semibold truncate">
                Mitra: {kpis.nearestDueSupplier}
              </p>
            </div>

            {/* KPI 3: Store Commission for selected period */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                <span>Komisi Bersih Toko</span>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-emerald-900">
                {formatIDR(kpis.storeCommission)}
              </div>
              <p className="text-[10px] text-emerald-700 font-semibold">
                Pendapatan bagi hasil toko periode ini
              </p>
            </div>

            {/* KPI 4: Net Consignment Sales for selected period */}
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/50 p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-purple-800">
                <span>Penjualan Bersih Konsinyasi</span>
                <Building2 className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-purple-950">
                {formatIDR(kpis.netConsignmentSales)}
              </div>
              <p className="text-[10px] text-purple-700 font-semibold">
                Total omzet produk titipan laku terjual
              </p>
            </div>
          </div>

          {/* Attention Required Section for Overdue & Due Obligations */}
          {attentionItems.length > 0 && (
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Perhatian Khusus: Pembayaran Settlement Jatuh Tempo & Terlambat ({attentionItems.length})</span>
                </div>
                <button
                  onClick={() => setActiveView('settlement')}
                  className="text-xs font-bold text-rose-800 hover:underline"
                >
                  Buka Tab Settlement &rarr;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {attentionItems.map((cycle) => (
                  <div
                    key={cycle.id}
                    className="flex flex-col justify-between rounded-xl border border-rose-300 bg-white p-3 space-y-2 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#2D241E]">{cycle.supplierName}</span>
                        <span
                          className={`rounded-md px-2 py-0.2 text-[9px] font-black text-white ${
                            cycle.status === 'overdue' ? 'bg-rose-600' : 'bg-amber-600'
                          }`}
                        >
                          {cycle.status === 'overdue' ? 'TERLAMBAT' : 'JATUH TEMPO'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8C7B6C] mt-1">
                        Jatuh Tempo: <strong>{cycle.dueDate}</strong>
                      </div>
                      <div className="text-sm font-black text-rose-900 mt-1">
                        {formatIDR(cycle.storeNetAfterCommission)}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setPaymentCycle(cycle);
                        setPayReference('');
                        setPayNotes('');
                      }}
                      className="rounded-lg bg-purple-700 py-1.5 text-center text-xs font-bold text-white hover:bg-purple-800 active:scale-95 transition"
                    >
                      Bayar Sekarang
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supplier Recap Comparable Table */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-[#2D241E]">
                Rekapitulasi Penjualan & Hutang Per Mitra Supplier
              </h3>
              <span className="text-xs text-[#8C7B6C]">
                {suppliers.length} Mitra Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] font-black uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mitra Supplier</th>
                    <th className="py-2.5 px-3 text-right">Penjualan Bersih</th>
                    <th className="py-2.5 px-3 text-right">Komisi Toko</th>
                    <th className="py-2.5 px-3 text-right">Hutang Supplier</th>
                    <th className="py-2.5 px-3 text-center">Jatuh Tempo Terdekat</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACE]/60">
                  {supplierRecap.map((item) => (
                    <tr key={item.supplier.id} className="hover:bg-[#FDFBF7] transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#2D241E]">{item.supplier.name}</div>
                        <div className="text-[10px] text-[#8C7B6C]">
                          PIC: {item.supplier.picName} ({item.supplier.phone})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#2D241E]">
                        {formatIDR(item.netSales)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                        {formatIDR(item.commission)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-purple-950">
                        {formatIDR(item.payable)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-[#8C7B6C]">
                        {item.nextDueDate}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.hasOverdue ? (
                          <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-black">
                            Overdue
                          </span>
                        ) : item.hasDueToday ? (
                          <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-black">
                            Due Today
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black">
                            Lancar
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 2: BUKU BESAR KOMISI (Traceability Table, POS-US-051 AC-04)
          ------------------------------------------------------------- */}
      {activeView === 'ledger' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] bg-white px-6 py-3 shrink-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C7B6C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no nota, produk, atau mitra..."
                className="w-full rounded-xl border border-[#E5DACE] bg-[#FDFBF7] pl-10 pr-4 py-2 text-xs font-bold text-[#2D241E] focus:border-purple-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {/* Supplier Filter */}
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-purple-600 focus:outline-none"
              >
                <option value="all">Semua Mitra Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Date Filter */}
              <select
                value={datePeriod}
                onChange={(e) => setDatePeriod(e.target.value as DateFilterPeriod)}
                className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-purple-600 focus:outline-none"
              >
                <option value="all">Semua Periode</option>
                <option value="today">Hari Ini</option>
                <option value="week">7 Hari Terakhir</option>
                <option value="month">30 Hari Terakhir</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 overflow-auto p-4">
            {filteredLedger.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-8 text-[#8C7B6C]">
                <Receipt className="h-12 w-12 opacity-30 mb-2" />
                <p className="font-bold text-sm">Tidak ada catatan transaksi komisi pada filter ini.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] font-black uppercase text-[10px]">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">No. Nota</th>
                    <th className="py-2.5 px-3">Mitra Supplier</th>
                    <th className="py-2.5 px-3">Produk</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Penjualan Bersih</th>
                    <th className="py-2.5 px-3 text-right">Komisi Toko</th>
                    <th className="py-2.5 px-3 text-right">Hutang Supplier</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACE]/60">
                  {filteredLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#FDFBF7] transition">
                      <td className="py-2 px-3 text-[#8C7B6C]">{formatDateTime(entry.createdAt)}</td>
                      <td className="py-2 px-3 font-bold text-[#2D241E]">{entry.receiptNumber}</td>
                      <td className="py-2 px-3 font-semibold text-purple-950">{entry.supplierName}</td>
                      <td className="py-2 px-3 font-bold text-[#2D241E]">{entry.productName}</td>
                      <td className="py-2 px-3 text-center font-bold">{entry.quantity}</td>
                      <td className="py-2 px-3 text-right font-semibold">{formatIDR(entry.netAmount)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800">
                        {formatIDR(entry.commissionAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-purple-950">
                        {formatIDR(entry.storeNetAmount)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                            entry.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.status === 'included'
                              ? 'bg-amber-100 text-amber-800'
                              : entry.status === 'reversed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {entry.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 3: SETTLEMENT (Payable Cycles & Payment, POS-US-051 AC-05, AC-06, AC-07)
          ------------------------------------------------------------- */}
      {activeView === 'settlement' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] bg-white px-6 py-3 shrink-0">
            <div className="flex gap-1.5 text-xs font-bold">
              {[
                { id: 'all', label: 'Semua Siklus' },
                { id: 'due', label: 'Jatuh Tempo (Due)' },
                { id: 'overdue', label: 'Terlambat (Overdue)' },
                { id: 'settled', label: 'Sudah Dibayar (Settled)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSettlementFilter(f.id as any)}
                  className={`rounded-xl px-3 py-1.5 transition ${
                    settlementFilter === f.id
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-[#8C7B6C] border border-[#E5DACE] hover:bg-[#FDFBF7]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-[#8C7B6C] font-semibold">
              Menampilkan {filteredCycles.length} siklus
            </span>
          </div>

          {/* Settlement Table */}
          <div className="flex-1 overflow-auto p-4">
            {filteredCycles.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-8 text-[#8C7B6C]">
                <CreditCard className="h-12 w-12 opacity-30 mb-2" />
                <p className="font-bold text-sm">Tidak ada siklus settlement pada filter ini.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] font-black uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mitra Supplier</th>
                    <th className="py-2.5 px-3">Periode Siklus</th>
                    <th className="py-2.5 px-3 text-center">Jatuh Tempo</th>
                    <th className="py-2.5 px-3 text-right">Penjualan Bersih</th>
                    <th className="py-2.5 px-3 text-right">Komisi Toko</th>
                    <th className="py-2.5 px-3 text-right">Hutang Dibayar (Net)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACE]/60">
                  {filteredCycles.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-[#FDFBF7] transition">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-[#2D241E]">{cycle.supplierName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[#8C7B6C]">
                        {cycle.periodStart} s/d {cycle.periodEnd}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-[#2D241E]">
                        {cycle.dueDate}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {formatIDR(cycle.netItemSales)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                        {formatIDR(cycle.commissionPayable)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-purple-950 text-sm">
                        {formatIDR(cycle.storeNetAfterCommission)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${
                            cycle.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cycle.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : cycle.status === 'due'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {cycle.status === 'settled'
                            ? 'LUNAS'
                            : cycle.status === 'overdue'
                            ? 'OVERDUE'
                            : cycle.status === 'due'
                            ? 'JATUH TEMPO'
                            : 'AKAN DATANG'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {cycle.status !== 'settled' ? (
                          <button
                            onClick={() => {
                              setPaymentCycle(cycle);
                              setPayReference('');
                              setPayNotes('');
                              setPayError('');
                            }}
                            className="rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 shadow-xs active:scale-95 transition"
                          >
                            Catat Bayar
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-800 font-bold">
                            Dibayar ({cycle.paymentMethod?.toUpperCase()})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 4: MITRA SUPPLIER (POS-US-051 AC-08, AC-09)
          ------------------------------------------------------------- */}
      {activeView === 'suppliers' && (
        <div className="flex flex-1 flex-col overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
            <div>
              <h3 className="font-black text-sm text-[#2D241E]">Daftar Mitra Supplier Konsinyasi</h3>
              <p className="text-xs text-[#8C7B6C]">
                Data kontak, rekening bank, dan jadwal pembayaran settlement mitra (POS-US-030)
              </p>
            </div>
            <button
              onClick={() => setIsAddSupplierOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-700 px-4 py-2 text-xs font-black text-white hover:bg-purple-800 shadow-xs active:scale-95 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Tambah Supplier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
            {suppliers.map((sup) => {
              const activeProdCount = products.filter(
                (p) => p.ownershipType === 'consignment' && p.supplierId === sup.id
              ).length;

              return (
                <div
                  key={sup.id}
                  className="flex flex-col justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-5 space-y-3 shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-base text-[#2D241E]">{sup.name}</h4>
                        <p className="text-xs text-[#8C7B6C] font-semibold">
                          PIC: {sup.picName} • {sup.phone}
                        </p>
                      </div>
                      <span className="rounded-full bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 text-[10px] font-black">
                        {activeProdCount} Produk
                      </span>
                    </div>

                    <div className="rounded-xl bg-[#FDFBF7] border border-[#E5DACE] p-3 space-y-1 text-xs">
                      <div className="text-[#8C7B6C]">
                        Jadwal Settlement:{' '}
                        <strong className="text-[#2D241E]">
                          {sup.scheduleType === 'weekly'
                            ? `Mingguan (${sup.weeklyDays?.join(', ') || 'Senin'})`
                            : `2x Sebulan (Tgl ${sup.monthlyDates?.join(' & ') || '15 & 30'})`}
                        </strong>
                      </div>
                      <div className="text-[#8C7B6C]">
                        Jatuh Tempo Berikutnya:{' '}
                        <strong className="text-purple-950">{sup.nextDueDate || 'Sesuai Jadwal'}</strong>
                      </div>
                      {sup.bankName && (
                        <div className="text-[11px] text-[#8C7B6C]">
                          Rekening: {sup.bankName} - {sup.bankAccountNumber} ({sup.bankAccountHolder})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5DACE] flex justify-between items-center text-[11px] text-[#8C7B6C]">
                    <span>Alamat: {sup.address || 'Dalam Kota'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SINGLE-LAYER MODAL: RECORD SETTLEMENT PAYMENT (POS-US-035 & POS-US-049)
          ------------------------------------------------------------- */}
      {paymentCycle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmPayment}
            className="w-full max-w-lg rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] p-6 shadow-2xl space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
              <div>
                <h3 className="text-base font-black text-purple-950">Catat Pembayaran Settlement</h3>
                <p className="text-xs text-[#8C7B6C]">
                  {paymentCycle.supplierName} ({paymentCycle.periodStart} s/d {paymentCycle.periodEnd})
                </p>
              </div>
              <span className="rounded-xl bg-purple-100 text-purple-900 border border-purple-200 px-3 py-1 text-xs font-black">
                Jatuh Tempo: {paymentCycle.dueDate}
              </span>
            </div>

            {payError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800">
                {payError}
              </div>
            )}
            {paySuccess && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
                {paySuccess}
              </div>
            )}

            {/* Total Payable Display */}
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/70 p-4 text-center">
              <span className="text-xs font-bold text-purple-800 block">Total Tagihan Yang Dibayarkan:</span>
              <span className="text-2xl font-black text-purple-950">
                {formatIDR(paymentCycle.storeNetAfterCommission)}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'transfer', label: 'Bank Transfer' },
                  { id: 'cash', label: 'Tunai Kas Toko' },
                  { id: 'qris', label: 'QRIS / Giro' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id as any)}
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      payMethod === m.id
                        ? 'border-purple-600 bg-purple-100 text-purple-900'
                        : 'border-[#E5DACE] bg-white text-[#8C7B6C]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2D241E] mb-2">Nomor Bukti Transfer / Referensi</label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Contoh: TRF-BCA-883920"
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-purple-600 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2D241E] mb-2">Catatan Pembayaran (Opsional)</label>
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Keterangan tambahan settlement..."
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:border-purple-600 focus:outline-none"
              />
            </div>

            {/* Supervisor PIN for non-admin */}
            {currentUser.role !== 'admin' && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
                <label className="block text-xs font-bold text-amber-950 mb-2">
                  PIN Supervisor Otorisasi Pembayaran:
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={payPin}
                  onChange={(e) => setPayPin(e.target.value)}
                  placeholder="PIN SPV..."
                  className="mt-2.5 block w-44 rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold tracking-widest text-[#2D241E] focus:border-purple-600 focus:outline-none shadow-xs"
                />
              </div>
            )}

            {/* Modal Actions with Bottom-Right Tutup button (POS-US-049) */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
              <button
                type="submit"
                disabled={isSubmittingPay}
                className="rounded-xl bg-purple-700 px-5 py-2 text-xs font-black text-white hover:bg-purple-800 shadow-xs active:scale-95 transition disabled:opacity-50"
              >
                Konfirmasi Pembayaran
              </button>
              <button
                type="button"
                onClick={() => setPaymentCycle(null)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SINGLE-LAYER MODAL: TAMBAH MITRA SUPPLIER (POS-US-030 & POS-US-049) */}
      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
      />
    </div>
  );
};
