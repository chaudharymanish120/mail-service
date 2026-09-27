import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/server/auth';
import { sendResume } from '@/lib/server/mailer';
import { isValidEmail, sanitize } from '@/lib/server/utils';

export const runtime = 'nodejs';

const IS_DEV = process.env.NODE_ENV !== 'production';

export async function POST(req: NextRequest) {
  if (!isAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const recipient = typeof body?.recipient === 'string' ? body.recipient.trim() : '';

  if (!isValidEmail(recipient)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  try {
    await sendResume(recipient);
    console.log(`Resume sent to ${recipient}`);
    return NextResponse.json({ message: 'Email sent successfully.' });
  } catch (err) {
    const detail = sanitize((err as Error).message);
    console.error(`Failed to send to ${recipient}: ${detail}`);
    const payload: { error: string; detail?: string } = {
      error: 'Failed to send email. Please check the email configuration.',
    };
    if (IS_DEV) payload.detail = detail;
    return NextResponse.json(payload, { status: 500 });
  }
}
