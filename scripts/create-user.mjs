#!/usr/bin/env node
// Generates a password hash for a new user and prints the SQL to add them.
// Usage: node scripts/create-user.mjs <email> <password>
//
// Run the printed statement in the Cloudflare dashboard -> Storage & Databases
// -> D1 -> (this project's database) -> Console, or via:
//   wrangler d1 execute <db-name> --remote --command "<statement>"

import { webcrypto } from 'node:crypto';

const PBKDF2_ITERATIONS = 100000;

function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await webcrypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hash: toHex(new Uint8Array(bits)), salt: toHex(salt) };
}

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/create-user.mjs <email> <password>');
  process.exit(1);
}

const { hash, salt } = await hashPassword(password);
const esc = (s) => s.replace(/'/g, "''");
const cleanEmail = esc(email.toLowerCase().trim());

console.log('\nRun this SQL in the Cloudflare D1 console (or via wrangler d1 execute --remote):\n');
console.log(
  `INSERT INTO users (email, password_hash, salt) VALUES ('${cleanEmail}', '${hash}', '${salt}');`
);
console.log('\nTo update an existing user\'s password instead:\n');
console.log(
  `UPDATE users SET password_hash = '${hash}', salt = '${salt}' WHERE email = '${cleanEmail}';`
);
console.log('');
