import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Store,
  Tag,
  Calendar,
  Trash2,
  CheckCircle2,
  X,
  Building2,
  Info,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { MasterCategory, MasterCategoryType } from '../types';

interface AddMasterCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMasterCategoryModal: React.FC<AddMasterCategoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { branches, addMasterCategory } = usePOS();

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState<MasterCategoryType>('PRODUKSI');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(
    branches.map((b) => b.id)
  );
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleToggleBranch = (branchId: string) => {
    if (selectedBranchIds.includes(branchId)) {
      if (selectedBranchIds.length === 1) {
        setErrorMsg('Minimal pilih satu cabang operasional!');
        return;
      }
      setSelectedBranchIds((prev) => prev.filter((id) => id !== branchId));
    } else {
      setSelectedBranchIds((prev) => [...prev, branchId]);
    }
    setErrorMsg('');
  };

  const handleSelectAllBranches = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedId = id.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedId) {
      setErrorMsg('ID Master Kategori wajib diisi (contoh: KAT-ROT-01)!');
      return;
    }
    // Check alphanumeric with dashes/underscores
    if (!/^[A-Z0-9_-]+$/.test(trimmedId)) {
      setErrorMsg('ID Kategori hanya boleh berisi huruf, angka, tanda hubung (-), dan garis bawah (_)!');
      return;
    }
    if (!trimmedName) {
      setErrorMsg('Nama Kategori wajib diisi!');
      return;
    }
    if (selectedBranchIds.length === 0) {
      setErrorMsg('Pilih minimal satu cabang toko!');
      return;
    }

    const result = addMasterCategory({
      id: trimmedId,
      name: trimmedName,
      categoryType,
      branchIds: selectedBranchIds,
    });

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div
      id="add-master-category-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="add-master-category-modal-card"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Tambah Master Kategori
              </h3>
            </div>
          </div>
          <button
            id="close-add-master-category-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div
              id="master-category-form-error"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 flex items-start gap-2"
            >
              <Info className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. ID Kategori */}
          <div>
            <label
              htmlFor="master-category-id-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              1. ID Kategori <span className="text-rose-500">*</span>
            </label>
            <input
              id="master-category-id-input"
              type="text"
              required
              placeholder="Contoh: KAT-ROT-01, KAT-KSN-02"
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-semibold text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 uppercase"
            />
          </div>

          {/* 2. Nama Kategori */}
          <div>
            <label
              htmlFor="master-category-name-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              2. Nama Kategori <span className="text-rose-500">*</span>
            </label>
            <input
              id="master-category-name-input"
              type="text"
              required
              placeholder="Contoh: Roti Manis & Roti Sisir, Kue Basah Tradisional"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* 3. Tipe Kategori */}
          <div>
            <label
              htmlFor="master-category-type-select"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              3. Tipe Kategori <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { type: 'KONSINYASI' },
                  { type: 'PRODUKSI' },
                  { type: 'BELI (RESELLER)' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  id={`type-option-${opt.type.replace(/[^a-zA-Z0-9]/g, '-')}`}
                  onClick={() => setCategoryType(opt.type)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    categoryType === opt.type
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-800">{opt.type}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Cabang ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Cabang Toko <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                id="select-all-branches-btn"
                onClick={handleSelectAllBranches}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700"
              >
                Pilih Semua ({branches.length})
              </button>
            </div>
            <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 max-h-36 overflow-y-auto">
              {branches.map((branch) => {
                const isSelected = selectedBranchIds.includes(branch.id);
                return (
                  <label
                    key={branch.id}
                    id={`branch-checkbox-label-${branch.id}`}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-300 bg-amber-50/50 text-slate-900 font-medium'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        id={`branch-checkbox-${branch.id}`}
                        checked={isSelected}
                        onChange={() => handleToggleBranch(branch.id)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{branch.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {branch.code || branch.id}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              id="cancel-add-master-category-btn"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              id="submit-add-master-category-btn"
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Simpan Master Kategori
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const MasterCategoryWorkspace: React.FC = () => {
  const { masterCategories, branches, deleteMasterCategory } = usePOS();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filtered List
  const filteredCategories = useMemo(() => {
    return masterCategories.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      const matchType =
        selectedTypeFilter === 'ALL' || item.categoryType === selectedTypeFilter;

      const matchBranch =
        selectedBranchFilter === 'ALL' ||
        (item.branchIds && item.branchIds.includes(selectedBranchFilter));

      return matchQuery && matchType && matchBranch;
    });
  }, [masterCategories, searchQuery, selectedTypeFilter, selectedBranchFilter]);

  const getBranchName = (branchId: string) => {
    const b = branches.find((item) => item.id === branchId);
    return b ? b.name : branchId;
  };

  const getTypeBadge = (type: MasterCategoryType) => {
    switch (type) {
      case 'KONSINYASI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            KONSINYASI
          </span>
        );
      case 'PRODUKSI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            PRODUKSI
          </span>
        );
      case 'BELI (RESELLER)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            BELI (RESELLER)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {type}
          </span>
        );
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div id="master-category-workspace-container" className="space-y-4 animate-fadeIn">
      {/* Compact Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-white p-3.5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 font-bold">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Master Kategori</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {masterCategories.length}
            </span>
          </div>
        </div>

        {/* Right side: Search, Filters, and Add Button in single row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              id="search-master-category-input"
              type="text"
              placeholder="Cari kategori / ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Tipe Kategori Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <select
              id="filter-master-category-type-select"
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="KONSINYASI">KONSINYASI</option>
              <option value="PRODUKSI">PRODUKSI</option>
              <option value="BELI (RESELLER)">BELI (RESELLER)</option>
            </select>
          </div>

          {/* Cabang Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 text-xs">
            <Store className="h-3.5 w-3.5 text-slate-400" />
            <select
              id="filter-master-category-branch-select"
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Create Button */}
          <button
            id="create-master-category-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 active:scale-95 transition-all ml-auto sm:ml-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Table List of Master Categories */}
      <div
        id="master-category-table-card"
        className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table id="master-category-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="px-5 py-3">Tanggal Dibuat</th>
                <th className="px-5 py-3">Nama Kategori & ID</th>
                <th className="px-5 py-3">Tipe Kategori</th>
                <th className="px-5 py-3">Cabang Termasuk</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="h-10 w-10 text-slate-300" />
                      <p className="font-semibold text-slate-600">
                        Tidak ada Master Kategori yang sesuai
                      </p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {searchQuery || selectedTypeFilter !== 'ALL' || selectedBranchFilter !== 'ALL'
                          ? 'Coba ubah filter pencarian atau tipe kategori Anda.'
                          : 'Klik tombol "Tambah" di atas untuk menambahkan data baru.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((item) => (
                  <tr
                    key={item.id}
                    id={`master-cat-row-${item.id}`}
                    className="hover:bg-amber-50/20 transition-colors"
                  >
                    {/* 1. Created Date */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </td>

                    {/* 2. Nama Kategori & ID */}
                    <td className="px-5 py-3.5">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                        <div className="inline-flex items-center gap-1 mt-0.5 font-mono text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                          <Tag className="h-3 w-3" />
                          {item.id}
                        </div>
                      </div>
                    </td>

                    {/* 3. Tipe Kategori */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getTypeBadge(item.categoryType)}
                    </td>

                    {/* 4. Cabang Termasuk */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {item.branchIds && item.branchIds.length > 0 ? (
                          item.branchIds.map((bId) => (
                            <span
                              key={bId}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200"
                            >
                              <Building2 className="h-2.5 w-2.5 text-slate-400" />
                              {getBranchName(bId)}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Semua Cabang
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        id={`delete-master-cat-btn-${item.id}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Apakah Anda yakin ingin menghapus Master Kategori '${item.name}' (${item.id})?`
                            )
                          ) {
                            deleteMasterCategory(item.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Hapus Master Kategori"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <span className="font-bold text-slate-700">{filteredCategories.length}</span> dari{' '}
            <span className="font-bold text-slate-700">{masterCategories.length}</span> master kategori
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Konsinyasi
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> Produksi
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span> Reseller
            </span>
          </div>
        </div>
      </div>

      {/* Add Master Category Modal */}
      <AddMasterCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
