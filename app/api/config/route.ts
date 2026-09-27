import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/server/auth';
import { ConfigError, RESUME_FILE, getConfig, resumeExists, saveConfig } from '@/lib/server/config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!isAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json({ ...config, resumeFound: resumeExists(), resumeFile: RESUME_FILE });
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    const saved = await saveConfig(body);
    return NextResponse.json({ ...saved, message: 'Configuration saved.' });
  } catch (err) {
    if (err instanceof ConfigError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(`Failed to save configuration: ${(err as Error).message}`);
    return NextResponse.json({ error: 'Failed to save configuration.' }, { status: 500 });
  }
}
