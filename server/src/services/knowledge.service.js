'use strict';

const knowledgeRepository = require('../repositories/knowledge.repository');
const { toKnowledgePoint } = require('../utils/serializers');
const { ConflictError, NotFoundError } = require('../utils/errors');

function buildTree(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.id), toKnowledgePoint(row, []));
  }

  const roots = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function listTree() {
  const rows = knowledgeRepository.listAll();
  return buildTree(rows);
}

function listFlat() {
  return knowledgeRepository.listAll().map((row) => toKnowledgePoint(row));
}

function getById(id) {
  const row = knowledgeRepository.findById(id);
  if (!row) {
    throw new NotFoundError('知识点不存在');
  }
  return toKnowledgePoint(row);
}

function create(payload, actor) {
  const parentId = payload.parentId ?? null;

  if (parentId !== null) {
    const parent = knowledgeRepository.findById(parentId);
    if (!parent) {
      throw new NotFoundError('父级知识点不存在');
    }
  }

  const duplicated = knowledgeRepository.findByNameAndParent(payload.name, parentId);
  if (duplicated) {
    throw new ConflictError('同级下已存在同名知识点');
  }

  const timestamp = Date.now();
  const id = knowledgeRepository.create({
    name: payload.name,
    parentId,
    description: payload.description || '',
    createdBy: actor.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return getById(id);
}

function update(id, payload) {
  const existing = knowledgeRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('知识点不存在');
  }

  const nextParentId = payload.parentId === undefined
    ? existing.parent_id
    : payload.parentId;

  if (nextParentId !== null && nextParentId !== undefined) {
    if (Number(nextParentId) === Number(id)) {
      throw new ConflictError('知识点不能作为自己的父级');
    }
    if (knowledgeRepository.wouldCreateCycle(id, nextParentId)) {
      throw new ConflictError('不能把子节点设置为父级，会形成循环');
    }
    const parent = knowledgeRepository.findById(nextParentId);
    if (!parent) {
      throw new NotFoundError('父级知识点不存在');
    }
  }

  const nextName = payload.name === undefined ? existing.name : payload.name;
  const duplicated = knowledgeRepository.findByNameAndParent(nextName, nextParentId);
  if (duplicated && Number(duplicated.id) !== Number(id)) {
    throw new ConflictError('同级下已存在同名知识点');
  }

  knowledgeRepository.update(id, {
    name: payload.name,
    parentId: payload.parentId,
    description: payload.description,
    updatedAt: Date.now(),
  });

  return getById(id);
}

function remove(id) {
  const existing = knowledgeRepository.findById(id);
  if (!existing) {
    throw new NotFoundError('知识点不存在');
  }

  const children = knowledgeRepository.countChildren(id);
  if (children > 0) {
    throw new ConflictError(`该知识点下还有 ${children} 个子知识点，请先删除子级`);
  }

  const questions = knowledgeRepository.countQuestions(id);
  if (questions > 0) {
    throw new ConflictError(`该知识点已关联 ${questions} 道题目，无法删除`);
  }

  knowledgeRepository.remove(id);
  return { message: '知识点已删除' };
}

module.exports = {
  listTree,
  listFlat,
  getById,
  create,
  update,
  remove,
};
