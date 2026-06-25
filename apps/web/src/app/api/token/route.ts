import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns the caller's raw (encrypted) NextAuth JWT so the browser can forward
 * it to the cross-domain backend as an `Authorization: Bearer` header. The
 * session cookie itself is scoped to the frontend domain and is not sent to the
 * backend on a different registrable domain, so a Bearer token is used instead.
 *
 * The backend decrypts this token with the shared NEXTAUTH_SECRET.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true,
  });

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  return NextResponse.json({ token });
}
