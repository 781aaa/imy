-- v4：学生自主发起的模拟考试

CREATE TABLE IF NOT EXISTS mock_exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_name TEXT NOT NULL,
  topic_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,
  total_score REAL NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted')),
  started_at INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  submitted_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_student
  ON mock_exams(student_id, started_at);

CREATE TABLE IF NOT EXISTS mock_exam_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mock_exam_id INTEGER NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_no INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL,
  answer_json TEXT,
  is_correct INTEGER CHECK (is_correct IN (0, 1)),
  score REAL,
  max_score REAL NOT NULL DEFAULT 0,
  UNIQUE (mock_exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_exam
  ON mock_exam_questions(mock_exam_id, order_no);
