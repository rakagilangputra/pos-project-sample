import React, { useState, useMemo } from 'react';
import {
  Wheat,
  Search,
  Plus,
  Layers,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Edit3,
  Trash2,
  ArrowLeft,
  Tag,
  ShieldCheck,
  Package,
  Info,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { RawMaterial } from '../../types';
import { formatIDR } from '../../utils/formatters';

interface RawMaterialWorkspaceProps {
  onNavigateToReceiving?: () => void;
}

const RAW_MATERIAL_CATEGORIES = [
  'Semua Kategori',
  'Telur & Dairy',
  'Pemanis & Gula',
  'Tepung & Gandum',
  'Lemak & Mentega',
  'Bahan Pengembang & Ragi',
  'Cokelat & Topping',
  'Rempah & Perasa',
  'Kemasan & Packaging',
];

const RAW_MATERIAL_UNITS = [
  { value: 'kg', label: 'kg (Kilogram)' },
  { value: 'liter', label: 'liter (Liter)' },
  { value: 'butir', label: 'butir (Butir / Pcs)' },
  { value: 'pack', label: 'pack (Kemasan / Bungkus)' },
  { value: 'gram', label: 'gram (Gram)' },
  { value: 'sak', label: 'sak (Sak / Karung 25kg)' },
  { value: 'dus', label: 'dus (Karton / Box)' },
  { value: 'kaleng', label: 'kaleng (Kaleng / Tin)' },
];

const RAW_MATERIAL_SAMPLE_IMAGES = [
  { label: 'Telur Ayam Segar', url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&auto=format&fit=crop&q=80' },
  { label: 'Susu UHT / Dairy', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80' },
  { label: 'Gula Pasir Kristal', url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=400&auto=format&fit=crop&q=80' },
  { label: 'Tepung Terigu Gandum', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
  { label: 'Mentega / Butter', url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&auto=format&fit=crop&q=80' },
  { label: 'Ragi Instan Active', url: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&auto=format&fit=crop&q=80' },
];

export const RawMaterialWorkspace: React.FC<RawMaterialWorkspaceProps> = ({ onNavigateToReceiving }) => {
  const {
    rawMaterials = [],
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    suppliers = [],
    selectedBranch,
    isBranchReadOnly,
    currentUser,
    verifySupervisorPin,
  } = usePOS();

  // Mode: List view vs Full-Page Add Form
  const [isFullPageAdd, setIsFullPageAdd] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'all' | 'safe' | 'low' | 'empty'>('all');

  // Selected item for detail / edit modals
  const [detailItem, setDetailItem] = useState<RawMaterial | null>(null);
  const [editItem, setEditItem] = useState<RawMaterial | null>(null);

  // Full-Page Add Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(RAW_MATERIAL_CATEGORIES[1]);
  const [customCategory, setCustomCategory] = useState('');
  const [unit, setUnit] = useState('kg');
  const [costPrice, setCostPrice] = useState<string>('20000');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('10');
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || 'internal');
  const [selectedImage, setSelectedImage] = useState(RAW_MATERIAL_SAMPLE_IMAGES[0].url);
  const [description, setDescription] = useState('');

  // Authorization PIN
  const [supervisorPin, setSupervisorPin] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal Form State
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');

  const isSuperadmin = currentUser.role === 'admin';
  const isInactive = isBranchReadOnly || selectedBranch.status === 'inactive';

  // Filtered Raw Materials
  const filteredItems = useMemo(() => {
    return rawMaterials.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(q));

      const matchCat =
        selectedCategory === 'Semua Kategori' || item.category === selectedCategory;

      let matchStock = true;
      if (selectedStockStatus === 'safe') {
        matchStock = item.stock > item.lowStockThreshold;
      } else if (selectedStockStatus === 'low') {
        matchStock = item.stock > 0 && item.stock <= item.lowStockThreshold;
      } else if (selectedStockStatus === 'empty') {
        matchStock = item.stock <= 0;
      }

      return matchSearch && matchCat && matchStock;
    });
  }, [rawMaterials, search, selectedCategory, selectedStockStatus]);

  // Auto SKU generator helper
  const handleSuggestSku = (catName: string) => {
    const cleanCat = catName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'RAW';
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`RAW-${cleanCat}-${rand}`);
  };

  // Reset Add Form
  const resetAddForm = () => {
    setName('');
    setSku('');
    setCategory(RAW_MATERIAL_CATEGORIES[1]);
    setCustomCategory('');
    setUnit('kg');
    setCostPrice('20000');
    setLowStockThreshold('10');
    setSupplierId(suppliers[0]?.id || 'internal');
    setSelectedImage(RAW_MATERIAL_SAMPLE_IMAGES[0].url);
    setDescription('');
    setSupervisorPin('');
    setFormError('');
    setFormSuccess('');
  };

  // Handle Save Raw Material
  const handleSaveRawMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (currentUser.role !== 'admin') {
      if (!supervisorPin) {
        setFormError('Otorisasi PIN Supervisor / Admin diperlukan untuk menambah master bahan baku!');
        return;
      }
      const auth = verifySupervisorPin(supervisorPin);
      if (!auth.success) {
        setFormError(auth.message);
        return;
      }
    }

    const trimmedName = name.trim();
    const trimmedSku = sku.trim().toUpperCase();
    const numPrice = parseInt(costPrice || '0', 10);
    const numThreshold = parseInt(lowStockThreshold || '5', 10);
    const finalCategory = category === 'Lainnya (Ketik Manual)' ? customCategory.trim() : category;

    if (!trimmedName) {
      setFormError('Nama bahan baku wajib diisi!');
      return;
    }
    if (!trimmedSku) {
      setFormError('Kode SKU bahan baku wajib diisi!');
      return;
    }
    if (!finalCategory) {
      setFormError('Kategori bahan baku wajib dipilih atau diisi!');
      return;
    }
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Estimasi harga beli satuan tidak valid!');
      return;
    }

    setIsSubmitting(true);

    const supObj = suppliers.find((s) => s.id === supplierId);
    const supplierName = supplierId === 'internal' ? 'Produksi Sendiri (Dapur Internal)' : supObj?.name || 'Mitra Pemasok';

    const res = addRawMaterial({
      sku: trimmedSku,
      name: trimmedName,
      category: finalCategory,
      unit,
      costPrice: numPrice,
      stock: 0, // Strict requirement: raw material stock starts at 0, must be added via Penerimaan Barang!
      lowStockThreshold: Math.max(0, numThreshold),
      supplierId: supplierId === 'internal' ? undefined : supplierId,
      supplierName,
      image: selectedImage,
      description: description.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setFormSuccess(res.message);
      setTimeout(() => {
        resetAddForm();
        setIsFullPageAdd(false);
      }, 1500);
    } else {
      setFormError(res.message);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: RawMaterial) => {
    setEditItem(item);
    setEditName(item.name);
    setEditSku(item.sku);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditCostPrice(String(item.costPrice));
    setEditThreshold(String(item.lowStockThreshold));
    setEditSupplierId(item.supplierId || 'internal');
    setEditDescription(item.description || '');
    setEditError('');
  };

  // Submit Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const trimmedName = editName.trim();
    const trimmedSku = editSku.trim().toUpperCase();
    const numPrice = parseInt(editCostPrice || '0', 10);
    const numThreshold = parseInt(editThreshold || '5', 10);

    if (!trimmedName || !trimmedSku) {
      setEditError('Nama dan Kode SKU bahan baku wajib diisi!');
      return;
    }

    const supObj = suppliers.find((s) => s.id === editSupplierId);
    const supplierName = editSupplierId === 'internal' ? 'Produksi Sendiri (Dapur Internal)' : supObj?.name || 'Mitra Pemasok';

    const res = updateRawMaterial(editItem.id, {
      name: trimmedName,
      sku: trimmedSku,
      category: editCategory,
      unit: editUnit,
      costPrice: Math.max(0, numPrice),
      lowStockThreshold: Math.max(0, numThreshold),
      supplierId: editSupplierId === 'internal' ? undefined : editSupplierId,
      supplierName,
      description: editDescription.trim() || undefined,
    });

    if (res.success) {
      setEditItem(null);
    } else {
      setEditError(res.message);
    }
  };

  // Handle Delete Raw Material
  const handleDelete = (item: RawMaterial) => {
    if (window.confirm(`Yakin ingin menghapus master bahan baku "${item.name}" (${item.sku})?`)) {
      deleteRawMaterial(item.id);
    }
  };

  // =========================================================================
  // VIEW: FULL-PAGE ADD RAW MATERIAL FORM
  // =========================================================================
  if (isFullPageAdd) {
    return (
      <div className="flex flex-col flex-1 h-full bg-[#FDFBF7] overflow-hidden">
        {/* Top Header / Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#E5DACE] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setIsFullPageAdd(false);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#E5DACE] bg-white text-[#8C7B6C] hover:border-[#D97706] hover:text-[#2D241E] transition shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#8C7B6C]">
                <span>Stok & Logistik</span>
                <span>/</span>
                <span>Raw Material (Bahan Baku)</span>
                <span>/</span>
                <span className="text-[#D97706]">Tambah Bahan Baku Baru</span>
              </div>
              <h2 className="text-base font-black text-[#2D241E]">
                Formulir Master Data Bahan Baku Baru
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setIsFullPageAdd(false);
              }}
              className="rounded-xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#2D241E] hover:bg-[#FAF8F5] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="add-raw-material-form"
              disabled={isSubmitting || isInactive}
              className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Master Bahan Baku'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <form
            id="add-raw-material-form"
            onSubmit={handleSaveRawMaterial}
            className="max-w-4xl mx-auto space-y-6"
          >
            {formError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* MANDATORY POLICY NOTICE: STRICT GOODS RECEIVING STOCK FLOW */}
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                <Info className="h-4 w-4 text-[#D97706] shrink-0" />
                <span>Ketentuan Pengelolaan Stok Bahan Baku (SOP Baku Dapur)</span>
              </div>
              <p className="text-xs text-amber-950 font-medium leading-relaxed">
                Jumlah stok fisik awal bahan baku baru otomatis <strong>0 {unit}</strong>. Sesuai sistem inventory terstandarisasi, kuantitas stok bahan baku <strong>tidak dapat diisi secara manual (ad-hoc)</strong> saat pembuatan produk master, melainkan wajib ditambahkan melalui dokumen resmi <strong>Penerimaan Barang (Goods Receiving)</strong> saat bahan baku datang di toko/dapur.
              </p>
            </div>

            {/* Form Card 1: Identitas Bahan Baku */}
            <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-6 space-y-5">
              <h3 className="text-sm font-black text-[#2D241E] flex items-center gap-2 border-b border-[#E5DACE] pb-3">
                <Tag className="h-4 w-4 text-[#D97706]" />
                <span>Identitas & Spesifikasi Bahan Baku</span>
              </h3>

              {/* Row 1: Nama & Kategori */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Nama Bahan Baku <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Telur Ayam Negeri Fresh (Grade A)"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Kategori Bahan Baku <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (e.target.value !== 'Semua Kategori' && e.target.value !== 'Lainnya (Ketik Manual)') {
                        handleSuggestSku(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
                  >
                    {RAW_MATERIAL_CATEGORIES.filter((c) => c !== 'Semua Kategori').map((cat) => (
                      <option key={cat} value={cat}>
                        🏷️ {cat}
                      </option>
                    ))}
                    <option value="Lainnya (Ketik Manual)">✍️ Lainnya (Ketik Kategori Manual)</option>
                  </select>
                </div>
              </div>

              {category === 'Lainnya (Ketik Manual)' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">Nama Kategori Baru *</label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Contoh: Pewarna Alami, Kemasan Box"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>
              )}

              {/* Row 2: Kode SKU & Satuan Pengukuran */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#2D241E]">
                      Kode SKU / Barcode Bahan <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSuggestSku(category)}
                      className="text-[11px] font-bold text-[#D97706] hover:underline"
                    >
                      + Buat Otomatis
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Contoh: RAW-EGG-01"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none uppercase font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Satuan Pengukuran (Unit) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
                  >
                    {RAW_MATERIAL_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Biaya Beli Acuan & Batas Minimum Stok */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Estimasi Harga Beli Satuan (Rp / {unit}) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#8C7B6C]">Rp</span>
                    <input
                      type="number"
                      min={0}
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="Contoh: 2200"
                      className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] pl-10 pr-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-[#8C7B6C]">
                    Harga beli acuan untuk perhitungan nilai inventori dan purchase planning.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#2D241E]">
                    Batas Minimum Stok Peringatan (Safety Stock)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      placeholder="Contoh: 10"
                      className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-[#8C7B6C]">{unit}</span>
                  </div>
                  <p className="text-[11px] text-[#8C7B6C]">
                    Sistem akan memunculkan status <strong>Menipis</strong> jika stok fisik &le; nilai ini.
                  </p>
                </div>
              </div>

              {/* Row 4: Mitra Supplier Pemasok */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">
                  Mitra Supplier Pemasok Rutin <span className="text-rose-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
                >
                  <option value="internal">🏠 Dapur Utama Sendiri (Produksi Internal Toko)</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      🏷️ {sup.name} ({sup.category || 'Supplier'}) - PIC: {sup.picName || '-'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 5: Preset Gambar Bahan Baku */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2D241E]">Pilih Gambar Thumbnail Bahan</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {RAW_MATERIAL_SAMPLE_IMAGES.map((img, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedImage(img.url)}
                      className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition ${
                        selectedImage === img.url
                          ? 'border-[#D97706] ring-2 ring-amber-300'
                          : 'border-[#E5DACE] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-[9px] font-bold text-white text-center truncate">
                        {img.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 6: Deskripsi & Instruksi Penyimpanan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2D241E]">Deskripsi & Petunjuk Penyimpanan Dapur</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Simpan di chiller suhu 4°C, gunakan FIFO untuk menjaga kesegaran telur..."
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3.5 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Supervisor PIN Authorization (if non-admin) */}
            {!isSuperadmin && (
              <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/50 p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#D97706]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#2D241E]">
                    Otorisasi Supervisor Diperlukan
                  </h4>
                </div>
                <div className="max-w-xs space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">PIN Supervisor / Admin *</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={supervisorPin}
                    onChange={(e) => setSupervisorPin(e.target.value)}
                    placeholder="••••"
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-white px-3.5 py-2 text-center text-sm font-bold tracking-widest text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetAddForm();
                  setIsFullPageAdd(false);
                }}
                className="rounded-xl border-2 border-[#E5DACE] bg-white px-6 py-2.5 text-xs font-bold text-[#2D241E] hover:bg-[#FAF8F5] transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isInactive}
                className="flex items-center gap-2 rounded-xl bg-[#D97706] px-6 py-2.5 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Master Bahan Baku'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN RAW MATERIAL TABLE & DASHBOARD
  // =========================================================================
  return (
    <div className="flex flex-col flex-1 h-full bg-[#FDFBF7] overflow-hidden">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#E5DACE] bg-white px-6 py-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-[#D97706]">
              <Wheat className="h-4 w-4" />
            </span>
            <h2 className="text-base font-black text-[#2D241E]">
              Master Bahan Baku (Raw Material)
            </h2>
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              {selectedBranch?.name || 'Cabang Senopati'}
            </span>
          </div>
          <p className="text-xs text-[#8C7B6C]">
            Katalog bahan baku produksi roti & pastry (telur, susu, gula, mentega, tepung). Stok hanya dapat bertambah melalui alur Penerimaan Barang.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigateToReceiving && (
            <button
              type="button"
              onClick={onNavigateToReceiving}
              className="flex items-center gap-1.5 rounded-xl border-2 border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-900 hover:bg-amber-100 transition shadow-xs"
            >
              <Layers className="h-4 w-4 text-[#D97706]" />
              <span>Penerimaan Barang (Tambah Stok)</span>
            </button>
          )}

          <button
            type="button"
            disabled={isInactive}
            onClick={() => {
              resetAddForm();
              setIsFullPageAdd(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-amber-700 shadow-xs active:scale-95 transition disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Bahan Baku Baru</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E5DACE] bg-white px-6 py-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#8C7B6C]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU, nama bahan baku (telur, susu, gula...)"
              className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] pl-9 pr-3.5 py-1.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-1.5 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
          >
            {RAW_MATERIAL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-xl border border-[#E5DACE] bg-[#FDFBF7] p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedStockStatus('all')}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                selectedStockStatus === 'all'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:text-[#2D241E]'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedStockStatus('safe')}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                selectedStockStatus === 'safe'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:text-[#2D241E]'
              }`}
            >
              Aman
            </button>
            <button
              type="button"
              onClick={() => setSelectedStockStatus('low')}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                selectedStockStatus === 'low'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:text-[#2D241E]'
              }`}
            >
              Menipis
            </button>
            <button
              type="button"
              onClick={() => setSelectedStockStatus('empty')}
              className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                selectedStockStatus === 'empty'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-[#8C7B6C] hover:text-[#2D241E]'
              }`}
            >
              Habis
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-3xl border-2 border-dashed border-[#E5DACE] bg-white p-8 text-center">
            <Wheat className="h-12 w-12 text-[#8C7B6C] opacity-40 mb-3" />
            <h3 className="text-sm font-black text-[#2D241E]">Tidak Ada Data Bahan Baku Ditemukan</h3>
            <p className="text-xs text-[#8C7B6C] mt-1 max-w-sm">
              Belum ada bahan baku yang cocok dengan pencarian. Klik tombol "+ Tambah Bahan Baku Baru" untuk membuat master data baru.
            </p>
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setIsFullPageAdd(true);
              }}
              className="mt-4 rounded-xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-amber-700 transition"
            >
              + Tambah Bahan Baku Baru
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border-2 border-[#E5DACE] bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#E5DACE] bg-[#FAF8F5] text-[11px] font-black uppercase tracking-wider text-[#8C7B6C]">
                  <th className="py-3.5 px-4">Bahan Baku (SKU & Nama)</th>
                  <th className="py-3.5 px-3">Kategori</th>
                  <th className="py-3.5 px-3">Satuan (Unit)</th>
                  <th className="py-3.5 px-3 text-right">Harga Acuan Beli</th>
                  <th className="py-3.5 px-4 text-center">Stok Fisik Saat Ini</th>
                  <th className="py-3.5 px-3 text-center">Batas Min</th>
                  <th className="py-3.5 px-3">Pemasok / Supplier</th>
                  <th className="py-3.5 px-3 text-center">Aturan Stok</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DACE]">
                {filteredItems.map((item) => {
                  const isLow = item.stock > 0 && item.stock <= item.lowStockThreshold;
                  const isEmpty = item.stock <= 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#FDFBF7] transition group"
                    >
                      {/* Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image || RAW_MATERIAL_SAMPLE_IMAGES[0].url}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-xl object-cover border border-[#E5DACE] shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
                                {item.sku}
                              </span>
                              <span className="font-bold text-[#2D241E] text-xs">
                                {item.name}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-[#8C7B6C] truncate max-w-xs mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-700">
                          {item.category}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[#2D241E] bg-[#FAF8F5] border border-[#E5DACE] px-2 py-0.5 rounded-md text-[11px]">
                          {item.unit}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-3 text-right font-bold text-[#2D241E]">
                        {formatIDR(item.costPrice)} <span className="text-[10px] text-[#8C7B6C]">/{item.unit}</span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-black ${
                            isEmpty
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isEmpty ? (
                            <XCircle className="h-3.5 w-3.5" />
                          ) : isLow ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {item.stock} {item.unit}
                          </span>
                        </span>
                      </td>

                      {/* Min Threshold */}
                      <td className="py-3.5 px-3 text-center text-[#8C7B6C] font-bold">
                        {item.lowStockThreshold} {item.unit}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1 text-[#2D241E] font-medium text-xs">
                          <Building2 className="h-3 w-3 text-[#D97706] shrink-0" />
                          <span className="truncate max-w-[140px]">{item.supplierName || 'Dapur Internal'}</span>
                        </div>
                      </td>

                      {/* Stock Policy Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900" title="Stok hanya dapat ditambah melalui modul Penerimaan Barang">
                          <Layers className="h-3 w-3 text-[#D97706]" />
                          <span>Penerimaan Saja</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            className="rounded-lg p-1.5 text-[#8C7B6C] hover:bg-[#E5DACE] hover:text-[#2D241E] transition"
                            title="Lihat Detail & Petunjuk"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50 transition"
                            title="Edit Master Data"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Master Bahan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DETAIL BAHAN BAKU */}
      {/* ========================================================================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={detailItem.image || RAW_MATERIAL_SAMPLE_IMAGES[0].url}
                  alt={detailItem.name}
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-2xl object-cover border-2 border-[#E5DACE]"
                />
                <div>
                  <span className="font-mono text-xs font-bold text-[#D97706]">{detailItem.sku}</span>
                  <h3 className="text-base font-black text-[#2D241E]">{detailItem.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-xl p-1.5 text-[#8C7B6C] hover:bg-[#FAF8F5]"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5DACE] text-xs">
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold block">Kategori</span>
                <span className="font-bold text-[#2D241E]">{detailItem.category}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold block">Satuan (Unit)</span>
                <span className="font-bold text-[#2D241E]">{detailItem.unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold block">Stok Fisik Saat Ini</span>
                <span className="font-black text-emerald-800 text-sm">
                  {detailItem.stock} {detailItem.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold block">Safety Stock Min</span>
                <span className="font-bold text-[#2D241E]">{detailItem.lowStockThreshold} {detailItem.unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold block">Harga Beli Acuan</span>
                <span className="font-bold text-[#2D241E]">{formatIDR(detailItem.costPrice)} / {detailItem.unit}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8C7B6C] font-bold block">Estimasi Nilai Stok</span>
                <span className="font-black text-amber-900">{formatIDR(detailItem.stock * detailItem.costPrice)}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-[#E5DACE]">
                <span className="text-[10px] text-[#8C7B6C] font-bold block">Pemasok / Supplier</span>
                <span className="font-bold text-[#2D241E]">{detailItem.supplierName || 'Dapur Utama Internal'}</span>
              </div>
            </div>

            {detailItem.description && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C7B6C]">
                  Petunjuk Penyimpanan & Penggunaan:
                </span>
                <p className="text-xs text-[#2D241E] bg-[#FDFBF7] p-3 rounded-xl border border-[#E5DACE]">
                  {detailItem.description}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900 flex items-center justify-between gap-3">
              <span>Ingin menambah stok fisik bahan ini?</span>
              {onNavigateToReceiving && (
                <button
                  type="button"
                  onClick={() => {
                    setDetailItem(null);
                    onNavigateToReceiving();
                  }}
                  className="rounded-lg bg-[#D97706] px-3 py-1 text-xs font-black text-white hover:bg-amber-700 whitespace-nowrap"
                >
                  Penerimaan Barang &rarr;
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-xl border-2 border-[#E5DACE] bg-white px-5 py-2 text-xs font-bold text-[#2D241E] hover:bg-[#FAF8F5]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT MASTER BAHAN BAKU */}
      {/* ========================================================================= */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5DACE] pb-3">
              <h3 className="text-sm font-black text-[#2D241E]">
                Edit Master Bahan Baku: {editItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="rounded-xl p-1.5 text-[#8C7B6C] hover:bg-[#FAF8F5]"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D241E]">Nama Bahan Baku *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Kode SKU *</label>
                  <input
                    type="text"
                    required
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none uppercase font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  >
                    {RAW_MATERIAL_CATEGORIES.filter((c) => c !== 'Semua Kategori').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Harga Acuan Beli (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#2D241E]">Batas Min Stok ({editUnit})</label>
                  <input
                    type="number"
                    min={0}
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D241E]">Supplier Pemasok</label>
                <select
                  value={editSupplierId}
                  onChange={(e) => setEditSupplierId(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-bold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                >
                  <option value="internal">🏠 Dapur Utama Sendiri (Produksi Internal)</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      🏷️ {sup.name} ({sup.category || 'Supplier'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2D241E]">Petunjuk Penyimpanan</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5DACE] bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-[#2D241E] focus:border-[#D97706] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="rounded-xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#2D241E] hover:bg-[#FAF8F5]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white hover:bg-amber-700"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
