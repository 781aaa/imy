# AI 学习监督接口（预留）

> **当前状态：只有接口和数据出口，没有部署、没有连接、不会向任何外部地址发请求。**
>
> 这一层是为后续接入外部 AI 学习助手预留的。系统不知道任何外部助手的存在。

---

## 设计思路

- **拉取式**：外部 AI 助手主动调用接口，系统不推送、不联网、不依赖任何消息平台。
- **只读为主**：`overview`、`records`、`events` 都是只读；唯一写操作是把事件标记为已处理。
- **事件队列**：每次交卷写一条 `supervisor_events`，外部助手可以轮询未处理事件，处理完再 ack。
- **默认关闭**：`SUPERVISOR_ENABLED=false` 时所有接口返回 503，避免误暴露。

---

## 启用方式（以后再做）

在 `.env` 中配置：

```
SUPERVISOR_ENABLED=true
SUPERVISOR_API_KEY=换成足够长的随机字符串
SUPERVISOR_NAME=AI 学习助手
```

重启服务后生效。**现在不要启用**，等真正需要对接时再开。

---

## 鉴权

所有请求必须带请求头：

```
x-supervisor-key: <SUPERVISOR_API_KEY>
```

未启用 → 503 `SUPERVISOR_DISABLED`；密钥错误 → 401 `SUPERVISOR_UNAUTHORIZED`。

建议只在局域网或经过 HTTPS 的入口暴露，不要把端口直接开到公网。

---

## 接口

### 1. 健康检查

```
GET /api/supervisor/health
```

返回是否启用、待处理事件数。返回中的 `note` 明确说明不会主动外发请求。

### 2. 学习概览

```
GET /api/supervisor/overview?student=student01
```

`student` 可以填用户名；也可以改用 `studentId=4`。两者都不传时，默认取系统中第一个学生账号。

返回：

```json
{
  "student": { "id": 1, "username": "student01", "realName": "学生1" },
  "summary": {
    "completedExams": 2,
    "averageScore": 72.5,
    "bestScore": 85,
    "passedExams": 1,
    "passRate": 0.5,
    "lastSubmittedAt": 1792930000000,
    "recent30Days": 2,
    "pendingExams": 1,
    "streakDays": 2
  },
  "daily": [{ "date": "2026-10-24", "count": 1, "totalScore": 60 }],
  "weakTopics": [
    { "name": "阅读理解", "total": 6, "correct": 2, "rate": 0.333 }
  ],
  "upcoming": [
    { "examId": 3, "title": "英语A级模拟考试（可试做）", "status": "ongoing", "canStart": true }
  ],
  "recentRecords": [
    {
      "sessionId": 1,
      "examTitle": "数据结构期中考试",
      "totalScore": 10,
      "passScore": 9,
      "passed": true,
      "submittedAt": 1792930000000
    }
  ]
}
```

`weakTopics` 只统计客观题，按知识点正确率从低到高排序，最多 5 个——可作为学习助手发现薄弱环节的数据来源。

### 3. 考试记录

```
GET /api/supervisor/records?student=student01&limit=20
```

返回最近已交卷的考试会话，含客观分、主观分、总分、及格线、是否及格、异常操作次数。

### 4. 未处理事件

```
GET /api/supervisor/events?student=student01&status=pending&limit=50
```

每次交卷写入一条 `exam_submitted` 事件，包含考试名、总分、是否含主观题、交卷方式（手动/超时自动）、异常操作次数。

### 5. 标记事件已处理

```
POST /api/supervisor/events/12/ack
```

外部助手处理完一条事件后调用，事件状态变为 `acknowledged`，不会再次出现在 `pending` 里。

---

## 接入后的典型用法（以后）

```
每 30 分钟：
  1. GET /events?status=pending
  2. 有事件 → 根据分数和异常次数生成提醒
  3. POST /events/:id/ack
  4. GET /overview → 更新学习计划、找出薄弱知识点
```

**这一步现在不做。** 没有部署任何外部服务，也没有修改任何外部系统。

---

## 安全边界

| 项目 | 现状 |
|---|---|
| 对外网络请求 | 无 |
| 写入外部服务 | 无 |
| 服务器目录/端口/进程 | 未触碰 |
| 接口默认状态 | 关闭 |
| 密钥存放 | 只在 `.env`，不进 Git |

---

## 已预留但未实现的部分

- 主观题阅卷完成后的事件（`exam_graded`）
- 学习计划 / 每日目标
- 外部助手侧的轮询与消息推送（不在本项目内）
