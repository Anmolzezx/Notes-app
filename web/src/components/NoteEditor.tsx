import { useState } from 'react';

interface Props {
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => void | Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
}

export default function NoteEditor({
  initialTitle = '',
  initialContent = '',
  onSave,
  onCancel,
  saveLabel = 'Save',
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(title.trim(), content);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="editor" onSubmit={submit}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={255}
        required
        autoFocus
      />
      <textarea
        placeholder="Write something…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={100000}
      />
      <div className="editor-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn" disabled={saving || !title.trim()}>
          {saving ? '...' : saveLabel}
        </button>
      </div>
    </form>
  );
}
