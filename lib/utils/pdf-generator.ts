/**
 * @file lib/utils/pdf-generator.ts
 * @description Utilitaire pour générer des PDF de chèques avec un design professionnel.
 * Utilise jsPDF pour créer des chèques imprimables au format standard.
 *
 * @version 1.0.0
 * @date 2024-12-24
 */

import { jsPDF } from 'jspdf';
import type { Check } from '@/types/banking';
import { amountToWords } from './number-to-words';

// =============================================================================
// CONSTANTES DE DESIGN
// =============================================================================

// Dimensions standard d'un chèque français en millimètres
const CHECK_WIDTH = 175;
const CHECK_HEIGHT = 80;

// Couleurs
const COLORS = {
  primary: '#1a365d',      // Bleu foncé pour texte principal
  secondary: '#4a5568',    // Gris pour texte secondaire
  border: '#cbd5e0',       // Bordure légère
  background: '#f7fafc',   // Fond légèrement gris
  accent: '#2b6cb0',       // Bleu accent
  lightLine: '#e2e8f0',    // Lignes légères
  watermark: '#edf2f7',    // Filigrane
};

// Polices
const FONTS = {
  normal: 'helvetica',
};

// =============================================================================
// FONCTIONS UTILITAIRES
// =============================================================================

/**
 * Formate une date ISO en format français JJ/MM/AAAA
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate un montant en format français avec séparateurs
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Applique une couleur au document PDF
 */
function setColor(doc: jsPDF, hex: string): void {
  const { r, g, b } = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

/**
 * Applique une couleur de dessin au document PDF
 */
function setDrawColor(doc: jsPDF, hex: string): void {
  const { r, g, b } = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

/**
 * Applique une couleur de remplissage au document PDF
 */
function setFillColor(doc: jsPDF, hex: string): void {
  const { r, g, b } = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

// =============================================================================
// GÉNÉRATION DU PDF
// =============================================================================

/**
 * Génère un PDF de chèque avec un design professionnel
 * @param check Les données du chèque à imprimer
 * @param options Options de génération (optionnel)
 */
export function generateCheckPDF(
  check: Check,
  options: {
    download?: boolean;
    filename?: string;
  } = {}
): void {
  const { download = false, filename } = options;

  // Créer le document PDF avec les dimensions d'un chèque
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CHECK_WIDTH, CHECK_HEIGHT],
  });

  // -------------------------------------------------------------------------
  // 1. FOND ET BORDURE
  // -------------------------------------------------------------------------

  // Fond légèrement coloré
  setFillColor(doc, COLORS.background);
  doc.rect(0, 0, CHECK_WIDTH, CHECK_HEIGHT, 'F');

  // Bordure extérieure
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.5);
  doc.rect(2, 2, CHECK_WIDTH - 4, CHECK_HEIGHT - 4, 'S');

  // Motif de sécurité (lignes diagonales légères en filigrane)
  setDrawColor(doc, COLORS.watermark);
  doc.setLineWidth(0.1);
  for (let i = -CHECK_HEIGHT; i < CHECK_WIDTH; i += 8) {
    doc.line(i, 0, i + CHECK_HEIGHT, CHECK_HEIGHT);
  }

  // -------------------------------------------------------------------------
  // 2. EN-TÊTE - INFORMATIONS BANCAIRES
  // -------------------------------------------------------------------------

  // Logo/Nom de la banque (zone en haut à gauche)
  setColor(doc, COLORS.primary);
  doc.setFont(FONTS.normal, 'bold');
  doc.setFontSize(10);

  const bankName = check.bankAccountName || 'COMPTE BANCAIRE';
  doc.text(bankName.toUpperCase(), 8, 12);

  // Numéro de chèque (en haut à droite)
  setColor(doc, COLORS.secondary);
  doc.setFont(FONTS.normal, 'normal');
  doc.setFontSize(8);
  doc.text('N°', CHECK_WIDTH - 45, 10);

  setColor(doc, COLORS.primary);
  doc.setFont(FONTS.normal, 'bold');
  doc.setFontSize(11);
  doc.text(check.checkNumber || '000000', CHECK_WIDTH - 40, 10);

  // -------------------------------------------------------------------------
  // 3. ZONE MONTANT EN CHIFFRES (Cadre à droite)
  // -------------------------------------------------------------------------

  // Cadre pour le montant
  setDrawColor(doc, COLORS.accent);
  doc.setLineWidth(0.8);
  doc.roundedRect(CHECK_WIDTH - 55, 14, 48, 12, 2, 2, 'S');

  // Fond du cadre montant
  setFillColor(doc, '#ffffff');
  doc.roundedRect(CHECK_WIDTH - 54.5, 14.5, 47, 11, 1.5, 1.5, 'F');

  // Symbole devise
  setColor(doc, COLORS.secondary);
  doc.setFont(FONTS.normal, 'normal');
  doc.setFontSize(8);
  const currency = check.currency || 'XAF';
  doc.text(currency, CHECK_WIDTH - 52, 21);

  // Montant en chiffres
  setColor(doc, COLORS.primary);
  doc.setFont(FONTS.normal, 'bold');
  doc.setFontSize(12);
  const amountText = `***${formatAmount(check.amount)}***`;
  doc.text(amountText, CHECK_WIDTH - 10, 21, { align: 'right' });

  // -------------------------------------------------------------------------
  // 4. MONTANT EN LETTRES
  // -------------------------------------------------------------------------

  // Label
  setColor(doc, COLORS.secondary);
  doc.setFont(FONTS.normal, 'normal');
  doc.setFontSize(7);
  doc.text('PAYEZ CONTRE CE CHEQUE NON ENDOSSABLE SAUF AU PROFIT D\'UNE BANQUE', 8, 28);

  // Ligne de soulignement pour le montant en lettres
  setDrawColor(doc, COLORS.lightLine);
  doc.setLineWidth(0.3);
  doc.line(8, 35, CHECK_WIDTH - 60, 35);
  doc.line(8, 42, CHECK_WIDTH - 60, 42);

  // Montant en lettres
  setColor(doc, COLORS.primary);
  doc.setFont(FONTS.normal, 'bold');
  doc.setFontSize(9);

  const currencyLabel = currency === 'EUR' ? 'euros' : 'francs CFA';
  const amountInWords = amountToWords(check.amount, currencyLabel);

  // Découper le texte sur plusieurs lignes si nécessaire
  const maxWidth = CHECK_WIDTH - 70;
  const lines = doc.splitTextToSize(amountInWords, maxWidth);

  if (lines.length === 1) {
    doc.text(`#${lines[0]}#`, 8, 33);
  } else {
    doc.text(`#${lines[0]}`, 8, 33);
    if (lines[1]) {
      doc.text(`${lines[1]}#`, 8, 40);
    }
  }

  // -------------------------------------------------------------------------
  // 5. BÉNÉFICIAIRE
  // -------------------------------------------------------------------------

  // Label "A"
  setColor(doc, COLORS.secondary);
  doc.setFont(FONTS.normal, 'normal');
  doc.setFontSize(8);
  doc.text('A', 8, 50);

  // Ligne de soulignement
  setDrawColor(doc, COLORS.lightLine);
  doc.line(12, 50, CHECK_WIDTH - 60, 50);

  // Nom du bénéficiaire
  setColor(doc, COLORS.primary);
  doc.setFont(FONTS.normal, 'bold');
  doc.setFontSize(10);
  doc.text(check.partnerName.toUpperCase(), 14, 49);

  // -------------------------------------------------------------------------
  // 6. LIEU ET DATE
  // -------------------------------------------------------------------------

  // Zone lieu/date (en bas à droite)
  setColor(doc, COLORS.secondary);
  doc.setFont(FONTS.normal, 'normal');
  doc.setFontSize(8);
  doc.text('A', CHECK_WIDTH - 55, 50);
  doc.text('Le', CHECK_WIDTH - 55, 56);

  // Lignes de soulignement
  setDrawColor(doc, COLORS.lightLine);
  doc.line(CHECK_WIDTH - 50, 50, CHECK_WIDTH - 8, 50);
  doc.line(CHECK_WIDTH - 50, 56, CHECK_WIDTH - 8, 56);

  // Lieu (Douala par défaut)
  setColor(doc, COLORS.primary);
  doc.setFont(FONTS.normal, 'bold');
  doc.setFontSize(9);
  doc.text('Douala', CHECK_WIDTH - 48, 49);

  // Date
  doc.text(formatDate(check.issueDate), CHECK_WIDTH - 48, 55);

  // -------------------------------------------------------------------------
  // 7. ZONE SIGNATURE
  // -------------------------------------------------------------------------

  // Cadre signature
  setDrawColor(doc, COLORS.border);
  doc.setLineWidth(0.3);
  doc.rect(CHECK_WIDTH - 55, 60, 47, 14, 'S');

  // Label signature
  setColor(doc, COLORS.secondary);
  doc.setFont(FONTS.normal, 'italic');
  doc.setFontSize(7);
  doc.text('Signature', CHECK_WIDTH - 35, 72);

  // -------------------------------------------------------------------------
  // 8. INFORMATIONS TYPE DE CHÈQUE
  // -------------------------------------------------------------------------

  // Type de chèque (émis/reçu) - petit badge
  const checkTypeLabel = check.checkType === 'ISSUED' ? 'CHEQUE EMIS' : 'CHEQUE RECU';
  const checkTypeColor = check.checkType === 'ISSUED' ? '#c53030' : '#2f855a';

  setFillColor(doc, checkTypeColor);
  doc.roundedRect(8, 54, 28, 5, 1, 1, 'F');

  setColor(doc, '#ffffff');
  doc.setFont(FONTS.normal, 'bold');
  doc.setFontSize(6);
  doc.text(checkTypeLabel, 22, 57.5, { align: 'center' });

  // -------------------------------------------------------------------------
  // 9. LIGNE MICR (simulation)
  // -------------------------------------------------------------------------

  // Zone MICR (Magnetic Ink Character Recognition) en bas
  setFillColor(doc, '#f0f0f0');
  doc.rect(0, CHECK_HEIGHT - 10, CHECK_WIDTH, 10, 'F');

  setColor(doc, COLORS.secondary);
  doc.setFont(FONTS.normal, 'normal');
  doc.setFontSize(8);

  // Numéro de chèque MICR
  const micrLine = `C${check.checkNumber || '000000'}C   A${check.bankAccountId?.substring(0, 8) || '00000000'}A`;
  doc.text(micrLine, CHECK_WIDTH / 2, CHECK_HEIGHT - 4, { align: 'center' });

  // -------------------------------------------------------------------------
  // 10. INFORMATIONS SUPPLÉMENTAIRES (si description)
  // -------------------------------------------------------------------------

  if (check.description) {
    setColor(doc, COLORS.secondary);
    doc.setFont(FONTS.normal, 'italic');
    doc.setFontSize(6);
    const descText = doc.splitTextToSize(`Objet: ${check.description}`, 80);
    doc.text(descText[0], 8, 63);
  }

  // -------------------------------------------------------------------------
  // 11. GÉNÉRATION FINALE
  // -------------------------------------------------------------------------

  const pdfFilename = filename || `cheque-${check.checkNumber || 'sans-numero'}.pdf`;

  if (download) {
    // Téléchargement direct
    doc.save(pdfFilename);
  } else {
    // Ouvrir dans un nouvel onglet pour prévisualisation/impression
    const pdfUrl = doc.output('bloburl');
    window.open(pdfUrl as unknown as string, '_blank');
  }
}

/**
 * Génère et télécharge directement le PDF du chèque
 * @param check Les données du chèque
 */
export function downloadCheckPDF(check: Check): void {
  generateCheckPDF(check, { download: true });
}
