# 在线考试与题库系统

基于 Vue3 + Node.js + SQLite 的在线考试系统，支持管理员、教师、学生三种角色。

## 功能

- 题库管理：单选、多选、判断、填空、简答五种题型，知识点标签、难度分级、CSV 导入导出
- 试卷管理：手动组卷与按策略随机组卷，大题分组，发布时冻结题目快照
- 考试管理：考试计划、时间窗、状态机、班级指派
- 在线答题：答案自动保存、断线续考、题目与选项乱序、超时自动交卷
- 防作弊：切屏、失焦、复制粘贴、退出全屏事件上报
- 判分：客观题自动判分，主观题人工评分与复核
- 统计分析：成绩单、排名、及格率、题目正确率、知识点掌握度、CSV 导出
- 系统管理：用户、班级、通知、审计日志、系统配置、定时任务

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue3 + Vite + Vue Router (hash) + Pinia + Element Plus + ECharts |
| 后端 | Node.js 24 + Express 4 |
| 数据库 | SQLite（Node 内置 `node:sqlite`，零原生依赖） |
| 鉴权 | JWT + bcryptjs |
| 校验 | Zod |

## 快速开始

```bash
# 安装依赖
npm install

# 初始化数据库并写入种子数据
npm run db:migrate
npm run db:seed

# 启动后端（默认 3000 端口）
npm start

# 前端开发
cd web
npm install
npm run dev
```

## 演示账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 管理员 | admin | Admin@123 |
| 教师 | teacher1 | Teach@123 |
| 学生 | student1 | Stud@123 |

## 目录结构

```
server/src/config        配置与常量
server/src/db            数据库连接、迁移、种子
server/src/utils         工具函数
server/src/middleware    中间件
server/src/validators    请求校验
server/src/repositories  数据访问层
server/src/services      业务逻辑层
server/src/controllers   HTTP 控制器
server/src/routes        路由
server/src/jobs          定时任务
web/                     Vue3 前端
```

分层约定：`routes → controllers → services → repositories → db`，不允许跨层调用。
