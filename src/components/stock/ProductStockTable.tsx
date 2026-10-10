import React, { useState, useMemo } from 'react';
import {
  Search,
  MoreVertical,
  Eye,
  History,
  Edit3,
  Filter,
  ArrowUpDown,
  Building2,
  Calendar,
  Layers,
  Truck,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  FolderPlus,
  PackagePlus,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { Product, Category, Branch } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { ViewProductModal } from './ViewProductModal';
import { ProductStockHistoryModal } from './ProductStockHistoryModal';
import { EditProductInfoModal } from './EditProductInfoModal';
import { usePOS } from '../../context/POSContext';

interface ProductStockTableProps {
  onNavigateToCategoryClosing: (categoryId?: string) => void;
  onNavigateToTransfer: (productId?: string) => void;
  onNavigateToBadStock: (productId?: string) => void;
  onOpenAddCategory?: () => void;
  onOpenAddProduct?: () => void;
}

export const ProductStockTable: React.FC<ProductStockTableProps> = ({
  onNavigateToCategoryClosing,
  onNavigateToTransfer,
  onNavigateToBadStock,
  onOpenAddCategory,
  onOpenAddProduct,
}) => {
  const {
    products,
    categories,
    masterCategories,
    suppliers,
    selectedBranch,
    isBranchReadOnly,
    currentUser,
    updateProductInfo,
    getStockHistory,
  } = usePOS();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockCondition, setSelectedStockCondition] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');

  // Active Row Action Menu (Product ID)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Modals
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // 1. Search (Name, SKU)
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = prod.name.toLowerCase().includes(query);
        const matchesSku = prod.sku.toLowerCase().includes(query);
        const matchesCat = (prod.categoryLabel || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }

      // 2. Category
      if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
        return false;
      }

      // 3. Product Type
      if (selectedProductType === 'ready_stock' && (prod.isMadeToOrder || prod.ownershipType === 'consignment')) {
        return false;
      }
      if (selectedProductType === 'made_to_order' && !prod.isMadeToOrder) {
        return false;
      }
      if (selectedProductType === 'consignment' && prod.ownershipType !== 'consignment') {
        return false;
      }

      // 4. Stock Condition
      const isMto = Boolean(prod.isMadeToOrder);
      const isOut = !isMto && prod.stock === 0;
      const isLow = !isMto && prod.stock > 0 && prod.stock <= prod.lowStockThreshold;
      const isSafe = !isMto && prod.stock > prod.lowStockThreshold;
      const hasInTransit = (prod.inTransitStock || 0) > 0;
      const hasBadStock = (prod.badStock || 0) > 0;

      if (selectedStockCondition === 'out_of_stock' && !isOut) return false;
      if (selectedStockCondition === 'low_stock' && !isLow) return false;
      if (selectedStockCondition === 'safe' && !isSafe) return false;
      if (selectedStockCondition === 'in_transit' && !hasInTransit) return false;
      if (selectedStockCondition === 'bad_stock' && !hasBadStock) return false;

      return true;
    });
  }, [products, search, selectedCategory, selectedProductType, selectedStockCondition]);

  // Role permissions:
  // Supervisor: View Product, View Stock History only
  // Superadmin: View Product, View Stock History, and additionally Edit Product Information (Active branch only)
  const isSuperadmin = currentUser.role === 'admin';
  const canEditProductInfo = isSuperadmin && !isBranchReadOnly && selectedBranch.status === 'active';

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      {/* Top Header inside Produk (Informasi Stok) */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-black text-[#2D241E]">
            <span>Produk (Informasi Stok)</span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-[#D97706]">
              {filteredProducts.length} Produk
            </span>
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-bold text-amber-900">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {selectedBranch.name} ({selectedBranch.city})
            </span>
            {(isBranchReadOnly || selectedBranch.status === 'inactive') && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 font-bold text-rose-800">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                Mode Hanya Baca (Nonaktif)
              </span>
            )}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#8C7B6C]">
            Katalog master produk, ketersediaan stok fisik cabang, dan penyesuaian informasi barang.
          </p>
        </div>

        {/* Action Buttons: Kategori Master & Tambah Produk Baru */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenAddCategory && (
            <button
              type="button"
              id="product-stock-btn-add-category"
              onClick={onOpenAddCategory}
              className="flex h-10 items-center gap-2 rounded-lg border border-[#E5DACE] bg-white px-4 text-xs font-bold text-[#2D241E] transition hover:bg-amber-50 hover:text-[#D97706] active:scale-95"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Kategori Master</span>
            </button>
          )}

          {isSuperadmin && onOpenAddProduct && (
            <button
              type="button"
              id="product-stock-btn-add-product"
              disabled={!canEditProductInfo}
              onClick={onOpenAddProduct}
              className="flex h-10 items-center gap-2 rounded-lg bg-[#D97706] px-4 text-xs font-black text-white shadow-xs transition hover:bg-amber-700 active:scale-95 disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              <span>Tambah Produk Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
        {/* -------------------------------------------------------------
            SEARCH & FILTER TOOLBAR
            ------------------------------------------------------------- */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative min-w-0 basis-full sm:min-w-[220px] sm:flex-[2_1_240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7B6C]" />
          <input
            type="text"
            aria-label="Cari produk"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk, SKU, atau kategori..."
            className="h-10 w-full rounded-lg border border-[#E5DACE] bg-white pl-10 pr-3 text-xs font-semibold text-[#2D241E] placeholder:text-[#8C7B6C] focus:border-[#D97706] focus:outline-none"
          />
        </div>

        {/* Existing product filters, presented in a compact toolbar. */}
        <div className="flex min-w-0 basis-full flex-wrap gap-3 xl:flex-[3_1_480px]">
          {/* Category Filter */}
          <select
            aria-label="Kategori produk"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 min-w-0 flex-[1_1_150px] rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories
              .filter((c) => c.id !== 'all')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {/* Product Type Filter */}
          <select
            aria-label="Tipe produk"
            value={selectedProductType}
            onChange={(e) => setSelectedProductType(e.target.value)}
            className="h-10 min-w-0 flex-[1_1_150px] rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
          >
            <option value="all">Semua Tipe Produk</option>
            <option value="ready_stock">Ready Stock (Etalase)</option>
            <option value="made_to_order">Made-to-Order (Pesanan Khusus)</option>
            <option value="consignment">Titipan Konsinyasi</option>
          </select>

          {/* Stock Condition Filter */}
          <select
            aria-label="Kondisi stok"
            value={selectedStockCondition}
            onChange={(e) => setSelectedStockCondition(e.target.value)}
            className="h-10 min-w-0 flex-[1_1_150px] rounded-lg border border-[#E5DACE] bg-white px-3 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
          >
            <option value="all">Semua Kondisi Stok</option>
            <option value="safe">Stok Aman</option>
            <option value="low_stock">Stok Menipis</option>
            <option value="out_of_stock">Stok Habis (0)</option>
            <option value="in_transit">Ada Dalam Pengiriman</option>
            <option value="bad_stock">Ada Stok Buruk</option>
          </select>
        </div>
      </div>

      {/* -------------------------------------------------------------
          TABLE: BRANCH-SPECIFIC STOCK INFORMATION
          ------------------------------------------------------------- */}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-xl border border-[#E5DACE] bg-white">
        {filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-[#8C7B6C]">
            <Filter className="h-10 w-10 opacity-30 mb-2 text-[#8C7B6C]" />
            <p className="font-black text-sm text-[#2D241E]">Tidak ada produk yang cocok</p>
            <p className="text-xs text-[#8C7B6C] max-w-sm mt-1">
              Cobalah ubah kata kunci pencarian atau sesuaikan filter kondisi stok.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-[#E5DACE] bg-[#FDFBF7] text-[10px] font-bold uppercase tracking-wide text-[#8C7B6C]">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">Foto</th>
                <th className="py-3 px-3">Produk & SKU</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Tipe Produk</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Harga Jual</th>
                <th className="py-3 px-3 text-center">Stok Siap Jual</th>
                <th className="py-3 px-3 text-center">Dalam Pengiriman</th>
                <th className="py-3 px-3 text-center">Stok Buruk</th>
                <th className="py-3 px-3 text-center">Kondisi Stok</th>
                <th className="py-3 px-3.5 text-right w-12">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DACE]/60">
              {filteredProducts.map((prod) => {
                const isMto = Boolean(prod.isMadeToOrder);
                const isConsignment = prod.ownershipType === 'consignment';
                const inTransit = prod.inTransitStock || 0;
                const badStock = prod.badStock || 0;
                const isOut = !isMto && prod.stock === 0;
                const isLow = !isMto && prod.stock > 0 && prod.stock <= prod.lowStockThreshold;

                return (
                  <tr key={prod.id} className="hover:bg-[#FDFBF7]/80 transition">
                    {/* Image */}
                    <td className="py-2.5 px-3.5 text-center">
                      <img
                        src={prod.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80'}
                        alt={prod.name}
                        className="mx-auto h-11 w-11 rounded-lg border border-[#E5DACE] object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                    </td>

                    {/* Product & SKU */}
                    <td className="py-2.5 px-3">
                      <div className="min-w-[160px] max-w-[260px] text-xs font-black leading-relaxed text-[#2D241E]">{prod.name}</div>
                      <div className="mt-1 text-[10px] font-semibold text-[#8C7B6C]">{prod.sku}</div>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3">
                      <span className="inline-block rounded-md bg-[#F5EFEB] border border-[#E5DACE] px-2 py-0.5 text-[11px] font-bold text-[#6D5D50]">
                        {prod.categoryLabel}
                      </span>
                    </td>

                    {/* Product Type / Ownership */}
                    <td className="py-2.5 px-3">
                      {isMto ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-black text-blue-800">
                          🎂 Made-to-Order
                        </span>
                      ) : isConsignment ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-900">
                          🤝 Konsinyasi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          Ready Stock
                        </span>
                      )}
                    </td>

                    {/* Selling Price */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${
                        prod.status === 'inactive'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {prod.status === 'inactive' ? 'Inactive' : 'Active'}
                      </span>
                    </td>

                    {/* Selling Price */}
                    <td className="py-2.5 px-3 text-right font-black text-[#2D241E] text-xs">
                      {formatIDR(prod.price)}
                    </td>

                    {/* Sellable Stock (Stok Siap Jual) */}
                    <td className="py-2.5 px-3 text-center">
                      {isMto ? (
                        <span className="text-[11px] font-semibold text-blue-700 italic">
                          — (Kustom)
                        </span>
                      ) : (
                        <div>
                          <span className={`text-base font-black tabular-nums ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-[#2D241E]'}`}>
                            {prod.stock}
                          </span>
                          <span className="text-[10px] text-[#8C7B6C] ml-1">pcs</span>
                        </div>
                      )}
                    </td>

                    {/* In Transit Stock */}
                    <td className="py-2.5 px-3 text-center">
                      {isMto ? (
                        <span className="text-gray-400">—</span>
                      ) : inTransit > 0 ? (
                        <span className="inline-flex items-center gap-1 font-black text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-lg text-xs">
                          <Truck className="h-3 w-3" />
                          {inTransit} pcs
                        </span>
                      ) : (
                        <span className="text-xs font-semibold tabular-nums text-[#8C7B6C]">0</span>
                      )}
                    </td>

                    {/* Bad Stock */}
                    <td className="py-2.5 px-3 text-center">
                      {isMto ? (
                        <span className="text-gray-400">—</span>
                      ) : badStock > 0 ? (
                        <span className="inline-flex items-center gap-1 font-black text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg text-xs">
                          <AlertTriangle className="h-3 w-3" />
                          {badStock} pcs
                        </span>
                      ) : (
                        <span className="text-xs font-semibold tabular-nums text-[#8C7B6C]">0</span>
                      )}
                    </td>

                    {/* Stock Condition */}
                    <td className="py-2.5 px-3 text-center">
                      {isMto ? (
                        <span className="inline-block whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-800">
                          Sesuai Pesanan
                        </span>
                      ) : isOut ? (
                        <span className="inline-block whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-800">
                          Habis (0)
                        </span>
                      ) : isLow ? (
                        <span className="inline-block whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900">
                          Menipis (≤{prod.lowStockThreshold})
                        </span>
                      ) : (
                        <span className="inline-block whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                          Aman
                        </span>
                      )}
                    </td>

                    {/* Action Three-dot Menu */}
                    <td className="py-2.5 px-3.5 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setOpenActionMenuId(openActionMenuId === prod.id ? null : prod.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-[#FDFBF7] hover:text-[#2D241E] shadow-2xs"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openActionMenuId === prod.id && (
                          <div className="absolute right-0 z-30 mt-1 w-52 rounded-2xl border-2 border-[#E5DACE] bg-white p-1.5 shadow-xl animate-fadeIn">
                            {/* 1. View Product (Supervisor & Superadmin) */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setViewingProduct(prod);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#2D241E] hover:bg-amber-50 hover:text-[#D97706] transition"
                            >
                              <Eye className="h-3.5 w-3.5 text-[#D97706]" />
                              <span>Lihat Detail Produk</span>
                            </button>

                            {/* 2. View Stock History (Supervisor & Superadmin) */}
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setHistoryProduct(prod);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#2D241E] hover:bg-amber-50 hover:text-[#D97706] transition"
                            >
                              <History className="h-3.5 w-3.5 text-blue-600" />
                              <span>Lihat Riwayat Stok</span>
                            </button>

                            {/* 3. Edit Product Information (Superadmin only on Active Branch) */}
                            {canEditProductInfo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setEditingProduct(prod);
                                }}
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#2D241E] hover:bg-purple-50 hover:text-purple-800 transition border-t border-[#E5DACE]/60 mt-1 pt-2"
                              >
                                <Edit3 className="h-3.5 w-3.5 text-purple-700" />
                                <span>Edit Informasi Produk</span>
                              </button>
                            )}
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

      {/* -------------------------------------------------------------
          MODALS
          ------------------------------------------------------------- */}
      {/* 1. View Product Modal */}
      {viewingProduct && (
        <ViewProductModal
          product={viewingProduct}
          branchName={selectedBranch.name}
          isBranchReadOnly={isBranchReadOnly || selectedBranch.status === 'inactive'}
          onClose={() => setViewingProduct(null)}
          onNavigateToCategoryClosing={onNavigateToCategoryClosing}
          onNavigateToTransfer={onNavigateToTransfer}
          onNavigateToBadStock={onNavigateToBadStock}
        />
      )}

      {/* 2. Product Stock History Modal */}
      {historyProduct && (
        <ProductStockHistoryModal
          product={historyProduct}
          branchName={selectedBranch.name}
          historyItems={getStockHistory(historyProduct.id, selectedBranch.id)}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {/* 3. Edit Product Information Modal (Superadmin on active branch only) */}
      {editingProduct && (
        <EditProductInfoModal
          product={editingProduct}
          categories={categories}
          masterCategories={masterCategories}
          suppliers={suppliers}
          branchName={selectedBranch.name}
          isBranchReadOnly={isBranchReadOnly || selectedBranch.status === 'inactive'}
          onSave={updateProductInfo}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
};
