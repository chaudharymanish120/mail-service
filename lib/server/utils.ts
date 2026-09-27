// Practical email check: one @, no spaces, a dot in the domain, sane length.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

// Remove any secret values that might appear inside an error message.
export function sanitize(message: unknown): string {
  let out = String(message || '');
  for (const name of ['SMTP_PASSWORD', 'SMTP_USER', 'ADMIN_PASSWORD']) {
    const secret = process.env[name];
    if (secret) out = out.split(secret).join('***');
  }
  return out;
}
