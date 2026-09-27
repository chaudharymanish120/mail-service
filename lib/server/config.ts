import fs from 'fs';
import path from 'path';
import { get as blobGet, put as blobPut } from '@vercel/blob';
import defaultConfig from './default-config.json';

export interface EmailConfig {
  subject: string;
  title: string;
  body: string;
}

const FIELDS = ['subject', 'title', 'body'] as const;
const MAX_LENGTH: Record<(typeof FIELDS)[number], number> = { subject: 300, title: 300, body: 20000 };

// Saved edits (from the admin page) live in Vercel Blob under this private pathname,
// since a serverless function cannot write to its own deployed files. Without a
// connected Blob store (no BLOB_READ_WRITE_TOKEN), edits only last for the current
// invocation and the bundled default below is used every time the function cold-starts.
const BLOB_PATHNAME = 'email-config.json';

// Local-only persistence for `next dev` / `next start` on a real filesystem, so saved
// edits survive a restart the same way they did before, without needing a Blob store.
const LOCAL_CONFIG_PATH = path.join(process.cwd(), 'data', 'email-config.local.json');
const isVercel = Boolean(process.env.VERCEL);

// In-memory cache, valid only for the lifetime of this warm serverless instance.
let cached: EmailConfig | null = null;

function hasBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function readLocalFile(): EmailConfig | null {
  try {
    const { value } = validate(JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8')));
    return value ?? null;
  } catch {
    return null;
  }
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
  return { value: clean };
}

export async function getConfig(): Promise<EmailConfig> {
  if (cached) return { ...cached };

  if (hasBlobStore()) {
    try {
      const result = await blobGet(BLOB_PATHNAME, { access: 'private' });
      if (result) {
        const text = await new Response(result.stream).text();
        const { value } = validate(JSON.parse(text));
        if (value) {
          cached = value;
          return { ...value };
        }
      }
    } catch {
      // Falls through below.
    }
  }

  const local = !isVercel ? readLocalFile() : null;
  cached = local ?? { ...(defaultConfig as EmailConfig) };
  return { ...cached };
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

  if (hasBlobStore()) {
    await blobPut(BLOB_PATHNAME, JSON.stringify(value, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    cached = value!;
    return { ...cached };
  }

  if (isVercel) {
    throw new ConfigError(
      'No Blob store is connected, so configuration changes cannot be saved. Connect a Blob store to this project in Vercel and redeploy.',
      500,
    );
  }

  // Local dev without a Blob store: persist to a git-ignored file, like the old app did.
  fs.mkdirSync(path.dirname(LOCAL_CONFIG_PATH), { recursive: true });
  const tmp = `${LOCAL_CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, LOCAL_CONFIG_PATH);
  cached = value!;
  return { ...cached };
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
