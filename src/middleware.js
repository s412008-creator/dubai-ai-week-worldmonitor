import { NextResponse } from 'next/server';
import { verifySessionToken, COOKIE_NAME } from './lib/session';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|login|api/auth).*)'],
};

export async function middleware(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  const session = await verifySessionToken(token, secret);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
