import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ChangePasswordView from '../views/ChangePasswordView.vue';
import HomeView from '../views/HomeView.vue';
import DishesView from '../views/DishesView.vue';
import OrdersView from '../views/OrdersView.vue';
import FridgeView from '../views/FridgeView.vue';
import TasksView from '../views/TasksView.vue';
import SweetPointsView from '../views/SweetPointsView.vue';
import AdminView from '../views/AdminView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/register', component: RegisterView, meta: { public: true } },
    { path: '/change-password', component: ChangePasswordView },
    { path: '/', component: HomeView },
    { path: '/dishes', component: DishesView },
    { path: '/orders', component: OrdersView },
    { path: '/fridge', component: FridgeView },
    { path: '/tasks', component: TasksView },
    { path: '/sweet-points', component: SweetPointsView },
    { path: '/admin', component: AdminView, meta: { admin: true } }
  ]
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isLoggedIn) return '/login';
  if (auth.user?.mustChangePassword && to.path !== '/change-password' && to.path !== '/login' && to.path !== '/register') return '/change-password';
  if (to.meta.admin && !auth.isAdmin) return '/';
  return true;
});

export default router;
