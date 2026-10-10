import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { posSound } from '../../utils/formatters';
import {
  DEFAULT_WALKIN_CUSTOMER,
  INITIAL_BRANCHES,
  INITIAL_CUSTOMERS,
  INITIAL_USERS,
} from '../../data/mockData';
import type { Customer, StoreBranch, User } from '../../types';
import type { AddAuditFn } from './sliceTypes';

export type ConfirmSwitchStore = { isOpen: boolean; targetBranchId: string | null };

interface UseOrgActionsDeps {
  branches: StoreBranch[];
  setBranches: Dispatch<SetStateAction<StoreBranch[]>>;
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  selectedBranchId: string;
  setSelectedBranchId: Dispatch<SetStateAction<string>>;
  setIsStoreSelectionModalOpen: Dispatch<SetStateAction<boolean>>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
  confirmSwitchStore: ConfirmSwitchStore;
  setConfirmSwitchStore: Dispatch<SetStateAction<ConfirmSwitchStore>>;
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  setSelectedCustomer: Dispatch<SetStateAction<Customer>>;
  currentUser: User;
  setCurrentUser: Dispatch<SetStateAction<User>>;
  currentSession: { status: string; branchId: string } | null;
  setCart: Dispatch<SetStateAction<unknown[]>>;
  addAudit: AddAuditFn;
}

/**
 * Org (organization) state slice of the POS store.
 *
 * Owns: branches, users, the selected branch + its switch-guard flags, and the
 * customer list with the currently selected customer (all with localStorage
 * persistence), plus `verifySupervisorPin`. Extracted verbatim from POSContext.
 *
 * Split from `useOrgActions` so it can be wired *early* with zero dependencies:
 * every other slice only needs org state, while org actions additionally need
 * the cart and the session (see TOKEN_OPTIMIZATION_PROGRESS.md).
 */
export function useOrgState() {
  // Multi-Branch State & Store Management
  const [branches, setBranches] = useState<StoreBranch[]>(() => {
    const saved = localStorage.getItem("pos_branches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasMainBranch = parsed.some((branch: StoreBranch) => branch?.isMainBranch);
          return parsed.map((branch: StoreBranch) => ({
            ...branch,
            // Backward-compatible migration for branches saved before the
            // centralized receiving flag existed.
            isMainBranch: branch.isMainBranch ?? (!hasMainBranch && branch.id === 'branch-senopati'),
          }));
        }
      } catch {}
    }
    return INITIAL_BRANCHES;
  });

  useEffect(() => {
    localStorage.setItem("pos_branches", JSON.stringify(branches));
  }, [branches]);

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("pos_users");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const userMap = new Map<string, User>();
          INITIAL_USERS.forEach((u) => userMap.set(u.id, u));
          parsed.forEach((u: User) => {
            if (u && u.id) {
              userMap.set(u.id, {
                ...u,
                assignedBranchIds:
                  Array.isArray(u.assignedBranchIds) && u.assignedBranchIds.length > 0
                    ? u.assignedBranchIds
                    : u.role === 'admin'
                    ? ['branch-senopati', 'branch-kemang', 'branch-bintaro']
                    : ['branch-senopati'],
              });
            }
          });
          const list = Array.from(userMap.values());
          if (!list.some((u) => u.role === 'admin')) {
            const adminUser = INITIAL_USERS.find((u) => u.role === 'admin');
            if (adminUser) list.push(adminUser);
          }
          return list;
        }
      } catch {}
    }
    return INITIAL_USERS;
  });

  useEffect(() => {
    localStorage.setItem("pos_users", JSON.stringify(users));
  }, [users]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    const saved = localStorage.getItem("pos_selected_branch_id");
    if (saved && saved.startsWith("branch-")) return saved;
    return "branch-senopati";
  });

  useEffect(() => {
    localStorage.setItem("pos_selected_branch_id", selectedBranchId);
  }, [selectedBranchId]);

  const [isStoreSelectionModalOpen, setIsStoreSelectionModalOpen] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [confirmSwitchStore, setConfirmSwitchStore] = useState<{ isOpen: boolean; targetBranchId: string | null }>({
    isOpen: false,
    targetBranchId: null,
  });

  // Customers
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('pos_customers');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CUSTOMERS;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(DEFAULT_WALKIN_CUSTOMER);

  useEffect(() => {
    localStorage.setItem('pos_customers', JSON.stringify(customers));
  }, [customers]);

  // Verify Supervisor / Manager PIN (POS-US-011, POS-US-016, POS-US-017, POS-US-019)
  const verifySupervisorPin = (pin: string) => {
    const supervisor = users.find(
      (u) => (u.role === 'supervisor' || u.role === 'admin') && u.pin === pin
    );
    if (supervisor) {
      return { success: true, supervisor, message: 'Otorisasi Disetujui' };
    }
    return { success: false, message: 'PIN Supervisor/Admin tidak valid!' };
  };

  return {
    branches,
    setBranches,
    users,
    setUsers,
    selectedBranchId,
    setSelectedBranchId,
    isStoreSelectionModalOpen,
    setIsStoreSelectionModalOpen,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    confirmSwitchStore,
    setConfirmSwitchStore,
    customers,
    setCustomers,
    selectedCustomer,
    setSelectedCustomer,
    verifySupervisorPin,
  };
}

/**
 * Org (organization) actions slice of the POS store.
 *
 * Owns: cashier login/user switching, branch selection + CRUD and status
 * toggles, and customer creation. Extracted verbatim from POSContext.
 *
 * Wired after `useCartSlice` and `useSessionSlice` because `selectBranch`
 * clears the cart and `toggleBranchStatus` reads the active session - the last
 * two edges of the session <-> org <-> cart cycle (TOKEN_OPTIMIZATION_PROGRESS.md).
 */
export function useOrgActions({
  branches,
  setBranches,
  users,
  setUsers,
  selectedBranchId,
  setSelectedBranchId,
  setIsStoreSelectionModalOpen,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  confirmSwitchStore,
  setConfirmSwitchStore,
  setCustomers,
  setSelectedCustomer,
  currentUser,
  setCurrentUser,
  currentSession,
  setCart,
  addAudit,
}: UseOrgActionsDeps) {
  // Switch User / Cashier Login (POS-US-004, POS-US-023)
  const switchUser = (userId: string, pin: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) {
      posSound.error();
      return { success: false, message: "Pengguna tidak ditemukan" };
    }
    if (target.pin !== pin) {
      posSound.error();
      return { success: false, message: "PIN Salah. Silakan coba lagi." };
    }
    setCurrentUser(target);
    posSound.beep();
    addAudit("LOGIN_SWITCH", "user", target.id, `Pengguna berganti ke ${target.name} (${target.role})`);

    if (target.role === "cashier") {
      const cashierBranch = (target.assignedBranchIds && target.assignedBranchIds[0]) || "branch-senopati";
      setSelectedBranchId(cashierBranch);
      setIsStoreSelectionModalOpen(false);
    } else {
      setIsStoreSelectionModalOpen(true);
    }

    return { success: true, message: `Berhasil login sebagai ${target.name}` };
  };

  // Store Branch Operations (POS Multi-Branch Phase 1)
  const selectBranch = (branchId: string, force: boolean = false): boolean => {
    const targetBranch = branches.find((b) => b.id === branchId);
    if (!targetBranch) {
      posSound.error();
      return false;
    }

    if (hasUnsavedChanges && !force) {
      setConfirmSwitchStore({ isOpen: true, targetBranchId: branchId });
      return false;
    }

    setSelectedBranchId(branchId);
    setCart([]);
    setSelectedCustomer(DEFAULT_WALKIN_CUSTOMER);
    setHasUnsavedChanges(false);
    setConfirmSwitchStore({ isOpen: false, targetBranchId: null });
    setIsStoreSelectionModalOpen(false);

    addAudit(
      "SWITCH_STORE",
      "branch",
      branchId,
      `Cabang aktif dialihkan ke ${targetBranch.name} (${targetBranch.code}) oleh ${currentUser.name}`
    );
    posSound.beep();
    return true;
  };

  const requestSwitchBranch = (targetBranchId: string) => {
    selectBranch(targetBranchId, false);
  };

  const confirmAndSwitchBranch = () => {
    if (confirmSwitchStore.targetBranchId) {
      selectBranch(confirmSwitchStore.targetBranchId, true);
    }
  };

  const cancelSwitchBranch = () => {
    setConfirmSwitchStore({ isOpen: false, targetBranchId: null });
  };

  const addBranch = (data: Omit<StoreBranch, "id" | "createdAt">) => {
    const trimmedName = data.name.trim();
    const trimmedCode = data.code.trim().toUpperCase();
    if (!trimmedName) return { success: false, message: "Nama cabang wajib diisi!" };
    if (!trimmedCode) return { success: false, message: "Kode cabang wajib diisi!" };
    if (branches.some((b) => b.code.toUpperCase() === trimmedCode)) {
      return { success: false, message: `Kode cabang "${trimmedCode}" sudah digunakan!` };
    }

    const id = "branch-" + Date.now().toString().slice(-6);
    const newBranch: StoreBranch = {
      ...data,
      id,
      name: trimmedName,
      code: trimmedCode,
      createdAt: new Date().toISOString(),
    };

    setBranches((prev) => [...prev, newBranch]);
    addAudit("BRANCH_CREATE", "branch", id, `Cabang baru dibuat: ${newBranch.name} (${newBranch.code})`);
    posSound.beep();
    return { success: true, branch: newBranch, message: `Cabang ${newBranch.name} berhasil dibuat!` };
  };

  const updateBranch = (id: string, data: Partial<StoreBranch>) => {
    const branch = branches.find((b) => b.id === id);
    if (!branch) return { success: false, message: "Cabang tidak ditemukan!" };

    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data, updatedAt: new Date().toISOString() } : b))
    );
    addAudit("BRANCH_UPDATE", "branch", id, `Data cabang ${branch.name} diperbarui oleh ${currentUser.name}`);
    posSound.beep();
    return { success: true, message: "Data cabang berhasil diperbarui!" };
  };

  const toggleBranchStatus = (id: string) => {
    const branch = branches.find((b) => b.id === id);
    if (!branch) return { success: false, message: "Cabang tidak ditemukan!" };

    const newStatus = branch.status === "active" ? "inactive" : "active";
    if (newStatus === "inactive" && currentSession?.status === "active" && currentSession.branchId === id) {
      posSound.error();
      return {
        success: false,
        message: "Tidak dapat menonaktifkan cabang karena sedang ada sesi kasir yang aktif!",
      };
    }

    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus, updatedAt: new Date().toISOString() } : b))
    );
    addAudit("BRANCH_STATUS_TOGGLE", "branch", id, `Status cabang ${branch.name} diubah menjadi: ${newStatus}`);
    posSound.beep();
    return { success: true, message: `Status cabang berhasil diubah ke ${newStatus === "active" ? "Aktif" : "Nonaktif (Read-only)"}!` };
  };

  // User Management (Superadmin RBAC)
  const addUser = (userData: Omit<User, "id">) => {
    const trimmedName = userData.name.trim();
    if (!trimmedName) return { success: false, message: "Nama pengguna wajib diisi!" };
    if (!userData.pin || userData.pin.length !== 4) return { success: false, message: "PIN harus 4 digit angka!" };

    const id = "usr-" + Date.now().toString().slice(-5);
    const newUser: User = {
      ...userData,
      id,
      name: trimmedName,
    };

    setUsers((prev) => [...prev, newUser]);
    addAudit("USER_CREATE", "user", id, `Pengguna baru dibuat: ${newUser.name} (${newUser.role})`);
    posSound.beep();
    return { success: true, user: newUser, message: `Pengguna ${newUser.name} berhasil ditambahkan!` };
  };

  const updateUser = (id: string, data: Partial<User>) => {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return { success: false, message: "Pengguna tidak ditemukan!" };

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
    addAudit("USER_UPDATE", "user", id, `Data pengguna ${targetUser.name} diperbarui`);
    posSound.beep();
    return { success: true, message: "Data pengguna berhasil diperbarui!" };
  };

  const toggleUserStatus = (id: string) => {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return { success: false, message: "Pengguna tidak ditemukan!" };

    const newStatus = targetUser.status === "active" ? "inactive" : "active";
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
    addAudit("USER_STATUS_TOGGLE", "user", id, `Status pengguna ${targetUser.name} diubah menjadi: ${newStatus}`);
    posSound.beep();
    return { success: true, message: `Status pengguna berhasil diubah ke ${newStatus === "active" ? "Aktif" : "Nonaktif"}!` };
  };

  // Add Customer (POS-US-001)
  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCust: Customer = {
      ...customerData,
      id: 'cust-' + Date.now().toString().slice(-5),
      branchId: selectedBranchId,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    addAudit('CUSTOMER_ADD', 'order', newCust.id, `Pelanggan baru ditambahkan: ${newCust.name} (${newCust.category})`);
    posSound.beep();
    return newCust;
  };

  return {
    switchUser,
    selectBranch,
    requestSwitchBranch,
    confirmAndSwitchBranch,
    cancelSwitchBranch,
    addBranch,
    updateBranch,
    toggleBranchStatus,
    addUser,
    updateUser,
    toggleUserStatus,
    addCustomer,
  };
}
