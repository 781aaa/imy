-- 在线考试与题库系统 数据库结构
-- 时间统一使用毫秒时间戳（INTEGER）

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  real_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  token_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_real_name ON users(real_name);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  grade TEXT NOT NULL DEFAULT '',
  teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

CREATE TABLE IF NOT EXISTS class_students (
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES knowledge_points(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_name_parent
  ON knowledge_points(name, COALESCE(parent_id, 0));

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'true_false', 'fill', 'short')),
  stem TEXT NOT NULL,
  answer_json TEXT NOT NULL DEFAULT 'null',
  analysis TEXT NOT NULL DEFAULT '',
  difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  default_score REAL NOT NULL DEFAULT 5 CHECK (default_score > 0),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);

CREATE TABLE IF NOT EXISTS question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  order_no INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_question_options_label
  ON question_options(question_id, label);
CREATE INDEX IF NOT EXISTS idx_question_options_question
  ON question_options(question_id);

CREATE TABLE IF NOT EXISTS question_knowledge_points (
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  knowledge_point_id INTEGER NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, knowledge_point_id)
);

CREATE INDEX IF NOT EXISTS idx_qkp_knowledge
  ON question_knowledge_points(knowledge_point_id);

CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_score REAL NOT NULL DEFAULT 0,
  duration_min INTEGER NOT NULL DEFAULT 60 CHECK (duration_min > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  gen_type TEXT NOT NULL DEFAULT 'manual' CHECK (gen_type IN ('manual', 'random')),
  gen_config_json TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(status);
CREATE INDEX IF NOT EXISTS idx_papers_created_by ON papers(created_by);

CREATE TABLE IF NOT EXISTS paper_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_no INTEGER NOT NULL DEFAULT 0,
  total_score REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_paper_sections_paper
  ON paper_sections(paper_id, order_no);

CREATE TABLE IF NOT EXISTS paper_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES paper_sections(id) ON DELETE SET NULL,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  order_no INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 5 CHECK (score > 0),
  snapshot_json TEXT,
  UNIQUE (paper_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_paper_questions_paper
  ON paper_questions(paper_id, order_no);
CREATE INDEX IF NOT EXISTS idx_paper_questions_section
  ON paper_questions(section_id, order_no);

CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min > 0),
  pass_score REAL NOT NULL DEFAULT 60,
  max_attempts INTEGER NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 10),
  shuffle_questions INTEGER NOT NULL DEFAULT 0 CHECK (shuffle_questions IN (0, 1)),
  shuffle_options INTEGER NOT NULL DEFAULT 0 CHECK (shuffle_options IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'ongoing', 'finished', 'published')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at INTEGER,
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exams_window ON exams(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);

CREATE TABLE IF NOT EXISTS exam_classes (
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (exam_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_classes_class ON exam_classes(class_id);

CREATE TABLE IF NOT EXISTS exam_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'graded')),
  started_at INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  submitted_at INTEGER,
  submit_type TEXT CHECK (submit_type IN ('manual', 'auto', 'force')),
  objective_score REAL NOT NULL DEFAULT 0,
  subjective_score REAL NOT NULL DEFAULT 0,
  total_score REAL NOT NULL DEFAULT 0,
  violation_count INTEGER NOT NULL DEFAULT 0,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (exam_id, student_id, attempt_no)
);

CREATE INDEX IF NOT EXISTS idx_sessions_exam_status
  ON exam_sessions(exam_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_student
  ON exam_sessions(student_id, exam_id);

CREATE TABLE IF NOT EXISTS session_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  paper_question_id INTEGER NOT NULL REFERENCES paper_questions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  section_id INTEGER,
  order_no INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  question_snapshot_json TEXT NOT NULL,
  option_order_json TEXT,
  UNIQUE (session_id, paper_question_id)
);

CREATE INDEX IF NOT EXISTS idx_session_questions_session
  ON session_questions(session_id, order_no);

CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_question_id INTEGER NOT NULL UNIQUE
    REFERENCES session_questions(id) ON DELETE CASCADE,
  answer_json TEXT NOT NULL DEFAULT 'null',
  is_correct INTEGER CHECK (is_correct IN (0, 1)),
  score REAL,
  grader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  grader_comment TEXT NOT NULL DEFAULT '',
  graded_at INTEGER,
  save_version INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answers_session_question
  ON answers(session_question_id);

CREATE TABLE IF NOT EXISTS session_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  client_seq INTEGER,
  occurred_at INTEGER NOT NULL,
  ip TEXT,
  detail_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_events_seq
  ON session_events(session_id, client_seq)
  WHERE client_seq IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_events_session
  ON session_events(session_id, occurred_at);

CREATE TABLE IF NOT EXISTS grading_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  previous_score REAL NOT NULL DEFAULT 0,
  new_score REAL NOT NULL DEFAULT 0,
  comment TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_grading_reviews_session
  ON grading_reviews(session_id, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  related_type TEXT,
  related_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at INTEGER NOT NULL,
  read_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, is_read, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT '',
  resource_id TEXT,
  method TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  ip TEXT,
  user_agent TEXT,
  detail_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS system_configs (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS job_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_name TEXT NOT NULL,
  run_key TEXT NOT NULL UNIQUE,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  detail TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_job_runs_name ON job_runs(job_name, started_at);
