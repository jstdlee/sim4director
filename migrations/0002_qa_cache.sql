-- Answer cache: reuse an earlier answer when a new question is similar enough.
CREATE TABLE IF NOT EXISTS qa_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,            -- 'tutor' | 'explain'
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  emb TEXT NOT NULL,             -- JSON float array (bge-m3, 1024 dims)
  sources TEXT,                  -- JSON [{title,url}] when web search was used
  hits INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_qa_kind ON qa_cache(kind, created_at);
