import { create } from "zustand";

interface AdminStore {
  isAuthenticated: boolean;
  showModal: boolean;
  setAuthenticated: (value: boolean) => void;
  openModal: () => void;
  closeModal: () => void;
  /** Callback to invoke after successful auth */
  onAuthSuccess: (() => void) | null;
  setOnAuthSuccess: (cb: (() => void) | null) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  isAuthenticated: false,
  showModal: false,
  onAuthSuccess: null,
  setAuthenticated(value) {
    set({ isAuthenticated: value });
  },
  openModal() {
    set({ showModal: true });
  },
  closeModal() {
    set({ showModal: false, onAuthSuccess: null });
  },
  setOnAuthSuccess(cb) {
    set({ onAuthSuccess: cb });
  },
}));
