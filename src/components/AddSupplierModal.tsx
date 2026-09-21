import React, { useState, useEffect } from 'react';
import { Building2, X, Check, CreditCard, Info } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Supplier, MasterCategory } from '../types';

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
  const { addSupplier, updateSupplier, masterCategories, suppliers } = usePOS();
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [picName, setPicName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active categories from Master Kategori Backoffice
  const availableMasterCategories: MasterCategory[] = masterCategories && masterCategories.length > 0
    ? masterCategories
    : [
        {
          id: 'KAT-PROD-01',
          name: 'Roti Manis & Roti Tawar',
          categoryType: 'PRODUKSI',
          branchIds: ['branch-senopati', 'branch-kemang'],
          description: 'Kategori produk roti produksi in-house dapur utama pusat',
          createdAt: '2026-01-15T08:00:00Z',
        },
        {
          id: 'KAT-KSN-01',
          name: 'Kue Basah Tradisional',
          categoryType: 'KONSINYASI',
          branchIds: ['branch-senopati'],
          description: 'Produk titipan konsinyasi jajanan pasar dari mitra UMKM lokal',
          createdAt: '2026-02-01T09:30:00Z',
        },
        {
          id: 'KAT-RSL-01',
          name: 'Minuman Kemasan & Botol',
          categoryType: 'BELI (RESELLER)',
          branchIds: ['branch-senopati', 'branch-kemang', 'branch-bintaro'],
          description: 'Produk siap jual dari distributor retail minuman segar',
          createdAt: '2026-02-10T11:15:00Z',
        },
        {
          id: 'KAT-PROD-02',
          name: 'Artisan Pastry & Croissant',
          categoryType: 'PRODUKSI',
          branchIds: ['branch-senopati', 'branch-kemang'],
          description: 'Pastry butter olahan chef pastry in-house',
          createdAt: '2026-02-20T14:00:00Z',
        },
        {
          id: 'KAT-KSN-02',
          name: 'Keripik & Snack Kering UMKM',
          categoryType: 'KONSINYASI',
          branchIds: ['branch-senopati', 'branch-kemang'],
          description: 'Camilan kering kemasan titip jual dari pengrajin lokal',
          createdAt: '2026-03-05T10:00:00Z',
        },
      ];

  // Helper: check if a category is already linked to another supplier (1:1 rule)
  const getAssignedSupplierForCategory = (catName: string): Supplier | undefined => {
    return suppliers.find(
      (s) =>
        s.id !== supplierToEdit?.id &&
        (s.category?.trim().toLowerCase() === catName.trim().toLowerCase() ||
          s.categories?.some((c) => c.trim().toLowerCase() === catName.trim().toLowerCase()))
    );
  };

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      if (supplierToEdit.category) {
        const primaryCat = supplierToEdit.category.split(',')[0].trim();
        setSelectedCategory(primaryCat);
      } else if (supplierToEdit.categories && supplierToEdit.categories.length > 0) {
        setSelectedCategory(supplierToEdit.categories[0]);
      } else {
        setSelectedCategory('');
      }
      setPicName(supplierToEdit.picName || '');
      setPhone(supplierToEdit.phone || '');
      setAddress(supplierToEdit.address || '');
      setBankName(supplierToEdit.bankName || 'BCA');
      setBankAccountNumber(supplierToEdit.bankAccountNumber || '');
      setBankAccountHolder(supplierToEdit.bankAccountHolder || '');
    } else {
      setName('');
      // Default to first UNASSIGNED master category
      const firstAvailable = availableMasterCategories.find(
        (c) => !getAssignedSupplierForCategory(c.name)
      );
      setSelectedCategory(firstAvailable ? firstAvailable.name : '');
      setPicName('');
      setPhone('');
      setAddress('');
      setBankName('BCA');
      setBankAccountNumber('');
      setBankAccountHolder('');
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [supplierToEdit, isOpen, suppliers]);

  if (!isOpen) return null;

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
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

    if (!selectedCategory) {
      setErrorMsg('Pilih satu Master Kategori yang masih tersedia!');
      return;
    }

    // Enforce 1:1 rule: A Master Category can only have one Supplier
    const assignedSupplier = getAssignedSupplierForCategory(selectedCategory);
    if (assignedSupplier) {
      setErrorMsg(
        `Master Kategori "${selectedCategory}" sudah terhubung dengan mitra "${assignedSupplier.name}". 1 Master Kategori hanya boleh terhubung dengan 1 Mitra Supplier!`
      );
      return;
    }

    let res;
    if (supplierToEdit) {
      res = updateSupplier(supplierToEdit.id, {
        name: trimmedName,
        category: selectedCategory,
        categories: [selectedCategory],
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
        category: selectedCategory,
        categories: [selectedCategory],
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

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'KONSINYASI':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'PRODUKSI':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'BELI (RESELLER)':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const activeCategoryObj = availableMasterCategories.find((c) => c.name === selectedCategory);

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

          {/* Master Kategori (Single selection from Master Kategori Backoffice - 1:1 Rule) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="supplier-category-select" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Master Kategori <span className="text-rose-500">*</span>
              </label>
              {activeCategoryObj && (
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-black border ${getTypeBadgeStyle(activeCategoryObj.categoryType)}`}>
                  Tipe: {activeCategoryObj.categoryType}
                </span>
              )}
            </div>

            {/* Main Select Dropdown */}
            <select
              id="supplier-category-select"
              required
              value={selectedCategory}
              onChange={(e) => handleSelectCategory(e.target.value)}
              className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none cursor-pointer shadow-2xs"
            >
              <option value="" disabled>-- Pilih 1 Kategori dari Master Kategori --</option>
              {availableMasterCategories.map((c) => {
                const assignedSupplier = getAssignedSupplierForCategory(c.name);
                const isAssigned = !!assignedSupplier;

                return (
                  <option
                    key={c.id}
                    value={c.name}
                    disabled={isAssigned}
                    className={isAssigned ? 'text-gray-400 bg-gray-100 font-normal' : 'text-gray-900 font-bold'}
                  >
                    [{c.categoryType}] {c.name} {isAssigned ? `(Sudah Digunakan - ${assignedSupplier?.name})` : ''}
                  </option>
                );
              })}
            </select>

            {/* Helper notice explaining 1:1 relation rule */}
            <div className="flex items-start gap-1.5 rounded-xl bg-amber-50/80 border border-amber-200/80 px-3 py-2 text-[11px] text-amber-900 font-medium">
              <Info className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Aturan Relasi 1:1:</strong> Satu Master Kategori hanya dapat terhubung dengan 1 Mitra Supplier. Kategori yang telah terdaftar pada supplier lain tidak dapat dipilih kembali.
              </span>
            </div>
          </div>

          {/* Nama Usaha */}
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

          {/* Rekening Pembayaran */}
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
