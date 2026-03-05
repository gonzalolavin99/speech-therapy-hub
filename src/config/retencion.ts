// Tasas de retención para Boletas de Honorarios en Chile
// Fuente: Ley de Impuesto a la Renta, Art. 74 N°2
export const RETENCION_RATES: Record<number, number> = {
  2023: 12.25,
  2024: 13.00,
  2025: 13.75,
  2026: 13.75,
  2027: 14.50,
  2028: 15.25,
  2029: 16.00,
  2030: 17.00,
};

export const SII_BHE_PORTAL_URL = 'https://loa.sii.cl/cgi_IMT/TRBHE_MENU.sh';

export function getRetencionRate(year?: number): number {
  const y = year || new Date().getFullYear();
  return RETENCION_RATES[y] ?? 13.75;
}

export function calculateRetencion(amountBruto: number, year?: number) {
  const percent = getRetencionRate(year);
  const retencionAmount = Math.round(amountBruto * percent / 100);
  const amountLiquido = amountBruto - retencionAmount;
  return { percent, retencionAmount, amountLiquido };
}
