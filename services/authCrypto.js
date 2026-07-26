import * as Crypto from "expo-crypto";

export function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export async function makeSalt() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, salt) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

export function makeId(prefix) {
  return `${prefix}_${Crypto.randomUUID()}`;
}
