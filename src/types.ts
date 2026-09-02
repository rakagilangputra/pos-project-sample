export type UserRole = 'cashier' | 'supervisor' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // 4-digit quick PIN
  avatar?: string;
  email?: string;
}

export type CustomerCategory = 'Walk-in' | 'Retail' | 'Corporate' | 'Individual' | 'Other';

export interface Customer {
  id: string;
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

export type ProductCategory = 'roti' | 'pastry' | 'cake' | 'cookies' | 'beverage' | 'custom_cake';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  isPriceCustomizable: boolean;
  stock: number;
  lowStockThreshold: number;
  isMadeToOrder: boolean;
  baseProductId?: string; // Links made-to-order to base ready stock product
  image: string;
  supplier?: string;
  commissionPercent?: number;
  description?: string;
  popular?: boolean;
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
  image: string;
  isMadeToOrder: boolean;
  customizationNotes?: string;
  itemDiscountPercent?: number;
  itemDiscountAmount?: number;
  itemDiscountReason?: string;
  stockAvailable: number;
}

export type PaymentMethod = 'cash' | 'qris' | 'deposit';

export interface PaymentComponent {
  method: PaymentMethod;
  amount: number;
  tenderedCash?: number;
  change?: number;
  reference?: string;
  timestamp: string;
}

export type OrderStatus = 'completed' | 'awaiting_settlement' | 'voided' | 'refunded' | 'partially_refunded' | 'cancelled';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'refunded';

export interface Order {
  id: string;
  receiptNumber: string;
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
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'order' | 'session' | 'stock' | 'user' | 'price' | 'discount';
  entityId: string;
  details: string;
  beforeValue?: string;
  afterValue?: string;
  supervisorName?: string;
}

export interface StockAdjustmentRecord {
  id: string;
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
