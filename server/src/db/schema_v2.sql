-- v2：小克监督接口事件队列
-- 仅预留数据出口，不做任何外发连接

CREATE TABLE IF NOT EXISTS supervisor_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged')),
  created_at INTEGER NOT NULL,
  acknowledged_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_supervisor_events_status
  ON supervisor_events(status, created_at);

CREATE INDEX IF NOT EXISTS idx_supervisor_events_student
  ON supervisor_events(student_id, created_at);
