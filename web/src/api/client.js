import axios from 'axios';
import { ElMessage } from 'element-plus';

export const TOKEN_KEY = 'exam_token';

const client = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && body.success === false) {
      return Promise.reject(new Error(body.message || '请求失败'));
    }
    return body ? body.data : null;
  },
  (error) => {
    const status = error.response ? error.response.status : 0;
    const body = error.response ? error.response.data : null;
    const message = (body && body.message) || error.message || '网络请求失败';

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.hash.startsWith('#/login')) {
        window.location.hash = '#/login';
      }
    }

    if (!error.config || !error.config.silent) {
      ElMessage.error(message);
    }

    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.code = body ? body.code : '';
    wrapped.details = body ? body.details : null;
    return Promise.reject(wrapped);
  },
);

export async function downloadFile(path, filename) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let message = '下载失败';
    try {
      const body = await response.json();
      if (body && body.message) message = body.message;
    } catch (error) {
      // 非 JSON 响应保持默认提示
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default client;
