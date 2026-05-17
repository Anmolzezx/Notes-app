import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Note } from '../types';
import NoteCard from './NoteCard';
import NoteEditor from './NoteEditor';
import ShareDialog from './ShareDialog';
import VersionsModal from './VersionsModal';
import { useToast } from './Toast';

interface Props {
  onLogout: () => void;
}

export default function NotesView({ onLogout }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<Note | null>(null);
  const [historyOf, setHistoryOf] = useState<Note | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = searchTerm ? await api.search(searchTerm) : await api.listNotes();
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    void load();
  }, [load]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchTerm(query.trim());
  }

  function clearSearch() {
    setQuery('');
    setSearchTerm('');
  }

  async function handleCreate(title: string, content: string) {
    try {
      await api.createNote(title, content);
      setShowEditor(false);
      toast.show('Note created', 'success');
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  async function handleUpdate(id: string, body: { title?: string; content?: string }) {
    try {
      await api.updateNote(id, body);
      toast.show('Note updated', 'success');
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note? This also deletes its version history.')) return;
    try {
      await api.deleteNote(id);
      toast.show('Note deleted', 'success');
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  async function handlePin(id: string, pinned: boolean) {
    try {
      await api.pinNote(id, pinned);
      await load();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  async function handleShare(email: string) {
    if (!sharing) return;
    const res = await api.shareNote(sharing.id, email);
    toast.show(res.message, 'success');
  }

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Notes</h1>
          <div className="header-meta">
            {notes.length} note{notes.length === 1 ? '' : 's'}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        </div>
        <button className="btn-ghost" onClick={onLogout}>
          Sign out
        </button>
      </div>

      <form className="toolbar" onSubmit={runSearch}>
        <input
          type="text"
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searchTerm && (
          <button type="button" className="btn-ghost" onClick={clearSearch}>
            Clear
          </button>
        )}
        <button type="submit" className="btn-ghost">
          Search
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setShowEditor((s) => !s)}
        >
          + New
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {showEditor && (
        <NoteEditor onSave={handleCreate} onCancel={() => setShowEditor(false)} />
      )}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="empty">
          {searchTerm
            ? `No notes match "${searchTerm}".`
            : 'No notes yet. Create one to get started.'}
        </p>
      ) : (
        <div className="notes">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onUpdate={(body) => handleUpdate(n.id, body)}
              onDelete={() => handleDelete(n.id)}
              onPin={(p) => handlePin(n.id, p)}
              onShare={() => setSharing(n)}
              onHistory={() => setHistoryOf(n)}
            />
          ))}
        </div>
      )}

      {sharing && (
        <ShareDialog
          noteTitle={sharing.title}
          onShare={handleShare}
          onClose={() => setSharing(null)}
        />
      )}

      {historyOf && (
        <VersionsModal
          noteId={historyOf.id}
          noteTitle={historyOf.title}
          canRestore={historyOf.is_owner}
          onRestored={() => {
            toast.show('Restored to selected version', 'success');
            void load();
          }}
          onClose={() => setHistoryOf(null)}
        />
      )}
    </div>
  );
}
