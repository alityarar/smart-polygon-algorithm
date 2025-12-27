import type { Unit, LengthInput } from './types';

/**
 * Birim dönüşüm tablosu - her birim kaç mm'ye eşit
 */
const UNIT_TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
  ft: 304.8,
};

/**
 * Verilen değer ve birimi mm'ye çevirir
 */
export function toMm(value: number, unit: Unit): number {
  return value * UNIT_TO_MM[unit];
}

/**
 * LengthInput nesnesini mm'ye çevirir
 */
export function convertLengthToMm(input: LengthInput): number {
  return toMm(input.value, input.unit);
}

/**
 * mm cinsinden değeri istenen birime çevirir
 */
export function fromMm(valueMm: number, unit: Unit): number {
  return valueMm / UNIT_TO_MM[unit];
}

/**
 * Feet ve inch kombinasyonunu mm'ye çevirir
 */
export function feetInchesToMm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return toMm(totalInches, 'in');
}

/**
 * mm'yi feet ve inch'e çevirir
 */
export function mmToFeetInches(valueMm: number): { feet: number; inches: number } {
  const totalInches = fromMm(valueMm, 'in');
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { feet, inches };
}

/**
 * Birim ismini kullanıcı dostu formatta döndürür
 */
export function getUnitLabel(unit: Unit): string {
  const labels: Record<Unit, string> = {
    mm: 'Milimetre (mm)',
    cm: 'Santimetre (cm)',
    m: 'Metre (m)',
    in: 'İnç (in)',
    ft: 'Feet (ft)',
  };
  return labels[unit];
}
