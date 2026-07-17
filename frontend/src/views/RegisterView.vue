<template>
  <main class="page no-tabbar register">
    <div class="topbar">
      <div>
        <h1 class="title">注册普通用户</h1>
        <p class="subtitle">注册后可点菜、维护冰箱和领取任务</p>
      </div>
    </div>

    <van-form @submit="submit">
      <van-cell-group inset>
        <van-field v-model.trim="form.username" name="username" label="账号" placeholder="请输入账号" :rules="[{ required: true, message: '请输入账号' }]" />
        <van-field v-model.trim="form.name" name="name" label="姓名" placeholder="家庭内显示的名字" :rules="[{ required: true, message: '请输入姓名' }]" />
        <van-field v-model="form.birthday" name="birthday" label="生日" placeholder="YYYY-MM-DD，可不填" />
        <van-field v-model="form.password" name="password" label="密码" type="password" placeholder="至少 6 位" :rules="[{ required: true, validator: validatePassword, message: '密码至少 6 位' }]" />
        <van-field v-model="form.confirmPassword" name="confirmPassword" label="确认" type="password" placeholder="再次输入密码" :rules="[{ required: true, validator: validateConfirm, message: '两次密码不一致' }]" />
      </van-cell-group>

      <div class="submit">
        <van-button block round type="primary" native-type="submit" :loading="loading">注册并进入</van-button>
        <van-button block round plain class="login-link" @click="router.replace('/login')">返回登录</van-button>
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
const form = reactive({
  username: '',
  name: '',
  birthday: '',
  password: '',
  confirmPassword: ''
});

const validatePassword = (value: string) => value.length >= 6;
const validateConfirm = (value: string) => value === form.password;

async function submit() {
  loading.value = true;
  try {
    await auth.register({
      username: form.username,
      name: form.name,
      birthday: form.birthday || undefined,
      password: form.password
    });
    showSuccessToast('注册成功');
    router.replace('/');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.submit {
  margin: 18px 16px 0;
}

.login-link {
  margin-top: 10px;
}
</style>
