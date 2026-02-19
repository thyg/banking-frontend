/**
 * @file lib/utils/pdf-generator.ts
 * @description Générateur de PDF pour documents bancaires (chèques, transactions).
 * Génère des documents professionnels conformes aux normes comptables.
 *
 * @version 2.0.0
 * @author RT-ComOps Team
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Check, BankTransaction } from '@/types/banking';
import { amountToWords } from './number-to-words';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Informations sur l'organisation émettrice du document.
 */
export interface OrganizationInfo {
  name?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  registrationNumber?: string; // RCCM, Numéro contribuable
}

// =============================================================================
// CONFIGURATION ET CONSTANTES
// =============================================================================

const CHECK_WIDTH = 175;
const CHECK_HEIGHT = 80;

// Calibration pour l'imprimante (en mm)
const PRINT_OFFSET = { x: 0, y: 0 };

const COLORS = {
  text: '#1a202c',
  subtext: '#4a5568',
  border: '#2d3748', // Un peu plus sombre pour plus de netteté
  fill: '#f8fafc',
  micr: '#000000',
};

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// =============================================================================
// GÉNÉRATION
// =============================================================================

export function generateCheckPDF(
  check: Check,
  options: {
    download?: boolean;
    filename?: string;
    isPrePrinted?: boolean;
  } = {}
): void {
  const { download = false, filename, isPrePrinted = false } = options;
  const ox = PRINT_OFFSET.x;
  const oy = PRINT_OFFSET.y;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CHECK_WIDTH, CHECK_HEIGHT],
  });

  // 1. FOND ET STRUCTURE
  if (!isPrePrinted) {
    doc.setFillColor(COLORS.fill);
    doc.rect(0, 0, CHECK_WIDTH, CHECK_HEIGHT, 'F');
    
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(2 + ox, 2 + oy, CHECK_WIDTH - 4, CHECK_HEIGHT - 4, 'S');

    // Sécurité : Micro-lignes
    doc.setDrawColor('#e2e8f0');
    for (let i = 6; i < CHECK_HEIGHT - 6; i += 2) {
      doc.line(6 + ox, i + oy, CHECK_WIDTH - 6 + ox, i + oy);
    }
  }

  // 2. EN-TÊTE
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text((check.bankAccountName || 'COMPTE COURANT').toUpperCase(), 10 + ox, 12 + oy);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('N°', CHECK_WIDTH - 42 + ox, 10 + oy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(check.checkNumber || '000000', CHECK_WIDTH - 37 + ox, 10 + oy);

  // 3. ZONE MONTANT (CORRIGÉE AVEC PADDING)
  const boxWidth = 52;
  const boxHeight = 12;
  const boxX = CHECK_WIDTH - boxWidth - 8 + ox; // 8mm de marge droite
  const boxY = 15 + oy;

  if (!isPrePrinted) {
    doc.setDrawColor(COLORS.text);
    doc.setLineWidth(0.4);
    doc.rect(boxX, boxY, boxWidth, boxHeight, 'S');
  }

  // Devise (Padding gauche)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(check.currency || 'XAF', boxX + 2, boxY + 7);

  // Chiffres (Padding droit)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const displayAmount = `*** ${formatAmount(check.amount)} ***`;
  doc.text(displayAmount, boxX + boxWidth - 2, boxY + 7.5, { align: 'right' });

  // 4. MONTANT EN LETTRES
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(COLORS.subtext);
  doc.text("PAYEZ CONTRE CE CHÈQUE NON ENDOSSABLE SAUF AU PROFIT D'UNE BANQUE", 10 + ox, 28 + oy);

  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const currencyLabel = check.currency === 'EUR' ? 'euros' : 'francs CFA';
  const amountInWords = `# ${amountToWords(check.amount, currencyLabel)} #`;
  const splitWords = doc.splitTextToSize(amountInWords, CHECK_WIDTH - 75);
  doc.text(splitWords, 10 + ox, 34 + oy);

  // 5. BÉNÉFICIAIRE
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.subtext);
  doc.text('À l\'ordre de :', 10 + ox, 48 + oy);

  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(check.partnerName.toUpperCase(), 32 + ox, 48 + oy);

  // 6. LIEU ET DATE
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Fait à : Douala`, CHECK_WIDTH - 60 + ox, 50 + oy);
  doc.text(`Le : ${formatDate(check.issueDate)}`, CHECK_WIDTH - 60 + ox, 57 + oy);

  // 7. ZONE SIGNATURE
  if (!isPrePrinted) {
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.2);
    doc.rect(CHECK_WIDTH - 60 + ox, 62 + oy, 52, 14, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Signature autorisée', CHECK_WIDTH - 34 + ox, 74 + oy, { align: 'center' });
  }

  // 8. LIGNE MICR (BAS)
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.micr);
  const micrLine = `C${check.checkNumber}C  A${check.bankAccountId?.substring(0, 9)}A  ${check.checkNumber} 123`;
  doc.text(micrLine, CHECK_WIDTH / 2 + ox, CHECK_HEIGHT - 6 + oy, { align: 'center' });

  // 9. SORTIE
  const pdfFilename = filename || `cheque-${check.checkNumber}.pdf`;
  if (download) {
    doc.save(pdfFilename);
  } else {
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl as unknown as string, '_blank');
  }
}

export function downloadCheckPDF(check: Check): void {
  generateCheckPDF(check, { download: true });
}

// =============================================================================
// GÉNÉRATION PDF TRANSACTION BANCAIRE
// =============================================================================

/**
 * Formate une date en français (DD/MM/YYYY).
 */
function formatDateFr(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate un montant en devise.
 */
function formatCurrency(amount: number, currency: string = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
    maximumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
  }).format(amount);
}

/**
 * Retourne le nom de la devise en toutes lettres.
 */
function getCurrencyName(currency: string = 'XAF'): string {
  switch (currency) {
    case 'XAF':
    case 'XOF':
      return 'francs CFA';
    case 'EUR':
      return 'euro';
    case 'USD':
      return 'dollar';
    default:
      return currency;
  }
}

/**
 * Génère un PDF professionnel pour une transaction bancaire.
 * Le document peut servir de pièce comptable officielle (reçu de paiement ou ordre de virement).
 *
 * @param transaction - La transaction bancaire à documenter
 * @param organization - Informations optionnelles sur l'organisation émettrice
 */
export function generateTransactionPDF(
  transaction: BankTransaction,
  organization?: OrganizationInfo
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Couleurs
  const primaryColor: [number, number, number] = [26, 86, 219]; // Bleu ERP
  const successColor: [number, number, number] = [22, 163, 74]; // Vert
  const dangerColor: [number, number, number] = [220, 38, 38]; // Rouge

  // ==========================================================================
  // 1. EN-TÊTE (Header)
  // ==========================================================================

  // Nom de l'organisation ou logo
  if (organization?.name) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(organization.name.toUpperCase(), margin, 20);

    // Informations de contact (si disponibles)
    let contactY = 25;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);

    if (organization.address) {
      doc.text(organization.address, margin, contactY);
      contactY += 4;
    }
    if (organization.phone) {
      doc.text(`Tél: ${organization.phone}`, margin, contactY);
      contactY += 4;
    }
    if (organization.registrationNumber) {
      doc.text(`RCCM: ${organization.registrationNumber}`, margin, contactY);
    }
  } else {
    // Nom par défaut
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('KSM Pro ERP', margin, 20);
  }

  // Titre du document (centré)
  const docTitle = transaction.direction === 'CREDIT'
    ? 'REÇU DE PAIEMENT'
    : 'ORDRE DE VIREMENT';

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(docTitle, pageWidth / 2, 45, { align: 'center' });

  // Ligne décorative sous le titre
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 40, 48, pageWidth / 2 + 40, 48);

  // Référence et Date (alignés à droite)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Référence: ${transaction.reference || 'N/A'}`, pageWidth - margin, 20, { align: 'right' });
  doc.text(`Date: ${formatDateFr(transaction.transactionDate)}`, pageWidth - margin, 26, { align: 'right' });

  // Statut de la transaction
  doc.setFontSize(9);
  const statusText = transaction.status === 'VALIDATED'
    ? 'VALIDÉE'
    : transaction.status === 'CANCELLED'
      ? 'ANNULÉE'
      : 'BROUILLON';
  const statusColor = transaction.status === 'VALIDATED'
    ? successColor
    : transaction.status === 'CANCELLED'
      ? dangerColor
      : [180, 83, 9] as [number, number, number]; // Amber
  doc.setTextColor(...statusColor);
  doc.text(`Statut: ${statusText}`, pageWidth - margin, 32, { align: 'right' });

  // ==========================================================================
  // 2. MONTANT PRINCIPAL (très visible)
  // ==========================================================================

  const amountStartY = 60;

  // Boîte colorée pour le montant
  const amountBoxColor = transaction.direction === 'CREDIT' ? successColor : dangerColor;
  doc.setFillColor(amountBoxColor[0], amountBoxColor[1], amountBoxColor[2], 0.1);
  doc.setDrawColor(...amountBoxColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, amountStartY - 8, pageWidth - margin * 2, 28, 3, 3, 'FD');

  // Montant en chiffres
  const sign = transaction.direction === 'CREDIT' ? '+' : '-';
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...amountBoxColor);
  doc.text(
    `${sign} ${formatCurrency(transaction.amount, transaction.currency || 'XAF')}`,
    pageWidth / 2,
    amountStartY + 6,
    { align: 'center' }
  );

  // Montant en lettres
  const amountInWordsText = amountToWords(
    transaction.amount,
    getCurrencyName(transaction.currency || 'XAF')
  );
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  const wordsLine = `Arrêté le présent ${transaction.direction === 'CREDIT' ? 'reçu' : 'ordre'} à la somme de : ${amountInWordsText}.`;
  const splitWords = doc.splitTextToSize(wordsLine, pageWidth - margin * 2 - 10);
  doc.text(splitWords, pageWidth / 2, amountStartY + 14, { align: 'center' });

  // ==========================================================================
  // 3. TABLEAU DES DÉTAILS
  // ==========================================================================

  const tableStartY = amountStartY + 35;

  // Construire le corps du tableau
  const tableBody: [string, string][] = [
    ['Compte Bancaire', transaction.bankAccountName || 'Non spécifié'],
    ['Partenaire / Tiers', transaction.partnerName || '-'],
    ['Type d\'Opération', `${transaction.transactionTypeCode || ''} - ${transaction.transactionTypeLabel || 'Non spécifié'}`],
    ['Date de l\'Opération', formatDateFr(transaction.transactionDate)],
  ];

  // Ajouter la date de valeur si présente
  if (transaction.valueDate) {
    tableBody.push(['Date de Valeur', formatDateFr(transaction.valueDate)]);
  }

  // Description / Objet
  tableBody.push(['Objet / Description', transaction.description || transaction.label || '-']);

  // Référence externe si présente
  if (transaction.externalReference) {
    tableBody.push(['Référence Externe (Vos Réf.)', transaction.externalReference]);
  }

  // Chèque lié si présent
  if (transaction.checkNumber) {
    tableBody.push(['Chèque Associé', `N° ${transaction.checkNumber}`]);
  }

  // Rapprochement bancaire
  tableBody.push([
    'Rapprochement Bancaire',
    transaction.isReconciled
      ? `Rapprochée${transaction.reconciledAt ? ` le ${formatDateFr(transaction.reconciledAt)}` : ''}`
      : 'En attente'
  ]);

  autoTable(doc, {
    startY: tableStartY,
    theme: 'striped',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55, textColor: [71, 85, 105] },
      1: { cellWidth: 'auto' },
    },
    body: tableBody,
    margin: { left: margin, right: margin },
  });

  // Récupérer la position Y après le tableau
  const finalTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || tableStartY + 80;

  // ==========================================================================
  // 4. ZONES DE SIGNATURE
  // ==========================================================================

  const signatureY = finalTableY + 25;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);

  // Signature gauche (Trésorier)
  doc.text('Le Trésorier', margin, signatureY);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, signatureY + 20, margin + 60, signatureY + 20);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Signature et cachet', margin, signatureY + 25);

  // Signature droite (Bénéficiaire/Tiers)
  const rightSignX = pageWidth - margin - 60;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(
    transaction.direction === 'CREDIT' ? 'Le Payeur' : 'Le Bénéficiaire',
    rightSignX,
    signatureY
  );
  doc.setDrawColor(180);
  doc.line(rightSignX, signatureY + 20, rightSignX + 60, signatureY + 20);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Signature', rightSignX, signatureY + 25);

  // ==========================================================================
  // 5. PIED DE PAGE
  // ==========================================================================

  // Ligne de séparation
  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

  // Information de génération
  doc.setFontSize(8);
  doc.setTextColor(150);
  const generatedDate = new Date();
  doc.text(
    `Document généré par KSM Pro ERP le ${generatedDate.toLocaleDateString('fr-FR')} à ${generatedDate.toLocaleTimeString('fr-FR')}`,
    pageWidth / 2,
    pageHeight - 12,
    { align: 'center' }
  );

  // Mention légale
  doc.text(
    'Ce document constitue une pièce comptable officielle.',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  // ==========================================================================
  // 6. AFFICHAGE DU PDF
  // ==========================================================================

  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl as unknown as string, '_blank');
}

/**
 * Télécharge directement le PDF de la transaction.
 */
export function downloadTransactionPDF(
  transaction: BankTransaction,
  organization?: OrganizationInfo
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Couleurs
  const primaryColor: [number, number, number] = [26, 86, 219];
  const successColor: [number, number, number] = [22, 163, 74];
  const dangerColor: [number, number, number] = [220, 38, 38];

  // EN-TÊTE
  if (organization?.name) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(organization.name.toUpperCase(), margin, 20);

    let contactY = 25;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    if (organization.address) {
      doc.text(organization.address, margin, contactY);
      contactY += 4;
    }
    if (organization.phone) {
      doc.text(`Tél: ${organization.phone}`, margin, contactY);
      contactY += 4;
    }
    if (organization.registrationNumber) {
      doc.text(`RCCM: ${organization.registrationNumber}`, margin, contactY);
    }
  } else {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('KSM Pro ERP', margin, 20);
  }

  const docTitle = transaction.direction === 'CREDIT' ? 'REÇU DE PAIEMENT' : 'ORDRE DE VIREMENT';
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(docTitle, pageWidth / 2, 45, { align: 'center' });
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 40, 48, pageWidth / 2 + 40, 48);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Référence: ${transaction.reference || 'N/A'}`, pageWidth - margin, 20, { align: 'right' });
  doc.text(`Date: ${formatDateFr(transaction.transactionDate)}`, pageWidth - margin, 26, { align: 'right' });

  const statusText = transaction.status === 'VALIDATED' ? 'VALIDÉE' : transaction.status === 'CANCELLED' ? 'ANNULÉE' : 'BROUILLON';
  const statusColor = transaction.status === 'VALIDATED' ? successColor : transaction.status === 'CANCELLED' ? dangerColor : [180, 83, 9] as [number, number, number];
  doc.setFontSize(9);
  doc.setTextColor(...statusColor);
  doc.text(`Statut: ${statusText}`, pageWidth - margin, 32, { align: 'right' });

  // MONTANT
  const amountStartY = 60;
  const amountBoxColor = transaction.direction === 'CREDIT' ? successColor : dangerColor;
  doc.setFillColor(amountBoxColor[0], amountBoxColor[1], amountBoxColor[2], 0.1);
  doc.setDrawColor(...amountBoxColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, amountStartY - 8, pageWidth - margin * 2, 28, 3, 3, 'FD');

  const sign = transaction.direction === 'CREDIT' ? '+' : '-';
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...amountBoxColor);
  doc.text(`${sign} ${formatCurrency(transaction.amount, transaction.currency || 'XAF')}`, pageWidth / 2, amountStartY + 6, { align: 'center' });

  const amountInWordsText = amountToWords(transaction.amount, getCurrencyName(transaction.currency || 'XAF'));
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80);
  const wordsLine = `Arrêté le présent ${transaction.direction === 'CREDIT' ? 'reçu' : 'ordre'} à la somme de : ${amountInWordsText}.`;
  const splitWords = doc.splitTextToSize(wordsLine, pageWidth - margin * 2 - 10);
  doc.text(splitWords, pageWidth / 2, amountStartY + 14, { align: 'center' });

  // TABLEAU
  const tableStartY = amountStartY + 35;
  const tableBody: [string, string][] = [
    ['Compte Bancaire', transaction.bankAccountName || 'Non spécifié'],
    ['Partenaire / Tiers', transaction.partnerName || '-'],
    ['Type d\'Opération', `${transaction.transactionTypeCode || ''} - ${transaction.transactionTypeLabel || 'Non spécifié'}`],
    ['Date de l\'Opération', formatDateFr(transaction.transactionDate)],
  ];
  if (transaction.valueDate) {
    tableBody.push(['Date de Valeur', formatDateFr(transaction.valueDate)]);
  }
  tableBody.push(['Objet / Description', transaction.description || transaction.label || '-']);
  if (transaction.externalReference) {
    tableBody.push(['Référence Externe (Vos Réf.)', transaction.externalReference]);
  }
  if (transaction.checkNumber) {
    tableBody.push(['Chèque Associé', `N° ${transaction.checkNumber}`]);
  }
  tableBody.push(['Rapprochement Bancaire', transaction.isReconciled ? `Rapprochée${transaction.reconciledAt ? ` le ${formatDateFr(transaction.reconciledAt)}` : ''}` : 'En attente']);

  autoTable(doc, {
    startY: tableStartY,
    theme: 'striped',
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: [71, 85, 105] }, 1: { cellWidth: 'auto' } },
    body: tableBody,
    margin: { left: margin, right: margin },
  });

  const finalTableY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || tableStartY + 80;

  // SIGNATURES
  const signatureY = finalTableY + 25;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text('Le Trésorier', margin, signatureY);
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(margin, signatureY + 20, margin + 60, signatureY + 20);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Signature et cachet', margin, signatureY + 25);

  const rightSignX = pageWidth - margin - 60;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(transaction.direction === 'CREDIT' ? 'Le Payeur' : 'Le Bénéficiaire', rightSignX, signatureY);
  doc.setDrawColor(180);
  doc.line(rightSignX, signatureY + 20, rightSignX + 60, signatureY + 20);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Signature', rightSignX, signatureY + 25);

  // PIED DE PAGE
  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
  doc.setFontSize(8);
  doc.setTextColor(150);
  const generatedDate = new Date();
  doc.text(`Document généré par KSM Pro ERP le ${generatedDate.toLocaleDateString('fr-FR')} à ${generatedDate.toLocaleTimeString('fr-FR')}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('Ce document constitue une pièce comptable officielle.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // TÉLÉCHARGEMENT
  const filename = `transaction-${transaction.reference || transaction.id}-${formatDateFr(transaction.transactionDate).replace(/\//g, '-')}.pdf`;
  doc.save(filename);
}