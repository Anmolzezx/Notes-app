import { useEffect, useState } from 'react';
import { api } from '../api';
import type { NoteVersion } from '../types';
import { CloseIcon } from './Icons';

interface Props {
  noteId: string;
  noteTitle: string;
  canRestore: boolean;
  onRestored: () => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function VersionsModal({
  noteId,
  noteTitle,
  canRestore,
  onRestored,
  onClose,
}: Props) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    void api
      .listVersions(noteId)
      .then((data) => {
        setVersions(data);
        setSelectedId(data[0]?.id ?? null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : String(err))
      )
      .finally(() => setLoading(false));
  }, [noteId]);

  const selected = versions.find((v) => v.id === selectedId);

  async function restore() {
    if (!selected || !canRestore) return;
    if (!confirm(`Restore note to version ${selected.version_no}? This will create a new version.`)) return;
    setRestoring(true);
    setError(null);
    try {
      await api.restoreVersion(noteId, selected.id);
      onRestored();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Version history</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <p className="modal-sub">
          <strong>{noteTitle}</strong>
        </p>

        {loading ? (
          <p className="empty">Loading…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : versions.length === 0 ? (
          <p className="empty">No versions yet.</p>
        ) : (
          <div className="versions-layout">
            <ul className="versions-list">
              {versions.map((v, i) => (
                <li
                  key={v.id}
                  className={`version-item ${v.id === selectedId ? 'selected' : ''}`}
                  onClick={() => setSelectedId(v.id)}
                >
                  <div className="version-row">
                    <span className="version-no">v{v.version_no}</span>
                    {i === 0 && <span className="tag tag-success">Current</span>}
                  </div>
                  <div className="version-date">{formatDate(v.created_at)}</div>
                </li>
              ))}
            </ul>
            <div className="version-preview">
              {selected ? (
                <>
                  <div className="version-preview-head">
                    <h3>{selected.title}</h3>
                    <span className="version-date">
                      v{selected.version_no} · {formatDate(selected.created_at)}
                    </span>
                  </div>
                  <pre className="version-content">
                    {selected.content || <em className="muted">(empty content)</em>}
                  </pre>
                </>
              ) : (
                <p className="empty">Select a version on the left.</p>
              )}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
          {canRestore && selected && versions[0]?.id !== selected.id && (
            <button className="btn" onClick={restore} disabled={restoring}>
              {restoring ? '...' : `Restore v${selected.version_no}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
