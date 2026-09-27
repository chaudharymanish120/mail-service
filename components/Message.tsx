'use client';

export type MessageState = { type: 'success' | 'error'; text: string; detail?: string } | null;

export default function Message({ state }: { state: MessageState }) {
  if (!state) return null;
  return (
    <div className={`message ${state.type}`} role="status">
      {state.text}
      {state.detail && <span className="detail">{state.detail}</span>}
    </div>
  );
}
