<template>
  <main class="page home-page">
    <section class="home-hero">
      <div>
        <p>欢迎回来，{{ auth.user?.name }}</p>
        <h1>今天吃点什么</h1>
      </div>
      <van-button round size="small" icon="revoke" @click="logout">退出</van-button>
    </section>

    <section class="metric-grid">
      <div>
        <strong>{{ dashboard.todayOrders.length }}</strong>
        <span>今日点菜</span>
      </div>
      <div>
        <strong>{{ dashboard.fridge.length }}</strong>
        <span>冰箱食材</span>
      </div>
      <div class="metric-link" @click="router.push('/sweet-points')">
        <strong>{{ auth.user?.sweetPoints || 0 }}</strong>
        <span>甜蜜点</span>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">今日菜单</h2>
      <div v-if="dashboard.todayOrders?.length" class="home-list">
        <article v-for="order in dashboard.todayOrders" :key="order.id" class="order-chip">
          <div>
            <strong>{{ order.dish.name }}</strong>
            <span>{{ order.user.name }} · {{ formatTime(order.createdAt) }}</span>
          </div>
          <b>{{ order.priceSnapshot }}</b>
        </article>
      </div>
      <div v-else class="soft-empty">今天还没人点菜，去菜品页加几道</div>
    </section>

    <section class="section">
      <h2 class="section-title">推荐菜品</h2>
      <div class="recommend-row">
        <article v-for="dish in dashboard.dishes" :key="dish.id" class="recommend-card">
          <img :src="dish.image || fallbackImage" :alt="dish.name">
          <strong>{{ dish.name }}</strong>
          <span>{{ dish.price }} 甜蜜点</span>
          <van-button size="mini" round type="primary" @click="orderDish(dish.id)">点菜</van-button>
        </article>
      </div>
    </section>

    <section class="section split-section">
      <div>
        <h2 class="section-title">冰箱摘要</h2>
        <article v-for="item in dashboard.fridge" :key="item.id" class="mini-card">
          <strong>{{ item.ingredient.name }}</strong>
          <span>{{ item.quantity }}{{ item.unit }}</span>
        </article>
        <div v-if="!dashboard.fridge.length" class="soft-empty">冰箱还没有记录</div>
      </div>
      <div>
        <h2 class="section-title">我的任务</h2>
        <article v-for="task in dashboard.tasks" :key="task.id" class="mini-card">
          <strong>{{ task.title }}</strong>
          <span>{{ statusText(task.status) }}</span>
        </article>
        <div v-if="!dashboard.tasks.length" class="soft-empty">暂时没有任务</div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { showFailToast, showSuccessToast } from 'vant';
import { api, type Dish, type FridgeItem, type MealOrder, type TaskItem } from '../api/client';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const fallbackImage = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg';
const dashboard = reactive<{ todayOrders: MealOrder[]; dishes: Dish[]; fridge: FridgeItem[]; tasks: TaskItem[] }>({
  todayOrders: [],
  dishes: [],
  fridge: [],
  tasks: []
});

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function statusText(status: TaskItem['status']) {
  return ({ PENDING: '待处理', IN_PROGRESS: '处理中', DONE: '完成' })[status];
}

async function load() {
  const data = await api.get<typeof dashboard>('/dashboard');
  Object.assign(dashboard, data);
}

async function orderDish(dishId: number) {
  const dish = dashboard.dishes.find((item) => item.id === dishId);
  if (dish && (auth.user?.sweetPoints || 0) < dish.price) {
    showFailToast('甜蜜点余额不足');
    return;
  }
  await api.post('/orders', { dishId });
  showSuccessToast('已加入今日菜单');
  await auth.refresh();
  load();
}

function logout() {
  auth.logout();
  router.replace('/login');
}

onMounted(load);
</script>

<style scoped>
.home-page {
  background: #f8f5ef;
}

.home-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 18px;
  border-radius: 8px;
  color: #2a2100;
  background: linear-gradient(135deg, #ffd84d, #ff9f1c);
}

.home-hero p,
.home-hero h1 {
  margin: 0;
}

.home-hero p {
  font-size: 13px;
}

.home-hero h1 {
  margin-top: 5px;
  font-size: 26px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.metric-grid div {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  background: #fff;
}

.metric-link {
  cursor: pointer;
}

.metric-grid strong,
.metric-grid span {
  display: block;
}

.metric-grid strong {
  color: #ff6a00;
  font-size: 22px;
}

.metric-grid span {
  color: #68717d;
  font-size: 12px;
}

.home-list,
.split-section > div {
  display: grid;
  gap: 8px;
}

.order-chip,
.mini-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
}

.order-chip strong,
.order-chip span,
.mini-card strong,
.mini-card span {
  display: block;
}

.order-chip span,
.mini-card span {
  margin-top: 3px;
  color: #7a8592;
  font-size: 12px;
}

.order-chip b {
  color: #ff6a00;
}

.recommend-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.recommend-card {
  flex: 0 0 132px;
  padding: 10px;
  border-radius: 8px;
  background: #fff;
}

.recommend-card img {
  width: 100%;
  aspect-ratio: 1.1;
  border-radius: 8px;
  object-fit: cover;
  background: #f2efe8;
}

.recommend-card strong,
.recommend-card span {
  display: block;
  overflow: hidden;
  margin-top: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommend-card span {
  color: #ff6a00;
  font-size: 12px;
}

.recommend-card .van-button {
  margin-top: 8px;
}

.split-section {
  display: grid;
  gap: 12px;
}

.soft-empty {
  padding: 18px;
  border-radius: 8px;
  color: #8b95a1;
  text-align: center;
  background: #fff;
}
</style>
