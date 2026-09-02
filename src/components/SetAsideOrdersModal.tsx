import React from 'react';
import { Clock, Play, Trash2, X, ShoppingBag } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR, formatDateTime } from '../utils/formatters';

interface SetAsideOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetAsideOrdersModal: React.FC<SetAsideOrdersModalProps> = ({ isOpen, onClose }) => {
  const { setAsideOrders, resumeOrder, cancelHoldOrder } = usePOS();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Pesanan Ditahan (Parkir Nota)</h3>
              <p className="text-xs text-amber-800">
                Total {setAsideOrders.length} pesanan yang sedang diparkir di kasir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {setAsideOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 py-12">
              <ShoppingBag className="h-12 w-12 text-gray-300 mb-2" />
              <p className="font-bold text-gray-600">Tidak ada nota yang sedang diparkir.</p>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                Gunakan tombol "Parkir Nota" di keranjang ketika pelanggan ingin mengambil item tambahan tanpa menghalangi antrean kasir.
              </p>
            </div>
          ) : (
            setAsideOrders.map((held) => (
              <div
                key={held.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-4 transition hover:border-amber-400 hover:bg-amber-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 text-base">{held.label}</span>
                    <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                      {held.customer.name}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    <span>Diparkir: {formatDateTime(held.createdAt)}</span>
                    <span className="mx-2">•</span>
                    <span>{held.items.length} jenis roti ({held.items.reduce((s, i) => s + i.quantity, 0)} pcs)</span>
                  </div>
                  <div className="mt-2 text-sm font-black text-emerald-800">
                    Total: {formatIDR(held.total)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm(`Batalkan pesanan parkir "${held.label}"?`)) {
                        cancelHoldOrder(held.id);
                      }
                    }}
                    className="flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Hapus</span>
                  </button>

                  <button
                    onClick={() => {
                      resumeOrder(held.id);
                      onClose();
                    }}
                    className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white shadow-md hover:bg-amber-700 active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Lanjutkan ke Kasir</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
