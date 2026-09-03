import React, { useState } from 'react';
import { Tag, X, Check, Sparkles, FolderPlus } from 'lucide-react';
import { usePOS } from '../context/POSContext';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (categoryId: string) => void;
}

const PRESET_ICONS = ['🍞', '🥐', '🥖', '🍰', '🍪', '☕', '🎂', '🍙', '🥪', '🧁', '🍩', '🥧'];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryCreated,
}) => {
  const { addCategory, categories } = usePOS();
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🏷️');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = categoryName.trim();
    if (!trimmed) {
      setErrorMsg('Nama kategori produk tidak boleh kosong!');
      return;
    }

    const res = addCategory(trimmed, description);
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setSuccessMsg(res.message);
    if (res.category && onCategoryCreated) {
      onCategoryCreated(res.category.id);
    }
    setTimeout(() => {
      setCategoryName('');
      setDescription('');
      setErrorMsg('');
      setSuccessMsg('');
      onClose();
    }, 800);
  };

  return (
    <div
      id="add-category-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        id="add-category-modal-card"
        className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-[#FDFBF7] border-2 border-[#E5DACE] shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#E5DACE] bg-amber-100/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-sm font-bold text-lg">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#2D241E]">Tambah Kategori Produk</h3>
              <p className="text-xs text-[#8C7B6C] font-semibold">Master Kategori (POS-US-028)</p>
            </div>
          </div>
          <button
            id="close-add-category-btn"
            onClick={onClose}
            className="rounded-xl p-2 text-[#8C7B6C] hover:bg-[#E5DACE] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
              {successMsg}
            </div>
          )}

          {/* Category Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Nama Kategori <span className="text-rose-500">*</span>
            </label>
            <input
              id="category-name-input"
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Contoh: Kue Tradisional, Donat & Bomboloni"
              className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2.5 text-sm font-bold text-[#2D241E] placeholder:text-[#8C7B6C]/60 focus:border-[#D97706] focus:outline-none"
              autoFocus
            />
            <p className="text-[11px] text-[#8C7B6C]">
              Nama kategori harus unik (tidak boleh sama dengan yang sudah ada).
            </p>
          </div>

          {/* Icon Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Ikon Emoji Visual
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 text-lg transition ${
                    selectedIcon === icon
                      ? 'border-[#D97706] bg-amber-100/70 scale-110 shadow-sm'
                      : 'border-[#E5DACE] bg-white hover:bg-[#FDFBF7]'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#8C7B6C]">
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              id="category-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Aneka snack pasar khas nusantara gurih & manis"
              className="w-full rounded-2xl border-2 border-[#E5DACE] bg-white px-4 py-2 text-xs font-semibold text-[#2D241E] placeholder:text-[#8C7B6C]/60 focus:border-[#D97706] focus:outline-none"
            />
          </div>

          {/* Existing Categories Preview */}
          <div className="rounded-2xl border-2 border-[#E5DACE] bg-white p-3 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#8C7B6C]">
              Kategori Aktif Saat Ini ({categories.filter((c) => c.id !== 'all').length}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {categories
                .filter((c) => c.id !== 'all')
                .map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#FDFBF7] border border-[#E5DACE] px-2 py-0.5 text-[11px] font-bold text-[#2D241E]"
                  >
                    <span>{c.icon || '🏷️'}</span>
                    <span>{c.name}</span>
                  </span>
                ))}
            </div>
          </div>

          {/* Actions (POS-US-040: primary before Close) */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5DACE]">
            <button
              id="submit-create-category-btn"
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-[#D97706] px-5 py-2 text-xs font-black text-white shadow-xs hover:bg-amber-700 active:scale-95 transition"
            >
              <Check className="h-4 w-4" />
              <span>Simpan Kategori</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#E5DACE] bg-white px-4 py-2 text-xs font-bold text-[#8C7B6C] hover:bg-[#E5DACE] active:scale-95 transition"
            >
              Tutup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
