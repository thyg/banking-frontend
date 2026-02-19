/**
 * @file lib/utils/deposit-slip-pdf.ts
 * @description Generateur de PDF pour les bordereaux de remise de cheques.
 * Utilise jsPDF et jspdf-autotable pour creer des documents professionnels.
 *
 * @version 1.0.0
 * @author RT-ComOps Team
 * @since 2026-02-18
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CheckDeposit, Check } from '@/types/banking';

// =============================================================================
// CONSTANTES DE DESIGN
// =============================================================================

const COLORS = {
  primary: '#1a365d',      // Bleu fonce pour texte principal
  secondary: '#4a5568',    // Gris pour texte secondaire
  border: '#cbd5e0',       // Bordure legere
  lightGray: '#f7fafc',    // Fond leger
  accent: '#2b6cb0',       // Bleu accent
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Formate une date ISO en format francais JJ/MM/AAAA
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate un montant en format francais avec devise
 */
function formatAmount(amount: number, currency: string = 'XAF'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

// =============================================================================
// GENERATION DU PDF
// =============================================================================

/**
 * Genere un bordereau de remise de cheques au format PDF.
 *
 * @param deposit La remise de cheques
 * @param checks La liste des cheques inclus dans la remise
 */
export function generateDepositSlipPDF(deposit: CheckDeposit, checks: Check[]): void {
  // Creer le document PDF au format A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = 20;

  // -------------------------------------------------------------------------
  // 1. EN-TETE
  // -------------------------------------------------------------------------

  // Titre principal
  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text('BORDEREAU DE REMISE DE CHEQUES', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;

  // Sous-titre avec reference
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text(`Reference: ${deposit.reference}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // -------------------------------------------------------------------------
  // 2. INFORMATIONS DE LA REMISE (Cadre)
  // -------------------------------------------------------------------------

  // Cadre pour les informations principales
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 2, 2, 'S');

  // Fond leger
  doc.setFillColor(...hexToRgb(COLORS.lightGray));
  doc.roundedRect(margin + 0.25, yPosition + 0.25, pageWidth - 2 * margin - 0.5, 34.5, 1.75, 1.75, 'F');

  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 5;
  let infoY = yPosition + 8;

  // Colonne 1
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Compte bancaire:', col1X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(deposit.bankAccountName || 'Non specifie', col1X + 35, infoY);

  infoY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Date de depot:', col1X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(deposit.depositDate), col1X + 35, infoY);

  infoY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Nombre de cheques:', col1X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(deposit.checkCount.toString(), col1X + 35, infoY);

  // Colonne 2
  infoY = yPosition + 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Statut:', col2X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  const statusLabel = getStatusLabel(deposit.status);
  doc.text(statusLabel, col2X + 25, infoY);

  infoY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Date d\'encaissement:', col2X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(deposit.cashedDate ? formatDate(deposit.cashedDate) : '-', col2X + 35, infoY);

  // Montant total (en gras et plus grand)
  infoY += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('MONTANT TOTAL:', col2X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.accent));
  doc.setFont('helvetica', 'bold');
  doc.text(formatAmount(deposit.totalAmount, deposit.currency), col2X + 35, infoY);

  yPosition += 45;

  // -------------------------------------------------------------------------
  // 3. TABLEAU DES CHEQUES
  // -------------------------------------------------------------------------

  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text('DETAIL DES CHEQUES', margin, yPosition);

  yPosition += 5;

  // Preparer les donnees du tableau
  const tableData = checks.map((check, index) => [
    (index + 1).toString(),
    check.checkNumber || '-',
    check.issuerBank || '-',
    check.partnerName || '-',
    formatDate(check.receiptDate),
    formatAmount(check.amount, deposit.currency || 'XAF'),
  ]);

  // Ligne de total
  const totalRow = [
    '',
    '',
    '',
    '',
    'TOTAL',
    formatAmount(deposit.totalAmount, deposit.currency),
  ];

  // Generer le tableau avec jspdf-autotable
  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'N° Cheque', 'Banque Emettrice', 'Tireur (Partenaire)', 'Date Reception', 'Montant']],
    body: [...tableData, totalRow],
    foot: [],
    theme: 'striped',
    headStyles: {
      fillColor: hexToRgb(COLORS.primary),
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: hexToRgb(COLORS.primary),
    },
    alternateRowStyles: {
      fillColor: hexToRgb(COLORS.lightGray),
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 45 },
      4: { halign: 'center', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Style special pour la ligne de total
      if (data.row.index === tableData.length && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = hexToRgb(COLORS.lightGray);
        if (data.column.index === 5) {
          data.cell.styles.textColor = hexToRgb(COLORS.accent);
          data.cell.styles.fontSize = 10;
        }
      }
    },
  });

  // Recuperer la position Y apres le tableau
  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // -------------------------------------------------------------------------
  // 4. ZONE DE SIGNATURE
  // -------------------------------------------------------------------------

  // Verifier s'il reste assez de place, sinon nouvelle page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Cadre pour la signature
  const signatureWidth = 80;
  const signatureX = pageWidth - margin - signatureWidth;

  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.5);
  doc.rect(signatureX, yPosition, signatureWidth, 35, 'S');

  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.setFont('helvetica', 'normal');
  doc.text('Date et Signature:', signatureX + 5, yPosition + 8);

  // Ligne pour la date
  doc.line(signatureX + 5, yPosition + 15, signatureX + signatureWidth - 5, yPosition + 15);

  doc.text('Signature:', signatureX + 5, yPosition + 25);

  // -------------------------------------------------------------------------
  // 5. PIED DE PAGE
  // -------------------------------------------------------------------------

  const pageHeight = doc.internal.pageSize.getHeight();

  // Ligne de separation
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

  // Informations du pied de page
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text(`Document genere le ${formatDate(new Date().toISOString())}`, margin, pageHeight - 10);
  doc.text(`Reference: ${deposit.reference}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Page 1/1', pageWidth - margin, pageHeight - 10, { align: 'right' });

  // -------------------------------------------------------------------------
  // 6. OUVRIR LE PDF
  // -------------------------------------------------------------------------

  // Ouvrir dans un nouvel onglet pour previsualisation/impression
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl as unknown as string, '_blank');
}

/**
 * Retourne le libelle francais du statut.
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'DEPOSITED':
      return 'Deposee';
    case 'CASHED':
      return 'Encaissee';
    case 'RECONCILED':
      return 'Rapprochee';
    default:
      return status;
  }
}

/**
 * Telecharge directement le bordereau de remise.
 *
 * @param deposit La remise de cheques
 * @param checks La liste des cheques
 */
export function downloadDepositSlipPDF(deposit: CheckDeposit, checks: Check[]): void {
  // Creer le document PDF au format A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPosition = 20;

  // Memes contenus que generateDepositSlipPDF...
  // (code duplique pour simplifier, dans un vrai projet on factoriserait)

  // Titre principal
  doc.setFontSize(18);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text('BORDEREAU DE REMISE DE CHEQUES', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text(`Reference: ${deposit.reference}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Cadre info
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 2, 2, 'S');
  doc.setFillColor(...hexToRgb(COLORS.lightGray));
  doc.roundedRect(margin + 0.25, yPosition + 0.25, pageWidth - 2 * margin - 0.5, 34.5, 1.75, 1.75, 'F');

  const col1X = margin + 5;
  const col2X = pageWidth / 2 + 5;
  let infoY = yPosition + 8;

  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Compte bancaire:', col1X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(deposit.bankAccountName || 'Non specifie', col1X + 35, infoY);

  infoY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Date de depot:', col1X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(deposit.depositDate), col1X + 35, infoY);

  infoY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Nombre de cheques:', col1X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(deposit.checkCount.toString(), col1X + 35, infoY);

  infoY = yPosition + 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Statut:', col2X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(getStatusLabel(deposit.status), col2X + 25, infoY);

  infoY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('Date d\'encaissement:', col2X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text(deposit.cashedDate ? formatDate(deposit.cashedDate) : '-', col2X + 35, infoY);

  infoY += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text('MONTANT TOTAL:', col2X, infoY);
  doc.setTextColor(...hexToRgb(COLORS.accent));
  doc.setFont('helvetica', 'bold');
  doc.text(formatAmount(deposit.totalAmount, deposit.currency), col2X + 35, infoY);

  yPosition += 45;

  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(COLORS.primary));
  doc.setFont('helvetica', 'bold');
  doc.text('DETAIL DES CHEQUES', margin, yPosition);

  yPosition += 5;

  const tableData = checks.map((check, index) => [
    (index + 1).toString(),
    check.checkNumber || '-',
    check.issuerBank || '-',
    check.partnerName || '-',
    formatDate(check.receiptDate),
    formatAmount(check.amount, deposit.currency || 'XAF'),
  ]);

  const totalRow = ['', '', '', '', 'TOTAL', formatAmount(deposit.totalAmount, deposit.currency)];

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'N° Cheque', 'Banque Emettrice', 'Tireur (Partenaire)', 'Date Reception', 'Montant']],
    body: [...tableData, totalRow],
    theme: 'striped',
    headStyles: {
      fillColor: hexToRgb(COLORS.primary),
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: hexToRgb(COLORS.primary),
    },
    alternateRowStyles: {
      fillColor: hexToRgb(COLORS.lightGray),
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 45 },
      4: { halign: 'center', cellWidth: 25 },
      5: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.row.index === tableData.length && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = hexToRgb(COLORS.lightGray);
        if (data.column.index === 5) {
          data.cell.styles.textColor = hexToRgb(COLORS.accent);
          data.cell.styles.fontSize = 10;
        }
      }
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  const signatureWidth = 80;
  const signatureX = pageWidth - margin - signatureWidth;
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.5);
  doc.rect(signatureX, yPosition, signatureWidth, 35, 'S');
  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.setFont('helvetica', 'normal');
  doc.text('Date et Signature:', signatureX + 5, yPosition + 8);
  doc.line(signatureX + 5, yPosition + 15, signatureX + signatureWidth - 5, yPosition + 15);
  doc.text('Signature:', signatureX + 5, yPosition + 25);

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...hexToRgb(COLORS.border));
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb(COLORS.secondary));
  doc.text(`Document genere le ${formatDate(new Date().toISOString())}`, margin, pageHeight - 10);
  doc.text(`Reference: ${deposit.reference}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Page 1/1', pageWidth - margin, pageHeight - 10, { align: 'right' });

  // Telecharger le fichier
  const filename = `bordereau-${deposit.reference}.pdf`;
  doc.save(filename);
}
