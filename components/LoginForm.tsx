'use client';

import { FormEvent, useState } from 'react';
import { api, setToken } from '@/lib/client/api';
import Message, { MessageState } from './Message';

export default function LoginForm({
  heading,
  onLoggedIn,
}: {
  heading: string;
  onLoggedIn: () => void | Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { res, data } = await api<{ token: string; error?: string }>('POST', '/api/login', {
        username,
        password,
      });
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Login failed.' });
        return;
      }
      setToken(data.token);
      setPassword('');
      await onLoggedIn();
    } catch {
      setMessage({ type: 'error', text: 'Could not reach the server.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <h1>{heading}</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading}>
          Log In
        </button>
      </form>
      <Message state={message} />
    </main>
  );
}
