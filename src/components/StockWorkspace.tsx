import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  Search,
  Check,
  AlertCircle,
  FolderPlus,
  PackagePlus,
  SlidersHorizontal,
  Building2,
  History,
  Tag,
  MoreVertical,
  ArrowLeft,
  ShieldCheck,
  Percent,
  Coins,
  Sparkles,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product, ProductOwnershipType, CommissionMethod, CommissionBasis } from '../types';
import { formatIDR, formatDateTime } from '../utils/formatters';
import { AddCategoryModal } from './AddCategoryModal';

type StockLocalView = 'products' | 'adjustments' | 'categories';

const BAKERY_SAMPLE_IMAGES = [
  { label: 'Roti Manis', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
  { label: 'Croissant Butter', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80' },
  { label: 'Bolu / Cake Tart', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kue Basah / Lemper', url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kue Kering Toples', url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kopi & Minuman', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80' },
];

export const StockWorkspace: React.FC = () => {
  const {
    products,
    categories,
    suppliers,
    manualAdjustStock,
    stockAdjustments,
    addProduct,
    currentUser,
    verifySupervisorPin,
  } = usePOS();

  // Local View Tab: 'products' (default), 'adjustments', 'categories'
  const [activeView, setActiveView] = useState<StockLocalView>('products');

  // Full-page Add Product mode (POS-US-050 AC-05)
  const [isFullPageAddProduct, setIsFullPageAddProduct] = useState(false);

  // Single modal for Add Category
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Stock filters
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState<'all' | 'low_stock' | 'out_of_stock' | 'consignment'>('all');

  // Row-level More Actions menu toggle
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Adjustment Modal State (POS-US-021)
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'increase' | 'decrease'>('increase');
  const [adjustQtyInput, setAdjustQtyInput] = useState<string>('5');
  const [adjustReason, setAdjustReason] = useState<string>('Restock Dapur Pagi');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // -------------------------------------------------------------
  // Full-page Product Creation Form State (POS-US-050 & POS-US-029)
  // -------------------------------------------------------------
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState(categories.find((c) => c.id !== 'all')?.id || 'roti');
  const [newPrice, setNewPrice] = useState<string>('15000');
  const [isPriceCustomizable, setIsPriceCustomizable] = useState(false);
  const [newOpeningStock, setNewOpeningStock] = useState<string>('20');
  const [newLowStockThreshold, setNewLowStockThreshold] = useState<string>('5');
  const [newImage, setNewImage] = useState(BAKERY_SAMPLE_IMAGES[0].url);
  const [newDescription, setNewDescription] = useState('');

  // Ownership & Consignment
  const [newOwnershipType, setNewOwnershipType] = useState<ProductOwnershipType>('own');
  const [newSupplierId, setNewSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [newCommissionMethod, setNewCommissionMethod] = useState<CommissionMethod>('percentage');
  const [newCommissionValue, setNewCommissionValue] = useState<string>('15');
  const [newCommissionBasis, setNewCommissionBasis] = useState<CommissionBasis>('net');

  // Authorization for Cashiers/Supervisors
  const [supervisorPin, setSupervisorPin] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterCondition === 'low_stock' && (p.stock >= p.lowStockThreshold || p.stock <= 0)) return false;
      if (filterCondition === 'out_of_stock' && p.stock > 0) return false;
      if (filterCondition === 'consignment' && p.ownershipType !== 'consignment') return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchCat = p.categoryLabel.toLowerCase().includes(q);
        const matchSup = p.supplierName && p.supplierName.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchCat && !matchSup) return false;
      }
      return true;
    });
  }, [products, filterCondition, search]);

  // Handle SKU suggestion
  const handleSuggestSku = () => {
    const prefix = newCategory.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(100 + Math.random() * 900);
    setNewSku(`${prefix}-${randomNum}`);
  };

  // Submit Add Product (Full Page)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (currentUser.role !== 'admin') {
      if (!supervisorPin) {
        setFormError('Otorisasi PIN Supervisor / Admin diperlukan untuk menambah master produk!');
        return;
      }
      const auth = verifySupervisorPin(supervisorPin);
      if (!auth.success) {
        setFormError(auth.message);
        return;
      }
    }

    const trimmedName = newName.trim();
    const trimmedSku = newSku.trim().toUpperCase();
    const numPrice = parseInt(newPrice || '0', 10);
    const numStock = parseInt(newOpeningStock || '0', 10);
    const numLowStock = parseInt(newLowStockThreshold || '5', 10);
    const numCommValue = parseFloat(newCommissionValue || '0');

    if (!trimmedName) {
      setFormError('Nama produk wajib diisi!');
      return;
    }
    if (!trimmedSku) {
      setFormError('Kode SKU / barcode produk wajib diisi!');
      return;
    }
    if (numPrice < 0) {
      setFormError('Harga jual tidak boleh bernilai negatif!');
      return;
    }

    const isMadeToOrderCat = newCategory === 'mto' || newCategory === 'custom_cake';
    const catItem = categories.find((c) => c.id === newCategory);
    const catLabel = isMadeToOrderCat
      ? 'Made-to-Order'
      : catItem
      ? catItem.name
      : 'Roti & Bakery';

    let selectedSup = suppliers.find((s) => s.id === newSupplierId);
    if (newOwnershipType === 'consignment' && !selectedSup && suppliers.length > 0) {
      selectedSup = suppliers[0];
    }

    if (newOwnershipType === 'consignment' && !selectedSup) {
      setFormError('Pilih supplier mitra titipan konsinyasi!');
      return;
    }

    setIsSubmittingProduct(true);
    const res = addProduct({
      name: trimmedName,
      sku: trimmedSku,
      category: isMadeToOrderCat ? 'custom_cake' : newCategory,
      categoryLabel: catLabel,
      price: numPrice,
      isPriceCustomizable,
      stock: numStock,
      lowStockThreshold: numLowStock,
      isMadeToOrder: isMadeToOrderCat,
      image: newImage || BAKERY_SAMPLE_IMAGES[0].url,
      description: newDescription.trim() || undefined,
      ownershipType: newOwnershipType,
      supplierId: newOwnershipType === 'consignment' ? selectedSup?.id : undefined,
      supplierName: newOwnershipType === 'consignment' ? selectedSup?.name : undefined,
      commissionMethod: newOwnershipType === 'consignment' ? newCommissionMethod : undefined,
      commissionValue: newOwnershipType === 'consignment' ? numCommValue : undefined,
      commissionBasis:
        newOwnershipType === 'consignment' && newCommissionMethod === 'percentage'
          ? newCommissionBasis
          : undefined,
    });
    setIsSubmittingProduct(false);

    if (!res.success) {
      setFormError(res.message);
      return;
    }

    setFormSuccess(res.message);
    setTimeout(() => {
      // Reset form and return to product list
      setNewName('');
      setNewSku('');
      setNewDescription('');
      setSupervisorPin('');
      setFormSuccess('');
      setIsFullPageAddProduct(false);
      setActiveView('products');
    }, 700);
  };

  // Submit Stock Adjustment
  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const qty = parseInt(adjustQtyInput || '0', 10);
    if (qty <= 0) {
      alert('Jumlah penyesuaian harus lebih dari 0!');
      return;
    }

    setAdjustSubmitting(true);
    const res = manualAdjustStock(adjustingProduct.id, adjustType, qty, adjustReason);
    setAdjustSubmitting(false);

    if (res.success) {
      setToastMsg(res.message);
      setAdjustingProduct(null);
      setTimeout(() => setToastMsg(''), 3500);
    } else {
      alert(res.message);
    }
  };

  // -------------------------------------------------------------
  // RENDER: FULL PAGE TAMBAH PRODUK (POS-US-050 AC-05, AC-06, AC-07)
  // -------------------------------------------------------------
  if (isFullPageAddProduct) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-white border-2 border-[#E5DACE] rounded-[2rem] shadow-sm animate-fadeIn">
        {/* Full-page Header with Breadcrumb & Back */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-amber-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFullPageAddProduct(false)}
              className="flex items-center gap-1.5 rounded-xl border border-[#D97706] bg-white px-3 py-1.5 text-xs font-bold text-[#D97706] hover:bg-amber-50 active:scale-95 transition shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Stok</span>
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs text-[#8C7B6C] font-semibold">
                <span>Stok</span>
                <span>/</span>
                <span>Produk</span>
                <span>/</span>
                <span className="text-[#D97706] font-bold">Tambah Produk Baru</span>
              </div>
              <h2 className="text-base font-black text-[#2D241E]">
                Formulir Master Produk Baru
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFullPageAddProduct(false)}
            className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] transition"
          >
            Tutup
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto w-full">
          {formError && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
              <Check className="h-5 w-5 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Section: Model Kepemilikan (Sendiri vs Konsinyasi) */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                Model Kepemilikan Produk <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-[#8C7B6C]">
                Pilih apakah produk buatan dapur sendiri atau titipan supplier
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                id="ownership-own-btn"
                onClick={() => setNewOwnershipType('own')}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition ${
                  newOwnershipType === 'own'
                    ? 'border-[#D97706] bg-white text-[#2D241E] shadow-sm font-black'
                    : 'border-[#E5DACE] bg-white/60 text-[#8C7B6C] hover:bg-white font-bold'
                }`}
              >
                <Package className="h-6 w-6 text-[#D97706] mb-1.5" />
                <span className="text-sm">Produk Sendiri (Owned)</span>
                <span className="text-[10px] text-[#8C7B6C] mt-0.5">Produksi in-house toko roti</span>
              </button>

              <button
                type="button"
                id="ownership-consignment-btn"
                onClick={() => setNewOwnershipType('consignment')}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition ${
                  newOwnershipType === 'consignment'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm font-black'
                    : 'border-[#E5DACE] bg-white/60 text-[#8C7B6C] hover:bg-white font-bold'
                }`}
              >
                <Building2 className="h-6 w-6 text-purple-700 mb-1.5" />
                <span className="text-sm">Barang Titipan (Konsinyasi)</span>
                <span className="text-[10px] text-[#8C7B6C] mt-0.5">Milik mitra dengan bagi hasil komisi</span>
              </button>
            </div>

            {/* Consignment Configuration Details (revealed if Consignment selected) */}
            {newOwnershipType === 'consignment' && (
              <div className="mt-4 rounded-2xl border-2 border-purple-200 bg-white p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 text-purple-900 font-black text-xs">
                  <Building2 className="h-4 w-4 text-purple-700" />
                  <span>Konfigurasi Mitra Supplier & Skema Komisi Konsinyasi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#2D241E]">
                      Mitra Supplier <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="supplier-select"
                      value={newSupplierId}
                      onChange={(e) => setNewSupplierId(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.picName} - {s.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#2D241E]">
                      Metode Komisi Toko <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCommissionMethod('percentage')}
                        className={`rounded-xl border py-2 text-xs font-bold transition ${
                          newCommissionMethod === 'percentage'
                            ? 'border-purple-600 bg-purple-100 text-purple-900'
                            : 'border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C]'
                        }`}
                      >
                        Persentase (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCommissionMethod('fixed')}
                        className={`rounded-xl border py-2 text-xs font-bold transition ${
                          newCommissionMethod === 'fixed'
                            ? 'border-purple-600 bg-purple-100 text-purple-900'
                            : 'border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C]'
                        }`}
                      >
                        Nominal Tetap (Rp)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#2D241E]">
                      Nilai Komisi Toko {newCommissionMethod === 'percentage' ? '(%)' : '(Rp)'}
                    </label>
                    <input
                      type="number"
                      value={newCommissionValue}
                      onChange={(e) => setNewCommissionValue(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                    />
                  </div>

                  {newCommissionMethod === 'percentage' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#2D241E]">Dasar Komisi</label>
                      <select
                        value={newCommissionBasis}
                        onChange={(e) => setNewCommissionBasis(e.target.value as any)}
                        className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                      >
                        <option value="net">Net Sales (Setelah diskon)</option>
                        <option value="gross">Gross Sales (Sebelum diskon)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section: Basic Info */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Informasi Utama Produk
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Roti Cokelat Keju Spesial"
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#2D241E]">
                    SKU / Kode Produk <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestSku}
                    className="text-[11px] font-bold text-[#D97706] hover:underline"
                  >
                    Auto-Generate SKU
                  </button>
                </div>
                <input
                  id="product-sku-input"
                  type="text"
                  required
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="Contoh: ROT-102"
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none uppercase"
                />
              </div>
            </div>

            {/* Category selection - Note: Made-to-Order is a Category and NO Base Ready Stock field is displayed */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">
                Kategori Produk <span className="text-rose-500">*</span>
              </label>
              <select
                id="product-category-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                {categories
                  .filter((c) => c.id !== 'all')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon || '🏷️'} {cat.name}
                    </option>
                  ))}
                {/* Made-to-Order remains selectable as a Product Category */}
                <option value="mto">🎂 Made-to-Order / Custom Cake</option>
              </select>
            </div>

            {/* Pricing & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">
                  Harga Jual (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">Stok Awal (pcs)</label>
                <input
                  type="number"
                  min="0"
                  value={newOpeningStock}
                  onChange={(e) => setNewOpeningStock(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">Batas Stok Menipis</label>
                <input
                  type="number"
                  min="1"
                  value={newLowStockThreshold}
                  onChange={(e) => setNewLowStockThreshold(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-sm font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>
            </div>

            {/* Price Customizable Toggle */}
            <div className="flex items-center gap-3 pt-1">
              <input
                id="custom-price-toggle"
                type="checkbox"
                checked={isPriceCustomizable}
                onChange={(e) => setIsPriceCustomizable(e.target.checked)}
                className="h-4 w-4 rounded text-[#D97706] focus:ring-[#D97706]"
              />
              <label htmlFor="custom-price-toggle" className="text-xs font-bold text-[#2D241E]">
                Izinkan Kasir Mengubah / Menyesuaikan Harga Saat Transaksi (Custom Price)
              </label>
            </div>
          </div>

          {/* Image & Description */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Foto & Keterangan
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Pilihan Foto Produk</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BAKERY_SAMPLE_IMAGES.map((img) => (
                  <button
                    key={img.label}
                    type="button"
                    onClick={() => setNewImage(img.url)}
                    className={`relative overflow-hidden rounded-xl border-2 transition ${
                      newImage === img.url
                        ? 'border-[#D97706] ring-2 ring-[#D97706]'
                        : 'border-[#E5DACE] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt={img.label} className="h-14 w-full object-cover" />
                    <span className="block p-1 text-[9px] font-bold text-center text-[#2D241E] truncate">
                      {img.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Deskripsi Produk (Opsional)</label>
              <textarea
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Komposisi bahan, varian rasa, petunjuk konsumsi..."
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>
          </div>

          {/* Supervisor Authorization for non-admin */}
          {currentUser.role !== 'admin' && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-5 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#D97706]" />
                <h4 className="text-xs font-black text-[#2D241E]">
                  Otorisasi Tambah Master Produk (Role Pengguna: {currentUser.name})
                </h4>
              </div>
              <p className="text-[11px] text-[#8C7B6C]">
                Hanya Supervisor atau Admin yang berhak menyetujui penambahan master data produk. Masukkan PIN Supervisor (8888) atau Admin (9999).
              </p>
              <input
                type="password"
                maxLength={4}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                placeholder="PIN Supervisor..."
                className="w-48 rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-sm font-bold tracking-widest text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>
          )}

          {/* Form Actions with Bottom-Right Tutup button (POS-US-049) */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t-2 border-[#E5DACE]">
            <button
              type="submit"
              disabled={isSubmittingProduct}
              className="flex items-center gap-2 rounded-xl bg-[#D97706] px-6 py-2.5 text-xs font-black text-white hover:bg-amber-700 active:scale-95 transition shadow-xs disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              <span>Simpan Master Produk</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullPageAddProduct(false)}
              className="rounded-xl border border-[#E5DACE] bg-white px-5 py-2.5 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
            >
              Tutup
            </button>
          </div>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: MAIN STOCK WORKSPACE (POS-US-050)
  // -------------------------------------------------------------
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white border-2 border-[#E5DACE] rounded-[2rem] shadow-sm">
      {/* Workspace Header with 3 Local Views & One Primary Action */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-3.5 gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-xs font-black">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#2D241E]">
              Workspace Manajemen Stok & Katalog
            </h2>
            <p className="text-xs text-[#8C7B6C] font-semibold">
              Master Produk, Kategori, dan Riwayat Penyesuaian Stok (POS-US-050)
            </p>
          </div>
        </div>

        {/* Local View Tabs (Produk default, Penyesuaian Stok, Kategori) */}
        <div className="flex items-center gap-1 rounded-xl bg-amber-100/60 p-1 border border-[#E5DACE]">
          <button
            onClick={() => setActiveView('products')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeView === 'products'
                ? 'bg-white text-[#2D241E] shadow-xs'
                : 'text-[#8C7B6C] hover:text-[#2D241E]'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Produk ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveView('adjustments')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeView === 'adjustments'
                ? 'bg-white text-[#2D241E] shadow-xs'
                : 'text-[#8C7B6C] hover:text-[#2D241E]'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Penyesuaian Stok</span>
          </button>

          <button
            onClick={() => setActiveView('categories')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeView === 'categories'
                ? 'bg-white text-[#2D241E] shadow-xs'
                : 'text-[#8C7B6C] hover:text-[#2D241E]'
            }`}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Kategori ({categories.filter((c) => c.id !== 'all').length})</span>
          </button>
        </div>

        {/* Primary Action Button based on local view (one primary action per view) */}
        <div className="flex items-center gap-2">
          {activeView === 'products' && (
            <button
              id="stock-add-product-btn"
              onClick={() => setIsFullPageAddProduct(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition"
            >
              <PackagePlus className="h-4 w-4" />
              <span>Tambah Produk</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast message if any */}
      {toastMsg && (
        <div className="bg-emerald-100 border-b border-emerald-200 px-6 py-2 text-xs font-bold text-emerald-900 flex items-center justify-between shrink-0">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')}>✕</button>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 1: PRODUK (Compact Searchable Table)
          ------------------------------------------------------------- */}
      {activeView === 'products' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Search & Stock Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5DACE] bg-white px-6 py-3 shrink-0">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#8C7B6C]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama roti, SKU, kategori, atau mitra..."
                className="w-full rounded-xl border border-[#E5DACE] bg-[#FDFBF7] pl-10 pr-4 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
            </div>

            {/* Filter buttons: Semua, Menipis, Habis, Konsinyasi */}
            <div className="flex flex-wrap gap-1.5 text-xs font-bold">
              <button
                onClick={() => setFilterCondition('all')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filterCondition === 'all'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE] hover:bg-[#FDFBF7]'
                }`}
              >
                Semua ({products.length})
              </button>
              <button
                onClick={() => setFilterCondition('low_stock')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filterCondition === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE] hover:bg-[#FDFBF7]'
                }`}
              >
                Menipis ({products.filter((p) => p.stock > 0 && p.stock < p.lowStockThreshold).length})
              </button>
              <button
                onClick={() => setFilterCondition('out_of_stock')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filterCondition === 'out_of_stock'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE] hover:bg-[#FDFBF7]'
                }`}
              >
                Habis ({products.filter((p) => p.stock <= 0).length})
              </button>
              <button
                onClick={() => setFilterCondition('consignment')}
                className={`rounded-xl px-3 py-1.5 transition ${
                  filterCondition === 'consignment'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-[#8C7B6C] border border-[#E5DACE] hover:bg-[#FDFBF7]'
                }`}
              >
                🤝 Konsinyasi ({products.filter((p) => p.ownershipType === 'consignment').length})
              </button>
            </div>
          </div>

          {/* Compact Product Table */}
          <div className="flex-1 overflow-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-8">
                <Package className="h-12 w-12 text-[#8C7B6C]/30 mb-3" />
                <p className="font-bold text-sm text-[#2D241E]">Tidak ada produk ditemukan</p>
                <p className="text-xs text-[#8C7B6C] mt-1">Coba ubah kata kunci pencarian atau filter stok.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5DACE] bg-[#FDFBF7] text-[#8C7B6C] font-black uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Foto</th>
                    <th className="py-2.5 px-3">Produk / SKU</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Kepemilikan / Mitra</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual</th>
                    <th className="py-2.5 px-3 text-center">Stok Saat Ini</th>
                    <th className="py-2.5 px-3 text-center">Kondisi Stok</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DACE]/60">
                  {filteredProducts.map((prod) => {
                    const isOut = prod.stock <= 0;
                    const isLow = prod.stock > 0 && prod.stock < prod.lowStockThreshold;
                    const isConsignment = prod.ownershipType === 'consignment';

                    return (
                      <tr key={prod.id} className="hover:bg-[#FDFBF7] transition">
                        {/* Image Thumbnail with placeholder */}
                        <td className="py-2 px-3">
                          <img
                            src={prod.image || BAKERY_SAMPLE_IMAGES[0].url}
                            alt={prod.name}
                            className="h-10 w-10 rounded-lg object-cover border border-[#E5DACE]"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = BAKERY_SAMPLE_IMAGES[0].url;
                            }}
                          />
                        </td>

                        {/* Product / SKU */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-[#2D241E] text-xs">{prod.name}</div>
                          <div className="text-[10px] text-[#8C7B6C] font-semibold">{prod.sku}</div>
                        </td>

                        {/* Category */}
                        <td className="py-2 px-3">
                          <span className="inline-block rounded-md bg-[#FDFBF7] border border-[#E5DACE] px-2 py-0.5 text-[11px] font-semibold text-[#2D241E]">
                            {prod.categoryLabel}
                          </span>
                        </td>

                        {/* Ownership / Supplier */}
                        <td className="py-2 px-3">
                          {isConsignment ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-900">
                              🤝 {prod.supplierName || 'Mitra Konsinyasi'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                              Toko Sendiri
                            </span>
                          )}
                        </td>

                        {/* Selling Price */}
                        <td className="py-2 px-3 text-right font-black text-emerald-900 text-xs">
                          {formatIDR(prod.price)}
                        </td>

                        {/* Current Stock */}
                        <td className="py-2 px-3 text-center">
                          <span className="font-black text-[#2D241E] text-sm">{prod.stock}</span>
                          <span className="text-[10px] text-[#8C7B6C] ml-1">pcs</span>
                        </td>

                        {/* Stock Condition Badge */}
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                              isOut
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOut ? 'Habis (0)' : isLow ? 'Stok Menipis' : 'Stok Aman'}
                          </span>
                        </td>

                        {/* Row-level More Actions (POS-US-050 AC-03) */}
                        <td className="py-2 px-3 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionMenuId(openActionMenuId === prod.id ? null : prod.id)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E]"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openActionMenuId === prod.id && (
                              <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border-2 border-[#E5DACE] bg-white p-1 shadow-lg animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setAdjustingProduct(prod);
                                    setAdjustQtyInput('5');
                                    setAdjustType('increase');
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold text-[#2D241E] hover:bg-amber-50 hover:text-[#D97706]"
                                >
                                  <SlidersHorizontal className="h-3.5 w-3.5" />
                                  <span>Sesuaikan Stok</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 2: PENYESUAIAN STOK (Adjustment Records)
          ------------------------------------------------------------- */}
      {activeView === 'adjustments' && (
        <div className="flex flex-1 flex-col overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
            <div>
              <h3 className="font-black text-sm text-[#2D241E]">
                Riwayat Penyesuaian Stok Manual (Audit Trail)
              </h3>
              <p className="text-xs text-[#8C7B6C]">
                Catatan mutasi stok fisik, opname, dan koreksi barang (POS-US-021)
              </p>
            </div>
            <span className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-3 py-1 text-xs font-bold text-[#8C7B6C]">
              Total Catatan: {stockAdjustments.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {stockAdjustments.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-8 text-[#8C7B6C]">
                <History className="h-12 w-12 opacity-30 mb-2" />
                <p className="font-bold text-sm">Belum ada catatan koreksi stok manual.</p>
              </div>
            ) : (
              stockAdjustments.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-3.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#2D241E] text-sm">{rec.productName}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-bold ${
                          rec.type === 'increase'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rec.type === 'increase' ? `+${rec.quantity}` : `-${rec.quantity}`} pcs
                      </span>
                    </div>

                    <div className="text-[#8C7B6C] flex items-center gap-2">
                      <span>Alasan: <strong className="text-[#2D241E]">{rec.reason}</strong></span>
                      <span>•</span>
                      <span>Operator: {rec.adminName}</span>
                      <span>•</span>
                      <span>{formatDateTime(rec.timestamp)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[#8C7B6C] block text-[10px]">Perubahan Stok:</span>
                    <span className="font-black text-[#2D241E] text-sm">
                      {rec.previousStock} → {rec.resultingStock} pcs
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          LOCAL VIEW 3: KATEGORI (Category Master)
          ------------------------------------------------------------- */}
      {activeView === 'categories' && (
        <div className="flex flex-1 flex-col overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
            <div>
              <h3 className="font-black text-sm text-[#2D241E]">Master Kategori Produk</h3>
              <p className="text-xs text-[#8C7B6C]">
                Kelola kategori roti, kue, dan kelompok produk bakery (POS-US-028)
              </p>
            </div>
            <button
              onClick={() => setIsAddCategoryOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#D97706] px-3.5 py-1.5 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Tambah Kategori</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto">
            {categories
              .filter((c) => c.id !== 'all')
              .map((cat) => {
                const count = products.filter(
                  (p) => p.category === cat.id || (cat.id === 'custom_cake' && p.isMadeToOrder)
                ).length;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDFBF7] border border-[#E5DACE] text-xl">
                        {cat.icon || '🏷️'}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[#2D241E]">{cat.name}</h4>
                        <p className="text-[11px] text-[#8C7B6C]">{cat.description || 'Kategori aktif'}</p>
                      </div>
                    </div>

                    <span className="rounded-full bg-amber-100/80 px-2.5 py-1 text-xs font-black text-amber-900">
                      {count} Produk
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          SINGLE-LAYER MODAL: PENYESUAIAN STOK FISIK (POS-US-021 & POS-US-049)
          ------------------------------------------------------------- */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmAdjust}
            className="w-full max-w-md rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] p-6 shadow-2xl space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
              <div>
                <h3 className="text-base font-black text-[#2D241E]">Penyesuaian Stok Fisik</h3>
                <p className="text-xs text-[#8C7B6C]">{adjustingProduct.name}</p>
              </div>
              <span className="rounded-xl bg-white border border-[#E5DACE] px-2.5 py-1 text-xs font-bold text-[#2D241E]">
                Stok: {adjustingProduct.stock} pcs
              </span>
            </div>

            {/* Type: Increase or Decrease */}
            <div className="grid grid-cols-2 gap-2 bg-white border border-[#E5DACE] p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setAdjustType('increase');
                  setAdjustReason('Restock Dapur Pagi');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  adjustType === 'increase'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-[#8C7B6C] hover:bg-[#FDFBF7]'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Stok (+)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustType('decrease');
                  setAdjustReason('Rusak / Basi / Defect');
                }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  adjustType === 'decrease'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-[#8C7B6C] hover:bg-[#FDFBF7]'
                }`}
              >
                <Minus className="h-4 w-4" />
                <span>Kurangi Stok (-)</span>
              </button>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Jumlah Penyesuaian (pcs)</label>
              <input
                type="number"
                min="1"
                required
                value={adjustQtyInput}
                onChange={(e) => setAdjustQtyInput(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-base font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              />
              <div className="flex gap-1.5 pt-1">
                {['1', '5', '10', '20', '50'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAdjustQtyInput(q)}
                    className="rounded-lg border border-[#E5DACE] bg-white px-2.5 py-1 text-xs font-bold text-[#8C7B6C] hover:border-[#D97706] hover:text-[#D97706]"
                  >
                    +{q}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D241E]">Alasan Penyesuaian (Wajib Diaudit)</label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
              >
                {adjustType === 'increase' ? (
                  <>
                    <option value="Restock Dapur Pagi">Restock Dapur Pagi</option>
                    <option value="Produksi Tambahan Sore">Produksi Tambahan Sore</option>
                    <option value="Pengiriman Titipan Konsinyasi Masuk">Pengiriman Titipan Konsinyasi Masuk</option>
                    <option value="Koreksi Hitung Fisik (Opname +)">Koreksi Hitung Fisik (Opname +)</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                ) : (
                  <>
                    <option value="Rusak / Basi / Defect">Rusak / Basi / Defect</option>
                    <option value="Tester / Sampling Pelanggan">Tester / Sampling Pelanggan</option>
                    <option value="Retur Barang Konsinyasi ke Supplier">Retur Barang Konsinyasi ke Supplier</option>
                    <option value="Koreksi Hitung Fisik (Opname -)">Koreksi Hitung Fisik (Opname -)</option>
                    <option value="Lainnya">Lainnya</option>
                  </>
                )}
              </select>
            </div>

            {/* Modal Actions with Bottom-Right Tutup button (POS-US-049) */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5DACE]">
              <button
                type="submit"
                disabled={adjustSubmitting}
                className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
              >
                Simpan Penyesuaian
              </button>
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SINGLE-LAYER MODAL: TAMBAH KATEGORI (POS-US-028 & POS-US-049) */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
      />
    </div>
  );
};
