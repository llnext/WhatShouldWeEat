<template>
  <main class="page fridge-page">
    <section class="fridge-hero">
      <div>
        <h1>冰箱库存</h1>
        <p>{{ items.length }} 类食材 · 家里人都可以维护</p>
      </div>
      <van-button round icon="plus" type="primary" @click="openCreate">新增</van-button>
    </section>

    <div class="fridge-tools">
      <van-search v-model="keyword" shape="round" placeholder="搜索食材" />
    </div>

    <div v-if="filteredItems.length" class="fridge-list">
      <van-swipe-cell v-for="item in filteredItems" :key="item.id">
        <article class="fridge-card" @click="openEdit(item)">
          <div class="food-mark">{{ item.ingredient.name.slice(0, 1) }}</div>
          <div class="food-main">
            <strong>{{ item.ingredient.name }}</strong>
            <span>{{ item.updatedBy.name }} · {{ new Date(item.updatedAt).toLocaleString('zh-CN') }}</span>
          </div>
          <div class="food-count">{{ item.quantity }}<small>{{ item.unit }}</small></div>
        </article>
        <template #right>
          <van-button square type="danger" text="删除" class="delete-button" @click="remove(item.id)" />
        </template>
      </van-swipe-cell>
    </div>
    <van-empty v-else image-size="80" :description="keyword ? '没有匹配的库存' : '暂无库存'" />

    <van-dialog v-model:show="show" :title="editingId ? '编辑库存' : '新增库存'" show-cancel-button @confirm="save">
      <van-field label="食材" readonly is-link :model-value="selectedIngredientName" placeholder="请选择食材" @click="pickerVisible = true" />
      <van-field v-model="form.quantity" label="数量" type="number" placeholder="请输入数量" />
      <van-field v-model.trim="form.unit" label="单位" placeholder="个 / 斤 / 袋" />
      <div class="choice-row">
        <button v-for="unit in unitOptions" :key="unit" :class="{ active: form.unit === unit }" @click.prevent="form.unit = unit">{{ unit }}</button>
      </div>
      <van-button v-if="editingId" block plain type="danger" class="dialog-delete" @click="removeEditing">删除这条库存</van-button>
    </van-dialog>

    <van-popup v-model:show="pickerVisible" round position="bottom">
      <van-picker title="选择食材" :columns="ingredientColumns" @cancel="pickerVisible = false" @confirm="pickIngredient" />
    </van-popup>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { showConfirmDialog, showSuccessToast } from 'vant';
import { api, type DictionaryItem, type FridgeItem } from '../api/client';

const items = ref<FridgeItem[]>([]);
const ingredients = ref<DictionaryItem[]>([]);
const keyword = ref('');
const show = ref(false);
const pickerVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ ingredientId: 0, quantity: '', unit: '' });
const unitOptions = ['个', '斤', '袋', '盒', '瓶', '克'];

const filteredItems = computed(() => {
  const text = keyword.value.trim();
  if (!text) return items.value;
  return items.value.filter((item) => item.ingredient.name.includes(text));
});
const selectedIngredientName = computed(() => ingredients.value.find((item) => item.id === form.ingredientId)?.name || '');
const ingredientColumns = computed(() => ingredients.value.map((item) => ({ text: item.name, value: item.id })));

async function load() {
  items.value = await api.get<FridgeItem[]>('/fridge');
  ingredients.value = await api.get<DictionaryItem[]>('/ingredients');
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { ingredientId: ingredients.value[0]?.id || 0, quantity: '', unit: '个' });
  show.value = true;
}

function openEdit(item: FridgeItem) {
  editingId.value = item.id;
  Object.assign(form, { ingredientId: item.ingredientId, quantity: String(item.quantity), unit: item.unit });
  show.value = true;
}

function pickIngredient(option: any) {
  form.ingredientId = Number(option.selectedOptions?.[0]?.value ?? option.value);
  pickerVisible.value = false;
}

async function save() {
  const payload = { ingredientId: Number(form.ingredientId), quantity: Number(form.quantity), unit: form.unit };
  if (editingId.value) await api.put(`/fridge/${editingId.value}`, payload);
  else await api.post('/fridge', payload);
  showSuccessToast('已保存');
  load();
}

async function remove(id: number) {
  await showConfirmDialog({ title: '删除库存', message: '确认删除这条冰箱库存？' });
  await api.delete(`/fridge/${id}`);
  showSuccessToast('已删除');
  show.value = false;
  load();
}

async function removeEditing() {
  if (editingId.value) await remove(editingId.value);
}

onMounted(load);
</script>

<style scoped>
.fridge-page {
  background: #f5f8f7;
}

.fridge-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-radius: 8px;
  color: #103526;
  background: linear-gradient(135deg, #bff3d0, #85d7bd);
}

.fridge-hero h1 {
  margin: 0;
  font-size: 25px;
}

.fridge-hero p {
  margin: 6px 0 0;
  color: rgba(16, 53, 38, 0.76);
}

.fridge-tools {
  margin: 10px 0 8px;
}

.fridge-tools :deep(.van-search) {
  padding: 0;
  background: transparent;
}

.fridge-tools :deep(.van-search__content) {
  background: #fff;
  border: 1px solid #e2e8e5;
  box-shadow: 0 6px 18px rgba(23, 100, 74, 0.08);
}

.choice-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.choice-row button {
  flex: 0 0 auto;
  height: 30px;
  padding: 0 13px;
  border: 0;
  border-radius: 15px;
  color: #17644a;
  background: #e4f7ee;
}

.choice-row {
  padding: 12px 16px;
}

.choice-row button.active {
  color: #fff;
  background: #16a36f;
}

.fridge-list {
  display: grid;
  gap: 10px;
}

.fridge-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border-radius: 8px;
}

.food-mark {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: #17644a;
  background: #e4f7ee;
  font-weight: 700;
}

.food-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.food-main strong {
  overflow: hidden;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.food-main span {
  color: #7a8592;
  font-size: 12px;
}

.food-count {
  color: #103526;
  font-size: 20px;
  font-weight: 800;
}

.food-count small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 500;
}

.delete-button {
  height: 100%;
}

.dialog-delete {
  width: calc(100% - 32px);
  margin: 10px 16px 16px;
}
</style>
