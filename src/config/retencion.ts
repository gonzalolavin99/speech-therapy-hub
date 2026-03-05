// Tasas de retención para Boletas de Honorarios en Chile
// Fuente: Ley 21.133 - Reforma al Art. 74 N°2 de la Ley de Impuesto a la Renta
// Las tasas suben progresivamente hasta llegar a 17% en 2028
export const RETENCION_RATES: Record<number, number> = {
  2023: 12.25,
  2024: 13.75,
  2025: 14.50,
  2026: 15.25,
  2027: 16.00,
  2028: 17.00,
};

export const SII_BHE_PORTAL_URL = 'https://homer.sii.cl';

export function getRetencionRate(year?: number): number {
  const y = year || new Date().getFullYear();
  if (RETENCION_RATES[y]) return RETENCION_RATES[y];
  // Años futuros post-2028 usan la tasa final de 17%
  if (y > 2028) return 17.0;
  return 15.25; // fallback para año actual
}

export function calculateRetencion(amountBruto: number, year?: number) {
  const percent = getRetencionRate(year);
  const retencionAmount = Math.round(amountBruto * percent / 100);
  const amountLiquido = amountBruto - retencionAmount;
  return { percent, retencionAmount, amountLiquido };
}
