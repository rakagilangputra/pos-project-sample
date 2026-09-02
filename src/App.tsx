import React, { useState } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { Header } from './components/Header';
import { ProductCatalog } from './components/ProductCatalog';
import { OrderCart } from './components/OrderCart';
import { CustomerModal } from './components/CustomerModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SessionModal } from './components/SessionModal';
import { HandoffModal } from './components/HandoffModal';
import { SetAsideOrdersModal } from './components/SetAsideOrdersModal';
import { TransactionHistoryModal } from './components/TransactionHistoryModal';
import { InventoryModal } from './components/InventoryModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuditLogView } from './components/AuditLogView';
import { ShoppingCart } from 'lucide-react';
import { formatIDR } from './utils/formatters';

const POSMainContent: React.FC = () => {
  const { cart, cartTotal } = usePOS();

  // Active view tab
  const [currentTab, setCurrentTab] = useState<'pos' | 'dashboard' | 'audit'>('pos');

  // Modal visibility states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [isHeldOrdersModalOpen, setIsHeldOrdersModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  // Mobile cart drawer toggle
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#FDFBF7] text-[#2D241E] font-sans antialiased">
      {/* Top Header Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSessionModal={() => setIsSessionModalOpen(true)}
        onOpenHandoffModal={() => setIsHandoffModalOpen(true)}
        onOpenHeldOrdersModal={() => setIsHeldOrdersModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenInventoryModal={() => setIsInventoryModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="relative flex flex-1 overflow-hidden p-2.5 sm:p-4">
        {currentTab === 'pos' && (
          <div className="flex h-full w-full gap-3 sm:gap-4 overflow-hidden">
            {/* Left: Bakery Product Catalog (Bento Layout) */}
            <section className="flex-1 overflow-hidden flex flex-col">
              <ProductCatalog />
            </section>

            {/* Right: Order Cart Bento Aside (Desktop view) */}
            <aside className="hidden md:flex w-[380px] lg:w-[430px] xl:w-[460px] bg-white border-2 border-[#E5DACE] rounded-[2rem] flex flex-col overflow-hidden shadow-lg">
              <OrderCart
                onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
                onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
              />
            </aside>

            {/* Mobile / Tablet Cart Floating Action Bar */}
            <div className="md:hidden fixed bottom-3 left-3 right-3 z-30">
              <button
                onClick={() => setIsMobileCartOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl bg-[#D97706] px-5 py-4 text-white shadow-xl active:scale-95 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#059669] text-[11px] font-black text-white ring-2 ring-white">
                        {cartItemCount}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-base">Lihat Keranjang</span>
                </div>
                <span className="text-lg font-black">{formatIDR(cartTotal)}</span>
              </button>
            </div>

            {/* Mobile Cart Drawer Modal */}
            {isMobileCartOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-white animate-fadeIn">
                <div className="flex items-center justify-between border-b-2 border-[#E5DACE] px-4 py-3 bg-[#FDFBF7]">
                  <h3 className="font-extrabold text-base text-[#2D241E]">Keranjang Belanja</h3>
                  <button
                    onClick={() => setIsMobileCartOpen(false)}
                    className="rounded-xl border-2 border-[#E5DACE] px-3 py-1.5 text-xs font-bold text-[#8C7B6C] hover:text-[#2D241E]"
                  >
                    Tutup
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <OrderCart
                    onOpenCustomerModal={() => {
                      setIsMobileCartOpen(false);
                      setIsCustomerModalOpen(true);
                    }}
                    onOpenPaymentModal={() => {
                      setIsMobileCartOpen(false);
                      setIsPaymentModalOpen(true);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'dashboard' && <AdminDashboard />}

        {currentTab === 'audit' && <AuditLogView />}
      </main>

      {/* MODALS */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      <ReceiptModal />

      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
      />

      <HandoffModal
        isOpen={isHandoffModalOpen}
        onClose={() => setIsHandoffModalOpen(false)}
      />

      <SetAsideOrdersModal
        isOpen={isHeldOrdersModalOpen}
        onClose={() => setIsHeldOrdersModalOpen(false)}
      />

      <TransactionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <POSProvider>
      <POSMainContent />
    </POSProvider>
  );
}

export default App;
