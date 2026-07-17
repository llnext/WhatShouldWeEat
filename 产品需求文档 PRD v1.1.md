# 产品需求文档 PRD v1.1

# 1. 项目概述

## 项目名称

中文：

> 今日想吃啥

英文：

> WhatShouldWeEat

------

## 项目定位

WhatShouldWeEat 是一个家庭内部使用的轻量化 H5 应用。

主要功能：

- 家庭成员点菜
- 菜谱管理
- 每日饮食记录
- 冰箱库存管理
- 家庭任务管理

目标：

> 记录家庭每天吃什么，让做饭和生活管理更有互动感。

------

# 2. 项目开发形式

## 单工程项目

要求：

整个项目必须保持为一个工程。

代码仓库：

```
WhatShouldWeEat
```

不拆分为：

```
frontend-project
backend-project
```

------

## 推荐目录结构

```
WhatShouldWeEat/

├── frontend/
│   └── Vue3 H5

├── backend/
│   └── Node.js API

├── prisma/
│   └── schema.prisma

├── data/
│   ├── database.sqlite
│   └── uploads/

├── docker-compose.yml

├── Dockerfile

├── package.json

└── README.md
```

------

# 3. 技术要求

## 前端

使用：

- Vue3
- Vite
- TypeScript
- Vue Router
- Pinia
- 移动端 UI 框架

推荐：

```
Vue3 + Vant
```

要求：

- 手机优先
- PC 浏览器可访问
- 响应式布局

------

## 后端

使用：

Node.js

推荐：

```
Fastify
```

或：

```
Express
```

要求：

- REST API
- JWT 登录
- 权限控制
- 文件上传

------

## 数据库

使用：

```
SQLite
```

ORM：

推荐：

```
Prisma
```

------

# 4. 部署要求

## 开发环境

支持：

```
npm install

npm run dev
```

------

## 生产环境

支持：

Docker：

```
docker compose up -d
```

数据必须持久化：

```
/data

database.sqlite

uploads/
```

------

# 5. 用户体系

## 角色

固定：

```
管理员

普通用户
```

不考虑：

- 多家庭
- 多租户

------

# 6. 管理员

初始化账号：

```
账号：admin

密码：123456
```

首次登录：

必须修改密码。

流程：

```
登录

↓

检测首次登录

↓

修改密码

↓

进入系统
```

------

管理员功能：

## 用户管理

支持：

- 新增用户
- 删除用户
- 修改用户信息
- 重置密码

用户信息：

```
用户名

密码

姓名

生日

头像

角色
```

------

# 7. 用户功能

## 注册

第一版：

不开放自主注册。

由管理员创建。

------

## 登录

方式：

用户名 + 密码

------

## 点菜

用户：

- 浏览菜品
- 查看图片
- 查看食材
- 查看口味
- 查看价格
- 提交想吃

必须记录：

```
用户

菜品

时间

价格快照
```

------

# 8. 菜品系统

## 食材字典

管理员维护：

例如：

```
黄瓜

茄子

土豆

鸡蛋

糖

盐
```

------

## 口味字典

默认：

```
酸

甜

苦

辣

咸

鲜
```

------

## 分类

例如：

```
家常菜

早餐

汤

甜品

饮料
```

------

## 菜品字段

```
名称

分类

图片

描述

食材

口味

甜蜜点价格
```

允许：

```
价格=0
```

------

# 9. 点菜记录

数据：

```
谁点

点什么

什么时候点

价格是多少
```

历史不能变化。

保存：

```
price_snapshot
```

支持：

- 今日菜单
- 历史记录
- 菜品统计

------

# 10. 冰箱管理

所有用户：

均可维护。

记录：

```
食材

数量

单位

修改人

更新时间
```

默认：

信任维护结果。

------

# 11. 任务系统

独立任务。

不要求关联菜品。

例如：

```
买鸡蛋

买牛奶

取快递
```

功能：

- 创建任务
- 指定人员
- 公共任务大厅
- 接单
- 完成

状态：

```
待处理

处理中

完成
```

------

# 12. 图片存储

使用服务器本地存储。

目录：

```
data/uploads/

├── dishes

└── avatar
```

数据库保存路径。

------

# 13. 数据库核心表

## User

```
id

username

password_hash

name

birthday

avatar

role

must_change_password

created_at

updated_at
```

------

## Dish

```
id

name

category_id

price

image

description

created_at

updated_at
```

------

## Ingredient

```
id

name
```

------

## Taste

```
id

name
```

------

## MealOrder

```
id

user_id

dish_id

price_snapshot

status

created_at
```

------

## FridgeItem

```
id

ingredient_id

quantity

unit

updated_by

updated_at
```

------

## Task

```
id

title

content

creator_id

assignee_id

status

created_at

finished_at
```

------

# 14. 页面规划

## 用户端 H5

登录页

首页：

显示：

- 今日菜单
- 推荐菜品
- 冰箱摘要
- 我的任务

菜品页：

- 分类
- 搜索
- 点菜

记录页：

- 今日记录
- 历史记录

冰箱页：

- 查看
- 修改

任务页：

- 我的任务
- 公共任务

------

## 管理端

管理页面：

- 用户管理
- 菜品管理
- 食材管理
- 口味管理
- 分类管理

------

# 15. 第一阶段 MVP

必须实现：

## 后端

- 用户认证
- 权限
- 用户管理
- 菜品管理
- 食材管理
- 点菜记录
- 冰箱管理
- 任务管理

------

## 前端

- 登录
- 用户首页
- 菜品浏览
- 点菜
- 历史记录
- 冰箱
- 任务
- 管理后台

------

# 16. Codex 开发约束

请根据本文档开发。

要求：

- 不创建多个独立工程
- 不执行自动测试
- 不负责部署验证
- 不模拟用户验收流程

Codex 工作范围：

只负责：

- 编写代码
- 创建项目结构
- 实现功能
- 编写 README
- 提供启动方式

测试和最终验收：

由项目负责人手动完成。

------

# 17. 后续扩展（暂不实现）

未来可能增加：

- PWA
- 菜品推荐
- 冰箱智能推荐
- 做饭照片记录
- 甜蜜点系统
- 数据分析

------

文档版本：

```
v1.1
```

项目：

```
WhatShouldWeEat
```

状态：

```
准备进入开发阶段
```