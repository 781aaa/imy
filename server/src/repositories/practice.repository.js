'use strict';

const { all, get, run, lastInsertId } = require('../db/connection');

const LEVEL_NAMES = ['英语A级', '大学英语四级', '专升本英语'];
const OBJECTIVE_TYPES = ['single', 'multiple', 'true_false', 'fill'];

function listLevels() {
  const placeholders = LEVEL_NAMES.map(() => '?').join(', ');
  return all(
    `SELECT id, name, description
     FROM knowledge_points
     WHERE parent_id IS NULL AND name IN (${placeholders})
     ORDER BY id ASC`,
    LEVEL_NAMES,
  );
}

function listTopics(levelIds) {
  if (!Array.isArray(levelIds) || levelIds.length === 0) return [];
  const placeholders = levelIds.map(() => '?').join(', ');
  return all(
    `SELECT id, name, parent_id
     FROM knowledge_points
     WHERE parent_id IN (${placeholders})
     ORDER BY id ASC`,
    levelIds.map((id) => Number(id)),
  );
}

function countByKnowledgePoint(kpIds) {
  if (!Array.isArray(kpIds) || kpIds.length === 0) return [];
  const placeholders = kpIds.map(() => '?').join(', ');
  const typePlaceholders = OBJECTIVE_TYPES.map(() => '?').join(', ');

  return all(
    `SELECT kp.id, COUNT(DISTINCT q.id) AS count
     FROM knowledge_points kp
     JOIN question_knowledge_points qkp ON qkp.knowledge_point_id = kp.id
     JOIN questions q ON q.id = qkp.question_id
     WHERE kp.id IN (${placeholders})
       AND q.status = 'published'
       AND q.type IN (${typePlaceholders})
     GROUP BY kp.id`,
    [...kpIds.map((id) => Number(id)), ...OBJECTIVE_TYPES],
  );
}

function selectQuestions(options) {
  const {
    levelId,
    topicId,
    types = OBJECTIVE_TYPES,
    difficultyMin = 1,
    difficultyMax = 5,
    limit = 10,
  } = options;

  const conditions = [
    "q.status = 'published'",
    `q.type IN (${types.map(() => '?').join(', ')})`,
    'q.difficulty BETWEEN ? AND ?',
  ];
  const params = [...types, Number(difficultyMin), Number(difficultyMax)];

  if (topicId) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM question_knowledge_points qkp
        JOIN knowledge_points kp ON kp.id = qkp.knowledge_point_id
        WHERE qkp.question_id = q.id AND kp.id = ?
      )`,
    );
    params.push(Number(topicId));
  } else if (levelId) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM question_knowledge_points qkp
        JOIN knowledge_points kp ON kp.id = qkp.knowledge_point_id
        WHERE qkp.question_id = q.id
          AND (kp.id = ? OR kp.parent_id = ?)
      )`,
    );
    params.push(Number(levelId), Number(levelId));
  }

  params.push(Number(limit));

  return all(
    `SELECT q.id, q.type, q.stem, q.difficulty, q.default_score, q.answer_json,
       (
         SELECT GROUP_CONCAT(kp2.name, '、')
         FROM question_knowledge_points qkp2
         JOIN knowledge_points kp2 ON kp2.id = qkp2.knowledge_point_id
         WHERE qkp2.question_id = q.id
       ) AS knowledge_names
     FROM questions q
     WHERE ${conditions.join(' AND ')}
     ORDER BY RANDOM()
     LIMIT ?`,
    params,
  );
}

function createRecord(data) {
  const result = run(
    `INSERT INTO practice_records (
      student_id, question_id, question_snapshot_json, answer_json,
      is_correct, answered_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(data.studentId),
      Number(data.questionId),
      JSON.stringify(data.snapshot),
      JSON.stringify(data.answer === undefined ? null : data.answer),
      data.isCorrect === null || data.isCorrect === undefined
        ? null
        : (data.isCorrect ? 1 : 0),
      Number(data.answeredAt),
      Number(data.createdAt || data.answeredAt),
    ],
  );

  return lastInsertId(result);
}

function listWrongLatest(studentId, limit = 100) {
  // 以每道题「最近一次作答」为准：最近一次答对就自动从错题本移除
  return all(
    `SELECT * FROM (
       SELECT pr.*,
         ROW_NUMBER() OVER (
           PARTITION BY question_id ORDER BY answered_at DESC, id DESC
         ) AS rn,
         SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) OVER (
           PARTITION BY question_id
         ) AS wrong_count
       FROM practice_records pr
       WHERE student_id = ?
     )
     WHERE rn = 1 AND is_correct = 0
     ORDER BY answered_at DESC
     LIMIT ?`,
    [Number(studentId), Number(limit)],
  );
}

function findRecordById(id, studentId) {
  return get(
    'SELECT * FROM practice_records WHERE id = ? AND student_id = ?',
    [Number(id), Number(studentId)],
  );
}

function updateSelfAssessment(recordId, isCorrect) {
  const result = run(
    'UPDATE practice_records SET is_correct = ? WHERE id = ?',
    [isCorrect ? 1 : 0, Number(recordId)],
  );
  return Number(result.changes) > 0;
}

function countAnswered(studentId) {
  const row = get(
    'SELECT COUNT(*) AS count FROM practice_records WHERE student_id = ?',
    [Number(studentId)],
  );
  return Number(row.count);
}

function countCorrect(studentId) {
  const row = get(
    'SELECT COUNT(*) AS count FROM practice_records WHERE student_id = ? AND is_correct = 1',
    [Number(studentId)],
  );
  return Number(row.count);
}

function countSince(studentId, since) {
  const row = get(
    'SELECT COUNT(*) AS count FROM practice_records WHERE student_id = ? AND answered_at >= ?',
    [Number(studentId), Number(since)],
  );
  return Number(row.count);
}

function listRecentRecords(studentId, limit = 200) {
  return all(
    `SELECT * FROM practice_records
     WHERE student_id = ?
     ORDER BY answered_at DESC, id DESC
     LIMIT ?`,
    [Number(studentId), Number(limit)],
  );
}

function deleteByQuestion(studentId, questionId) {
  const result = run(
    'DELETE FROM practice_records WHERE student_id = ? AND question_id = ?',
    [Number(studentId), Number(questionId)],
  );
  return Number(result.changes);
}

module.exports = {
  LEVEL_NAMES,
  OBJECTIVE_TYPES,
  listLevels,
  listTopics,
  countByKnowledgePoint,
  selectQuestions,
  createRecord,
  listWrongLatest,
  findRecordById,
  updateSelfAssessment,
  countAnswered,
  countCorrect,
  countSince,
  listRecentRecords,
  deleteByQuestion,
};
