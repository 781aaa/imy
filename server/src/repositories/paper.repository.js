'use strict';

const {
  all,
  get,
  run,
  lastInsertId,
  transaction,
} = require('../db/connection');
const { likeKeyword } = require('../utils/sql');

const SUMMARY_SELECT = `
  p.*, u.real_name AS creator_name,
  (SELECT COUNT(*) FROM paper_questions pq WHERE pq.paper_id = p.id) AS question_count
`;

function buildFilters(options = {}) {
  const { keyword, status, createdBy } = options;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (createdBy) {
    conditions.push('p.created_by = ?');
    params.push(Number(createdBy));
  }

  const like = likeKeyword(keyword);
  if (like) {
    conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
    params.push(like, like);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function list(options = {}) {
  const { offset = 0, limit = 20 } = options;
  const { where, params } = buildFilters(options);

  const items = all(
    `SELECT ${SUMMARY_SELECT}
     FROM papers p
     LEFT JOIN users u ON u.id = p.created_by
     ${where}
     ORDER BY p.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );

  const totalRow = get(`SELECT COUNT(*) AS count FROM papers p ${where}`, params);

  return { items, total: Number(totalRow.count) };
}

function findById(id) {
  return get('SELECT * FROM papers WHERE id = ?', [Number(id)]);
}

function findSummaryById(id) {
  return get(
    `SELECT ${SUMMARY_SELECT}
     FROM papers p
     LEFT JOIN users u ON u.id = p.created_by
     WHERE p.id = ?`,
    [Number(id)],
  );
}

function findSections(paperId) {
  return all(
    `SELECT * FROM paper_sections
     WHERE paper_id = ?
     ORDER BY order_no ASC, id ASC`,
    [Number(paperId)],
  );
}

function findSection(sectionId) {
  return get('SELECT * FROM paper_sections WHERE id = ?', [Number(sectionId)]);
}

function findPaperQuestions(paperId) {
  return all(
    `SELECT pq.*, q.type, q.stem, q.analysis, q.difficulty, q.answer_json,
            q.status AS question_status,
            (
              SELECT GROUP_CONCAT(kp.name, '、')
              FROM question_knowledge_points qkp
              JOIN knowledge_points kp ON kp.id = qkp.knowledge_point_id
              WHERE qkp.question_id = q.id
            ) AS knowledge_names
     FROM paper_questions pq
     JOIN questions q ON q.id = pq.question_id
     WHERE pq.paper_id = ?
     ORDER BY pq.order_no ASC, pq.id ASC`,
    [Number(paperId)],
  );
}

function findOptionsByQuestionIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  return all(
    `SELECT question_id, label, content, is_correct, order_no
     FROM question_options
     WHERE question_id IN (${placeholders})
     ORDER BY question_id ASC, order_no ASC, label ASC`,
    ids.map((id) => Number(id)),
  );
}

function create(data) {
  const result = run(
    `INSERT INTO papers (
      title, description, total_score, duration_min, status, gen_type,
      gen_config_json, created_by, created_at, updated_at
    ) VALUES (?, ?, 0, ?, 'draft', ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description || '',
      Number(data.durationMin || 60),
      data.genType || 'manual',
      data.genConfigJson ?? null,
      data.createdBy ?? null,
      data.createdAt,
      data.updatedAt,
    ],
  );

  return lastInsertId(result);
}

function update(id, data) {
  const fields = [];
  const params = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    params.push(data.description);
  }
  if (data.durationMin !== undefined) {
    fields.push('duration_min = ?');
    params.push(Number(data.durationMin));
  }
  if (data.status !== undefined) {
    fields.push('status = ?');
    params.push(data.status);
  }

  if (fields.length === 0) return;

  params.push(data.updatedAt || Date.now(), Number(id));
  run(`UPDATE papers SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`, params);
}

function remove(id) {
  const result = run('DELETE FROM papers WHERE id = ?', [Number(id)]);
  return Number(result.changes) > 0;
}

function createSection(data) {
  const result = run(
    `INSERT INTO paper_sections (paper_id, title, description, order_no, total_score)
     VALUES (?, ?, ?, ?, 0)`,
    [
      Number(data.paperId),
      data.title,
      data.description || '',
      Number(data.orderNo || 0),
    ],
  );

  return lastInsertId(result);
}

function updateSection(id, data) {
  const fields = [];
  const params = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    params.push(data.description);
  }
  if (data.orderNo !== undefined) {
    fields.push('order_no = ?');
    params.push(Number(data.orderNo));
  }

  if (fields.length === 0) return;

  params.push(Number(id));
  run(`UPDATE paper_sections SET ${fields.join(', ')} WHERE id = ?`, params);
}

function removeSection(id) {
  run('UPDATE paper_questions SET section_id = NULL WHERE section_id = ?', [Number(id)]);
  run('DELETE FROM paper_sections WHERE id = ?', [Number(id)]);
}

function addQuestion(data) {
  const result = run(
    `INSERT INTO paper_questions (
      paper_id, section_id, question_id, order_no, score, snapshot_json
    ) VALUES (?, ?, ?, ?, ?, NULL)`,
    [
      Number(data.paperId),
      data.sectionId === null || data.sectionId === undefined
        ? null
        : Number(data.sectionId),
      Number(data.questionId),
      Number(data.orderNo || 0),
      Number(data.score),
    ],
  );

  return lastInsertId(result);
}

function updateQuestion(id, data) {
  const fields = [];
  const params = [];

  if (data.score !== undefined) {
    fields.push('score = ?');
    params.push(Number(data.score));
  }
  if (data.sectionId !== undefined) {
    fields.push('section_id = ?');
    params.push(data.sectionId === null ? null : Number(data.sectionId));
  }
  if (data.orderNo !== undefined) {
    fields.push('order_no = ?');
    params.push(Number(data.orderNo));
  }

  if (fields.length === 0) return;

  params.push(Number(id));
  run(`UPDATE paper_questions SET ${fields.join(', ')} WHERE id = ?`, params);
}

function removeQuestion(id) {
  run('DELETE FROM paper_questions WHERE id = ?', [Number(id)]);
}

function findPaperQuestion(id) {
  return get('SELECT * FROM paper_questions WHERE id = ?', [Number(id)]);
}

function findPaperQuestionByQuestion(paperId, questionId) {
  return get(
    'SELECT * FROM paper_questions WHERE paper_id = ? AND question_id = ?',
    [Number(paperId), Number(questionId)],
  );
}

function countQuestions(paperId) {
  const row = get(
    'SELECT COUNT(*) AS count FROM paper_questions WHERE paper_id = ?',
    [Number(paperId)],
  );
  return Number(row.count);
}

function nextQuestionOrder(paperId) {
  const row = get(
    'SELECT COALESCE(MAX(order_no), -1) AS max_order FROM paper_questions WHERE paper_id = ?',
    [Number(paperId)],
  );
  return Number(row.max_order) + 1;
}

function nextSectionOrder(paperId) {
  const row = get(
    'SELECT COALESCE(MAX(order_no), -1) AS max_order FROM paper_sections WHERE paper_id = ?',
    [Number(paperId)],
  );
  return Number(row.max_order) + 1;
}

function recalcTotals(paperId) {
  transaction((db) => {
    const sections = db
      .prepare('SELECT id FROM paper_sections WHERE paper_id = ?')
      .all(Number(paperId));

    for (const section of sections) {
      const row = db
        .prepare(
          'SELECT COALESCE(SUM(score), 0) AS total FROM paper_questions WHERE section_id = ?',
        )
        .get(Number(section.id));

      db.prepare('UPDATE paper_sections SET total_score = ? WHERE id = ?')
        .run(Number(row.total), Number(section.id));
    }

    const totalRow = db
      .prepare('SELECT COALESCE(SUM(score), 0) AS total FROM paper_questions WHERE paper_id = ?')
      .get(Number(paperId));

    db.prepare('UPDATE papers SET total_score = ?, updated_at = ? WHERE id = ?')
      .run(Number(totalRow.total), Date.now(), Number(paperId));
  });
}

function setSnapshot(paperQuestionId, snapshot) {
  run('UPDATE paper_questions SET snapshot_json = ? WHERE id = ?', [
    JSON.stringify(snapshot),
    Number(paperQuestionId),
  ]);
}

function setPublished(paperId, totalScore, publishedAt = Date.now()) {
  run(
    `UPDATE papers
     SET status = 'published', total_score = ?, published_at = ?, updated_at = ?
     WHERE id = ?`,
    [Number(totalScore), publishedAt, publishedAt, Number(paperId)],
  );
}

function selectRandomQuestions(rule, excludeIds = []) {
  const conditions = [
    "q.status = 'published'",
    'q.type = ?',
    'q.difficulty BETWEEN ? AND ?',
  ];
  const params = [rule.type, Number(rule.difficultyMin), Number(rule.difficultyMax)];

  if (Array.isArray(rule.knowledgePointIds) && rule.knowledgePointIds.length > 0) {
    const placeholders = rule.knowledgePointIds.map(() => '?').join(', ');
    conditions.push(
      `EXISTS (
        SELECT 1 FROM question_knowledge_points qkp
        WHERE qkp.question_id = q.id
          AND qkp.knowledge_point_id IN (${placeholders})
      )`,
    );
    params.push(...rule.knowledgePointIds.map((id) => Number(id)));
  }

  if (Array.isArray(excludeIds) && excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => '?').join(', ');
    conditions.push(`q.id NOT IN (${placeholders})`);
    params.push(...excludeIds.map((id) => Number(id)));
  }

  return all(
    `SELECT q.id FROM questions q
     WHERE ${conditions.join(' AND ')}
     ORDER BY RANDOM()
     LIMIT ?`,
    [...params, Number(rule.count)],
  );
}

function duplicate(paperId, options = {}) {
  return transaction((db) => {
    const source = db.prepare('SELECT * FROM papers WHERE id = ?').get(Number(paperId));
    if (!source) return null;

    const timestamp = options.createdAt || Date.now();
    const insertPaper = db.prepare(`
      INSERT INTO papers (
        title, description, total_score, duration_min, status, gen_type,
        gen_config_json, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
    `).run(
      options.title || `${source.title}（副本）`,
      source.description,
      source.total_score,
      source.duration_min,
      source.gen_type,
      source.gen_config_json,
      options.createdBy ?? source.created_by,
      timestamp,
      timestamp,
    );

    const newPaperId = lastInsertId(insertPaper);
    const sectionMap = new Map();

    const sections = db.prepare(
      'SELECT * FROM paper_sections WHERE paper_id = ? ORDER BY order_no ASC, id ASC',
    ).all(Number(paperId));

    const insertSection = db.prepare(`
      INSERT INTO paper_sections (paper_id, title, description, order_no, total_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const section of sections) {
      const result = insertSection.run(
        newPaperId,
        section.title,
        section.description,
        section.order_no,
        section.total_score,
      );
      sectionMap.set(Number(section.id), lastInsertId(result));
    }

    const questions = db.prepare(
      'SELECT * FROM paper_questions WHERE paper_id = ? ORDER BY order_no ASC, id ASC',
    ).all(Number(paperId));

    const insertQuestion = db.prepare(`
      INSERT INTO paper_questions (
        paper_id, section_id, question_id, order_no, score, snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const question of questions) {
      insertQuestion.run(
        newPaperId,
        question.section_id === null ? null : (sectionMap.get(Number(question.section_id)) || null),
        question.question_id,
        question.order_no,
        question.score,
        question.snapshot_json,
      );
    }

    return newPaperId;
  });
}

module.exports = {
  list,
  findById,
  findSummaryById,
  findSections,
  findSection,
  findPaperQuestions,
  findOptionsByQuestionIds,
  create,
  update,
  remove,
  createSection,
  updateSection,
  removeSection,
  addQuestion,
  updateQuestion,
  removeQuestion,
  findPaperQuestion,
  findPaperQuestionByQuestion,
  countQuestions,
  nextQuestionOrder,
  nextSectionOrder,
  recalcTotals,
  setSnapshot,
  setPublished,
  selectRandomQuestions,
  duplicate,
};
