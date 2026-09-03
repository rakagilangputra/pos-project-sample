import React from 'react';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  Award,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Users,
  DollarSign,
  PieChart,
  Building2,
  Coins,
  ArrowUpRight,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR } from '../utils/formatters';

interface AdminDashboardProps {
  onOpenConsignmentModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenConsignmentModal }) => {
  const { orders, products, users, commissionLedger, settlementCycles } = usePOS();

  // Completed valid sales
  const validOrders = orders.filter(
    (o) => o.orderStatus === 'completed' || o.orderStatus === 'awaiting_settlement'
  );

  const totalSalesToday = validOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  // Estimate month by today * 18 or realistic multiplier for demo
  const totalSalesMonth = totalSalesToday * 18 + 4500000;
  const totalOrdersCount = validOrders.length;
  const averageBasket = totalOrdersCount > 0 ? Math.round(totalSalesToday / totalOrdersCount) : 0;

  // Payment breakdown
  let cashTotal = 0;
  let qrisTotal = 0;
  let depositTotal = 0;

  validOrders.forEach((o) => {
    o.payments.forEach((p) => {
      if (p.method === 'cash') cashTotal += p.amount;
      else if (p.method === 'qris') qrisTotal += p.amount;
      else if (p.method === 'deposit') depositTotal += p.amount;
    });
  });

  const totalPayments = cashTotal + qrisTotal + depositTotal || 1;
  const cashPercent = Math.round((cashTotal / totalPayments) * 100);
  const qrisPercent = Math.round((qrisTotal / totalPayments) * 100);
  const depositPercent = Math.round((depositTotal / totalPayments) * 100);

  // Top products
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  validOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      }
      productSalesMap[item.productId].qty += item.quantity;
      productSalesMap[item.productId].revenue += item.unitPrice * item.quantity;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Low stock products
  const lowStockItems = products.filter((p) => p.stock < p.lowStockThreshold);

  // Cashier performance
  const cashierStats: Record<string, number> = {};
  validOrders.forEach((o) => {
    cashierStats[o.cashierName] = (cashierStats[o.cashierName] || 0) + 1;
  });

  // Consignment KPIs (POS-US-033)
  const validLedger = commissionLedger.filter((e) => e.status !== 'reversed');
  const consignmentSales = validLedger.reduce((sum, e) => sum + e.netAmount, 0);
  const consignmentCommission = validLedger.reduce((sum, e) => sum + e.commissionAmount, 0);
  const consignmentUnits = validLedger.reduce((sum, e) => sum + e.quantity, 0);
  const unsettledCycles = settlementCycles.filter((s) => s.status !== 'settled');
  const unsettledDebt = unsettledCycles.reduce((sum, s) => sum + s.commissionPayable, 0);
  const overdueCount = settlementCycles.filter((s) => s.status === 'overdue').length;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-transparent text-[#2D241E]">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E5DACE] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#2D241E] tracking-tight">
            Dashboard Operasional Bakery
          </h2>
          <p className="text-xs text-[#8C7B6C] mt-0.5">
            Pantauan penjualan real-time, metode pembayaran, performa kasir, dan konsinyasi mitra
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border-2 border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800">
          <Activity className="h-4 w-4 text-emerald-600 animate-pulse" />
          <span>Status Sistem: Operasional Normal (24/7)</span>
        </div>
      </div>

      {/* KPI Cards Grid - Bento Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-5 shadow-sm transition hover:border-[#D97706]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7B6C] uppercase tracking-wider">Penjualan Hari Ini</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-[#D97706] border border-[#E5DACE]">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#2D241E]">{formatIDR(totalSalesToday)}</div>
          <span className="mt-1 flex items-center text-[11px] font-bold text-[#059669]">
            <TrendingUp className="h-3.5 w-3.5 mr-1" /> Termasuk pesanan tunai & QRIS
          </span>
        </div>

        <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-5 shadow-sm transition hover:border-[#D97706]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7B6C] uppercase tracking-wider">Estimasi Bulan Ini</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#059669] border border-[#E5DACE]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#059669]">{formatIDR(totalSalesMonth)}</div>
          <span className="mt-1 text-[11px] text-[#8C7B6C] font-medium">Akumulasi transaksi outlet</span>
        </div>

        <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-5 shadow-sm transition hover:border-[#D97706]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7B6C] uppercase tracking-wider">Total Nota Selesai</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-[#E5DACE]">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#2D241E]">{totalOrdersCount} Transaksi</div>
          <span className="mt-1 text-[11px] text-[#8C7B6C] font-medium">Nota terbit hari ini</span>
        </div>

        <div className="rounded-3xl border-2 border-[#E5DACE] bg-white p-5 shadow-sm transition hover:border-[#D97706]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8C7B6C] uppercase tracking-wider">Rata-rata Keranjang</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-[#E5DACE]">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#2D241E]">{formatIDR(averageBasket)}</div>
          <span className="mt-1 text-[11px] text-[#8C7B6C] font-medium">Rata-rata belanja per customer</span>
        </div>
      </div>

      {/* CONSIGNMENT SUMMARY BENTO BOX (POS-US-033) */}
      <div className="rounded-3xl border-2 border-[#E5DACE] bg-amber-50/50 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D97706] text-white shadow-xs">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#2D241E]">
                  Kinerja Konsinyasi & Bagi Hasil Mitra (POS-US-033)
                </h3>
                {overdueCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {overdueCount} Jatuh Tempo Terlambat
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8C7B6C]">
                Rekapitulasi penjualan barang titipan, bagi hasil toko, dan kewajiban hutang settlement
              </p>
            </div>
          </div>

          {onOpenConsignmentModal && (
            <button
              onClick={onOpenConsignmentModal}
              className="flex items-center gap-1.5 rounded-2xl bg-[#2D241E] px-4 py-2 text-xs font-black text-white hover:bg-black transition shadow-xs"
            >
              <span>Buka Manajemen Konsinyasi</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[#E5DACE] bg-white p-3.5">
            <span className="text-[11px] font-bold text-[#8C7B6C] uppercase">Unit Terjual</span>
            <div className="text-xl font-black text-[#2D241E] mt-1">{consignmentUnits} pcs</div>
            <span className="text-[10px] text-[#8C7B6C]">Produk titipan laku</span>
          </div>

          <div className="rounded-2xl border border-[#E5DACE] bg-white p-3.5">
            <span className="text-[11px] font-bold text-[#8C7B6C] uppercase">Net Penjualan</span>
            <div className="text-xl font-black text-[#2D241E] mt-1">{formatIDR(consignmentSales)}</div>
            <span className="text-[10px] text-[#8C7B6C]">Sebelum potong komisi</span>
          </div>

          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5">
            <span className="text-[11px] font-black text-[#D97706] uppercase">Komisi Toko</span>
            <div className="text-xl font-black text-[#D97706] mt-1">{formatIDR(consignmentCommission)}</div>
            <span className="text-[10px] text-[#8C7B6C]">Pendapatan bersih toko</span>
          </div>

          <div className="rounded-2xl border border-[#E5DACE] bg-white p-3.5">
            <span className="text-[11px] font-bold text-rose-600 uppercase">Hutang Belum Lunas</span>
            <div className="text-xl font-black text-rose-700 mt-1">{formatIDR(unsettledDebt)}</div>
            <span className="text-[10px] text-[#8C7B6C]">{unsettledCycles.length} siklus berjalan</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Payment Methods & Inventory Health Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Methods Breakdown */}
        <div className="lg:col-span-6 rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-[#D97706]" />
              <h3 className="text-base font-bold text-[#2D241E]">Komposisi Metode Pembayaran</h3>
            </div>
            <span className="text-xs text-[#8C7B6C]">Hari Ini</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold text-[#2D241E] mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Tunai (Cash)
                </span>
                <span>{formatIDR(cashTotal)} ({cashPercent}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cashPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-[#2D241E] mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]"></span> QRIS / E-Wallet
                </span>
                <span>{formatIDR(qrisTotal)} ({qrisPercent}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#D97706] rounded-full" style={{ width: `${qrisPercent}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-[#2D241E] mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-600"></span> DP / Deposit Custom Cake
                </span>
                <span>{formatIDR(depositTotal)} ({depositPercent}%)</span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${depositPercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="lg:col-span-6 rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <h3 className="text-base font-bold text-[#2D241E]">Peringatan Stok Menipis</h3>
            </div>
            <span className="rounded-full bg-rose-100 text-rose-800 px-2.5 py-0.5 text-xs font-bold">
              {lowStockItems.length} Produk Perlu Restock
            </span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {lowStockItems.length === 0 ? (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 py-6">
                <CheckCircle2 className="h-4 w-4" />
                <span>Semua stok roti aman & tercukupi!</span>
              </div>
            ) : (
              lowStockItems.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between rounded-2xl border border-[#E5DACE] bg-[#FDFBF7] p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-9 w-9 rounded-xl object-cover border border-[#E5DACE]"
                    />
                    <div>
                      <span className="font-bold text-[#2D241E] block">{prod.name}</span>
                      <span className="text-[10px] text-[#8C7B6C]">Kategori: {prod.categoryLabel}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-black ${prod.stock <= 0 ? 'text-rose-600' : 'text-amber-700'}`}
                    >
                      Sisa: {prod.stock} pcs
                    </span>
                    <span className="text-[10px] text-[#8C7B6C] block">Min: {prod.lowStockThreshold}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Selling Items & Cashier Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Bakery Items */}
        <div className="lg:col-span-7 rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#D97706]" />
              <h3 className="text-base font-bold text-[#2D241E]">Roti & Pastry Terlaris Hari Ini</h3>
            </div>
            <span className="text-xs text-[#8C7B6C]">Peringkat 1-5</span>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-[#8C7B6C] py-6 text-center">
              Belum ada data penjualan produk hari ini.
            </p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#D97706] font-bold text-white text-xs">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-[#2D241E] text-sm">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#D97706] text-sm">{formatIDR(p.revenue)}</span>
                    <span className="text-[11px] text-[#8C7B6C] block">{p.qty} pcs terjual</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cashier Team Activity */}
        <div className="lg:col-span-5 rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-bold text-[#2D241E]">Performa Kasir</h3>
            </div>
          </div>

          <div className="space-y-3">
            {users
              .filter((u) => u.role === 'cashier' || u.role === 'supervisor')
              .map((user) => {
                const count = cashierStats[user.name] || 0;
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover border border-[#E5DACE]"
                      />
                      <div>
                        <h4 className="font-bold text-[#2D241E] text-sm">{user.name}</h4>
                        <span className="text-[11px] text-[#8C7B6C] capitalize">{user.role}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#2D241E] text-base">{count}</span>
                      <span className="text-[10px] text-[#8C7B6C] block">Nota Diselesaikan</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
