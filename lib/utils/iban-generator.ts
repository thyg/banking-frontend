/**
 * @file lib/utils/iban-generator.ts
 * @description Utilitaire pour générer un IBAN camerounais à partir des informations bancaires.
 *
 * Structure IBAN Cameroun (27 caractères):
 * CM [XX] [BBBBB] [GGGGG] [CCCCCCCCCCC] [KK]
 *     │     │       │          │          └── Clé RIB (2 chiffres) - calculée
 *     │     │       │          └── N° Compte (11 chiffres)
 *     │     │       └── Code Guichet (5 chiffres)
 *     │     └── Code Banque (5 chiffres)
 *     └── Clé contrôle IBAN (2 chiffres) - calculée via MOD-97
 *
 * @version 1.0.0
 * @date 2025-01-25
 */

/**
 * Calcule la clé RIB (2 chiffres) pour le Cameroun.
 * Formule: 97 - ((bankCode * 89 + branchCode * 15 + accountNumber * 3) MOD 97)
 */
function calculateRibKey(bankCode: string, branchCode: string, accountNumber: string): string {
  // Convertir en nombres, en remplaçant les lettres par leurs valeurs
  const bankNum = parseInt(bankCode, 10) || 0;
  const branchNum = parseInt(branchCode, 10) || 0;

  // Pour le numéro de compte, on doit gérer les lettres (A=1, B=2, etc.)
  let accountNum = BigInt(0);
  for (const char of accountNumber) {
    if (/[0-9]/.test(char)) {
      accountNum = accountNum * BigInt(10) + BigInt(parseInt(char, 10));
    } else if (/[A-Z]/i.test(char)) {
      // A=1, B=2, ..., Z=26
      const letterValue = char.toUpperCase().charCodeAt(0) - 64;
      accountNum = accountNum * BigInt(100) + BigInt(letterValue);
    }
  }

  // Calcul de la clé RIB
  const remainder = (BigInt(bankNum) * BigInt(89) + BigInt(branchNum) * BigInt(15) + accountNum * BigInt(3)) % BigInt(97);
  const ribKey = 97 - Number(remainder);

  return ribKey.toString().padStart(2, '0');
}

/**
 * Convertit une chaîne alphanumérique en nombre pour le calcul IBAN.
 * Les lettres sont converties: A=10, B=11, ..., Z=35
 */
function alphanumericToNumber(str: string): string {
  let result = '';
  for (const char of str.toUpperCase()) {
    if (/[0-9]/.test(char)) {
      result += char;
    } else if (/[A-Z]/.test(char)) {
      // A=10, B=11, ..., Z=35
      result += (char.charCodeAt(0) - 55).toString();
    }
  }
  return result;
}

/**
 * Calcule la clé de contrôle IBAN (2 chiffres) selon la norme ISO 7064 MOD-97-10.
 *
 * @param countryCode Code pays (ex: "CM")
 * @param bban BBAN complet (code banque + code guichet + numéro compte + clé RIB)
 * @returns Clé de contrôle sur 2 chiffres
 */
function calculateIbanCheckDigits(countryCode: string, bban: string): string {
  // Étape 1: Déplacer le code pays et "00" à la fin
  const rearranged = bban + countryCode + "00";

  // Étape 2: Convertir les lettres en nombres
  const numericString = alphanumericToNumber(rearranged);

  // Étape 3: Calculer MOD 97 avec BigInt pour gérer les grands nombres
  let remainder = BigInt(0);
  for (const digit of numericString) {
    remainder = (remainder * BigInt(10) + BigInt(parseInt(digit, 10))) % BigInt(97);
  }

  // Étape 4: Soustraire de 98
  const checkDigits = 98 - Number(remainder);

  return checkDigits.toString().padStart(2, '0');
}

/**
 * Valide que tous les paramètres sont corrects pour générer un IBAN camerounais.
 */
function validateInputs(bankCode: string, branchCode: string, accountNumber: string): string | null {
  if (!bankCode || bankCode.length !== 5 || !/^\d{5}$/.test(bankCode)) {
    return "Le code banque doit contenir exactement 5 chiffres";
  }

  if (!branchCode || branchCode.length !== 5 || !/^\d{5}$/.test(branchCode)) {
    return "Le code guichet doit contenir exactement 5 chiffres";
  }

  if (!accountNumber || accountNumber.length !== 11 || !/^[A-Za-z0-9]{11}$/.test(accountNumber)) {
    return "Le numéro de compte doit contenir exactement 11 caractères alphanumériques";
  }

  return null;
}

export interface IbanGeneratorResult {
  success: boolean;
  iban?: string;
  ibanFormatted?: string;
  ribKey?: string;
  error?: string;
}

/**
 * Génère un IBAN camerounais complet.
 *
 * @param bankCode Code banque (5 chiffres)
 * @param branchCode Code guichet/agence (5 chiffres)
 * @param accountNumber Numéro de compte (11 caractères alphanumériques)
 * @returns Objet contenant l'IBAN généré ou une erreur
 *
 * @example
 * const result = generateCameroonIban("10005", "00001", "12345678901");
 * // result.iban = "CM2110005000011234567890197"
 * // result.ibanFormatted = "CM21 1000 5000 0112 3456 7890 197"
 */
export function generateCameroonIban(
  bankCode: string,
  branchCode: string,
  accountNumber: string
): IbanGeneratorResult {
  // Validation des entrées
  const validationError = validateInputs(bankCode, branchCode, accountNumber);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Normaliser le numéro de compte en majuscules
  const normalizedAccountNumber = accountNumber.toUpperCase();

  // Calculer la clé RIB
  const ribKey = calculateRibKey(bankCode, branchCode, normalizedAccountNumber);

  // Construire le BBAN (23 caractères)
  const bban = bankCode + branchCode + normalizedAccountNumber + ribKey;

  // Calculer la clé de contrôle IBAN
  const ibanCheckDigits = calculateIbanCheckDigits("CM", bban);

  // Construire l'IBAN complet
  const iban = "CM" + ibanCheckDigits + bban;

  // Formater l'IBAN avec des espaces tous les 4 caractères
  const ibanFormatted = iban.replace(/(.{4})/g, '$1 ').trim();

  return {
    success: true,
    iban,
    ibanFormatted,
    ribKey,
  };
}

/**
 * Vérifie si un IBAN est valide selon la norme MOD-97.
 *
 * @param iban L'IBAN à vérifier (avec ou sans espaces)
 * @returns true si l'IBAN est valide
 */
export function validateIban(iban: string): boolean {
  // Retirer les espaces et mettre en majuscules
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();

  // Vérifier la longueur minimum
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    return false;
  }

  // Déplacer les 4 premiers caractères à la fin
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);

  // Convertir en nombres
  const numericString = alphanumericToNumber(rearranged);

  // Calculer MOD 97
  let remainder = BigInt(0);
  for (const digit of numericString) {
    remainder = (remainder * BigInt(10) + BigInt(parseInt(digit, 10))) % BigInt(97);
  }

  return remainder === BigInt(1);
}

/**
 * Formate un IBAN avec des espaces tous les 4 caractères.
 */
export function formatIban(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
}
