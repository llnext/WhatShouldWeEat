<template>
  <main class="page no-tabbar">
    <div class="topbar">
      <div>
        <h1 class="title">修改初始密码</h1>
        <p class="subtitle">管理员和新用户首次登录后必须完成这一步</p>
      </div>
    </div>
    <van-form @submit="submit">
      <van-cell-group inset>
        <van-field v-model="form.oldPassword" label="原密码" type="password" :rules="[{ required: true }]" />
        <van-field v-model="form.newPassword" label="新密码" type="password" :rules="[{ required: true, validator: validatePassword, message: '至少 6 位' }]" />
      </van-cell-group>
      <div class="submit">
        <van-button block round type="primary" native-type="submit" :loading="loading">保存并进入</van-button>
      </div>
    </van-form>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast } from 'vant';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({ oldPassword: '', newPassword: '' });
const validatePassword = (value: string) => value.length >= 6;

async function submit() {
  loading.value = true;
  try {
    await api.post('/auth/change-password', form);
    await auth.refresh();
    showSuccessToast('已更新密码');
    router.replace('/');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.submit {
  margin: 18px 16px 0;
}
</style>
