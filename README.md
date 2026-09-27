# Resume Email Service

A small, private Next.js app for emailing your resume to recruiters, deployed on Vercel.

You type only the recipient's email address. The subject, body, resume attachment and sender account all come from saved configuration.

- The resume is read from `resume/MANISH_RESUME.pdf` on every send. It is never served as a public file.
- The subject and body are edited on the `/admin` page and stored in a small JSON database file ([lowdb](https://github.com/typicode/lowdb)).
- Both pages require login. A successful login issues a signed, stateless token — nothing is stored in server memory, so it works the same across serverless invocations.

## 1. Project layout

```
app/
  page.tsx            # Send page ("/")
  admin/page.tsx       # Configuration page ("/admin")
  api/login/route.ts
  api/config/route.ts   # GET (load) / PUT (save)
  api/send-email/route.ts
lib/server/            # auth, config storage, mailer — server-only code
lib/client/            # fetch + token helpers used by the pages
components/             # LoginForm, Message
resume/MANISH_RESUME.pdf # YOUR resume (replace this file)
data/email-config.json  # saved subject/body (created on first save, git-ignored)
```

## 2. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Your email provider's SMTP settings |
| `FROM_EMAIL` | The "From" address, e.g. `"Your Name <you@gmail.com>"` |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Login for both pages |
| `RESUME_FILENAME` | Optional. The attachment name recipients see (default `MANISH_RESUME.pdf`) |

### Gmail

1. Turn on 2-Step Verification.
2. Create an [app password](https://myaccount.google.com/apppasswords), e.g. named "Resume Sender".
3. Use that as `SMTP_PASSWORD`.

## 3. Place your resume

Replace the placeholder file, keeping the name exactly `MANISH_RESUME.pdf`:

```
resume/MANISH_RESUME.pdf
```

If you rename it, update `RESUME_FILE` in [lib/server/config.ts](lib/server/config.ts) and `outputFileTracingIncludes` in [next.config.ts](next.config.ts) to match.

## 4. Run it

```bash
npm run dev
```

- Send page: http://localhost:3000
- Configuration page: http://localhost:3000/admin

Admin edits are saved to `data/email-config.json` (git-ignored), created automatically on first save from the defaults in `lib/server/default-config.json`.

## 5. Deploy to Vercel

1. Push this repo to GitHub (keep it **private** — it contains your resume and phone number).
2. In Vercel: **Add New → Project** → import the repo. Build settings are auto-detected (Next.js).
3. **Settings → Environment Variables** → add: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and optionally `RESUME_FILENAME`. Don't set `PORT`; Vercel manages that.
4. Deploy. Your app is live at `https://<project>.vercel.app`, with the admin page at `/admin`.

To update later, just `git push` — Vercel redeploys automatically.

> **Note on saving config in production:** Vercel's serverless functions only have a writable `/tmp` directory, which is wiped on every cold start and isn't shared between instances. That means an edit made on the deployed `/admin` page can disappear the next time the function restarts, and won't be visible to every request in between. To make a change permanent in production, edit `lib/server/default-config.json` in the repo and push it — that's the config every fresh instance starts from. If you want admin-page edits to persist reliably in production, swap the storage in [lib/server/config.ts](lib/server/config.ts) for something with real persistence (e.g. Vercel Blob, Postgres, or a KV store).

## 6. API reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/login` | — | `{ username, password }` → `{ token, expiresIn }` |
| GET | `/api/config` | admin | Returns `subject`, `body`, `resumeFound`, `resumeFile` |
| PUT | `/api/config` | admin | Saves `{ subject, body }` |
| POST | `/api/send-email` | admin | `{ recipient }` → sends the resume email |

Authenticate with `Authorization: Bearer <token>` (from `/api/login`) or HTTP Basic auth using `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

## Notes

- `NODE_ENV=production` (set automatically by Vercel) hides the internal error detail from `/api/send-email` responses.
- Session tokens are signed with a key derived from `ADMIN_USERNAME`/`ADMIN_PASSWORD`, so changing either logs everyone out.
