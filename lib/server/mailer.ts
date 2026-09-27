import fs from 'fs';
import nodemailer, { Transporter } from 'nodemailer';
import { getConfig, RESUME_FILE, RESUME_PATH } from './config';

const REQUIRED_ENV = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'FROM_EMAIL'] as const;

let transporter: Transporter | null = null;

export function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const missing = missingEnv();
  if (missing.length) {
    throw new Error(`Missing SMTP environment variables: ${missing.join(', ')}`);
  }
  const port = Number(process.env.SMTP_PORT);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 uses implicit TLS; 587/25 upgrade with STARTTLS.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return transporter;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(title: string, body: string) {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222">
<h2 style="font-size:18px;margin:0 0 16px">${escapeHtml(title)}</h2>
${paragraphs}
</body></html>`;
}

export async function sendResume(recipient: string) {
  const { subject, title, body } = await getConfig();

  let resume: Buffer;
  try {
    resume = await fs.promises.readFile(RESUME_PATH);
  } catch {
    throw new Error(`Resume not found at resume/${RESUME_FILE}`);
  }

  return getTransporter().sendMail({
    from: process.env.FROM_EMAIL,
    to: recipient,
    subject,
    text: `${title}\n\n${body}`,
    html: buildHtml(title, body),
    attachments: [
      {
        filename: process.env.RESUME_FILENAME || RESUME_FILE,
        content: resume,
        contentType: 'application/pdf',
      },
    ],
  });
}
