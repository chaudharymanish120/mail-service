// Pure, framework-free rendering of the email body + signature into HTML and plain
// text. No Node APIs here, so this module is safe to import from both the server
// (lib/server/mailer.ts, to build the real email) and the client (the admin page, to
// show a live preview of exactly what will be sent).

export interface EmailSignature {
  enabled: boolean;
  closing: string;
  name: string;
  jobTitle: string;
  company: string;
  address: string;
  phone: string;
  email: string;
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function signatureText(sig: EmailSignature): string {
  if (!sig.enabled) return '';
  const lines: string[] = ['--'];
  if (sig.closing) lines.push(sig.closing);
  if (sig.name) lines.push(sig.name);
  if (sig.jobTitle) lines.push(sig.jobTitle);
  if (sig.company || sig.address || sig.phone || sig.email) lines.push('');
  if (sig.company) lines.push(sig.company);
  if (sig.address) lines.push(sig.address);
  if (sig.phone) lines.push(`M: ${sig.phone}`);
  if (sig.email) lines.push(`E: ${sig.email}`);
  return lines.join('\n');
}

export function signatureHtml(sig: EmailSignature): string {
  if (!sig.enabled) return '';

  const nameBlock =
    sig.name || sig.jobTitle
      ? `<p style="margin:0 0 4px">
${sig.name ? `<strong style="color:#1a73e8;font-size:16px">${escapeHtml(sig.name)}</strong>` : ''}
${sig.jobTitle ? `<br><span style="color:#666">${escapeHtml(sig.jobTitle)}</span>` : ''}
</p>`
      : '';

  const addressHtml = sig.address ? escapeHtml(sig.address).replace(/\n/g, '<br>') : '';
  const contactLines = [
    sig.company ? `<strong>${escapeHtml(sig.company)}</strong>` : '',
    addressHtml,
    sig.phone ? `M: ${escapeHtml(sig.phone)}` : '',
    sig.email ? `E: <a href="mailto:${escapeHtml(sig.email)}" style="color:#1a73e8">${escapeHtml(sig.email)}</a>` : '',
  ].filter(Boolean);
  const contactBlock = contactLines.length ? `<p style="margin:0">${contactLines.join('<br>')}</p>` : '';

  const closingLine = sig.closing ? `<p style="margin:0 0 8px">${escapeHtml(sig.closing)}</p>` : '';

  return `<div style="margin-top:24px;font-size:14px">
<p style="margin:0 0 4px;color:#999">--</p>
${closingLine}
${nameBlock}
${contactBlock ? '<hr style="border:none;border-top:1px solid #1a73e8;margin:12px 0;width:200px;margin-left:0">' : ''}
${contactBlock}
${contactBlock ? '<hr style="border:none;border-top:1px dashed #ccc;margin:12px 0;width:200px;margin-left:0">' : ''}
</div>`;
}

export function bodyHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

// Full email HTML, exactly as sent (minus the <html>/<body> wrapper, so it can also be
// dropped into a preview container on the admin page).
export function emailContentHtml(body: string, signature: EmailSignature): string {
  return `${bodyHtml(body)}\n${signatureHtml(signature)}`;
}

export function emailText(body: string, signature: EmailSignature): string {
  const sig = signatureText(signature);
  return sig ? `${body}\n\n${sig}` : body;
}
