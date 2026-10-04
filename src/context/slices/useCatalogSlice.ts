import { useEffect, useState } from 'react';
import { MasterCategory, ProductCategoryItem, RawMaterial } from '../../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_MASTER_CATEGORIES,
  INITIAL_RAW_MATERIALS,
} from '../../data/mockData';
import { posSound } from '../../utils/formatters';
import type { AddAuditFn } from './sliceTypes';

export type { AddAuditFn };

interface UseCatalogSliceDeps {
  selectedBranchId: string;
  currentUserName: string;
  addAudit: AddAuditFn;
}

/**
 * Catalog master-data slice of the POS store.
 *
 * Owns: product categories (POS-US-028), HQ master categories and raw materials
 * (Bahan Baku) — their state, localStorage persistence and CRUD actions.
 * Extracted verbatim from POSContext so the provider no longer carries this
 * domain. Depends only on the current branch id, the current user's display
 * name, and the shared `addAudit` logger.
 */
export function useCatalogSlice({ selectedBranchId, currentUserName, addAudit }: UseCatalogSliceDeps) {
  // Category Master (POS-US-028)
  const [categories, setCategories] = useState<ProductCategoryItem[]>(() => {
    const saved = localStorage.getItem('pos_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seen = new Set<string>();
          const result: ProductCategoryItem[] = [];
          for (const item of parsed) {
            if (item && item.id && !seen.has(item.id)) {
              seen.add(item.id);
              result.push(item);
            }
          }
          return result;
        }
      } catch {}
    }
    return INITIAL_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('pos_categories', JSON.stringify(categories));
  }, [categories]);

  // Master Kategori - Central Category Master (POS-HQ)
  const [masterCategories, setMasterCategories] = useState<MasterCategory[]>(() => {
    const saved = localStorage.getItem('pos_master_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_MASTER_CATEGORIES;
  });

  useEffect(() => {
    localStorage.setItem('pos_master_categories', JSON.stringify(masterCategories));
  }, [masterCategories]);

  // Raw Materials Master (Bahan Baku)
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(() => {
    const saved = localStorage.getItem('pos_raw_materials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_RAW_MATERIALS;
  });

  useEffect(() => {
    localStorage.setItem('pos_raw_materials', JSON.stringify(rawMaterials));
  }, [rawMaterials]);

  // Product Category Master (POS-US-028)
  const addCategory = (name: string, description?: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, message: 'Nama kategori produk tidak boleh kosong!' };
    }
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      return { success: false, message: `Kategori "${trimmed}" sudah ada!` };
    }

    const id = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newCat: ProductCategoryItem = {
      id,
      name: trimmed,
      branchId: selectedBranchId,
      description: description?.trim() || undefined,
      icon: '🏷️',
    };

    setCategories((prev) => [...prev, newCat]);
    addAudit(
      'CATEGORY_CREATE',
      'category',
      id,
      `Kategori produk baru dibuat: "${trimmed}" oleh ${currentUserName}`
    );
    posSound.beep();
    return { success: true, category: newCat, message: `Kategori "${trimmed}" berhasil dibuat!` };
  };

  // Master Kategori Management (Central HQ Master)
  const addMasterCategory = (data: Omit<MasterCategory, 'createdAt'>) => {
    const trimmedId = data.id.trim().toUpperCase();
    const trimmedName = data.name.trim();

    if (!trimmedId) {
      posSound.error();
      return { success: false, message: 'ID Master Kategori wajib diisi!' };
    }
    if (!trimmedName) {
      posSound.error();
      return { success: false, message: 'Nama Kategori wajib diisi!' };
    }
    if (!data.categoryType) {
      posSound.error();
      return { success: false, message: 'Pilih tipe kategori (KONSINYASI/PRODUKSI/BELI (RESELLER))!' };
    }
    if (!data.branchIds || data.branchIds.length === 0) {
      posSound.error();
      return { success: false, message: 'Pilih minimal satu Cabang untuk kategori ini!' };
    }

    const isDuplicate = masterCategories.some(
      (c) => c.id.toLowerCase() === trimmedId.toLowerCase()
    );
    if (isDuplicate) {
      posSound.error();
      return { success: false, message: `ID Kategori '${trimmedId}' sudah digunakan!` };
    }

    const newCat: MasterCategory = {
      id: trimmedId,
      name: trimmedName,
      categoryType: data.categoryType,
      branchIds: data.branchIds,
      description: data.description?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    setMasterCategories((prev) => [newCat, ...prev]);
    addAudit(
      'MASTER_CATEGORY_CREATE',
      'category',
      trimmedId,
      `Master Kategori baru '${newCat.name}' (${newCat.id}) tipe ${newCat.categoryType} dibuat oleh ${currentUserName}`
    );
    posSound.success();
    return {
      success: true,
      category: newCat,
      message: `Master Kategori '${newCat.name}' (${newCat.id}) berhasil dibuat!`,
    };
  };

  const updateMasterCategory = (id: string, data: Partial<MasterCategory>) => {
    const target = masterCategories.find((c) => c.id === id);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Data Master Kategori tidak ditemukan!' };
    }

    setMasterCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...data,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    addAudit(
      'MASTER_CATEGORY_UPDATE',
      'category',
      id,
      `Master Kategori '${target.name}' (${id}) diperbarui oleh ${currentUserName}`
    );
    posSound.beep();
    return { success: true, message: 'Master Kategori berhasil diperbarui!' };
  };

  const deleteMasterCategory = (id: string) => {
    const target = masterCategories.find((c) => c.id === id);
    if (!target) {
      posSound.error();
      return { success: false, message: 'Data Master Kategori tidak ditemukan!' };
    }

    setMasterCategories((prev) => prev.filter((c) => c.id !== id));
    addAudit(
      'MASTER_CATEGORY_DELETE',
      'category',
      id,
      `Master Kategori '${target.name}' (${id}) dihapus oleh ${currentUserName}`
    );
    posSound.beep();
    return { success: true, message: `Master Kategori '${target.name}' berhasil dihapus!` };
  };

  // Raw Material Master (Bahan Baku)
  const addRawMaterial = (data: Omit<RawMaterial, 'id' | 'createdAt' | 'updatedAt'>) => {
    const trimmedName = data.name.trim();
    const trimmedSku = data.sku.trim().toUpperCase();

    if (!trimmedName) {
      return { success: false, message: 'Nama bahan baku wajib diisi!' };
    }
    if (!trimmedSku) {
      return { success: false, message: 'Kode SKU bahan baku wajib diisi!' };
    }

    const isDuplicateSku = rawMaterials.some(
      (r) => r.sku.toLowerCase() === trimmedSku.toLowerCase()
    );
    if (isDuplicateSku) {
      return { success: false, message: `Kode SKU "${trimmedSku}" sudah terdaftar!` };
    }

    const id = 'raw-' + Date.now().toString().slice(-6);
    const newRaw: RawMaterial = {
      ...data,
      id,
      name: trimmedName,
      sku: trimmedSku,
      branchId: selectedBranchId,
      stock: 0, // Strict rule: starts at 0, must be added through penerimaan barang
      createdAt: new Date().toISOString(),
    };

    setRawMaterials((prev) => [newRaw, ...prev]);

    addAudit(
      'STOCK_ADJUSTMENT',
      'product',
      id,
      `Master Bahan Baku baru: ${newRaw.name} (SKU: ${newRaw.sku}), Kategori: ${newRaw.category}, Stok: 0 (Menunggu Penerimaan Barang)`
    );
    posSound.beep();
    return { success: true, rawMaterial: newRaw, message: `Bahan baku "${newRaw.name}" berhasil ditambahkan!` };
  };

  const updateRawMaterial = (id: string, data: Partial<RawMaterial>) => {
    const exists = rawMaterials.find((r) => r.id === id);
    if (!exists) {
      return { success: false, message: 'Bahan baku tidak ditemukan!' };
    }
    if (data.sku && data.sku.trim().toUpperCase() !== exists.sku) {
      const duplicate = rawMaterials.some(
        (r) => r.id !== id && r.sku.toLowerCase() === data.sku?.trim().toLowerCase()
      );
      if (duplicate) {
        return { success: false, message: `Kode SKU "${data.sku}" sudah digunakan!` };
      }
    }
    setRawMaterials((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, ...data, updatedAt: new Date().toISOString() }
          : r
      )
    );
    return { success: true, message: 'Data bahan baku berhasil diperbarui!' };
  };

  const deleteRawMaterial = (id: string) => {
    setRawMaterials((prev) => prev.filter((r) => r.id !== id));
    return { success: true, message: 'Bahan baku berhasil dihapus!' };
  };

  return {
    categories,
    masterCategories,
    rawMaterials,
    setRawMaterials,
    addCategory,
    addMasterCategory,
    updateMasterCategory,
    deleteMasterCategory,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
  };
}
