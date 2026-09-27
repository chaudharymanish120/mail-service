import { NextRequest, NextResponse } from 'next/server';
import { adminConfigured, checkCredentials, createSession } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: 'Admin credentials are not configured on the server.' }, { status: 503 });
  }

  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  if (!checkCredentials(username ?? '', password ?? '')) {
    // Small delay to slow down password guessing.
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  return NextResponse.json(createSession());
}
