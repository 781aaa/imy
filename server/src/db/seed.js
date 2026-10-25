'use strict';

const { getDb, closeDb, transaction, lastInsertId } = require('./connection');
const { migrate } = require('./migrate');
const { hashPassword } = require('../utils/password');
const { now } = require('../utils/datetime');
const { ROLES, QUESTION_TYPES } = require('../config/constants');

const USERS = [
  {
    username: 'admin',
    password: 'Admin@123',
    realName: '系统管理员',
    role: ROLES.ADMIN,
    email: 'admin@example.com',
  },
  {
    username: 'teacher1',
    password: 'Teach@123',
    realName: '王老师',
    role: ROLES.TEACHER,
    email: 'teacher1@example.com',
  },
  {
    username: 'teacher2',
    password: 'Teach@123',
    realName: '李老师',
    role: ROLES.TEACHER,
    email: 'teacher2@example.com',
  },
  ...Array.from({ length: 8 }, (_, index) => ({
    username: `student0${index + 1}`,
    password: 'Stud@123',
    realName: `学生${index + 1}`,
    role: ROLES.STUDENT,
    email: `student0${index + 1}@example.com`,
  })),
];

const CLASSES = [
  {
    name: '计算机 2401 班',
    grade: '2024',
    teacher: 'teacher1',
    students: ['student01', 'student02', 'student03', 'student04'],
  },
  {
    name: '软件工程 2402 班',
    grade: '2024',
    teacher: 'teacher2',
    students: ['student05', 'student06', 'student07', 'student08'],
  },
];

const KNOWLEDGE_POINTS = [
  { name: '计算机基础', parent: null, description: '计算机导论与基础知识' },
  { name: '数据结构', parent: '计算机基础', description: '线性表、树、图与排序算法' },
  { name: '操作系统', parent: '计算机基础', description: '进程、内存与文件系统' },
  { name: '计算机网络', parent: '计算机基础', description: 'TCP/IP 与 HTTP 协议' },
  { name: '数据库', parent: '计算机基础', description: '关系模型与 SQL' },
];

const QUESTIONS = [
  {
    type: QUESTION_TYPES.SINGLE,
    stem: '下列哪种数据结构遵循先进先出（FIFO）原则？',
    options: [
      { label: 'A', content: '栈' },
      { label: 'B', content: '队列', correct: true },
      { label: 'C', content: '二叉树' },
      { label: 'D', content: '图' },
    ],
    answer: 'B',
    analysis: '队列只在队尾入队、队头出队，先进先出；栈是后进先出。',
    difficulty: 1,
    score: 5,
    knowledge: '数据结构',
  },
  {
    type: QUESTION_TYPES.SINGLE,
    stem: 'HTTP 状态码 404 表示什么？',
    options: [
      { label: 'A', content: '请求成功' },
      { label: 'B', content: '资源未找到', correct: true },
      { label: 'C', content: '服务器内部错误' },
      { label: 'D', content: '永久重定向' },
    ],
    answer: 'B',
    analysis: '4xx 表示客户端错误，404 表示服务器找不到请求的资源。',
    difficulty: 1,
    score: 5,
    knowledge: '计算机网络',
  },
  {
    type: QUESTION_TYPES.MULTIPLE,
    stem: '下列属于关系型数据库的是？',
    options: [
      { label: 'A', content: 'MySQL', correct: true },
      { label: 'B', content: 'Redis' },
      { label: 'C', content: 'PostgreSQL', correct: true },
      { label: 'D', content: 'MongoDB' },
    ],
    answer: ['A', 'C'],
    analysis: 'MySQL 与 PostgreSQL 是关系型数据库；Redis 是键值存储，MongoDB 是文档数据库。',
    difficulty: 2,
    score: 4,
    knowledge: '数据库',
  },
  {
    type: QUESTION_TYPES.TRUE_FALSE,
    stem: '二叉搜索树的中序遍历结果一定是升序序列。',
    answer: 'true',
    analysis: '中序遍历按左子树、根、右子树的顺序访问，正好得到升序序列。',
    difficulty: 2,
    score: 4,
    knowledge: '数据结构',
  },
  {
    type: QUESTION_TYPES.FILL,
    stem: 'TCP 三次握手的第一步，客户端发送的是 ______ 报文。',
    answer: ['SYN|syn|同步'],
    analysis: '第一次握手客户端发送 SYN 报文进入 SYN_SENT 状态。',
    difficulty: 3,
    score: 4,
    knowledge: '计算机网络',
  },
  {
    type: QUESTION_TYPES.SHORT,
    stem: '简述进程与线程的区别。',
    answer:
      '进程是操作系统资源分配的基本单位，拥有独立的地址空间；线程是 CPU 调度的基本单位，同一进程内的多个线程共享地址空间和资源。',
    analysis: '评分要点：资源分配单位、调度单位、地址空间是否共享、切换开销。',
    difficulty: 3,
    score: 10,
    knowledge: '操作系统',
  },
  {
    type: QUESTION_TYPES.SINGLE,
    stem: '下列排序算法中，平均时间复杂度为 O(n log n) 的是？',
    options: [
      { label: 'A', content: '冒泡排序' },
      { label: 'B', content: '快速排序', correct: true },
      { label: 'C', content: '选择排序' },
      { label: 'D', content: '插入排序' },
    ],
    answer: 'B',
    analysis: '快速排序平均时间复杂度为 O(n log n)，最坏为 O(n²)。',
    difficulty: 2,
    score: 5,
    knowledge: '数据结构',
  },
  {
    type: QUESTION_TYPES.MULTIPLE,
    stem: '下列属于 HTTP 请求方法的是？',
    options: [
      { label: 'A', content: 'GET', correct: true },
      { label: 'B', content: 'POST', correct: true },
      { label: 'C', content: 'PUT', correct: true },
      { label: 'D', content: 'SEND' },
    ],
    answer: ['A', 'B', 'C'],
    analysis: '常见的 HTTP 方法有 GET、POST、PUT、DELETE、PATCH 等，SEND 不是。',
    difficulty: 1,
    score: 4,
    knowledge: '计算机网络',
  },
  {
    type: QUESTION_TYPES.TRUE_FALSE,
    stem: '在 SQL 中，DELETE 语句可以删除表结构。',
    answer: 'false',
    analysis: 'DELETE 只删除数据行，删除表结构应使用 DROP TABLE。',
    difficulty: 1,
    score: 4,
    knowledge: '数据库',
  },
  {
    type: QUESTION_TYPES.FILL,
    stem: '一个字节（Byte）等于 ______ 位（bit）。',
    answer: ['8|八'],
    analysis: '1 Byte = 8 bit，这是计算机存储的基本换算关系。',
    difficulty: 1,
    score: 4,
    knowledge: '计算机基础',
  },
];

const SYSTEM_CONFIGS = [
  { key: 'site_name', value: '在线考试系统', description: '站点名称' },
  { key: 'allow_self_register', value: false, description: '是否允许学生自助注册' },
  { key: 'exam_default_pass_score', value: 60, description: '默认及格分' },
  { key: 'anti_cheat_enabled', value: true, description: '是否启用防作弊事件采集' },
  { key: 'auto_submit_grace_seconds', value: 30, description: '超时后允许提交的宽限秒数' },
];

function insertUsers(db, timestamp) {
  const statement = db.prepare(`
    INSERT INTO users (
      username, password_hash, real_name, role, email, phone,
      status, token_version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)
  `);

  const idByUsername = new Map();

  for (const user of USERS) {
    const result = statement.run(
      user.username,
      hashPassword(user.password),
      user.realName,
      user.role,
      user.email || null,
      user.phone || null,
      timestamp,
      timestamp,
    );
    idByUsername.set(user.username, lastInsertId(result));
  }

  return idByUsername;
}

function insertClasses(db, timestamp, userIds) {
  const classStatement = db.prepare(`
    INSERT INTO classes (name, grade, teacher_id, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
  `);
  const memberStatement = db.prepare(`
    INSERT INTO class_students (class_id, student_id, joined_at)
    VALUES (?, ?, ?)
  `);

  const idByName = new Map();

  for (const item of CLASSES) {
    const result = classStatement.run(
      item.name,
      item.grade,
      userIds.get(item.teacher) || null,
      timestamp,
      timestamp,
    );
    const classId = lastInsertId(result);
    idByName.set(item.name, classId);

    for (const username of item.students) {
      const studentId = userIds.get(username);
      if (studentId) {
        memberStatement.run(classId, studentId, timestamp);
      }
    }
  }

  return idByName;
}

function insertKnowledgePoints(db, timestamp, userIds) {
  const statement = db.prepare(`
    INSERT INTO knowledge_points (
      name, parent_id, description, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const idByName = new Map();
  const adminId = userIds.get('admin') || null;

  for (const point of KNOWLEDGE_POINTS.filter((item) => item.parent === null)) {
    const result = statement.run(
      point.name,
      null,
      point.description || '',
      adminId,
      timestamp,
      timestamp,
    );
    idByName.set(point.name, lastInsertId(result));
  }

  for (const point of KNOWLEDGE_POINTS.filter((item) => item.parent !== null)) {
    const parentId = idByName.get(point.parent) || null;
    const result = statement.run(
      point.name,
      parentId,
      point.description || '',
      adminId,
      timestamp,
      timestamp,
    );
    idByName.set(point.name, lastInsertId(result));
  }

  return idByName;
}

function insertQuestions(db, timestamp, userIds, knowledgeIds) {
  const questionStatement = db.prepare(`
    INSERT INTO questions (
      type, stem, answer_json, analysis, difficulty, default_score,
      status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `);
  const optionStatement = db.prepare(`
    INSERT INTO question_options (question_id, label, content, is_correct, order_no)
    VALUES (?, ?, ?, ?, ?)
  `);
  const linkStatement = db.prepare(`
    INSERT INTO question_knowledge_points (question_id, knowledge_point_id)
    VALUES (?, ?)
  `);

  const teacherId = userIds.get('teacher1') || null;
  let count = 0;

  for (const question of QUESTIONS) {
    const result = questionStatement.run(
      question.type,
      question.stem,
      JSON.stringify(question.answer),
      question.analysis || '',
      question.difficulty,
      question.score,
      teacherId,
      timestamp,
      timestamp,
    );
    const questionId = lastInsertId(result);

    if (Array.isArray(question.options)) {
      question.options.forEach((option, index) => {
        optionStatement.run(
          questionId,
          option.label,
          option.content,
          option.correct ? 1 : 0,
          index,
        );
      });
    }

    const knowledgeId = knowledgeIds.get(question.knowledge);
    if (knowledgeId) {
      linkStatement.run(questionId, knowledgeId);
    }

    count += 1;
  }

  return count;
}

function insertSystemConfigs(db, timestamp, userIds) {
  const statement = db.prepare(`
    INSERT INTO system_configs (key, value_json, description, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(key) DO NOTHING
  `);

  const adminId = userIds.get('admin') || null;

  for (const item of SYSTEM_CONFIGS) {
    statement.run(item.key, JSON.stringify(item.value), item.description, adminId, timestamp);
  }
}

function seed(options = {}) {
  migrate({ silent: true });

  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  const existingCount = Number(existing.count);

  if (existingCount > 0 && !options.force) {
    return {
      skipped: true,
      reason: `users 表已有 ${existingCount} 条数据，跳过种子数据写入。如需重置请删除 data/exam.db 后重试。`,
    };
  }

  const result = transaction(() => {
    const timestamp = now();
    const userIds = insertUsers(db, timestamp);
    const classIds = insertClasses(db, timestamp, userIds);
    const knowledgeIds = insertKnowledgePoints(db, timestamp, userIds);
    const questionCount = insertQuestions(db, timestamp, userIds, knowledgeIds);
    insertSystemConfigs(db, timestamp, userIds);

    return {
      users: userIds.size,
      classes: classIds.size,
      knowledgePoints: knowledgeIds.size,
      questions: questionCount,
    };
  });

  return { skipped: false, ...result };
}

if (require.main === module) {
  try {
    const result = seed();
    if (result.skipped) {
      console.log(`[seed] ${result.reason}`);
    } else {
      console.log('[seed] 完成:', JSON.stringify(result));
      console.log('[seed] 演示账号: admin/Admin@123, teacher1/Teach@123, student01/Stud@123');
    }
  } catch (error) {
    console.error('[seed] 失败:', error.message);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
}

module.exports = {
  seed,
  USERS,
  CLASSES,
  QUESTIONS,
  KNOWLEDGE_POINTS,
  SYSTEM_CONFIGS,
};
