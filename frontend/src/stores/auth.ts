import { defineStore } from 'pinia';
import { api, type User } from '../api/client';

type LoginResult = {
  token: string;
  user: User;
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') as User : null as User | null
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.role === 'ADMIN'
  },
  actions: {
    async login(username: string, password: string) {
      const result = await api.post<LoginResult>('/auth/login', { username, password });
      this.token = result.token;
      this.user = result.user;
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    },
    async register(payload: { username: string; password: string; name: string; birthday?: string }) {
      const result = await api.post<LoginResult>('/auth/register', payload);
      this.token = result.token;
      this.user = result.user;
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    },
    async refresh() {
      const user = await api.get<User>('/auth/me');
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
