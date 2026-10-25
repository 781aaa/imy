'use strict';

const questionRepository = require('../repositories/question.repository');
const knowledgeRepository = require('../repositories/knowledge.repository');
const questionService = require('./question.service');
const { createQuestionSchema } = require('../validators/question.validator');
const { parseCsv, toCsvBuffer } = require('../utils/csv');
const { parseJson } = require('../utils/serializers');
const { now } = require('../utils/datetime');
const { QUESTION_TYPES, QUESTION_TYPE_LABELS } = require('../config/constants');

const COLUMNS = [
  '题型',
  '题干',
  '选项A',
  '选项B',
  '选项C',
  '选项D',
  '选项E',
  '选项F',
  '正确答案',
  '难度',
  '分值',
  '解析',
  '知识点',
];

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const TYPE_FROM_LABEL = {
  单选: QUESTION_TYPES.SINGLE,
  单选题: QUESTION_TYPES.SINGLE,
  single: QUESTION_TYPES.SINGLE,
  多选: QUESTION_TYPES.MULTIPLE,
  多选题: QUESTION_TYPES.MULTIPLE,
  multiple: QUESTION_TYPES.MULTIPLE,
  判断: QUESTION_TYPES.TRUE_FALSE,
  判断题: QUESTION_TYPES.TRUE_FALSE,
  true_false: QUESTION_TYPES.TRUE_FALSE,
  填空: QUESTION_TYPES.FILL,
  填空题: QUESTION_TYPES.FILL,
  fill: QUESTION_TYPES.FILL,
  简答: QUESTION_TYPES.SHORT,
  简答题: QUESTION_TYPES.SHORT,
  short: QUESTION_TYPES.SHORT,
};

const LABEL_FROM_TYPE = {
  [QUESTION_TYPES.SINGLE]: '单选',
  [QUESTION_TYPES.MULTIPLE]: '多选',
  [QUESTION_TYPES.TRUE_FALSE]: '判断',
  [QUESTION_TYPES.FILL]: '填空',
  [QUESTION_TYPES.SHORT]: '简答',
};

function pick(row, ...names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null) {
      const value = String(row[name]).trim();
      if (value !== '') return value;
    }
  }
  return '';
}

function parseNumber(value, fallback) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseCorrectLabels(raw) {
  return String(raw || '')
    .split(/[,，;；\s、]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function buildOptionsFromRow(row, correctLabels) {
  const options = [];
  for (const letter of OPTION_LETTERS) {
    const content = pick(row, `选项${letter}`, `选项 ${letter}`, `${letter}`);
    if (!content) continue;
    options.push({
      label: letter,
      content,
      isCorrect: correctLabels.includes(letter),
    });
  }
  return options;
}

function resolveKnowledgePointId(name, actor, cache, warnings) {
  const key = name.trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);

  const existing = knowledgeRepository.findByName(key);
  if (existing) {
    cache.set(key, Number(existing.id));
    return Number(existing.id);
  }

  const timestamp = now();
  const id = knowledgeRepository.create({
    name: key,
    parentId: null,
    description: 'CSV 导入时自动创建',
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  warnings.push(`第 ${warnings.length + 1} 个新知识点「${key}」已自动创建`);
  cache.set(key, id);
  return id;
}

function buildPayloadFromRow(row, actor, kpCache, warnings) {
  const typeLabel = pick(row, '题型', '类型', 'type');
  const type = TYPE_FROM_LABEL[typeLabel.toLowerCase()] || TYPE_FROM_LABEL[typeLabel];

  const correctRaw = pick(row, '正确答案', '答案', 'answer');
  const correctLabels = parseCorrectLabels(correctRaw);

  const payload = {
    type,
    stem: pick(row, '题干', '题目', 'stem'),
    difficulty: parseNumber(pick(row, '难度', 'difficulty'), 3),
    defaultScore: parseNumber(pick(row, '分值', '分数', 'score'), 5),
    analysis: pick(row, '解析', 'analysis'),
    status: 'published',
    knowledgePointIds: [],
  };

  if (type === QUESTION_TYPES.SINGLE || type === QUESTION_TYPES.MULTIPLE) {
    payload.options = buildOptionsFromRow(row, correctLabels);

    for (const label of correctLabels) {
      if (!payload.options.some((option) => option.label === label)) {
        throw new Error(`正确答案 ${label} 在选项 A-F 中不存在`);
      }
    }
  } else if (type === QUESTION_TYPES.TRUE_FALSE) {
    payload.answer = correctRaw;
  } else if (type === QUESTION_TYPES.FILL) {
    payload.answer = correctRaw
      .split('&&')
      .map((item) => item.trim())
      .filter(Boolean);
  } else if (type === QUESTION_TYPES.SHORT) {
    payload.answer = correctRaw;
  }

  const knowledgeRaw = pick(row, '知识点', '标签', 'knowledge');
  if (knowledgeRaw) {
    const names = knowledgeRaw
      .split(/[|、,，;；]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    payload.knowledgePointIds = names
      .map((name) => resolveKnowledgePointId(name, actor, kpCache, warnings))
      .filter((id) => id !== null);
  }

  return payload;
}

function importCsv(text, actor) {
  const rows = parseCsv(text);

  if (rows.length > 0 && !Object.prototype.hasOwnProperty.call(rows[0], '题干')) {
    throw new Error('CSV 表头不正确，请先下载模板并保留「题型、题干、正确答案」等列名');
  }

  const result = {
    total: rows.length,
    created: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  const kpCache = new Map();

  rows.forEach((row, index) => {
    const lineNumber = index + 2;

    try {
      const payload = buildPayloadFromRow(row, actor, kpCache, result.warnings);
      const parsed = createQuestionSchema.safeParse(payload);

      if (!parsed.success) {
        result.failed += 1;
        result.errors.push({
          row: lineNumber,
          message: parsed.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('；'),
        });
        return;
      }

      questionService.createQuestion(parsed.data, actor);
      result.created += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push({ row: lineNumber, message: error.message });
    }
  });

  if (result.errors.length > 30) {
    result.errors = result.errors.slice(0, 30);
    result.errors.push({
      row: 0,
      message: `还有 ${result.failed - 30} 条错误未显示`,
    });
  }

  return result;
}

function formatAnswer(row, options) {
  const answer = parseJson(row.answer_json, null);

  if (row.type === QUESTION_TYPES.MULTIPLE) {
    return Array.isArray(answer) ? answer.join(',') : '';
  }
  if (row.type === QUESTION_TYPES.FILL) {
    return Array.isArray(answer) ? answer.join('&&') : String(answer ?? '');
  }
  if (row.type === QUESTION_TYPES.TRUE_FALSE) {
    return String(answer ?? '');
  }
  if (row.type === QUESTION_TYPES.SINGLE) {
    return String(answer ?? '');
  }
  if (row.type === QUESTION_TYPES.SHORT) {
    return String(answer ?? '');
  }

  return String(answer ?? '');
}

function exportCsv(query) {
  const rows = questionRepository.listForExport({
    type: query.type,
    difficulty: query.difficulty,
    status: query.status,
    keyword: query.keyword,
    knowledgePointId: query.knowledgePointId,
    createdBy: query.createdBy,
  });

  const options = questionRepository.findOptionsByQuestionIds(
    rows.map((row) => Number(row.id)),
  );

  const optionsByQuestion = new Map();
  for (const option of options) {
    const key = Number(option.question_id);
    if (!optionsByQuestion.has(key)) optionsByQuestion.set(key, []);
    optionsByQuestion.get(key).push(option);
  }

  const data = rows.map((row) => {
    const rowOptions = optionsByQuestion.get(Number(row.id)) || [];
    const optionMap = {};
    for (const option of rowOptions) {
      optionMap[option.label] = option.content;
    }

    const item = {
      题型: LABEL_FROM_TYPE[row.type] || QUESTION_TYPE_LABELS[row.type] || row.type,
      题干: row.stem,
      正确答案: formatAnswer(row, rowOptions),
      难度: row.difficulty,
      分值: row.default_score,
      解析: row.analysis,
      知识点: row.knowledge_names || '',
    };

    for (const letter of OPTION_LETTERS) {
      item[`选项${letter}`] = optionMap[letter] || '';
    }

    return item;
  });

  return toCsvBuffer(data, COLUMNS);
}

function buildTemplateCsv() {
  const data = [
    {
      题型: '单选',
      题干: '下列哪种数据结构遵循先进先出原则？',
      选项A: '栈',
      选项B: '队列',
      选项C: '二叉树',
      选项D: '图',
      选项E: '',
      选项F: '',
      正确答案: 'B',
      难度: 1,
      分值: 5,
      解析: '队列先进先出。',
      知识点: '数据结构',
    },
    {
      题型: '多选',
      题干: '下列属于关系型数据库的是？',
      选项A: 'MySQL',
      选项B: 'Redis',
      选项C: 'PostgreSQL',
      选项D: 'MongoDB',
      选项E: '',
      选项F: '',
      正确答案: 'A,C',
      难度: 2,
      分值: 4,
      解析: 'MySQL 与 PostgreSQL 是关系型数据库。',
      知识点: '数据库',
    },
    {
      题型: '填空',
      题干: '一个字节等于 ______ 位。',
      选项A: '',
      选项B: '',
      选项C: '',
      选项D: '',
      选项E: '',
      选项F: '',
      正确答案: '8|八',
      难度: 1,
      分值: 4,
      解析: '1 Byte = 8 bit。',
      知识点: '计算机基础',
    },
  ];

  return toCsvBuffer(data, COLUMNS);
}

module.exports = {
  COLUMNS,
  importCsv,
  exportCsv,
  buildTemplateCsv,
};
