import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { verifyPassword } from '../../../../lib/crypto';
import { createSessionToken, COOKIE_NAME, SESSION_MAX_AGE } from '../../../../lib/session';

export const runtime = 'edge';

export async function POST(req) {
  let email, password;
  try {
    ({ email, password } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const { env } = getRequestContext();
  const secret = env.SESSION_SECRET;
  if (!secret || !env.DB) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const user = await env.DB.prepare('SELECT id, password_hash, salt FROM users WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first();

  if (!user || !(await verifyPassword(password, user.salt, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = await createSessionToken(user.id, secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
