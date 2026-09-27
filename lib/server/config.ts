import fs from 'fs';
import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import defaultConfig from './default-config.json';
import { EmailSignature } from '../shared/render-email';

export type { EmailSignature };

export interface EmailConfig {
  subject: string;
  body: string;
  signature: EmailSignature;
}

const FIELDS = ['subject', 'body'] as const;
const MAX_LENGTH: Record<(typeof FIELDS)[number], number> = { subject: 300, body: 20000 };

// Signature fields are all optional free text: a blank field just doesn't render its
// line in the email. `enabled` toggles the whole block on or off.
const SIGNATURE_TEXT_FIELDS = ['closing', 'name', 'jobTitle', 'company', 'address', 'phone', 'email'] as const;
const SIGNATURE_MAX_LENGTH: Record<(typeof SIGNATURE_TEXT_FIELDS)[number], number> = {
  closing: 100,
  name: 150,
  jobTitle: 150,
  company: 150,
  address: 500,
  phone: 60,
  email: 254,
};

const EMPTY_SIGNATURE: EmailSignature = {
  enabled: false,
  closing: '',
  name: '',
  jobTitle: '',
  company: '',
  address: '',
  phone: '',
  email: '',
};

// Saved edits (from the admin page) are kept in a small JSON database file (lowdb).
// On Vercel, only /tmp is writable, and it is wiped on every cold start and is not
// shared across instances, so a save there only lasts until the next cold start — it
// does not survive a redeploy or reliably reach every running instance. Locally
// (`next dev` / `next start`), the file lives under `data/` and persists normally.
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'email-config.json')
  : path.join(process.cwd(), 'data', 'email-config.json');

const DEFAULT_CONFIG: EmailConfig = {
  ...(defaultConfig as Omit<typeof defaultConfig, 'signature'>),
  signature: { ...EMPTY_SIGNATURE, ...((defaultConfig as { signature?: Partial<EmailSignature> }).signature ?? {}) },
} as EmailConfig;

let dbPromise: Promise<Low<EmailConfig>> | null = null;

async function getDb(): Promise<Low<EmailConfig>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      const db = new Low<EmailConfig>(new JSONFile(DB_PATH), { ...DEFAULT_CONFIG });
      await db.read();
      const { value } = validate(db.data);
      db.data = value ?? { ...DEFAULT_CONFIG };
      return db;
    })();
  }
  return dbPromise;
}

function validateSignature(input: unknown): { value?: EmailSignature; error?: string } {
  const record = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const clean = { ...EMPTY_SIGNATURE };

  clean.enabled = Boolean(record.enabled);

  for (const field of SIGNATURE_TEXT_FIELDS) {
    const value = record[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') {
      return { error: `Signature "${field}" must be a string.` };
    }
    if (value.length > SIGNATURE_MAX_LENGTH[field]) {
      return { error: `Signature "${field}" must be at most ${SIGNATURE_MAX_LENGTH[field]} characters.` };
    }
    clean[field] = field === 'address' ? value : value.trim();
  }

  return { value: clean };
}

export function validate(input: unknown): { value?: EmailConfig; error?: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'Configuration must be a JSON object.' };
  }
  const record = input as Record<string, unknown>;
  const clean = {} as EmailConfig;
  for (const field of FIELDS) {
    const value = record[field];
    if (typeof value !== 'string' || value.trim() === '') {
      return { error: `"${field}" is required and must be a non-empty string.` };
    }
    if (value.length > MAX_LENGTH[field]) {
      return { error: `"${field}" must be at most ${MAX_LENGTH[field]} characters.` };
    }
    clean[field] = field === 'body' ? value : value.trim();
  }

  const { value: signature, error: signatureError } = validateSignature(record.signature);
  if (signatureError) return { error: signatureError };
  clean.signature = signature!;

  return { value: clean };
}

export async function getConfig(): Promise<EmailConfig> {
  const db = await getDb();
  return { ...db.data, signature: { ...db.data.signature } };
}

export class ConfigError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function saveConfig(input: unknown): Promise<EmailConfig> {
  const { value, error } = validate(input);
  if (error) throw new ConfigError(error, 400);

  const db = await getDb();
  db.data = value!;
  await db.write();
  return { ...db.data, signature: { ...db.data.signature } };
}

export const RESUME_FILE = 'MANISH_RESUME.pdf';
export const RESUME_PATH = path.join(process.cwd(), 'resume', RESUME_FILE);

export function resumeExists(): boolean {
  try {
    return fs.statSync(RESUME_PATH).isFile();
  } catch {
    return false;
  }
}
