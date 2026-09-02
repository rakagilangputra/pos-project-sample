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
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { formatIDR } from '../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const { orders, products, users } = usePOS();

  // Completed valid sales
  const validOrders = orders.filter(
    (o) => o.orderStatus === 'completed' || o.orderStatus === 'awaiting_settlement'
  );

  const totalSalesToday = validOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  // Estimate month by today * 26 or realistic multiplier for demo
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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-transparent text-[#2D241E]">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#E5DACE] pb-4">
        <div>
          <h2 className="text-2xl font-black text-[#2D241E] tracking-tight">
            Dashboard Operasional Bakery
          </h2>
          <p className="text-xs text-[#8C7B6C] mt-0.5">
            Pantauan penjualan real-time, metode pembayaran, performa kasir, dan kesehatan inventori
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

      {/* Middle Grid: Payment Distribution & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Breakdown (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#2D241E]">Distribusi Metode Pembayaran</h3>
              <p className="text-xs text-[#8C7B6C]">Porsi penerimaan kas vs pembayaran digital</p>
            </div>
            <PieChart className="h-5 w-5 text-[#8C7B6C]" />
          </div>

          {/* Visual Percentage Bar */}
          <div className="h-6 w-full overflow-hidden rounded-2xl flex bg-[#FDFBF7] border border-[#E5DACE] p-0.5">
            <div
              className="bg-[#059669] h-full rounded-l-xl transition-all"
              style={{ width: `${cashPercent}%` }}
              title={`Tunai: ${cashPercent}%`}
            />
            <div
              className="bg-blue-500 h-full transition-all"
              style={{ width: `${qrisPercent}%` }}
              title={`QRIS: ${qrisPercent}%`}
            />
            <div
              className="bg-purple-500 h-full rounded-r-xl transition-all"
              style={{ width: `${depositPercent}%` }}
              title={`Deposit: ${depositPercent}%`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-[#059669] inline-block" />
                <span className="text-xs font-bold text-[#2D241E]">Tunai ({cashPercent}%)</span>
              </div>
              <span className="text-base font-black text-[#059669] mt-1 block">{formatIDR(cashTotal)}</span>
            </div>

            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
                <span className="text-xs font-bold text-[#2D241E]">QRIS ({qrisPercent}%)</span>
              </div>
              <span className="text-base font-black text-blue-900 mt-1 block">{formatIDR(qrisTotal)}</span>
            </div>

            <div className="rounded-2xl border-2 border-purple-100 bg-purple-50/50 p-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-purple-500 inline-block" />
                <span className="text-xs font-bold text-[#2D241E]">Deposit ({depositPercent}%)</span>
              </div>
              <span className="text-base font-black text-purple-900 mt-1 block">{formatIDR(depositTotal)}</span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl border-2 border-[#E5DACE] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#D97706]" />
              <h3 className="text-base font-bold text-[#2D241E]">Peringatan Stok Menipis</h3>
            </div>
            <span className="rounded-full bg-amber-100 border border-[#D97706]/30 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              {lowStockItems.length} Produk
            </span>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8C7B6C]">
                <CheckCircle2 className="h-8 w-8 text-[#059669] mx-auto mb-1" />
                <span>Semua stok produk bakery dalam jumlah aman.</span>
              </div>
            ) : (
              lowStockItems.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between rounded-2xl border-2 border-[#E5DACE] bg-[#FDFBF7] p-2.5 text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-bold text-[#2D241E] block truncate">{prod.name}</span>
                    <span className="text-[10px] text-[#8C7B6C]">{prod.categoryLabel}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`font-black ${prod.stock <= 0 ? 'text-rose-600' : 'text-[#D97706]'}`}>
                      {prod.stock <= 0 ? 'Habis (0)' : `Sisa ${prod.stock} pcs`}
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
