// Users model backed by MySQL. Uses `src/config/db.js` pool helper.
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const subscribersModel = require('./subscribers');
const rolesModel = require('./roles');

// Expected schema:
// id INT AUTO_INCREMENT PRIMARY KEY
// subscriber_id INT NOT NULL (foreign key -> subscribers.id)
// email VARCHAR(255) NOT NULL UNIQUE
// role_id INT NOT NULL (foreign key -> roles.id)
// username VARCHAR(100) NOT NULL UNIQUE
// password_hash VARCHAR(100) NULL

function ensureInt(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer`);
  return n;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') throw new Error('email required');
  if (email.length > 255) throw new Error('email too long (max 255)');
  // simple email regex
  const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!re.test(email)) throw new Error('invalid email');
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') throw new Error('username required');
  if (username.length > 100) throw new Error('username too long (max 100)');
}

function validatePasswordHash(passwordHash) {
  if (passwordHash === undefined || passwordHash === null) return;
  if (typeof passwordHash !== 'string') throw new Error('invalid password_hash');
  if (passwordHash.length > 100) throw new Error('password_hash too long (max 100)');
}

async function ensureSubscriberExists(subscriber_id) {
  // use subscribers model to verify existence when available
  const s = await subscribersModel.findById(subscriber_id);
  if (!s) throw new Error('subscriber_id does not reference an existing subscriber');
}

async function ensureRoleExists(role_id) {
  const r = await rolesModel.findById(role_id);
  if (!r) throw new Error('role_id does not reference an existing role');
}

// Create a new user
exports.create = async ({ subscriber_id, email, role_id, username, password_hash, password }) => {
  // validate inputs
  const sid = ensureInt(subscriber_id, 'subscriber_id');
  const rid = ensureInt(role_id, 'role_id');
  validateEmail(email);
  validateUsername(username);
  // if plaintext password provided, hash it here; otherwise validate provided password_hash
  if (password !== undefined) {
    const salt = await bcrypt.genSalt(10);
    password_hash = await bcrypt.hash(String(password), salt);
  }
  validatePasswordHash(password_hash);

  // Ensure FK existence
  await ensureSubscriberExists(sid);
  await ensureRoleExists(rid);

  const sql = 'INSERT INTO users (subscriber_id, email, role_id, username, password_hash) VALUES (?, ?, ?, ?, ?)';
  try {
  const pwParam = password_hash === undefined ? null : password_hash;
  const [result] = await db.pool.execute(sql, [sid, email, rid, username, pwParam]);
    const id = result && result.insertId ? Number(result.insertId) : null;
    if (id) return await exports.findById(id);
    return { id, subscriber_id: sid, email, role_id: rid, username };
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      const e = new Error('duplicate_entry');
      e.code = 'DUPLICATE';
      throw e;
    }
    throw err;
  }
};

// Find by id
exports.findById = async (id) => {
  if (!id) return null;
  const rows = await db.query('SELECT id, subscriber_id, email, role_id, username, password_hash FROM users WHERE id = ? LIMIT 1', [id]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    subscriber_id: Number(r.subscriber_id),
    email: r.email,
    role_id: Number(r.role_id),
    username: r.username,
    password_hash: r.password_hash
  };
};

// Find by username
exports.findByUsername = async (username) => {
  if (!username) return null;
  const rows = await db.query('SELECT id, subscriber_id, email, role_id, username, password_hash FROM users WHERE username = ? LIMIT 1', [username]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    subscriber_id: Number(r.subscriber_id),
    email: r.email,
    role_id: Number(r.role_id),
    username: r.username,
    password_hash: r.password_hash
  };
};

// Find by email
exports.findByEmail = async (email) => {
  if (!email) return null;
  const rows = await db.query('SELECT id, subscriber_id, email, role_id, username, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    subscriber_id: Number(r.subscriber_id),
    email: r.email,
    role_id: Number(r.role_id),
    username: r.username,
    password_hash: r.password_hash
  };
};

// List users
exports.list = async ({ limit = 50, offset = 0 } = {}) => {
  limit = Math.min(Number(limit) || 50, 100);
  offset = Number(offset) || 0;
  const rows = await db.query('SELECT id, subscriber_id, email, role_id, username FROM users ORDER BY id ASC LIMIT ? OFFSET ?', [limit, offset]);
  return rows.map(r => ({ id: Number(r.id), subscriber_id: Number(r.subscriber_id), email: r.email, role_id: Number(r.role_id), username: r.username }));
};

// Update by id
exports.updateById = async (id, { subscriber_id, email, role_id, username, password_hash, password }) => {
  if (!id) throw new Error('id required');
  const fields = [];
  const params = [];
  if (subscriber_id !== undefined) {
    const sid = ensureInt(subscriber_id, 'subscriber_id');
    await ensureSubscriberExists(sid);
    fields.push('subscriber_id = ?');
    params.push(sid);
  }
  if (role_id !== undefined) {
    const rid = ensureInt(role_id, 'role_id');
    await ensureRoleExists(rid);
    fields.push('role_id = ?');
    params.push(rid);
  }
  if (email !== undefined) {
    validateEmail(email);
    fields.push('email = ?');
    params.push(email);
  }
  if (username !== undefined) {
    validateUsername(username);
    fields.push('username = ?');
    params.push(username);
  }
  // handle plaintext password hashing or provided password_hash
  if (password !== undefined) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(String(password), salt);
    validatePasswordHash(hashed);
    fields.push('password_hash = ?');
    params.push(hashed);
  } else if (password_hash !== undefined) {
    validatePasswordHash(password_hash);
    fields.push('password_hash = ?');
    params.push(password_hash);
  }
  if (fields.length === 0) throw new Error('no fields to update');
  params.push(id);
  const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  try {
    const [result] = await db.pool.execute(sql, params);
    return { affectedRows: result.affectedRows || 0 };
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      const e = new Error('duplicate_entry');
      e.code = 'DUPLICATE';
      throw e;
    }
    throw err;
  }
};

// Delete by id
exports.deleteById = async (id) => {
  if (!id) throw new Error('id required');
  const [result] = await db.pool.execute('DELETE FROM users WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows || 0 };
};

// test helper: remove all users (use with caution)
exports._reset = async () => {
  await db.query('DELETE FROM users');
  try {
    await db.query('ALTER TABLE users AUTO_INCREMENT = 1');
  } catch (err) {
    // ignore - not critical
  }
};
