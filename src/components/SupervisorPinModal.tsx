import React, { useState } from 'react';
import { ShieldCheck, X, Delete } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { posSound } from '../utils/formatters';

interface SupervisorPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onSuccess: (supervisorName: string) => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  onSuccess,
}) => {
  const { verifySupervisorPin } = usePOS();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      posSound.beep();
      if (newPin.length >= 4) {
        // Test auth
        const res = verifySupervisorPin(newPin);
        if (res.success && res.supervisor) {
          posSound.cashRegister();
          onSuccess(res.supervisor.name);
          setPin('');
          onClose();
        } else if (newPin.length === 4) {
          setError('PIN Supervisor salah');
          posSound.error();
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
    posSound.beep();
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              <p className="text-xs text-amber-800">Otorisasi Manajer / SPV</p>
            </div>
          </div>
          <button
            onClick={() => {
              setPin('');
              onClose();
            }}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <p className="mb-4 text-sm text-gray-600">{description}</p>

          {/* PIN circles */}
          <div className="mb-6 flex justify-center gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all duration-150 ${
                  pin.length > idx
                    ? 'scale-125 bg-amber-600 ring-4 ring-amber-200'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="mb-4 text-sm font-semibold text-rose-600 animate-bounce">
              {error}
            </p>
          )}

          {/* Touch Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="flex h-16 items-center justify-center rounded-2xl bg-gray-50 text-2xl font-bold text-gray-800 shadow-sm transition hover:bg-amber-100 active:scale-95 active:bg-amber-200"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="flex h-16 items-center justify-center rounded-2xl bg-rose-50 text-base font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="flex h-16 items-center justify-center rounded-2xl bg-gray-50 text-2xl font-bold text-gray-800 shadow-sm transition hover:bg-amber-100 active:scale-95 active:bg-amber-200"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 active:scale-95"
            >
              <Delete className="h-6 w-6" />
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Demo PIN SPV: <strong className="text-gray-600">8888</strong> | Admin: <strong className="text-gray-600">9999</strong>
          </p>
        </div>

        {/* Modal Footer with Close button (POS-US-040) */}
        <div className="border-t border-gray-100 bg-white px-6 py-3 flex justify-end">
          <button
            id="spv-modal-close-btn"
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
