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

export default {
  auth: authApi,
  users: userApi,
  classes: classApi,
  knowledge: knowledgeApi,
  questions: questionApi,
  student: studentApi,
};
