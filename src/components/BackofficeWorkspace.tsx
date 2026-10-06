import React, { useState } from 'react';
import {
  Building2,
  Store,
  Users,
  Shield,
  FileText,
  Plus,
  Edit2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Check,
  X,
  Clock,
  MapPin,
  Phone,
  Layers,
  ShoppingBag,
  Truck,
  Tag,
  Eye,
  Info,
  ChevronRight,
  ShieldCheck,
  Filter,
  ClipboardList,
  Database,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { StoreBranch, User, UserRole, Customer, Product, ProductCategoryItem, AuditLog, ProductStatus } from '../types';
import { FIXED_ROLE_MATRIX, STORE_INFO } from '../data/mockData';
import { formatIDR, formatDateTime } from '../utils/formatters';
import { PurchasePlanWorkspace } from './PurchasePlanWorkspace';
import { MasterCategoryWorkspace } from './MasterCategoryWorkspace';
import { SupplierManagementWorkspace } from './SupplierManagementWorkspace';

type BackofficeTab = 'branches' | 'access' | 'master_data' | 'audit' | 'purchase_plans' | 'master_categories' | 'suppliers';

export const BackofficeWorkspace: React.FC = () => {
  const {
    currentUser,
    branches,
    selectedBranchId,
    selectedBranch,
    isBranchReadOnly,
    selectBranch,
    addBranch,
    updateBranch,
    toggleBranchStatus,
    users,
    addUser,
    updateUser,
    products,
    addProduct,
    categories,
    addCategory,
    suppliers,
    customers,
    addCustomer,
    auditLogs,
    masterCategories,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<BackofficeTab>('branches');
  const [accessSubTab, setAccessSubTab] = useState<'users' | 'matrix'>('users');
  const [masterDataType, setMasterDataType] = useState<'products' | 'categories' | 'customers'>('products');

  // Branch Modal / Drawer State
  const [isBranchDrawerOpen, setIsBranchDrawerOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<StoreBranch | null>(null);
  const [branchFormCode, setBranchFormCode] = useState('');
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormAddress, setBranchFormAddress] = useState('');
  const [branchFormCity, setBranchFormCity] = useState('Jakarta Selatan');
  const [branchFormPhone, setBranchFormPhone] = useState('');
  const [branchFormHours, setBranchFormHours] = useState('07:00 - 22:00');
  const [branchFormReceiptHeader, setBranchFormReceiptHeader] = useState('');
  const [branchFormError, setBranchFormError] = useState('');

  // User Edit Modal / Drawer State
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>('cashier');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPin, setUserFormPin] = useState('1234');
  const [userFormBranches, setUserFormBranches] = useState<string[]>([]);
  const [userFormStatus, setUserFormStatus] = useState<'active' | 'inactive'>('active');
  const [userFormError, setUserFormError] = useState('');

  // Master Data Add Modals
  const [isAddMasterModalOpen, setIsAddMasterModalOpen] = useState(false);

  // New Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // New Product form (WITHOUT Stok Awal / stock quantity input)
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodMasterCategoryId, setProdMasterCategoryId] = useState<string>(masterCategories[0]?.id || '');
  const [prodCategory, setProdCategory] = useState(categories[0]?.id || 'roti');
  const [prodPrice, setProdPrice] = useState('15000');
  const [prodThreshold, setProdThreshold] = useState('5');
  const [prodStatus, setProdStatus] = useState<ProductStatus>('active');
  const [prodOwnership, setProdOwnership] = useState<'own' | 'consignment'>('own');
  const [prodSupplierId, setProdSupplierId] = useState('');

  // New Customer form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custCategory, setCustCategory] = useState<'Retail' | 'Corporate' | 'Individual'>('Retail');

  // Audit search & filter
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  // Guard: Superadmin check
  if (currentUser.role !== 'admin') {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl border border-gray-100">
          <Shield className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-4 text-lg font-bold text-gray-900">Akses Dibatasi</h2>
          <p className="mt-2 text-xs text-gray-600">
            Halaman Backoffice khusus diperuntukkan bagi Superadmin. Akun Anda ({currentUser.name} - {currentUser.role}) tidak memiliki izin akses.
          </p>
        </div>
      </div>
    );
  }

  // Handle Branch Drawer Open
  const handleOpenBranchDrawer = (branch?: StoreBranch) => {
    setBranchFormError('');
    if (branch) {
      setEditingBranch(branch);
      setBranchFormCode(branch.code);
      setBranchFormName(branch.name);
      setBranchFormAddress(branch.address);
      setBranchFormCity(branch.city);
      setBranchFormPhone(branch.phone || '');
      setBranchFormHours(branch.operatingHours);
      setBranchFormReceiptHeader(branch.receiptHeader || '');
    } else {
      setEditingBranch(null);
      const nextCode = `CAB-0${branches.length + 1}`;
      setBranchFormCode(nextCode);
      setBranchFormName('');
      setBranchFormAddress('');
      setBranchFormCity('Jakarta Selatan');
      setBranchFormPhone('');
      setBranchFormHours('07:00 - 22:00');
      setBranchFormReceiptHeader('SweetCrust Bakery — Outlet Resmi');
    }
    setIsBranchDrawerOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    setBranchFormError('');

    if (!branchFormName.trim()) {
      setBranchFormError('Nama cabang wajib diisi!');
      return;
    }
    if (!branchFormCode.trim()) {
      setBranchFormError('Kode cabang wajib diisi!');
      return;
    }

    if (editingBranch) {
      const res = updateBranch(editingBranch.id, {
        code: branchFormCode.trim().toUpperCase(),
        name: branchFormName.trim(),
        address: branchFormAddress.trim(),
        city: branchFormCity.trim(),
        phone: branchFormPhone.trim() || undefined,
        operatingHours: branchFormHours.trim(),
        receiptHeader: branchFormReceiptHeader.trim() || undefined,
      });
      if (!res.success) {
        setBranchFormError(res.message);
        return;
      }
    } else {
      const res = addBranch({
        code: branchFormCode.trim().toUpperCase(),
        name: branchFormName.trim(),
        address: branchFormAddress.trim(),
        city: branchFormCity.trim(),
        phone: branchFormPhone.trim() || undefined,
        operatingHours: branchFormHours.trim(),
        receiptHeader: branchFormReceiptHeader.trim() || undefined,
        status: 'active',
      });
      if (!res.success) {
        setBranchFormError(res.message);
        return;
      }
    }

    setIsBranchDrawerOpen(false);
  };

  // Handle User Drawer Open
  const handleOpenUserDrawer = (user?: User) => {
    setUserFormError('');
    if (user) {
      setEditingUser(user);
      setUserFormName(user.name);
      setUserFormRole(user.role);
      setUserFormEmail(user.email || '');
      setUserFormPin(user.pin);
      setUserFormBranches(user.assignedBranchIds || []);
      setUserFormStatus(user.status);
    } else {
      setEditingUser(null);
      setUserFormName('');
      setUserFormRole('cashier');
      setUserFormEmail('');
      setUserFormPin('1234');
      setUserFormBranches([selectedBranchId]);
      setUserFormStatus('active');
    }
    setIsUserDrawerOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    if (!userFormName.trim()) {
      setUserFormError('Nama pengguna wajib diisi!');
      return;
    }
    if (userFormPin.length !== 4) {
      setUserFormError('PIN harus tepat 4 digit!');
      return;
    }
    if (userFormBranches.length === 0) {
      setUserFormError('Pilih minimal 1 cabang penugasan!');
      return;
    }

    if (editingUser) {
      const res = updateUser(editingUser.id, {
        name: userFormName.trim(),
        role: userFormRole,
        email: userFormEmail.trim() || undefined,
        pin: userFormPin,
        assignedBranchIds: userFormBranches,
        status: userFormStatus,
      });
      if (!res.success) {
        setUserFormError(res.message);
        return;
      }
    } else {
      const res = addUser({
        name: userFormName.trim(),
        role: userFormRole,
        email: userFormEmail.trim() || undefined,
        pin: userFormPin,
        assignedBranchIds: userFormBranches,
        status: userFormStatus,
      });
      if (!res.success) {
        setUserFormError(res.message);
        return;
      }
    }

    setIsUserDrawerOpen(false);
  };

  // Handle Save Master Data
  const handleSaveMasterData = (e: React.FormEvent) => {
    e.preventDefault();

    if (masterDataType === 'categories') {
      if (!catName.trim()) return;
      addCategory(catName.trim(), catDesc.trim());
      setCatName('');
      setCatDesc('');
    } else if (masterDataType === 'products') {
      if (!prodName.trim()) return;
      const catObj = categories.find((c) => c.id === prodCategory);
      const masterCategory = masterCategories.find((category) => category.id === prodMasterCategoryId);
      const linkedSuppliers = suppliers.filter((supplier) =>
        supplier.masterCategoryId === prodMasterCategoryId &&
        (masterCategory?.categoryType === 'PRODUKSI' ? supplier.isInternal : !supplier.isInternal)
      );
      const supObj = linkedSuppliers.find((supplier) => supplier.id === prodSupplierId);
      if (!masterCategory || !supObj) return;

      addProduct({
        name: prodName.trim(),
        masterCategoryId: masterCategory.id,
        category: prodCategory,
        categoryLabel: catObj ? catObj.name : 'Roti Manis',
        price: parseInt(prodPrice, 10) || 0,
        isPriceCustomizable: false,
        stock: 0, // Strictly 0 stock on product creation
        lowStockThreshold: parseInt(prodThreshold, 10) || 5,
        isMadeToOrder: false,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
        ownershipType: masterCategory.categoryType === 'KONSINYASI' ? 'consignment' : 'own',
        supplierId: supObj.id,
        supplierName: supObj.name,
        status: prodStatus,
      });
      setProdName('');
      setProdSku('');
    } else if (masterDataType === 'customers') {
      if (!custName.trim()) return;
      addCustomer({
        name: custName.trim(),
        phone: custPhone.trim() || undefined,
        email: custEmail.trim() || undefined,
        category: custCategory,
        depositBalance: 0,
      });
      setCustName('');
      setCustPhone('');
      setCustEmail('');
    }

    setIsAddMasterModalOpen(false);
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.actorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.entityType.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-gray-50/60">
      {/* Top Backoffice Navigation Bar - Static & Sticky */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4 shadow-xs z-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900 tracking-wider uppercase">
                Backoffice HQ
              </span>
              <span className="text-xs font-bold text-gray-500">
                Akses Terpusat Superadmin
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-gray-900">
              Pusat Manajemen Multi-Cabang & Akses
            </h1>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 p-1.5">
            <button
              id="backoffice-tab-branches"
              type="button"
              onClick={() => setActiveTab('branches')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'branches'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>Cabang Toko</span>
            </button>

            <button
              id="backoffice-tab-access"
              type="button"
              onClick={() => setActiveTab('access')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'access'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Access Settings (RBAC)</span>
            </button>

            <button
              id="backoffice-tab-master-data"
              type="button"
              onClick={() => setActiveTab('master_data')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'master_data'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Master Data</span>
            </button>

            <button
              id="backoffice-tab-audit"
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'audit'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Audit Log Cabang</span>
            </button>

            {currentUser.role === 'admin' && (
              <>
                <button
                  id="backoffice-tab-purchase-plans"
                  type="button"
                  onClick={() => setActiveTab('purchase_plans')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    activeTab === 'purchase_plans'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Rencana Pembelian</span>
                </button>

                <button
                  id="backoffice-tab-master-categories"
                  type="button"
                  onClick={() => setActiveTab('master_categories')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    activeTab === 'master_categories'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  <span>Master Kategori</span>
                </button>

                <button
                  id="backoffice-tab-suppliers"
                  type="button"
                  onClick={() => setActiveTab('suppliers')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                    activeTab === 'suppliers'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Mitra Supplier</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Fully Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 pb-28 scrollbar-thin">
        <div className="mx-auto w-full max-w-7xl">
        {/* ================= TAB: STORE BRANCHES (ROWS VIEW) ================= */}
        {activeTab === 'branches' && (
          <div className="space-y-6">
            {/* Header with Add Branch Button */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Daftar Cabang Toko</h2>
                <p className="text-xs text-gray-500">
                  Superadmin dapat menambah cabang baru, mengubah informasi operasional, dan mengatur status cabang.
                </p>
              </div>
              <button
                id="add-branch-btn"
                type="button"
                onClick={() => handleOpenBranchDrawer()}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm active:scale-95 transition"
              >
                <Plus className="h-4 w-4" />
                <span>+ Tambah Cabang Baru</span>
              </button>
            </div>

            {/* Branch List in Rows / Table */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-[#FAF8F5] border-b border-gray-200 text-[11px] font-black uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-5 py-4">Kode & Nama Cabang</th>
                      <th className="px-5 py-4">Alamat & Kota</th>
                      <th className="px-5 py-4">Jam Buka & Kontak</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Cabang Aktif</th>
                      <th className="px-5 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-medium">
                    {branches.map((b) => {
                      const isSelected = selectedBranchId === b.id;
                      const isInactive = b.status === 'inactive';

                      return (
                        <tr
                          key={b.id}
                          id={`backoffice-branch-row-${b.id}`}
                          className={`transition hover:bg-amber-50/20 ${
                            isSelected ? 'bg-amber-50/40' : isInactive ? 'bg-gray-50/50' : ''
                          }`}
                        >
                          {/* Kode & Nama */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="shrink-0 rounded-xl bg-gray-100 px-2.5 py-1 font-mono font-black text-xs text-gray-800 border border-gray-200">
                                {b.code}
                              </span>
                              <div>
                                <div className="font-bold text-gray-900 text-sm">{b.name}</div>
                                {b.receiptHeader && (
                                  <div className="text-[11px] text-gray-400 truncate max-w-xs mt-0.5">
                                    Struk: &ldquo;{b.receiptHeader}&rdquo;
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Alamat & Kota */}
                          <td className="px-5 py-4">
                            <div className="flex items-start gap-1.5 max-w-xs">
                              <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold text-gray-900">{b.city}</span>
                                <div className="text-[11px] text-gray-500 leading-tight mt-0.5">{b.address}</div>
                              </div>
                            </div>
                          </td>

                          {/* Jam Buka & Telepon */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span>{b.operatingHours}</span>
                              </div>
                              {b.phone && (
                                <div className="flex items-center gap-1.5 text-gray-500">
                                  <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  <span>{b.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            {isInactive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 border border-rose-200">
                                <Lock className="h-3 w-3" />
                                Nonaktif (Read-only)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Aktif
                              </span>
                            )}
                          </td>

                          {/* Cabang Terpilih */}
                          <td className="px-5 py-4 text-center">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900 border border-amber-300 shadow-2xs">
                                <Check className="h-4 w-4 text-amber-700" />
                                Terpilih
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => selectBranch(b.id)}
                                className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 active:scale-95 transition"
                              >
                                Pilih Cabang
                              </button>
                            )}
                          </td>

                          {/* Aksi */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenBranchDrawer(b)}
                                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition shadow-2xs"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleBranchStatus(b.id)}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition active:scale-95 shadow-2xs ${
                                  isInactive
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                }`}
                              >
                                {isInactive ? 'Aktifkan' : 'Nonaktifkan'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: ACCESS SETTINGS (RBAC) ================= */}
        {activeTab === 'access' && (
          <div className="space-y-6">
            {/* Header with Sub-tabs and Add User Button */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">Pengaturan Akses Pengguna (RBAC)</h2>
                <p className="text-xs text-gray-500">
                  Kelola direktori user kasir/supervisor serta tinjau matriks hak akses 3-role tetap.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setAccessSubTab('users')}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      accessSubTab === 'users'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Daftar Pengguna ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessSubTab('matrix')}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      accessSubTab === 'matrix'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Matriks Hak Akses (Fixed Matrix)
                  </button>
                </div>

                {accessSubTab === 'users' && (
                  <button
                    id="add-user-btn"
                    type="button"
                    onClick={() => handleOpenUserDrawer()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-sm active:scale-95 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Tambah User</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-tab 1: Users Directory */}
            {accessSubTab === 'users' && (
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Nama Pengguna</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Email / Login</th>
                        <th className="px-6 py-4">Penugasan Cabang</th>
                        <th className="px-6 py-4">PIN Akses</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {users.map((u) => {
                        const assignedBranchNames = (u.assignedBranchIds || [])
                          .map((bid) => branches.find((b) => b.id === bid)?.name || bid)
                          .join(', ');

                        return (
                          <tr key={u.id} className="hover:bg-gray-50/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {u.avatar ? (
                                  <img
                                    src={u.avatar}
                                    alt={u.name}
                                    className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">
                                    {u.name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-bold text-gray-900">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                                  u.role === 'admin'
                                    ? 'bg-amber-100 text-amber-900'
                                    : u.role === 'supervisor'
                                    ? 'bg-purple-100 text-purple-900'
                                    : 'bg-blue-100 text-blue-900'
                                }`}
                              >
                                {u.role === 'admin' ? 'Superadmin' : u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">{u.email || '-'}</td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-800">
                                {assignedBranchNames || 'Semua Cabang'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold tracking-widest text-gray-600">
                              •••• ({u.pin})
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  u.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenUserDrawer(u)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
                              >
                                Edit Akses
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-tab 2: Fixed Role Matrix */}
            {accessSubTab === 'matrix' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Fixed Role-Based Access Matrix:</strong> Hak akses sistem dibagi ke dalam 3 role terstandarisasi. Kasir terikat pada sesi cabang tunggal, Supervisor wajib memilih 1 cabang aktif yang ditugaskan, dan Superadmin mengelola seluruh cabang & backoffice.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {FIXED_ROLE_MATRIX.map((m) => (
                    <div
                      key={m.role}
                      className="flex flex-col justify-between rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-xs"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span
                            className={`rounded-xl px-3 py-1 text-xs font-black uppercase tracking-wider ${
                              m.role === 'admin'
                                ? 'bg-amber-100 text-amber-900'
                                : m.role === 'supervisor'
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-blue-100 text-blue-900'
                            }`}
                          >
                            {m.roleLabel}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{m.roleLabel}</h4>
                          <p className="mt-1 text-xs text-gray-500">{m.description}</p>
                        </div>

                        <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
                          <div className="font-bold text-gray-700">Cakupan Cabang:</div>
                          <div className="rounded-xl bg-gray-50 p-2.5 text-gray-600 text-[11px] font-semibold">
                            {m.branchScope}
                          </div>
                        </div>

                        <div className="space-y-2 border-t border-gray-100 pt-3 text-xs">
                          <div className="font-bold text-gray-700">Workspace yang Dapat Diakses:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {m.workspaces.map((w, idx) => (
                              <span
                                key={idx}
                                className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700"
                              >
                                {w}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 border-t border-gray-100 pt-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Kelola Cabang:</span>
                          <span className={`font-bold ${m.canManageBranches ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {m.canManageBranches ? 'Ya (Superadmin)' : 'Tidak'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Kelola User (RBAC):</span>
                          <span className={`font-bold ${m.canManageUsers ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {m.canManageUsers ? 'Ya (Superadmin)' : 'Tidak'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Edit Master Data:</span>
                          <span className={`font-bold ${m.canEditMasterData ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {m.canEditMasterData ? 'Ya (Cabang Aktif)' : 'Hanya Penerimaan'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: MASTER DATA ================= */}
        {activeTab === 'master_data' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900">
                      Master Data Cabang: {selectedBranch?.name}
                    </h3>
                    <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900 border border-amber-200">
                      {selectedBranch?.code}
                    </span>
                    {isBranchReadOnly && (
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                        Read-only (Cabang Nonaktif)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Master data terpisah per cabang. Superadmin hanya dapat menambah/mengubah master data pada cabang aktif.
                  </p>
                </div>

                {/* Master Data Type Tabs */}
                <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setMasterDataType('products')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      masterDataType === 'products'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Produk ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMasterDataType('categories')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      masterDataType === 'categories'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Kategori ({categories.filter((c) => c.id !== 'all').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMasterDataType('customers')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      masterDataType === 'customers'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Pelanggan ({customers.filter((c) => c.id !== 'cust-walkin').length})
                  </button>
                </div>
              </div>

              {/* Read-only Alert if inactive */}
              {isBranchReadOnly && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 flex items-center gap-3">
                  <Lock className="h-5 w-5 text-rose-600 shrink-0" />
                  <div>
                    <strong className="font-bold">Mode Baca Saja (Read-only):</strong> Cabang ini sedang berstatus nonaktif. Seluruh penambahan dan perubahan master data dikunci demi keamanan integritas arsip data.
                  </div>
                </div>
              )}

              {/* Master Data Action & Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Daftar {masterDataType.toUpperCase()} Cabang {selectedBranch?.code}
                  </span>
                  {!isBranchReadOnly && (
                    <button
                      id="add-master-data-btn"
                      type="button"
                      onClick={() => setIsAddMasterModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition active:scale-95 shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Tambah {masterDataType === 'products' ? 'Produk (Stok 0)' : masterDataType === 'categories' ? 'Kategori' : 'Pelanggan'}</span>
                    </button>
                  )}
                </div>

                {/* Table for Products */}
                {masterDataType === 'products' && (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-[#FAF8F5] text-[11px] font-black uppercase tracking-wider text-gray-600 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">SKU</th>
                          <th className="px-4 py-3">Nama Produk</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Harga Jual</th>
                          <th className="px-4 py-3">Stok Saat Ini</th>
                          <th className="px-4 py-3">Kepemilikan</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {products.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                              Belum ada master produk pada cabang ini.
                            </td>
                          </tr>
                        ) : (
                          products.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-mono font-bold text-gray-900">{p.sku}</td>
                              <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                              <td className="px-4 py-3">{p.categoryLabel}</td>
                              <td className="px-4 py-3 font-bold text-amber-900">{formatIDR(p.price)}</td>
                              <td className="px-4 py-3">
                                <span className={`font-bold ${p.stock <= p.lowStockThreshold ? 'text-rose-600' : 'text-gray-900'}`}>
                                  {p.stock} Pcs
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {p.ownershipType === 'consignment' ? (
                                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                                    Konsinyasi ({p.supplierName || 'Mitra'})
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                                    Milik Sendiri
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                  p.status === 'inactive'
                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {p.status === 'inactive' ? 'Inactive' : 'Active'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table for Categories */}
                {masterDataType === 'categories' && (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-[#FAF8F5] text-[11px] font-black uppercase tracking-wider text-gray-600 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">ID / Kode</th>
                          <th className="px-4 py-3">Nama Kategori</th>
                          <th className="px-4 py-3">Deskripsi</th>
                          <th className="px-4 py-3">Ikon</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {categories
                          .filter((c) => c.id !== 'all')
                          .map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-bold text-gray-900">{c.id}</td>
                              <td className="px-4 py-3 font-bold">{c.name}</td>
                              <td className="px-4 py-3 text-gray-500">{c.description || '-'}</td>
                              <td className="px-4 py-3 text-base">{c.icon || '🏷️'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table for Customers */}
                {masterDataType === 'customers' && (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-[#FAF8F5] text-[11px] font-black uppercase tracking-wider text-gray-600 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">Nama Pelanggan</th>
                          <th className="px-4 py-3">Kategori</th>
                          <th className="px-4 py-3">Telepon</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Saldo Deposit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white font-medium">
                        {customers
                          .filter((c) => c.id !== 'cust-walkin')
                          .map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-3 font-bold text-gray-900">{c.name}</td>
                              <td className="px-4 py-3">
                                <span className="rounded-lg bg-gray-100 px-2 py-0.5 font-bold text-gray-700">
                                  {c.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-500">{c.phone || '-'}</td>
                              <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
                              <td className="px-4 py-3 font-bold text-emerald-800">
                                {formatIDR(c.depositBalance)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: AUDIT LOG ================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Log Audit Terisolasi Cabang: {selectedBranch?.name}
                </h2>
                <p className="text-xs text-gray-500">
                  Semua aktivitas perubahan harga, diskon, stok, dan void pada cabang {selectedBranch?.code}.
                </p>
              </div>

              <div className="relative w-72">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Cari aksi, aktor, atau rincian..."
                  className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Waktu</th>
                      <th className="px-6 py-4">Aktor / Role</th>
                      <th className="px-6 py-4">Aksi</th>
                      <th className="px-6 py-4">Tipe Entitas</th>
                      <th className="px-6 py-4">Rincian Perubahan</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          Tidak ada log audit yang cocok untuk cabang ini.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log, idx) => (
                        <tr key={`${log.id}-${idx}`} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-gray-900">{log.actorName}</span>{' '}
                            <span className="text-[10px] text-gray-400 capitalize">({log.actorRole})</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-black tracking-wider text-gray-800">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 capitalize text-gray-600">{log.entityType}</td>
                          <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{log.details}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedAuditLog(log)}
                              className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: RENCANA PEMBELIAN (SUPERADMIN ONLY) ================= */}
        {activeTab === 'purchase_plans' && (
          <div className="rounded-3xl border-2 border-[#E5DACE] bg-white overflow-hidden shadow-xs min-h-[720px]">
            <PurchasePlanWorkspace />
          </div>
        )}

        {/* ================= TAB 6: MASTER KATEGORI (SUPERADMIN ONLY) ================= */}
        {activeTab === 'master_categories' && (
          <div className="rounded-3xl border-2 border-[#E5DACE] bg-white overflow-hidden shadow-xs min-h-[720px] p-6">
            <MasterCategoryWorkspace />
          </div>
        )}

        {/* ================= TAB 7: MITRA SUPPLIER (SUPERADMIN ONLY) ================= */}
        {activeTab === 'suppliers' && (
          <div className="rounded-3xl border-2 border-[#E5DACE] bg-white overflow-hidden shadow-xs min-h-[720px] p-6">
            <SupplierManagementWorkspace />
          </div>
        )}
        </div>
      </div>

      {/* ================= MODAL / DRAWER: ADD/EDIT BRANCH ================= */}
      {isBranchDrawerOpen && (
        <div className="fixed inset-0 z-[995] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingBranch ? 'Ubah Data Cabang Toko' : 'Tambah Cabang Toko Baru'}
                  </h3>
                  <p className="text-xs text-gray-500">Konfigurasi operasional dan header struk kasir</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchDrawerOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveBranch} className="flex-1 overflow-y-auto p-6 space-y-4">
              {branchFormError && (
                <div className="rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {branchFormError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Kode Cabang *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchFormCode}
                    onChange={(e) => setBranchFormCode(e.target.value)}
                    placeholder="CAB-04"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold uppercase text-gray-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Kota / Wilayah *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchFormCity}
                    onChange={(e) => setBranchFormCity(e.target.value)}
                    placeholder="Jakarta Selatan"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Nama Cabang *
                </label>
                <input
                  type="text"
                  required
                  value={branchFormName}
                  onChange={(e) => setBranchFormName(e.target.value)}
                  placeholder="Contoh: Cabang Pondok Indah"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Alamat Lengkap *
                </label>
                <textarea
                  rows={2}
                  required
                  value={branchFormAddress}
                  onChange={(e) => setBranchFormAddress(e.target.value)}
                  placeholder="Jl. Metro Pondok Indah No. 10..."
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Jam Operasional
                  </label>
                  <input
                    type="text"
                    value={branchFormHours}
                    onChange={(e) => setBranchFormHours(e.target.value)}
                    placeholder="07:00 - 22:00"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Nomor Telepon
                  </label>
                  <input
                    type="text"
                    value={branchFormPhone}
                    onChange={(e) => setBranchFormPhone(e.target.value)}
                    placeholder="021-750-1234"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Header Khusus Struk Kasir
                </label>
                <input
                  type="text"
                  value={branchFormReceiptHeader}
                  onChange={(e) => setBranchFormReceiptHeader(e.target.value)}
                  placeholder="SweetCrust Bakery — Outlet Pondok Indah"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons with Tutup at bottom right */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 active:scale-95 transition shadow-sm"
                >
                  {editingBranch ? 'Simpan Perubahan' : 'Tambah Cabang'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBranchDrawerOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL / DRAWER: ADD/EDIT USER ================= */}
      {isUserDrawerOpen && (
        <div className="fixed inset-0 z-[995] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {editingUser ? 'Ubah Hak Akses Pengguna' : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-xs text-gray-500">Konfigurasi role dan penugasan cabang</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserDrawerOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-4">
              {userFormError && (
                <div className="rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {userFormError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  placeholder="Contoh: Sarah Melati"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Role Pengguna *
                  </label>
                  <select
                    value={userFormRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setUserFormRole(newRole);
                      // If cashier, keep only 1 branch
                      if (newRole === 'cashier' && userFormBranches.length > 1) {
                        setUserFormBranches([userFormBranches[0]]);
                      }
                    }}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="cashier">Kasir (1 Cabang)</option>
                    <option value="supervisor">Supervisor (Multi-Cabang)</option>
                    <option value="admin">Superadmin (Semua Cabang)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    PIN Akses (4 Digit) *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={userFormPin}
                    onChange={(e) => setUserFormPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-mono font-bold tracking-widest text-gray-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Email Akun
                </label>
                <input
                  type="email"
                  value={userFormEmail}
                  onChange={(e) => setUserFormEmail(e.target.value)}
                  placeholder="user@rotinusantara.com"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Branch Assignments */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Penugasan Cabang {userFormRole === 'cashier' ? '(Tepat 1 Cabang)' : '(Pilih Cabang)'} *
                </label>
                <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
                  {branches.map((b) => {
                    const isChecked = Array.isArray(userFormBranches) && userFormBranches.includes(b.id);
                    return (
                      <label key={b.id} className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type={userFormRole === 'cashier' ? 'radio' : 'checkbox'}
                            name="assignedBranch"
                            checked={isChecked}
                            onChange={(e) => {
                              if (userFormRole === 'cashier') {
                                setUserFormBranches([b.id]);
                              } else {
                                if (e.target.checked) {
                                  setUserFormBranches((prev) => [...prev, b.id]);
                                } else {
                                  setUserFormBranches((prev) => prev.filter((id) => id !== b.id));
                                }
                              }
                            }}
                            className="h-4 w-4 rounded accent-amber-600"
                          />
                          <span className="text-xs font-bold text-gray-900">{b.name}</span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">{b.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Status Akun:
                </label>
                <button
                  type="button"
                  onClick={() => setUserFormStatus((prev) => (prev === 'active' ? 'inactive' : 'active'))}
                  className={`rounded-xl px-4 py-1.5 text-xs font-bold transition ${
                    userFormStatus === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {userFormStatus === 'active' ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {/* Action Buttons with Tutup at bottom right */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 active:scale-95 transition shadow-sm"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsUserDrawerOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD MASTER DATA ================= */}
      {isAddMasterModalOpen && (
        <div className="fixed inset-0 z-[995] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-6 py-4">
              <h3 className="text-base font-bold text-gray-900">
                + Tambah {masterDataType === 'products' ? 'Produk Baru' : masterDataType === 'categories' ? 'Kategori Produk' : 'Pelanggan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddMasterModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMasterData} className="flex-1 overflow-y-auto p-6 space-y-4">
              {masterDataType === 'categories' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Nama Kategori *
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Contoh: Roti Tawar Gandum"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Deskripsi Kategori
                    </label>
                    <textarea
                      rows={2}
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      placeholder="Keterangan singkat..."
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {masterDataType === 'products' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Master Kategori *
                    </label>
                    <select
                      required
                      value={prodMasterCategoryId}
                      onChange={(e) => {
                        setProdMasterCategoryId(e.target.value);
                        setProdSupplierId('');
                      }}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                    >
                      {masterCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          [{category.categoryType}] {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Nama Produk *
                    </label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Contoh: Roti Abon Gulung Spesial"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        SKU / Barcode
                      </label>
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500">
                        Dibuat otomatis berdasarkan Supplier saat disimpan.
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Kategori
                      </label>
                      <select
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                      >
                        {categories
                          .filter((c) => c.id !== 'all')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Harga Jual Satuan (IDR) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        required
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Batas Minimum Stok
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prodThreshold}
                        onChange={(e) => setProdThreshold(e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Status Produk
                    </label>
                    <select
                      value={prodStatus}
                      onChange={(e) => setProdStatus(e.target.value as ProductStatus)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="active">Active — dapat dijual</option>
                      <option value="inactive">Inactive — simpan sebagai nonaktif</option>
                    </select>
                  </div>

                  {/* Stock policy notice without any initial stock inputs */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center gap-2">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Stok Awal: 0 Pcs.</strong> Stok baru wajib ditambahkan secara tertib melalui menu <strong>Pembelian & Penerimaan Barang</strong>.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Supplier *
                    </label>
                    <select
                      required
                      value={prodSupplierId}
                      onChange={(e) => setProdSupplierId(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">Pilih Supplier sesuai Master Kategori...</option>
                      {suppliers
                        .filter((supplier) =>
                          supplier.masterCategoryId === prodMasterCategoryId &&
                          (masterCategories.find((category) => category.id === prodMasterCategoryId)?.categoryType === 'PRODUKSI'
                            ? supplier.isInternal
                            : !supplier.isInternal)
                        )
                        .map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.isInternal ? 'Internal' : 'Supplier'}: {supplier.name} ({supplier.id})
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              {masterDataType === 'customers' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Nama Pelanggan *
                    </label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Contoh: Ibu Ratih Sugiarto"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Kategori Pelanggan
                      </label>
                      <select
                        value={custCategory}
                        onChange={(e) => setCustCategory(e.target.value as any)}
                        className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-900 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="Retail">Retail</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Individual">Individual</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Nomor Telepon
                      </label>
                      <input
                        type="text"
                        value={custPhone}
                        onChange={(e) => setCustPhone(e.target.value)}
                        placeholder="0812-9999-8888"
                        className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      Email
                    </label>
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="ratih@gmail.com"
                      className="w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Action Buttons with Tutup at bottom right */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 active:scale-95 transition shadow-sm"
                >
                  Simpan Data
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddMasterModalOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-xs"
                >
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AUDIT DETAIL ================= */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-[995] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
              <h3 className="text-base font-bold text-gray-900">Rincian Log Audit</h3>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-gray-500">ID Log:</span>
                <span className="font-mono text-gray-900">{selectedAuditLog.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500">Waktu:</span>
                <span className="text-gray-900">{formatDateTime(selectedAuditLog.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500">Aktor:</span>
                <span className="font-bold text-gray-900">
                  {selectedAuditLog.actorName} ({selectedAuditLog.actorRole})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500">Aksi:</span>
                <span className="font-bold text-amber-900">{selectedAuditLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-gray-500">Tipe Entitas:</span>
                <span className="capitalize text-gray-900">{selectedAuditLog.entityType}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-1">
                <span className="font-bold text-gray-500">Rincian / Catatan:</span>
                <p className="rounded-2xl bg-gray-50 p-3 text-gray-800 leading-relaxed">
                  {selectedAuditLog.details}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-gray-50/80 px-6 py-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
