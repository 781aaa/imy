import client from './client';

export const authApi = {
  login: (payload) => client.post('/auth/login', payload),
  me: () => client.get('/auth/me', { silent: true }),
  logout: () => client.post('/auth/logout', null, { silent: true }),
  changePassword: (payload) => client.put('/auth/password', payload),
};

export const userApi = {
  list: (params) => client.get('/users', { params }),
  students: () => client.get('/users/students'),
  statistics: () => client.get('/users/statistics'),
  detail: (id) => client.get(`/users/${id}`),
  create: (payload) => client.post('/users', payload),
  update: (id, payload) => client.patch(`/users/${id}`, payload),
  setStatus: (id, status) => client.patch(`/users/${id}/status`, { status }),
  resetPassword: (id, newPassword) =>
    client.patch(`/users/${id}/password`, { newPassword }),
};

export const classApi = {
  list: (params) => client.get('/classes', { params }),
  detail: (id) => client.get(`/classes/${id}`),
  create: (payload) => client.post('/classes', payload),
  update: (id, payload) => client.patch(`/classes/${id}`, payload),
  remove: (id) => client.delete(`/classes/${id}`),
  members: (id) => client.get(`/classes/${id}/students`),
  addStudents: (id, studentIds) =>
    client.post(`/classes/${id}/students`, { studentIds }),
  removeStudent: (id, studentId) =>
    client.delete(`/classes/${id}/students/${studentId}`),
};

export const knowledgeApi = {
  tree: () => client.get('/knowledge-points'),
  flat: () => client.get('/knowledge-points/flat'),
  create: (payload) => client.post('/knowledge-points', payload),
  update: (id, payload) => client.patch(`/knowledge-points/${id}`, payload),
  remove: (id) => client.delete(`/knowledge-points/${id}`),
};

export const questionApi = {
  list: (params) => client.get('/questions', { params }),
  detail: (id) => client.get(`/questions/${id}`),
  create: (payload) => client.post('/questions', payload),
  update: (id, payload) => client.patch(`/questions/${id}`, payload),
  remove: (id) => client.delete(`/questions/${id}`),
  publish: (id) => client.post(`/questions/${id}/publish`),
  archive: (id) => client.post(`/questions/${id}/archive`),
  statistics: () => client.get('/questions/statistics'),
  importCsv: (formData) => client.post('/questions/import', formData),
  exportCsv: (params) => client.get('/questions/export', { params }),
};

export const studentApi = {
  listExams: () => client.get('/student/exams'),
  start: (examId) => client.post(`/student/exams/${examId}/start`),
  paper: (sessionId) => client.get(`/student/sessions/${sessionId}/paper`),
  saveAnswers: (sessionId, answers) =>
    client.patch(`/student/sessions/${sessionId}/answers`, { answers }),
  reportEvent: (sessionId, payload) =>
    client.post(`/student/sessions/${sessionId}/events`, payload, { silent: true }),
  submit: (sessionId) =>
    client.post(`/student/sessions/${sessionId}/submit`),
  result: (sessionId) =>
    client.get(`/student/sessions/${sessionId}/result`),
};

export const paperApi = {
  list: (params) => client.get('/papers', { params }),
  detail: (id) => client.get(`/papers/${id}`),
  create: (payload) => client.post('/papers', payload),
  update: (id, payload) => client.patch(`/papers/${id}`, payload),
  remove: (id) => client.delete(`/papers/${id}`),
  addSection: (id, payload) => client.post(`/papers/${id}/sections`, payload),
  updateSection: (id, sectionId, payload) =>
    client.patch(`/papers/${id}/sections/${sectionId}`, payload),
  removeSection: (id, sectionId) =>
    client.delete(`/papers/${id}/sections/${sectionId}`),
  addQuestion: (id, payload) =>
    client.post(`/papers/${id}/questions`, payload),
  updateQuestion: (id, pqId, payload) =>
    client.patch(`/papers/${id}/questions/${pqId}`, payload),
  removeQuestion: (id, pqId) =>
    client.delete(`/papers/${id}/questions/${pqId}`),
  publish: (id) => client.post(`/papers/${id}/publish`),
  duplicate: (id) => client.post(`/papers/${id}/duplicate`),
  random: (payload) => client.post('/papers/random', payload),
};

export const examApi = {
  list: (params) => client.get('/exams', { params }),
  detail: (id) => client.get(`/exams/${id}`),
  create: (payload) => client.post('/exams', payload),
  update: (id, payload) => client.patch(`/exams/${id}`, payload),
  remove: (id) => client.delete(`/exams/${id}`),
  schedule: (id) => client.post(`/exams/${id}/schedule`),
  assignClasses: (id, classIds) =>
    client.post(`/exams/${id}/classes`, { classIds }),
  removeClass: (id, classId) =>
    client.delete(`/exams/${id}/classes/${classId}`),
  end: (id) => client.post(`/exams/${id}/end`),
  publishResults: (id) => client.post(`/exams/${id}/publish-results`),
};

export const auditApi = {
  list: (params) => client.get('/audit-logs', { params }),
};

export const gradingApi = {
  listExams: () => client.get('/grading/exams'),
  listSessions: (examId, params) =>
    client.get(`/grading/exams/${examId}/sessions`, { params }),
  sessionDetail: (sessionId) =>
    client.get(`/grading/sessions/${sessionId}`),
  gradeAnswer: (answerId, payload) =>
    client.patch(`/grading/answers/${answerId}`, payload),
  finalize: (sessionId) =>
    client.post(`/grading/sessions/${sessionId}/finalize`),
};

export const statsApi = {
  overview: (examId) => client.get(`/stats/exams/${examId}/overview`),
  scoreSheet: (examId) => client.get(`/stats/exams/${examId}/score-sheet`),
  ranking: (examId) => client.get(`/stats/exams/${examId}/ranking`),
  questionAnalysis: (examId) =>
    client.get(`/stats/exams/${examId}/question-analysis`),
  knowledgeMastery: (examId) =>
    client.get(`/stats/exams/${examId}/knowledge-mastery`),
};

export const practiceApi = {
  levels: () => client.get('/practice/levels'),
  questions: (params) => client.get('/practice/questions', { params }),
  submit: (payload) => client.post('/practice/answers', payload),
  selfAssess: (recordId, mastered) =>
    client.patch(`/practice/records/${recordId}/self-assess`, { mastered }),
  stats: () => client.get('/practice/stats'),
  wrongQuestions: (params) =>
    client.get('/practice/wrong-questions', { params }),
  removeWrong: (questionId) =>
    client.delete(`/practice/wrong-questions/${questionId}`),
};

export const mockApi = {
  create: (payload) => client.post('/mock-exams', payload),
  list: () => client.get('/mock-exams'),
  detail: (id) => client.get(`/mock-exams/${id}`),
  saveAnswers: (id, answers) =>
    client.patch(`/mock-exams/${id}/answers`, { answers }),
  submit: (id) => client.post(`/mock-exams/${id}/submit`),
};

export default {
  auth: authApi,
  users: userApi,
  classes: classApi,
  knowledge: knowledgeApi,
  questions: questionApi,
  student: studentApi,
  papers: paperApi,
  exams: examApi,
  grading: gradingApi,
  stats: statsApi,
  practice: practiceApi,
  mock: mockApi,
  audit: auditApi,
};
