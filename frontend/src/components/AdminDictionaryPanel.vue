<template>
  <section class="dict-panel">
    <div class="dict-hero" :class="toneClass">
      <div>
        <p class="dict-kicker">{{ title }}字典</p>
        <h2>{{ items.length }}</h2>
      </div>
      <van-button class="hero-action" icon="plus" round type="primary" size="small" @click="openCreate">新增</van-button>
    </div>

    <div class="dict-toolbar">
      <van-search v-model="keyword" shape="round" :placeholder="`搜索${title}`" />
    </div>

    <div v-if="filteredItems.length" class="dict-grid">
      <article v-for="item in filteredItems" :key="item.id" class="dict-card">
        <div class="dict-mark" :class="toneClass">{{ item.name.slice(0, 1) }}</div>
        <div class="dict-content">
          <strong>{{ item.name }}</strong>
          <span>{{ title }}字典项</span>
        </div>
        <div class="dict-actions">
          <van-button icon="edit" size="mini" round @click="openEdit(item)" />
          <van-button icon="delete-o" size="mini" round @click="confirmRemove(item.id)" />
        </div>
      </article>
    </div>

    <van-empty v-else image-size="72" :description="keyword ? '没有匹配项' : `暂无${title}`" />

    <van-dialog v-model:show="dialogVisible" :title="editingItem ? `编辑${title}` : `新增${title}`" show-cancel-button @confirm="submit">
      <van-field v-model.trim="form.name" :label="title" :placeholder="`${title}名称`" autofocus />
    </van-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { showConfirmDialog } from 'vant';
import type { DictionaryItem } from '../api/client';

const props = defineProps<{
  title: string;
  items: DictionaryItem[];
  tone: 'ingredient' | 'taste' | 'category';
}>();

const emit = defineEmits<{
  create: [name: string];
  update: [payload: { id: number; name: string }];
  remove: [id: number];
}>();

const keyword = ref('');
const dialogVisible = ref(false);
const editingItem = ref<DictionaryItem | null>(null);
const form = reactive({ name: '' });

const toneClass = computed(() => `tone-${props.tone}`);
const filteredItems = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  if (!text) return props.items;
  return props.items.filter((item) => item.name.toLowerCase().includes(text) || String(item.id).includes(text));
});

function openCreate() {
  editingItem.value = null;
  form.name = '';
  dialogVisible.value = true;
}

function openEdit(item: DictionaryItem) {
  editingItem.value = item;
  form.name = item.name;
  dialogVisible.value = true;
}

function submit() {
  if (!form.name) return;
  if (editingItem.value) emit('update', { id: editingItem.value.id, name: form.name });
  else emit('create', form.name);
}

async function confirmRemove(id: number) {
  await showConfirmDialog({ title: '删除确认', message: `确认删除这个${props.title}？` });
  emit('remove', id);
}
</script>

<style scoped>
.dict-panel {
  padding-top: 12px;
}

.dict-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 92px;
  box-sizing: border-box;
  padding: 18px;
  border-radius: 8px;
  color: #14213d;
}

.dict-hero h2 {
  margin: 2px 0 0;
  font-size: 34px;
  line-height: 1;
}

.dict-kicker {
  margin: 0;
  font-size: 13px;
  color: rgba(20, 33, 61, 0.72);
}

.hero-action {
  flex: 0 0 auto;
}

.tone-ingredient {
  background: #e7f5ec;
}

.tone-taste {
  background: #fff0e6;
}

.tone-category {
  background: #e8f1ff;
}

.dict-toolbar {
  margin: 10px -10px 8px;
}

.dict-grid {
  display: grid;
  gap: 10px;
}

.dict-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  box-sizing: border-box;
  padding: 12px;
  background: #fff;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.dict-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  font-weight: 700;
}

.dict-content {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.dict-content strong {
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dict-content span {
  color: #8b95a1;
  font-size: 12px;
}

.dict-actions {
  display: flex;
  gap: 6px;
}

@media (min-width: 760px) {
  .dict-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
