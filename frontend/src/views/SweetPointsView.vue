<template>
  <main class="page points-page">
    <section class="points-hero">
      <div>
        <p>当前余额</p>
        <h1>{{ auth.user?.sweetPoints || 0 }}</h1>
      </div>
      <van-icon name="gold-coin-o" size="34" />
    </section>

    <section class="section">
      <h2 class="section-title">甜蜜点日志</h2>
      <div v-if="logs.length" class="log-list">
        <article v-for="log in logs" :key="log.id" class="log-card" :class="{ spend: log.amount < 0 }">
          <div class="log-main">
            <strong>{{ typeText(log.type) }}</strong>
            <span>{{ log.reason || '无备注' }}</span>
            <small>{{ new Date(log.createdAt).toLocaleString('zh-CN') }}</small>
          </div>
          <div class="log-amount">
            <b>{{ log.amount > 0 ? `+${log.amount}` : log.amount }}</b>
            <span>余额 {{ log.balance }}</span>
          </div>
        </article>
      </div>
      <van-empty v-else image-size="78" description="暂无甜蜜点日志" />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, type SweetPointLog } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const logs = ref<SweetPointLog[]>([]);

function typeText(type: SweetPointLog['type']) {
  return {
    SET: '管理员设置',
    REWARD: '奖励甜蜜点',
    ORDER_SPEND: '点菜扣除',
    ORDER_REFUND: '删除退回',
    ORDER_ADJUST: '换菜调整'
  }[type] || '甜蜜点变化';
}

onMounted(async () => {
  await auth.refresh();
  logs.value = await api.get<SweetPointLog[]>('/me/sweet-point-logs');
});
</script>

<style scoped>
.points-page {
  background: #fff8ec;
}

.points-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 18px;
  border-radius: 8px;
  color: #4e3300;
  background: linear-gradient(135deg, #ffe08a, #ffb84d);
}

.points-hero p,
.points-hero h1 {
  margin: 0;
}

.points-hero p {
  font-size: 13px;
}

.points-hero h1 {
  margin-top: 4px;
  font-size: 38px;
  line-height: 1;
}

.log-list {
  display: grid;
  gap: 10px;
}

.log-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  background: #fff;
  border-left: 5px solid #ffbf24;
}

.log-card.spend {
  border-left-color: #4f8cff;
}

.log-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.log-main strong,
.log-main span,
.log-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-main span,
.log-main small {
  color: #7a8592;
  font-size: 12px;
}

.log-amount {
  flex: 0 0 auto;
  text-align: right;
}

.log-amount b,
.log-amount span {
  display: block;
}

.log-amount b {
  color: #ff6a00;
  font-size: 18px;
}

.spend .log-amount b {
  color: #315aa6;
}

.log-amount span {
  margin-top: 3px;
  color: #7a8592;
  font-size: 12px;
}
</style>
