const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../models/users');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

exports.register = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const existing = await users.findByUsername(username);
  if (existing) return res.status(409).json({ error: 'username already taken' });

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const user = await users.create({ username, passwordHash: hash });

  // Return basic user info (not the hash)
  res.status(201).json({ id: user.id, username: user.username });
};

exports.login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const user = await users.findByUsername(username);
  if (!user) return res.status(401).json({ error: 'User Not Found:' + username });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const payload = { id: user.id, username: user.username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token, expiresIn: 3600 });
};
