'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '@/lib/client/api';
import LoginForm from '@/components/LoginForm';
import Message, { MessageState } from '@/components/Message';
import { signatureHtml, type EmailSignature as Signature } from '@/lib/shared/render-email';

const EMPTY_SIGNATURE: Signature = {
  enabled: false,
  closing: '',
  name: '',
  jobTitle: '',
  company: '',
  address: '',
  phone: '',
  email: '',
};

interface ConfigData {
  subject: string;
  body: string;
  signature: Signature;
  resumeFound: boolean;
  resumeFile: string;
}

export default function AdminPage() {
  const [view, setView] = useState<'checking' | 'login' | 'app'>('checking');
  const [fields, setFields] = useState({ subject: '', body: '' });
  const [signature, setSignature] = useState<Signature>(EMPTY_SIGNATURE);
  const signaturePreview = useMemo(() => signatureHtml(signature), [signature]);
  const [resumeStatus, setResumeStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const showLogin = useCallback(() => {
    setToken(null);
    setView('login');
  }, []);

  const loadConfig = useCallback(async () => {
    const { res, data } = await api<ConfigData & { error?: string }>('GET', '/api/config');
    if (res.status === 401) {
      showLogin();
      return;
    }
    setView('app');
    if (!res.ok) {
      setMessage({ type: 'error', text: data.error || 'Failed to load configuration.' });
      return;
    }
    setFields({ subject: data.subject, body: data.body });
    setSignature({ ...EMPTY_SIGNATURE, ...data.signature });
    setResumeStatus(
      data.resumeFound
        ? `Resume: resume/${data.resumeFile} found ✓`
        : `Resume: resume/${data.resumeFile} is missing — emails will fail until it is added.`,
    );
  }, [showLogin]);

  useEffect(() => {
    if (getToken()) {
      loadConfig().catch(showLogin);
    } else {
      setView('login');
    }
  }, [loadConfig, showLogin]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { res, data } = await api<{ error?: string }>('PUT', '/api/config', { ...fields, signature });
      if (res.status === 401) {
        showLogin();
        return;
      }
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save configuration.' });
        return;
      }
      setMessage({ type: 'success', text: 'Configuration saved. Future emails will use this content.' });
    } catch {
      setMessage({ type: 'error', text: 'Could not reach the server.' });
    } finally {
      setSaving(false);
    }
  }

  if (view === 'checking') return null;

  if (view === 'login') {
    return <LoginForm heading="Admin Login" onLoggedIn={loadConfig} />;
  }

  return (
    <main className="card wide">
      <h1>Email Configuration</h1>
      <p className="meta">{resumeStatus}</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="subject">Subject</label>
          <input
            id="subject"
            type="text"
            maxLength={300}
            required
            value={fields.subject}
            onChange={(e) => setFields((f) => ({ ...f, subject: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="body">Email Body</label>
          <textarea
            id="body"
            maxLength={20000}
            required
            value={fields.body}
            onChange={(e) => setFields((f) => ({ ...f, body: e.target.value }))}
          />
        </div>

        <div className="field checkbox-field">
          <label htmlFor="sig-enabled">
            <input
              id="sig-enabled"
              type="checkbox"
              checked={signature.enabled}
              onChange={(e) => setSignature((s) => ({ ...s, enabled: e.target.checked }))}
            />
            {' '}Include signature in emails
          </label>
        </div>

        {signature.enabled && (
          <fieldset className="signature-fields">
            <legend>Signature</legend>
            <div className="field">
              <label htmlFor="sig-closing">Closing line</label>
              <input
                id="sig-closing"
                type="text"
                maxLength={100}
                placeholder="Thanks and Regards"
                value={signature.closing}
                onChange={(e) => setSignature((s) => ({ ...s, closing: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="sig-name">Name</label>
              <input
                id="sig-name"
                type="text"
                maxLength={150}
                value={signature.name}
                onChange={(e) => setSignature((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="sig-job-title">Job title</label>
              <input
                id="sig-job-title"
                type="text"
                maxLength={150}
                value={signature.jobTitle}
                onChange={(e) => setSignature((s) => ({ ...s, jobTitle: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="sig-company">Company</label>
              <input
                id="sig-company"
                type="text"
                maxLength={150}
                value={signature.company}
                onChange={(e) => setSignature((s) => ({ ...s, company: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="sig-address">Address</label>
              <textarea
                id="sig-address"
                maxLength={500}
                className="signature-address"
                value={signature.address}
                onChange={(e) => setSignature((s) => ({ ...s, address: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="sig-phone">Phone</label>
              <input
                id="sig-phone"
                type="text"
                maxLength={60}
                value={signature.phone}
                onChange={(e) => setSignature((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="sig-email">Email</label>
              <input
                id="sig-email"
                type="email"
                maxLength={254}
                value={signature.email}
                onChange={(e) => setSignature((s) => ({ ...s, email: e.target.value }))}
              />
            </div>

            <div className="field">
              <label>Preview</label>
              <div className="signature-preview" dangerouslySetInnerHTML={{ __html: signaturePreview }} />
            </div>
          </fieldset>
        )}

        <button id="save-btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </form>
      <Message state={message} />
      <div className="footer">
        <button className="link" type="button" onClick={showLogin}>
          Log out
        </button>
      </div>
    </main>
  );
}
