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
- 英语题库：英语A级、大学英语四级、专升本英语，覆盖词汇语法、阅读理解、翻译与写作
- 学生练习：按题库、知识点、难度随机抽题，提交即时判分并显示解析，错题自动进入错题本
- 学生进阶：自主发起模拟考试（交卷即时出分）、主观题自评、错题重做（答对自动移出）
- 学生学习报告：练习、模拟考试、正式考试合并看板，含趋势图与薄弱知识点
- 教师端页面：试卷管理、考试管理、班级管理、知识点管理、审计日志
- AI 学习监督接口（预留）：学习概览、考试记录、交卷事件队列，默认关闭，不对外连接

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

# 可选：写入英语题库（A级 / 四级 / 专升本）并生成一套可试做的英语A级考试
npm run db:seed:english

# 启动后端（默认 3000 端口）
npm start

# 前端开发
cd web
npm install
npm run dev
```

Windows 下可直接双击项目根目录的 `start-exam.bat`：服务未启动时会自动拉起并打开浏览器，已在运行则只打开浏览器。

## 演示账号

| 角色 | 账号 | 密码 |
|---|---|---|
| 管理员 | admin | Admin@123 |
| 教师 | teacher1 | Teach@123 |
| 学生 | student01 | Stud@123 |

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
server/tests             单元与集成测试
web/                     Vue3 前端
docs/                    设计、测试、部署、演示与开发日志
```

分层约定：`routes → controllers → services → repositories → db`，不允许跨层调用。

## 英语题库内容

| 考试 | 题量 | 知识点 |
|---|---:|---|
| 英语A级 | 27 | 词汇与语法 / 阅读理解 / 翻译与写作 |
| 大学英语四级 | 12 | 词汇与语法 / 阅读理解 / 翻译与写作 |
| 专升本英语 | 11 | 词汇与语法 / 阅读理解 / 翻译与写作 |

种子脚本会自动生成一套「英语A级模拟考试（可试做）」，登录学生账号即可作答。

## AI 学习监督接口（预留）

`docs/SUPERVISOR_API.md` 描述了预留的只读监督接口：学习概览、考试记录、交卷事件队列。

- 默认 `SUPERVISOR_ENABLED=false`，未启用时返回 503
- 启用后需要请求头 `x-supervisor-key`
- **系统不会主动向任何外部服务发请求**
- 当前没有部署或连接任何外部 AI 服务

该接口可对接任意具备 HTTP 调用能力的学习助手，用于读取学习进度、考试记录和交卷事件。

## WebView / APK

- 前端已按 WebView 兼容方式构建：hash 路由、相对路径、本地资源
- 已提供最小 Android WebView 容器：`webview/`
- 构建：`bash webview/build-apk.sh`（使用本机 Android SDK，不依赖 Gradle）
- 产物：`webview/exam-system-debug.apk`（debug 签名，versionName 1.0）
- 使用：手机与电脑同一 Wi-Fi，APK 内点右上角「设置」填写 `http://电脑IP:3000`
- 说明：APK 只是容器，页面由电脑上的 Express 提供

## 测试

```bash
npm test
```

当前共 27 个测试，覆盖判分矩阵、认证权限、题库与 CSV、组卷快照、考试交卷、练习、模拟考试、阅卷统计与审计。详见 `docs/TEST-REPORT.md`。

## 文档

- `docs/DESIGN.md`：架构、数据模型、关键设计与 API 概览
- `docs/TEST-REPORT.md`：测试清单与结果
- `docs/DEPLOY.md`：本地部署、离线验证与 WebView 兼容
- `webview/README.md`：Android WebView 容器与 APK 构建
- `docs/DEMO-SCRIPT.md`：8 分钟演示脚本
- `docs/DEVLOG.md`：开发日志
- `docs/SUPERVISOR_API.md`：AI 学习监督接口（预留）
- `docs/line-count.txt`：后端纯代码行数统计凭证
