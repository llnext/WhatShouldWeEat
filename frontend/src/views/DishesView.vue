<template>
  <main class="order-page">
    <header class="order-hero">
      <div>
        <h1>今天想吃啥</h1>
        <p>余额 {{ auth.user?.sweetPoints || 0 }} 甜蜜点</p>
      </div>
      <button class="date-pill" @click="calendarVisible = true">
        <van-icon name="calendar-o" />
        <span>{{ mealDateLabel }}</span>
      </button>
    </header>

    <section class="search-band">
      <van-search v-model="keyword" shape="round" placeholder="搜索菜名、食材或口味" @update:model-value="filterDishes" />
      <div class="quick-tags">
        <button v-for="tag in quickTags" :key="tag" @click="keyword = tag; filterDishes()">{{ tag }}</button>
      </div>
    </section>

    <section class="ordering-shell">
      <aside class="category-rail">
        <button :class="{ active: categoryId === 0 }" @click="selectCategory(0)">
          <span>全部</span>
        </button>
        <button v-for="category in categories" :key="category.id" :class="{ active: categoryId === category.id }" @click="selectCategory(category.id)">
          <span>{{ category.name }}</span>
        </button>
      </aside>

      <div class="dish-list">
        <div class="list-title">
          <strong>{{ activeCategoryName }}</strong>
          <span>{{ filteredDishes.length }} 道可选</span>
        </div>

        <article v-for="dish in filteredDishes" :key="dish.id" class="dish-row">
          <div class="dish-media">
            <img class="dish-photo" :src="dish.image || fallbackImage" :alt="dish.name">
            <strong>{{ dish.price }} 甜蜜点</strong>
          </div>
          <div class="dish-info">
            <div class="dish-heading">
              <h2>{{ dish.name }}</h2>
            </div>
            <p>{{ dish.description || ingredientText(dish) || '家里菜单里的常备选择' }}</p>
            <div class="dish-tags">
              <span v-if="dish.category" class="category-tag">{{ dish.category.name }}</span>
              <span v-for="taste in dish.tastes" :key="taste.id">{{ taste.name }}</span>
              <span v-for="ingredient in dish.ingredients.slice(0, 3)" :key="ingredient.id">{{ ingredient.name }}</span>
            </div>
            <div class="dish-bottom">
              <div class="stepper">
                <button v-if="quantityOf(dish.id)" aria-label="减少" @click="decrease(dish.id)">-</button>
                <span v-if="quantityOf(dish.id)">{{ quantityOf(dish.id) }}</span>
                <button aria-label="增加" @click="increase(dish.id)">+</button>
              </div>
            </div>
          </div>
        </article>

        <van-empty v-if="!filteredDishes.length" image-size="76" description="没有找到想吃的菜" />
      </div>
    </section>

    <footer class="cart-bar" :class="{ active: cartCount > 0 }">
      <button class="cart-main" @click="showCart = true">
        <span class="cart-icon">
          <span class="cart-symbol">选</span>
          <i v-if="cartCount">{{ cartCount }}</i>
        </span>
        <span>
          <strong>{{ cartCount ? `${cartCount} 份已选` : '还没选菜' }}</strong>
          <small>{{ cartCount ? `${mealDateLabel} · 合计 ${cartTotal} 甜蜜点` : `给 ${mealDateLabel} 选菜` }}</small>
        </span>
      </button>
      <van-button round type="primary" :disabled="!cartCount" :loading="submitting" @click="submitOrders">提交菜单</van-button>
    </footer>

    <van-popup v-model:show="showCart" round position="bottom">
      <div class="cart-sheet">
        <div class="sheet-head">
          <strong>{{ mealDateLabel }}菜单</strong>
          <button @click="clearCart">清空</button>
        </div>
        <div v-if="selectedDishes.length" class="sheet-list">
          <div v-for="item in selectedDishes" :key="item.dish.id" class="sheet-item">
            <span>{{ item.dish.name }}</span>
            <div class="stepper">
              <button aria-label="减少" @click="decrease(item.dish.id)">-</button>
              <span>{{ item.quantity }}</span>
              <button aria-label="增加" @click="increase(item.dish.id)">+</button>
            </div>
          </div>
        </div>
        <van-empty v-else image-size="64" description="还没有选择菜品" />
      </div>
    </van-popup>

    <van-calendar v-model:show="calendarVisible" :min-date="today" :max-date="maxMealDate" @confirm="pickMealDate" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { showFailToast, showSuccessToast } from 'vant';
import { api, type DictionaryItem, type Dish } from '../api/client';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const keyword = ref('');
const categoryId = ref(0);
const dishes = ref<Dish[]>([]);
const filteredDishes = ref<Dish[]>([]);
const categories = ref<DictionaryItem[]>([]);
const cart = reactive<Record<number, number>>({});
const showCart = ref(false);
const calendarVisible = ref(false);
const submitting = ref(false);
const fallbackImage = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg';
const quickTags = ['家常菜', '早餐', '辣', '鸡蛋'];
const today = new Date();
const maxMealDate = new Date();
maxMealDate.setDate(today.getDate() + 30);
const selectedMealDate = ref(formatDateInput(today));

const activeCategoryName = computed(() => categories.value.find((item) => item.id === categoryId.value)?.name || '全部菜品');
const cartCount = computed(() => Object.values(cart).reduce((sum, count) => sum + count, 0));
const selectedDishes = computed(() => dishes.value
  .filter((dish) => cart[dish.id])
  .map((dish) => ({ dish, quantity: cart[dish.id] })));
const cartTotal = computed(() => selectedDishes.value.reduce((sum, item) => sum + item.dish.price * item.quantity, 0));
const mealDateLabel = computed(() => {
  const current = formatDateInput(today);
  if (selectedMealDate.value === current) return '今天';
  const [, month, day] = selectedMealDate.value.split('-').map(Number);
  return `${month}月${day}日`;
});

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function pickMealDate(date: Date) {
  selectedMealDate.value = formatDateInput(date);
  calendarVisible.value = false;
}

function ingredientText(dish: Dish) {
  return dish.ingredients.map((item) => item.name).join('、');
}

function quantityOf(id: number) {
  return cart[id] || 0;
}

function increase(id: number) {
  cart[id] = quantityOf(id) + 1;
}

function decrease(id: number) {
  const next = quantityOf(id) - 1;
  if (next > 0) cart[id] = next;
  else delete cart[id];
}

function clearCart() {
  Object.keys(cart).forEach((id) => delete cart[Number(id)]);
  showCart.value = false;
}

function selectCategory(id: number) {
  categoryId.value = id;
  filterDishes();
}

function filterDishes() {
  const text = keyword.value.trim().toLowerCase();
  filteredDishes.value = dishes.value.filter((dish) => {
    const inCategory = categoryId.value === 0 || dish.category?.id === categoryId.value || dish.categoryId === categoryId.value;
    const haystack = [
      dish.name,
      dish.description,
      dish.category?.name,
      ...dish.ingredients.map((item) => item.name),
      ...dish.tastes.map((item) => item.name)
    ].filter(Boolean).join(' ').toLowerCase();
    return inCategory && (!text || haystack.includes(text));
  });
}

async function submitOrders() {
  if ((auth.user?.sweetPoints || 0) < cartTotal.value) {
    showFailToast('甜蜜点余额不足');
    return;
  }
  submitting.value = true;
  try {
    for (const item of selectedDishes.value) {
      for (let index = 0; index < item.quantity; index += 1) {
        await api.post('/orders', { dishId: item.dish.id, mealDate: selectedMealDate.value });
      }
    }
    showSuccessToast('已提交到今日菜单');
    clearCart();
    await auth.refresh();
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  categories.value = await api.get<DictionaryItem[]>('/categories');
  dishes.value = await api.get<Dish[]>('/dishes');
  filterDishes();
});
</script>

<style scoped>
.order-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: 132px;
  background: #f6f7f9;
}

.order-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(16px + env(safe-area-inset-top)) 16px 18px;
  color: #2a2100;
  background: linear-gradient(135deg, #ffd84d, #ffb52e);
}

.order-hero h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
}

.order-hero p {
  margin: 6px 0 0;
  font-size: 14px;
}

.date-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 78px;
  height: 34px;
  padding: 0 12px;
  border: 0;
  border-radius: 17px;
  color: #2a2100;
  background: rgba(255, 255, 255, 0.58);
  font-weight: 700;
}

.search-band {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 8px 10px 10px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(31, 35, 41, 0.06);
}

.quick-tags {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 4px 2px;
}

.quick-tags button {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 14px;
  color: #4f3b00;
  background: #fff4cf;
}

.ordering-shell {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: start;
}

.category-rail {
  position: sticky;
  top: 72px;
  height: calc(100vh - 204px);
  overflow-y: auto;
  background: #f0f2f5;
}

.category-rail button {
  position: relative;
  display: block;
  width: 100%;
  min-height: 54px;
  padding: 8px;
  border: 0;
  color: #4d5662;
  background: transparent;
  font-size: 14px;
}

.category-rail button.active {
  color: #202124;
  background: #fff;
  font-weight: 700;
}

.category-rail button.active::before {
  position: absolute;
  top: 17px;
  left: 0;
  width: 4px;
  height: 20px;
  border-radius: 0 4px 4px 0;
  background: #ffbf24;
  content: "";
}

.category-rail span {
  display: block;
  overflow-wrap: anywhere;
}

.dish-list {
  min-width: 0;
  padding: 10px;
}

.list-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 2px 2px 10px;
}

.list-title strong {
  font-size: 18px;
}

.list-title span {
  color: #8b95a1;
  font-size: 12px;
}

.dish-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 10px;
  padding: 10px;
  background: #fff;
  border-radius: 8px;
}

.dish-media {
  display: grid;
  gap: 6px;
  align-content: start;
}

.dish-photo {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  object-fit: cover;
  background: #f2efe8;
}

.dish-media strong {
  display: block;
  color: #ff6a00;
  font-size: 14px;
  line-height: 1.2;
  text-align: center;
}

.dish-info {
  min-width: 0;
}

.dish-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.dish-heading h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.25;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dish-info p {
  display: -webkit-box;
  overflow: hidden;
  min-height: 36px;
  margin: 7px 0;
  color: #68717d;
  font-size: 13px;
  line-height: 18px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.dish-tags {
  display: flex;
  gap: 5px;
  overflow: hidden;
  min-height: 22px;
}

.dish-tags span {
  flex: 0 0 auto;
  max-width: 72px;
  overflow: hidden;
  padding: 2px 7px;
  border-radius: 4px;
  color: #7b6120;
  background: #fff7df;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dish-tags .category-tag {
  color: #315aa6;
  background: #eef4ff;
}

.dish-bottom {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 9px;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stepper button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  color: #2a2100;
  background: #ffd33d;
  font-size: 20px;
  line-height: 28px;
}

.stepper span {
  min-width: 18px;
  text-align: center;
  font-weight: 700;
}

.cart-bar {
  position: fixed;
  right: 12px;
  bottom: calc(56px + env(safe-area-inset-bottom));
  left: 12px;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(32, 33, 36, 0.92);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.cart-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 0;
  border: 0;
  color: #fff;
  background: transparent;
  text-align: left;
}

.cart-main strong,
.cart-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-main small {
  margin-top: 2px;
  color: #c8ced6;
  font-size: 12px;
}

.cart-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: #2a2100;
  background: #ffd33d;
}

.cart-icon :deep(.van-icon) {
  display: none;
}

.cart-symbol {
  display: block;
  width: 100%;
  color: #2a2100;
  font-size: 18px;
  font-weight: 900;
  line-height: 42px;
  text-align: center;
}

.cart-icon i {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  color: #fff;
  background: #ee0a24;
  font-size: 11px;
  font-style: normal;
  line-height: 16px;
  text-align: center;
}

.cart-sheet {
  max-height: 70vh;
  padding: 16px;
}

.sheet-head,
.sheet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sheet-head {
  margin-bottom: 10px;
}

.sheet-head strong {
  font-size: 18px;
}

.sheet-head button {
  border: 0;
  color: #8b95a1;
  background: transparent;
}

.sheet-list {
  display: grid;
  gap: 10px;
}

.sheet-item {
  padding: 10px 0;
  border-bottom: 1px solid #eef0f3;
}

.sheet-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (min-width: 760px) {
  .order-page {
    max-width: 920px;
    margin: 0 auto;
  }

  .cart-bar {
    right: max(12px, calc((100vw - 920px) / 2 + 12px));
    left: max(12px, calc((100vw - 920px) / 2 + 12px));
  }
}
</style>
