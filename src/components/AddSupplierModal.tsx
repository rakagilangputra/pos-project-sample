import React, { useState } from 'react';
import { Building2, X, Check, Calendar, Phone, User, CreditCard } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { SettlementScheduleType } from '../types';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierCreated?: (supplierId: string) => void;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Senin' },
  { id: 2, label: 'Selasa' },
  { id: 3, label: 'Rabu' },
  { id: 4, label: 'Kamis' },
  { id: 5, label: 'Jumat' },
  { id: 6, label: 'Sabtu' },
  { id: 7, label: 'Minggu' },
];

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSupplierCreated,
}) => {
  const { addSupplier } = usePOS();
  const [name, setName] = useState('');
  const [picName, setPicName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [scheduleType, setScheduleType] = useState<SettlementScheduleType>('weekly');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<number>(5); // Jumat
  const [scheduleDates, setScheduleDates] = useState<[number, number]>([15, 30]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama supplier / UMKM wajib diisi!');
      return;
    }

    // Calculate next due date
    const now = new Date();
    let nextDueStr = '';
    if (scheduleType === 'weekly') {
      const currentDay = now.getDay() === 0 ? 7 : now.getDay();
      let diff = scheduleDayOfWeek - currentDay;
      if (diff <= 0) diff += 7;
      const nextDate = new Date(now.getTime() + diff * 86400000);
      nextDueStr = nextDate.toISOString().split('T')[0];
    } else {
      const currentMonthDate = now.getDate();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      if (currentMonthDate <= scheduleDates[0]) {
        nextDueStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(scheduleDates[0]).padStart(2, '0')}`;
      } else {
        nextDueStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(scheduleDates[1]).padStart(2, '0')}`;
      }
    }

    const res = addSupplier({
      name: trimmedName,
      picName: picName.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccountNumber: bankAccountNumber.trim() || undefined,
      bankAccountHolder: bankAccountHolder.trim() || undefined,
      scheduleType,
      scheduleDayOfWeek: scheduleType === 'weekly' ? scheduleDayOfWeek : undefined,
      scheduleDatesOfMonth: scheduleType === 'twice_monthly' ? scheduleDates : undefined,
      nextDueDate: nextDueStr,
    });

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg(res.message);
    if (res.supplier && onSupplierCreated) {
      onSupplierCreated(res.supplier.id);
    }
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div
      id="add-supplier-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        id="add-supplier-modal-card"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-amber-100/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-sm font-bold text-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2D241E]">Tambah Mitra Supplier Konsinyasi</h3>
              <p className="text-xs text-[#8C7B6C] font-semibold">Master Supplier & Jadwal Settlement (POS-US-030)</p>
            </div>
          </div>
          <button
            id="close-add-supplier-btn"
            onClick={onClose}
            className="rounded-xl p-2 text-[#8C7B6C] hover:bg-[#E5DACE] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              {successMsg}
            </div>
          )}

          {/* Supplier Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Nama Usaha / Mitra UMKM <span className="text-rose-500">*</span>
            </label>
            <input
              id="supplier-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Dapur Mama Mia, Snack Berkah Nusantara"
              className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2.5 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
            />
          </div>

          {/* PIC & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Nama PIC / Pemilik
              </label>
              <input
                id="supplier-pic-input"
                type="text"
                value={picName}
                onChange={(e) => setPicName(e.target.value)}
                placeholder="Ibu Mia / Pak Joko"
                className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                No. WhatsApp / HP
              </label>
              <input
                id="supplier-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>
          </div>

          {/* Settlement Schedule (POS-US-030 AC-03) */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#D97706]" />
              <label className="text-xs font-black uppercase tracking-wider text-[#2D241E]">
                Jadwal Siklus Settlement Komisi <span className="text-rose-500">*</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScheduleType('weekly')}
                className={`rounded-xl border-2 py-2 px-3 text-xs font-bold transition ${
                  scheduleType === 'weekly'
                    ? 'border-[#D97706] bg-amber-50 text-[#2D241E] shadow-xs'
                    : 'border-[#E5DACE] bg-white text-[#8C7B6C]'
                }`}
              >
                Mingguan (Weekly)
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('twice_monthly')}
                className={`rounded-xl border-2 py-2 px-3 text-xs font-bold transition ${
                  scheduleType === 'twice_monthly'
                    ? 'border-[#D97706] bg-amber-50 text-[#2D241E] shadow-xs'
                    : 'border-[#E5DACE] bg-white text-[#8C7B6C]'
                }`}
              >
                2x Sebulan (Bi-Weekly)
              </button>
            </div>

            {scheduleType === 'weekly' ? (
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-[#8C7B6C]">Pilih Hari Settlement:</span>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setScheduleDayOfWeek(d.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                        scheduleDayOfWeek === d.id
                          ? 'border-[#D97706] bg-[#D97706] text-white'
                          : 'border-[#E5DACE] bg-[#FDFBF7] text-[#2D241E]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-[#8C7B6C]">Tanggal Tiap Bulan:</span>
                <div className="flex items-center gap-2 text-xs font-bold text-[#2D241E]">
                  <span>Tanggal</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={scheduleDates[0]}
                    onChange={(e) =>
                      setScheduleDates([parseInt(e.target.value) || 15, scheduleDates[1]])
                    }
                    className="w-14 rounded-lg border-2 border-[#E5DACE] px-2 py-1 text-center font-bold"
                  />
                  <span>dan Tanggal</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={scheduleDates[1]}
                    onChange={(e) =>
                      setScheduleDates([scheduleDates[0], parseInt(e.target.value) || 30])
                    }
                    className="w-14 rounded-lg border-2 border-[#E5DACE] px-2 py-1 text-center font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bank & Payment Destination */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#D97706]" />
              <label className="text-xs font-black uppercase tracking-wider text-[#2D241E]">
                Rekening Pembayaran Settlement (Opsional)
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold uppercase">Nama Bank</span>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="BCA / Mandiri / BRI"
                  className="w-full rounded-xl border border-[#E5DACE] px-3 py-1.5 text-xs font-bold text-[#2D241E]"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold uppercase">No. Rekening</span>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  className="w-full rounded-xl border border-[#E5DACE] px-3 py-1.5 text-xs font-bold text-[#2D241E]"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold uppercase">Atas Nama Rekening</span>
                <input
                  type="text"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  placeholder="Nama Pemilik Rekening"
                  className="w-full rounded-xl border border-[#E5DACE] px-3 py-1.5 text-xs font-bold text-[#2D241E]"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#E5DACE]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border-2 border-[#E5DACE] bg-white px-5 py-2.5 text-xs font-black text-[#8C7B6C] hover:bg-[#E5DACE] transition"
            >
              Batal
            </button>
            <button
              id="submit-create-supplier-btn"
              type="submit"
              className="flex items-center gap-2 rounded-2xl border-2 border-[#D97706] bg-[#D97706] px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-amber-700 transition"
            >
              <Check className="h-4 w-4" />
              <span>Simpan Supplier</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
