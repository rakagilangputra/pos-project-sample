import React, { useState, useMemo } from 'react';
import {
  Building2,
  X,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  CreditCard,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { SupplierSettlementCycle, CommissionLedgerEntry } from '../types';
import { formatIDR } from '../utils/formatters';

interface ConsignmentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddSupplier: () => void;
  onOpenAddProduct: () => void;
}

type TabType = 'dashboard' | 'ledger' | 'settlements' | 'suppliers';
type DateFilterType = 'today' | 'week' | 'month' | 'all';

export const ConsignmentManagementModal: React.FC<ConsignmentManagementModalProps> = ({
  isOpen,
  onClose,
  onOpenAddSupplier,
  onOpenAddProduct,
}) => {
  const {
    suppliers,
    commissionLedger,
    settlementCycles,
    recordSettlementPayment,
    generateSettlementCycles,
    currentUser,
    verifySupervisorPin,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Settlement Payment Modal State (POS-US-035)
  const [paymentCycle, setPaymentCycle] = useState<SupplierSettlementCycle | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'qris' | 'other'>('transfer');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payPin, setPayPin] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  // Filtered Ledger by date and supplier
  const filteredLedger = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    return commissionLedger.filter((entry) => {
      // Date filter
      if (dateFilter === 'today' && !entry.createdAt.startsWith(todayStr)) {
        return false;
      }
      if (dateFilter === 'week' && new Date(entry.createdAt) < weekAgo) {
        return false;
      }
      if (dateFilter === 'month' && new Date(entry.createdAt) < monthAgo) {
        return false;
      }

      // Supplier filter
      if (selectedSupplierFilter !== 'all' && entry.supplierId !== selectedSupplierFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesProduct = entry.productName.toLowerCase().includes(q);
        const matchesSupplier = entry.supplierName.toLowerCase().includes(q);
        const matchesReceipt = entry.receiptNumber.toLowerCase().includes(q);
        if (!matchesProduct && !matchesSupplier && !matchesReceipt) return false;
      }

      return true;
    });
  }, [commissionLedger, dateFilter, selectedSupplierFilter, searchQuery]);

  // Dashboard KPI metrics (POS-US-033)
  const kpis = useMemo(() => {
    // Only valid transactions (not reversed)
    const valid = filteredLedger.filter((e) => e.status !== 'reversed');

    const totalUnits = valid.reduce((sum, e) => sum + e.quantity, 0);
    const totalGross = valid.reduce((sum, e) => sum + e.grossAmount, 0);
    const totalDiscounts = valid.reduce((sum, e) => sum + e.allocatedDiscount, 0);
    const totalNet = valid.reduce((sum, e) => sum + e.netAmount, 0);
    const totalCommission = valid.reduce((sum, e) => sum + e.commissionAmount, 0);
    const totalStoreNet = valid.reduce((sum, e) => sum + e.storeNetAmount, 0);

    // Outstanding unpaid settlements
    const unpaidSettlements = settlementCycles.filter((s) => s.status !== 'settled');
    const totalUnsettledDebt = unpaidSettlements.reduce((sum, s) => sum + s.storeNetAfterCommission, 0);

    return {
      totalUnits,
      totalGross,
      totalDiscounts,
      totalNet,
      totalCommission,
      totalStoreNet,
      totalUnsettledDebt,
    };
  }, [filteredLedger, settlementCycles]);

  // Handle Pay Settlement Submit (POS-US-035)
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

    const res = recordSettlementPayment(
      paymentCycle.id,
      payMethod,
      payReference,
      payNotes,
      payPin
    );

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

  // Check how many overdue & due today cycles exist (POS-US-034)
  const overdueCount = settlementCycles.filter((c) => c.status === 'overdue').length;
  const dueTodayCount = settlementCycles.filter((c) => c.status === 'due').length;

  if (!isOpen) return null;

  return (
    <div
      id="consignment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm"
    >
      <div
        id="consignment-modal-card"
        className="flex h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-amber-100/70 px-6 py-3.5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-sm font-black">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-[#2D241E] truncate">
                  Manajemen Konsinyasi & Komisi Titipan
                </h3>
                {(overdueCount > 0 || dueTodayCount > 0) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      {overdueCount > 0 ? `${overdueCount} Terlambat` : `${dueTodayCount} Jatuh Tempo`}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8C7B6C] font-semibold truncate">
                Buku Besar, Perhitungan Komisi Bersih & Jadwal Settlement Mitra (POS-US-030 s/d POS-US-035)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const res = generateSettlementCycles();
                if (res.count > 0) {
                  alert(`${res.count} Siklus Settlement baru berhasil digenerate!`);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] hover:bg-[#FDFBF7] transition shadow-xs cursor-pointer"
              title="Perbarui / Hitung Ulang Siklus Settlement"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#D97706]" />
              <span className="hidden sm:inline">Sync Siklus</span>
            </button>
            <button
              id="close-consignment-modal-btn"
              onClick={onClose}
              className="rounded-xl p-2 text-[#8C7B6C] hover:bg-[#E5DACE] hover:text-[#2D241E] transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-white px-6 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'dashboard'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E]'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Ringkasan & KPI (US-033)</span>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'ledger'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E]'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Buku Besar Komisi (US-031)</span>
            </button>

            <button
              onClick={() => setActiveTab('settlements')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'settlements'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E]'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Jadwal & Settlement (US-032 & 034)</span>
              {overdueCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[9px] text-white font-bold">
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                activeTab === 'suppliers'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E]'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Mitra Supplier ({suppliers.length})</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddSupplier}
              className="flex items-center gap-1 rounded-xl border border-[#D97706] bg-amber-50 px-3 py-1.5 text-xs font-black text-[#D97706] hover:bg-amber-100 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Supplier</span>
            </button>
            <button
              onClick={onOpenAddProduct}
              className="flex items-center gap-1 rounded-xl bg-[#D97706] px-3 py-1.5 text-xs font-black text-white hover:bg-amber-700 transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Produk Titipan</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] bg-[#FDFBF7] px-6 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8C7B6C]">Periode:</span>
            <div className="flex gap-1">
              {(['today', 'week', 'month', 'all'] as DateFilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setDateFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    dateFilter === f
                      ? 'bg-[#2D241E] text-white'
                      : 'bg-white border border-[#E5DACE] text-[#8C7B6C] hover:bg-amber-50'
                  }`}
                >
                  {f === 'today'
                    ? 'Hari Ini'
                    : f === 'week'
                    ? '7 Hari Terakhir'
                    : f === 'month'
                    ? 'Bulan Ini'
                    : 'Semua'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="rounded-xl border border-[#E5DACE] bg-white px-3 py-1 text-xs font-bold text-[#2D241E] focus:outline-none"
            >
              <option value="all">Semua Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8C7B6C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk / no struk..."
                className="w-48 rounded-xl border border-[#E5DACE] bg-white pl-8 pr-3 py-1 text-xs font-semibold text-[#2D241E] placeholder:text-[#8C7B6C]/60 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: DASHBOARD & KPIS (POS-US-033) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 7 KPI Bento Grid Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Units Sold */}
                <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#8C7B6C]">
                    Unit Terjual
                  </span>
                  <div className="mt-2 text-2xl font-black text-[#2D241E]">
                    {kpis.totalUnits.toLocaleString('id-ID')} <span className="text-xs font-semibold text-[#8C7B6C]">pcs</span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#8C7B6C]">Produk titipan laku terjual</p>
                </div>

                {/* 2. Gross Penjualan */}
                <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#8C7B6C]">
                    Gross Penjualan
                  </span>
                  <div className="mt-2 text-xl font-black text-[#2D241E]">
                    {formatIDR(kpis.totalGross)}
                  </div>
                  <p className="mt-1 text-[10px] text-[#8C7B6C]">Harga satuan × kuantiti</p>
                </div>

                {/* 3. Diskon Dialokasikan */}
                <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">
                    Total Diskon
                  </span>
                  <div className="mt-2 text-xl font-black text-rose-600">
                    -{formatIDR(kpis.totalDiscounts)}
                  </div>
                  <p className="mt-1 text-[10px] text-[#8C7B6C]">Diskon item & proporsi pesanan</p>
                </div>

                {/* 4. Net Penjualan */}
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                    Net Penjualan
                  </span>
                  <div className="mt-2 text-xl font-black text-emerald-800">
                    {formatIDR(kpis.totalNet)}
                  </div>
                  <p className="mt-1 text-[10px] text-emerald-700">Gross dikurangi diskon</p>
                </div>

                {/* 5. Total Komisi Toko (Store Commission) */}
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#D97706]">
                      Komisi Toko Diterima
                    </span>
                    <Coins className="h-4 w-4 text-[#D97706]" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-[#D97706]">
                    {formatIDR(kpis.totalCommission)}
                  </div>
                  <p className="mt-1 text-[10px] text-[#8C7B6C]">Pendapatan komisi bagi hasil toko</p>
                </div>

                {/* 6. Net Hak Supplier (Supplier Net Payable) */}
                <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 shadow-xs">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#2D241E]">
                    Hak Milik Supplier
                  </span>
                  <div className="mt-2 text-xl font-black text-[#2D241E]">
                    {formatIDR(kpis.totalStoreNet)}
                  </div>
                  <p className="mt-1 text-[10px] text-[#8C7B6C]">Net penjualan - komisi toko</p>
                </div>

                {/* 7. Hutang Belum Lunas */}
                <div className="col-span-2 rounded-2xl border-2 border-amber-400 bg-amber-100/50 p-4 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#2D241E]">
                      Hutang Settlement Belum Lunas
                    </span>
                    <div className="mt-1 text-2xl font-black text-rose-700">
                      {formatIDR(kpis.totalUnsettledDebt)}
                    </div>
                    <p className="text-[10px] text-[#8C7B6C]">
                      Kewajiban bayar yang belum diselesaikan pada siklus berjalan
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('settlements')}
                    className="flex items-center gap-1 rounded-xl bg-[#2D241E] px-4 py-2 text-xs font-bold text-white hover:bg-black transition shadow-xs"
                  >
                    <span>Lihat Jadwal</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Rekap per Supplier (POS-US-033 AC-04) */}
              <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-[#2D241E]">
                    Rekapitulasi Kinerja per Mitra Supplier & Jatuh Tempo Terdekat
                  </h4>
                  <span className="text-xs text-[#8C7B6C] font-semibold">
                    {suppliers.length} Mitra Terdaftar
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-[#E5DACE] text-[#8C7B6C] font-black uppercase tracking-wider">
                        <th className="pb-2">Mitra Supplier</th>
                        <th className="pb-2">Jadwal Siklus</th>
                        <th className="pb-2">Jatuh Tempo Terdekat</th>
                        <th className="pb-2 text-right">Unit Terjual</th>
                        <th className="pb-2 text-right">Net Penjualan</th>
                        <th className="pb-2 text-right">Komisi Toko</th>
                        <th className="pb-2 text-right">Hak Supplier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DACE]">
                      {suppliers.map((s) => {
                        const supEntries = filteredLedger.filter(
                          (e) => e.supplierId === s.id && e.status !== 'reversed'
                        );
                        const supUnits = supEntries.reduce((sum, e) => sum + e.quantity, 0);
                        const supNet = supEntries.reduce((sum, e) => sum + e.netAmount, 0);
                        const supComm = supEntries.reduce((sum, e) => sum + e.commissionAmount, 0);
                        const supStoreNet = supEntries.reduce((sum, e) => sum + e.storeNetAmount, 0);

                        return (
                          <tr key={s.id} className="hover:bg-[#FDFBF7]">
                            <td className="py-2.5 font-bold text-[#2D241E]">
                              <div>{s.name}</div>
                              <div className="text-[10px] text-[#8C7B6C] font-normal">
                                PIC: {s.picName || '-'} ({s.phone || '-'})
                              </div>
                            </td>
                            <td className="py-2.5 text-[#8C7B6C] font-medium">
                              {s.scheduleType === 'weekly' ? 'Mingguan' : '2x Sebulan'}
                            </td>
                            <td className="py-2.5 font-bold">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] text-[#D97706]">
                                <Calendar className="h-3 w-3" />
                                <span>{s.nextDueDate || '-'}</span>
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-bold text-[#2D241E]">
                              {supUnits} pcs
                            </td>
                            <td className="py-2.5 text-right font-bold text-[#2D241E]">
                              {formatIDR(supNet)}
                            </td>
                            <td className="py-2.5 text-right font-black text-[#D97706]">
                              {formatIDR(supComm)}
                            </td>
                            <td className="py-2.5 text-right font-black text-emerald-800">
                              {formatIDR(supStoreNet)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUKU BESAR KOMISI (POS-US-031) */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#2D241E]">
                    Buku Besar Komisi Konsinyasi (Commission Ledger)
                  </h4>
                  <p className="text-xs text-[#8C7B6C]">
                    Catatan rinci per baris transaksi penjualan, kalkulasi rumus komisi, dan audit trail pembatalan
                  </p>
                </div>
                <div className="text-xs font-bold text-[#8C7B6C]">
                  Total Entri: <span className="text-[#2D241E]">{filteredLedger.length} baris</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FDFBF7] border-b-2 border-[#E5DACE] text-[#8C7B6C] font-black uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Waktu & No Struk</th>
                      <th className="p-3">Produk & Mitra</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Harga @</th>
                      <th className="p-3 text-right">Gross</th>
                      <th className="p-3 text-right">Diskon</th>
                      <th className="p-3 text-right">Net Jual</th>
                      <th className="p-3">Rumus Komisi</th>
                      <th className="p-3 text-right">Komisi Toko</th>
                      <th className="p-3 text-right">Hak Supplier</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DACE]">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-[#8C7B6C] font-bold">
                          Tidak ada entri komisi konsinyasi untuk filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((entry) => (
                        <tr
                          key={entry.id}
                          className={`hover:bg-[#FDFBF7] ${
                            entry.status === 'reversed' ? 'bg-rose-50/40 text-rose-900' : ''
                          }`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-[#2D241E]">{entry.receiptNumber}</div>
                            <div className="text-[10px] text-[#8C7B6C]">
                              {entry.createdAt.replace('T', ' ').slice(0, 16)}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-[#2D241E]">{entry.productName}</div>
                            <div className="text-[10px] font-semibold text-[#D97706]">
                              {entry.supplierName}
                            </div>
                          </td>
                          <td className="p-3 text-right font-bold">{entry.quantity}</td>
                          <td className="p-3 text-right">{formatIDR(entry.unitPrice)}</td>
                          <td className="p-3 text-right font-bold">{formatIDR(entry.grossAmount)}</td>
                          <td className="p-3 text-right text-rose-600">
                            {entry.allocatedDiscount > 0 ? `-${formatIDR(entry.allocatedDiscount)}` : '-'}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-800">
                            {formatIDR(entry.netAmount)}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-[#2D241E]">
                              {entry.commissionMethod === 'fixed'
                                ? `Rp ${entry.commissionValue.toLocaleString('id-ID')} / pcs`
                                : `${entry.commissionValue}% (${entry.commissionBasis === 'gross' ? 'Gross' : 'Net'})`}
                            </div>
                          </td>
                          <td className="p-3 text-right font-black text-[#D97706]">
                            {formatIDR(entry.commissionAmount)}
                          </td>
                          <td className="p-3 text-right font-black text-[#2D241E]">
                            {formatIDR(entry.storeNetAmount)}
                          </td>
                          <td className="p-3 text-center">
                            {entry.status === 'accrued' && (
                              <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-black">
                                Belum Siklus
                              </span>
                            )}
                            {entry.status === 'included' && (
                              <span className="rounded-full bg-blue-100 text-blue-900 px-2 py-0.5 text-[10px] font-black">
                                Masuk Siklus
                              </span>
                            )}
                            {entry.status === 'settled' && (
                              <span className="rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 text-[10px] font-black">
                                Lunas
                              </span>
                            )}
                            {entry.status === 'reversed' && (
                              <div className="space-y-0.5">
                                <span className="rounded-full bg-rose-200 text-rose-900 px-2 py-0.5 text-[10px] font-black">
                                  Dibatalkan (Void)
                                </span>
                                {entry.reversalReason && (
                                  <div className="text-[9px] text-rose-700 truncate max-w-[120px]">
                                    {entry.reversalReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: JADWAL & SETTLEMENT SIKLUS (POS-US-032, 034, 035) */}
          {activeTab === 'settlements' && (
            <div className="space-y-4">
              {/* Alert banner if overdue */}
              {overdueCount > 0 && (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-900">
                  <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-black">
                      Perhatian: Ada {overdueCount} Siklus Settlement yang Telah Melewati Jatuh Tempo!
                    </h5>
                    <p className="text-[11px] text-rose-800">
                      Harap segera proses pembayaran hak supplier untuk menjaga kelancaran pasokan barang titipan.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#2D241E]">
                    Daftar Siklus Settlement Mitra Supplier (POS-US-032 & 034)
                  </h4>
                  <p className="text-xs text-[#8C7B6C]">
                    Hitungan otomatis tagihan per periode mingguan atau dua kali sebulan
                  </p>
                </div>
                <button
                  onClick={() => {
                    const res = generateSettlementCycles();
                    if (res.count === 0) {
                      alert('Semua entri penjualan konsinyasi sudah terdistribusi dalam siklus.');
                    } else {
                      alert(`${res.count} siklus baru berhasil dibuat!`);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border-2 border-[#D97706] bg-[#D97706] px-3.5 py-1.5 text-xs font-black text-white hover:bg-amber-700 transition shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Hitung Siklus Baru</span>
                </button>
              </div>

              {/* Settlement Cycles Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {settlementCycles.map((cycle) => {
                  const isOverdue = cycle.status === 'overdue';
                  const isDueToday = cycle.status === 'due';
                  const isSettled = cycle.status === 'settled';

                  return (
                    <div
                      key={cycle.id}
                      className={`rounded-3xl border-2 p-5 transition flex flex-col justify-between ${
                        isSettled
                          ? 'border-[#E5DACE] bg-white opacity-85'
                          : isOverdue
                          ? 'border-rose-400 bg-rose-50/40 shadow-sm'
                          : isDueToday
                          ? 'border-amber-400 bg-amber-50/50 shadow-sm'
                          : 'border-[#E5DACE] bg-white shadow-xs'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-[#8C7B6C] uppercase tracking-wider">
                              ID: {cycle.id}
                            </span>
                            <h5 className="text-base font-black text-[#2D241E]">
                              {cycle.supplierName}
                            </h5>
                            <p className="text-xs text-[#8C7B6C]">
                              Periode: {cycle.periodStart} s/d {cycle.periodEnd}
                            </p>
                          </div>

                          <div>
                            {isSettled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>LUNAS</span>
                              </span>
                            ) : isOverdue ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white shadow-xs">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>TERLAMBAT</span>
                              </span>
                            ) : isDueToday ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-white shadow-xs">
                                <Clock className="h-3.5 w-3.5" />
                                <span>HARI INI</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-900">
                                <span>UPCOMING</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Breakdown values */}
                        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#FDFBF7] border border-[#E5DACE] p-3 text-xs">
                          <div>
                            <span className="text-[10px] text-[#8C7B6C] font-bold uppercase">Net Jual</span>
                            <div className="font-bold text-[#2D241E]">{formatIDR(cycle.netItemSales)}</div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8C7B6C] font-bold uppercase">Komisi Toko</span>
                            <div className="font-bold text-[#D97706]">
                              {formatIDR(cycle.commissionPayable)}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#8C7B6C] font-bold uppercase">Hak Supplier</span>
                            <div className="font-black text-emerald-800">
                              {formatIDR(cycle.storeNetAfterCommission)}
                            </div>
                          </div>
                        </div>

                        {/* Due Date Indicator */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#8C7B6C]">Batas Jatuh Tempo:</span>
                          <span
                            className={`font-black ${
                              isOverdue
                                ? 'text-rose-600'
                                : isDueToday
                                ? 'text-amber-600'
                                : 'text-[#2D241E]'
                            }`}
                          >
                            📅 {cycle.dueDate}
                          </span>
                        </div>

                        {/* If settled, display payment info */}
                        {isSettled && (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2 text-[11px] text-emerald-900">
                            <div>
                              Dibayar via <span className="font-bold uppercase">{cycle.paymentMethod}</span>
                              {cycle.paymentReference && ` (Ref: ${cycle.paymentReference})`}
                            </div>
                            <div className="text-[10px] text-emerald-700">
                              Oleh {cycle.settledBy} pada {cycle.settledAt?.slice(0, 10)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button: Pay Settlement (POS-US-035) */}
                      {!isSettled && (
                        <div className="pt-4 border-t border-[#E5DACE]">
                          <button
                            id={`pay-settlement-btn-${cycle.id}`}
                            onClick={() => {
                              setPaymentCycle(cycle);
                              setPayReference('');
                              setPayNotes('');
                              setPayError('');
                              setPaySuccess('');
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D97706] py-2.5 px-4 text-xs font-black text-white hover:bg-amber-700 active:scale-[0.98] transition shadow-xs cursor-pointer"
                          >
                            <CreditCard className="h-4 w-4 shrink-0" />
                            <span>Bayar Settlement ({formatIDR(cycle.storeNetAfterCommission)})</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MITRA SUPPLIER (POS-US-030) */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#2D241E]">
                    Daftar Rekanan & Jadwal Settlement Supplier (POS-US-030)
                  </h4>
                  <p className="text-xs text-[#8C7B6C]">
                    Kelola nama UMKM, penanggung jawab (PIC), nomor kontak, dan nomor rekening tujuan settlement
                  </p>
                </div>
                <button
                  onClick={onOpenAddSupplier}
                  className="flex items-center gap-1.5 rounded-2xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-amber-700 transition shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Supplier Baru</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-3xl border-2 border-[#E5DACE] bg-white p-5 space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-[#D97706] font-black">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h5 className="text-sm font-black text-[#2D241E]">{s.name}</h5>
                          <span className="text-xs text-[#8C7B6C] font-semibold">
                            PIC: {s.picName || '-'} • {s.phone || '-'}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-lg bg-[#FDFBF7] border border-[#E5DACE] px-2 py-0.5 text-[10px] font-bold text-[#8C7B6C]">
                        {s.id}
                      </span>
                    </div>

                    <div className="space-y-1.5 rounded-2xl bg-[#FDFBF7] border border-[#E5DACE] p-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#8C7B6C]">Jadwal Settlement:</span>
                        <span className="font-bold text-[#2D241E]">
                          {s.scheduleType === 'weekly'
                            ? `Mingguan (Hari ke-${s.scheduleDayOfWeek})`
                            : `2x Sebulan (Tgl ${s.scheduleDatesOfMonth?.join(' & ') || '15 & 30'})`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8C7B6C]">Jatuh Tempo Berikutnya:</span>
                        <span className="font-bold text-[#D97706]">
                          {s.nextDueDate || 'Belum diatur'}
                        </span>
                      </div>
                      {s.bankAccountNumber && (
                        <div className="flex justify-between">
                          <span className="text-[#8C7B6C]">Rekening Bank:</span>
                          <span className="font-bold text-[#2D241E]">
                            {s.bankName} - {s.bankAccountNumber} ({s.bankAccountHolder})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Close button (POS-US-040) */}
        <div className="border-t border-[#E5DACE] bg-white px-6 py-3 flex justify-end">
          <button
            id="consignment-modal-close-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            Tutup
          </button>
        </div>

        {/* Modal Sub-Dialog: Record Settlement Payment (POS-US-035) */}
        {paymentCycle && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#D97706]" />
                  <h4 className="text-sm font-black text-[#2D241E]">
                    Catat Pembayaran Settlement (POS-US-035)
                  </h4>
                </div>
                <button
                  onClick={() => setPaymentCycle(null)}
                  className="rounded-lg p-1 text-[#8C7B6C] hover:bg-[#E5DACE]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {payError && (
                <div className="rounded-xl border border-rose-300 bg-rose-50 p-2 text-xs font-bold text-rose-800">
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2 text-xs font-bold text-emerald-800">
                  {paySuccess}
                </div>
              )}

              <div className="rounded-2xl border border-[#E5DACE] bg-white p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8C7B6C]">Penerima:</span>
                <div className="text-sm font-black text-[#2D241E]">{paymentCycle.supplierName}</div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-[#8C7B6C]">Total Hak Supplier (Settlement):</span>
                  <span className="text-sm font-black text-emerald-800">
                    {formatIDR(paymentCycle.storeNetAfterCommission)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#8C7B6C] pt-0.5">
                  <span>Komisi Toko:</span>
                  <span className="font-bold text-[#D97706]">
                    {formatIDR(paymentCycle.commissionPayable)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmPayment} className="space-y-3">
                {/* Method */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Metode Pembayaran</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['transfer', 'cash', 'qris', 'other'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPayMethod(m)}
                        className={`rounded-xl border py-1.5 text-xs font-bold uppercase transition ${
                          payMethod === m
                            ? 'border-[#D97706] bg-[#D97706] text-white'
                            : 'border-[#E5DACE] bg-white text-[#8C7B6C]'
                        }`}
                      >
                        {m === 'cash' ? 'Tunai' : m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">
                    No. Referensi / Bukti Transfer {['transfer', 'qris'].includes(payMethod) && '*'}
                  </label>
                  <input
                    id="settlement-ref-input"
                    type="text"
                    required={['transfer', 'qris'].includes(payMethod)}
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="TRF-BCA-98124 atau No. Bukti Bank"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Catatan Pembayaran (Opsional)</label>
                  <textarea
                    rows={2}
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Dititipkan ke kurir / via m-Banking kasir..."
                    className="w-full rounded-xl border border-[#E5DACE] bg-white px-3 py-1 text-xs text-[#2D241E] focus:outline-none"
                  />
                </div>

                {/* Supervisor PIN for Cashier */}
                {currentUser.role !== 'admin' && (
                  <div className="space-y-1 rounded-xl bg-amber-50 border border-amber-200 p-2.5">
                    <label className="text-[11px] font-bold text-[#2D241E]">
                      PIN Supervisor / Admin (8888 / 9999)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={payPin}
                      onChange={(e) => setPayPin(e.target.value)}
                      placeholder="PIN..."
                      className="w-32 rounded-lg border border-[#E5DACE] bg-white px-2 py-1 text-center font-bold tracking-widest text-xs"
                    />
                  </div>
                )}

                {/* Actions (POS-US-040: primary before Close) */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DACE]">
                  <button
                    id="confirm-settlement-payment-btn"
                    type="submit"
                    className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 active:scale-[0.98] transition shadow-xs cursor-pointer"
                  >
                    Konfirmasi LUNAS ({formatIDR(paymentCycle.storeNetAfterCommission)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCycle(null)}
                    className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-gray-50"
                  >
                    Tutup
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
