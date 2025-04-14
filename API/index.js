require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// 中间件: 验证JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的认证令牌' });
    }
    req.user = user;
    next();
  });
};

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: '注册失败,请重试',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 生成JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: '登录失败,请重试' });
  }
});

// 获取所有猫咪
app.get('/api/cats', authenticateToken, async (req, res) => {
  try {
    const cats = await prisma.cat.findMany({
      where: { ownerId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cats);
  } catch (error) {
    res.status(500).json({ message: '获取猫咪列表失败' });
  }
});

// 获取单个猫咪
app.get('/api/cats/:id', authenticateToken, async (req, res) => {
  try {
    const cat = await prisma.cat.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { healthRecords: true }
    });

    if (!cat) {
      return res.status(404).json({ message: '未找到猫咪' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: '无权访问此猫咪信息' });
    }

    res.json(cat);
  } catch (error) {
    res.status(500).json({ message: '获取猫咪信息失败' });
  }
});

// 创建猫咪
app.post('/api/cats', authenticateToken, async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;

    const cat = await prisma.cat.create({
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        ownerId: req.user.userId
      }
    });

    res.status(201).json(cat);
  } catch (error) {
    res.status(500).json({ message: '创建猫咪失败' });
  }
});

// 更新猫咪
app.put('/api/cats/:id', authenticateToken, async (req, res) => {
  try {
    const { name, breed, age, weight } = req.body;
    const catId = parseInt(req.params.id);

    // 检查猫咪是否存在且属于当前用户
    const existingCat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!existingCat) {
      return res.status(404).json({ message: '未找到猫咪' });
    }

    if (existingCat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: '无权修改此猫咪信息' });
    }

    const updatedCat = await prisma.cat.update({
      where: { id: catId },
      data: {
        name,
        breed,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null
      }
    });

    res.json(updatedCat);
  } catch (error) {
    res.status(500).json({ message: '更新猫咪信息失败' });
  }
});

// 添加健康记录
app.post('/api/cats/:catId/records', authenticateToken, async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const catId = parseInt(req.params.catId);

    // 检查猫咪是否存在且属于当前用户
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!cat) {
      return res.status(404).json({ message: '未找到猫咪' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: '无权为此猫咪添加记录' });
    }

    const record = await prisma.healthRecord.create({
      data: {
        type,
        date: new Date(date),
        description,
        notes,
        catId
      }
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: '添加健康记录失败' });
  }
});

// 获取猫咪的健康记录
app.get('/api/cats/:catId/records', authenticateToken, async (req, res) => {
  try {
    const catId = parseInt(req.params.catId);

    // 检查猫咪是否存在且属于当前用户
    const cat = await prisma.cat.findUnique({
      where: { id: catId }
    });

    if (!cat) {
      return res.status(404).json({ message: '未找到猫咪' });
    }

    if (cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: '无权查看此猫咪的记录' });
    }

    const records = await prisma.healthRecord.findMany({
      where: { catId },
      orderBy: { date: 'desc' }
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: '获取健康记录失败' });
  }
});

// 更新健康记录
app.put('/api/records/:id', authenticateToken, async (req, res) => {
  try {
    const { type, date, description, notes } = req.body;
    const recordId = parseInt(req.params.id);

    // 获取记录并检查权限
    const record = await prisma.healthRecord.findUnique({
      where: { id: recordId },
      include: { cat: true }
    });

    if (!record) {
      return res.status(404).json({ message: '未找到健康记录' });
    }

    if (record.cat.ownerId !== req.user.userId) {
      return res.status(403).json({ message: '无权修改此记录' });
    }

    const updatedRecord = await prisma.healthRecord.update({
      where: { id: recordId },
      data: {
        type,
        date: new Date(date),
        description,
        notes
      }
    });

    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: '更新健康记录失败' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 