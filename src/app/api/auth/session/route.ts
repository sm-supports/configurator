import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Util: ensure request originates from same origin to mitigate CSRF
function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const reqUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return reqUrl.host === originUrl.host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Basic CSRF guard: require same-origin for cookie setting
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 400 });
    }

    const { access_token, refresh_token, expires_at } = await request.json().catch(() => ({}));

    if (!access_token || !refresh_token || !expires_at) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const resp = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });

    const expiresMs = Number(expires_at) * 1000; // Supabase expires_at is seconds
    const accessExpiry = new Date(expiresMs);

    // Access token cookie (short-lived)
    resp.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires: accessExpiry,
    });

    // Refresh token cookie (longer-lived). 60 days default if unknown
    const refreshMaxAge = 60 * 24 * 60 * 60; // 60 days in seconds
    resp.cookies.set('sb-refresh-token', refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: refreshMaxAge,
    });

    return resp;
  } catch (err) {
    console.error('Error setting session cookies:', err);
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Basic CSRF guard
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 400 });
    }

    const resp = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    resp.cookies.delete('sb-access-token');
    resp.cookies.delete('sb-refresh-token');
    return resp;
  } catch (err) {
    console.error('Error clearing session cookies:', err);
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}
