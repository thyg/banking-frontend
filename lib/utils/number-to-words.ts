/**
 * @file lib/utils/number-to-words.ts
 * @description Utilitaire pour convertir un nombre en toutes lettres en français.
 * 
 * @version 1.0.0
 * @date 2024-12-24
 */

const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function convertChunk(n: number): string {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];

    const digit = n % 10;
    const ten = Math.floor(n / 10);

    if (ten === 7 || ten === 9) {
        return `${tens[ten]}-${teens[digit]}`;
    }
    
    let result = tens[ten];
    if (digit > 0) {
        if (digit === 1 && ten !== 8) {
            result += " et un";
        } else {
            result += `-${units[digit]}`;
        }
    }
    if (ten === 8 && digit === 0) {
        result += "s";
    }

    return result;
}

function convertNumber(num: number): string {
    if (num === 0) return "zéro";

    let result = "";
    const billion = Math.floor(num / 1_000_000_000);
    const million = Math.floor((num % 1_000_000_000) / 1_000_000);
    const thousand = Math.floor((num % 1_000_000) / 1_000);
    const remainder = num % 1_000;

    if (billion > 0) {
        result += (billion === 1 ? "un milliard" : `${convertNumber(billion)} milliards`) + " ";
    }
    if (million > 0) {
        result += (million === 1 ? "un million" : `${convertNumber(million)} millions`) + " ";
    }
    if (thousand > 0) {
        if (thousand === 1) {
            result += "mille ";
        } else {
            result += `${convertNumber(thousand)} mille `;
        }
    }

    if (remainder > 0) {
        if (remainder < 100) {
             result += convertChunk(remainder);
        } else {
            const hundred = Math.floor(remainder / 100);
            const rest = remainder % 100;
            if (hundred > 1) {
                result += `${units[hundred]}-cent`;
                if (rest === 0) result += "s";
            } else {
                result += "cent";
            }
            if (rest > 0) {
                result += ` ${convertChunk(rest)}`;
            }
        }
    }
    
    return result.trim();
}

/**
 * Convertit un montant numérique en sa représentation textuelle en français.
 * @param amount Le montant à convertir.
 * @param currency La devise (ex: 'EUR', 'XAF').
 * @returns Le montant en toutes lettres.
 */
export function amountToWords(amount: number, currency: string = 'francs CFA'): string {
    if (typeof amount !== 'number') {
        return "Montant invalide";
    }
    const wholePart = Math.floor(amount);
    const decimalPart = Math.round((amount - wholePart) * 100);

    let result = convertNumber(wholePart);

    // Gérer le pluriel de la devise
    const currencyName = currency;
    result += ` ${currencyName}`;
    if (wholePart > 1) {
        // simple pluralization, may need refinement for some currencies
        if (!currencyName.endsWith('s')) {
            result += 's';
        }
    }

    if (decimalPart > 0) {
        result += ` et ${convertNumber(decimalPart)} centime` + (decimalPart > 1 ? 's' : '');
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
}
