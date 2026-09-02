import React, { useState } from 'react';
import { Search, Sparkles, AlertTriangle, LayoutGrid, List, Plus, Cake, Coffee, Cookie } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Product, ProductCategory } from '../types';
import { formatIDR } from '../utils/formatters';

export const ProductCatalog: React.FC = () => {
  const { products, addToCart, cart } = usePOS();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterShortcut, setFilterShortcut] = useState<'all' | 'popular' | 'low_stock'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [stockWarningToast, setStockWarningToast] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'Semua Menu', icon: '🍞' },
    { id: 'roti', label: 'Roti Manis', icon: '🥐' },
    { id: 'pastry', label: 'Pastry & Croissant', icon: '🥖' },
    { id: 'cake', label: 'Cakes & Tart', icon: '🍰' },
    { id: 'cookies', label: 'Cookies & Hampers', icon: '🍪' },
    { id: 'beverage', label: 'Minuman & Kopi', icon: '☕' },
    { id: 'custom_cake', label: 'Custom Cake (PO / DP)', icon: '🎂' },
  ];

  // Filter logic
  const filteredProducts = products.filter((prod) => {
    // Category match
    if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
      return false;
    }
    // Shortcut filters
    if (filterShortcut === 'popular' && !prod.popular) {
      return false;
    }
    if (filterShortcut === 'low_stock' && prod.stock >= prod.lowStockThreshold) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchSku = prod.sku.toLowerCase().includes(q);
      const matchCat = prod.categoryLabel.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchCat) return false;
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
      {/* Category Pills - Bento touch navigation */}
      <div className="pb-3">
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm sm:text-base font-bold transition active:scale-95 ${
                  isSelected
                    ? 'bg-[#D97706] text-white border-2 border-[#D97706] shadow-sm'
                    : 'bg-white border-2 border-[#E5DACE] text-[#2D241E] hover:border-[#D97706] shadow-2xs'
                }`}
              >
                <span className="text-xl leading-none">{cat.icon}</span>
                <span className="whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Shortcuts Filter */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#8C7B6C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama roti, croissant, SKU..."
              className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white pl-10 pr-8 py-2.5 text-sm text-[#2D241E] placeholder-[#8C7B6C] focus:border-[#D97706] focus:outline-none shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-[#8C7B6C] hover:text-[#2D241E]"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Shortcut: Paling Laris */}
            <button
              onClick={() => setFilterShortcut(filterShortcut === 'popular' ? 'all' : 'popular')}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition active:scale-95 ${
                filterShortcut === 'popular'
                  ? 'bg-[#D97706] text-white border-2 border-[#D97706] shadow-2xs'
                  : 'bg-white text-[#8C7B6C] border-2 border-[#E5DACE] hover:border-[#D97706] hover:text-[#2D241E]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Terlaris</span>
            </button>

            {/* Shortcut: Stok Menipis */}
            <button
              onClick={() => setFilterShortcut(filterShortcut === 'low_stock' ? 'all' : 'low_stock')}
              className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition active:scale-95 ${
                filterShortcut === 'low_stock'
                  ? 'bg-rose-600 text-white border-2 border-rose-600 shadow-2xs'
                  : 'bg-white text-[#8C7B6C] border-2 border-[#E5DACE] hover:border-rose-400 hover:text-rose-600'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              <span>Stok Menipis</span>
            </button>

            {/* View Mode Switch */}
            <div className="flex rounded-2xl border-2 border-[#E5DACE] bg-white p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition ${viewMode === 'grid' ? 'bg-[#D97706] text-white' : 'text-[#8C7B6C] hover:text-[#2D241E]'}`}
                title="Tampilan Bento Grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition ${viewMode === 'list' ? 'bg-[#D97706] text-white' : 'text-[#8C7B6C] hover:text-[#2D241E]'}`}
                title="Tampilan List"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Notification Toast */}
      {stockWarningToast && (
        <div className="mb-2 rounded-2xl bg-amber-50 border-2 border-[#D97706] p-3 text-xs font-bold text-amber-900 shadow-sm flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-[#D97706] shrink-0" />
          <span>{stockWarningToast}</span>
        </div>
      )}

      {/* Products Display Area - Bento Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed border-[#E5DACE] bg-white/50 p-6">
            <p className="text-[#8C7B6C] text-sm font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setFilterShortcut('all');
                setSearchQuery('');
              }}
              className="mt-3 text-xs font-bold text-[#D97706] underline"
            >
              Reset semua filter
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* BENTO GRID PRODUCT TILES */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5">
            {filteredProducts.map((product) => {
              const inCartCount = cart
                .filter((item) => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock < product.lowStockThreshold;

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-[#E5DACE] bg-white p-4 shadow-sm hover:border-[#D97706] hover:shadow-md cursor-pointer active:scale-95 transition-all select-none"
                >
                  {/* In Cart Badge */}
                  {inCartCount > 0 && (
                    <div className="absolute top-3 left-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#059669] text-xs font-black text-white shadow-md ring-2 ring-white">
                      {inCartCount}
                    </div>
                  )}

                  {/* Stock Tag Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    {isOutOfStock ? (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                        Habis
                      </span>
                    ) : isLowStock ? (
                      <span className="rounded-full bg-[#D97706] px-2 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                        Sisa {product.stock}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#FDFBF7] border border-[#E5DACE] px-2 py-0.5 text-[10px] font-bold text-[#8C7B6C]">
                        {product.stock} pcs
                      </span>
                    )}
                  </div>

                  {/* Product Image */}
                  <div className="relative mb-3 aspect-4/3 w-full overflow-hidden rounded-2xl bg-[#FDFBF7] border border-[#E5DACE]/50">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {product.isMadeToOrder && (
                      <div className="absolute bottom-1 left-1 right-1 rounded-lg bg-black/70 px-1.5 py-0.5 text-center text-[10px] font-bold text-white backdrop-blur-xs">
                        🎂 Bisa DP / Custom
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div>
                    <h4 className="line-clamp-2 text-base font-bold text-[#2D241E] leading-tight">
                      {product.name}
                    </h4>
                    <p className="text-xs font-medium text-[#8C7B6C] mt-0.5">{product.categoryLabel}</p>
                  </div>

                  {/* Price & Add Action */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E5DACE]/50">
                    <span className="text-base sm:text-lg font-bold text-[#D97706]">
                      {formatIDR(product.price)}
                    </span>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D97706] text-white shadow-xs transition group-hover:brightness-95 active:scale-90"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* COMPACT LIST VIEW IN BENTO STYLE */
          <div className="space-y-2.5">
            {filteredProducts.map((product) => {
              const inCartCount = cart
                .filter((item) => item.productId === product.id)
                .reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="flex items-center justify-between rounded-3xl border-2 border-[#E5DACE] bg-white p-3.5 transition hover:border-[#D97706] hover:shadow-xs active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-14 w-14 rounded-2xl object-cover border border-[#E5DACE]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#2D241E]">{product.name}</h4>
                        {product.isMadeToOrder && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            PO/DP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#8C7B6C] mt-0.5">
                        <span>SKU: {product.sku}</span>
                        <span>•</span>
                        <span className={product.stock <= 0 ? 'text-rose-600 font-bold' : ''}>
                          Stok: {product.stock}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-[#D97706]">
                      {formatIDR(product.price)}
                    </span>
                    {inCartCount > 0 && (
                      <span className="rounded-full bg-[#059669] px-2.5 py-1 text-xs font-black text-white">
                        {inCartCount} di nota
                      </span>
                    )}
                    <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D97706] text-white hover:brightness-95">
                      <Plus className="h-5 w-5" />
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
