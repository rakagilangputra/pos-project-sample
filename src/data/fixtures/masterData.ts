import { StoreBranch, RoleMatrixItem, ProductCategoryItem, MasterCategory, User } from "../../types";

export const INITIAL_BRANCHES: StoreBranch[] = [
  {
    id: "branch-senopati",
    code: "CAB-01",
    name: "Cabang Senopati Utama",
    address: "Jl. Senopati No. 42, Kebayoran Baru",
    city: "Jakarta Selatan",
    phone: "021-555-8822",
    operatingHours: "07:00 - 22:00",
    assignedSupervisorIds: ["usr-3"],
    receiptHeader: "SweetCrust Bakery — Senopati Flagship Store",
    status: "active",
    isMainBranch: true,
    createdAt: "2026-01-01T08:00:00Z",
  },
  {
    id: "branch-kemang",
    code: "CAB-02",
    name: "Cabang Kemang Artisan",
    address: "Jl. Kemang Raya No. 18, Mampang Prapatan",
    city: "Jakarta Selatan",
    phone: "021-719-3344",
    operatingHours: "08:00 - 21:00",
    assignedSupervisorIds: ["usr-3"],
    receiptHeader: "SweetCrust Bakery — Kemang Artisan Boutique",
    status: "active",
    createdAt: "2026-02-15T08:00:00Z",
  },
  {
    id: "branch-bintaro",
    code: "CAB-03",
    name: "Cabang Bintaro Sektor 7 (Tutup)",
    address: "CBD Bintaro Jaya Blok B7/A1, Pondok Aren",
    city: "Tangerang Selatan",
    phone: "021-745-9900",
    operatingHours: "08:00 - 20:00",
    assignedSupervisorIds: [],
    receiptHeader: "SweetCrust Bakery — Bintaro Outlet (Nonaktif)",
    status: "inactive",
    createdAt: "2026-03-01T08:00:00Z",
  },
];


export const FIXED_ROLE_MATRIX: RoleMatrixItem[] = [
  {
    role: "cashier",
    roleLabel: "Kasir",
    description: "Operator transaksi penjualan kasir & PO Made-to-Order pada sesi kasir aktif.",
    branchScope: "Tepat 1 cabang aktif (sesuai sesi kasir, tanpa selector)",
    workspaces: ["Kasir (POS)", "Pesanan (MTO PO)", "Shift & Kas"],
    canManageBranches: false,
    canManageUsers: false,
    canEditMasterData: false,
  },
  {
    role: "supervisor",
    roleLabel: "Supervisor",
    description: "Pengawas operasional toko, pembatalan/void, retur, penerimaan barang, & stok.",
    branchScope: "Cabang aktif yang ditugaskan (wajib pilih 1 cabang setelah login)",
    workspaces: ["Kasir (POS)", "Pesanan (PO MTO)", "Dashboard Operasional", "Stok & Penerimaan", "Konsinyasi"],
    canManageBranches: false,
    canManageUsers: false,
    canEditMasterData: false,
  },
  {
    role: "admin",
    roleLabel: "Superadmin",
    description: "Akses penuh manajemen multi-cabang, konfigurasi akses user, master data, dan audit.",
    branchScope: "Semua cabang aktif & cabang nonaktif (Mode Baca Saja / Read-only)",
    workspaces: ["Semua Workspace Operasional", "Backoffice (Dashboard, Cabang, RBAC, Master Data, Audit)"],
    canManageBranches: true,
    canManageUsers: true,
    canEditMasterData: true,
  },
];


export const INITIAL_CATEGORIES: ProductCategoryItem[] = [
  { id: 'all', branchId: "branch-senopati", name: 'Semua Menu', icon: '🍞' },
  { id: 'roti', branchId: "branch-senopati", name: 'Roti Manis', icon: '🥐', description: 'Roti sisir, abon, dan kreasi manis klasik' },
  { id: 'pastry', branchId: "branch-senopati", name: 'Pastry & Croissant', icon: '🥖', description: 'Pastry renyah berlapis butter premium' },
  { id: 'cake', branchId: "branch-senopati", name: 'Cakes & Tart', icon: '🍰', description: 'Bolu, roll cake, dan tart lembut' },
  { id: 'cookies', branchId: "branch-senopati", name: 'Cookies & Hampers', icon: '🍪', description: 'Kue kering toples & parcel artisan' },
  { id: 'beverage', branchId: "branch-senopati", name: 'Minuman & Kopi', icon: '☕', description: 'Kopi susu gula aren & teh segar' },
  { id: 'custom_cake', branchId: "branch-senopati", name: 'Custom Cake (PO / DP)', icon: '🎂', description: 'Kue ulang tahun dan pesanan khusus' },
  { id: 'snack_tradisional', branchId: "branch-senopati", name: 'Kue Basah & Tradisional', icon: '🍙', description: 'Jajanan pasar dan lemper gurih' },
];


export const INITIAL_MASTER_CATEGORIES: MasterCategory[] = [
  {
    id: 'KAT-PROD-01',
    name: 'Roti Manis & Roti Tawar',
    categoryType: 'PRODUKSI',
    branchIds: ['branch-senopati', 'branch-kemang'],
    description: 'Kategori produk roti produksi in-house dapur utama pusat',
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'KAT-KSN-01',
    name: 'Kue Basah Tradisional',
    categoryType: 'KONSINYASI',
    branchIds: ['branch-senopati'],
    description: 'Produk titipan konsinyasi jajanan pasar dari mitra UMKM lokal',
    createdAt: '2026-02-01T09:30:00Z',
  },
  {
    id: 'KAT-RSL-01',
    name: 'Minuman Kemasan & Botol',
    categoryType: 'BELI (RESELLER)',
    branchIds: ['branch-senopati', 'branch-kemang', 'branch-bintaro'],
    description: 'Produk siap jual dari distributor retail minuman segar',
    createdAt: '2026-02-10T11:15:00Z',
  },
  {
    id: 'KAT-PROD-02',
    name: 'Artisan Pastry & Croissant',
    categoryType: 'PRODUKSI',
    branchIds: ['branch-senopati', 'branch-kemang'],
    description: 'Pastry butter olahan chef pastry in-house',
    createdAt: '2026-02-20T14:00:00Z',
  },
  {
    id: 'KAT-KSN-02',
    name: 'Keripik & Snack Kering UMKM',
    categoryType: 'KONSINYASI',
    branchIds: ['branch-senopati', 'branch-kemang'],
    description: 'Camilan kering kemasan titip jual dari pengrajin lokal',
    createdAt: '2026-03-05T10:00:00Z',
  },
];


export const STORE_INFO = {
  name: 'Roti Nusantara Bakery & Cafe',
  branch: 'Cabang Senopati Utama',
  address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan',
  phone: '021-555-8822 / 0812-9988-7766',
  footerNote: 'Terima kasih atas kunjungan Anda!\nFreshly Baked Every Morning with Love & Butter 🥐',
  taxRate: 0.11, // 11% PPN Indonesia
  taxNumber: 'NPWP: 01.234.567.8-012.000',
};


export const INITIAL_USERS: User[] = [
  {
    id: "usr-1",
    name: "Rina Kartika",
    role: "cashier",
    pin: "1234",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    email: "rina.kasir@rotinusantara.com",
    assignedBranchIds: ["branch-senopati"],
    status: "active",
  },
  {
    id: "usr-2",
    name: "Budi Santoso",
    role: "cashier",
    pin: "2345",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    email: "budi.kasir@rotinusantara.com",
    assignedBranchIds: ["branch-kemang"],
    status: "active",
  },
  {
    id: "usr-3",
    name: "Siti Rahma (Supervisor)",
    role: "supervisor",
    pin: "8888",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    email: "siti.spv@rotinusantara.com",
    assignedBranchIds: ["branch-senopati", "branch-kemang"],
    status: "active",
  },
  {
    id: "usr-4",
    name: "Pak Hendra (Owner / Superadmin)",
    role: "admin",
    pin: "9999",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    email: "hendra.owner@rotinusantara.com",
    assignedBranchIds: ["branch-senopati", "branch-kemang", "branch-bintaro"],
    status: "active",
  },
];

