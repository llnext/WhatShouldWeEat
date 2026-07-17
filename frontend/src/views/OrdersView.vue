<template>
  <main class="page records-page">
    <section class="records-hero">
      <div>
        <h1>点菜记录</h1>
        <p>{{ tab === 0 ? `${selectedDateLabel}的菜单` : '按日期和成员合并显示' }}</p>
      </div>
      <button class="record-date" @click="calendarVisible = true">
        <van-icon name="calendar-o" />
        <span>{{ selectedDateLabel }}</span>
      </button>
    </section>

    <van-tabs v-model:active="tab" class="record-tabs" @change="loadOrders">
      <van-tab title="按日期">
        <section v-if="groupedOrders.length" class="date-group-list">
          <div v-for="group in groupedOrders" :key="group.dateKey" class="date-group">
            <div class="date-group-head">
              <strong>{{ group.dateLabel }}</strong>
              <span>{{ group.count }} 份</span>
            </div>
            <article v-for="user in group.users" :key="user.key" class="user-order-card">
              <div class="user-avatar">{{ user.userName.slice(0, 1) }}</div>
              <div class="user-order-main">
                <strong>{{ user.userName }}</strong>
                <span>{{ user.dishes.join('、') }}</span>
                <div class="order-actions">
                  <button v-for="order in user.orders" :key="order.id" :disabled="!canEdit(order)" @click="openEditDate(order)">
                    {{ order.dish.name }} · 改日期
                  </button>
                  <button v-for="order in user.orders" :key="`dish-${order.id}`" :disabled="!canEdit(order)" @click="openDishPicker(order)">
                    换菜
                  </button>
                  <button v-for="order in user.orders" :key="`delete-${order.id}`" :disabled="!canEdit(order)" class="danger" @click="deleteOrder(order)">
                    删除退点
                  </button>
                </div>
              </div>
              <b>{{ user.total }}</b>
            </article>
          </div>
        </section>
        <div v-else class="record-empty">这一天还没有点菜</div>
      </van-tab>

      <van-tab title="全部历史">
        <section v-if="groupedOrders.length" class="date-group-list">
          <div v-for="group in groupedOrders" :key="group.dateKey" class="date-group">
            <div class="date-group-head">
              <strong>{{ group.dateLabel }}</strong>
              <span>{{ group.count }} 份</span>
            </div>
            <article v-for="user in group.users" :key="user.key" class="user-order-card">
              <div class="user-avatar">{{ user.userName.slice(0, 1) }}</div>
              <div class="user-order-main">
                <strong>{{ user.userName }}</strong>
                <span>{{ user.dishes.join('、') }}</span>
                <div class="order-actions">
                  <button v-for="order in user.orders" :key="order.id" :disabled="!canEdit(order)" @click="openEditDate(order)">
                    {{ canEdit(order) ? `${order.dish.name} · 改日期` : `${order.dish.name} · 已锁定` }}
                  </button>
                  <button v-for="order in user.orders" :key="`dish-${order.id}`" :disabled="!canEdit(order)" @click="openDishPicker(order)">
                    换菜
                  </button>
                  <button v-for="order in user.orders" :key="`delete-${order.id}`" :disabled="!canEdit(order)" class="danger" @click="deleteOrder(order)">
                    删除退点
                  </button>
                </div>
              </div>
              <b>{{ user.total }}</b>
            </article>
          </div>
        </section>
        <div v-else class="record-empty">暂无历史记录</div>
      </van-tab>

      <van-tab title="统计">
        <div v-if="stats.length" class="stats-list">
          <article v-for="(row, index) in stats" :key="row.dish?.id" class="stat-card">
            <span class="rank">{{ index + 1 }}</span>
            <div>
              <strong>{{ row.dish?.name }}</strong>
              <small>累计被点 {{ row.count }} 次</small>
              <van-progress :percentage="statPercent(row.count)" color="#ff9f1c" :show-pivot="false" />
            </div>
          </article>
        </div>
        <van-empty v-else image-size="76" description="暂无统计" />
      </van-tab>
    </van-tabs>

    <van-calendar v-model:show="calendarVisible" :max-date="maxDate" @confirm="pickDate" />
    <van-calendar v-model:show="editCalendarVisible" :min-date="today" :max-date="maxDate" @confirm="saveEditDate" />
    <van-popup v-model:show="dishPickerVisible" round position="bottom">
      <van-picker title="换成哪道菜" :columns="dishColumns" @cancel="dishPickerVisible = false" @confirm="saveDishChange" />
    </van-popup>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { showConfirmDialog, showSuccessToast } from 'vant';
import { api, type Dish, type MealOrder } from '../api/client';
import { useAuthStore } from '../stores/auth';

type UserOrderGroup = {
  key: string;
  userName: string;
  total: number;
  count: number;
  dishes: string[];
  orders: MealOrder[];
};

type DateOrderGroup = {
  dateKey: string;
  dateLabel: string;
  count: number;
  users: UserOrderGroup[];
};

const tab = ref(0);
const auth = useAuthStore();
const orders = ref<MealOrder[]>([]);
const stats = ref<{ dish?: Dish; count: number }[]>([]);
const dishes = ref<Dish[]>([]);
const calendarVisible = ref(false);
const editCalendarVisible = ref(false);
const dishPickerVisible = ref(false);
const editingOrder = ref<MealOrder | null>(null);
const editingDishOrder = ref<MealOrder | null>(null);
const selectedDate = ref(formatDateInput(new Date()));
const today = new Date();
const maxDate = new Date();
maxDate.setDate(maxDate.getDate() + 30);
const maxCount = computed(() => Math.max(1, ...stats.value.map((row) => row.count)));
const selectedDateLabel = computed(() => friendlyDate(selectedDate.value));
const groupedOrders = computed(() => groupOrders(orders.value));
const dishColumns = computed(() => dishes.value.map((dish) => ({ text: `${dish.name}（${dish.price}点）`, value: dish.id })));

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function friendlyDate(value: string) {
  const today = formatDateInput(new Date());
  if (value === today) return '今天';
  const [, month, day] = value.split('-').map(Number);
  return `${month}月${day}日`;
}

function dateKeyOf(order: MealOrder) {
  return formatDateInput(new Date(order.mealDate || order.createdAt));
}

function canEdit(order: MealOrder) {
  const isOwner = order.user.id === auth.user?.id;
  const isAdmin = auth.user?.role === 'ADMIN';
  return (isOwner || isAdmin) && dateKeyOf(order) >= formatDateInput(new Date());
}

function dishLine(name: string, count: number) {
  return count > 1 ? `${name} x${count}` : name;
}

function groupOrders(list: MealOrder[]) {
  const dateMap = new Map<string, DateOrderGroup>();
  for (const order of list) {
    const dateKey = dateKeyOf(order);
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { dateKey, dateLabel: friendlyDate(dateKey), count: 0, users: [] });
    }
    const dateGroup = dateMap.get(dateKey)!;
    dateGroup.count += 1;

    const userKey = `${dateKey}-${order.user.id}`;
    let userGroup = dateGroup.users.find((item) => item.key === userKey);
    if (!userGroup) {
      userGroup = { key: userKey, userName: order.user.name, total: 0, count: 0, dishes: [], orders: [] };
      dateGroup.users.push(userGroup);
    }
    userGroup.total += order.priceSnapshot;
    userGroup.count += 1;
    userGroup.orders.push(order);

    const dishCounts = new Map<string, number>();
    for (const item of userGroup.orders) {
      dishCounts.set(item.dish.name, (dishCounts.get(item.dish.name) || 0) + 1);
    }
    userGroup.dishes = Array.from(dishCounts.entries()).map(([name, count]) => dishLine(name, count));
  }
  return Array.from(dateMap.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function statPercent(count: number) {
  return Math.round((count / maxCount.value) * 100);
}

function pickDate(date: Date) {
  selectedDate.value = formatDateInput(date);
  calendarVisible.value = false;
  if (tab.value === 0) loadOrders();
}

function openEditDate(order: MealOrder) {
  if (!canEdit(order)) return;
  editingOrder.value = order;
  editCalendarVisible.value = true;
}

async function saveEditDate(date: Date) {
  if (!editingOrder.value) return;
  await api.put(`/orders/${editingOrder.value.id}`, { mealDate: formatDateInput(date) });
  showSuccessToast('已修改日期');
  editCalendarVisible.value = false;
  editingOrder.value = null;
  await auth.refresh();
  loadOrders();
}

function openDishPicker(order: MealOrder) {
  if (!canEdit(order)) return;
  editingDishOrder.value = order;
  dishPickerVisible.value = true;
}

async function saveDishChange(option: any) {
  if (!editingDishOrder.value) return;
  const dishId = Number(option.selectedOptions?.[0]?.value ?? option.value);
  await api.put(`/orders/${editingDishOrder.value.id}`, { dishId });
  showSuccessToast('已换菜');
  dishPickerVisible.value = false;
  editingDishOrder.value = null;
  await auth.refresh();
  loadOrders();
}

async function deleteOrder(order: MealOrder) {
  if (!canEdit(order)) return;
  await showConfirmDialog({ title: '删除点菜', message: `删除 ${order.dish.name} 并退回 ${order.priceSnapshot} 甜蜜点？` });
  await api.delete(`/orders/${order.id}`);
  showSuccessToast('已删除并退回甜蜜点');
  await auth.refresh();
  loadOrders();
}

async function loadOrders() {
  if (tab.value === 2) {
    stats.value = await api.get<{ dish?: Dish; count: number }[]>('/orders/stats');
    return;
  }
  orders.value = await api.get<MealOrder[]>('/orders', {
    params: tab.value === 0 ? { date: selectedDate.value } : undefined
  });
}

onMounted(async () => {
  [dishes.value] = await Promise.all([
    api.get<Dish[]>('/dishes'),
    loadOrders()
  ]);
});
</script>

<style scoped>
.records-page {
  background: #f6f7fb;
}

.records-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-radius: 8px;
  color: #17325d;
  background: linear-gradient(135deg, #cfe4ff, #d8f1ff);
}

.records-hero h1,
.records-hero p {
  margin: 0;
}

.records-hero h1 {
  font-size: 25px;
}

.records-hero p {
  margin-top: 6px;
  color: rgba(23, 50, 93, 0.72);
}

.record-date {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 17px;
  color: #17325d;
  background: rgba(255, 255, 255, 0.7);
  font-weight: 700;
}

.record-tabs {
  margin-top: 10px;
}

.date-group-list,
.stats-list {
  display: grid;
  gap: 12px;
  padding-top: 12px;
}

.date-group {
  padding: 12px;
  border-radius: 8px;
  background: #fff;
}

.date-group-head,
.user-order-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.date-group-head {
  margin-bottom: 10px;
}

.date-group-head strong {
  font-size: 18px;
}

.date-group-head span {
  color: #7a8592;
  font-size: 12px;
}

.user-order-card {
  padding: 10px 0;
  border-top: 1px solid #eef0f3;
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: #315aa6;
  background: #eef4ff;
  font-weight: 800;
}

.user-order-main {
  min-width: 0;
  flex: 1;
}

.user-order-main strong,
.user-order-main span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-order-main span {
  margin-top: 4px;
  color: #7a8592;
  font-size: 13px;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.order-actions button {
  min-height: 28px;
  padding: 0 9px;
  border: 0;
  border-radius: 14px;
  color: #315aa6;
  background: #eef4ff;
  font-size: 12px;
}

.order-actions button.danger {
  color: #c63d2b;
  background: #fff0ec;
}

.order-actions button:disabled {
  color: #9aa3ad;
  background: #f1f3f5;
}

.user-order-card b {
  color: #ff6a00;
}

.record-empty {
  margin-top: 12px;
  padding: 32px 0;
  border-radius: 8px;
  color: #8b95a1;
  text-align: center;
  background: #fff;
}

.stat-card {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: #fff;
}

.rank {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: #6d4700;
  background: #fff0cf;
  font-weight: 800;
}

.stat-card strong,
.stat-card small {
  display: block;
}

.stat-card small {
  margin: 4px 0 8px;
  color: #7a8592;
}
</style>
