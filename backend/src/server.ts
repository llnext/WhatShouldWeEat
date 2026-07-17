import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

process.env.JWT_SECRET ??= 'dev-secret-change-me';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

type AuthUser = {
  id: number;
  username: string;
  role: Role;
};

type Role = 'ADMIN' | 'USER';
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE'
} as const;

type IdParams = {
  id: string;
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = path.join(rootDir, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const frontendDistDir = path.join(rootDir, 'frontend', 'dist');
process.env.DATABASE_URL ??= `file:${path.join(dataDir, 'database.sqlite')}`;
const prisma = new PrismaClient();
const app = Fastify({ logger: true });

const parseDate = (value?: string | null) => value ? new Date(value) : null;
const toIntArray = (value: unknown) => Array.isArray(value) ? value.map(Number).filter(Boolean) : [];
const todayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};
const dayStart = (value?: string) => {
  if (!value) return todayStart();
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
};
const nextDay = (date: Date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
};
const dayRange = (value?: string) => {
  const start = dayStart(value);
  return { gte: start, lt: nextDay(start) };
};
const canModifyMealDate = (date: Date) => date >= todayStart();

async function ensureBootstrapData() {
  await fs.mkdir(path.join(uploadsDir, 'dishes'), { recursive: true });
  await fs.mkdir(path.join(uploadsDir, 'avatar'), { recursive: true });

  const passwordHash = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      name: '管理员',
      role: 'ADMIN',
      mustChangePassword: true
    }
  });

  await Promise.all(['酸', '甜', '苦', '辣', '咸', '鲜'].map((name) => prisma.taste.upsert({
    where: { name },
    update: {},
    create: { name }
  })));
  await Promise.all(['家常菜', '早餐', '汤', '甜品', '饮料'].map((name) => prisma.category.upsert({
    where: { name },
    update: {},
    create: { name }
  })));
  await Promise.all(['黄瓜', '茄子', '土豆', '鸡蛋', '糖', '盐'].map((name) => prisma.ingredient.upsert({
    where: { name },
    update: {},
    create: { name }
  })));
}

function signUser(user: AuthUser) {
  return app.jwt.sign(user, { expiresIn: '7d' });
}

async function auth(request: FastifyRequest, reply: FastifyReply) {
  try {
    request.authUser = await request.jwtVerify<AuthUser>();
  } catch {
    return reply.code(401).send({ message: '请先登录' });
  }
}

async function adminOnly(request: FastifyRequest, reply: FastifyReply) {
  await auth(request, reply);
  if (reply.sent) return;
  if (request.authUser?.role !== 'ADMIN') {
    return reply.code(403).send({ message: '需要管理员权限' });
  }
}

const userSelect = {
  id: true,
  username: true,
  name: true,
  birthday: true,
  avatar: true,
  role: true,
  sweetPoints: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true
};

const dishInclude = {
  category: true,
  ingredients: { include: { ingredient: true } },
  tastes: { include: { taste: true } }
};

function normalizeDish(dish: any) {
  return {
    ...dish,
    ingredients: dish.ingredients?.map((item: any) => item.ingredient) ?? [],
    tastes: dish.tastes?.map((item: any) => item.taste) ?? []
  };
}

app.register(cors, { origin: true });
app.register(jwt, { secret: process.env.JWT_SECRET });
app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });
app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/'
});

app.get('/api/health', async () => ({ ok: true }));

app.post('/api/auth/register', async (request, reply) => {
  const body = request.body as { username?: string; password?: string; name?: string; birthday?: string; avatar?: string };
  const username = body.username?.trim();
  const name = body.name?.trim();

  if (!username || !body.password || !name) {
    return reply.code(400).send({ message: '账号、密码和姓名不能为空' });
  }
  if (body.password.length < 6) {
    return reply.code(400).send({ message: '密码至少 6 位' });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await bcrypt.hash(body.password, 10),
        name,
        birthday: parseDate(body.birthday),
        avatar: body.avatar,
        role: 'USER',
        mustChangePassword: false
      },
      select: userSelect
    });
    const payload: AuthUser = { id: user.id, username: user.username, role: 'USER' };
    return {
      token: signUser(payload),
      user: {
        ...payload,
        name: user.name,
        avatar: user.avatar,
        sweetPoints: user.sweetPoints,
        mustChangePassword: false
      }
    };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return reply.code(409).send({ message: '账号已存在' });
    }
    throw error;
  }
});

app.post('/api/auth/login', async (request, reply) => {
  const body = request.body as { username?: string; password?: string };
  const user = await prisma.user.findUnique({ where: { username: body.username ?? '' } });
  if (!user || !await bcrypt.compare(body.password ?? '', user.passwordHash)) {
    return reply.code(401).send({ message: '用户名或密码错误' });
  }

  const payload: AuthUser = { id: user.id, username: user.username, role: user.role as Role };
  return {
    token: signUser(payload),
    user: {
      ...payload,
      name: user.name,
      avatar: user.avatar,
      sweetPoints: user.sweetPoints,
      mustChangePassword: user.mustChangePassword
    }
  };
});

app.get('/api/auth/me', { preHandler: auth }, async (request) => {
  return prisma.user.findUnique({ where: { id: request.authUser!.id }, select: userSelect });
});

app.get('/api/me/sweet-point-logs', { preHandler: auth }, async (request) => {
  return prisma.sweetPointLog.findMany({
    where: { userId: request.authUser!.id },
    take: 100,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      amount: true,
      balance: true,
      reason: true,
      createdAt: true
    }
  });
});

app.post('/api/auth/change-password', { preHandler: auth }, async (request, reply) => {
  const body = request.body as { oldPassword?: string; newPassword?: string };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: request.authUser!.id } });
  if (!await bcrypt.compare(body.oldPassword ?? '', user.passwordHash)) {
    return reply.code(401).send({ message: '原密码错误' });
  }
  if (!body.newPassword || body.newPassword.length < 6) {
    return reply.code(400).send({ message: '新密码至少 6 位' });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(body.newPassword, 10),
      mustChangePassword: false
    }
  });
  return { ok: true };
});

app.post('/api/upload/:type', { preHandler: auth }, async (request, reply) => {
  const { type } = request.params as { type: 'dishes' | 'avatar' };
  if (!['dishes', 'avatar'].includes(type)) return reply.code(400).send({ message: '无效上传类型' });
  if (type === 'dishes' && request.authUser?.role !== 'ADMIN') return reply.code(403).send({ message: '需要管理员权限' });

  const file = await request.file();
  if (!file) return reply.code(400).send({ message: '请选择文件' });
  if (!file.mimetype.startsWith('image/')) return reply.code(400).send({ message: '只支持图片文件' });

  const extMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif'
  };
  const ext = extMap[file.mimetype] || path.extname(file.filename).toLowerCase() || '.jpg';
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
  const target = path.join(uploadsDir, type, filename);
  await fs.writeFile(target, await file.toBuffer());
  const publicPath = `/uploads/${type}/${filename}`;
  return { path: publicPath, url: publicPath };
});

app.get('/api/dashboard', { preHandler: auth }, async (request) => {
  const [todayOrders, dishes, fridge, tasks] = await Promise.all([
    prisma.mealOrder.findMany({
      where: { mealDate: dayRange() },
      orderBy: [{ mealDate: 'desc' }, { createdAt: 'desc' }],
      include: { user: { select: userSelect }, dish: true }
    }),
    prisma.dish.findMany({ where: { isAvailable: true }, take: 8, orderBy: { updatedAt: 'desc' }, include: dishInclude }),
    prisma.fridgeItem.findMany({ take: 6, orderBy: { updatedAt: 'desc' }, include: { ingredient: true, updatedBy: { select: userSelect } } }),
    prisma.task.findMany({
      where: { OR: [{ assigneeId: request.authUser!.id }, { assigneeId: null }] },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: userSelect }, assignee: { select: userSelect } }
    })
  ]);
  return { todayOrders, dishes: dishes.map(normalizeDish), fridge, tasks };
});

app.get('/api/users', { preHandler: adminOnly }, async () => {
  return prisma.user.findMany({ orderBy: { id: 'asc' }, select: userSelect });
});

app.post('/api/users', { preHandler: adminOnly }, async (request) => {
  const body = request.body as { username: string; password?: string; name: string; birthday?: string; avatar?: string; role?: Role };
  return prisma.user.create({
    data: {
      username: body.username,
      passwordHash: await bcrypt.hash(body.password || '123456', 10),
      name: body.name,
      birthday: parseDate(body.birthday),
      avatar: body.avatar,
      role: body.role ?? 'USER',
      mustChangePassword: true
    },
    select: userSelect
  });
});

app.get('/api/users/options', { preHandler: auth }, async () => {
  return prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, username: true, name: true, role: true, avatar: true }
  });
});

app.put('/api/users/:id', { preHandler: adminOnly }, async (request) => {
  const body = request.body as { name?: string; birthday?: string | null; avatar?: string | null; role?: Role };
  return prisma.user.update({
    where: { id: Number((request.params as IdParams).id) },
    data: {
      name: body.name,
      birthday: parseDate(body.birthday),
      avatar: body.avatar,
      role: body.role
    },
    select: userSelect
  });
});

app.delete('/api/users/:id', { preHandler: adminOnly }, async (request, reply) => {
  const id = Number((request.params as IdParams).id);
  if (id === request.authUser!.id) return reply.code(400).send({ message: '不能删除自己' });
  await prisma.user.delete({ where: { id } });
  return { ok: true };
});

app.post('/api/users/:id/reset-password', { preHandler: adminOnly }, async (request) => {
  await prisma.user.update({
    where: { id: Number((request.params as IdParams).id) },
    data: {
      passwordHash: await bcrypt.hash('123456', 10),
      mustChangePassword: true
    }
  });
  return { password: '123456' };
});

app.post('/api/users/:id/sweet-points/set', { preHandler: adminOnly }, async (request, reply) => {
  const id = Number((request.params as IdParams).id);
  const body = request.body as { amount?: number; reason?: string };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return reply.code(400).send({ message: '甜蜜点不能小于 0' });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.user.update({
    where: { id },
    data: { sweetPoints: amount },
    select: userSelect
  });
  await prisma.sweetPointLog.create({
    data: {
      userId: id,
      adminId: request.authUser!.id,
      type: 'SET',
      amount: amount - user.sweetPoints,
      balance: amount,
      reason: body.reason || '管理员设置'
    }
  });
  return updated;
});

app.post('/api/users/:id/sweet-points/reward', { preHandler: adminOnly }, async (request, reply) => {
  const id = Number((request.params as IdParams).id);
  const body = request.body as { amount?: number; reason?: string };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return reply.code(400).send({ message: '奖励甜蜜点必须大于 0' });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { sweetPoints: { increment: amount } },
    select: userSelect
  });
  await prisma.sweetPointLog.create({
    data: {
      userId: id,
      adminId: request.authUser!.id,
      type: 'REWARD',
      amount,
      balance: updated.sweetPoints,
      reason: body.reason || '管理员奖励'
    }
  });
  return updated;
});

app.get('/api/users/:id/sweet-point-logs', { preHandler: adminOnly }, async (request) => {
  return prisma.sweetPointLog.findMany({
    where: { userId: Number((request.params as IdParams).id) },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      admin: { select: userSelect }
    }
  });
});

function dictionaryRoutes(name: 'ingredients' | 'tastes' | 'categories', model: any) {
  app.get(`/api/${name}`, { preHandler: auth }, async () => model.findMany({ orderBy: { id: 'asc' } }));
  app.post(`/api/${name}`, { preHandler: adminOnly }, async (request) => {
    const body = request.body as { name: string };
    return model.create({ data: { name: body.name } });
  });
  app.put(`/api/${name}/:id`, { preHandler: adminOnly }, async (request) => {
    const body = request.body as { name: string };
    return model.update({ where: { id: Number((request.params as IdParams).id) }, data: { name: body.name } });
  });
  app.delete(`/api/${name}/:id`, { preHandler: adminOnly }, async (request) => {
    await model.delete({ where: { id: Number((request.params as IdParams).id) } });
    return { ok: true };
  });
}

dictionaryRoutes('ingredients', prisma.ingredient);
dictionaryRoutes('tastes', prisma.taste);
dictionaryRoutes('categories', prisma.category);

app.get('/api/dishes', { preHandler: auth }, async (request) => {
  const query = request.query as { keyword?: string; categoryId?: string; includeUnavailable?: string };
  const dishes = await prisma.dish.findMany({
    where: {
      name: query.keyword ? { contains: query.keyword } : undefined,
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,
      isAvailable: request.authUser?.role === 'ADMIN' && query.includeUnavailable === '1' ? undefined : true
    },
    orderBy: { updatedAt: 'desc' },
    include: dishInclude
  });
  return dishes.map(normalizeDish);
});

app.post('/api/dishes', { preHandler: adminOnly }, async (request) => {
  const body = request.body as { name: string; categoryId?: number; price?: number; isAvailable?: boolean; image?: string; description?: string; ingredientIds?: number[]; tasteIds?: number[] };
  const dish = await prisma.dish.create({
    data: {
      name: body.name,
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      price: Number(body.price ?? 0),
      isAvailable: body.isAvailable ?? true,
      image: body.image,
      description: body.description,
      ingredients: { create: toIntArray(body.ingredientIds).map((ingredientId) => ({ ingredientId })) },
      tastes: { create: toIntArray(body.tasteIds).map((tasteId) => ({ tasteId })) }
    },
    include: dishInclude
  });
  return normalizeDish(dish);
});

app.put('/api/dishes/:id', { preHandler: adminOnly }, async (request) => {
  const id = Number((request.params as IdParams).id);
  const body = request.body as { name?: string; categoryId?: number | null; price?: number; isAvailable?: boolean; image?: string | null; description?: string | null; ingredientIds?: number[]; tasteIds?: number[] };
  const dish = await prisma.$transaction(async (tx) => {
    await tx.dishIngredient.deleteMany({ where: { dishId: id } });
    await tx.dishTaste.deleteMany({ where: { dishId: id } });
    return tx.dish.update({
      where: { id },
      data: {
        name: body.name,
        categoryId: body.categoryId ? Number(body.categoryId) : null,
        price: body.price === undefined ? undefined : Number(body.price),
        isAvailable: body.isAvailable,
        image: body.image,
        description: body.description,
        ingredients: { create: toIntArray(body.ingredientIds).map((ingredientId) => ({ ingredientId })) },
        tastes: { create: toIntArray(body.tasteIds).map((tasteId) => ({ tasteId })) }
      },
      include: dishInclude
    });
  });
  return normalizeDish(dish);
});

app.delete('/api/dishes/:id', { preHandler: adminOnly }, async (request) => {
  await prisma.dish.delete({ where: { id: Number((request.params as IdParams).id) } });
  return { ok: true };
});

app.post('/api/orders', { preHandler: auth }, async (request, reply) => {
  const body = request.body as { dishId: number; mealDate?: string };
  const mealDate = dayStart(body.mealDate);
  if (!canModifyMealDate(mealDate)) {
    return reply.code(400).send({ message: '不能给过去的日期点菜' });
  }

  return prisma.$transaction(async (tx) => {
    const dish = await tx.dish.findUniqueOrThrow({ where: { id: Number(body.dishId) } });
    if (!dish.isAvailable) {
      const error = new Error('这个菜暂时不可点') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }
    const charged = await tx.user.updateMany({
      where: { id: request.authUser!.id, sweetPoints: { gte: dish.price } },
      data: { sweetPoints: { decrement: dish.price } }
    });
    if (charged.count === 0) {
      const error = new Error('甜蜜点余额不足') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: request.authUser!.id } });
    await tx.sweetPointLog.create({
      data: {
        userId: request.authUser!.id,
        adminId: request.authUser!.id,
        type: 'ORDER_SPEND',
        amount: -dish.price,
        balance: user.sweetPoints,
        reason: `点菜：${dish.name}`
      }
    });
    return tx.mealOrder.create({
      data: {
        userId: request.authUser!.id,
        dishId: dish.id,
        priceSnapshot: dish.price,
        mealDate
      },
      include: { user: { select: userSelect }, dish: true }
    });
  });
});

app.get('/api/orders', { preHandler: auth }, async (request) => {
  const query = request.query as { today?: string; date?: string };
  const dateFilter = query.date ? dayRange(query.date) : query.today === '1' ? dayRange() : undefined;
  return prisma.mealOrder.findMany({
    where: dateFilter ? { mealDate: dateFilter } : undefined,
    orderBy: [{ mealDate: 'desc' }, { createdAt: 'desc' }],
    include: { user: { select: userSelect }, dish: true }
  });
});

app.put('/api/orders/:id', { preHandler: auth }, async (request, reply) => {
  const id = Number((request.params as IdParams).id);
  const body = request.body as { dishId?: number; mealDate?: string };

  return prisma.$transaction(async (tx) => {
    const order = await tx.mealOrder.findUniqueOrThrow({ where: { id }, include: { dish: true } });
    if (order.userId !== request.authUser!.id && request.authUser!.role !== 'ADMIN') {
      return reply.code(403).send({ message: '只能修改自己的点菜记录' });
    }
    if (!canModifyMealDate(order.mealDate)) {
      return reply.code(400).send({ message: '过去的点菜记录不能修改' });
    }

    const nextMealDate = body.mealDate ? dayStart(body.mealDate) : order.mealDate;
    if (!canModifyMealDate(nextMealDate)) {
      return reply.code(400).send({ message: '不能修改到过去的日期' });
    }

    const nextDish = body.dishId ? await tx.dish.findUniqueOrThrow({ where: { id: Number(body.dishId) } }) : order.dish;
    if (!nextDish.isAvailable) {
      return reply.code(400).send({ message: '这个菜暂时不可点' });
    }
    const delta = nextDish.price - order.priceSnapshot;
    if (delta > 0) {
      const charged = await tx.user.updateMany({
        where: { id: order.userId, sweetPoints: { gte: delta } },
        data: { sweetPoints: { decrement: delta } }
      });
      if (charged.count === 0) {
        return reply.code(400).send({ message: '甜蜜点余额不足' });
      }
    } else if (delta < 0) {
      await tx.user.update({ where: { id: order.userId }, data: { sweetPoints: { increment: Math.abs(delta) } } });
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: order.userId } });
    if (delta !== 0) {
      await tx.sweetPointLog.create({
        data: {
          userId: order.userId,
          adminId: request.authUser!.id,
          type: 'ORDER_ADJUST',
          amount: -delta,
          balance: user.sweetPoints,
          reason: `修改点菜：${order.dish.name} -> ${nextDish.name}`
        }
      });
    }

    return tx.mealOrder.update({
      where: { id },
      data: {
        dishId: nextDish.id,
        priceSnapshot: nextDish.price,
        mealDate: nextMealDate
      },
      include: { user: { select: userSelect }, dish: true }
    });
  });
});

app.delete('/api/orders/:id', { preHandler: auth }, async (request, reply) => {
  const id = Number((request.params as IdParams).id);
  return prisma.$transaction(async (tx) => {
    const order = await tx.mealOrder.findUniqueOrThrow({ where: { id }, include: { dish: true } });
    if (order.userId !== request.authUser!.id && request.authUser!.role !== 'ADMIN') {
      return reply.code(403).send({ message: '只能删除自己的点菜记录' });
    }
    if (!canModifyMealDate(order.mealDate)) {
      return reply.code(400).send({ message: '过去的点菜记录不能删除' });
    }

    const user = await tx.user.update({
      where: { id: order.userId },
      data: { sweetPoints: { increment: order.priceSnapshot } }
    });
    await tx.sweetPointLog.create({
      data: {
        userId: order.userId,
        adminId: request.authUser!.id,
        type: 'ORDER_REFUND',
        amount: order.priceSnapshot,
        balance: user.sweetPoints,
        reason: `删除点菜：${order.dish.name}`
      }
    });
    await tx.mealOrder.delete({ where: { id } });
    return { ok: true, refunded: order.priceSnapshot };
  });
});

app.get('/api/orders/stats', { preHandler: auth }, async () => {
  const rows = await prisma.mealOrder.groupBy({
    by: ['dishId'],
    _count: { dishId: true },
    orderBy: { _count: { dishId: 'desc' } },
    take: 10
  });
  const dishes = await prisma.dish.findMany({ where: { id: { in: rows.map((row) => row.dishId) } } });
  return rows.map((row) => ({
    dish: dishes.find((dish) => dish.id === row.dishId),
    count: row._count.dishId
  }));
});

app.get('/api/fridge', { preHandler: auth }, async () => {
  return prisma.fridgeItem.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { ingredient: true, updatedBy: { select: userSelect } }
  });
});

app.post('/api/fridge', { preHandler: auth }, async (request) => {
  const body = request.body as { ingredientId: number; quantity: number; unit: string };
  return prisma.fridgeItem.create({
    data: {
      ingredientId: Number(body.ingredientId),
      quantity: Number(body.quantity),
      unit: body.unit,
      updatedById: request.authUser!.id
    },
    include: { ingredient: true, updatedBy: { select: userSelect } }
  });
});

app.put('/api/fridge/:id', { preHandler: auth }, async (request) => {
  const body = request.body as { ingredientId?: number; quantity?: number; unit?: string };
  return prisma.fridgeItem.update({
    where: { id: Number((request.params as IdParams).id) },
    data: {
      ingredientId: body.ingredientId ? Number(body.ingredientId) : undefined,
      quantity: body.quantity === undefined ? undefined : Number(body.quantity),
      unit: body.unit,
      updatedById: request.authUser!.id
    },
    include: { ingredient: true, updatedBy: { select: userSelect } }
  });
});

app.delete('/api/fridge/:id', { preHandler: auth }, async (request) => {
  await prisma.fridgeItem.delete({ where: { id: Number((request.params as IdParams).id) } });
  return { ok: true };
});

app.get('/api/tasks', { preHandler: auth }, async () => {
  return prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: userSelect }, assignee: { select: userSelect } }
  });
});

app.post('/api/tasks', { preHandler: auth }, async (request, reply) => {
  const body = request.body as { title: string; content?: string; assigneeId?: number | null };
  if (body.assigneeId) {
    const assignee = await prisma.user.findUniqueOrThrow({ where: { id: Number(body.assigneeId) } });
    if (assignee.role === 'ADMIN') {
      return reply.code(400).send({ message: '任务不能指派给管理员' });
    }
  }
  return prisma.task.create({
    data: {
      title: body.title,
      content: body.content,
      creatorId: request.authUser!.id,
      assigneeId: body.assigneeId ? Number(body.assigneeId) : null
    },
    include: { creator: { select: userSelect }, assignee: { select: userSelect } }
  });
});

app.post('/api/tasks/:id/take', { preHandler: auth }, async (request) => {
  return prisma.task.update({
    where: { id: Number((request.params as IdParams).id) },
    data: { assigneeId: request.authUser!.id, status: TASK_STATUS.IN_PROGRESS },
    include: { creator: { select: userSelect }, assignee: { select: userSelect } }
  });
});

app.post('/api/tasks/:id/done', { preHandler: auth }, async (request) => {
  return prisma.task.update({
    where: { id: Number((request.params as IdParams).id) },
    data: { status: TASK_STATUS.DONE, finishedAt: new Date() },
    include: { creator: { select: userSelect }, assignee: { select: userSelect } }
  });
});

app.put('/api/tasks/:id', { preHandler: auth }, async (request) => {
  const body = request.body as { title?: string; content?: string | null; assigneeId?: number | null; status?: TaskStatus };
  return prisma.task.update({
    where: { id: Number((request.params as IdParams).id) },
    data: {
      title: body.title,
      content: body.content,
      assigneeId: body.assigneeId === undefined ? undefined : body.assigneeId,
      status: body.status,
      finishedAt: body.status === TASK_STATUS.DONE ? new Date() : undefined
    },
    include: { creator: { select: userSelect }, assignee: { select: userSelect } }
  });
});

app.delete('/api/tasks/:id', { preHandler: auth }, async (request) => {
  await prisma.task.delete({ where: { id: Number((request.params as IdParams).id) } });
  return { ok: true };
});

async function registerFrontend() {
  try {
    await fs.access(frontendDistDir);
  } catch {
    return;
  }

  app.register(fastifyStatic, {
    root: frontendDistDir,
    prefix: '/',
    decorateReply: false
  });
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ message: '接口不存在' });
    }
    return reply.sendFile('index.html');
  });
}

async function start() {
  await ensureBootstrapData();
  await registerFrontend();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
}

start().catch(async (error) => {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
