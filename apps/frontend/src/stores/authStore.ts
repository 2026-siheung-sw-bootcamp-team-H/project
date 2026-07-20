import { create } from "zustand";
import { persist } from "zustand/middleware";

type Admin = { name: string; email: string };

type AuthState = {
  token: string | null;
  admin: Admin | null;
  setSession: (token: string, admin: Admin) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setSession: (token, admin) => set({ token, admin }),
      clearSession: () => set({ token: null, admin: null })
    }),
    { name: "aegis-demo-session-v2" }
  )
);
