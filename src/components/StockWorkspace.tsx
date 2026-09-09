import React, { useState } from 'react';
import {
  Package,
  FolderPlus,
  PackagePlus,
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
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { ProductOwnershipType, CommissionMethod, CommissionBasis } from '../types';
import { AddCategoryModal } from './AddCategoryModal';
import { GoodsReceivingWorkspace } from './GoodsReceivingWorkspace';
import { ProductStockTable } from './stock/ProductStockTable';
import { CategoryClosingView } from './stock/CategoryClosingView';
import { StockTransferView } from './stock/StockTransferView';
import { BadStockView } from './stock/BadStockView';
import { StockHistoryView } from './stock/StockHistoryView';

export type StockLocalView =
  | 'products'
  | 'categories'
  | 'transfers'
  | 'bad_stock'
  | 'receiving'
  | 'history';

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
    addProduct,
    selectedBranch,
    isBranchReadOnly,
    currentUser,
    verifySupervisorPin,
  } = usePOS();

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

  // Authorization for Supervisors
  const [supervisorPin, setSupervisorPin] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

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

  // SKU suggestion for product creation
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
      setNewName('');
      setNewSku('');
      setNewDescription('');
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

            {/* Section 1: Basic Information */}
            <div className="rounded-3xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-6 space-y-4">
              <h3 className="text-sm font-black text-[#2D241E] flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#D97706]" />
                <span>1. Identitas & Kategori Produk</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Nama Produk *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Roti Cokelat Keju Spesial"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#2D241E]">Kode SKU / Barcode *</label>
                    <button
                      type="button"
                      onClick={handleSuggestSku}
                      className="text-[11px] font-bold text-[#D97706] hover:underline"
                    >
                      + Buat Otomatis
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="Contoh: ROT-001"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Kategori *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  >
                    {categories
                      .filter((c) => c.id !== 'all')
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    <option value="mto">🎂 Made-to-Order (Pesanan Custom / Tart)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Harga Jual Standar (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Stok Awal di Cabang Ini</label>
                  <input
                    type="number"
                    min="0"
                    value={newOpeningStock}
                    onChange={(e) => setNewOpeningStock(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Batas Peringatan Stok Menipis</label>
                  <input
                    type="number"
                    min="0"
                    value={newLowStockThreshold}
                    onChange={(e) => setNewLowStockThreshold(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Tambah Kategori */}
          <button
            type="button"
            onClick={() => setIsAddCategoryOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#6D5D50] hover:bg-amber-50 hover:text-[#D97706] shadow-xs active:scale-95 transition"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Kategori Master</span>
          </button>

          {/* Tambah Master Produk (Superadmin only) */}
          {isSuperadmin && (
            <button
              type="button"
              disabled={isInactive}
              onClick={() => setIsFullPageAddProduct(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              <span>Tambah Produk Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          TAB NAVIGATION BAR
          ------------------------------------------------------------- */}
      <div className="flex items-center gap-1 border-b-2 border-[#E5DACE] bg-white px-6 overflow-x-auto">
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
          <ClipboardCheck className="h-4 w-4" />
          <span>Kategori (Closing Harian)</span>
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
      </div>

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
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
      />
    </div>
  );
};
