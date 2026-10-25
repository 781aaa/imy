'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_TARGETS = [
  path.resolve(__dirname, '../src'),
  path.resolve(__dirname, '../tests'),
];

const CODE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.sql']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'data', 'coverage']);

function walk(target, files = []) {
  if (!fs.existsSync(target)) return files;

  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (CODE_EXTENSIONS.has(path.extname(target))) files.push(target);
    return files;
  }

  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walk(path.join(target, entry.name), files);
    } else if (CODE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(target, entry.name));
    }
  }

  return files;
}

function analyze(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let code = 0;
  let comments = 0;
  let blanks = 0;
  let inBlockComment = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (inBlockComment) {
      comments += 1;
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }

    if (!line) {
      blanks += 1;
      continue;
    }

    if (line.startsWith('//') || line.startsWith('--')) {
      comments += 1;
      continue;
    }

    if (line.startsWith('/*')) {
      comments += 1;
      if (!line.includes('*/')) inBlockComment = true;
      continue;
    }

    code += 1;
  }

  return {
    file,
    code,
    comments,
    blanks,
    total: lines.length,
  };
}

function main() {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args.map((item) => path.resolve(item)) : DEFAULT_TARGETS;

  const files = targets.flatMap((target) => walk(target));
  const results = files.map(analyze).sort((a, b) => b.code - a.code);

  const totals = results.reduce(
    (acc, item) => ({
      code: acc.code + item.code,
      comments: acc.comments + item.comments,
      blanks: acc.blanks + item.blanks,
      files: acc.files + 1,
    }),
    { code: 0, comments: 0, blanks: 0, files: 0 },
  );

  console.log('');
  console.log('文件'.padEnd(52) + '代码'.padStart(8) + '注释'.padStart(8) + '空行'.padStart(8));
  console.log('-'.repeat(76));

  for (const item of results) {
    const relative = path.relative(path.resolve(__dirname, '../..'), item.file);
    console.log(
      relative.padEnd(52)
      + String(item.code).padStart(8)
      + String(item.comments).padStart(8)
      + String(item.blanks).padStart(8),
    );
  }

  console.log('-'.repeat(76));
  console.log(
    `合计 ${totals.files} 个文件`.padEnd(52)
    + String(totals.code).padStart(8)
    + String(totals.comments).padStart(8)
    + String(totals.blanks).padStart(8),
  );
  console.log('');
  console.log(`纯代码行数（不含空行与注释）: ${totals.code}`);
  console.log('');

  return totals;
}

if (require.main === module) {
  main();
}

module.exports = {
  analyze,
  walk,
  main,
};
