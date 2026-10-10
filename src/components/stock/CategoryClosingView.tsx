import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Clock,
  Building2,
  RotateCcw,
  X,
  Zap,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react';
import { ProductExpiryBatch, ProductExpiryType } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { usePOS } from '../../context/POSContext';

interface CategoryClosingViewProps {
  initialCategoryId?: string;
  onBackToProducts: () => void;
}

type ExpiryFilterTab = 'all' | 'closing_3days' | 'today' | 'tomorrow' | 'h2' | 'h3' | 'expired' | 'custom' | 'range';

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

  // Page-level filters; existing category and batch-status semantics are retained.
  // Default to 'closing_3days' so user immediately sees all batches closing within the next 3 days
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterTab>('closing_3days');
  const [customDate, setCustomDate] = useState<string>('');
  const [filterMasterCategory, setFilterMasterCategory] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>(initialCategoryId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchBatchQuery, setSearchBatchQuery] = useState<string>('');
  const [filterExpiryType, setFilterExpiryType] = useState<ProductExpiryType | 'all'>('all');
  const [isAdditionalFiltersOpen, setIsAdditionalFiltersOpen] = useState(Boolean(initialCategoryId && initialCategoryId !== 'all'));

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

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(h3Str);
  const isDateRangeInvalid = expiryFilter === 'range' && Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const isDailyBatch = (batch: ProductExpiryBatch) => batch.expiryType === 'daily' || products.find((product) => product.id === batch.productId)?.expiryType === 'daily';

  const handleDatePresetChange = (preset: ExpiryFilterTab) => {
    setExpiryFilter(preset);
    if (preset === 'range') return;
    let from = '';
    let to = '';
    if (preset === 'closing_3days') to = h3Str;
    if (preset === 'expired') {
      const previousDay = new Date(`${todayStr}T00:00:00Z`);
      previousDay.setUTCDate(previousDay.getUTCDate() - 1);
      to = previousDay.toISOString().slice(0, 10);
    }
    if (preset === 'today') from = to = todayStr;
    if (preset === 'tomorrow') from = to = tomorrowStr;
    if (preset === 'h2') from = to = h2Str;
    if (preset === 'h3') from = to = h3Str;
    if (preset === 'custom') from = to = customDate;
    setDateFrom(from);
    setDateTo(to);
  };

  const handleDateRangeChange = (bound: 'from' | 'to', value: string) => {
    setExpiryFilter('range');
    setCustomDate('');
    if (bound === 'from') setDateFrom(value);
    else setDateTo(value);
  };

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
    if (filterExpiryType !== 'all') count++;
    if (searchBatchQuery.trim() !== '') count++;
    return count;
  }, [expiryFilter, customDate, filterMasterCategory, filterCategory, filterStatus, filterExpiryType, searchBatchQuery]);

  const handleResetFilters = () => {
    setExpiryFilter('all');
    setCustomDate('');
    setFilterMasterCategory('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setSearchBatchQuery('');
    setFilterExpiryType('all');
    setDateFrom('');
    setDateTo('');
  };

  // Filtering changes the displayed records only; disposal eligibility stays in the existing handlers.
  const filteredBatches = useMemo(() => {
    return expiryBatches.filter((b) => {
      // Branch check
      if (b.branchId && b.branchId !== selectedBranch.id) return false;
      if (isDateRangeInvalid) return false;

      // 1. Tanggal Expiry Date Filter
      if (expiryFilter === 'closing_3days' && b.expiryDate > h3Str) return false;
      if (expiryFilter === 'expired' && b.expiryDate >= todayStr) return false;
      if (expiryFilter === 'today' && b.expiryDate !== todayStr) return false;
      if (expiryFilter === 'tomorrow' && b.expiryDate !== tomorrowStr) return false;
      if (expiryFilter === 'h2' && b.expiryDate !== h2Str) return false;
      if (expiryFilter === 'h3' && b.expiryDate !== h3Str) return false;
      if (expiryFilter === 'custom' && customDate && b.expiryDate !== customDate) return false;
      if (expiryFilter === 'range') {
        if (dateFrom && b.expiryDate < dateFrom) return false;
        if (dateTo && b.expiryDate > dateTo) return false;
      }
      if (filterExpiryType !== 'all' && isDailyBatch(b) !== (filterExpiryType === 'daily')) return false;

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
    dateFrom,
    dateTo,
    isDateRangeInvalid,
    filterExpiryType,
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-white p-4 sm:p-6">
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-[1_1_500px]">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-[#2D241E]">Rekonsiliasi Kadaluwarsa (Closing)</h2>
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900">
                <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                {selectedBranch.name} ({selectedBranch.city})
              </span>
              {isSuperadmin ? (
                <span className="rounded-md border border-purple-200 bg-purple-100 px-2 py-1 text-[10px] font-black text-purple-900">Superadmin Auth Active</span>
              ) : (
                <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800">Petugas Kasir (Verifikasi Fisik)</span>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#8C7B6C]">
              Pemeriksaan FEFO per tanggal kadaluwarsa, pemantauan masa simpan batch, dan eksekusi pemusnahan stok expired dengan otorisasi Superadmin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onBackToProducts} className="flex h-10 items-center gap-1.5 rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-bold text-[#6D5D50] transition hover:bg-[#FDFBF7]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Kembali ke Daftar Produk
            </button>
            {isSuperadmin && (
              <button
                id="closing-destroy-btn"
                type="button"
                disabled={selectedBatchIds.length === 0 || isInactive}
                onClick={() => setIsDestructionModalOpen(true)}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-black text-white shadow-xs transition hover:bg-rose-700 active:scale-95 disabled:opacity-40"
              >
                <Flame className="h-4 w-4" />
                <span>Musnahkan &amp; Hapus dari Stok ({totalSelectedPcs} pcs)</span>
              </button>
            )}
          </div>
        </header>

        <section aria-label="Filter rekonsiliasi" className="shrink-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-[1_1_240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C7B6C]" aria-hidden="true" />
              <input
                id="closing-search"
                type="text"
                aria-label="Cari batch"
                placeholder="Cari nama produk, SKU, No. Batch, atau Mitra Supplier..."
                value={searchBatchQuery}
                onChange={(event) => setSearchBatchQuery(event.target.value)}
                className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white pl-9 pr-9 text-xs font-semibold text-[#2D241E] outline-none placeholder:text-[#8C7B6C] focus:border-[#D97706]"
              />
              {searchBatchQuery && (
                <button type="button" aria-label="Hapus pencarian" onClick={() => setSearchBatchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B6C] hover:text-[#2D241E]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              id="closing-extra-filters-toggle"
              type="button"
              aria-expanded={isAdditionalFiltersOpen}
              aria-controls="closing-extra-filters"
              onClick={() => setIsAdditionalFiltersOpen((previous) => !previous)}
              className="flex h-10 items-center gap-2 rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-bold text-[#6D5D50] hover:bg-[#FDFBF7]"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter tambahan
              {(filterMasterCategory !== 'all' || filterCategory !== 'all') && <span className="h-2 w-2 rounded-full bg-[#D97706]" aria-label="Filter kategori aktif" />}
              {isAdditionalFiltersOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <fieldset className="min-w-0 flex-[2_1_280px]">
              <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#8C7B6C]">Tanggal Kadaluwarsa</legend>
              <div className="flex items-center gap-2">
                <input id="closing-date-from" type="date" aria-label="Tanggal kadaluwarsa awal" aria-invalid={isDateRangeInvalid} aria-describedby={isDateRangeInvalid ? 'closing-date-error' : undefined} value={dateFrom} onChange={(event) => handleDateRangeChange('from', event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-[#E5DACE] bg-white px-2 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]" />
                <span className="text-xs text-[#8C7B6C]">–</span>
                <input id="closing-date-to" type="date" aria-label="Tanggal kadaluwarsa akhir" aria-invalid={isDateRangeInvalid} aria-describedby={isDateRangeInvalid ? 'closing-date-error' : undefined} value={dateTo} onChange={(event) => handleDateRangeChange('to', event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-[#E5DACE] bg-white px-2 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]" />
              </div>
            </fieldset>
            <label className="min-w-0 flex-[1_1_160px]">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8C7B6C]">Jenis Expired</span>
              <select id="closing-expiry-type" value={filterExpiryType} onChange={(event) => setFilterExpiryType(event.target.value as ProductExpiryType | 'all')} className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]">
                <option value="all">Semua Jenis</option>
                <option value="daily">Expired Harian</option>
                <option value="multi_day">Expired &gt; 1 Hari</option>
              </select>
            </label>
            <label className="min-w-0 flex-[1_1_190px]">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#8C7B6C]">Status Kadaluwarsa</span>
              <select id="closing-status" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]">
                <option value="all">Semua Status</option>
                <option value="active">Stok Aktif &amp; Tersedia</option>
                <option value="expired">Perlu Rekonsiliasi (Expired)</option>
                <option value="near_expiry">Mendekati Expired (H+3)</option>
                <option value="destroyed">Telah Dimusnahkan</option>
              </select>
            </label>
            <button id="closing-reset-filters" type="button" onClick={handleResetFilters} className="flex h-10 items-center gap-2 rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-bold text-[#2D241E] hover:bg-[#FDFBF7]">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset Filter{activeFilterCount > 0 && <span className="text-[10px] text-[#8C7B6C]">({activeFilterCount})</span>}
            </button>
          </div>
          {isDateRangeInvalid && <p id="closing-date-error" role="alert" className="text-xs font-bold text-rose-700">Tanggal awal tidak boleh lebih besar dari tanggal akhir.</p>}
          {expiryFilter === 'closing_3days' && <p className="text-[11px] text-[#8C7B6C]">Akan Closing 3 Hari Ke Depan · Termasuk batch yang sudah kadaluwarsa.</p>}
          {isAdditionalFiltersOpen && (
            <div id="closing-extra-filters" className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E5DACE] bg-[#FDFBF7] p-3">
              <label className="min-w-0 flex-[1_1_200px]">
                <span className="mb-1.5 block text-[10px] font-bold text-[#8C7B6C]">Pilihan tanggal</span>
                <select id="closing-date-preset" value={expiryFilter} onChange={(event) => handleDatePresetChange(event.target.value as ExpiryFilterTab)} className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]">
                  <option value="closing_3days">Akan Closing 3 Hari Ke Depan</option>
                  <option value="all">Semua Tanggal</option>
                  <option value="today">Expired Hari Ini</option>
                  <option value="tomorrow">Expired Besok (H+1)</option>
                  <option value="h2">Expired Lusa (H+2)</option>
                  <option value="h3">Expired H+3</option>
                  <option value="expired">Sudah Expired (&lt; Hari ini)</option>
                  <option value="custom">Tanggal Spesifik...</option>
                  <option value="range">Rentang Kustom</option>
                </select>
              </label>
              {expiryFilter === 'custom' && (
                <label className="min-w-0 flex-[1_1_150px]">
                  <span className="mb-1.5 block text-[10px] font-bold text-[#8C7B6C]">Tanggal spesifik</span>
                  <input id="closing-custom-date" type="date" value={customDate} onChange={(event) => { setCustomDate(event.target.value); setDateFrom(event.target.value); setDateTo(event.target.value); }} className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white px-2 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]" />
                </label>
              )}
              <label className="min-w-0 flex-[1_1_200px]">
                <span className="mb-1.5 block text-[10px] font-bold text-[#8C7B6C]">Master Kategori</span>
                <select id="closing-master-category" value={filterMasterCategory} onChange={(event) => setFilterMasterCategory(event.target.value)} className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]">
                  <option value="all">Master Kategori: Semua</option>
                  {masterCategories.map((category) => <option key={category.id} value={category.id}>{category.name} ({category.categoryType})</option>)}
                </select>
              </label>
              <label className="min-w-0 flex-[1_1_180px]">
                <span className="mb-1.5 block text-[10px] font-bold text-[#8C7B6C]">Kategori Produk</span>
                <select id="closing-product-category" value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] outline-none focus:border-[#D97706]">
                  <option value="all">Kategori Produk: Semua</option>
                  {categories.filter((category) => category.id !== 'all').map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            </div>
          )}
        </section>

        <section aria-label="Seleksi batch pemusnahan" className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5DACE] bg-[#FDFBF7] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black text-[#2D241E]">Seleksi Batch Pemusnahan:</span>
            <button id="closing-select-expired" type="button" onClick={handleSelectAllExpired} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-800 hover:bg-rose-100">Pilih Semua yang Expired ({expiredBatches.length})</button>
            <button id="closing-select-filtered" type="button" onClick={handleSelectAllFiltered} className="rounded-lg border border-[#E5DACE] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#6D5D50] hover:bg-amber-50">Pilih Semua Sesuai Filter ({filteredBatches.length})</button>
            {selectedBatchIds.length > 0 && <button id="closing-clear-selection" type="button" onClick={handleClearSelection} className="rounded-lg border border-[#E5DACE] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#8C7B6C] hover:bg-gray-50">Batal Seleksi ({selectedBatchIds.length})</button>}
          </div>
          <div className="text-right">
            {selectedBatchIds.length > 0 ? (
              <>
                <span className="block text-xs font-black text-[#2D241E]">{totalSelectedPcs} pcs dipilih ({selectedBatchIds.length} batch)</span>
                {totalSelectedCost > 0 && <span className="text-[10px] text-[#8C7B6C]">Est. Nilai: {formatIDR(totalSelectedCost)}</span>}
              </>
            ) : <span className="text-[11px] text-[#8C7B6C]">{filteredBatches.length} batch sesuai filter</span>}
          </div>
        </section>
        {!isSuperadmin && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-900">
            <ShieldAlert className="h-4 w-4 shrink-0 text-blue-600" />
            <span>Otorisasi Superadmin diperlukan untuk eksekusi pemusnahan stok.</span>
          </div>
        )}

        {/* Batches Table */}
        <div id="closing-batch-list" className="min-h-[240px] min-w-0 flex-1 overflow-auto rounded-xl border border-[#E5DACE] bg-white">
          {filteredBatches.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#8C7B6C] space-y-2">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
              <p className="text-base font-black tabular-nums text-[#2D241E]">
                Tidak ada batch stok yang sesuai dengan kriteria filter saat ini.
              </p>
              <p className="text-[#8C7B6C] max-w-md mx-auto">
                Kondisi ini wajar jika tidak ada produk yang jatuh tempo pada rentang waktu yang dipilih (bukan bug sistem). Anda dapat melihat seluruh stok atau filter 3 hari ke depan dengan tombol di bawah.
              </p>
              <div className="pt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDatePresetChange('closing_3days')}
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
            <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-[#E5DACE] bg-[#FDFBF7] text-[10px] font-bold uppercase tracking-wide text-[#8C7B6C]">
                <tr>
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua batch sesuai filter"
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
                  const product = products.find((candidate) => candidate.id === batch.productId);
                  const isDaily = isDailyBatch(batch);
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
                          aria-label={"Pilih batch " + (batch.batchNumber || batch.id)}
                          checked={isSelected}
                          onChange={() => handleToggleSelectBatch(batch.id)}
                          className="rounded border-[#E5DACE] text-rose-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex min-w-[220px] max-w-[300px] items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5DACE] bg-[#FDFBF7]">
                            <Package className="h-5 w-5 text-[#8C7B6C]" aria-hidden="true" />
                            {product?.image && (
                              <img src={product.image} alt={batch.productName} className="absolute inset-0 h-full w-full rounded-lg object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-black leading-relaxed text-[#2D241E]">{batch.productName}</span>
                              {isDaily ? (
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
                            <div className="mt-1 text-[10px] font-semibold text-[#8C7B6C]">{batch.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-900">
                        {batch.batchNumber || batch.id}
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
                        {isDaily ? (
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
