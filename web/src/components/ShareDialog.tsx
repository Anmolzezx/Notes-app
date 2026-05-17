import { useState } from 'react';

interface Props {
  noteTitle: string;
  onShare: (email: string) => Promise<void>;
  onClose: () => void;
}

export default function ShareDialog({ noteTitle, onShare, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onShare(email.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Share note</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="modal-sub">
          Share "<strong>{noteTitle}</strong>" with another registered user.
        </p>
        <form className="modal-form" onSubmit={submit}>
          <label>Recipient email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="someone@example.com"
            autoFocus
            required
          />
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={busy || !email}>
              {busy ? '...' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
