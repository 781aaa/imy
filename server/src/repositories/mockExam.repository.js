'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');

function create(data) {
  const result = run(
    `INSERT INTO mock_exams (
      student_id, level_name, topic_name, title, question_count, duration_min,
      total_score, score, status, started_at, deadline_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'in_progress', ?, ?, ?, ?)`,
    [
      Number(data.studentId),
      data.levelName,
      data.topicName || '',
      data.title,
      Number(data.questionCount),
      Number(data.durationMin),
      Number(data.totalScore),
      Number(data.startedAt),
      Number(data.deadlineAt),
      Number(data.createdAt),
      Number(data.updatedAt),
    ],
  );

  return lastInsertId(result);
}

function createQuestion(data) {
  const result = run(
    `INSERT INTO mock_exam_questions (
      mock_exam_id, question_id, order_no, snapshot_json, answer_json,
      is_correct, score, max_score
    ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)`,
    [
      Number(data.mockExamId),
      Number(data.questionId),
      Number(data.orderNo),
      JSON.stringify(data.snapshot),
      Number(data.maxScore),
    ],
  );

  return lastInsertId(result);
}

function findById(id) {
  return get('SELECT * FROM mock_exams WHERE id = ?', [Number(id)]);
}

function findQuestions(mockExamId) {
  return all(
    `SELECT * FROM mock_exam_questions
     WHERE mock_exam_id = ?
     ORDER BY order_no ASC, id ASC`,
    [Number(mockExamId)],
  );
}

function findQuestion(mockExamId, questionId) {
  return get(
    `SELECT * FROM mock_exam_questions
     WHERE mock_exam_id = ? AND question_id = ?`,
    [Number(mockExamId), Number(questionId)],
  );
}

function updateAnswer(mockExamId, questionId, answerJson) {
  run(
    `UPDATE mock_exam_questions
     SET answer_json = ?
     WHERE mock_exam_id = ? AND question_id = ?`,
    [answerJson, Number(mockExamId), Number(questionId)],
  );
}

function updateGrade(mockExamId, questionId, isCorrect, score) {
  run(
    `UPDATE mock_exam_questions
     SET is_correct = ?, score = ?
     WHERE mock_exam_id = ? AND question_id = ?`,
    [
      isCorrect ? 1 : 0,
      Number(score),
      Number(mockExamId),
      Number(questionId),
    ],
  );
}

function submit(mockExamId, score, submittedAt) {
  run(
    `UPDATE mock_exams
     SET status = 'submitted', score = ?, submitted_at = ?, updated_at = ?
     WHERE id = ?`,
    [Number(score), Number(submittedAt), Number(submittedAt), Number(mockExamId)],
  );
}

function listByStudent(studentId, limit = 30) {
  return all(
    `SELECT * FROM mock_exams
     WHERE student_id = ?
     ORDER BY started_at DESC, id DESC
     LIMIT ?`,
    [Number(studentId), Number(limit)],
  );
}

module.exports = {
  create,
  createQuestion,
  findById,
  findQuestions,
  findQuestion,
  updateAnswer,
  updateGrade,
  submit,
  listByStudent,
};
