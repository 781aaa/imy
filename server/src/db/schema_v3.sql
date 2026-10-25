-- v3：学生练习记录与错题本

CREATE TABLE IF NOT EXISTS practice_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_snapshot_json TEXT NOT NULL,
  answer_json TEXT,
  is_correct INTEGER CHECK (is_correct IN (0, 1)),
  answered_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_practice_student_time
  ON practice_records(student_id, answered_at);

CREATE INDEX IF NOT EXISTS idx_practice_student_question
  ON practice_records(student_id, question_id, is_correct);
