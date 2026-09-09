import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Building2,
  AlertCircle,
  Tag,
  Percent,
  Coins,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Product, Category, Supplier, ProductOwnershipType, CommissionMethod, CommissionBasis } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface EditProductInfoModalProps {
  product: Product | null;
  categories: Category[];
  suppliers: Supplier[];
  branchName: string;
  isBranchReadOnly: boolean;
  onSave: (productId: string, data: Partial<Product>) => { success: boolean; message: string };
  onClose: () => void;
}

const BAKERY_SAMPLE_IMAGES = [
  { label: 'Roti Manis', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
  { label: 'Croissant Butter', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80' },
  { label: 'Bolu / Cake Tart', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kue Basah / Lemper', url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kue Kering Toples', url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80' },
  { label: 'Kopi & Minuman', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80' },
];

export const EditProductInfoModal: React.FC<EditProductInfoModalProps> = ({
  product,
  categories,
  suppliers,
  branchName,
  isBranchReadOnly,
  onSave,
  onClose,
}) => {
  if (!product) return null;

  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [category, setCategory] = useState(product.category);
  const [price, setPrice] = useState(product.price.toString());
  const [isPriceCustomizable, setIsPriceCustomizable] = useState(Boolean(product.isPriceCustomizable));
  const [lowStockThreshold, setLowStockThreshold] = useState((product.lowStockThreshold || 5).toString());
  const [description, setDescription] = useState(product.description || '');
  const [image, setImage] = useState(product.image || BAKERY_SAMPLE_IMAGES[0].url);

  // Ownership & Consignment
  const [ownershipType, setOwnershipType] = useState<ProductOwnershipType>(product.ownershipType || 'own');
  const [supplierId, setSupplierId] = useState<string>(product.supplierId || suppliers[0]?.id || '');
  const [commissionMethod, setCommissionMethod] = useState<CommissionMethod>(product.commissionMethod || 'percentage');
  const [commissionValue, setCommissionValue] = useState<string>((product.commissionValue || 15).toString());
  const [commissionBasis, setCommissionBasis] = useState<CommissionBasis>(product.commissionBasis || 'net');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategory(product.category);
      setPrice(product.price.toString());
      setIsPriceCustomizable(Boolean(product.isPriceCustomizable));
      setLowStockThreshold((product.lowStockThreshold || 5).toString());
      setDescription(product.description || '');
      setImage(product.image || BAKERY_SAMPLE_IMAGES[0].url);
      setOwnershipType(product.ownershipType || 'own');
      setSupplierId(product.supplierId || suppliers[0]?.id || '');
      setCommissionMethod(product.commissionMethod || 'percentage');
      setCommissionValue((product.commissionValue || 15).toString());
      setCommissionBasis(product.commissionBasis || 'net');
      setErrorMsg('');
    }
  }, [product, suppliers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama produk wajib diisi.');
      return;
    }
    if (!sku.trim()) {
      setErrorMsg('SKU produk wajib diisi.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('Harga jual produk tidak valid.');
      return;
    }

    const thresholdNum = parseInt(lowStockThreshold, 10);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setErrorMsg('Batas peringatan stok menipis tidak valid.');
      return;
    }

    const matchedCat = categories.find((c) => c.id === category);
    const matchedSupplier = suppliers.find((s) => s.id === supplierId);

    setIsSubmitting(true);
    // CRITICAL: Notice that neither initial stock nor stock quantity is passed or updated here!
    const result = onSave(product.id, {
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      categoryLabel: matchedCat?.name || category,
      price: priceNum,
      isPriceCustomizable,
      lowStockThreshold: thresholdNum,
      description: description.trim(),
      image,
      ownershipType,
      ...(ownershipType === 'consignment'
        ? {
            supplierId,
            supplierName: matchedSupplier?.name || 'Mitra Konsinyasi',
            commissionMethod,
            commissionValue: parseFloat(commissionValue) || 0,
            commissionBasis,
          }
        : {
            supplierId: undefined,
            supplierName: undefined,
            commissionMethod: undefined,
            commissionValue: undefined,
            commissionBasis: undefined,
          }),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.message);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DACE] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-[#D97706] border border-amber-200">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-[#2D241E]">
                  Edit Informasi Produk
                </h3>
                <span className="rounded-lg bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 text-[10px] font-black uppercase">
                  Superadmin Only
                </span>
              </div>
              <p className="text-xs text-[#8C7B6C] flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>Cabang Aktif: {branchName}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">Master Data (Stok Fisik Tidak Diubah)</span>
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

        {/* Read-Only Warning if Branch Inactive */}
        {isBranchReadOnly && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Cabang ini nonaktif. Perubahan informasi master produk dinonaktifkan.</span>
          </div>
        )}

        {/* Form Body */}
        <form id="edit-product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Nama Produk *</label>
              <input
                type="text"
                required
                disabled={isBranchReadOnly}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none disabled:bg-gray-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">SKU / Kode Produk *</label>
              <input
                type="text"
                required
                disabled={isBranchReadOnly}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none uppercase disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Kategori Master *</label>
              <select
                disabled={isBranchReadOnly}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none disabled:bg-gray-100"
              >
                {categories
                  .filter((c) => c.id !== 'all')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Harga Jual Standar (Rp) *</label>
              <input
                type="number"
                min="0"
                step="500"
                required
                disabled={isBranchReadOnly}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Price Customizable & Low Stock Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <label className="flex items-center gap-2.5 rounded-xl border border-[#E5DACE] bg-white p-3 cursor-pointer hover:bg-amber-50/50">
              <input
                type="checkbox"
                disabled={isBranchReadOnly}
                checked={isPriceCustomizable}
                onChange={(e) => setIsPriceCustomizable(e.target.checked)}
                className="h-4 w-4 rounded-sm text-[#D97706] focus:ring-[#D97706]"
              />
              <div>
                <span className="text-xs font-bold text-[#2D241E] block">Harga Fleksibel Kasir</span>
                <span className="text-[10px] text-[#8C7B6C]">Kasir dapat mengubah harga saat transaksi</span>
              </div>
            </label>

            <div className="space-y-1">
              <label className="text-xs font-black text-[#2D241E]">Batas Peringatan Stok Menipis</label>
              <input
                type="number"
                min="0"
                required
                disabled={isBranchReadOnly}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#2D241E]">Deskripsi Produk</label>
            <textarea
              rows={2}
              disabled={isBranchReadOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan tekstur rasa, komposisi, atau panduan penyajian..."
              className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-medium text-[#2D241E] focus:border-[#D97706] focus:outline-none disabled:bg-gray-100"
            />
          </div>

          {/* Ownership & Consignment (POS-US-029) */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#2D241E]">Kepemilikan Produk & Konsinyasi</span>
              <span className="text-[10px] text-[#8C7B6C]">POS-US-029</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isBranchReadOnly}
                onClick={() => setOwnershipType('own')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  ownershipType === 'own'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                    : 'bg-[#FDFBF7] text-[#6D5D50] border border-[#E5DACE] hover:bg-amber-50'
                }`}
              >
                <span>Produk Dapur Sendiri</span>
              </button>

              <button
                type="button"
                disabled={isBranchReadOnly}
                onClick={() => setOwnershipType('consignment')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  ownershipType === 'consignment'
                    ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-xs'
                    : 'bg-[#FDFBF7] text-[#6D5D50] border border-[#E5DACE] hover:bg-purple-50'
                }`}
              >
                <span>🤝 Titipan Konsinyasi Mitra</span>
              </button>
            </div>

            {ownershipType === 'consignment' && (
              <div className="pt-2 border-t border-[#E5DACE] space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-purple-950">Mitra Supplier *</label>
                  <select
                    disabled={isBranchReadOnly}
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-purple-200 bg-[#FDFBF7] px-3 py-1.5 text-xs font-semibold text-[#2D241E] focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-purple-950">Metode Komisi</label>
                    <select
                      disabled={isBranchReadOnly}
                      value={commissionMethod}
                      onChange={(e) => setCommissionMethod(e.target.value as CommissionMethod)}
                      className="w-full rounded-xl border border-purple-200 bg-[#FDFBF7] px-2.5 py-1.5 text-xs font-semibold text-[#2D241E] focus:outline-none"
                    >
                      <option value="percentage">Persentase (%)</option>
                      <option value="fixed_amount">Nominal Tetap (Rp/pcs)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-purple-950">
                      Nilai Komisi {commissionMethod === 'percentage' ? '(%)' : '(Rp)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={isBranchReadOnly}
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 bg-[#FDFBF7] px-2.5 py-1.5 text-xs font-bold text-[#2D241E] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer with Bottom-Right Tutup and Simpan buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E5DACE] bg-white px-6 py-4">
          <button
            type="submit"
            form="edit-product-form"
            disabled={isBranchReadOnly || isSubmitting}
            className="rounded-xl bg-[#D97706] px-5 py-2.5 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-5 py-2.5 text-xs font-bold text-[#6D5D50] hover:bg-[#E5DACE] active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
