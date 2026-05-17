export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  message: string;
  issues?: Record<string, string[]>;
  errors?: string[];
}
