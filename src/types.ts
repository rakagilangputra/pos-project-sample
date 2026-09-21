export type UserRole = 'cashier' | 'supervisor' | 'admin';

export interface StoreBranch {
  id: string;
  code: string; // e.g. 'CAB-01'
  name: string; // e.g. 'Cabang Senopati Utama'
  address: string;
  city: string;
  phone?: string;
  operatingHours: string; // e.g. '07:00 - 22:00'
  assignedSupervisorIds?: string[];
  receiptHeader?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-digit quick PIN
  avatar?: string;
  email?: string;
  assignedBranchIds?: string[]; // Cashier: exactly 1; Supervisor: 1 or more; Admin: all
  status: 'active' | 'inactive';
}

export interface RoleMatrixItem {
  role: UserRole;
  roleLabel: string;
  description: string;
  branchScope: string;
  workspaces: string[];
  canManageBranches: boolean;
  canManageUsers: boolean;
  canEditMasterData: boolean;
}

export type CustomerCategory = 'Walk-in' | 'Retail' | 'Corporate' | 'Individual' | 'Other';

export interface Customer {
  id: string;
  branchId?: string;
  name: string;
  phone?: string;
  email?: string;
  category: CustomerCategory;
  address?: string;
  notes?: string;
  depositBalance: number;
  createdAt: string;
  lastTransactionAt?: string;
}

export type ProductCategory = string;
export type Category = ProductCategoryItem;
export type Branch = StoreBranch;

// Master Kategori - Central Category Master (POS-HQ)
export type MasterCategoryType = 'KONSINYASI' | 'PRODUKSI' | 'BELI (RESELLER)';

export interface MasterCategory {
  id: string; // Freetext alphanumeric ID (e.g. KAT-RTI-01)
  name: string; // Nama Kategori
  categoryType: MasterCategoryType; // KONSINYASI | PRODUKSI | BELI (RESELLER)
  branchIds: string[]; // Store branches included
  description?: string; // Deskripsi (optional)
  createdAt: string;
  updatedAt?: string;
}

export interface ProductCategoryItem {
  id: string;
  branchId?: string;
  name: string;
  description?: string;
  icon?: string;
}

export type ProductOwnershipType = 'own' | 'consignment';
export type CommissionMethod = 'fixed' | 'percentage';
export type CommissionBasis = 'gross' | 'net';
export type ProductExpiryType = 'daily' | 'multi_day';

export interface Product {
  id: string;
  branchId?: string;
  sku: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  isPriceCustomizable: boolean;
  stock: number;
  inTransitStock?: number;
  badStock?: number;
  lowStockThreshold: number;
  isMadeToOrder: boolean;
  baseProductId?: string; // Links made-to-order to base ready stock product
  image: string;
  description?: string;
  popular?: boolean;
  
  // Expiry classification: 'daily' (Harian / 1 Hari) vs 'multi_day' (> 1 Hari)
  expiryType?: ProductExpiryType;
  shelfLifeDays?: number;

  // Ownership & Consignment fields (POS-US-029)
  ownershipType: ProductOwnershipType; // 'own' | 'consignment'
  supplierId?: string;
  supplierName?: string;
  commissionMethod?: CommissionMethod; // 'fixed' | 'percentage'
  commissionValue?: number; // Fixed amount in IDR or % (0-100)
  commissionBasis?: CommissionBasis; // 'gross' | 'net' (required if percentage)
}

export interface CartItem {
  id: string; // unique item line id
  productId: string;
  productName: string;
  category: ProductCategory;
  unitPrice: number;
  originalPrice: number;
  isPriceOverridden: boolean;
  overrideReason?: string;
  quantity: number;
  image?: string;
  isMadeToOrder: boolean;
  baseProductId?: string;
  customizationNotes?: string;
  itemDiscountPercent?: number;
  itemDiscountAmount?: number;
  itemDiscountReason?: string;
  stockAvailable: number;
  
  // Consignment line snapshot (POS-US-031)
  ownershipType?: ProductOwnershipType;
  supplierId?: string;
  supplierName?: string;
  commissionMethod?: CommissionMethod;
  commissionValue?: number;
  commissionBasis?: CommissionBasis;

  // Expiry configuration
  expiryType?: ProductExpiryType;
  expiryDate?: string;
}

export type PaymentMethod = 'cash' | 'qris' | 'deposit' | 'pay_tomorrow' | 'transfer';

export interface PaymentComponent {
  method: PaymentMethod;
  amount: number;
  tenderedCash?: number;
  change?: number;
  reference?: string;
  timestamp: string;
}

export type OrderStatus =
  | 'completed'
  | 'awaiting_settlement'
  | 'voided'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'
  | 'active'
  | 'ready_for_pickup'
  | 'overdue'
  | 'picked_up';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'refunded';

export interface PickupTimeEditLog {
  previousTime: string;
  newTime: string;
  updatedBy: string;
  timestamp: string;
}

export interface MtoOrderItemInput {
  productId: string;
  quantity: number;
  customPrice?: number;
  customizationNotes?: string;
  supplierId?: string;
  supplierName?: string;
  ownershipType?: ProductOwnershipType;
  expiryType?: ProductExpiryType;
  expiryDate?: string;
}

export interface Order {
  id: string;
  branchId?: string;
  receiptNumber: string;
  poNumber?: string; // MTO Purchase Order identifier (e.g. SPU-260909-0001)
  sessionId: string;
  cashierId: string;
  cashierName: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  taxApplied: boolean;
  taxRate: number; // 0.11
  taxAmount: number;
  discountType?: 'percent' | 'fixed';
  discountValue?: number;
  discountAmount: number;
  discountReason?: string;
  discountApprovedBy?: string;
  total: number;
  paidAmount: number;
  remainingBalance: number;
  change: number;
  payments: PaymentComponent[];
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  isMadeToOrder: boolean;
  customizationNotes?: string;
  pickupDate?: string; // YYYY-MM-DD
  pickupTime?: string; // HH:mm
  pickupTimeHistory?: PickupTimeEditLog[];
  collectorName?: string;
  pickedUpAt?: string;
  pickedUpBy?: string;
  readyAt?: string;
  readyBy?: string;
  stockDeducted?: boolean;
  cancellationReason?: string;
  cancellationApprovedBy?: string;
  cancellationCreditRef?: string;
  cancelledAt?: string;
  createdAt: string;
  reprintCount: number;
  voidReason?: string;
  voidApprovedBy?: string;
  refundReason?: string;
  refundApprovedBy?: string;
  refundAmount?: number;
}

export interface CashierSession {
  id: string;
  branchId?: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  openingCashCorrected?: boolean;
  openingCashOld?: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
  varianceReason?: string;
  closingApprovedBy?: string;
  status: 'active' | 'closed';
  totalTransactions: number;
  totalSales: number;
  cashSales: number;
  qrisSales: number;
  depositSales: number;
  totalRefunds: number;
  totalDiscounts: number;
  handOffHistory: {
    fromCashierId: string;
    fromCashierName: string;
    toCashierId: string;
    toCashierName: string;
    timestamp: string;
  }[];
  supportCorrections?: {
    adminId: string;
    adminName: string;
    timestamp: string;
    action: string;
    reason: string;
    beforeValue: string;
    afterValue: string;
  }[];
}

export interface SetAsideOrder {
  id: string;
  branchId?: string;
  sessionId: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  taxApplied: boolean;
  discountAmount: number;
  discountReason?: string;
  total: number;
  createdAt: string;
  label?: string;
}

export interface AuditLog {
  id: string;
  branchId?: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'order' | 'session' | 'stock' | 'user' | 'price' | 'discount' | 'supplier' | 'consignment' | 'category' | 'product' | 'receipt' | 'branch' | 'purchase_plan';
  entityId: string;
  details: string;
  beforeValue?: string;
  afterValue?: string;
  supervisorName?: string;
}

export interface StockAdjustmentRecord {
  id: string;
  branchId?: string;
  productId: string;
  productName: string;
  type: 'increase' | 'decrease';
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  adminId: string;
  adminName: string;
  timestamp: string;
}

// POS-US-030: Supplier Master
export type SupplierCategory = string;
export type SettlementScheduleType = 'weekly' | 'twice_monthly';
export type WeeklyFrequency = 'once' | 'twice' | 'three_times';

export interface Supplier {
  id: string;
  branchId?: string;
  name: string;
  category?: string; // e.g. "Roti Manis, Pastry & Croissant"
  categories?: string[]; // Tagged product categories from Stok Kategori (e.g. ['Roti Manis', 'Cakes & Tart'])
  picName: string;
  phone: string;
  address?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  scheduleType?: SettlementScheduleType;
  weeklyFrequency?: WeeklyFrequency;
  weeklyDays?: string[]; // e.g. ['Senin', 'Kamis']
  scheduleDayOfWeek?: number; // 1-7
  scheduleDatesOfMonth?: number[]; // e.g. [15, 30]
  monthlyDates?: number[]; // e.g. [15, 30]
  nextDueDate?: string;
  balance?: number; // Supplier balance / overpayment credit account
  balanceUpdatedAt?: string; // Timestamp when balance was added/updated
  createdAt: string;
  updatedAt?: string;
}

// POS-US-031: Consignment Commission Ledger
export type CommissionLedgerStatus = 'accrued' | 'included' | 'settled' | 'reversed';

export interface CommissionLedgerEntry {
  id: string;
  branchId?: string;
  orderId: string;
  orderLineId: string;
  receiptNumber: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number; // Transaction Unit Price * Completed Quantity (excluding tax)
  allocatedDiscount: number; // Item/order allocated discounts
  netAmount: number; // grossAmount - allocatedDiscount
  commissionMethod: CommissionMethod;
  commissionValue: number;
  commissionBasis?: CommissionBasis;
  commissionAmount: number;
  storeNetAmount: number; // netAmount - commissionAmount
  status: CommissionLedgerStatus;
  settlementId?: string;
  createdAt: string;
  reversedAt?: string;
  reversalReason?: string;
}

// POS-US-032 & POS-US-034 & POS-US-035: Supplier Settlement Cycles
export type SettlementCycleStatus = 'upcoming' | 'due' | 'overdue' | 'settled';

export interface SupplierSettlementCycle {
  id: string;
  branchId?: string;
  supplierId: string;
  supplierName: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string; // YYYY-MM-DD
  grossItemSales: number;
  discounts: number;
  netItemSales: number;
  commissionPayable: number;
  storeNetAfterCommission: number;
  status: SettlementCycleStatus;
  commissionEntryIds: string[];
  // POS-US-035: Payment evidence
  paymentMethod?: 'cash' | 'transfer' | 'qris' | 'other';
  paymentAmount?: number;
  piutangUsed?: number;
  newPiutangGenerated?: number;
  totalSettledBuyAmount?: number;
  paymentReference?: string;
  settlementNotes?: string;
  settledBy?: string;
  settledAt?: string;
  createdAt: string;
}

// POS-US-059 & POS-US-060 & POS-US-061 & POS-US-062: Purchase & Goods Receiving
export type ReceiptType = 'Dibeli Sendiri' | 'Konsinyasi';
export type GoodsReceiptStatus = 'draft' | 'submitted';

export interface GoodsReceiptItemBatch {
  id?: string;
  batchNumber?: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  notes?: string;
}

export interface GoodsReceiptItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  sellingPrice: number;
  quantityReceived: number; // Sellable quantity added to inventory
  buyPrice?: number;
  actualBuyPrice?: number;
  lineTotal?: number;
  plannedQuantity?: number;
  plannedBuyPrice?: number;
  plannedLineTotal?: number;
  condition?: 'Sesuai Rencana' | 'Berbeda' | 'Tidak Direncanakan' | 'Tidak Diterima';
  expiryBatches?: GoodsReceiptItemBatch[];
}

export interface GoodsReceiptRecord {
  id: string;
  branchId?: string;
  receiptNumber: string; // e.g. RCV-20260906-001
  receiptType: ReceiptType;
  arrivalDate: string; // YYYY-MM-DD
  supplierId: string;
  supplierName: string;
  receivedBy: string;
  items: GoodsReceiptItem[];
  totalQuantity: number;
  remarks?: string;
  status: GoodsReceiptStatus;
  
  // For 'Dibeli Sendiri' (POS-US-060)
  totalPurchaseCost?: number;
  paymentMethod?: 'cash' | 'transfer' | 'qris' | 'deposit';

  // For Purchase Plan Linkage (POS-US-075)
  sourceType?: 'Manual' | 'Dari Rencana Pembelian';
  purchasePlanId?: string;
  purchasePlanName?: string;
  totalPlannedValue?: number;
  totalActualValue?: number;
  varianceValue?: number;

  // Traceable Stock Movement Reference
  stockMovementRef: string; // e.g. MOV-IN-RCV-20260906-001
  submittedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// POS-US-073, POS-US-074, POS-US-075: Rencana Pembelian (Owned Purchases Only)
export type PurchasePlanStatus =
  | 'Direncanakan'
  | 'Terkait Penerimaan'
  | 'Terealisasi'
  | 'Dibatalkan';

export type PurchasePlanItemType = 'in_house' | 'consignment' | 'direct_purchase' | 'adhoc';

export interface PurchasePlanProductLine {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  category: string; // Read-only snapshot of product category
  plannedQuantity: number; // positive whole number >= 1
  plannedBuyPrice: number; // >= 0
  lineTotal: number; // plannedQuantity * plannedBuyPrice
  itemType?: PurchasePlanItemType;
  sourcePoRef?: string;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
}

export interface PurchasePlan {
  id: string; // Format: RP-{BRANCHCODE}-{YYYYMM}-{NNNN}
  namaRencana: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  supplierId: string;
  supplierName: string;
  supplierCategory: string; // Read-only snapshot from supplier master
  lines: PurchasePlanProductLine[];
  totalPlannedValue: number;
  status: PurchasePlanStatus;
  linkedReceiptId?: string;
  linkedReceiptNumber?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: string;
  sourceOrderIds?: string[];
  attachedPoNumbers?: string[];
}

export interface ReceivingDraft {
  branchId?: string;
  receiptType: ReceiptType;
  arrivalDate: string;
  supplierId: string;
  receivedBy: string;
  items: {
    tempId: string;
    productId: string;
    quantityReceived: number;
  }[];
  remarks: string;
  totalPurchaseCost?: number;
  paymentMethod?: 'cash' | 'transfer' | 'qris' | 'deposit';
  activeLineIndexForNewSku?: number;
}

// POS-US-069: Category Daily Stock Closing
export interface CategoryClosingRow {
  productId: string;
  productName: string;
  sku: string;
  systemStock: number;
  actualClosingStock: number;
  variance: number;
  remark?: string;
}
export type CategoryClosingItemRow = CategoryClosingRow;

export interface CategoryClosingSession {
  id: string;
  branchId: string;
  branchName?: string;
  categoryId: string;
  categoryName: string;
  closingDate: string; // YYYY-MM-DD
  status: 'draft' | 'submitted';
  rows: CategoryClosingRow[];
  submittedBy?: string;
  submittedAt?: string;
  createdAt: string;
}

// Product Expiry Batch Tracking & Daily Closing Reconciliation
export interface ProductExpiryBatch {
  id: string; // e.g. BATCH-20260920-001
  batchNumber?: string;
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName?: string;
  expiryType?: ProductExpiryType; // 'daily' | 'multi_day'
  expiryDate: string; // YYYY-MM-DD
  initialQuantity: number;
  remainingQuantity: number;
  goodsReceiptId?: string;
  goodsReceiptNumber?: string;
  receivedDate: string; // YYYY-MM-DD
  unitCost?: number;
  ownershipType?: 'owned' | 'consignment';
  supplierId?: string;
  supplierName?: string;
  category?: string;
  status: 'active' | 'exhausted' | 'destroyed';
  destroyedAt?: string;
  destroyedBy?: string;
  destructionRecordNo?: string;
  notes?: string;
  createdAt: string;
}

// POS-US-070: Stock Transfer
export type StockTransferStatus = 'in_transit' | 'received' | 'cancelled';

export interface StockTransferRecord {
  id: string;
  transferNo: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  status: StockTransferStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  receivedAt?: string;
  receivedBy?: string;
}

// POS-US-071: Bad Stock & Expired Record
export type BadStockReason = 'expired' | 'damaged' | 'spoiled' | 'other';
export type BadStockDisposition = 'disposed' | 'returned_supplier';

export interface BadStockRecord {
  id: string;
  recordNo: string;
  branchId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  reason: BadStockReason;
  disposition: BadStockDisposition;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

// POS-US-072: Consolidated Stock History Event
export type StockHistoryEventType = 'receiving' | 'daily_closing' | 'transfer_out' | 'transfer_in' | 'bad_stock' | 'manual';

export interface StockHistoryItem {
  id: string;
  branchId: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockHistoryEventType;
  typeLabel: string;
  quantityChange: number;
  previousStock?: number;
  resultingStock?: number;
  referenceNo: string;
  notes: string;
  actorName: string;
  timestamp: string;
}

// POS-US-059 to POS-US-063: Supplier WhatsApp Notification
export type NotificationDeliveryResult = 'success' | 'failed' | 'no_internet' | 'other';
export type NotificationAttemptType = 'send' | 'resend';

export interface SupplierNotificationBatch {
  id: string; // e.g. 'BATCH-SUP1-20260909-01'
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  orderIds: string[];
  status: 'unsent' | 'success' | 'failed' | 'no_internet' | 'other';
  createdAt: string;
  sentAt?: string;
  sentBy?: string;
  attemptsCount: number;
  lastAttemptResult?: NotificationDeliveryResult;
  lastAttemptAt?: string;
  lastErrorMessage?: string;
}

export interface SupplierDeliveryLogEntry {
  id: string;
  batchId: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  orderIds: string[];
  orderReceipts: string[];
  attemptType: NotificationAttemptType;
  result: NotificationDeliveryResult;
  messageText: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  errorMessage?: string;
  rawResponse?: string;
}

// Raw Material (Bahan Baku) Master Data
export interface RawMaterial {
  id: string;
  branchId?: string;
  sku: string; // e.g. RAW-EGG-01
  name: string; // e.g. Telur Ayam Negeri
  category: string; // e.g. Telur & Dairy, Pemanis & Gula, Tepung & Gandum
  unit: string; // kg, liter, butir, pack, gram, sak, kaleng
  costPrice: number; // Harga Beli Acuan / Estimasi Biaya Satuan (Rp)
  stock: number; // Kuantitas stok fisik saat ini (hanya dapat bertambah lewat Penerimaan Barang)
  lowStockThreshold: number; // Batas minimum stok peringatan
  supplierId?: string;
  supplierName?: string;
  image?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}


