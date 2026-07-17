import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { showFailToast } from 'vant';

type DataApi = Omit<AxiosInstance, 'get' | 'post' | 'put' | 'delete'> & {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>;
};

export const api = axios.create({
  baseURL: '/api'
}) as DataApi;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || '请求失败';
    showFailToast(message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export type Role = 'ADMIN' | 'USER';
export type User = {
  id: number;
  username: string;
  name: string;
  birthday?: string;
  avatar?: string;
  role: Role;
  sweetPoints: number;
  mustChangePassword: boolean;
};

export type DictionaryItem = {
  id: number;
  name: string;
};

export type Dish = {
  id: number;
  name: string;
  category?: DictionaryItem;
  categoryId?: number;
  price: number;
  isAvailable: boolean;
  image?: string;
  description?: string;
  ingredients: DictionaryItem[];
  tastes: DictionaryItem[];
};

export type MealOrder = {
  id: number;
  user: User;
  dish: Dish;
  priceSnapshot: number;
  mealDate: string;
  createdAt: string;
};

export type FridgeItem = {
  id: number;
  ingredientId: number;
  ingredient: DictionaryItem;
  quantity: number;
  unit: string;
  updatedBy: User;
  updatedAt: string;
};

export type TaskItem = {
  id: number;
  title: string;
  content?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  creator: User;
  assignee?: User;
  assigneeId?: number;
  createdAt: string;
  finishedAt?: string;
};

export type SweetPointLog = {
  id: number;
  type: 'SET' | 'REWARD' | 'ORDER_SPEND' | 'ORDER_REFUND' | 'ORDER_ADJUST';
  amount: number;
  balance: number;
  reason?: string;
  createdAt: string;
};
