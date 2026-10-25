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

export default {
  auth: authApi,
  users: userApi,
  classes: classApi,
  knowledge: knowledgeApi,
};
