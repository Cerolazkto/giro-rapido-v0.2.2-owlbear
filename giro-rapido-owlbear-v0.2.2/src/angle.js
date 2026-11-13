// Passo de rotação escolhido por cada jogador (metadados locais do Owlbear).
export const DEFAULT_ANGLE = 15;
export const QUICK_ANGLES = [5, 10, 15, 30, 45, 90];

/** Retorna graus (0,1 até 360, até 2 decimais) ou null se inválido. */
export function parseStepAngle(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const raw = typeof value === 'string' ? value.trim().replace(',', '.') : value;
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0.1 || n > 360) return null;
  return Math.round(n * 100) / 100;
}

export function stepFromMetadata(metadata) {
  return parseStepAngle(metadata?.angle) ?? DEFAULT_ANGLE;
}
