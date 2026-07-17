<template>
  <router-view />
  <van-tabbar v-if="showTabbar" route safe-area-inset-bottom>
    <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
    <van-tabbar-item to="/dishes" icon="shop-o">菜品</van-tabbar-item>
    <van-tabbar-item to="/orders" icon="notes-o">记录</van-tabbar-item>
    <van-tabbar-item to="/fridge" icon="cart-o">冰箱</van-tabbar-item>
    <van-tabbar-item to="/tasks" icon="todo-list-o">任务</van-tabbar-item>
    <van-tabbar-item to="/sweet-points" icon="gold-coin-o">甜蜜点</van-tabbar-item>
    <van-tabbar-item v-if="auth.isAdmin" to="/admin" icon="setting-o">管理</van-tabbar-item>
  </van-tabbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';

const route = useRoute();
const auth = useAuthStore();
const showTabbar = computed(() => auth.isLoggedIn && !['/login', '/change-password'].includes(route.path));
</script>
