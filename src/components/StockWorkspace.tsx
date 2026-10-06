import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Building2,
  History,
  Tag,
  ArrowLeft,
  ShieldCheck,
  Percent,
  Coins,
  Sparkles,
  Layers,
  Truck,
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Wheat,
  Clock,
  Zap,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { ProductOwnershipType, CommissionMethod, CommissionBasis, MasterCategory, ProductExpiryType, ProductStatus } from '../types';
import { AddCategoryModal } from './AddCategoryModal';
import { GoodsReceivingWorkspace } from './GoodsReceivingWorkspace';
import { ProductStockTable } from './stock/ProductStockTable';
import { CategoryClosingView } from './stock/CategoryClosingView';
import { StockTransferView } from './stock/StockTransferView';
import { BadStockView } from './stock/BadStockView';
import { StockHistoryView } from './stock/StockHistoryView';
import { RawMaterialWorkspace } from './stock/RawMaterialWorkspace';

export type StockLocalView =
  | 'products'
  | 'categories'
  | 'transfers'
  | 'bad_stock'
  | 'receiving'
  | 'history'
  | 'raw_materials';

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
    masterCategories,
    addProduct,
    selectedBranch,
    isBranchReadOnly,
    currentUser,
    verifySupervisorPin,
  } = usePOS();

  // Master Categories for Add Product Form (Step 1)
  const availableMasterCategories: MasterCategory[] = useMemo(() => {
    return masterCategories && masterCategories.length > 0
      ? masterCategories
      : [
          {
            id: 'KAT-001',
            name: 'Roti Manis & Roti Tawar',
            categoryType: 'PRODUKSI' as const,
            createdAt: '2026-01-15T08:00:00Z',
          },
          {
            id: 'KAT-002',
            name: 'Kue Basah Tradisional',
            categoryType: 'KONSINYASI' as const,
            createdAt: '2026-02-01T09:30:00Z',
          },
          {
            id: 'KAT-003',
            name: 'Minuman Kemasan & Botol',
            categoryType: 'BELI (RESELLER)' as const,
            createdAt: '2026-02-10T11:15:00Z',
          },
        ];
  }, [masterCategories]);

  const [selectedMasterCategoryId, setSelectedMasterCategoryId] = useState<string>('');

  useEffect(() => {
    if (!selectedMasterCategoryId && availableMasterCategories.length > 0) {
      setSelectedMasterCategoryId(availableMasterCategories[0].id);
    }
  }, [availableMasterCategories, selectedMasterCategoryId]);

  const selectedMasterCat = useMemo(() => {
    return (
      availableMasterCategories.find((c) => c.id === selectedMasterCategoryId) ||
      availableMasterCategories[0]
    );
  }, [availableMasterCategories, selectedMasterCategoryId]);

  // Dynamic Mitra Suppliers based on selected Master Kategori (Step 2)
  const filteredSuppliers = useMemo(() => {
    if (!selectedMasterCat) return [];
    const linked = suppliers.filter((supplier) => supplier.masterCategoryId === selectedMasterCat.id);
    return selectedMasterCat.categoryType === 'PRODUKSI'
      ? linked.filter((supplier) => supplier.isInternal)
      : linked.filter((supplier) => !supplier.isInternal);
  }, [selectedMasterCat, suppliers]);

  const handleMasterCategoryChange = (catId: string) => {
    setSelectedMasterCategoryId(catId);
    setNewSupplierId('');
  };

  // Local View Tab: 'products' (default), 'categories', 'transfers', 'bad_stock', 'receiving', 'history'
  const [activeView, setActiveView] = useState<StockLocalView>('products');

  // Navigation payload states
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | undefined>(undefined);
  const [preselectedProductId, setPreselectedProductId] = useState<string | undefined>(undefined);

  // Full-page Add Product mode (POS-US-050 AC-05)
  const [isFullPageAddProduct, setIsFullPageAddProduct] = useState(false);

  // Modal for Add Category
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Full-page Product Creation Form State (for Master Catalog)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(categories.find((c) => c.id !== 'all')?.id || 'roti');
  const [newPrice, setNewPrice] = useState<string>('15000');
  const [isPriceCustomizable, setIsPriceCustomizable] = useState(false);
  const [newOpeningStock, setNewOpeningStock] = useState<string>('20');
  const [newLowStockThreshold, setNewLowStockThreshold] = useState<string>('5');
  const [newImage, setNewImage] = useState(BAKERY_SAMPLE_IMAGES[0].url);
  const [newDescription, setNewDescription] = useState('');
  const [newProductStatus, setNewProductStatus] = useState<ProductStatus>('active');

  // Ownership & Consignment
  const [newOwnershipType, setNewOwnershipType] = useState<ProductOwnershipType>('own');
  const [newSupplierId, setNewSupplierId] = useState<string>(suppliers[0]?.id || '');

  useEffect(() => {
    if (!newSupplierId || !filteredSuppliers.some((supplier) => supplier.id === newSupplierId)) {
      setNewSupplierId(filteredSuppliers[0]?.id || '');
    }
  }, [filteredSuppliers, newSupplierId]);
  const [newCommissionMethod, setNewCommissionMethod] = useState<CommissionMethod>('percentage');
  const [newCommissionValue, setNewCommissionValue] = useState<string>('15');
  const [newCommissionBasis, setNewCommissionBasis] = useState<CommissionBasis>('net');

  // Authorization for Supervisors
  const [supervisorPin, setSupervisorPin] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Requirement 1: Tipe Kedaluwarsa Produk (Expired Harian vs Expired > 1 Hari)
  const [newExpiryType, setNewExpiryType] = useState<ProductExpiryType>('daily');
  const [newShelfLifeDays, setNewShelfLifeDays] = useState<string>('3');

  const isInactive = isBranchReadOnly || selectedBranch.status === 'inactive';
  const isSuperadmin = currentUser.role === 'admin';

  // Navigation handlers from ProductStockTable
  const handleNavigateToCategoryClosing = (categoryId?: string) => {
    setPreselectedCategoryId(categoryId);
    setActiveView('categories');
  };

  const handleNavigateToTransfer = (productId?: string) => {
    setPreselectedProductId(productId);
    setActiveView('transfers');
  };

  const handleNavigateToBadStock = (productId?: string) => {
    setPreselectedProductId(productId);
    setActiveView('bad_stock');
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
    const numPrice = parseInt(newPrice || '0', 10);
    const numStock = 0;
    const numLowStock = 5;

    if (!trimmedName) {
      setFormError('Nama produk wajib diisi!');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Harga jual wajib diisi dan tidak boleh bernilai negatif!');
      return;
    }

    const isMadeToOrderCat = newCategory === 'mto' || newCategory === 'custom_cake';
    const catItem = categories.find((c) => c.id === newCategory);
    const catLabel = isMadeToOrderCat
      ? 'Made-to-Order'
      : catItem
      ? catItem.name
      : 'Roti & Bakery';

    const selectedSup = filteredSuppliers.find((supplier) => supplier.id === newSupplierId);
    if (!selectedMasterCat || !selectedSup) {
      setFormError('Pilih Master Kategori dan Supplier yang sesuai terlebih dahulu.');
      return;
    }
    const isConsignment = selectedMasterCat.categoryType === 'KONSINYASI';

    setIsSubmittingProduct(true);
    const res = addProduct({
      name: trimmedName,
      masterCategoryId: selectedMasterCat.id,
      category: isMadeToOrderCat ? 'custom_cake' : newCategory,
      categoryLabel: catLabel,
      price: numPrice,
      isPriceCustomizable,
      stock: numStock,
      lowStockThreshold: numLowStock,
      isMadeToOrder: isMadeToOrderCat,
      image: newImage || BAKERY_SAMPLE_IMAGES[0].url,
      description: newDescription.trim() || undefined,
      ownershipType: isConsignment ? 'consignment' : 'own',
      supplierId: selectedSup.id,
      supplierName: selectedSup.name,
      status: newProductStatus,
      expiryType: newExpiryType,
      shelfLifeDays: newExpiryType === 'daily' ? 1 : Math.max(1, parseInt(newShelfLifeDays, 10) || 3),
    });
    setIsSubmittingProduct(false);

    if (!res.success) {
      setFormError(res.message);
      return;
    }

    setFormSuccess(res.message);
    setTimeout(() => {
      setNewName('');
      setNewPrice('');
      setNewDescription('');
      setNewProductStatus('active');
      setSupervisorPin('');
      setFormSuccess('');
      setIsFullPageAddProduct(false);
      setActiveView('products');
    }, 700);
  };

  // -------------------------------------------------------------
  // FULL PAGE: TAMBAH MASTER PRODUK BARU
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
                Formulir Master Produk Baru ({selectedBranch.name})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullPageAddProduct(false)}
              className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#FDFBF7]"
            >
              Batal
            </button>
            <button
              type="submit"
              form="full-page-add-product-form"
              disabled={isSubmittingProduct}
              className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              {isSubmittingProduct ? 'Menyimpan...' : 'Simpan Master Produk'}
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <form
            id="full-page-add-product-form"
            onSubmit={handleSaveProduct}
            className="max-w-4xl mx-auto space-y-6"
          >
            {formError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 animate-shake">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
                {formSuccess}
              </div>
            )}

            {/* Form Fields: Reordered 1 to 6 */}
            <div className="rounded-3xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
                <h3 className="text-sm font-black text-[#2D241E] flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#D97706]" />
                  <span>Identitas & Informasi Master Produk</span>
                </h3>
                <span className="text-[11px] font-bold text-[#8C7B6C]">
                  Lengkapi 6 informasi master produk berikut
                </span>
              </div>

              {/* Row 1: Add Master Kategori & Add Mitra Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Add Master Kategori */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="product-master-category-select" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                      Master Kategori <span className="text-rose-500">*</span>
                    </label>
                    {selectedMasterCat && (
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-black border ${
                        selectedMasterCat.categoryType === 'PRODUKSI'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : selectedMasterCat.categoryType === 'KONSINYASI'
                          ? 'bg-amber-50 text-[#D97706] border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {selectedMasterCat.categoryType}
                      </span>
                    )}
                  </div>
                  <select
                    id="product-master-category-select"
                    value={selectedMasterCategoryId}
                    onChange={(e) => handleMasterCategoryChange(e.target.value)}
                    className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none shadow-xs"
                  >
                    {availableMasterCategories.map((mc) => (
                      <option key={mc.id} value={mc.id}>
                        [{mc.categoryType}] {mc.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#8C7B6C]">
                    Klasifikasi master kategori pusat untuk peruntukan rantai pasok dan mitra supplier.
                  </p>
                </div>

                {/* Add Mitra Supplier (Selection appears based on Master Kategori) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="product-supplier-select" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                      Mitra Supplier <span className="text-rose-500">*</span>
                    </label>
                    {selectedMasterCat && (
                      <span className="text-[10px] font-bold text-[#D97706]">
                        Kategori: {selectedMasterCat.name}
                      </span>
                    )}
                  </div>
                  <select
                    id="product-supplier-select"
                    value={newSupplierId}
                    onChange={(e) => setNewSupplierId(e.target.value)}
                    className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none shadow-xs"
                  >
                    {filteredSuppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        🏷️ {sup.name} ({sup.category || selectedMasterCat?.name})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#8C7B6C]">
                    {filteredSuppliers.length > 0
                      ? `✓ Menampilkan ${filteredSuppliers.length} mitra supplier terdaftar pada "${selectedMasterCat?.name}"`
                      : selectedMasterCat?.categoryType === 'PRODUKSI'
                      ? '✓ Kategori produksi in-house dapur utama internal'
                      : 'ℹ️ Belum ada mitra khusus kategori ini (tersedia opsi mitra umum & produksi sendiri)'}
                  </p>
                </div>
              </div>

              {/* Row 2: Nama Produk & Produk Kategori */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nama Produk */}
                <div className="space-y-1.5">
                  <label htmlFor="product-name-input" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                    Nama Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="product-name-input"
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Roti Manis Cokelat Keju"
                    className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none shadow-xs"
                  />
                </div>

                {/* Produk Kategori */}
                <div className="space-y-1.5">
                  <label htmlFor="product-pos-category-select" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                    Produk Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="product-pos-category-select"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none shadow-xs"
                  >
                    {categories
                      .filter((c) => c.id !== 'all')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                        </option>
                      ))}
                    <option value="mto">🎂 Made-to-Order (Pesanan Custom / Tart)</option>
                  </select>
                  <p className="text-[10px] text-[#8C7B6C]">
                    Kategori tampilan display kasir POS (Roti Manis, Pastry, Minuman, dll).
                  </p>
                </div>
              </div>

              {/* Row 3: Kode SKU & Harga Jual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kode SKU */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="product-sku-preview" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                      Kode SKU
                    </label>
                    <span className="text-[10px] font-bold text-[#8C7B6C]">Dibuat otomatis</span>
                  </div>
                  <div id="product-sku-preview" className="rounded-2xl border-2 border-dashed border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-semibold text-[#8C7B6C]">
                    SKU akan mengikuti Supplier yang dipilih dan dibuat saat produk disimpan.
                  </div>
                </div>

                {/* Harga Jual */}
                <div className="space-y-1.5">
                  <label htmlFor="product-price-input" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#8C7B6C]">Rp</span>
                    <input
                      id="product-price-input"
                      type="number"
                      min="0"
                      step="500"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="15000"
                      className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white pl-10 pr-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none shadow-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="product-status-select" className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
                  Status Produk
                </label>
                <select
                  id="product-status-select"
                  value={newProductStatus}
                  onChange={(e) => setNewProductStatus(e.target.value as ProductStatus)}
                  className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none shadow-xs"
                >
                  <option value="active">Active — dapat dijual</option>
                  <option value="inactive">Inactive — simpan sebagai nonaktif</option>
                </select>
              </div>

              {/* Row 4: Tipe Masa Kedaluwarsa Produk (Requirement 1) */}
              <div className="space-y-2.5 pt-3 border-t border-[#E5DACE]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#D97706]" />
                    <span>Tipe Masa Kedaluwarsa Produk (Expiry Type)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#8C7B6C]">
                    Pilih salah satu dari 2 tipe kedaluwarsa
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Option A: Expired Secara Harian */}
                  <div
                    onClick={() => setNewExpiryType('daily')}
                    className={`relative cursor-pointer rounded-2xl border-2 p-3.5 transition-all flex flex-col justify-between ${
                      newExpiryType === 'daily'
                        ? 'border-[#D97706] bg-amber-50/70 shadow-xs'
                        : 'border-[#E5DACE] bg-white hover:border-[#D97706]/40 hover:bg-[#FDFBF7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="expiry-type-daily"
                          name="product-expiry-type"
                          value="daily"
                          checked={newExpiryType === 'daily'}
                          onChange={() => setNewExpiryType('daily')}
                          className="h-4 w-4 text-[#D97706] focus:ring-[#D97706] cursor-pointer"
                        />
                        <label
                          htmlFor="expiry-type-daily"
                          className="text-xs font-black text-[#2D241E] cursor-pointer flex items-center gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5 text-[#D97706]" />
                          <span>Expired Secara Harian</span>
                        </label>
                      </div>
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300 shrink-0">
                        1 Hari (Fresh)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8C7B6C] mt-2 leading-relaxed">
                      Produk berumur simpan harian (roti fresh, kue basah). Sisa stok yang tidak terjual{' '}
                      <strong className="text-[#2D241E]">dapat dimusnahkan secara otomatis</strong> pada menu closing harian bila expirynya jatuh tempo hari itu.
                    </p>
                  </div>

                  {/* Option B: Expired di Atas dari Satu Hari */}
                  <div
                    onClick={() => setNewExpiryType('multi_day')}
                    className={`relative cursor-pointer rounded-2xl border-2 p-3.5 transition-all flex flex-col justify-between ${
                      newExpiryType === 'multi_day'
                        ? 'border-[#D97706] bg-blue-50/70 shadow-xs'
                        : 'border-[#E5DACE] bg-white hover:border-[#D97706]/40 hover:bg-[#FDFBF7]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="expiry-type-multi"
                          name="product-expiry-type"
                          value="multi_day"
                          checked={newExpiryType === 'multi_day'}
                          onChange={() => setNewExpiryType('multi_day')}
                          className="h-4 w-4 text-[#D97706] focus:ring-[#D97706] cursor-pointer"
                        />
                        <label
                          htmlFor="expiry-type-multi"
                          className="text-xs font-black text-[#2D241E] cursor-pointer flex items-center gap-1.5"
                        >
                          <Clock className="h-3.5 w-3.5 text-blue-600" />
                          <span>Expired di Atas dari Satu Hari</span>
                        </label>
                      </div>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-900 border border-blue-300 shrink-0">
                        &gt; 1 Hari (Awet)
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8C7B6C] mt-2 leading-relaxed">
                      Produk berdaya tahan lebih dari sehari (kue kering, pastry kemasan, sirup). Tanggal expiry date{' '}
                      <strong className="text-[#2D241E]">dapat disesuaikan</strong> di menu pesanan &amp; penerimaan barang dan dipantau di closing harian.
                    </p>
                  </div>
                </div>

                {/* Sub-setting when multi_day is active: Shelf Life in Days */}
                {newExpiryType === 'multi_day' && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-2 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-blue-950 block">
                          Estimasi Masa Simpan Bawaan (Shelf Life / Hari):
                        </label>
                        <p className="text-[10px] text-[#8C7B6C]">
                          Akan digunakan sebagai tanggal kadaluwarsa acuan saat penerimaan atau pesanan baru.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {['3', '7', '14', '30'].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setNewShelfLifeDays(days)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer border ${
                              newShelfLifeDays === days
                                ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                                : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            {days} Hari
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="2"
                        max="365"
                        value={newShelfLifeDays}
                        onChange={(e) => setNewShelfLifeDays(e.target.value)}
                        placeholder="Contoh: 7"
                        className="w-24 rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-xs font-bold text-blue-900">Hari masa simpan setelah tanggal produksi / penerimaan</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom-Right Tutup button inside full page */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5DACE]">
              <button
                type="submit"
                disabled={isSubmittingProduct}
                className="rounded-xl bg-[#D97706] px-6 py-2.5 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
              >
                {isSubmittingProduct ? 'Menyimpan...' : 'Simpan Master Produk'}
              </button>
              <button
                type="button"
                onClick={() => setIsFullPageAddProduct(false)}
                className="rounded-xl border border-[#E5DACE] bg-white px-6 py-2.5 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
              >
                Tutup
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white border-2 border-[#E5DACE] rounded-[2rem] shadow-sm">
      {/* -------------------------------------------------------------
          WORKSPACE HEADER
          ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-[#E5DACE] bg-[#FDFBF7] px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[#2D241E]">
              Manajemen Stok & Inventaris Produk
            </h2>
            <span className="rounded-lg bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {selectedBranch.name} ({selectedBranch.city})
            </span>

            {isInactive && (
              <span className="rounded-lg bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 text-[11px] font-black flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Mode Hanya Baca (Nonaktif)
              </span>
            )}
          </div>
          <p className="text-xs text-[#8C7B6C] mt-0.5">
            Informasi ketersediaan stok cabang, hitung fisik harian, transfer antar-cabang, dan disposisi kedaluwarsa.
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------------
          TAB NAVIGATION BAR
          ------------------------------------------------------------- */}
      <nav className="flex items-center gap-1 border-b-2 border-[#E5DACE] bg-white px-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveView('products')}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition whitespace-nowrap ${
            activeView === 'products'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Produk (Informasi Stok)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPreselectedCategoryId(undefined);
            setActiveView('categories');
          }}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition whitespace-nowrap ${
            activeView === 'categories'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Rekonsiliasi Kadaluwarsa (Closing)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPreselectedProductId(undefined);
            setActiveView('transfers');
          }}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition whitespace-nowrap ${
            activeView === 'transfers'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Transfer Stok</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPreselectedProductId(undefined);
            setActiveView('bad_stock');
          }}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition whitespace-nowrap ${
            activeView === 'bad_stock'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Stok Buruk / Kedaluwarsa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('receiving')}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition whitespace-nowrap ${
            activeView === 'receiving'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Penerimaan Barang</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition whitespace-nowrap ${
            activeView === 'history'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Riwayat Stok</span>
        </button>

        <button
          type="button"
          id="stock-tab-raw-material"
          onClick={() => setActiveView('raw_materials')}
          className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-black transition whitespace-nowrap ${
            activeView === 'raw_materials'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#8C7B6C] hover:text-[#2D241E]'
          }`}
        >
          <Wheat className="h-4 w-4" />
          <span>Raw Material (Bahan Baku)</span>
        </button>
      </nav>

      {/* -------------------------------------------------------------
          ACTIVE VIEW CONTENT
          ------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* VIEW 1: PRODUK (Stock Information Page) */}
        {activeView === 'products' && (
          <ProductStockTable
            onNavigateToCategoryClosing={handleNavigateToCategoryClosing}
            onNavigateToTransfer={handleNavigateToTransfer}
            onNavigateToBadStock={handleNavigateToBadStock}
            onOpenAddCategory={() => setIsAddCategoryOpen(true)}
            onOpenAddProduct={() => setIsFullPageAddProduct(true)}
          />
        )}

        {/* VIEW 2: KATEGORI (Daily Closing Counting Sheet) */}
        {activeView === 'categories' && (
          <CategoryClosingView
            initialCategoryId={preselectedCategoryId}
            onBackToProducts={() => setActiveView('products')}
          />
        )}

        {/* VIEW 3: TRANSFER STOK (Branch-to-branch movements) */}
        {activeView === 'transfers' && (
          <StockTransferView
            initialProductId={preselectedProductId}
            onBackToProducts={() => setActiveView('products')}
          />
        )}

        {/* VIEW 4: STOK BURUK / KEDALUWARSA */}
        {activeView === 'bad_stock' && (
          <BadStockView
            initialProductId={preselectedProductId}
            onBackToProducts={() => setActiveView('products')}
          />
        )}

        {/* VIEW 5: PENERIMAAN BARANG (Goods Receiving) */}
        {activeView === 'receiving' && <GoodsReceivingWorkspace />}

        {/* VIEW 6: RIWAYAT STOK (Unified Branch Stock History) */}
        {activeView === 'history' && (
          <StockHistoryView onBackToProducts={() => setActiveView('products')} />
        )}

        {/* VIEW 7: RAW MATERIAL (Bahan Baku Produksi) */}
        {activeView === 'raw_materials' && (
          <RawMaterialWorkspace onNavigateToReceiving={() => setActiveView('receiving')} />
        )}
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
      />
    </div>
  );
};
