export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  position: number;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteVersion {
  id: string;
  version_no: number;
  title: string;
  content: string;
  created_at: string;
}

export interface ApiError {
  message: string;
  issues?: Record<string, string[]>;
  errors?: string[];
}
