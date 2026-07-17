<template>
  <main class="page tasks-page">
    <section class="tasks-hero">
      <div>
        <h1>家庭任务</h1>
        <p>{{ pendingCount }} 个待处理 · {{ publicTasks.length }} 个公共任务</p>
      </div>
      <van-button round icon="plus" type="primary" @click="openCreate">新增</van-button>
    </section>

    <van-tabs v-model:active="tab" class="color-tabs">
      <van-tab title="我的">
        <task-cards :items="myTasks" @take="take" @done="done" />
      </van-tab>
      <van-tab title="大厅">
        <task-cards :items="publicTasks" @take="take" @done="done" />
      </van-tab>
      <van-tab title="全部">
        <task-cards :items="tasks" @take="take" @done="done" />
      </van-tab>
    </van-tabs>

    <van-dialog v-model:show="show" title="新任务" show-cancel-button @confirm="save">
      <van-field v-model.trim="form.title" label="标题" placeholder="例如：买鸡蛋" />
      <van-field v-model.trim="form.content" label="内容" type="textarea" autosize placeholder="补充说明，可不填" />
      <van-field label="指派" readonly is-link :model-value="assigneeName" @click="assigneePickerVisible = true" />
    </van-dialog>

    <van-popup v-model:show="assigneePickerVisible" round position="bottom">
      <van-picker title="指派给谁" :columns="assigneeColumns" @cancel="assigneePickerVisible = false" @confirm="pickAssignee" />
    </van-popup>
  </main>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, type PropType } from 'vue';
import { showSuccessToast } from 'vant';
import { api, type TaskItem, type User } from '../api/client';
import { useAuthStore } from '../stores/auth';

type UserOption = Pick<User, 'id' | 'username' | 'name' | 'role' | 'avatar'>;

const auth = useAuthStore();
const tab = ref(0);
const show = ref(false);
const assigneePickerVisible = ref(false);
const tasks = ref<TaskItem[]>([]);
const users = ref<UserOption[]>([]);
const form = reactive({ title: '', content: '', assigneeId: null as number | null });

const statusMap = { PENDING: '待处理', IN_PROGRESS: '处理中', DONE: '完成' };
const myTasks = computed(() => tasks.value.filter((task) => task.assignee?.id === auth.user?.id || task.creator.id === auth.user?.id));
const publicTasks = computed(() => tasks.value.filter((task) => !task.assignee && task.status !== 'DONE'));
const pendingCount = computed(() => tasks.value.filter((task) => task.status !== 'DONE').length);
const assigneeName = computed(() => form.assigneeId ? users.value.find((user) => user.id === form.assigneeId)?.name || '未选择' : '公共任务大厅');
const assigneeColumns = computed(() => [
  { text: '公共任务大厅', value: 0 },
  ...users.value
    .filter((user) => user.role !== 'ADMIN')
    .map((user) => ({ text: `${user.name}（${user.username}）`, value: user.id }))
]);

const TaskCards = defineComponent({
  props: { items: { type: Array as PropType<TaskItem[]>, required: true } },
  emits: ['take', 'done'],
  setup(props, { emit }) {
    return () => props.items.length
      ? h('div', { class: 'task-list' }, props.items.map((task) => h('article', { class: ['task-card', `status-${task.status}`] }, [
        h('div', { class: 'task-card-head' }, [
          h('strong', task.title),
          h('span', statusMap[task.status])
        ]),
        h('p', task.content || '没有补充说明'),
        h('div', { class: 'task-meta' }, [
          h('span', `创建：${task.creator.name}`),
          h('span', `负责：${task.assignee?.name || '公共任务'}`)
        ]),
        h('div', { class: 'task-actions' }, [
          task.status === 'PENDING' ? h('button', { onClick: () => emit('take', task.id) }, '接单') : null,
          task.status !== 'DONE' ? h('button', { class: 'primary', onClick: () => emit('done', task.id) }, '完成') : null
        ])
      ])))
      : h('div', { class: 'empty-card' }, '暂无任务');
  }
});

async function load() {
  [tasks.value, users.value] = await Promise.all([
    api.get<TaskItem[]>('/tasks'),
    api.get<UserOption[]>('/users/options')
  ]);
}

function openCreate() {
  Object.assign(form, { title: '', content: '', assigneeId: null });
  show.value = true;
}

function pickAssignee(option: any) {
  const value = Number(option.selectedOptions?.[0]?.value ?? option.value);
  form.assigneeId = value || null;
  assigneePickerVisible.value = false;
}

async function save() {
  await api.post('/tasks', {
    title: form.title,
    content: form.content,
    assigneeId: form.assigneeId
  });
  showSuccessToast('已创建');
  load();
}

async function take(id: number) {
  await api.post(`/tasks/${id}/take`);
  load();
}

async function done(id: number) {
  await api.post(`/tasks/${id}/done`);
  load();
}

onMounted(load);
</script>

<style scoped>
.tasks-page {
  background: #f7f6fb;
}

.tasks-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-radius: 8px;
  color: #21163f;
  background: linear-gradient(135deg, #dcd2ff, #ffc9de);
}

.tasks-hero h1 {
  margin: 0;
  font-size: 25px;
}

.tasks-hero p {
  margin: 6px 0 0;
  color: rgba(33, 22, 63, 0.72);
}

.color-tabs {
  margin-top: 10px;
}

.task-list {
  display: grid;
  gap: 10px;
  padding-top: 12px;
}

.task-card {
  padding: 14px;
  border-radius: 8px;
  background: #fff;
  border-left: 5px solid #ffbf24;
}

.task-card.status-IN_PROGRESS {
  border-left-color: #1989fa;
}

.task-card.status-DONE {
  border-left-color: #20b26b;
}

.task-card-head,
.task-meta,
.task-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-card-head strong {
  min-width: 0;
  overflow: hidden;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card-head span {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 11px;
  color: #7a5b00;
  background: #fff4cf;
  font-size: 12px;
}

.task-card p {
  margin: 10px 0;
  color: #566170;
  line-height: 1.45;
}

.task-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
  color: #8b95a1;
  font-size: 12px;
}

.task-actions {
  justify-content: flex-end;
  margin-top: 12px;
}

.task-actions button {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #d8dee6;
  border-radius: 16px;
  background: #fff;
}

.task-actions button.primary {
  color: #fff;
  border-color: #1989fa;
  background: #1989fa;
}

.empty-card {
  margin-top: 12px;
  padding: 36px 0;
  border-radius: 8px;
  color: #8b95a1;
  text-align: center;
  background: #fff;
}
</style>
