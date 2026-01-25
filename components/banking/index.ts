/**
 * @file components/banking/index.ts
 * @description Exports centralisés pour les composants du module Trésorerie.
 * 
 * @version 4.1.0 - N'exporte QUE les composants existants de l'incrément 4
 * 
 * NOTE: Décommentez les exports quand vous ajoutez les fichiers correspondants
 */

// =============================================================================
// RAPPROCHEMENT (INCRÉMENT 4 - NOUVEAUX)
// =============================================================================

export { ReconciliationPanel } from './reconciliation-panel';
export type { ManualReconciliationData } from './reconciliation-panel';
export { StatementLinesTable } from './statement-lines-table';
export { StatementUploader } from './statement-uploader';

// =============================================================================
// PARAMÉTRAGE (Incrément 1 - Décommenter si les fichiers existent)
// =============================================================================

 export { BankForm } from './settings/bank-form';
 export { BankList } from './settings/bank-list';
 export { BankCategoryForm } from './settings/bank-category-form';
 export { BankCategoryList } from './settings/bank-category-list';
 export { TransactionTypeForm } from './settings/transaction-type-form';
 export { TransactionTypeList } from './settings/transaction-type-list';

// =============================================================================
// TRANSACTIONS (Incrément 3 - Décommenter si les fichiers existent)
// =============================================================================

 export { BankTransactionForm } from './bank-transaction-form';
 export { BankTransactionList } from './bank-transaction-list';

// =============================================================================
// CHÈQUES (Incrément 3 - Décommenter si les fichiers existent)
// =============================================================================

 export { CheckForm } from './check-form';
 export { CheckList } from './check-list';
 export { ActiveFilterBadges } from './active-filter-badges';

// =============================================================================
// CHÉQUIERS (Phase 4 - Navigation filtrée)
// =============================================================================

export { CheckbookList } from './checkbook-list';
export { CheckbookDetailDialog } from './checkbook-detail-dialog';
export { BalanceIndicator } from './balance-indicator';




//export { BankAccountList } from './bank-account-list';
export { BankAccountCard } from './bank-account-card';
export { BankAccountForm } from './bank-account-form';
export { DynamicConnectorFields, validateConnectorFields } from './dynamic-connector-fields';
export { BankAccountFilters } from './bank-account-filters';
export { AccountTransactionsList } from './account-transactions-list';
export { AccountStatementsList } from './account-statements-list';
export { AccountChecksList } from './account-checks-list';