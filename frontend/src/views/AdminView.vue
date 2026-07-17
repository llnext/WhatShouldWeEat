<template>
  <main class="page">
    <div class="topbar">
      <div>
        <h1 class="title">管理后台</h1>
        <p class="subtitle">用户、菜品和字典维护</p>
      </div>
    </div>

    <van-tabs v-model:active="tab">
      <van-tab title="用户">
        <section class="admin-panel user-panel">
          <div class="panel-head">
            <div>
              <strong>{{ users.length }} 位成员</strong>
              <span>管理员可维护家庭账号</span>
            </div>
            <van-button round size="small" icon="plus" type="primary" @click="openUser()">新增</van-button>
          </div>
          <article v-for="user in users" :key="user.id" class="admin-card user-admin-card" @click="openUser(user)">
            <div class="user-card-top">
              <div class="avatar-mark">
                <img v-if="user.avatar" :src="user.avatar" :alt="user.name">
                <span v-else>{{ user.name.slice(0, 1) }}</span>
              </div>
              <div class="admin-card-main">
                <strong>{{ user.name }}</strong>
                <span>{{ user.username }} · {{ user.role === 'ADMIN' ? '管理员' : '普通用户' }}</span>
                <em>{{ user.sweetPoints || 0 }} 甜蜜点</em>
              </div>
            </div>
            <div class="user-actions">
              <van-button size="mini" round @click.stop="openSweetPoint(user, 'reward')">奖励</van-button>
              <van-button size="mini" round @click.stop="openSweetPoint(user, 'set')">设置</van-button>
              <van-button size="mini" round @click.stop="resetPassword(user.id)">重置</van-button>
            </div>
          </article>
        </section>
      </van-tab>

      <van-tab title="菜品">
        <section class="admin-panel dish-panel">
          <div class="panel-head">
            <div>
              <strong>{{ dishes.length }} 道菜</strong>
              <span>维护点餐页展示内容</span>
            </div>
            <van-button round size="small" icon="plus" type="primary" @click="openDish()">新增</van-button>
          </div>
          <article v-for="dish in dishes" :key="dish.id" class="admin-card dish-admin-card" @click="openDish(dish)">
            <img :src="dish.image || fallbackImage" :alt="dish.name">
            <div class="admin-card-main">
              <strong>{{ dish.name }}</strong>
              <span>{{ dish.category?.name || '未分类' }} · {{ dish.isAvailable ? '可点' : '不可点' }}</span>
            </div>
            <b>{{ dish.price }}</b>
          </article>
          <van-empty v-if="!dishes.length" image-size="72" description="暂无菜品" />
        </section>
      </van-tab>

      <van-tab title="食材">
        <admin-dictionary-panel title="食材" tone="ingredient" :items="ingredients" @create="createDict('ingredients', $event)" @update="updateDict('ingredients', $event)" @remove="removeDict('ingredients', $event)" />
      </van-tab>
      <van-tab title="口味">
        <admin-dictionary-panel title="口味" tone="taste" :items="tastes" @create="createDict('tastes', $event)" @update="updateDict('tastes', $event)" @remove="removeDict('tastes', $event)" />
      </van-tab>
      <van-tab title="分类">
        <admin-dictionary-panel title="分类" tone="category" :items="categories" @create="createDict('categories', $event)" @update="updateDict('categories', $event)" @remove="removeDict('categories', $event)" />
      </van-tab>
    </van-tabs>

    <van-dialog v-model:show="userDialog" title="用户" show-cancel-button @confirm="saveUser">
      <van-field v-model="userForm.username" label="账号" :disabled="Boolean(userEditingId)" />
      <van-field v-if="!userEditingId" v-model="userForm.password" label="密码" type="password" placeholder="默认 123456" />
      <van-field v-model="userForm.name" label="姓名" />
      <van-field v-model="userForm.birthday" label="生日" placeholder="YYYY-MM-DD" />
      <div class="upload-block">
        <span>头像</span>
        <van-uploader :after-read="uploadAvatar" :max-count="1">
          <div class="upload-preview avatar-preview">
            <img v-if="userForm.avatar" :src="userForm.avatar" alt="头像">
            <van-icon v-else name="manager-o" size="28" />
          </div>
        </van-uploader>
      </div>
      <van-radio-group v-model="userForm.role" direction="horizontal" class="radio-row">
        <van-radio name="USER">普通用户</van-radio>
        <van-radio name="ADMIN">管理员</van-radio>
      </van-radio-group>
    </van-dialog>

    <van-dialog v-model:show="sweetPointDialog" :title="sweetPointMode === 'set' ? '设置甜蜜点' : '奖励甜蜜点'" show-cancel-button @confirm="saveSweetPoint">
      <van-field :model-value="sweetPointUser?.name" label="用户" readonly />
      <van-field v-model="sweetPointForm.amount" :label="sweetPointMode === 'set' ? '设置为' : '奖励'" type="number" placeholder="请输入甜蜜点数量" />
      <van-field v-model.trim="sweetPointForm.reason" label="备注" type="textarea" autosize placeholder="例如：完成家务奖励" />
    </van-dialog>

    <van-dialog v-model:show="dishDialog" title="菜品" show-cancel-button @confirm="saveDish">
      <van-field v-model="dishForm.name" label="名称" />
      <van-field label="分类" readonly is-link :model-value="selectedCategoryName" placeholder="请选择分类" @click="categoryPickerVisible = true" />
      <van-field v-model="dishForm.price" label="甜蜜点" type="number" />
      <van-field label="是否可点">
        <template #input>
          <van-switch v-model="dishForm.isAvailable" size="22px" />
        </template>
      </van-field>
      <div class="upload-block">
        <span>图片</span>
        <van-uploader :after-read="uploadDishImage" :max-count="1">
          <div class="upload-preview">
            <img v-if="dishForm.image" :src="dishForm.image" alt="菜品图片">
            <van-icon v-else name="photograph" size="28" />
          </div>
        </van-uploader>
      </div>
      <van-field v-model="dishForm.description" label="描述" type="textarea" autosize />
      <div class="dish-choices">
        <p>食材</p>
        <div class="choice-tags">
          <button v-for="item in ingredients" :key="item.id" :class="{ active: dishForm.ingredientIds.includes(item.id) }" @click.prevent="toggleDishChoice('ingredientIds', item.id)">{{ item.name }}</button>
        </div>
        <p>口味</p>
        <div class="choice-tags">
          <button v-for="item in tastes" :key="item.id" :class="{ active: dishForm.tasteIds.includes(item.id) }" @click.prevent="toggleDishChoice('tasteIds', item.id)">{{ item.name }}</button>
        </div>
      </div>
    </van-dialog>

    <van-popup v-model:show="categoryPickerVisible" round position="bottom">
      <van-picker title="选择分类" :columns="categoryColumns" @cancel="categoryPickerVisible = false" @confirm="pickDishCategory" />
    </van-popup>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { showConfirmDialog, showSuccessToast } from 'vant';
import { api, type DictionaryItem, type Dish, type Role, type User } from '../api/client';
import AdminDictionaryPanel from '../components/AdminDictionaryPanel.vue';

const tab = ref(0);
const users = ref<User[]>([]);
const dishes = ref<Dish[]>([]);
const ingredients = ref<DictionaryItem[]>([]);
const tastes = ref<DictionaryItem[]>([]);
const categories = ref<DictionaryItem[]>([]);
const fallbackImage = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg';

const userDialog = ref(false);
const userEditingId = ref<number | null>(null);
const userForm = reactive({ username: '', password: '', name: '', birthday: '', avatar: '', role: 'USER' as Role });
const sweetPointDialog = ref(false);
const sweetPointMode = ref<'set' | 'reward'>('reward');
const sweetPointUser = ref<User | null>(null);
const sweetPointForm = reactive({ amount: '', reason: '' });

const dishDialog = ref(false);
const categoryPickerVisible = ref(false);
const dishEditingId = ref<number | null>(null);
const dishForm = reactive({ name: '', categoryId: null as number | null, price: '0', isAvailable: true, image: '', description: '', ingredientIds: [] as number[], tasteIds: [] as number[] });

const birthdayValue = computed(() => userForm.birthday || null);
const selectedCategoryName = computed(() => categories.value.find((item) => item.id === dishForm.categoryId)?.name || '');
const categoryColumns = computed(() => [{ text: '未分类', value: 0 }, ...categories.value.map((item) => ({ text: item.name, value: item.id }))]);

async function loadAll() {
  [users.value, dishes.value, ingredients.value, tastes.value, categories.value] = await Promise.all([
    api.get<User[]>('/users'),
    api.get<Dish[]>('/dishes', { params: { includeUnavailable: '1' } }),
    api.get<DictionaryItem[]>('/ingredients'),
    api.get<DictionaryItem[]>('/tastes'),
    api.get<DictionaryItem[]>('/categories')
  ]);
}

function openUser(user?: User) {
  userEditingId.value = user?.id ?? null;
  Object.assign(userForm, {
    username: user?.username || '',
    password: '',
    name: user?.name || '',
    birthday: user?.birthday ? user.birthday.slice(0, 10) : '',
    avatar: user?.avatar || '',
    role: user?.role || 'USER'
  });
  userDialog.value = true;
}

async function saveUser() {
  const payload = {
    username: userForm.username,
    password: userForm.password,
    name: userForm.name,
    birthday: birthdayValue.value,
    avatar: userForm.avatar || null,
    role: userForm.role
  };
  if (userEditingId.value) await api.put(`/users/${userEditingId.value}`, payload);
  else await api.post('/users', payload);
  showSuccessToast('已保存用户');
  loadAll();
}

async function resetPassword(id: number) {
  await showConfirmDialog({ title: '重置密码', message: '确认重置为 123456？' });
  await api.post(`/users/${id}/reset-password`);
  showSuccessToast('已重置为 123456');
}

async function uploadAvatar(file: any) {
  const formData = new FormData();
  formData.append('file', file.file);
  const result = await api.post<{ path: string }>('/upload/avatar', formData);
  userForm.avatar = result.path;
  showSuccessToast('头像已上传');
}

function openSweetPoint(user: User, mode: 'set' | 'reward') {
  sweetPointUser.value = user;
  sweetPointMode.value = mode;
  Object.assign(sweetPointForm, {
    amount: mode === 'set' ? String(user.sweetPoints || 0) : '',
    reason: ''
  });
  sweetPointDialog.value = true;
}

async function saveSweetPoint() {
  if (!sweetPointUser.value) return;
  const endpoint = sweetPointMode.value === 'set' ? 'set' : 'reward';
  await api.post(`/users/${sweetPointUser.value.id}/sweet-points/${endpoint}`, {
    amount: Number(sweetPointForm.amount),
    reason: sweetPointForm.reason
  });
  showSuccessToast(sweetPointMode.value === 'set' ? '已设置甜蜜点' : '已奖励甜蜜点');
  loadAll();
}

function openDish(dish?: Dish) {
  dishEditingId.value = dish?.id ?? null;
  Object.assign(dishForm, {
    name: dish?.name || '',
    categoryId: dish?.categoryId || dish?.category?.id || null,
    price: String(dish?.price ?? 0),
    isAvailable: dish?.isAvailable ?? true,
    image: dish?.image || '',
    description: dish?.description || '',
    ingredientIds: dish?.ingredients?.map((item) => item.id) || [],
    tasteIds: dish?.tastes?.map((item) => item.id) || []
  });
  dishDialog.value = true;
}

function pickDishCategory(option: any) {
  const value = Number(option.selectedOptions?.[0]?.value ?? option.value);
  dishForm.categoryId = value || null;
  categoryPickerVisible.value = false;
}

function toggleDishChoice(key: 'ingredientIds' | 'tasteIds', id: number) {
  const list = dishForm[key];
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
  else list.push(id);
}

function tasteNames(dish: Dish) {
  return dish.tastes.map((item) => item.name).join('、');
}

async function saveDish() {
  const payload = {
    name: dishForm.name,
    categoryId: dishForm.categoryId,
    price: Number(dishForm.price || 0),
    isAvailable: dishForm.isAvailable,
    image: dishForm.image || null,
    description: dishForm.description || null,
    ingredientIds: dishForm.ingredientIds,
    tasteIds: dishForm.tasteIds
  };
  if (dishEditingId.value) await api.put(`/dishes/${dishEditingId.value}`, payload);
  else await api.post('/dishes', payload);
  showSuccessToast('已保存菜品');
  loadAll();
}

async function uploadDishImage(file: any) {
  const formData = new FormData();
  formData.append('file', file.file);
  const result = await api.post<{ path: string }>('/upload/dishes', formData);
  dishForm.image = result.path;
  showSuccessToast('图片已上传');
}

async function createDict(type: string, name: string) {
  await api.post(`/${type}`, { name });
  showSuccessToast('已新增');
  loadAll();
}

async function updateDict(type: string, item: DictionaryItem) {
  await api.put(`/${type}/${item.id}`, { name: item.name });
  showSuccessToast('已更新');
  loadAll();
}

async function removeDict(type: string, id: number) {
  await api.delete(`/${type}/${id}`);
  showSuccessToast('已删除');
  loadAll();
}

onMounted(loadAll);
</script>

<style scoped>
.admin-panel {
  display: grid;
  gap: 10px;
  padding-top: 12px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
}

.user-panel .panel-head {
  color: #113764;
  background: #e5f1ff;
}

.dish-panel .panel-head {
  color: #5a3300;
  background: #fff0cf;
}

.panel-head strong,
.panel-head span {
  display: block;
}

.panel-head strong {
  font-size: 19px;
}

.panel-head span {
  margin-top: 4px;
  color: rgba(32, 33, 36, 0.62);
  font-size: 13px;
}

.admin-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #fff;
}

.user-admin-card {
  grid-template-columns: 1fr;
  align-items: stretch;
}

.user-card-top {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.avatar-mark {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 8px;
  color: #1d5f9f;
  background: #e5f1ff;
  font-weight: 800;
  overflow: hidden;
}

.avatar-mark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-card-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.admin-card-main strong,
.admin-card-main span,
.admin-card-main em {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-card-main strong {
  font-size: 16px;
}

.admin-card-main span {
  color: #7a8592;
  font-size: 12px;
}

.admin-card-main em {
  color: #ff8a00;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.user-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #eef0f3;
}

.user-actions :deep(.van-button) {
  flex: 1;
  height: 30px;
  padding: 0 10px;
}

.dish-admin-card {
  grid-template-columns: 56px minmax(0, 1fr) auto;
}

.dish-admin-card img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  background: #f2efe8;
}

.dish-admin-card b {
  color: #ff6a00;
}

.radio-row,
.dict-hint {
  padding: 10px 16px 16px;
}

.dict-hint p {
  margin: 6px 0;
  color: #68717d;
  font-size: 13px;
}

.dish-choices {
  padding: 10px 16px 16px;
}

.upload-block {
  display: grid;
  grid-template-columns: 6.2em minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
}

.upload-block > span {
  color: #646566;
  font-size: 14px;
}

.upload-preview {
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  border-radius: 8px;
  color: #9aa3ad;
  background: #f6f7f9;
  overflow: hidden;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-preview {
  width: 74px;
  height: 74px;
  border-radius: 50%;
}

.dish-choices p {
  margin: 8px 0;
  color: #68717d;
  font-size: 13px;
}

.choice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.choice-tags button {
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 15px;
  color: #5a3300;
  background: #fff0cf;
}

.choice-tags button.active {
  color: #fff;
  background: #ff9f1c;
}

.mini-button {
  height: 30px;
  margin-left: 6px;
  padding: 0 10px;
  border: 1px solid #d8dee6;
  border-radius: 15px;
  background: white;
}

.mini-button.primary {
  color: white;
  border-color: #1989fa;
  background: #1989fa;
}

.mini-button.danger {
  color: #ee0a24;
}
</style>
