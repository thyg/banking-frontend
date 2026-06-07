/**
 * @file config/navigation.ts
 * @description Configuration de la navigation pour l'ERP.
 * 
 * @version 4.0.0 - Incrément 4 : Ajout pages rapprochement
 */

import { LucideIcon } from 'lucide-react';
import {
  ShoppingCart,
  Warehouse,
  UserCog,
  Settings,
  Landmark,
  Users,
  Package,
  FileText,
  BarChart3,
  Building2,
  ArrowLeftRight,
  ClipboardList,
  FileCheck,
  Receipt,
  Wallet,
  CircleDollarSign,
  Truck,
  Calendar,
  DollarSign,
  PieChart,
  Briefcase,
  Bell,
  Shield,
  Database,
  BookOpen,
  Tag,
  CreditCard,
  FileStack,
  Network,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface SidebarLink {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  /** If true, renders a separator line before this link */
  separatorBefore?: boolean;
  /** Optional section label to display before separator */
  sectionLabel?: string;
}

export interface ModuleConfig {
  name: string;
  icon: LucideIcon;
  composeActionLabel: string;
  sidebarLinks: SidebarLink[];
}

export type ModuleKey = 'ventes' | 'stock' | 'tresorerie' | 'personnel' | 'parametres';

// =============================================================================
// CONFIGURATION DES MODULES
// =============================================================================

export const modules: Record<ModuleKey, ModuleConfig> = {
  // ---------------------------------------------------------------------------
  // MODULE VENTES
  // ---------------------------------------------------------------------------
  ventes: {
    name: 'Ventes',
    icon: ShoppingCart,
    composeActionLabel: 'Nouveau Client',
    sidebarLinks: [
      { title: 'Vue d\'ensemble', href: '/dashboard', icon: BarChart3 },
      { title: 'Tous les clients', href: '/customers', icon: Users },
      { title: 'Factures', href: '/invoices', icon: FileText },
      { title: 'Ventes du mois', href: '/sales/monthly', icon: PieChart },
    ],
  },

  // ---------------------------------------------------------------------------
  // MODULE STOCK
  // ---------------------------------------------------------------------------
  stock: {
    name: 'Stock',
    icon: Warehouse,
    composeActionLabel: 'Nouvel Article',
    sidebarLinks: [
      { title: 'Produits', href: '/products', icon: Package },
      { title: 'Mouvements', href: '/stock/movements', icon: ArrowLeftRight },
      { title: 'Liste fournisseurs', href: '/suppliers', icon: Truck },
      { title: 'Commandes', href: '/suppliers/orders', icon: ClipboardList },
    ],
  },

  // ---------------------------------------------------------------------------
  // MODULE TRÉSORERIE
  // ---------------------------------------------------------------------------
  tresorerie: {
    name: 'Trésorerie',
    icon: Landmark,
    composeActionLabel: 'Nouvelle Transaction',
    sidebarLinks: [
      // Tableau de bord
      { title: 'Vue d\'ensemble', href: '/banking', icon: BarChart3 },
      // Institutions & Comptes
      { title: 'Banques', href: '/banking/banks', icon: Landmark },
      { title: 'Comptes Bancaires', href: '/banking/accounts', icon: Building2 },
      // Chèques
      { title: 'Chéquiers', href: '/banking/checkbooks', icon: BookOpen },
      { title: 'Chèques', href: '/banking/checks', icon: FileText },
      { title: 'Remises de Chèques', href: '/banking/check-deposits', icon: FileStack },
      // Opérations
      { title: 'Transactions', href: '/banking/transactions', icon: ArrowLeftRight },
      // Rapprochement
      { title: 'Relevés Bancaires', href: '/banking/statements', icon: ClipboardList },
      { title: 'Rapprochement', href: '/banking/reconciliation', icon: FileCheck },
      // Caisse (désactivé - autre membre équipe)
      { title: 'Caisses', href: '/banking/cash-registers', icon: Wallet, disabled: true },
      { title: 'Opérations Caisse', href: '/banking/cash-operations', icon: CircleDollarSign, disabled: true },
      // Configuration (avec séparateur)
      { title: 'Catégories Banques', href: '/banking/configuration/bank-categories', icon: Tag, separatorBefore: true, sectionLabel: 'Configuration' },
      { title: 'Types Transactions', href: '/banking/transaction-types', icon: Receipt },
      { title: 'Types de Comptes', href: '/banking/configuration/account-types', icon: CreditCard },
    ],
  },

  // ---------------------------------------------------------------------------
  // MODULE PERSONNEL
  // ---------------------------------------------------------------------------
  personnel: {
    name: 'Personnel',
    icon: UserCog,
    composeActionLabel: 'Nouvel Employé',
    sidebarLinks: [
      { title: 'Liste employés', href: '/personnel/employees', icon: Users },
      { title: 'Planning', href: '/personnel/schedule', icon: Calendar },
      { title: 'Salaires', href: '/personnel/salaries', icon: DollarSign },
    ],
  },

  // ---------------------------------------------------------------------------
  // MODULE PARAMÈTRES
  // ---------------------------------------------------------------------------
  parametres: {
    name: 'Paramètres',
    icon: Settings,
    composeActionLabel: 'Nouvelle Config',
    sidebarLinks: [
      { title: 'Entreprise', href: '/settings/company', icon: Briefcase },
      { title: 'Utilisateurs', href: '/settings/users', icon: Users },
      { title: 'Rôles & Permissions', href: '/settings/roles', icon: Shield },
      { title: 'Organisations', href: '/organizations', icon: Building2 },
      { title: 'Exercices fiscaux', href: '/settings/fiscal-years', icon: Calendar },
      { title: 'Audit système', href: '/settings/audits', icon: Database },
    ],
  },

};

// =============================================================================
// HELPERS
// =============================================================================

export function getModuleKeys(): ModuleKey[] {
  return Object.keys(modules) as ModuleKey[];
}

export function isValidModuleKey(key: string): key is ModuleKey {
  return key in modules;
}

export function getModuleConfig(key: ModuleKey): ModuleConfig {
  return modules[key];
}

export function findModuleByPath(path: string): ModuleKey | null {
  for (const [key, config] of Object.entries(modules)) {
    for (const link of config.sidebarLinks) {
      if (path.startsWith(link.href)) {
        return key as ModuleKey;
      }
    }
  }
  return null;
}