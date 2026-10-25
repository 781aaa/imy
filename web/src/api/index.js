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

export const examApi = {
  list: (params) => client.get('/exams', { params }),
  detail: (id) => client.get(`/exams/${id}`),
  end: (id) => client.post(`/exams/${id}/end`),
  publishResults: (id) => client.post(`/exams/${id}/publish-results`),
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
  stats: () => client.get('/practice/stats'),
  wrongQuestions: (params) =>
    client.get('/practice/wrong-questions', { params }),
  removeWrong: (questionId) =>
    client.delete(`/practice/wrong-questions/${questionId}`),
};

export default {
  auth: authApi,
  users: userApi,
  classes: classApi,
  knowledge: knowledgeApi,
  questions: questionApi,
  student: studentApi,
  exams: examApi,
  grading: gradingApi,
  stats: statsApi,
  practice: practiceApi,
};
