import { useState } from 'react';
import type { Note } from '../types';
import NoteEditor from './NoteEditor';

interface Props {
  note: Note;
  onUpdate: (body: { title?: string; content?: string }) => void | Promise<void>;
  onDelete: () => void;
  onPin: (pinned: boolean) => void;
  onShare: () => void;
  onHistory: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NoteCard({
  note,
  onUpdate,
  onDelete,
  onPin,
  onShare,
  onHistory,
}: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <NoteEditor
        initialTitle={note.title}
        initialContent={note.content}
        saveLabel="Update"
        onSave={async (title, content) => {
          await onUpdate({ title, content });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`note-card ${note.pinned ? 'pinned' : ''}`}>
      <div className="note-head">
        <h3 className="note-title">{note.title}</h3>
        {note.pinned && <span className="tag">Pinned</span>}
        {!note.is_owner && <span className="tag tag-info">Shared</span>}
        <div className="note-actions">
          {note.is_owner && (
            <button
              className="btn-ghost"
              onClick={() => onPin(!note.pinned)}
              title={note.pinned ? 'Unpin' : 'Pin'}
            >
              {note.pinned ? '📌' : '📍'}
            </button>
          )}
          <button className="btn-ghost" onClick={onHistory} title="Version history">
            ⟲
          </button>
          {note.is_owner && (
            <>
              <button className="btn-ghost" onClick={onShare} title="Share">
                ⇪
              </button>
              <button className="btn-ghost" onClick={() => setEditing(true)} title="Edit">
                ✎
              </button>
              <button
                className="btn-ghost btn-danger"
                onClick={onDelete}
                title="Delete"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
      {note.content && <p className="note-content">{note.content}</p>}
      <div className="note-meta">
        <span>Updated {formatDate(note.updated_at)}</span>
      </div>
    </div>
  );
}
