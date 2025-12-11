/**
 * @file hooks/use-navigation-store.ts
 * @description Store Zustand pour la gestion de la navigation entre modules.
 * 
 * @version 3.0.0 - Ajout module tresorerie
 */

import { create } from 'zustand';
import { modules, ModuleKey } from '@/config/navigation';

// =============================================================================
// TYPES
// =============================================================================

interface NavigationState {
  activeModule: ModuleKey;
  setActiveModule: (module: ModuleKey) => void;
}

// =============================================================================
// STORE
// =============================================================================

// Le module par défaut sera 'ventes' (ou le premier disponible)
const defaultModule: ModuleKey = modules ? (Object.keys(modules)[0] as ModuleKey) : 'ventes';

export const useNavigationStore = create<NavigationState>((set) => ({
  activeModule: defaultModule,
  setActiveModule: (module: ModuleKey) => set({ activeModule: module }),
}));