import { create } from "zustand";
import { persist } from "zustand/middleware";

type ServiceState = {
  selectedServiceId: string | null;
  selectService: (serviceId: string | null) => void;
};

export const useServiceStore = create<ServiceState>()(
  persist(
    (set) => ({
      selectedServiceId: null,
      selectService: (selectedServiceId) => set({ selectedServiceId })
    }),
    { name: "aegis-selected-service-v1" }
  )
);
