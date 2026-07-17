<template>
  <main class="page no-tabbar login">
    <div class="brand">
      <h1>今日想吃啥</h1>
      <p>家庭点菜、冰箱和任务一起管</p>
    </div>
    <van-form @submit="submit">
      <van-cell-group inset>
        <van-field v-model="form.username" name="username" label="账号" placeholder="请输入账号" :rules="[{ required: true }]" />
        <van-field v-model="form.password" name="password" label="密码" type="password" placeholder="请输入密码" :rules="[{ required: true }]" />
      </van-cell-group>
      <div class="submit">
        <van-button block round type="primary" native-type="submit" :loading="loading">登录</van-button>
        <van-button block round plain type="primary" class="register-link" @click="router.push('/register')">注册普通用户</van-button>
      </div>
    </van-form>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { showSuccessToast } from 'vant';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const form = reactive({ username: '', password: '' });

async function submit() {
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    showSuccessToast('登录成功');
    router.replace(auth.user?.mustChangePassword ? '/change-password' : '/');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.brand {
  margin: 0 18px 28px;
}

.brand h1 {
  margin: 0;
  font-size: 34px;
}

.brand p {
  margin: 8px 0 0;
  color: #68717d;
}

.submit {
  margin: 18px 16px 0;
}

.register-link {
  margin-top: 10px;
}
</style>
