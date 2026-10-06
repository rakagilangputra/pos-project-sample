import React, { useState, useMemo, useEffect } from 'react';
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
  Plus,
  CreditCard,
  FileText,
  DollarSign,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  UserPlus,
  Info,
  Pencil,
  X,
  Check,
  Package,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { SupplierSettlementCycle, Supplier } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';
import { AddSupplierModal } from './AddSupplierModal';

type ConsignmentLocalView = 'summary' | 'ledger' | 'settlement' | 'suppliers';
type DateFilterPeriod = 'today' | 'week' | 'month' | 'all';

// Unified Row Type for Accordion Table (Sales & Settlements)
export type SupplierLedgerRow =
  | {
      rowType: 'sale';
      id: string;
      date: string;
      receiptNumber: string;
      productName: string;
      quantity: number;
      hargaBeliSupplier: number;
      unitHargaBeli: number;
      status: string;
      settlementId?: string;
    }
  | {
      rowType: 'settlement';
      id: string;
      date: string;
      reference: string;
      paymentMethod?: string;
      title: string;
      quantitySettled: number;
      hargaBeliSupplierSettled: number;
      piutangUsed: number;
      newPiutangGenerated: number;
      paymentAmount: number;
      settlementNotes?: string;
      settledBy?: string;
      status: string;
    };

export const ConsignmentWorkspace: React.FC = () => {
  const {
    suppliers,
    masterCategories,
    products,
    commissionLedger,
    settlementCycles,
    recordSettlementPayment,
    currentUser,
    verifySupervisorPin,
  } = usePOS();

  const consignmentSupplierIds = useMemo(
    () => new Set([
      ...commissionLedger.map((entry) => entry.supplierId),
      ...settlementCycles.map((cycle) => cycle.supplierId),
    ]),
    [commissionLedger, settlementCycles]
  );
  const consignmentSuppliers = useMemo(
    () => suppliers.filter((supplier) => {
      const masterCategory = masterCategories.find((category) => category.id === supplier.masterCategoryId);
      if (supplier.isInternal) return false;
      if (masterCategory) return masterCategory.categoryType === 'KONSINYASI';
      return consignmentSupplierIds.has(supplier.id);
    }),
    [suppliers, masterCategories, consignmentSupplierIds]
  );

  // Local View Navigation (Ringkasan default, Buku Besar Komisi, Settlement, Mitra Supplier)
  const [activeView, setActiveView] = useState<ConsignmentLocalView>('summary');

  // Single modal for Add / Edit Supplier
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Filters
  const [datePeriod, setDatePeriod] = useState<DateFilterPeriod>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'unsettled' | 'settled'>('all');

  // Record Settlement Payment Modal (single layer, POS-US-035 & POS-US-049)
  const [paymentCycle, setPaymentCycle] = useState<SupplierSettlementCycle | null>(null);
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'qris' | 'other'>('transfer');
  const [payAmount, setPayAmount] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payPin, setPayPin] = useState('');
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Accordion open/close state for suppliers
  const [expandedSupplierIds, setExpandedSupplierIds] = useState<string[]>([]);

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

  // Grouped Supplier Ledger for Accordion List (Sales & Settlement Records)
  const groupedSupplierLedger = useMemo(() => {
    let targetSuppliers = consignmentSuppliers;
    if (selectedSupplierId !== 'all') {
      targetSuppliers = consignmentSuppliers.filter((s) => s.id === selectedSupplierId);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return targetSuppliers.map((supplier) => {
      // 1. Sales Items for this supplier
      const supSales = filteredLedger.filter((e) => e.supplierId === supplier.id && e.status !== 'reversed');
      const totalQuantity = supSales.reduce((sum, item) => sum + item.quantity, 0);
      const totalHargaJual = supSales.reduce((sum, item) => sum + item.netAmount, 0);
      const totalKomisiToko = supSales.reduce((sum, item) => sum + item.commissionAmount, 0);
      const totalHargaBeliSupplier = supSales.reduce((sum, item) => sum + item.storeNetAmount, 0);

      const saleRows: SupplierLedgerRow[] = supSales.map((item) => ({
        rowType: 'sale',
        id: item.id,
        date: item.createdAt,
        receiptNumber: item.receiptNumber,
        productName: item.productName,
        quantity: item.quantity,
        hargaBeliSupplier: item.storeNetAmount,
        unitHargaBeli: Math.round(item.storeNetAmount / (item.quantity || 1)),
        status: item.status,
        settlementId: item.settlementId,
      }));

      // 2. Settled Cycles for this supplier (displaying settlement history & piutang used)
      const supSettlements = settlementCycles.filter(
        (c) => c.supplierId === supplier.id && c.status === 'settled'
      );

      const filteredSupSettlements = supSettlements.filter((c) => {
        const settleDate = c.settledAt || c.createdAt;
        if (datePeriod === 'today' && !settleDate.startsWith(todayStr)) return false;
        if (datePeriod === 'week' && new Date(settleDate) < weekAgo) return false;
        if (datePeriod === 'month' && new Date(settleDate) < monthAgo) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchRef = (c.paymentReference || c.id).toLowerCase().includes(q);
          const matchMethod = (c.paymentMethod || '').toLowerCase().includes(q);
          const matchNotes = (c.settlementNotes || '').toLowerCase().includes(q);
          const matchName = c.supplierName.toLowerCase().includes(q);
          if (!matchRef && !matchMethod && !matchNotes && !matchName) return false;
        }
        return true;
      });

      const settlementRows: SupplierLedgerRow[] = filteredSupSettlements.map((c) => ({
        rowType: 'settlement',
        id: c.id,
        date: c.settledAt || c.createdAt,
        reference: c.paymentReference || c.id,
        paymentMethod: c.paymentMethod,
        title: `Pelunasan Settlement Konsinyasi (${c.id})`,
        quantitySettled: c.commissionEntryIds?.length || 1,
        hargaBeliSupplierSettled: c.totalSettledBuyAmount || c.storeNetAfterCommission,
        piutangUsed: c.piutangUsed || 0,
        newPiutangGenerated: c.newPiutangGenerated || 0,
        paymentAmount: c.paymentAmount !== undefined ? c.paymentAmount : c.storeNetAfterCommission,
        settlementNotes: c.settlementNotes,
        settledBy: c.settledBy,
        status: c.status,
      }));

      // Unified Rows chronologically descending
      const rows: SupplierLedgerRow[] = [...saleRows, ...settlementRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return {
        supplier,
        rows,
        saleRows,
        settlementRows,
        totalQuantity,
        totalHargaJual,
        totalHargaBeliSupplier,
        totalKomisiToko,
      };
    });
  }, [consignmentSuppliers, selectedSupplierId, filteredLedger, settlementCycles, datePeriod, searchQuery]);

  // Auto-expand suppliers that have rows or all suppliers on initial load
  useEffect(() => {
    const withRows = groupedSupplierLedger.filter((g) => g.rows.length > 0).map((g) => g.supplier.id);
    if (withRows.length > 0) {
      setExpandedSupplierIds(withRows);
    } else {
      setExpandedSupplierIds(consignmentSuppliers.map((s) => s.id));
    }
  }, [consignmentSuppliers, selectedSupplierId, datePeriod]);

  const toggleSupplierAccordion = (supplierId: string) => {
    setExpandedSupplierIds((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleExpandAll = () => {
    setExpandedSupplierIds(consignmentSuppliers.map((s) => s.id));
  };

  const handleCollapseAll = () => {
    setExpandedSupplierIds([]);
  };

  // Primary KPIs (Accounting Summary for Consignment)
  const kpis = useMemo(() => {
    const valid = filteredLedger.filter((e) => e.status !== 'reversed');
    const netConsignmentSales = valid.reduce((sum, e) => sum + e.netAmount, 0);
    const storeCommission = valid.reduce((sum, e) => sum + e.commissionAmount, 0);
    const supplierPayable = netConsignmentSales - storeCommission;

    return {
      storeCommission,
      netConsignmentSales,
      supplierPayable,
    };
  }, [filteredLedger]);

  // Supplier Recap Table
  const supplierRecap = useMemo(() => {
    return consignmentSuppliers.map((sup) => {
      const supEntries = filteredLedger.filter((e) => e.supplierId === sup.id && e.status !== 'reversed');
      const netSales = supEntries.reduce((s, e) => s + e.netAmount, 0);
      const commission = supEntries.reduce((s, e) => s + e.commissionAmount, 0);
      const payable = netSales - commission;

      return {
        supplier: sup,
        netSales,
        commission,
        payable,
      };
    });
  }, [consignmentSuppliers, filteredLedger]);

  // Filtered Settlement Cycles
  const filteredCycles = useMemo(() => {
    return settlementCycles.filter((c) => {
      if (settlementFilter === 'unsettled' && c.status === 'settled') return false;
      if (settlementFilter === 'settled' && c.status !== 'settled') return false;
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

    const numericPayAmount = Number(payAmount);
    if (isNaN(numericPayAmount) || numericPayAmount < 0) {
      setPayError('Nominal pembayaran wajib diisi dengan angka yang valid (minimal 0)!');
      return;
    }

    const currentCycleSupplier = consignmentSuppliers.find((s) => s.id === paymentCycle.supplierId);
    const currentSupplierPiutang = currentCycleSupplier?.balance || 0;
    const totalCoverage = numericPayAmount + currentSupplierPiutang;

    if (totalCoverage < paymentCycle.storeNetAfterCommission) {
      setPayError(
        `Nominal pembayaran (${formatIDR(numericPayAmount)}) + Piutang Supplier (${formatIDR(currentSupplierPiutang)}) = ${formatIDR(totalCoverage)}, belum mencukupi total tagihan (${formatIDR(paymentCycle.storeNetAfterCommission)})!`
      );
      return;
    }

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
      payPin,
      numericPayAmount
    );
    setIsSubmittingPay(false);

    if (!res.success) {
      setPayError(res.message);
      return;
    }

    setPaySuccess(res.message);
    setTimeout(() => {
      setPaymentCycle(null);
      setPayAmount('');
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
            {settlementCycles.filter((c) => c.status !== 'settled').length > 0 && (
              <span className="rounded-full bg-amber-600 text-white text-[9px] px-1.5 py-0.2 font-black">
                {settlementCycles.filter((c) => c.status !== 'settled').length}
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
            <span>Mitra Supplier ({consignmentSuppliers.length})</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2"></div>
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

          {/* KPI Cards (Clean Accounting Summary) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* KPI 1: Net Consignment Sales */}
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

            {/* KPI 2: Store Commission */}
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

            {/* KPI 3: Total Supplier Payable */}
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-1 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                <span>Hutang Bersih Mitra Supplier</span>
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="text-xl font-black text-amber-950">
                {formatIDR(kpis.supplierPayable)}
              </div>
              <p className="text-[10px] text-amber-700 font-semibold">
                Total hak bersih mitra yang belum lunas
              </p>
            </div>
          </div>

          {/* Supplier Recap Comparable Table */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-[#2D241E]">
                Rekapitulasi Penjualan & Hutang Per Mitra Supplier
              </h3>
              <span className="text-xs text-[#8C7B6C]">
                {consignmentSuppliers.length} Mitra Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] font-black uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mitra Supplier</th>
                    <th className="py-2.5 px-3 text-right">Penjualan Bersih</th>
                    <th className="py-2.5 px-3 text-right">Komisi Toko</th>
                    <th className="py-2.5 px-3 text-right">Hutang Bersih Supplier</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 2: BUKU BESAR KOMISI (Accordion List by Mitra Supplier)
          ------------------------------------------------------------- */}
      {activeView === 'ledger' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Filters & Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] bg-white px-6 py-3 shrink-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C7B6C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk, nota, atau mitra supplier..."
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
                {consignmentSuppliers.map((s) => (
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

              {/* Accordion Global Toggle Buttons */}
              <div className="flex items-center gap-1 border-l border-[#E5DACE] pl-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="rounded-lg border border-[#E5DACE] bg-[#FDFBF7] px-2.5 py-1.5 text-[11px] font-bold text-[#8C7B6C] hover:bg-purple-50 hover:text-purple-900 transition"
                >
                  Buka Semua
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="rounded-lg border border-[#E5DACE] bg-[#FDFBF7] px-2.5 py-1.5 text-[11px] font-bold text-[#8C7B6C] hover:bg-purple-50 hover:text-purple-900 transition"
                >
                  Tutup Semua
                </button>
              </div>
            </div>
          </div>

          {/* Accordion List Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {groupedSupplierLedger.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-8 text-[#8C7B6C]">
                <Receipt className="h-12 w-12 opacity-30 mb-2" />
                <p className="font-bold text-sm">Tidak ada catatan transaksi penjualan konsinyasi pada filter ini.</p>
              </div>
            ) : (
              groupedSupplierLedger.map((group) => {
                const isExpanded = expandedSupplierIds.includes(group.supplier.id);

                return (
                  <div
                    key={group.supplier.id}
                    className="overflow-hidden rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs transition"
                  >
                    {/* Accordion Group Header (Clickable) */}
                    <button
                      type="button"
                      onClick={() => toggleSupplierAccordion(group.supplier.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 bg-[#FDFBF7] p-4 text-left hover:bg-purple-50/40 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 transition-transform duration-200" />
                          ) : (
                            <ChevronRight className="h-5 w-5 transition-transform duration-200" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#2D241E]">
                              {group.supplier.name}
                            </span>
                            {group.supplier.category && (
                              <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.2 text-[10px] font-black">
                                {group.supplier.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#8C7B6C] font-semibold mt-0.5">
                            PIC: {group.supplier.picName || '-'} • Telp: {group.supplier.phone || '-'}
                          </p>
                        </div>
                      </div>

                      {/* Group Summary Metrics on Header */}
                      <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-[#8C7B6C]">Item Terjual</div>
                          <div className="text-xs font-black text-[#2D241E]">{group.totalQuantity} pcs</div>
                        </div>
                        <div className="h-7 w-px bg-[#E5DACE]" />
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-purple-800">Harga Beli Supplier</div>
                          <div className="text-xs font-black text-purple-950">{formatIDR(group.totalHargaBeliSupplier)}</div>
                        </div>
                        <div className="h-7 w-px bg-[#E5DACE]" />
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-amber-800">Saldo Piutang</div>
                          <div className="text-xs font-black text-amber-900">{formatIDR(group.supplier.balance || 0)}</div>
                        </div>
                      </div>
                    </button>

                    {/* Accordion Maximized Body: Items Sold & Settlement History During That Period */}
                    {isExpanded && (
                      <div className="border-t border-[#E5DACE] bg-white p-0">
                        {group.rows.length === 0 ? (
                          <div className="p-6 text-center text-xs font-semibold text-[#8C7B6C]">
                            Belum ada catatan item terjual atau settlement untuk mitra {group.supplier.name} pada periode yang dipilih.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] font-black uppercase text-[10px]">
                                  <th className="py-2.5 px-4">Tanggal</th>
                                  <th className="py-2.5 px-4">Items</th>
                                  <th className="py-2.5 px-4 text-center">Quantity</th>
                                  <th className="py-2.5 px-4 text-right">Harga Beli dari Supplier</th>
                                  <th className="py-2.5 px-4 text-right">Piutang (Supplier Balance)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5DACE]/60">
                                {group.rows.map((row) => {
                                  if (row.rowType === 'sale') {
                                    return (
                                      <tr key={row.id} className="hover:bg-purple-50/20 transition">
                                        {/* Column 1: Tanggal */}
                                        <td className="py-2.5 px-4 text-[#8C7B6C] whitespace-nowrap">
                                          <div className="font-bold text-[#2D241E]">{formatDateTime(row.date)}</div>
                                          <div className="text-[10px] text-[#8C7B6C]">Nota: {row.receiptNumber}</div>
                                        </td>

                                        {/* Column 2: Items */}
                                        <td className="py-2.5 px-4">
                                          <div className="font-extrabold text-[#2D241E]">{row.productName}</div>
                                          {row.status === 'settled' ? (
                                            <span className="inline-flex items-center gap-1 mt-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold">
                                              <Check className="h-2.5 w-2.5 text-emerald-600" /> Disettle (Ref: {row.settlementId})
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 mt-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[9px] font-bold">
                                              Belum Settlement
                                            </span>
                                          )}
                                        </td>

                                        {/* Column 3: Quantity */}
                                        <td className="py-2.5 px-4 text-center font-extrabold text-[#2D241E]">
                                          <span className="inline-block rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-black">
                                            {row.quantity} pcs
                                          </span>
                                        </td>

                                        {/* Column 4: Harga Beli dari Supplier */}
                                        <td className="py-2.5 px-4 text-right">
                                          <div className="font-black text-purple-950">{formatIDR(row.hargaBeliSupplier)}</div>
                                          <div className="text-[10px] text-purple-700 font-semibold">
                                            @ {formatIDR(row.unitHargaBeli)}
                                          </div>
                                        </td>

                                        {/* Column 5: Piutang (Supplier Balance) */}
                                        <td className="py-2.5 px-4 text-right">
                                          <span className="text-xs text-[#8C7B6C] font-semibold">—</span>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  // row.rowType === 'settlement'
                                  return (
                                    <tr key={row.id} className="bg-purple-50/40 hover:bg-purple-100/50 transition border-l-4 border-l-purple-600">
                                      {/* Column 1: Tanggal Settlement */}
                                      <td className="py-2.5 px-4 whitespace-nowrap">
                                        <div className="font-black text-purple-950">{formatDateTime(row.date)}</div>
                                        <div className="text-[10px] text-purple-700 font-semibold">Ref: {row.reference}</div>
                                      </td>

                                      {/* Column 2: Items (Settlement Record Info) */}
                                      <td className="py-2.5 px-4">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="rounded-md bg-purple-700 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Pelunasan Settlement
                                          </span>
                                          <span className="font-black text-xs text-[#2D241E]">
                                            Pelunasan Hak Supplier ({row.id})
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-[#8C7B6C] mt-0.5">
                                          Metode: <strong className="text-purple-950 uppercase">{row.paymentMethod || 'TRANSFER'}</strong>
                                          {row.settledBy && <span> • Dicatat: {row.settledBy}</span>}
                                          {row.settlementNotes && <span> • Catatan: {row.settlementNotes}</span>}
                                        </div>
                                      </td>

                                      {/* Column 3: Quantity */}
                                      <td className="py-2.5 px-4 text-center">
                                        <span className="inline-block rounded-lg bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 text-xs font-black">
                                          {row.quantitySettled} Item Disettle
                                        </span>
                                      </td>

                                      {/* Column 4: Harga Beli dari Supplier (Yang Disettle) */}
                                      <td className="py-2.5 px-4 text-right">
                                        <div className="font-black text-purple-950 text-xs">
                                          {formatIDR(row.hargaBeliSupplierSettled)}
                                        </div>
                                        <div className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                                          <Check className="h-3 w-3" /> Lunas Diselesaikan
                                        </div>
                                        {row.paymentAmount !== row.hargaBeliSupplierSettled && (
                                          <div className="text-[9px] text-[#8C7B6C] font-semibold">
                                            Bayar: {formatIDR(row.paymentAmount)}
                                          </div>
                                        )}
                                      </td>

                                      {/* Column 5: Piutang (Supplier Balance Used / Generated) */}
                                      <td className="py-2.5 px-4 text-right">
                                        {row.piutangUsed > 0 ? (
                                          <div>
                                            <div className="font-black text-amber-900 text-xs">
                                              -{formatIDR(row.piutangUsed)}
                                            </div>
                                            <div className="text-[10px] text-amber-700 font-bold">
                                              Piutang Digunakan
                                            </div>
                                          </div>
                                        ) : row.newPiutangGenerated > 0 ? (
                                          <div>
                                            <div className="font-black text-emerald-800 text-xs">
                                              +{formatIDR(row.newPiutangGenerated)}
                                            </div>
                                            <div className="text-[10px] text-emerald-700 font-bold">
                                              Lebih Bayar (Piutang Baru)
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="font-bold text-[#8C7B6C] text-xs">Rp 0</div>
                                            <div className="text-[10px] text-[#8C7B6C]">Tanpa Piutang</div>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 3: SETTLEMENT (Payable & Payment, POS-US-051 AC-05, AC-06, AC-07)
          ------------------------------------------------------------- */}
      {activeView === 'settlement' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] bg-white px-6 py-3 shrink-0">
            <div className="flex gap-1.5 text-xs font-bold">
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'unsettled', label: 'Belum Dibayar' },
                { id: 'settled', label: 'Sudah Dibayar (Lunas)' },
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
              Menampilkan {filteredCycles.length} data settlement
            </span>
          </div>

          {/* Settlement Table */}
          <div className="flex-1 overflow-auto p-4">
            {filteredCycles.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-8 text-[#8C7B6C]">
                <CreditCard className="h-12 w-12 opacity-30 mb-2" />
                <p className="font-bold text-sm">Tidak ada data settlement pada filter ini.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] font-black uppercase text-[10px]">
                    <th className="py-2.5 px-3">Mitra Supplier</th>
                    <th className="py-2.5 px-3 text-right">Penjualan Bersih</th>
                    <th className="py-2.5 px-3 text-right">Komisi Toko</th>
                    <th className="py-2.5 px-3 text-right">Hutang Dibayar (Net)</th>
                    <th className="py-2.5 px-3 text-right">Piutang</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACE]/60">
                  {filteredCycles.map((cycle) => {
                    const piutangExcess =
                      cycle.newPiutangGenerated !== undefined && cycle.newPiutangGenerated > 0
                        ? cycle.newPiutangGenerated
                        : cycle.paymentAmount !== undefined
                        ? Math.max(0, (cycle.paymentAmount + (cycle.piutangUsed || 0)) - cycle.storeNetAfterCommission)
                        : 0;

                    return (
                      <tr key={cycle.id} className="hover:bg-[#FDFBF7] transition">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-[#2D241E]">{cycle.supplierName}</span>
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
                        <td className="py-2.5 px-3 text-right">
                          {piutangExcess > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-950 border border-amber-300">
                                +{formatIDR(piutangExcess)}
                              </span>
                              <span className="text-[9px] text-amber-700 font-bold">Lebih Bayar</span>
                            </div>
                          ) : (
                            <span className="text-[#8C7B6C] font-semibold text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${
                              cycle.status === 'settled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {cycle.status === 'settled' ? 'LUNAS' : 'BELUM DIBAYAR'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {cycle.status !== 'settled' ? (
                            <button
                              onClick={() => {
                                setPaymentCycle(cycle);
                                setPayMethod('transfer');
                                const sup = consignmentSuppliers.find((s) => s.id === cycle.supplierId);
                                const piutang = sup?.balance || 0;
                                const defaultPay = Math.max(0, cycle.storeNetAfterCommission - piutang);
                                setPayAmount(defaultPay.toString());
                                setPayReference('');
                                setPayNotes('');
                                setPayPin('');
                                setPayError('');
                                setPaySuccess('');
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
                    );
                  })}
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
            {consignmentSuppliers.map((sup) => {
              const activeProdCount = products.filter(
                (p) => p.ownershipType === 'consignment' && p.supplierId === sup.id
              ).length;

              return (
                <div
                  key={sup.id}
                  className="flex flex-col justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-5 space-y-3 shadow-xs hover:border-purple-300 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-base text-[#2D241E]">{sup.name}</h4>
                          {(() => {
                            const cats =
                              sup.categories && sup.categories.length > 0
                                ? sup.categories
                                : sup.category
                                ? sup.category.split(',').map((s) => s.trim()).filter(Boolean)
                                : [];
                            return cats.map((catName) => (
                              <span
                                key={catName}
                                className="rounded-lg bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[10px] font-black tracking-wide"
                              >
                                {catName}
                              </span>
                            ));
                          })()}
                        </div>
                        <p className="text-xs text-[#8C7B6C] font-semibold">
                          PIC: {sup.picName} • {sup.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="rounded-full bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 text-[10px] font-black">
                          {activeProdCount} Produk
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSupplier(sup)}
                          className="flex items-center gap-1 rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-900 hover:bg-purple-100 hover:border-purple-300 active:scale-95 transition shadow-2xs"
                          title={`Edit ${sup.name}`}
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>

                    {/* Piutang Supplier (Kelebihan Bayar Toko ke Supplier) */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide block">
                          Piutang Supplier
                        </span>
                        <span className="text-sm font-black text-amber-950">
                          {formatIDR(sup.balance || 0)}
                        </span>
                        <span className="text-[10px] text-amber-700/80 block font-medium">
                          (Kelebihan bayar toko ke supplier)
                        </span>
                      </div>
                      {sup.balanceUpdatedAt ? (
                        <div className="text-right text-[10px] text-amber-700">
                          <span className="block font-medium">Diperbarui:</span>
                          <span className="font-bold">
                            {new Date(sup.balanceUpdatedAt).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8C7B6C] font-semibold">
                          Piutang: Rp 0
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5DACE] text-[11px] text-[#8C7B6C] space-y-0.5">
                    {sup.bankName && (
                      <span className="truncate block">
                        Rekening: {sup.bankName} - {sup.bankAccountNumber} ({sup.bankAccountHolder})
                      </span>
                    )}
                    <span className="truncate block">Alamat: {sup.address || 'Dalam Kota'}</span>
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
            className="w-full max-w-sm max-h-[85vh] flex flex-col rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl animate-fadeIn overflow-hidden"
          >
            {/* Header (Pinned at Top / Does Not Move with Upper-Right Close Button) */}
            <div className="flex items-center justify-between border-b border-[#E5DACE] px-4 py-3 bg-[#FDFBF7] shrink-0">
              <div className="pr-2 min-w-0">
                <h3 className="text-sm font-black text-purple-950">Catat Pembayaran Settlement</h3>
                <p className="text-[11px] text-[#8C7B6C] truncate">
                  Mitra: {paymentCycle.supplierName}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-xl bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-black">
                  {paymentCycle.status === 'settled' ? 'Lunas' : 'Belum Dibayar'}
                </span>
                <button
                  type="button"
                  onClick={() => setPaymentCycle(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-[#E5DACE] hover:text-[#2D241E] active:scale-95 transition shadow-2xs"
                  aria-label="Tutup modal"
                  title="Tutup"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {payError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-800">
                  {payError}
                </div>
              )}
              {paySuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-bold text-emerald-800">
                  {paySuccess}
                </div>
              )}

              {/* Total Payable Display */}
              <div className="rounded-xl border-2 border-purple-200 bg-purple-50/70 p-3 text-center">
                <span className="text-[11px] font-bold text-purple-800 block">Total Tagihan Yang Dibayarkan:</span>
                <span className="text-xl font-black text-purple-950">
                  {formatIDR(paymentCycle.storeNetAfterCommission)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D241E]">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'transfer', label: 'Bank Transfer' },
                    { id: 'cash', label: 'Tunai Kas' },
                    { id: 'qris', label: 'QRIS / Giro' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as any)}
                      className={`rounded-xl border py-1.5 text-xs font-bold transition ${
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

              {/* Field under Metode Pembayaran: Nominal Pembayaran */}
              {(() => {
                                const currentCycleSupplier = consignmentSuppliers.find((s) => s.id === paymentCycle.supplierId);
                const currentSupplierPiutang = currentCycleSupplier?.balance || 0;
                const numericPay = Number(payAmount) || 0;
                const totalCoverage = numericPay + currentSupplierPiutang;
                const totalTagihan = paymentCycle.storeNetAfterCommission;
                const isExactLunas = totalCoverage === totalTagihan;
                const isLebihLunas = totalCoverage > totalTagihan;
                const isKurang = totalCoverage < totalTagihan;
                const excess = totalCoverage - totalTagihan;
                const deficit = totalTagihan - totalCoverage;

                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="block text-xs font-bold text-[#2D241E]">
                        Nominal Pembayaran
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPayAmount(Math.max(0, totalTagihan - currentSupplierPiutang).toString())
                          }
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                          title="Nominal Pembayaran + Piutang Supplier = Total Tagihan (LUNAS)"
                        >
                          Set Lunas Pas ({formatIDR(Math.max(0, totalTagihan - currentSupplierPiutang))})
                        </button>
                        {currentSupplierPiutang > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayAmount(totalTagihan.toString())}
                            className="text-[10px] font-bold text-purple-700 hover:text-purple-900 underline"
                          >
                            Set Full ({formatIDR(totalTagihan)})
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-black text-[#8C7B6C]">
                        Rp
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder={Math.max(0, totalTagihan - currentSupplierPiutang).toString()}
                        className="w-full rounded-xl border-2 border-[#E5DACE] bg-white pl-9 pr-3 py-1.5 text-xs font-black text-[#2D241E] focus:border-purple-600 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Status Penilaian Lunas / Paid */}
                    {isExactLunas && (
                      <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-2.5 text-xs text-emerald-950 space-y-1">
                        <div className="flex items-center justify-between font-black text-emerald-800">
                          <span className="flex items-center gap-1.5 text-xs">
                            <Check className="h-4 w-4 text-emerald-600" />
                            STATUS: LUNAS / PAID
                          </span>
                          <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                            PAS
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-900 font-semibold leading-snug">
                          Nominal Pembayaran ({formatIDR(numericPay)}) + PIUTANG SUPPLIER ({formatIDR(currentSupplierPiutang)}) = Total Tagihan Yang Dibayarkan ({formatIDR(totalTagihan)})
                        </p>
                        {currentSupplierPiutang > 0 && (
                          <p className="text-[10px] text-emerald-700 leading-tight">
                            Piutang supplier sebesar {formatIDR(currentSupplierPiutang)} dikompensasikan penuh sehingga tagihan settlement lunas dan piutang supplier menjadi Rp 0.
                          </p>
                        )}
                      </div>
                    )}

                    {isLebihLunas && (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-2.5 text-xs text-emerald-950 space-y-1">
                        <div className="flex items-center justify-between font-bold text-emerald-800">
                          <span className="flex items-center gap-1.5 text-xs">
                            <Check className="h-4 w-4 text-emerald-600" />
                            STATUS: LUNAS / PAID (LEBIH BAYAR)
                          </span>
                          <span className="font-black text-emerald-950">
                            +{formatIDR(excess)}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-900 font-semibold leading-snug">
                          Nominal Pembayaran ({formatIDR(numericPay)}) + PIUTANG SUPPLIER ({formatIDR(currentSupplierPiutang)}) = {formatIDR(totalCoverage)}.
                        </p>
                        <p className="text-[10px] text-emerald-700 leading-tight">
                          Kelebihan bayar sebesar <strong>{formatIDR(excess)}</strong> (karena tidak ada uang kembalian) otomatis dicatat sebagai Piutang Supplier berikutnya.
                        </p>
                      </div>
                    )}

                    {isKurang && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 space-y-1">
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span className="text-xs">STATUS: BELUM LUNAS</span>
                          <span className="font-black text-rose-700">
                            Kurang {formatIDR(deficit)}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900 font-semibold leading-snug">
                          Nominal Pembayaran ({formatIDR(numericPay)}) + PIUTANG SUPPLIER ({formatIDR(currentSupplierPiutang)}) = {formatIDR(totalCoverage)} (Total Tagihan: {formatIDR(totalTagihan)}).
                        </p>
                        <p className="text-[10px] text-amber-800 leading-tight">
                          Settlement berstatus LUNAS / PAID saat Nominal Pembayaran + PIUTANG SUPPLIER sama dengan Total Tagihan Yang Dibayarkan.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2D241E]">Nomor Bukti Transfer / Referensi</label>
                <input
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Contoh: TRF-BCA-883920"
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2D241E]">Catatan Pembayaran (Opsional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Keterangan tambahan settlement..."
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-semibold text-[#2D241E] focus:border-purple-600 focus:outline-none"
                />
              </div>

              {/* Supervisor PIN for non-admin */}
              {currentUser.role !== 'admin' && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 space-y-1.5">
                  <label className="block text-xs font-bold text-amber-950">
                    PIN Supervisor Otorisasi Pembayaran:
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={payPin}
                    onChange={(e) => setPayPin(e.target.value)}
                    placeholder="PIN SPV..."
                    className="block w-40 rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold tracking-widest text-[#2D241E] focus:border-purple-600 focus:outline-none shadow-xs"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions (Tutup button removed, only one close button on upper right corner) */}
            <div className="p-3 border-t border-[#E5DACE] bg-[#FDFBF7] shrink-0">
              <button
                type="submit"
                disabled={isSubmittingPay}
                className="w-full rounded-xl bg-purple-700 py-2 text-xs font-black text-white hover:bg-purple-800 shadow-xs active:scale-95 transition disabled:opacity-50"
              >
                Konfirmasi Pembayaran
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SINGLE-LAYER MODAL: TAMBAH / EDIT MITRA SUPPLIER (POS-US-030 & POS-US-049) */}
      <AddSupplierModal
        isOpen={isAddSupplierOpen || editingSupplier !== null}
        supplierToEdit={editingSupplier}
        initialMasterCategoryId={masterCategories.find((category) => category.categoryType === 'KONSINYASI')?.id}
        onClose={() => {
          setIsAddSupplierOpen(false);
          setEditingSupplier(null);
        }}
      />
    </div>
  );
};
