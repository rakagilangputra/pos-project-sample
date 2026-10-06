import React, { useMemo, useState } from 'react';
import {
  Building2,
  Edit2,
  Info,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  Tag,
  UserRound,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Supplier } from '../types';
import { AddSupplierModal } from './AddSupplierModal';

export const SupplierManagementWorkspace: React.FC = () => {
  const { suppliers, masterCategories, branches, selectedBranch } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMasterCategoryId, setSelectedMasterCategoryId] = useState('ALL');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const getMasterCategory = (supplier: Supplier) =>
    masterCategories.find((category) => category.id === supplier.masterCategoryId);

  const getSupplierType = (supplier: Supplier) => getMasterCategory(supplier)?.categoryType || 'Belum dipetakan';

  const getBranchName = (branchId?: string) => {
    if (!branchId) return 'Semua Cabang / Internal';
    return branches.find((branch) => branch.id === branchId)?.name || branchId;
  };

  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const masterCategory = getMasterCategory(supplier);
      const matchesMasterCategory =
        selectedMasterCategoryId === 'ALL' || supplier.masterCategoryId === selectedMasterCategoryId;
      const matchesQuery =
        !query ||
        supplier.id.toLowerCase().includes(query) ||
        supplier.name.toLowerCase().includes(query) ||
        supplier.picName.toLowerCase().includes(query) ||
        supplier.phone.toLowerCase().includes(query) ||
        masterCategory?.name.toLowerCase().includes(query);

      return matchesMasterCategory && matchesQuery;
    });
  }, [masterCategories, searchQuery, selectedMasterCategoryId, suppliers]);

  const getTypeBadgeClass = (type: string) => {
    if (type === 'KONSINYASI') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (type === 'PRODUKSI') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (type === 'BELI (RESELLER)') return 'border-blue-200 bg-blue-50 text-blue-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
  };

  const openCreateModal = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const closeSupplierModal = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(false);
  };

  return (
    <div id="supplier-management-workspace-container" className="space-y-4 animate-fadeIn">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 font-bold text-amber-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Mitra Supplier</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                {filteredSuppliers.length}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Kelola supplier untuk {selectedBranch?.name || 'cabang aktif'}.
            </p>
          </div>
        </div>

        <button
          id="create-supplier-management-btn"
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Tambah Mitra Supplier
        </button>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            id="search-supplier-management-input"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari nama, ID supplier, PIC, atau telepon..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          <select
            id="filter-supplier-master-category-select"
            value={selectedMasterCategoryId}
            onChange={(event) => setSelectedMasterCategoryId(event.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">Semua Master Kategori</option>
            {masterCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-[11px] text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Supplier baru wajib memiliki Master Kategori. ID supplier dibuat otomatis dari ID Master Kategori dan tetap unik lintas cabang.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table id="supplier-management-table" className="w-full min-w-[920px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3">ID Supplier</th>
                <th className="px-4 py-3">Nama Mitra</th>
                <th className="px-4 py-3">Master Kategori</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">PIC / Kontak</th>
                <th className="px-4 py-3">Cabang</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Building2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="font-semibold text-slate-600">Belum ada mitra supplier yang sesuai</p>
                    <p className="mt-1 text-[11px]">Ubah pencarian atau tambahkan mitra supplier baru.</p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => {
                  const masterCategory = getMasterCategory(supplier);
                  const supplierType = getSupplierType(supplier);

                  return (
                    <tr key={supplier.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 align-top">
                        <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[11px] font-bold text-amber-700">
                          <Tag className="h-3 w-3" />
                          {supplier.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-bold text-slate-900">{supplier.name}</div>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {supplier.isInternal ? 'Internal Produksi' : 'Mitra Eksternal'}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {masterCategory ? (
                          <>
                            <div className="font-semibold text-slate-800">{masterCategory.name}</div>
                            <div className="font-mono text-[10px] text-slate-400">{masterCategory.id}</div>
                          </>
                        ) : (
                          <span className="italic text-slate-400">Belum terhubung</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${getTypeBadgeClass(supplierType)}`}>
                          {supplierType}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          {supplier.picName || '-'}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-slate-400">☎</span>
                          {supplier.phone || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-600">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {supplier.branchId ? <Store className="h-3.5 w-3.5 text-slate-400" /> : <Building2 className="h-3.5 w-3.5 text-slate-400" />}
                          {getBranchName(supplier.branchId)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {supplier.isInternal ? (
                          <span className="text-[10px] font-bold text-slate-400">System</span>
                        ) : (
                          <button
                            id={`edit-supplier-${supplier.id}`}
                            type="button"
                            onClick={() => openEditModal(supplier)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddSupplierModal
        isOpen={isSupplierModalOpen}
        supplierToEdit={editingSupplier}
        initialMasterCategoryId={editingSupplier?.masterCategoryId}
        onClose={closeSupplierModal}
      />
    </div>
  );
};
