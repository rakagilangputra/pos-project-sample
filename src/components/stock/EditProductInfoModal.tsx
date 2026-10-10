import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Clock, Edit3, ShieldAlert, X, Zap } from 'lucide-react';
import { Category, MasterCategory, Product, ProductExpiryType, ProductStatus, Supplier } from '../../types';

interface EditProductInfoModalProps {
  product: Product | null;
  categories: Category[];
  masterCategories: MasterCategory[];
  suppliers: Supplier[];
  branchName: string;
  isBranchReadOnly: boolean;
  onSave: (productId: string, data: Partial<Product>) => { success: boolean; message: string };
  onClose: () => void;
}

export const EditProductInfoModal: React.FC<EditProductInfoModalProps> = ({ product, categories, masterCategories, suppliers, branchName, isBranchReadOnly, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [masterCategoryId, setMasterCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [status, setStatus] = useState<ProductStatus>('active');
  const [expiryType, setExpiryType] = useState<ProductExpiryType>('daily');
  const [shelfLifeDays, setShelfLifeDays] = useState('3');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackMasterCategoryId = useMemo(() => {
    if (!product) return masterCategories[0]?.id || '';
    if (product.masterCategoryId && masterCategories.some((item) => item.id === product.masterCategoryId)) return product.masterCategoryId;
    return suppliers.find((item) => item.id === product.supplierId)?.masterCategoryId || masterCategories[0]?.id || '';
  }, [masterCategories, product, suppliers]);

  const filteredSuppliers = useMemo(() => {
    const master = masterCategories.find((item) => item.id === masterCategoryId);
    if (!master) return [];
    const linked = suppliers.filter((item) => item.masterCategoryId === master.id);
    return master.categoryType === 'PRODUKSI' ? linked.filter((item) => item.isInternal) : linked.filter((item) => !item.isInternal);
  }, [masterCategories, masterCategoryId, suppliers]);

  useEffect(() => {
    if (!product) return;
    const initialMasterCategoryId = product.masterCategoryId || fallbackMasterCategoryId;
    setName(product.name);
    setSku(product.sku);
    setMasterCategoryId(initialMasterCategoryId);
    setSupplierId(product.supplierId || suppliers.find((item) => item.masterCategoryId === initialMasterCategoryId)?.id || '');
    setCategory(product.category);
    setPrice(String(product.price));
    setBuyPrice(product.buyPrice === undefined ? '' : String(product.buyPrice));
    setStatus(product.status || 'active');
    setExpiryType(product.expiryType || 'daily');
    setShelfLifeDays(String(product.shelfLifeDays || 3));
    setErrorMsg('');
  }, [fallbackMasterCategoryId, product, suppliers]);

  useEffect(() => {
    if (!filteredSuppliers.some((item) => item.id === supplierId)) setSupplierId(filteredSuppliers[0]?.id || '');
  }, [filteredSuppliers, supplierId]);

  if (!product) return null;

  const handleMasterCategoryChange = (value: string) => {
    setMasterCategoryId(value);
    const master = masterCategories.find((item) => item.id === value);
    const nextSuppliers = suppliers.filter((item) => item.masterCategoryId === value && (master?.categoryType === 'PRODUKSI' ? item.isInternal : !item.isInternal));
    setSupplierId(nextSuppliers[0]?.id || '');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    if (!name.trim()) return setErrorMsg('Nama produk wajib diisi.');
    const priceNumber = Number(price);
    const buyPriceNumber = buyPrice.trim() === '' ? undefined : Number(buyPrice);
    const shelfLifeNumber = Number(shelfLifeDays);
    if (!Number.isFinite(priceNumber) || priceNumber < 0) return setErrorMsg('Harga jual harus berupa angka nol atau lebih.');
    if (buyPriceNumber !== undefined && (!Number.isFinite(buyPriceNumber) || buyPriceNumber < 0)) return setErrorMsg('Harga beli harus berupa angka nol atau lebih.');
    if (expiryType === 'multi_day' && (!Number.isInteger(shelfLifeNumber) || shelfLifeNumber < 2)) return setErrorMsg('Masa simpan harus minimal 2 hari.');
    const master = masterCategories.find((item) => item.id === masterCategoryId);
    const supplier = suppliers.find((item) => item.id === supplierId);
    const categoryItem = categories.find((item) => item.id === category);
    if (!master || !supplier || supplier.masterCategoryId !== master.id) return setErrorMsg('Pilih Master Kategori dan Supplier yang sesuai.');

    setIsSubmitting(true);
    const result = onSave(product.id, {
      name: name.trim(), masterCategoryId: master.id, supplierId: supplier.id, supplierName: supplier.name,
      category, categoryLabel: categoryItem?.name || category, price: priceNumber, buyPrice: buyPriceNumber, status,
      expiryType, shelfLifeDays: expiryType === 'daily' ? 1 : shelfLifeNumber,
    });
    setIsSubmitting(false);
    if (!result.success) setErrorMsg(result.message); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden rounded-3xl border-2 border-[#E5DACE] bg-[#FDFBF7] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5DACE] bg-white px-6 py-4">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-[#D97706]"><Edit3 className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h3 className="font-black text-base text-[#2D241E]">Edit Informasi Produk</h3><span className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-black uppercase text-purple-800">Superadmin Only</span></div><p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#8C7B6C]"><Building2 className="h-3.5 w-3.5" />Cabang Aktif: {branchName}<span>•</span><span className="font-semibold text-emerald-700">Master Data (Stok Fisik Tidak Diubah)</span></p></div></div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5DACE] bg-white text-[#8C7B6C] hover:bg-[#F5EFEB]"><X className="h-4 w-4" /></button>
        </div>
        {isBranchReadOnly && <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-6 py-2.5 text-xs text-rose-800"><ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />Cabang ini nonaktif. Perubahan informasi master produk dinonaktifkan.</div>}
        <form id="edit-product-form" onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
          {errorMsg && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />{errorMsg}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Master Kategori *"><select disabled={isBranchReadOnly} value={masterCategoryId} onChange={(e) => handleMasterCategoryChange(e.target.value)} className={controlClass} required>{masterCategories.map((item) => <option key={item.id} value={item.id}>[{item.categoryType}] {item.name}</option>)}</select></Field>
            <Field label="Mitra Supplier *"><select disabled={isBranchReadOnly} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={controlClass} required>{filteredSuppliers.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.id})</option>)}</select></Field>
            <Field label="Nama Produk *"><input disabled={isBranchReadOnly} required value={name} onChange={(e) => setName(e.target.value)} className={controlClass} /></Field>
            <Field label="Produk Kategori *"><select disabled={isBranchReadOnly} required value={category} onChange={(e) => setCategory(e.target.value)} className={controlClass}>{categories.filter((item) => item.id !== 'all').map((item) => <option key={item.id} value={item.id}>{item.icon ? `${item.icon} ` : ''}{item.name}</option>)}<option value="mto">Made-to-Order</option></select></Field>
            <Field label="SKU / Kode Produk (Tetap)"><input disabled value={sku} className={`${controlClass} bg-gray-100`} /></Field>
            <Field label="Status Produk"><select disabled={isBranchReadOnly} value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className={controlClass}><option value="active">Active — dapat dijual</option><option value="inactive">Inactive — simpan sebagai nonaktif</option></select></Field>
            <Field label="Harga Jual (Rp) *"><input disabled={isBranchReadOnly} type="number" min="0" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} className={controlClass} /></Field>
            <Field label="Harga Beli (Rp) (opsional)"><input disabled={isBranchReadOnly} type="number" min="0" step="1" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="Contoh: 9000" className={controlClass} /></Field>
          </div>
          <div className="space-y-2.5 border-t border-[#E5DACE] pt-3"><div className="flex items-center justify-between"><label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#8C7B6C]"><Clock className="h-3.5 w-3.5 text-[#D97706]" />Tipe Masa Kedaluwarsa Produk *</label><span className="text-[10px] font-bold text-[#8C7B6C]">Pilih salah satu dari 2 tipe</span></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><ExpiryOption selected={expiryType === 'daily'} onClick={() => setExpiryType('daily')} title="Expired Secara Harian" badge="1 Hari (Fresh)" icon={<Zap className="h-3.5 w-3.5 text-[#D97706]" />} description="Produk berumur simpan harian dan dapat dimusnahkan saat closing bila tidak terjual." /><ExpiryOption selected={expiryType === 'multi_day'} onClick={() => setExpiryType('multi_day')} title="Expired di Atas dari Satu Hari" badge="> 1 Hari (Awet)" icon={<Clock className="h-3.5 w-3.5 text-blue-600" />} description="Tanggal expiry dapat disesuaikan saat penerimaan barang dan pesanan." /></div>{expiryType === 'multi_day' && <div className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/40 p-3"><label className="text-xs font-bold text-blue-950">Masa Simpan (Hari)</label><input disabled={isBranchReadOnly} type="number" min="2" max="365" value={shelfLifeDays} onChange={(e) => setShelfLifeDays(e.target.value)} className="w-24 rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold" /><span className="text-[10px] text-[#8C7B6C]">Acuan expiry saat penerimaan atau pesanan baru.</span></div>}</div>
        </form>
        <div className="flex justify-end gap-2 border-t border-[#E5DACE] bg-white px-6 py-4"><button type="submit" form="edit-product-form" disabled={isBranchReadOnly || isSubmitting} className="rounded-xl bg-[#D97706] px-5 py-2.5 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button><button type="button" onClick={onClose} className="rounded-xl border border-[#E5DACE] bg-[#FDFBF7] px-5 py-2.5 text-xs font-bold text-[#6D5D50]">Tutup</button></div>
      </div>
    </div>
  );
};

const controlClass = 'w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none disabled:bg-gray-100';
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <div className="space-y-1"><label className="text-xs font-black text-[#2D241E]">{label}</label>{children}</div>;
const ExpiryOption: React.FC<{ selected: boolean; onClick: () => void; title: string; badge: string; icon: React.ReactNode; description: string }> = ({ selected, onClick, title, badge, icon, description }) => <div onClick={onClick} className={`relative cursor-pointer rounded-2xl border-2 p-3.5 transition-all ${selected ? 'border-[#D97706] bg-amber-50/70 shadow-xs' : 'border-[#E5DACE] bg-white hover:border-[#D97706]/40'}`}><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2"><input type="radio" checked={selected} onChange={onClick} className="h-4 w-4 text-[#D97706]" /><span className="flex items-center gap-1.5 text-xs font-black text-[#2D241E]">{icon}{title}</span></div><span className="shrink-0 rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">{badge}</span></div><p className="mt-2 text-[11px] leading-relaxed text-[#8C7B6C]">{description}</p></div>;
