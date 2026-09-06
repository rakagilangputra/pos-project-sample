import React, { useState, useEffect } from 'react';
import { Building2, X, Check, Phone, User, CreditCard } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Supplier, SupplierCategory } from '../types';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierCreated?: (supplierId: string) => void;
  supplierToEdit?: Supplier | null;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSupplierCreated,
  supplierToEdit,
}) => {
  const { addSupplier, updateSupplier } = usePOS();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplierCategory>('KYD');
  const [picName, setPicName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      setCategory(supplierToEdit.category || 'KYD');
      setPicName(supplierToEdit.picName || '');
      setPhone(supplierToEdit.phone || '');
      setAddress(supplierToEdit.address || '');
      setBankName(supplierToEdit.bankName || 'BCA');
      setBankAccountNumber(supplierToEdit.bankAccountNumber || '');
      setBankAccountHolder(supplierToEdit.bankAccountHolder || '');
    } else {
      setName('');
      setCategory('KYD');
      setPicName('');
      setPhone('');
      setAddress('');
      setBankName('BCA');
      setBankAccountNumber('');
      setBankAccountHolder('');
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [supplierToEdit, isOpen]);

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

    let res;
    if (supplierToEdit) {
      res = updateSupplier(supplierToEdit.id, {
        name: trimmedName,
        category,
        picName: picName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountHolder: bankAccountHolder.trim() || undefined,
      });
    } else {
      res = addSupplier({
        name: trimmedName,
        category,
        picName: picName.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        bankName: bankName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankAccountHolder: bankAccountHolder.trim() || undefined,
      });
    }

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg(res.message);
    if (!supplierToEdit && (res as any).supplier && onSupplierCreated) {
      onSupplierCreated((res as any).supplier.id);
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
              <h3 className="text-base font-black text-[#2D241E]">
                {supplierToEdit ? 'Edit Informasi Mitra Supplier' : 'Tambah Mitra Supplier Konsinyasi'}
              </h3>
              <p className="text-xs text-[#8C7B6C] font-semibold">
                {supplierToEdit
                  ? 'Perbarui Data Kontak & Rekening Pembayaran'
                  : 'Master Data Mitra Supplier & Rekening Pembayaran'}
              </p>
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

          {/* Kategori Supplier (Predefined: KYD, RMS, TCC) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="supplier-category-select" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Kategori Supplier <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[#8C7B6C] font-semibold">Predefined Backoffice</span>
            </div>
            <select
              id="supplier-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplierCategory)}
              className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2.5 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none cursor-pointer"
              required
            >
              <option value="KYD">KYD</option>
              <option value="RMS">RMS</option>
              <option value="TCC">TCC</option>
            </select>
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
          <div className="flex items-center justify-end pt-3 border-t border-[#E5DACE]">
            <button
              id="submit-create-supplier-btn"
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#D97706] px-5 py-2.5 text-xs font-black text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
            >
              <Check className="h-4 w-4" />
              <span>{supplierToEdit ? 'Simpan Perubahan' : 'Simpan Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
