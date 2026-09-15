import React, { useState, useEffect } from 'react';
import { Building2, X, Check, Phone, User, CreditCard, Tag } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Supplier } from '../types';

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
  const { addSupplier, updateSupplier, categories } = usePOS();
  const [name, setName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [picName, setPicName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active product categories from Stok Kategori
  const stockCategories = categories.filter((c) => c.id !== 'all');

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      if (supplierToEdit.categories && supplierToEdit.categories.length > 0) {
        setSelectedCategories(supplierToEdit.categories);
      } else if (supplierToEdit.category) {
        setSelectedCategories(
          supplierToEdit.category
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      } else {
        setSelectedCategories([]);
      }
      setPicName(supplierToEdit.picName || '');
      setPhone(supplierToEdit.phone || '');
      setAddress(supplierToEdit.address || '');
      setBankName(supplierToEdit.bankName || 'BCA');
      setBankAccountNumber(supplierToEdit.bankAccountNumber || '');
      setBankAccountHolder(supplierToEdit.bankAccountHolder || '');
    } else {
      setName('');
      setSelectedCategories([]);
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

  const handleToggleCategory = (catName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const handleAddCategory = (catName: string) => {
    if (!catName) return;
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev : [...prev, catName]
    );
  };

  const handleRemoveCategory = (catName: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== catName));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Nama supplier / UMKM wajib diisi!');
      return;
    }

    if (selectedCategories.length === 0) {
      setErrorMsg('Pilih minimal satu Kategori produk dari Stok!');
      return;
    }

    const joinedCategory = selectedCategories.join(', ');

    let res;
    if (supplierToEdit) {
      res = updateSupplier(supplierToEdit.id, {
        name: trimmedName,
        category: joinedCategory,
        categories: selectedCategories,
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
        category: joinedCategory,
        categories: selectedCategories,
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

          {/* Kategori (Data source: Stok Kategori with Multi-Tag selection) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="supplier-category-select" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[#8C7B6C] font-semibold">
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} Kategori Dipilih`
                  : 'Pilih dari Kategori Stok'}
              </span>
            </div>

            {/* Selected Categories Badge Chips */}
            {selectedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-amber-50/70 border border-amber-200 min-h-[42px] items-center">
                {selectedCategories.map((catName) => {
                  const catObj = stockCategories.find((c) => c.name === catName);
                  return (
                    <span
                      key={catName}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-amber-300 px-2.5 py-1 text-xs font-black text-amber-950 shadow-2xs animate-in fade-in zoom-in-95 duration-150"
                    >
                      {catObj?.icon && <span className="text-xs">{catObj.icon}</span>}
                      <span>{catName}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(catName)}
                        className="ml-0.5 rounded-md p-0.5 text-amber-700 hover:bg-amber-100 hover:text-amber-900 transition"
                        title={`Hapus kategori ${catName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[#E5DACE] bg-white/60 p-2.5 text-center text-xs text-[#8C7B6C] font-medium">
                Belum ada kategori dipilih. Klik tombol kategori produk di bawah untuk memilih:
              </div>
            )}

            {/* Multi-Select Category Pills from Stok Kategori */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#8C7B6C]">
                <Tag className="h-3 w-3 text-amber-600" />
                <span>Pilih Kategori Produk (Bisa pilih lebih dari satu):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {stockCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggleCategory(cat.name)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 ${
                        isSelected
                          ? 'bg-amber-600 text-white border border-amber-700 shadow-xs font-black'
                          : 'bg-white text-[#2D241E] border border-[#E5DACE] hover:border-amber-400 hover:bg-amber-50/50'
                      }`}
                    >
                      {cat.icon && <span className="text-xs">{cat.icon}</span>}
                      <span>{cat.name}</span>
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dropdown Alternative for Fast / Keyboard Selection */}
            <div className="pt-1">
              <select
                id="supplier-category-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddCategory(e.target.value);
                  }
                }}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none cursor-pointer"
              >
                <option value="">+ Tambah / Pilih Kategori dari Stok...</option>
                {stockCategories.map((c) => (
                  <option key={c.id} value={c.name} disabled={selectedCategories.includes(c.name)}>
                    {c.icon ? `${c.icon} ` : ''}{c.name} {selectedCategories.includes(c.name) ? '✓ (Terpilih)' : ''}
                  </option>
                ))}
              </select>
            </div>
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
