import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  AlertTriangle,
  LayoutGrid,
  List,
  Plus,
  Package,
  History,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product } from '../types';
import { formatIDR } from '../utils/formatters';

interface ProductCatalogProps {
  onOpenAddProduct?: () => void;
  onOpenAddCategory?: () => void;
  onOpenHistory?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  onOpenAddProduct,
  onOpenAddCategory,
  onOpenHistory,
}) => {
  const { products, categories: contextCategories, addToCart, cart } = usePOS();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterShortcut, setFilterShortcut] = useState<'all' | 'popular' | 'low_stock' | 'consignment'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stockWarningToast, setStockWarningToast] = useState<string | null>(null);

  // Dynamic category tabs merged with 'all' and 'Made-to-Order' (POS-US-037)
  const categoryList = [
    { id: 'all', name: 'Semua Menu', icon: '🍞' },
    ...contextCategories
      .filter((c) => c.id !== 'all' && c.id !== 'custom_cake')
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon || '🥐',
      })),
    // Made-to-Order category
    { id: 'mto', name: 'Made-to-Order', icon: '🎂' },
  ];

  // Filter logic
  const filteredProducts = products.filter((prod) => {
    // Category match
    if (selectedCategory === 'mto') {
      if (!prod.isMadeToOrder && prod.category !== 'custom_cake') return false;
    } else if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
      return false;
    }

    // Shortcut filters
    if (filterShortcut === 'popular' && !prod.popular) {
      return false;
    }
    if (filterShortcut === 'low_stock' && (prod.stock >= prod.lowStockThreshold || prod.stock <= 0)) {
      return false;
    }
    if (filterShortcut === 'consignment' && prod.ownershipType !== 'consignment') {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchSku = prod.sku.toLowerCase().includes(q);
      const matchCat = prod.categoryLabel.toLowerCase().includes(q);
      const matchSupplier = prod.supplierName && prod.supplierName.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCat && !matchSupplier) return false;
    }
    return true;
  });

  const handleProductClick = (product: Product) => {
    const res = addToCart(product, 1);
    if (res.warning) {
      setStockWarningToast(res.warning);
      setTimeout(() => setStockWarningToast(null), 3500);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* 1. Product Search Bar (POS-US-037) */}
      <div className="pb-2.5">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#6B7280]" />
          <input
            id="catalog-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama roti, cake, pastry, SKU, atau mitra..."
            className="w-full rounded-xl border border-[#E5E7EB] bg-white pl-10 pr-8 py-2.5 text-sm text-[#1F2937] placeholder-[#6B7280] focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706] shadow-xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-xs text-[#6B7280] hover:text-[#1F2937]"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2. Horizontally scrollable category navigation */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categoryList.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                  isSelected
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'bg-white border border-[#E5E7EB] text-[#1F2937] hover:border-[#D97706] hover:bg-[#F7F7F5]'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Filter shortcuts and view mode */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterShortcut('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterShortcut === 'all'
                  ? 'bg-[#1F2937] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterShortcut(filterShortcut === 'popular' ? 'all' : 'popular')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterShortcut === 'popular'
                  ? 'bg-[#D97706] text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Populer</span>
            </button>
            <button
              onClick={() => setFilterShortcut(filterShortcut === 'low_stock' ? 'all' : 'low_stock')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterShortcut === 'low_stock'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              <span>Stok Menipis</span>
            </button>
            <button
              onClick={() => setFilterShortcut(filterShortcut === 'consignment' ? 'all' : 'consignment')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterShortcut === 'consignment'
                  ? 'bg-purple-700 text-white'
                  : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              Konsinyasi
            </button>
          </div>

          {/* Right Toolbar Controls: History Sub-View Toggle & View Mode Switch */}
          <div className="flex items-center gap-2">
            {onOpenHistory && (
              <button
                id="cashier-history-toggle-btn"
                type="button"
                onClick={onOpenHistory}
                className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-bold text-[#1F2937] hover:border-[#D97706] hover:bg-amber-50/60 active:scale-95 transition shadow-2xs"
                title="Lihat Riwayat Transaksi & Nota Kasir"
              >
                <History className="h-3.5 w-3.5 text-[#D97706]" />
                <span>Riwayat Transaksi</span>
              </button>
            )}

            {/* View Mode Switch (Grid / List) */}
            <div className="flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'grid' ? 'bg-[#D97706] text-white' : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
                title="Tampilan Grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'list' ? 'bg-[#D97706] text-white' : 'text-[#6B7280] hover:text-[#1F2937]'
                }`}
                title="Tampilan List"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock warning notification */}
      {stockWarningToast && (
        <div className="mb-2 rounded-xl bg-amber-50 border border-[#D97706] p-2.5 text-xs font-medium text-amber-900 shadow-xs flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
          <span>{stockWarningToast}</span>
        </div>
      )}

      {/* 4. Product Results Display */}
      <div className="flex-1 overflow-y-auto pr-0.5">
        {filteredProducts.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-center rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-6">
            <Package className="h-10 w-10 text-[#6B7280]/60 mb-2" />
            <p className="text-sm font-semibold text-[#1F2937]">Tidak ada produk ditemukan</p>
            <p className="text-xs text-[#6B7280] mt-1 max-w-xs">
              {searchQuery
                ? `Tidak ada menu yang sesuai dengan pencarian "${searchQuery}".`
                : 'Tidak ada produk dalam kategori atau filter ini.'}
            </p>
            {(searchQuery || filterShortcut !== 'all' || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setFilterShortcut('all');
                  setSearchQuery('');
                }}
                className="mt-3 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#D97706] hover:bg-[#F7F7F5]"
              >
                Reset Filter & Pencarian
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View: Compact, uniform card height */
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredProducts.map((product) => {
              const inCartCount = cart
                .filter((item) => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock < product.lowStockThreshold;
              const isConsignment = product.ownershipType === 'consignment';

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-3 hover:border-[#D97706] hover:shadow-xs cursor-pointer active:scale-[0.98] transition select-none"
                >
                  {/* In Cart Count Badge */}
                  {inCartCount > 0 && (
                    <div className="absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#059669] text-[11px] font-bold text-white shadow-xs">
                      {inCartCount}
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    {isOutOfStock ? (
                      <span className="rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Habis
                      </span>
                    ) : isLowStock ? (
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Sisa {product.stock}
                      </span>
                    ) : (
                      <span className="rounded-md bg-[#F7F7F5] border border-[#E5E7EB] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                        {product.stock}
                      </span>
                    )}
                  </div>

                  {/* Image */}
                  <div className="relative mb-2 aspect-4/3 w-full overflow-hidden rounded-lg bg-[#F7F7F5] border border-[#E5E7EB]/70">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                    {product.isMadeToOrder && (
                      <div className="absolute bottom-1 left-1 right-1 rounded bg-black/75 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
                        Made-to-Order
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div>
                    <h4 className="line-clamp-1 text-sm font-bold text-[#1F2937] leading-tight">
                      {product.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      <span className="text-[11px] text-[#6B7280]">{product.categoryLabel}</span>
                      {isConsignment && (
                        <span className="rounded bg-purple-50 border border-purple-200 px-1 text-[9px] font-semibold text-purple-800">
                          Konsinyasi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Add */}
                  <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-[#E5E7EB]">
                    <span className="text-sm font-bold text-[#D97706]">
                      {formatIDR(product.price)}
                    </span>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D97706] text-white hover:bg-amber-700 active:scale-95 transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="space-y-1.5">
            {filteredProducts.map((product) => {
              const inCartCount = cart
                .filter((item) => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);
              const isConsignment = product.ownershipType === 'consignment';

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-2.5 hover:border-[#D97706] cursor-pointer active:scale-[0.99] transition select-none"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-12 w-12 rounded-lg object-cover bg-[#F7F7F5] border border-[#E5E7EB]"
                      loading="lazy"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-[#1F2937]">{product.name}</h4>
                        {product.isMadeToOrder && (
                          <span className="rounded bg-black/75 px-1 py-0.2 text-[9px] font-semibold text-white">
                            MTO
                          </span>
                        )}
                        {isConsignment && (
                          <span className="rounded bg-purple-50 border border-purple-200 px-1 text-[9px] font-semibold text-purple-800">
                            Konsinyasi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5">
                        <span>{product.sku}</span>
                        <span>•</span>
                        <span>Stok: {product.stock} pcs</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {inCartCount > 0 && (
                      <span className="rounded-full bg-[#059669] px-2 py-0.5 text-xs font-bold text-white">
                        {inCartCount} di nota
                      </span>
                    )}
                    <span className="text-sm font-bold text-[#D97706]">
                      {formatIDR(product.price)}
                    </span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97706] text-white hover:bg-amber-700 active:scale-95 transition"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
