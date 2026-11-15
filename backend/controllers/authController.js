const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');
const getJwtSecret = require('../utils/jwtSecret');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bcryptRounds = 12;
const bcryptMaxPasswordBytes = 72;

function getPublicManager(manager) {
  return {
    id: manager._id.toString(),
    name: manager.name,
    email: manager.email,
    createdAt: manager.createdAt,
    updatedAt: manager.updatedAt,
  };
}

function createToken(managerId, secret) {
  return jwt.sign({ sub: managerId.toString() }, secret, {
    expiresIn: '1d',
  });
}

function isEmailValid(email) {
  return emailPattern.test(email);
}

async function register(req, res) {
  const { name, email, password } = req.body || {};
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isEmailValid(normalizedEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }
  if (Buffer.byteLength(password, 'utf8') > bcryptMaxPasswordBytes) {
    return res.status(400).json({ message: 'Password must not exceed 72 UTF-8 bytes.' });
  }
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return res.status(500).json({ message: 'Authentication is not configured.' });
  }

  try {
    const existingManager = await Manager.exists({ email: normalizedEmail });
    if (existingManager) {
      return res.status(409).json({ message: 'A manager with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    const manager = await Manager.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
    });

    return res.status(201).json({
      message: 'Manager registered successfully.',
      token: createToken(manager._id, jwtSecret),
      manager: getPublicManager(manager),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A manager with this email already exists.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid manager details.' });
    }
    console.error('Manager registration failed:', error.name);
    return res.status(500).json({ message: 'Unable to register manager.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!isEmailValid(normalizedEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }
  if (Buffer.byteLength(password, 'utf8') > bcryptMaxPasswordBytes) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return res.status(500).json({ message: 'Authentication is not configured.' });
  }

  try {
    const manager = await Manager.findOne({ email: normalizedEmail }).select('+password');
    if (!manager || !(await bcrypt.compare(password, manager.password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.status(200).json({
      message: 'Login successful.',
      token: createToken(manager._id, jwtSecret),
      manager: getPublicManager(manager),
    });
  } catch (error) {
    console.error('Manager login failed:', error.name);
    return res.status(500).json({ message: 'Unable to log in.' });
  }
}

async function getCurrentManager(req, res) {
  try {
    const manager = await Manager.findById(req.auth.managerId).select('-password');
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found.' });
    }

    return res.status(200).json({ manager: getPublicManager(manager) });
  } catch (error) {
    console.error('Loading authenticated manager failed:', error.name);
    return res.status(500).json({ message: 'Unable to load manager details.' });
  }
}

module.exports = {
  register,
  login,
  getCurrentManager,
};
