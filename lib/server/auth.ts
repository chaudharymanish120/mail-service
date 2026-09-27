import crypto from 'crypto';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Tokens are "<expiry>.<signature>", signed with a key derived from the admin credentials.
// Nothing is kept in memory, so they work across serverless instances and cold starts.
// Changing ADMIN_USERNAME or ADMIN_PASSWORD invalidates every existing token.
function signingKey() {
  return crypto
    .createHash('sha256')
    .update(`session:${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`)
    .digest();
}

function sign(expiry: string | number) {
  return crypto.createHmac('sha256', signingKey()).update(String(expiry)).digest('hex');
}

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

export function checkCredentials(username: string, password: string) {
  if (!adminConfigured()) return false;
  // Evaluate both comparisons so timing doesn't reveal which one failed.
  const userOk = safeEqual(username || '', process.env.ADMIN_USERNAME as string);
  const passOk = safeEqual(password || '', process.env.ADMIN_PASSWORD as string);
  return userOk && passOk;
}

export function createSession() {
  const expiry = Date.now() + SESSION_TTL_MS;
  const token = `${expiry}.${sign(expiry)}`;
  return { token, expiresIn: SESSION_TTL_MS / 1000 };
}

export function isValidToken(token: string | null | undefined) {
  const [expiry, signature] = String(token || '').split('.');
  if (!/^\d+$/.test(expiry || '') || !signature) return false;
  if (Date.now() > Number(expiry)) return false;
  return safeEqual(signature, sign(expiry));
}

// Accepts either "Authorization: Bearer <token>" (from POST /api/login)
// or standard HTTP Basic auth with ADMIN_USERNAME / ADMIN_PASSWORD.
export function isAuthorized(authHeader: string | null): boolean {
  if (!adminConfigured()) return false;
  const header = authHeader || '';
  const [scheme, value] = header.split(' ');

  if (scheme === 'Bearer' && value && isValidToken(value)) return true;

  if (scheme === 'Basic' && value) {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep !== -1 && checkCredentials(decoded.slice(0, sep), decoded.slice(sep + 1))) {
      return true;
    }
  }

  return false;
}
