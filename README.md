# WhatShouldWeEat / 今日想吃啥

家庭内部使用的轻量化 H5 应用，包含登录、用户管理、菜品管理、点菜记录、冰箱库存和家庭任务。

## 技术栈

- 前端：Vue 3、Vite、TypeScript、Vue Router、Pinia、Vant
- 后端：Node.js、Fastify、JWT、Prisma
- 数据库：SQLite
- 文件：本地 `data/uploads`

## 本地启动

首次启动：

```bash
npm install
npm run dev
```

`npm run dev` 会自动执行 `prisma generate` 和 `prisma db push`，然后同时启动前端和后端。
如果换到一个没有 `.env` 的新环境，先执行 `cp .env.example .env`。

访问：

- 前端 H5：http://localhost:5173
- 后端 API：http://localhost:3000/api/health

初始账号：

- 账号：`admin`
- 密码：`123456`

首次登录后会要求修改密码。
登录页也支持注册普通用户，注册接口会强制创建 `USER` 角色，不能注册管理员。

## 常用命令

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
npm run prisma:studio
npm run build
npm run start
```

## Docker 启动

默认公开镜像地址：

```text
ghcr.io/llnext/whatshouldweeat:latest
```

```bash
docker compose up -d
```

Docker 会把 SQLite 数据库和上传文件持久化到宿主机的 `data/` 目录。容器启动后访问：

```text
http://localhost:3000
```

## GitHub Actions 镜像

仓库已包含 `.github/workflows/docker-image.yml`。推送到 `main` 分支或手动触发 workflow 时，会构建并推送多架构镜像：

```text
linux/amd64
linux/arm64
```

默认推送到 GitHub Container Registry：

```text
ghcr.io/<你的 GitHub 用户名或组织名>/<仓库名>:latest
ghcr.io/<你的 GitHub 用户名或组织名>/<仓库名>:<commit-sha>
```

当前仓库对应：

```text
ghcr.io/llnext/whatshouldweeat:latest
ghcr.io/llnext/whatshouldweeat:<commit-sha>
```

首次使用 GHCR 时，如果镜像是私有的，需要在 GitHub Packages 页面调整可见性或在服务器上登录：

```bash
docker login ghcr.io
docker pull ghcr.io/<你的 GitHub 用户名或组织名>/<仓库名>:latest
```

## 目录结构

```text
WhatShouldWeEat/
├── frontend/          # Vue3 H5
├── backend/           # Fastify API
├── prisma/            # Prisma schema
├── data/              # SQLite 和上传目录
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## 已实现 MVP

- JWT 登录与首次改密
- 管理员用户管理与重置密码
- 食材、口味、分类字典管理
- 菜品增改查删，支持食材、口味和价格
- 用户浏览菜品并点菜，记录价格快照
- 今日菜单、历史记录、菜品统计
- 冰箱库存查看和维护
- 家庭任务创建、公共大厅、接单、完成
