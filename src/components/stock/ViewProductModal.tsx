import React from 'react';
import {
  X,
  Package,
  Calendar,
  Building2,
  Tag,
  ShieldCheck,
  AlertTriangle,
  Truck,
  Layers,
  ArrowRight,
  TrendingDown,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { Product } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface ViewProductModalProps {
  product: Product | null;
  branchName: string;
  isBranchReadOnly: boolean;
  onClose: () => void;
  onNavigateToCategoryClosing?: (categoryId: string) => void;
  onNavigateToTransfer?: (productId: string) => void;
  onNavigateToBadStock?: (productId: string) => void;
}

export const ViewProductModal: React.FC<ViewProductModalProps> = ({
  product,
  branchName,
  isBranchReadOnly,
  onClose,
  onNavigateToCategoryClosing,
  onNavigateToTransfer,
  onNavigateToBadStock,
}) => {
  if (!product) return null;

  const isMto = Boolean(product.isMadeToOrder);
  const isConsignment = product.ownershipType === 'consignment';
  const inTransit = product.inTransitStock || 0;
  const badStock = product.badStock || 0;
  const isOut = !isMto && product.stock === 0;
  const isLow = !isMto && product.stock > 0 && product.stock <= product.lowStockThreshold;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5DACE] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-[#D97706] border border-amber-200">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#2D241E]">{product.name}</h3>
                <span className="rounded-lg bg-[#F5EFEB] px-2 py-0.5 text-[11px] font-bold text-[#6D5D50]">
                  {product.sku}
                </span>
              </div>
              <p className="text-xs text-[#8C7B6C] flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>{branchName}</span>
                <span>•</span>
                <span>{product.categoryLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-[#F5EFEB] hover:text-[#2D241E] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Top Banner: Product Image & Key Specs */}
          <div className="flex flex-col sm:flex-row gap-4 rounded-2xl bg-white border border-[#E5DACE] p-4">
            <img
              src={product.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80'}
              alt={product.name}
              className="h-28 w-28 rounded-2xl object-cover border border-[#E5DACE] shrink-0 self-center sm:self-start"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
              }}
            />

            <div className="flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Condition Badge */}
                {isMto ? (
                  <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-0.5 text-xs font-black">
                    🎂 Made-to-Order
                  </span>
                ) : isOut ? (
                  <span className="rounded-full bg-rose-100 text-rose-800 px-3 py-0.5 text-xs font-black">
                    Habis (0 pcs)
                  </span>
                ) : isLow ? (
                  <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-0.5 text-xs font-black">
                    Stok Menipis
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-0.5 text-xs font-black">
                    Stok Aman
                  </span>
                )}

                {/* Ownership Badge */}
                {isConsignment ? (
                  <span className="rounded-full bg-purple-100 text-purple-900 px-3 py-0.5 text-xs font-bold">
                    🤝 Konsinyasi
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 text-amber-900 px-3 py-0.5 text-xs font-bold border border-amber-200">
                    Produk Sendiri
                  </span>
                )}

                {product.isPriceCustomizable && (
                  <span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[11px] font-bold border border-indigo-200">
                    Harga Fleksibel Kasir
                  </span>
                )}
              </div>

              <div>
                <span className="text-[11px] text-[#8C7B6C] font-medium">Harga Jual Satuan</span>
                <div className="text-xl font-black text-[#2D241E]">
                  {formatIDR(product.price)}
                </div>
              </div>

              {product.description && (
                <p className="text-xs text-[#6D5D50] leading-relaxed bg-[#FDFBF7] p-2.5 rounded-xl border border-[#E5DACE]">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Stock Metrics Cards (Branch-Specific) */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#8C7B6C] mb-2.5">
              Informasi Stok Cabang: {branchName}
            </h4>

            {isMto ? (
              <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 text-xs text-blue-900 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Produk Made-to-Order (Pesanan Khusus)</div>
                  <p className="mt-1 text-blue-800">
                    Produk ini diproduksi saat pelanggan memesan (kustom cake / pesanan khusus). Produk tidak memerlukan stok fisik awal, penutupan harian, transfer cabang, maupun pencatatan stok buruk.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white border border-[#E5DACE] p-3 text-center space-y-1">
                  <div className="text-[11px] font-bold text-[#8C7B6C]">Stok Siap Jual</div>
                  <div className={`text-xl font-black ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {product.stock}
                  </div>
                  <div className="text-[10px] text-[#8C7B6C]">Tersedia di etalase</div>
                </div>

                <div className="rounded-2xl bg-white border border-[#E5DACE] p-3 text-center space-y-1">
                  <div className="text-[11px] font-bold text-[#8C7B6C]">Dalam Pengiriman</div>
                  <div className="text-xl font-black text-cyan-700">
                    {inTransit}
                  </div>
                  <div className="text-[10px] text-[#8C7B6C]">In Transit</div>
                </div>

                <div className="rounded-2xl bg-white border border-[#E5DACE] p-3 text-center space-y-1">
                  <div className="text-[11px] font-bold text-[#8C7B6C]">Stok Buruk / Expired</div>
                  <div className="text-xl font-black text-rose-600">
                    {badStock}
                  </div>
                  <div className="text-[10px] text-[#8C7B6C]">Dicatat & disisihkan</div>
                </div>

                <div className="rounded-2xl bg-white border border-[#E5DACE] p-3 text-center space-y-1">
                  <div className="text-[11px] font-bold text-[#8C7B6C]">Batas Menipis</div>
                  <div className="text-xl font-black text-[#2D241E]">
                    {product.lowStockThreshold}
                  </div>
                  <div className="text-[10px] text-[#8C7B6C]">Threshold peringatan</div>
                </div>
              </div>
            )}
          </div>

          {/* Consignment Partnership Details (if applicable) */}
          {isConsignment && (
            <div className="rounded-2xl bg-white border border-purple-200 p-4 space-y-2">
              <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                <span>🤝 Kemitraan Konsinyasi</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8C7B6C] block text-[11px]">Mitra Supplier:</span>
                  <strong className="text-[#2D241E]">{product.supplierName || 'Tidak ditentukan'}</strong>
                </div>
                <div>
                  <span className="text-[#8C7B6C] block text-[11px]">Bagi Hasil / Komisi:</span>
                  <strong className="text-purple-800">
                    {product.commissionMethod === 'percentage'
                      ? `${product.commissionValue || 0}% (${product.commissionBasis || 'net'})`
                      : `${formatIDR(product.commissionValue || 0)} / pcs`}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Navigation to Stock Workflows for Ready Stock */}
          {!isMto && (
            <div className="rounded-2xl bg-[#F5EFEB] border border-[#E5DACE] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#2D241E]">
                  Navigasi Tindakan Stok Produk
                </span>
                {isBranchReadOnly && (
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                    Cabang Nonaktif (Hanya Baca)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isBranchReadOnly}
                  onClick={() => {
                    onClose();
                    onNavigateToCategoryClosing?.(product.category);
                  }}
                  className="flex items-center justify-between rounded-xl bg-white border border-[#E5DACE] p-2.5 text-left hover:border-[#D97706] hover:bg-amber-50/50 transition disabled:opacity-50"
                >
                  <div>
                    <div className="text-xs font-black text-[#2D241E]">Closing Kategori</div>
                    <div className="text-[10px] text-[#8C7B6C]">Hitung fisik harian</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8C7B6C]" />
                </button>

                <button
                  type="button"
                  disabled={isBranchReadOnly}
                  onClick={() => {
                    onClose();
                    onNavigateToTransfer?.(product.id);
                  }}
                  className="flex items-center justify-between rounded-xl bg-white border border-[#E5DACE] p-2.5 text-left hover:border-[#D97706] hover:bg-amber-50/50 transition disabled:opacity-50"
                >
                  <div>
                    <div className="text-xs font-black text-[#2D241E]">Transfer Cabang</div>
                    <div className="text-[10px] text-[#8C7B6C]">Kirim stok ke cabang</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8C7B6C]" />
                </button>

                <button
                  type="button"
                  disabled={isBranchReadOnly}
                  onClick={() => {
                    onClose();
                    onNavigateToBadStock?.(product.id);
                  }}
                  className="flex items-center justify-between rounded-xl bg-white border border-[#E5DACE] p-2.5 text-left hover:border-[#D97706] hover:bg-amber-50/50 transition disabled:opacity-50"
                >
                  <div>
                    <div className="text-xs font-black text-[#2D241E]">Stok Buruk / Basi</div>
                    <div className="text-[10px] text-[#8C7B6C]">Catat barang expired</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8C7B6C]" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Bottom-Right Tutup button */}
        <div className="flex items-center justify-end border-t border-[#E5DACE] bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-6 py-2.5 text-xs font-black text-[#2D241E] hover:bg-[#E5DACE] active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
