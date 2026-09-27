'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken } from '@/lib/client/api';
import LoginForm from '@/components/LoginForm';
import Message, { MessageState } from '@/components/Message';

interface ConfigData {
  subject: string;
  title: string;
  body: string;
  resumeFound: boolean;
  resumeFile: string;
}

export default function AdminPage() {
  const [view, setView] = useState<'checking' | 'login' | 'app'>('checking');
  const [fields, setFields] = useState({ subject: '', title: '', body: '' });
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
    setFields({ subject: data.subject, title: data.title, body: data.body });
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
      const { res, data } = await api<{ error?: string }>('PUT', '/api/config', fields);
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
          <label htmlFor="title">Email Title</label>
          <input
            id="title"
            type="text"
            maxLength={300}
            required
            value={fields.title}
            onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
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
