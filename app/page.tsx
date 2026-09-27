'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken } from '@/lib/client/api';
import LoginForm from '@/components/LoginForm';
import Message, { MessageState } from '@/components/Message';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SendPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // A saved token is checked on the first send; an expired one returns to the login form.
    if (getToken()) setLoggedIn(true);
  }, []);

  useEffect(() => {
    if (loggedIn) inputRef.current?.focus();
  }, [loggedIn]);

  function showLogin() {
    setToken(null);
    setLoggedIn(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = recipient.trim();

    if (!EMAIL_RE.test(value)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      inputRef.current?.focus();
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      const { res, data } = await api<{ message?: string; error?: string; detail?: string }>(
        'POST',
        '/api/send-email',
        { recipient: value },
      );

      if (res.status === 401) {
        showLogin();
      } else if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Email sent successfully.' });
        setRecipient('');
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send email. Please check the email configuration.',
          detail: data.detail,
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send email. Could not reach the server.' });
    } finally {
      setSending(false);
      if (loggedIn) inputRef.current?.focus();
    }
  }

  if (!loggedIn) {
    return (
      <LoginForm
        heading="Log In"
        onLoggedIn={() => {
          setLoggedIn(true);
        }}
      />
    );
  }

  return (
    <main className="card">
      <h1>Send Resume</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="recipient">Recipient Email</label>
          <input
            id="recipient"
            name="recipient"
            type="email"
            placeholder="recruiter@company.com"
            autoComplete="email"
            required
            ref={inputRef}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <button id="send-btn" type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send Email'}
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
