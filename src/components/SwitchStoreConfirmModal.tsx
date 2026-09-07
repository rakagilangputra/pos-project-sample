import React from 'react';
import { AlertTriangle, Store, X } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export const SwitchStoreConfirmModal: React.FC = () => {
  const {
    confirmSwitchStore,
    confirmAndSwitchBranch,
    cancelSwitchBranch,
    branches,
  } = usePOS();

  if (!confirmSwitchStore.isOpen || !confirmSwitchStore.targetBranchId) {
    return null;
  }

  const targetBranch = branches.find((b) => b.id === confirmSwitchStore.targetBranchId);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        id="switch-store-confirm-modal"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Perpindahan Cabang</h3>
              <p className="text-xs text-amber-800">Terdapat perubahan formulir yang belum disimpan</p>
            </div>
          </div>
          <button
            onClick={cancelSwitchBranch}
            className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-700">
            Discard changes and switch store?
          </p>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <Store className="h-4 w-4" />
              <span>Target Cabang: {targetBranch?.name || 'Cabang Baru'}</span>
            </div>
            <p className="text-[11px] text-amber-800/90">
              Jika Anda berpindah toko sekarang, data input yang sedang Anda ketik pada formulir aktif akan dibatalkan dan seluruh tampilan akan dimuat ulang sesuai data cabang tujuan.
            </p>
          </div>
        </div>

        {/* Footer with Stay and Switch Store buttons, and Tutup */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
          <button
            id="stay-store-btn"
            type="button"
            onClick={cancelSwitchBranch}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-xs"
            autoFocus
          >
            Stay
          </button>
          <button
            id="switch-store-confirm-btn"
            type="button"
            onClick={confirmAndSwitchBranch}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 active:scale-95 transition shadow-sm"
          >
            Switch Store
          </button>
        </div>
      </div>
    </div>
  );
};
