import { Buffer } from 'buffer';

/**
 * Helper para operaciones BLE comunes
 */

/**
 * Convierte un string a ByteArray (number[]) para enviar vía BLE
 */
export function stringToBytes(text: string): number[] {
  const buffer = Buffer.from(text, 'utf-8');
  return buffer.toJSON().data;
}

/**
 * Convierte ByteArray (number[]) recibido de BLE a string
 */
export function bytesToString(bytes: number[]): string {
  const buffer = Buffer.from(bytes);
  return buffer.toString('utf-8');
}

/**
 * Intenta parsear JSON de un string, retorna null si falla
 */
export function tryParseJSON(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Error parseando JSON:', error);
    return null;
  }
}

/**
 * Valida formato de UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Convierte número a ByteArray
 */
export function numberToBytes(num: number): number[] {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32LE(num, 0);
  return buffer.toJSON().data;
}

/**
 * Convierte ByteArray a número
 */
export function bytesToNumber(bytes: number[]): number {
  const buffer = Buffer.from(bytes);
  return buffer.readInt32LE(0);
}
