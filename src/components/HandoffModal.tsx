import React, { useState } from 'react';
import { RefreshCw, X, UserCheck, Delete, Shield, Crown, User as UserIcon } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { posSound } from '../utils/formatters';

interface HandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HandoffModal: React.FC<HandoffModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, switchUser } = usePOS();
  const [selectedNextUser, setSelectedNextUser] = useState<string>(
    users.find((u) => u.id !== currentUser.id)?.id || users[0]?.id || ''
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
        const res = switchUser(selectedNextUser, next);
        if (res.success) {
          setSuccessMsg(res.message);
          setTimeout(() => {
            setSuccessMsg('');
            setPin('');
            onClose();
          }, 800);
        } else {
          setError(res.message);
          posSound.error();
        }
      }
    }
  };

  const handleQuickSelectUser = (uId: string, uPin: string) => {
    setSelectedNextUser(uId);
    setPin(uPin);
    setError('');
    const res = switchUser(uId, uPin);
    if (res.success) {
      setSuccessMsg(res.message);
      setTimeout(() => {
        setSuccessMsg('');
        setPin('');
        onClose();
      }, 800);
    } else {
      setError(res.message);
    }
  };

  const selectedUserObj = users.find((u) => u.id === selectedNextUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Ganti Akun & Shift Pengguna</h3>
              <p className="text-xs text-amber-900">
                Pengguna Aktif:{' '}
                <span className="font-bold">{currentUser.name}</span> (
                <span className="capitalize font-semibold text-amber-800">
                  {currentUser.role === 'admin' ? 'Superadmin' : currentUser.role}
                </span>
                )
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPin('');
              onClose();
            }}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2.5">
            Pilih Pengguna / Role Tujuan:
          </label>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {users
              .filter((u) => u.status === 'active' || !u.status)
              .map((u) => {
                const isSelected = selectedNextUser === u.id;
                const isSuperadmin = u.role === 'admin';
                const isSupervisor = u.role === 'supervisor';

                return (
                  <button
                    key={u.id}
                    id={`switch-user-btn-${u.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedNextUser(u.id);
                      setPin('');
                      setError('');
                    }}
                    className={`flex items-center gap-2.5 rounded-2xl p-3 border text-left transition active:scale-95 ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/80 shadow-xs ring-2 ring-amber-200'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={u.name}
                        className="h-10 w-10 rounded-full object-cover border border-gray-200"
                      />
                      {isSuperadmin && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
                          <Crown className="h-2.5 w-2.5" />
                        </div>
                      )}
                      {isSupervisor && (
                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                          <Shield className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-gray-900 truncate">{u.name}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isSuperadmin ? (
                          <span className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.2 text-[9px] font-black text-purple-800">
                            Superadmin
                          </span>
                        ) : isSupervisor ? (
                          <span className="inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.2 text-[9px] font-black text-blue-800">
                            Supervisor
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-800">
                            Kasir
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          <p className="text-center text-xs font-semibold text-gray-600 mb-2">
            Masukkan 4-digit PIN untuk{' '}
            <strong className="text-amber-900">{selectedUserObj?.name || 'Pengguna'}</strong>:
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
                className="flex h-12 items-center justify-center rounded-2xl bg-gray-50 text-xl font-bold text-gray-800 hover:bg-amber-100 active:scale-95 transition"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="flex h-12 items-center justify-center rounded-2xl bg-gray-100 text-xs font-bold text-gray-600 hover:bg-gray-200 transition"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="flex h-12 items-center justify-center rounded-2xl bg-gray-50 text-xl font-bold text-gray-800 hover:bg-amber-100 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="flex h-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Demo Login Badges */}
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-3">
            <span className="block text-[10px] font-black uppercase tracking-wider text-amber-900 mb-1.5">
              Klik Cepat Demo PIN:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {users.map((u) => {
                const label =
                  u.role === 'admin'
                    ? `${u.name} (Superadmin: ${u.pin})`
                    : u.role === 'supervisor'
                    ? `${u.name} (SPV: ${u.pin})`
                    : `${u.name} (Kasir: ${u.pin})`;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSelectUser(u.id, u.pin)}
                    className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-gray-800 border border-amber-200 hover:border-amber-500 hover:bg-amber-100/50 transition shadow-2xs"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
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
