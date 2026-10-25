import { defineStore } from 'pinia';
import api from '../api';
import { TOKEN_KEY } from '../api/client';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    role: (state) => (state.user ? state.user.role : ''),
    displayName: (state) =>
      state.user ? state.user.realName || state.user.username : '',
    roleLabel: (state) => {
      const labels = { admin: '管理员', teacher: '教师', student: '学生' };
      return labels[state.user ? state.user.role : ''] || '';
    },
  },

  actions: {
    async login(payload) {
      const data = await api.auth.login(payload);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    },

    async ensureUser() {
      if (!this.token) return null;
      if (this.user) return this.user;

      try {
        this.user = await api.auth.me();
        return this.user;
      } catch (error) {
        this.clear();
        return null;
      }
    },

    async logout() {
      try {
        await api.auth.logout();
      } catch (error) {
        // 服务端退出失败也要清理本地状态
      }
      this.clear();
    },

    clear() {
      this.token = '';
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
    },
  },
});
