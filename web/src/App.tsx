import { useState, useEffect } from 'react';
import { api, getToken, clearToken } from './api';
import AuthView from './components/AuthView';
import NotesView from './components/NotesView';

export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => getToken() !== null);

  useEffect(() => {
    if (!authed) return;
    api.listNotes().catch(() => {
      clearToken();
      setAuthed(false);
    });
  }, [authed]);

  if (!authed) {
    return <AuthView onAuthed={() => setAuthed(true)} />;
  }

  return (
    <NotesView
      onLogout={() => {
        clearToken();
        setAuthed(false);
      }}
    />
  );
}
