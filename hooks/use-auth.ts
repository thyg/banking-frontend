"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  userId: string;
  tenantId: string;
  organizationId?: string;
  actorId?: string;
  email?: string;
  token: string;
  expiresAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  /** Organisation de travail choisie (miroir client de l'organisation de la session BFF). */
  setOrganization: (organizationId: string | null) => void;
  getToken: () => string | null;
  getTenantId: () => string | null;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (user: AuthUser) => {
        set({ user, isAuthenticated: true });
        // Aussi dans un cookie léger pour le middleware Next.js
        if (typeof document !== "undefined") {
          document.cookie = `iwm-token=${user.token}; path=/; max-age=43200; SameSite=Lax`;
          document.cookie = `iwm-tenant=${user.tenantId}; path=/; max-age=43200; SameSite=Lax`;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        if (typeof document !== "undefined") {
          document.cookie = "iwm-token=; path=/; max-age=0";
          document.cookie = "iwm-tenant=; path=/; max-age=0";
        }
      },

      setOrganization: (organizationId: string | null) => {
        const user = get().user;
        if (user) set({ user: { ...user, organizationId: organizationId ?? undefined } });
      },

      getToken: () => get().user?.token ?? null,
      getTenantId: () => get().user?.tenantId ?? null,
    }),
    {
      name: "iwm-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
