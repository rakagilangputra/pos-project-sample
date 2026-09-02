import React, { useState } from 'react';
import { UserPlus, Search, Check, User, Building2, Phone, Mail, X, Wallet } from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { Customer, CustomerCategory } from '../types';
import { DEFAULT_WALKIN_CUSTOMER } from '../data/mockData';
import { formatIDR } from '../utils/formatters';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const { customers, selectedCustomer, setSelectedCustomer, addCustomer } = usePOS();
  const [search, setSearch] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<CustomerCategory>('Retail');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onClose();
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Nama pelanggan wajib diisi');
      return;
    }
    const created = addCustomer({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      category,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      depositBalance: 0,
    });
    setSelectedCustomer(created);
    setIsAddingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-amber-50/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isAddingNew ? 'Tambah Pelanggan Baru' : 'Pilih Pelanggan Nota'}
              </h3>
              <p className="text-xs text-gray-500">
                Pelanggan saat ini: <span className="font-semibold text-amber-700">{selectedCustomer.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {isAddingNew ? (
          <form onSubmit={handleSaveNew} className="flex-1 overflow-y-auto p-6 space-y-4">
            {formError && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Nama Pelanggan / Perusahaan *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Ibu Ani / PT Maju Roti"
                className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base font-medium focus:border-amber-500 focus:bg-white focus:outline-none"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Email (untuk Kirim Struk)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelanggan@email.com"
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Kategori Pelanggan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Retail', 'Corporate', 'Individual'] as CustomerCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-2xl py-3 px-3 text-sm font-bold border transition ${
                      category === cat
                        ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Alamat Pengiriman / Kantor (Opsional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Kebayoran Lama No. 10"
                className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Catatan Khusus (Preferensi Rasa / Alergi)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Alergi kacang / suka kemasan box"
                className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="flex-1 rounded-2xl border border-gray-200 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-amber-600 py-3.5 text-base font-bold text-white shadow-md hover:bg-amber-700 active:scale-95"
              >
                Simpan & Pilih
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden p-6">
            {/* Action Bar */}
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau no. telepon..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-base focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
              <button
                onClick={() => setIsAddingNew(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95"
              >
                <UserPlus className="h-5 w-5" />
                <span>Tambah Baru</span>
              </button>
            </div>

            {/* Quick Walk-in Button */}
            <button
              onClick={() => handleSelect(DEFAULT_WALKIN_CUSTOMER)}
              className={`mb-4 flex items-center justify-between rounded-2xl border-2 p-4 text-left transition ${
                selectedCustomer.id === DEFAULT_WALKIN_CUSTOMER.id
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-dashed border-gray-300 bg-gray-50 hover:bg-amber-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-200 text-gray-700 font-bold text-lg">
                  🚶
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">
                    Pelanggan Umum (Walk-in Counter)
                  </h4>
                  <p className="text-xs text-gray-500">
                    Pilihan default untuk transaksi cepat tanpa data pelanggan
                  </p>
                </div>
              </div>
              {selectedCustomer.id === DEFAULT_WALKIN_CUSTOMER.id && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                  <Check className="h-3.5 w-3.5" /> Terpilih
                </span>
              )}
            </button>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered
                .filter((c) => c.id !== DEFAULT_WALKIN_CUSTOMER.id)
                .map((cust) => {
                  const isSelected = selectedCustomer.id === cust.id;
                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleSelect(cust)}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border p-4 transition active:scale-[0.99] ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/60 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-amber-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold ${
                            cust.category === 'Corporate'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cust.category === 'Corporate' ? (
                            <Building2 className="h-5 w-5" />
                          ) : (
                            cust.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900">{cust.name}</h4>
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                              {cust.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {cust.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {cust.phone}
                              </span>
                            )}
                            {cust.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {cust.email}
                              </span>
                            )}
                          </div>
                          {cust.notes && (
                            <p className="text-[11px] text-amber-800 italic mt-0.5">
                              {cust.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {cust.depositBalance > 0 && (
                          <div className="flex items-center gap-1 justify-end text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl mb-1">
                            <Wallet className="h-3 w-3" />
                            <span>Deposit: {formatIDR(cust.depositBalance)}</span>
                          </div>
                        )}
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white">
                            <Check className="h-3.5 w-3.5" /> Terpilih
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

              {filtered.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">Tidak ada pelanggan yang cocok dengan pencarian "{search}"</p>
                  <button
                    onClick={() => {
                      setName(search);
                      setIsAddingNew(true);
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-200"
                  >
                    <UserPlus className="h-4 w-4" />
                    Tambah "{search}" sebagai Pelanggan Baru
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
