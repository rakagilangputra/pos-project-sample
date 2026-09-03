import React, { useState } from 'react';
import { RefreshCw, X, UserCheck, Delete } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { posSound } from '../utils/formatters';

interface HandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandoffModal: React.FC<HandoffModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, handOffSession } = usePOS();
  const [selectedNextUser, setSelectedNextUser] = useState<string>(
    users.find((u) => u.id !== currentUser.id)?.id || ''
  );
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleDigit = (d: string) => {
    if (pin.length < 4) {
      const next = pin + d;
      setPin(next);
      setError('');
      posSound.beep();

      if (next.length === 4) {
        const res = handOffSession(selectedNextUser, next);
        if (res.success) {
          setSuccessMsg(res.message);
          setTimeout(() => {
            setSuccessMsg('');
            setPin('');
            onClose();
          }, 1000);
        } else {
          setError(res.message);
          posSound.error();
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Ganti Kasir / Serah Terima Shift</h3>
              <p className="text-xs text-amber-800">Kasir Aktif: {currentUser.name}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPin('');
              onClose();
            }}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
            Pilih Kasir Penerima:
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {users
              .filter((u) => u.role === 'cashier' || u.role === 'supervisor')
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedNextUser(u.id);
                    setPin('');
                    setError('');
                  }}
                  className={`flex items-center gap-2 rounded-2xl p-2.5 border text-left transition ${
                    selectedNextUser === u.id
                      ? 'border-amber-600 bg-amber-50 shadow-xs'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <img src={u.avatar} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                  <div className="truncate">
                    <span className="block text-xs font-bold text-gray-900 truncate">{u.name}</span>
                    <span className="block text-[10px] text-gray-500 capitalize">{u.role}</span>
                  </div>
                </button>
              ))}
          </div>

          <p className="text-center text-xs font-medium text-gray-500 mb-2">
            Masukkan 4-digit PIN Kasir Penerima:
          </p>

          {/* PIN Indicators */}
          <div className="mb-4 flex justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all ${
                  pin.length > idx ? 'scale-125 bg-amber-600 ring-4 ring-amber-200' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {error && <p className="mb-3 text-center text-xs font-bold text-rose-600">{error}</p>}
          {successMsg && <p className="mb-3 text-center text-xs font-bold text-emerald-600">{successMsg}</p>}

          {/* PIN Pad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="flex h-14 items-center justify-center rounded-2xl bg-gray-50 text-xl font-bold text-gray-800 hover:bg-amber-100 active:scale-95 transition"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="flex h-14 items-center justify-center rounded-2xl bg-gray-100 text-xs font-bold text-gray-600"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="flex h-14 items-center justify-center rounded-2xl bg-gray-50 text-xl font-bold text-gray-800 hover:bg-amber-100 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="flex h-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-600"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-gray-400">
            Demo PIN Rina: <strong>1234</strong> | Budi: <strong>2345</strong> | Siti SPV: <strong>8888</strong>
          </p>
        </div>

        {/* Modal Footer with Close button (POS-US-040) */}
        <div className="border-t border-gray-100 bg-white px-6 py-3 flex justify-end">
          <button
            id="handoff-modal-close-btn"
            type="button"
            onClick={() => {
              setPin('');
              onClose();
            }}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
