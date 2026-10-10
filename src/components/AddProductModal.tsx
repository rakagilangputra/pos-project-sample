import React, { useState } from 'react';
import {
  PackagePlus,
  X,
  Check,
  Building2,
  Percent,
  Coins,
  AlertCircle,
  Image as ImageIcon,
  FolderPlus,
  ShieldCheck,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { ProductOwnershipType, CommissionMethod, CommissionBasis, Product, ProductStatus } from '../types';
import { formatIDR } from '../utils/formatters';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddCategory?: () => void;
  onOpenAddSupplier?: () => void;
}

const BAKERY_SAMPLE_IMAGES = [
  { label: 'Roti Manis', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
  { label: 'Croissant Butter', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80' },
  { label: 'Bolu / Cake Tart', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kue Basah / Lemper', url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kue Kering Toples', url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kopi & Minuman', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80' },
];

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onOpenAddCategory,
  onOpenAddSupplier,
}) => {
  const { categories, suppliers, masterCategories, addProduct, currentUser, verifySupervisorPin } = usePOS();

  // Basic info
  const [name, setName] = useState('');
  const [masterCategoryId, setMasterCategoryId] = useState(masterCategories[0]?.id || '');
  const [category, setCategory] = useState(categories.find((c) => c.id !== 'all')?.id || 'roti');
  const [price, setPrice] = useState<string>('15000');
  const [buyPrice, setBuyPrice] = useState<string>('');
  const [isPriceCustomizable, setIsPriceCustomizable] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5');
  const [isMadeToOrder, setIsMadeToOrder] = useState(false);
  const [image, setImage] = useState(BAKERY_SAMPLE_IMAGES[0].url);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProductStatus>('active');

  // Ownership & Consignment (POS-US-029)
  const [ownershipType, setOwnershipType] = useState<ProductOwnershipType>('own');
  const [supplierId, setSupplierId] = useState<string>('');
  const [commissionMethod, setCommissionMethod] = useState<CommissionMethod>('percentage');
  const [commissionValue, setCommissionValue] = useState<string>('15'); // 15% or IDR 3000
  const [commissionBasis, setCommissionBasis] = useState<CommissionBasis>('net');

  // Supervisor PIN auth for non-admin
  const [supervisorPin, setSupervisorPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const selectedMasterCategory = masterCategories.find((masterCategory) => masterCategory.id === masterCategoryId);
  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.masterCategoryId === masterCategoryId &&
    (selectedMasterCategory?.categoryType === 'PRODUKSI' ? supplier.isInternal : !supplier.isInternal)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setAuthError('');
    setSuccessMsg('');

    // Role check (POS-US-029 AC-01: Admin role or Supervisor authorization)
    if (currentUser.role !== 'admin') {
      if (!supervisorPin) {
        setAuthError('Otorisasi PIN Supervisor / Admin diperlukan untuk menambah master produk!');
        return;
      }
      const auth = verifySupervisorPin(supervisorPin);
      if (!auth.success) {
        setAuthError(auth.message);
        return;
      }
    }

    const trimmedName = name.trim();
    const numPrice = parseInt(price || '0', 10);
    const numBuyPrice = buyPrice.trim() === '' ? undefined : parseInt(buyPrice, 10);
    const numLowStock = parseInt(lowStockThreshold || '5', 10);
    const numCommValue = parseFloat(commissionValue || '0');

    if (!trimmedName) {
      setErrorMsg('Nama produk wajib diisi!');
      return;
    }
    if (numPrice < 0) {
      setErrorMsg('Harga jual tidak boleh bernilai negatif!');
      return;
    }
    if (numBuyPrice !== undefined && (isNaN(numBuyPrice) || numBuyPrice < 0)) {
      setErrorMsg('Harga beli harus berupa angka nol atau lebih!');
      return;
    }

    const catItem = categories.find((c) => c.id === category);
    const catLabel = catItem ? catItem.name : 'Roti & Bakery';

    const selectedSup = filteredSuppliers.find((supplier) => supplier.id === supplierId);
    if (!selectedMasterCategory || !selectedSup) {
      setErrorMsg('Pilih Master Kategori dan Supplier yang sesuai!');
      return;
    }

    const derivedOwnershipType: ProductOwnershipType = selectedMasterCategory.categoryType === 'KONSINYASI'
      ? 'consignment'
      : 'own';

    const res = addProduct({
      name: trimmedName,
      masterCategoryId,
      category,
      categoryLabel: catLabel,
      price: numPrice,
      buyPrice: numBuyPrice,
      isPriceCustomizable,
      stock: 0, // Stock is strictly added via Pembelian & Penerimaan
      lowStockThreshold: numLowStock,
      isMadeToOrder,
      image: image || BAKERY_SAMPLE_IMAGES[0].url,
      description: description.trim() || undefined,
      ownershipType: derivedOwnershipType,
      supplierId: selectedSup.id,
      supplierName: selectedSup.name,
      commissionMethod: derivedOwnershipType === 'consignment' ? commissionMethod : undefined,
      commissionValue: derivedOwnershipType === 'consignment' ? numCommValue : undefined,
      commissionBasis:
        derivedOwnershipType === 'consignment' && commissionMethod === 'percentage'
          ? commissionBasis
          : undefined,
      status,
    });

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg(res.message);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div
      id="add-product-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm"
    >
      <div
        id="add-product-modal-card"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-amber-100/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-sm">
              <PackagePlus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2D241E]">Tambah Master Produk Baru</h3>
              <p className="text-xs text-[#8C7B6C] font-semibold">
                Produk Sendiri & Barang Konsinyasi Titipan (POS-US-029)
              </p>
            </div>
          </div>
          <button
            id="close-add-product-btn"
            onClick={onClose}
            className="rounded-xl p-2 text-[#8C7B6C] hover:bg-[#E5DACE] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">Master Kategori *</label>
              <select
                value={masterCategoryId}
                onChange={(e) => {
                  setMasterCategoryId(e.target.value);
                  setSupplierId('');
                }}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                {masterCategories.map((masterCategory) => (
                  <option key={masterCategory.id} value={masterCategory.id}>
                    [{masterCategory.categoryType}] {masterCategory.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                <option value="">Pilih Supplier sesuai Master Kategori...</option>
                {filteredSuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.isInternal ? 'Internal' : 'Supplier'}: {supplier.name} ({supplier.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">Status Produk</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                <option value="active">Active — dapat dijual</option>
                <option value="inactive">Inactive — simpan sebagai nonaktif</option>
              </select>
            </div>
          </div>

          {/* Section: Ownership Type (Milik Sendiri vs Konsinyasi) */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Model Kepemilikan Produk <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="ownership-own-btn"
                onClick={() => setOwnershipType('own')}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition ${
                  ownershipType === 'own'
                    ? 'border-[#D97706] bg-amber-50/70 text-[#2D241E] shadow-sm font-black'
                    : 'border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] hover:bg-white font-bold'
                }`}
              >
                <span className="text-lg">🍞</span>
                <span className="text-xs mt-1">Produk Sendiri (In-House)</span>
                <span className="text-[10px] text-[#8C7B6C] font-normal">Diproduksi/dibuat sendiri oleh bakery</span>
              </button>

              <button
                type="button"
                id="ownership-consignment-btn"
                onClick={() => setOwnershipType('consignment')}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition ${
                  ownershipType === 'consignment'
                    ? 'border-[#D97706] bg-amber-50/70 text-[#2D241E] shadow-sm font-black'
                    : 'border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] hover:bg-white font-bold'
                }`}
              >
                <span className="text-lg">🤝</span>
                <span className="text-xs mt-1">Konsinyasi / Barang Titipan</span>
                <span className="text-[10px] text-[#8C7B6C] font-normal">Milik mitra supplier dengan skema komisi</span>
              </button>
            </div>
          </div>

          {/* If Consignment: Supplier & Commission Rules (POS-US-029 AC-04) */}
          {ownershipType === 'consignment' && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#D97706]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#2D241E]">
                    Pengaturan Supplier & Skema Komisi Titipan
                  </h4>
                </div>
                {onOpenAddSupplier && (
                  <button
                    type="button"
                    onClick={onOpenAddSupplier}
                    className="text-[11px] font-bold text-[#D97706] hover:underline"
                  >
                    + Supplier Baru
                  </button>
                )}
              </div>

              {/* Supplier Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D241E]">Pilih Mitra Supplier</label>
                <select
                  id="product-supplier-select"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (PIC: {s.picName} - Jadwal: {s.scheduleType === 'weekly' ? 'Mingguan' : '2x Sebulan'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Commission Method & Basis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Metode Komisi Toko</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCommissionMethod('percentage')}
                      className={`flex-1 rounded-xl border-2 py-1.5 text-xs font-bold transition ${
                        commissionMethod === 'percentage'
                          ? 'border-[#D97706] bg-[#D97706] text-white'
                          : 'border-[#E5DACE] bg-white text-[#2D241E]'
                      }`}
                    >
                      Persentase (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommissionMethod('fixed')}
                      className={`flex-1 rounded-xl border-2 py-1.5 text-xs font-bold transition ${
                        commissionMethod === 'fixed'
                          ? 'border-[#D97706] bg-[#D97706] text-white'
                          : 'border-[#E5DACE] bg-white text-[#2D241E]'
                      }`}
                    >
                      Nominal Tetap (Rp)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">
                    {commissionMethod === 'percentage' ? 'Besaran Persentase Komisi (%)' : 'Nominal Komisi Toko per Unit (Rp)'}
                  </label>
                  <input
                    id="commission-value-input"
                    type="number"
                    min="0"
                    step={commissionMethod === 'percentage' ? '0.5' : '500'}
                    value={commissionValue}
                    onChange={(e) => setCommissionValue(e.target.value)}
                    placeholder={commissionMethod === 'percentage' ? 'Misal: 15' : 'Misal: 3000'}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>
              </div>

              {/* Commission Basis if Percentage */}
              {commissionMethod === 'percentage' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Dasar Perhitungan Komisi</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCommissionBasis('net')}
                      className={`rounded-xl border-2 p-2 text-left transition ${
                        commissionBasis === 'net'
                          ? 'border-[#D97706] bg-white text-[#2D241E] font-bold shadow-xs'
                          : 'border-[#E5DACE] bg-white/70 text-[#8C7B6C]'
                      }`}
                    >
                      <div className="font-bold">Net Penjualan (Diskon Dipotong)</div>
                      <div className="text-[10px] text-[#8C7B6C]">Dihitung setelah potongan diskon produk/pesanan</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommissionBasis('gross')}
                      className={`rounded-xl border-2 p-2 text-left transition ${
                        commissionBasis === 'gross'
                          ? 'border-[#D97706] bg-white text-[#2D241E] font-bold shadow-xs'
                          : 'border-[#E5DACE] bg-white/70 text-[#8C7B6C]'
                      }`}
                    >
                      <div className="font-bold">Gross Penjualan</div>
                      <div className="text-[10px] text-[#8C7B6C]">Dihitung murni dari harga satuan × jumlah terjual</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* General Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Nama Produk <span className="text-rose-500">*</span>
              </label>
              <input
                id="product-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Roti Sisir Butter Wisman Premium"
                className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2.5 text-sm font-bold text-[#2D241E] placeholder:text-[#8C7B6C]/60 focus:border-[#D97706] focus:outline-none"
              />
            </div>

            {/* SKU / Barcode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                  Kode Produk / SKU
                </label>
                <span className="text-[10px] font-bold text-[#8C7B6C]">Dibuat otomatis</span>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-[#E5DACE] bg-[#FDFBF7] px-4 py-2.5 text-xs font-semibold text-[#8C7B6C]">
                SKU akan mengikuti Supplier yang dipilih dan dibuat saat produk disimpan.
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                {onOpenAddCategory && (
                  <button
                    type="button"
                    onClick={onOpenAddCategory}
                    className="text-[11px] font-bold text-[#D97706] hover:underline"
                  >
                    + Kategori Baru
                  </button>
                )}
              </div>
              <select
                id="product-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2.5 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                {categories
                  .filter((c) => c.id !== 'all')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon || '🏷️'} {c.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Harga Jual Satuan (IDR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#8C7B6C]">Rp</span>
                <input
                  id="product-price-input"
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white pl-10 pr-4 py-2.5 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="product-buy-price-input" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                  Harga Beli Satuan (IDR) <span className="text-[10px] font-semibold normal-case tracking-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#8C7B6C]">Rp</span>
                  <input
                    id="product-buy-price-input"
                    type="number"
                    min="0"
                    step="1"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="Contoh: 9000"
                    className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white pl-10 pr-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none shadow-xs"
                  />
                </div>
                <p className="text-[10px] text-[#8C7B6C]">Referensi master saja; harga aktual dicatat saat penerimaan barang.</p>
              </div>
            </div>

            {/* Low stock threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Batas Peringatan Stok Menipis
              </label>
              <input
                id="product-threshold-input"
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2.5 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            {/* Notice on Stock Management */}
            <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-[#8C7B6C] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong className="text-[#2D241E]">Stok Awal Produk: 0 Pcs.</strong> Stok baru wajib ditambahkan secara tertib dan terlacak melalui menu <strong>Pembelian & Penerimaan Barang</strong>.
              </span>
            </div>

            {/* Toggles: Custom Price & Made-to-order */}
            <div className="space-y-2 flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPriceCustomizable}
                  onChange={(e) => setIsPriceCustomizable(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#D97706]"
                />
                <span className="text-xs font-bold text-[#2D241E]">
                  Harga Fleksibel / Dapat Disesuaikan saat Transaksi
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMadeToOrder}
                  onChange={(e) => setIsMadeToOrder(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#D97706]"
                />
                <span className="text-xs font-bold text-[#2D241E]">
                  Produk Pesanan / Made-to-Order (PO / DP)
                </span>
              </label>
            </div>
          </div>

          {/* Image Presets */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Foto Produk (Pilih Preset Gambar atau Masukkan URL)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BAKERY_SAMPLE_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setImage(preset.url)}
                  className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                    image === preset.url
                      ? 'border-[#D97706] ring-2 ring-amber-400'
                      : 'border-[#E5DACE] hover:border-[#8C7B6C]'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-[9px] font-bold text-white text-center truncate">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
            <input
              id="product-image-url-input"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-1.5 text-xs text-[#2D241E] focus:border-[#D97706] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Deskripsi Produk & Rasa (Opsional)
            </label>
            <textarea
              id="product-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Komposisi bahan, rasa, keunggulan..."
              className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
            />
          </div>

          {/* Authorization for Cashiers */}
          {currentUser.role !== 'admin' && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#D97706]" />
                <h4 className="text-xs font-black text-[#2D241E]">
                  Otorisasi Tambah Master Produk (Role Kasir: {currentUser.name})
                </h4>
              </div>
              <p className="text-[11px] text-[#8C7B6C]">
                Hanya Admin / Supervisor yang dapat menyetujui penambahan master data produk. Masukkan PIN
                Supervisor (8888) atau Admin (9999).
              </p>
              <input
                id="supervisor-pin-input"
                type="password"
                maxLength={4}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                placeholder="PIN Supervisor..."
                className="w-48 rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-sm font-bold tracking-widest text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
              {authError && <p className="text-xs font-bold text-rose-700">{authError}</p>}
            </div>
          )}

          {/* Submit Actions (POS-US-040: primary before Close) */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
            <button
              id="submit-create-product-btn"
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
            >
              <Check className="h-4 w-4" />
              <span>Simpan Master Produk</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
            >
              Tutup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
