'use strict';

const paperRepository = require('../repositories/paper.repository');
const questionRepository = require('../repositories/question.repository');
const { parsePagination } = require('../utils/pagination');
const {
  toPaperSummary,
  toPaperDetail,
  parseJson,
} = require('../utils/serializers');
const {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} = require('../utils/errors');
const { ERROR_CODES, ROLES } = require('../config/constants');

function assertPaperAccess(paper, actor) {
  if (!paper) {
    throw new NotFoundError('试卷不存在');
  }
  if (actor.role === ROLES.ADMIN) return;
  if (Number(paper.created_by) === Number(actor.id)) return;
  throw new ForbiddenError('无权访问该试卷');
}

function assertDraft(paper) {
  if (paper.status !== 'draft') {
    throw new ConflictError('只有草稿状态的试卷可以编辑');
  }
}

function groupOptions(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = Number(row.question_id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      label: row.label,
      content: row.content,
      isCorrect: Number(row.is_correct) === 1,
    });
  }
  return map;
}

function buildPaperDetail(row) {
  const sections = paperRepository.findSections(row.id);
  const paperQuestions = paperRepository.findPaperQuestions(row.id);

  const liveQuestionIds = paperQuestions
    .filter((item) => !item.snapshot_json)
    .map((item) => item.question_id);

  const optionsByQuestion = groupOptions(
    paperRepository.findOptionsByQuestionIds(liveQuestionIds),
  );

  const questions = paperQuestions.map((item) => ({
    ...item,
    options: optionsByQuestion.get(Number(item.question_id)) || [],
    knowledgePoints: item.knowledge_names
      ? String(item.knowledge_names).split('、').map((name) => ({ name }))
      : [],
  }));

  return toPaperDetail(row, sections, questions);
}

function listPapers(query, actor) {
  const { page, pageSize, offset, limit } = parsePagination(query);
  const createdBy = actor.role === ROLES.ADMIN ? query.createdBy : actor.id;

  const result = paperRepository.list({
    keyword: query.keyword,
    status: query.status,
    createdBy,
    offset,
    limit,
  });

  return {
    items: result.items.map(toPaperSummary),
    total: result.total,
    page,
    pageSize,
  };
}

function getPaper(id, actor) {
  const row = paperRepository.findSummaryById(id);
  assertPaperAccess(row, actor);
  return buildPaperDetail(row);
}

function createPaper(payload, actor) {
  const timestamp = Date.now();
  const id = paperRepository.create({
    title: payload.title,
    description: payload.description || '',
    durationMin: payload.durationMin,
    genType: 'manual',
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return getPaper(id, actor);
}

function updatePaper(id, payload, actor) {
  const paper = paperRepository.findById(id);
  assertPaperAccess(paper, actor);
  assertDraft(paper);

  paperRepository.update(id, {
    title: payload.title,
    description: payload.description,
    durationMin: payload.durationMin,
    updatedAt: Date.now(),
  });

  return getPaper(id, actor);
}

function deletePaper(id, actor) {
  const paper = paperRepository.findById(id);
  assertPaperAccess(paper, actor);
  assertDraft(paper);

  paperRepository.remove(id);
  return { message: '试卷已删除' };
}

function ensureSection(paperId, sectionId) {
  const section = paperRepository.findSection(sectionId);
  if (!section || Number(section.paper_id) !== Number(paperId)) {
    throw new NotFoundError('该大题不属于当前试卷');
  }
  return section;
}

function addSection(paperId, payload, actor) {
  const paper = paperRepository.findById(paperId);
  assertPaperAccess(paper, actor);
  assertDraft(paper);

  const orderNo = payload.orderNo === undefined
    ? paperRepository.nextSectionOrder(paperId)
    : payload.orderNo;

  paperRepository.createSection({
    paperId,
    title: payload.title,
    description: payload.description,
    orderNo,
  });

  return getPaper(paperId, actor);
}

function updateSection(paperId, sectionId, payload, actor) {
  const paper = paperRepository.findById(paperId);
  assertPaperAccess(paper, actor);
  assertDraft(paper);
  ensureSection(paperId, sectionId);

  paperRepository.updateSection(sectionId, payload);
  return getPaper(paperId, actor);
}

function removeSection(paperId, sectionId, actor) {
  const paper = paperRepository.findById(paperId);
  assertPaperAccess(paper, actor);
  assertDraft(paper);
  ensureSection(paperId, sectionId);

  paperRepository.removeSection(sectionId);
  paperRepository.recalcTotals(paperId);

  return getPaper(paperId, actor);
}

function addQuestion(paperId, payload, actor) {
  const paper = paperRepository.findById(paperId);
  assertPaperAccess(paper, actor);
  assertDraft(paper);

  const question = questionRepository.findById(payload.questionId);
  if (!question) {
    throw new NotFoundError('题目不存在');
  }

  if (question.status !== 'published') {
    throw new BusinessError('只有已发布的题目才能加入试卷', ERROR_CODES.BAD_REQUEST, 400);
  }

  const duplicated = paperRepository.findPaperQuestionByQuestion(
    paperId,
    payload.questionId,
  );
  if (duplicated) {
    throw new ConflictError('该题目已经在本试卷中');
  }

  if (payload.sectionId !== undefined && payload.sectionId !== null) {
    ensureSection(paperId, payload.sectionId);
  }

  paperRepository.addQuestion({
    paperId,
    sectionId: payload.sectionId ?? null,
    questionId: payload.questionId,
    score: payload.score === undefined ? question.default_score : payload.score,
    orderNo: payload.orderNo === undefined
      ? paperRepository.nextQuestionOrder(paperId)
      : payload.orderNo,
  });

  paperRepository.recalcTotals(paperId);
  return getPaper(paperId, actor);
}

function updatePaperQuestion(paperId, paperQuestionId, payload, actor) {
  const paper = paperRepository.findById(paperId);
  assertPaperAccess(paper, actor);
  assertDraft(paper);

  const paperQuestion = paperRepository.findPaperQuestion(paperQuestionId);
  if (!paperQuestion || Number(paperQuestion.paper_id) !== Number(paperId)) {
    throw new NotFoundError('试卷题目不存在');
  }

  if (payload.sectionId !== undefined && payload.sectionId !== null) {
    ensureSection(paperId, payload.sectionId);
  }

  paperRepository.updateQuestion(paperQuestionId, payload);
  paperRepository.recalcTotals(paperId);

  return getPaper(paperId, actor);
}

function removePaperQuestion(paperId, paperQuestionId, actor) {
  const paper = paperRepository.findById(paperId);
  assertPaperAccess(paper, actor);
  assertDraft(paper);

  const paperQuestion = paperRepository.findPaperQuestion(paperQuestionId);
  if (!paperQuestion || Number(paperQuestion.paper_id) !== Number(paperId)) {
    throw new NotFoundError('试卷题目不存在');
  }

  paperRepository.removeQuestion(paperQuestionId);
  paperRepository.recalcTotals(paperId);

  return getPaper(paperId, actor);
}

function buildSnapshot(questionRow, options) {
  return {
    type: questionRow.type,
    stem: questionRow.stem,
    answer: parseJson(questionRow.answer_json, null),
    analysis: questionRow.analysis || '',
    difficulty: Number(questionRow.difficulty),
    options: options.map((option) => ({
      label: option.label,
      content: option.content,
      isCorrect: Boolean(option.isCorrect),
    })),
    knowledgePoints: questionRow.knowledge_names
      ? String(questionRow.knowledge_names).split('、').map((name) => ({ name }))
      : [],
  };
}

function publishPaper(id, actor) {
  const paper = paperRepository.findById(id);
  assertPaperAccess(paper, actor);
  assertDraft(paper);

  const count = paperRepository.countQuestions(id);
  if (count === 0) {
    throw new BusinessError('试卷中还没有题目，无法发布', ERROR_CODES.BAD_REQUEST, 400);
  }

  const paperQuestions = paperRepository.findPaperQuestions(id);
  const optionsByQuestion = groupOptions(
    paperRepository.findOptionsByQuestionIds(
      paperQuestions.map((item) => item.question_id),
    ),
  );

  for (const item of paperQuestions) {
    if (item.snapshot_json) continue;
    const options = optionsByQuestion.get(Number(item.question_id)) || [];
    paperRepository.setSnapshot(item.id, buildSnapshot(item, options));
  }

  paperRepository.recalcTotals(id);
  const updated = paperRepository.findById(id);
  paperRepository.setPublished(id, updated.total_score);

  return getPaper(id, actor);
}

function duplicatePaper(id, actor) {
  const paper = paperRepository.findById(id);
  assertPaperAccess(paper, actor);

  const newId = paperRepository.duplicate(id, {
    title: `${paper.title}（副本）`,
    createdBy: actor.id,
    createdAt: Date.now(),
  });

  if (!newId) {
    throw new NotFoundError('试卷不存在');
  }

  return getPaper(newId, actor);
}

function generateRandomPaper(payload, actor) {
  const selectedIds = [];
  const plans = [];

  for (const section of payload.sections) {
    const sectionPlan = { title: section.title, questions: [] };

    for (const rule of section.rules) {
      const rows = paperRepository.selectRandomQuestions(rule, selectedIds);

      if (rows.length < rule.count) {
        throw new BusinessError(
          `大题「${section.title}」需要 ${rule.count} 道题目，题库中符合条件的只有 ${rows.length} 道`,
          ERROR_CODES.BAD_REQUEST,
          400,
        );
      }

      for (const row of rows) {
        const questionId = Number(row.id);
        selectedIds.push(questionId);
        sectionPlan.questions.push({
          questionId,
          score: rule.score,
        });
      }
    }

    plans.push(sectionPlan);
  }

  const timestamp = Date.now();
  const paperId = paperRepository.create({
    title: payload.title,
    description: payload.description || '',
    durationMin: payload.durationMin,
    genType: 'random',
    genConfigJson: JSON.stringify(payload),
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  let orderNo = 0;

  plans.forEach((sectionPlan, sectionIndex) => {
    const sectionId = paperRepository.createSection({
      paperId,
      title: sectionPlan.title,
      description: '',
      orderNo: sectionIndex,
    });

    for (const item of sectionPlan.questions) {
      paperRepository.addQuestion({
        paperId,
        sectionId,
        questionId: item.questionId,
        score: item.score,
        orderNo,
      });
      orderNo += 1;
    }
  });

  paperRepository.recalcTotals(paperId);
  return getPaper(paperId, actor);
}

module.exports = {
  listPapers,
  getPaper,
  createPaper,
  updatePaper,
  deletePaper,
  addSection,
  updateSection,
  removeSection,
  addQuestion,
  updatePaperQuestion,
  removePaperQuestion,
  publishPaper,
  duplicatePaper,
  generateRandomPaper,
};
