import { hmacSign, timingSafeEqual } from './crypto';

export const COOKIE_NAME = 'session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createSessionToken(userId, secret) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const payload = `${userId}.${exp}`;
  const sig = await hmacSign(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = await hmacSign(`${userId}.${exp}`, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  if (Math.floor(Date.now() / 1000) > Number(exp)) return null;
  return { userId };
}
