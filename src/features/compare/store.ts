import { create } from "zustand";

interface CompareStore {
  selectedIds: string[];
  toggle: (id: string) => void;
  clear: () => void;
  canAdd: boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  selectedIds: [],
  canAdd: true,
  toggle(id: string) {
    const { selectedIds } = get();
    if (selectedIds.includes(id)) {
      set({ selectedIds: selectedIds.filter((s) => s !== id), canAdd: true });
    } else if (selectedIds.length < 2) {
      const next = [...selectedIds, id];
      set({ selectedIds: next, canAdd: next.length < 2 });
    }
  },
  clear() {
    set({ selectedIds: [], canAdd: true });
  },
}));
