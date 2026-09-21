import React, { useState, useMemo } from 'react';
import {
  Calendar,
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Clock,
  Building2,
  Tag,
  RotateCcw,
  X,
  Zap,
  Trash2,
} from 'lucide-react';
import { Category, Product, ProductExpiryBatch } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { usePOS } from '../../context/POSContext';

interface CategoryClosingViewProps {
  initialCategoryId?: string;
  onBackToProducts: () => void;
}

type ExpiryFilterTab = 'all' | 'closing_3days' | 'today' | 'tomorrow' | 'h2' | 'h3' | 'expired' | 'custom';

export const CategoryClosingView: React.FC<CategoryClosingViewProps> = ({
  initialCategoryId,
  onBackToProducts,
}) => {
  const {
    categories,
    products,
    selectedBranch,
    isBranchReadOnly,
    currentUser,
    expiryBatches,
    destroyExpiredBatches,
    masterCategories,
    suppliers,
  } = usePOS();

  // Expiry Reconciliation Filters & States (4-Dimension Filter Mechanism)
  // Default to 'closing_3days' so user immediately sees all batches closing within the next 3 days
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterTab>('closing_3days');
  const [customDate, setCustomDate] = useState<string>('');
  const [filterMasterCategory, setFilterMasterCategory] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>(initialCategoryId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchBatchQuery, setSearchBatchQuery] = useState<string>('');

  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [destructionReason, setDestructionReason] = useState<string>(
    'Pemusnahan stok kadaluwarsa pada Closing Harian'
  );
  const [isDestructionModalOpen, setIsDestructionModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSuperadmin = currentUser.role === 'admin';
  const isInactive = isBranchReadOnly || selectedBranch.status === 'inactive';

  // Dates for FEFO comparison
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const h2Str = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }, []);
  const h3Str = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }, []);

  // Active batches for current branch
  const branchActiveBatches = useMemo(() => {
    return expiryBatches.filter(
      (b) =>
        b.status === 'active' &&
        b.remainingQuantity > 0 &&
        (!b.branchId || b.branchId === selectedBranch.id)
    );
  }, [expiryBatches, selectedBranch.id]);

  // Grouped active batches by expiry thresholds
  const expiredBatches = useMemo(() => {
    return branchActiveBatches.filter((b) => b.expiryDate < todayStr);
  }, [branchActiveBatches, todayStr]);

  const todayBatches = useMemo(() => {
    return branchActiveBatches.filter((b) => b.expiryDate === todayStr);
  }, [branchActiveBatches, todayStr]);

  const tomorrowBatches = useMemo(() => {
    return branchActiveBatches.filter((b) => b.expiryDate === tomorrowStr);
  }, [branchActiveBatches, tomorrowStr]);

  const h2Batches = useMemo(() => {
    return branchActiveBatches.filter((b) => b.expiryDate === h2Str);
  }, [branchActiveBatches, h2Str]);

  const h3Batches = useMemo(() => {
    return branchActiveBatches.filter((b) => b.expiryDate === h3Str);
  }, [branchActiveBatches, h3Str]);

  const closing3DaysBatches = useMemo(() => {
    return branchActiveBatches.filter((b) => b.expiryDate <= h3Str);
  }, [branchActiveBatches, h3Str]);

  // Active Filter Counter
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (expiryFilter !== 'closing_3days' && expiryFilter !== 'all') count++;
    if (customDate !== '') count++;
    if (filterMasterCategory !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (searchBatchQuery.trim() !== '') count++;
    return count;
  }, [expiryFilter, customDate, filterMasterCategory, filterCategory, filterStatus, searchBatchQuery]);

  const handleResetFilters = () => {
    setExpiryFilter('all');
    setCustomDate('');
    setFilterMasterCategory('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setSearchBatchQuery('');
  };

  // Filtered batches according to 4 filter dimensions & search query
  const filteredBatches = useMemo(() => {
    return expiryBatches.filter((b) => {
      // Branch check
      if (b.branchId && b.branchId !== selectedBranch.id) return false;

      // 1. Tanggal Expiry Date Filter
      if (expiryFilter === 'closing_3days' && b.expiryDate > h3Str) return false;
      if (expiryFilter === 'expired' && b.expiryDate >= todayStr) return false;
      if (expiryFilter === 'today' && b.expiryDate !== todayStr) return false;
      if (expiryFilter === 'tomorrow' && b.expiryDate !== tomorrowStr) return false;
      if (expiryFilter === 'h2' && b.expiryDate !== h2Str) return false;
      if (expiryFilter === 'h3' && b.expiryDate !== h3Str) return false;
      if (expiryFilter === 'custom' && customDate && b.expiryDate !== customDate) return false;

      // 2. Master Kategori Filter
      if (filterMasterCategory !== 'all') {
        const prod = products.find((p) => p.id === b.productId);
        const sup = suppliers.find((s) => s.id === b.supplierId || s.id === prod?.supplierId);
        const mc = masterCategories.find((m) => m.id === filterMasterCategory);
        if (mc) {
          const matchSupCategory = sup?.category === mc.name || sup?.categories?.includes(mc.name);
          const matchProdCat = prod?.categoryLabel === mc.name || prod?.category === mc.id;
          const matchMasterId = sup?.category === mc.id;
          if (!matchSupCategory && !matchProdCat && !matchMasterId) {
            return false;
          }
        }
      }

      // 3. Kategori Produk Filter
      if (filterCategory !== 'all') {
        const prod = products.find((p) => p.id === b.productId);
        const matchProdCategory = prod && prod.category === filterCategory;
        const matchBatchCategory = b.category === filterCategory;
        if (!matchProdCategory && !matchBatchCategory) return false;
      }

      // 4. Status Pesanan / Batch Filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'active' && b.status !== 'active') return false;
        if (filterStatus === 'destroyed' && b.status !== 'destroyed') return false;
        if (filterStatus === 'expired' && b.expiryDate >= todayStr) return false;
        if (filterStatus === 'near_expiry' && (b.expiryDate < todayStr || b.expiryDate > h3Str)) return false;
      } else {
        // By default show active batches unless destroyed/all status selected
        if (expiryFilter !== 'all' && b.status !== 'active' && filterStatus === 'all') {
          return false;
        }
      }

      // 5. Search Query
      if (searchBatchQuery.trim()) {
        const q = searchBatchQuery.toLowerCase();
        const matchName = b.productName.toLowerCase().includes(q);
        const matchSku = b.sku.toLowerCase().includes(q);
        const matchBatch = (b.batchNumber || '').toLowerCase().includes(q);
        const matchSupplier = (b.supplierName || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBatch && !matchSupplier) return false;
      }

      return true;
    });
  }, [
    expiryBatches,
    selectedBranch.id,
    expiryFilter,
    customDate,
    filterMasterCategory,
    filterCategory,
    filterStatus,
    searchBatchQuery,
    todayStr,
    tomorrowStr,
    h2Str,
    h3Str,
    products,
    suppliers,
    masterCategories,
  ]);

  // Selected batches calculation for destruction
  const selectedBatches = useMemo(() => {
    return branchActiveBatches.filter((b) => selectedBatchIds.includes(b.id));
  }, [branchActiveBatches, selectedBatchIds]);

  const totalSelectedPcs = useMemo(() => {
    return selectedBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
  }, [selectedBatches]);

  const totalSelectedCost = useMemo(() => {
    return selectedBatches.reduce((sum, b) => sum + b.remainingQuantity * (b.unitCost || 0), 0);
  }, [selectedBatches]);

  // Selection handlers
  const handleToggleSelectBatch = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllExpired = () => {
    const expiredIds = expiredBatches.map((b) => b.id);
    setSelectedBatchIds(expiredIds);
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredBatches.map((b) => b.id);
    setSelectedBatchIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedBatchIds([]);
  };

  // Trigger destruction execution (Superadmin only)
  const handleConfirmDestruction = () => {
    if (!isSuperadmin) {
      setStatusMessage({
        type: 'error',
        text: 'Akses ditolak: Tombol eksekusi pemusnahan stok hanya boleh dipicu oleh akun Superadmin!',
      });
      return;
    }

    if (selectedBatchIds.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Pilih minimal satu batch kadaluwarsa yang akan dimusnahkan!',
      });
      return;
    }

    const res = destroyExpiredBatches(selectedBatchIds, destructionReason);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setSelectedBatchIds([]);
      setIsDestructionModalOpen(false);
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-5 space-y-4">
      {/* Inactive Mode Notice */}
      {isInactive && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>
              Cabang <strong>{selectedBranch.name}</strong> sedang nonaktif. Penutupan & rekonsiliasi kadaluwarsa hanya dalam mode lihat (Hanya Baca).
            </span>
          </div>
        </div>
      )}

      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`rounded-2xl p-3 text-xs flex items-center justify-between gap-2 shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span className="font-bold">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN DASHBOARD */}
      <div className="flex flex-1 flex-col overflow-hidden space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DACE] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-[#2D241E]">
                Closing Harian: Rekonsiliasi & Pemusnahan Kadaluwarsa Stok (FEFO)
              </h3>
              <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[11px] font-bold">
                {selectedBranch.name}
              </span>
              {isSuperadmin ? (
                <span className="rounded-md bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 text-[10px] font-black">
                  Superadmin Auth Active
                </span>
              ) : (
                <span className="rounded-md bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 text-[10px] font-bold">
                  Petugas Kasir (Verifikasi Fisik)
                </span>
              )}
            </div>
            <p className="text-xs text-[#8C7B6C] mt-0.5">
              Pemeriksaan FEFO per tanggal kadaluwarsa, pemantauan masa simpan batch, dan eksekusi pemusnahan stok expired dengan otorisasi Superadmin.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToProducts}
            className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#6D5D50] hover:bg-[#FDFBF7] self-start transition shadow-xs cursor-pointer"
          >
            Kembali ke Daftar Produk
          </button>
        </div>

        {/* 4-Dimension Compact Filter Toolbar */}
        <div className="bg-white p-3 rounded-2xl border-2 border-[#E5DACE] shadow-xs space-y-2.5">
          {/* Quick Filter Timeframe Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-black text-[#8C7B6C] shrink-0 mr-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-[#D97706]" />
              Filter Cepat:
            </span>

            <button
              type="button"
              onClick={() => setExpiryFilter('closing_3days')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs ${
                expiryFilter === 'closing_3days'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#6D5D50] hover:bg-amber-50/50 border border-[#E5DACE]'
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Akan Closing 3 Hari</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  expiryFilter === 'closing_3days' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {closing3DaysBatches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExpiryFilter('all')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs ${
                expiryFilter === 'all'
                  ? 'bg-[#2D241E] text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#6D5D50] hover:bg-gray-100 border border-[#E5DACE]'
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>Semua Batch Aktif</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  expiryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {branchActiveBatches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExpiryFilter('today')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs ${
                expiryFilter === 'today'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#6D5D50] hover:bg-amber-50/50 border border-[#E5DACE]'
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>Hari Ini (H)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  expiryFilter === 'today' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {todayBatches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExpiryFilter('tomorrow')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs ${
                expiryFilter === 'tomorrow'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#6D5D50] hover:bg-blue-50/50 border border-[#E5DACE]'
              }`}
            >
              <span>Besok (H+1)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  expiryFilter === 'tomorrow' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
                }`}
              >
                {tomorrowBatches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExpiryFilter('h2')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs ${
                expiryFilter === 'h2'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#6D5D50] hover:bg-indigo-50/50 border border-[#E5DACE]'
              }`}
            >
              <span>Lusa (H+2)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  expiryFilter === 'h2' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-900'
                }`}
              >
                {h2Batches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExpiryFilter('h3')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs ${
                expiryFilter === 'h3'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#6D5D50] hover:bg-teal-50/50 border border-[#E5DACE]'
              }`}
            >
              <span>H+3</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  expiryFilter === 'h3' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-900'
                }`}
              >
                {h3Batches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExpiryFilter('expired')}
              className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs ${
                expiryFilter === 'expired'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#6D5D50] hover:bg-rose-50/50 border border-[#E5DACE]'
              }`}
            >
              <Flame className="h-3 w-3 text-rose-500" />
              <span>Expired</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  expiryFilter === 'expired' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-900'
                }`}
              >
                {expiredBatches.length}
              </span>
            </button>
          </div>

          {/* Top Row: Search Input & Filter Counter / Reset Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C7B6C]" />
              <input
                type="text"
                placeholder="Cari nama produk, SKU, No. Batch, atau Mitra Supplier..."
                value={searchBatchQuery}
                onChange={(e) => setSearchBatchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#E5DACE] bg-[#FDFBF7] pl-8 pr-8 py-1.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none transition placeholder:font-normal placeholder:text-[#8C7B6C]/70"
              />
              {searchBatchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchBatchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C7B6C] hover:text-[#2D241E] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-800 transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3 w-3 text-rose-600" />
                  <span>Reset Filter ({activeFilterCount})</span>
                </button>
              )}

              {selectedBatchIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#8C7B6C] hover:bg-gray-50 cursor-pointer"
                >
                  Batal Seleksi ({selectedBatchIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: 4 Filter Controls (Expiry Date, Master Kategori, Kategori Produk, Status Pesanan/Batch) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-[#E5DACE]/60">
            {/* 1. Tanggal Expiry Date Filter */}
            <div className="flex items-center gap-1.5 bg-[#FDFBF7] rounded-xl border border-[#E5DACE] px-2.5 py-1">
              <Calendar className="h-3.5 w-3.5 text-[#D97706] shrink-0" />
              <div className="flex-1 flex items-center gap-1 min-w-0">
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value as any)}
                  className="w-full bg-transparent text-xs font-bold text-[#2D241E] focus:outline-none cursor-pointer truncate"
                >
                  <option value="closing_3days">⏳ Akan Closing 3 Hari Ke Depan</option>
                  <option value="all">📅 Expiry: Semua Tanggal</option>
                  <option value="today">⚡ Expired Hari Ini</option>
                  <option value="tomorrow">⏳ Expired Besok (H+1)</option>
                  <option value="h2">🕒 Expired Lusa (H+2)</option>
                  <option value="h3">🕒 Expired H+3</option>
                  <option value="expired">🚨 Sudah Expired (&lt; Hari ini)</option>
                  <option value="custom">📆 Tanggal Spesifik...</option>
                </select>
                {expiryFilter === 'custom' && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="rounded-lg border border-[#E5DACE] bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#2D241E] focus:outline-none shrink-0"
                  />
                )}
              </div>
            </div>

            {/* 2. Master Kategori Filter */}
            <div className="flex items-center gap-1.5 bg-[#FDFBF7] rounded-xl border border-[#E5DACE] px-2.5 py-1">
              <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <select
                value={filterMasterCategory}
                onChange={(e) => setFilterMasterCategory(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#2D241E] focus:outline-none cursor-pointer truncate"
              >
                <option value="all">🏢 Master Kategori: Semua</option>
                {masterCategories.map((mc) => (
                  <option key={mc.id} value={mc.id}>
                    {mc.name} ({mc.categoryType})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Kategori Produk Filter */}
            <div className="flex items-center gap-1.5 bg-[#FDFBF7] rounded-xl border border-[#E5DACE] px-2.5 py-1">
              <Tag className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#2D241E] focus:outline-none cursor-pointer truncate"
              >
                <option value="all">🏷️ Kategori Produk: Semua</option>
                {categories
                  .filter((c) => c.id !== 'all')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* 4. Status Pesanan / Batch Filter */}
            <div className="flex items-center gap-1.5 bg-[#FDFBF7] rounded-xl border border-[#E5DACE] px-2.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#2D241E] focus:outline-none cursor-pointer truncate"
              >
                <option value="all">📌 Status Stok: Semua</option>
                <option value="active">✅ Stok Aktif &amp; Tersedia</option>
                <option value="expired">🚨 Perlu Rekonsiliasi (Expired)</option>
                <option value="near_expiry">🕒 Mendekati Expired (H+3)</option>
                <option value="destroyed">🔥 Telah Dimusnahkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Bar for Selection & Destruction */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-amber-50/70 border-2 border-amber-200 p-3 rounded-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-amber-950">
              Seleksi Batch Pemusnahan:
            </span>
            <button
              type="button"
              onClick={handleSelectAllExpired}
              className="rounded-lg bg-rose-100 hover:bg-rose-200 border border-rose-300 px-2.5 py-1 text-xs font-bold text-rose-900 transition cursor-pointer"
            >
              Pilih Semua yang Expired ({expiredBatches.length})
            </button>
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="rounded-lg bg-white hover:bg-amber-100 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 transition cursor-pointer"
            >
              Pilih Semua Sesuai Filter ({filteredBatches.length})
            </button>
          </div>

          <div className="flex items-center gap-3 justify-end">
            {selectedBatchIds.length > 0 && (
              <div className="text-right">
                <span className="text-xs font-black text-rose-900 block">
                  {totalSelectedPcs} pcs dipilih ({selectedBatchIds.length} batch)
                </span>
                {totalSelectedCost > 0 && (
                  <span className="text-[10px] text-[#8C7B6C]">
                    Est. Nilai: {formatIDR(totalSelectedCost)}
                  </span>
                )}
              </div>
            )}

            {isSuperadmin ? (
              <button
                type="button"
                disabled={selectedBatchIds.length === 0 || isInactive}
                onClick={() => setIsDestructionModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-4 py-2 text-xs font-black shadow-xs transition disabled:opacity-40 cursor-pointer"
              >
                <Flame className="h-4 w-4" />
                <span>Musnahkan & Hapus dari Stok ({totalSelectedPcs} pcs)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs text-blue-900">
                <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-[11px] font-bold">
                  Otorisasi Superadmin diperlukan untuk eksekusi pemusnahan stok.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Batches Table */}
        <div className="flex-1 overflow-y-auto rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs">
          {filteredBatches.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#8C7B6C] space-y-2">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
              <p className="font-black text-sm text-[#2D241E]">
                Tidak ada batch stok yang sesuai dengan kriteria filter saat ini.
              </p>
              <p className="text-[#8C7B6C] max-w-md mx-auto">
                Kondisi ini wajar jika tidak ada produk yang jatuh tempo pada rentang waktu yang dipilih (bukan bug sistem). Anda dapat melihat seluruh stok atau filter 3 hari ke depan dengan tombol di bawah.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpiryFilter('closing_3days')}
                  className="rounded-xl bg-[#D97706] hover:bg-amber-700 active:scale-95 text-white font-bold px-3.5 py-1.5 text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Akan Closing 3 Hari ({closing3DaysBatches.length} batch)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-[#E5DACE] bg-white hover:bg-gray-50 text-[#2D241E] font-bold px-3.5 py-1.5 text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#8C7B6C]" />
                  <span>Lihat Semua Batch ({branchActiveBatches.length})</span>
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-[#FDFBF7] border-b-2 border-[#E5DACE] text-[11px] font-black uppercase text-[#8C7B6C]">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredBatches.length > 0 &&
                        filteredBatches.every((b) => selectedBatchIds.includes(b.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAllFiltered();
                        } else {
                          handleClearSelection();
                        }
                      }}
                      className="rounded border-[#E5DACE] text-[#D97706] focus:ring-0"
                    />
                  </th>
                  <th className="py-3 px-3">Produk / SKU</th>
                  <th className="py-3 px-3">No. Batch</th>
                  <th className="py-3 px-3">Tgl Kadaluwarsa</th>
                  <th className="py-3 px-3 text-center">Status Kadaluwarsa</th>
                  <th className="py-3 px-3 text-right">Sisa Stok</th>
                  <th className="py-3 px-3">Asal Penerimaan</th>
                  <th className="py-3 px-3.5">Rekomendasi Sistem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACE]/60">
                {filteredBatches.map((batch) => {
                  const isExpired = batch.expiryDate < todayStr;
                  const isToday = batch.expiryDate === todayStr;
                  const isTomorrow = batch.expiryDate === tomorrowStr;
                  const isH2 = batch.expiryDate === h2Str;
                  const isH3 = batch.expiryDate === h3Str;
                  const isSelected = selectedBatchIds.includes(batch.id);

                  return (
                    <tr
                      key={batch.id}
                      className={`transition hover:bg-amber-50/30 ${
                        isSelected
                          ? 'bg-rose-50/50'
                          : isExpired
                          ? 'bg-rose-50/20'
                          : isToday
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectBatch(batch.id)}
                          className="rounded border-[#E5DACE] text-rose-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-[#2D241E]">{batch.productName}</span>
                          {batch.expiryType === 'daily' || products.find((p) => p.id === batch.productId)?.expiryType === 'daily' ? (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[9px] font-black text-amber-900">
                              <Zap className="h-2.5 w-2.5 text-[#D97706]" />
                              <span>Expired Harian</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 border border-blue-300 px-1.5 py-0.2 text-[9px] font-black text-blue-900">
                              <Clock className="h-2.5 w-2.5 text-blue-600" />
                              <span>Expired &gt; 1 Hari</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#8C7B6C] font-mono">{batch.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900">
                        {batch.batchNumber}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#2D241E]">
                        {batch.expiryDate}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-black text-rose-900">
                            <Flame className="h-3 w-3 text-rose-600" />
                            KADALUWARSA
                          </span>
                        ) : isToday ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900">
                            <Clock className="h-3 w-3 text-amber-700" />
                            HARI INI
                          </span>
                        ) : isTomorrow ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-900">
                            BESOK (H+1)
                          </span>
                        ) : isH2 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-900">
                            LUSA (H+2)
                          </span>
                        ) : isH3 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-900">
                            H+3 (Menjelang)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-black text-sm text-[#2D241E]">
                          {batch.remainingQuantity}
                        </span>{' '}
                        <span className="text-[10px] text-[#8C7B6C]">pcs</span>
                        <div className="text-[9px] text-[#8C7B6C]">
                          Awal: {batch.initialQuantity} pcs
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#6D5D50]">
                        <div>{batch.goodsReceiptNumber || '-'}</div>
                        <div className="text-[9px] text-[#8C7B6C]">
                          Tgl Terima: {batch.receivedDate || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        {batch.expiryType === 'daily' || products.find((p) => p.id === batch.productId)?.expiryType === 'daily' ? (
                          isExpired || isToday ? (
                            <span className="text-rose-700 font-bold text-[11px] flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5 text-[#D97706] shrink-0" />
                              Musnahkan Otomatis (Closing Harian)
                            </span>
                          ) : (
                            <span className="text-amber-800 font-bold text-[11px] flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              Produk Segar Harian (Fresh)
                            </span>
                          )
                        ) : isExpired ? (
                          <span className="text-rose-700 font-bold text-[11px] flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Wajib Dimusnahkan (Delete Stok)
                          </span>
                        ) : isToday ? (
                          <span className="text-amber-800 font-bold text-[11px]">
                            Prioritas Jual Utama / Diskon Closing
                          </span>
                        ) : isTomorrow ? (
                          <span className="text-blue-800 font-semibold text-[11px]">
                            Posisikan di Rak Paling Depan
                          </span>
                        ) : isH2 ? (
                          <span className="text-indigo-800 font-semibold text-[11px]">
                            Pantau Stok Display (Closing 2 Hari)
                          </span>
                        ) : isH3 ? (
                          <span className="text-teal-800 font-semibold text-[11px]">
                            Cek Kesiapan Rotasi FEFO (H+3)
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium text-[11px]">
                            Stok Siap Jual (FEFO Normal)
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

      {/* SUPERADMIN CONFIRMATION MODAL FOR STOCK DESTRUCTION */}
      {isDestructionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl border-2 border-rose-200 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between border-b-2 border-rose-100 bg-rose-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-black text-rose-950">
                  Konfirmasi Pemusnahan Stok Kadaluwarsa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDestructionModalOpen(false)}
                className="rounded-xl border border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] cursor-pointer"
              >
                ✕ Batal
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 space-y-1">
                <div className="font-bold text-rose-900">
                  Tindakan ini akan memotong stok jual secara permanen:
                </div>
                <div className="text-sm font-black text-rose-950">
                  Total {totalSelectedPcs} pcs dari {selectedBatchIds.length} batch terpilih
                </div>
                {totalSelectedCost > 0 && (
                  <div className="text-[11px] text-rose-800">
                    Nilai Kerugian Terhitung: {formatIDR(totalSelectedCost)}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-[#2D241E] block">
                  Alasan / Keterangan Berita Acara Pemusnahan:
                </label>
                <textarea
                  rows={3}
                  value={destructionReason}
                  onChange={(e) => setDestructionReason(e.target.value)}
                  placeholder="Contoh: Pemusnahan stok kadaluwarsa roti manis pada closing shift..."
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-3 text-xs font-semibold text-[#2D241E] focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="text-[11px] text-[#8C7B6C] space-y-1 bg-[#FDFBF7] p-3 rounded-xl border border-[#E5DACE]">
                <div className="font-bold text-[#2D241E]">Otomasi Sistem yang Dijalankan:</div>
                <div>• Sisa stok batch diubah menjadi 0 dan status batch menjadi "destroyed"</div>
                <div>• Stok produk master otomatis dikurangi sejumlah item yang dimusnahkan</div>
                <div>• Catatan Waste & Bad Stock dibuat otomatis dengan nomor Berita Acara DST-EXP-...</div>
                <div>• Aktivitas dicatat secara permanen pada Audit Trail dengan nama Superadmin: <strong>{currentUser.name}</strong></div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DACE]">
                <button
                  type="button"
                  onClick={() => setIsDestructionModalOpen(false)}
                  className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 font-bold text-[#8C7B6C] hover:bg-[#E5DACE] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDestruction}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-2 font-black text-white shadow-xs cursor-pointer active:scale-95 transition"
                >
                  <Flame className="h-4 w-4" />
                  <span>Eksekusi Pemusnahan ({totalSelectedPcs} pcs)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
