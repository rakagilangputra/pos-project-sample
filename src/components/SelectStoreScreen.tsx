import React from 'react';
import { Store, Check, ShieldAlert, ArrowRight, Building2, Clock, MapPin, Phone, Lock } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { StoreBranch } from '../types';

export const SelectStoreScreen: React.FC = () => {
  const {
    currentUser,
    branches,
    selectedBranchId,
    selectBranch,
    isStoreSelectionModalOpen,
    setIsStoreSelectionModalOpen,
  } = usePOS();

  // Cashier does not have store selection
  if (currentUser.role === 'cashier') {
    return null;
  }

  // Determine eligible branches based on role
  let eligibleBranches: StoreBranch[] = [];

  if (currentUser.role === 'admin') {
    // Superadmin: any active branch or inactive branch (labelled Read-only)
    eligibleBranches = branches;
  } else if (currentUser.role === 'supervisor') {
    // Supervisor: only assigned active branches
    eligibleBranches = branches.filter(
      (b) =>
        Array.isArray(currentUser.assignedBranchIds) &&
        currentUser.assignedBranchIds.includes(b.id) &&
        b.status === 'active'
    );
  }

  const handleSelectBranch = (branch: StoreBranch) => {
    selectBranch(branch.id);
    setIsStoreSelectionModalOpen(false);
  };

  if (!isStoreSelectionModalOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[990] flex items-center justify-center bg-black/70 p-4 sm:p-6 backdrop-blur-md">
      <div
        id="select-store-screen-container"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/50 px-6 sm:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-gray-900">
                  Pilih Cabang Operasional
                </h2>
                <p className="text-xs text-gray-600">
                  Masuk sebagai{' '}
                  <span className="font-bold text-amber-900">{currentUser.name}</span> (
                  <span className="capitalize font-semibold text-amber-800">
                    {currentUser.role === 'admin' ? 'Superadmin' : 'Supervisor'}
                  </span>
                  ) — Tentukan cabang toko untuk dikelola.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5">
          {eligibleBranches.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/70 p-8 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" />
              <h3 className="mt-3 text-base font-bold text-rose-900">
                Tidak Ada Cabang Aktif yang Ditugaskan
              </h3>
              <p className="mt-1 text-xs text-rose-700 max-w-md mx-auto">
                Akun Supervisor Anda belum memiliki penugasan cabang aktif. Silakan hubungi Superadmin untuk menetapkan hak akses cabang Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleBranches.map((branch) => {
                const isSelected = selectedBranchId === branch.id;
                const isInactive = branch.status === 'inactive';

                return (
                  <div
                    key={branch.id}
                    id={`branch-card-${branch.id}`}
                    onClick={() => handleSelectBranch(branch)}
                    className={`group relative flex flex-col justify-between rounded-2xl border-2 p-5 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/40 shadow-md ring-2 ring-amber-500/20'
                        : isInactive
                        ? 'border-gray-200 bg-gray-50/80 hover:border-gray-300'
                        : 'border-gray-200 bg-white hover:border-amber-400 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Status Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-black text-gray-700 tracking-wider">
                          {branch.code}
                        </span>

                        {isInactive && currentUser.role !== 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-200">
                            <Lock className="h-3 w-3" />
                            Read-only
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                            {currentUser.role === 'admin' ? 'Akses Penuh' : 'Aktif'}
                          </span>
                        )}
                      </div>

                      {/* Branch Name */}
                      <h4 className="text-base font-bold text-gray-900 group-hover:text-amber-700 transition">
                        {branch.name}
                      </h4>

                      {/* Details */}
                      <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{branch.address}, {branch.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{branch.operatingHours}</span>
                        </div>
                        {branch.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Bar at card bottom */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-700">
                          <Check className="h-4 w-4" /> Cabang Terpilih Saat Ini
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-gray-500 group-hover:text-amber-600 transition flex items-center gap-1">
                          {isInactive ? 'Lihat Arsip (Read-only)' : 'Pilih Cabang Ini'}
                          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer with Tutup button at bottom right */}
        <div className="border-t border-gray-100 bg-gray-50/80 px-6 sm:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            * Seluruh data pesanan, stok, pelanggan, dan audit log disajikan terpisah per cabang terpilih.
          </p>
          <button
            id="select-store-tutup-btn"
            type="button"
            onClick={() => setIsStoreSelectionModalOpen(false)}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
