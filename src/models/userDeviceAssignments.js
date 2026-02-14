// Model for user_device_assignments
// Schema expected:
// user_id INT NOT NULL (part of PK, FK -> users.id)
// device_id INT NOT NULL (part of PK, FK -> devices.id)
// assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP

const db = require('../config/db');
const usersModel = require('./users');
const devicesModel = require('./devices');

function ensureInt(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer`);
  return n;
}

async function ensureUserExists(user_id) {
  const u = await usersModel.findById(user_id);
  if (!u) throw new Error('user_id does not reference an existing user');
}

async function ensureDeviceExists(device_id) {
  const d = await devicesModel.findById(device_id);
  if (!d) throw new Error('device_id does not reference an existing device');
}

// Create assignment (composite PK: user_id + device_id)
exports.create = async ({ user_id, device_id, assigned_at }) => {
  const uid = ensureInt(user_id, 'user_id');
  const did = ensureInt(device_id, 'device_id');

  await ensureUserExists(uid);
  await ensureDeviceExists(did);

  const columns = ['user_id', 'device_id'];
  const placeholders = ['?', '?'];
  const params = [uid, did];
  if (assigned_at !== undefined) {
    columns.push('assigned_at');
    placeholders.push('?');
    params.push(assigned_at);
  }

  const sql = `INSERT INTO user_device_assignments (${columns.join(',')}) VALUES (${placeholders.join(',')})`;
  try {
    const [result] = await db.pool.execute(sql, params);
    // return the created record
    return { user_id: uid, device_id: did, assigned_at: assigned_at ?? null };
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      const e = new Error('duplicate_entry');
      e.code = 'DUPLICATE';
      throw e;
    }
    throw err;
  }
};

exports.findByUserId = async (user_id) => {
  const uid = ensureInt(user_id, 'user_id');
  const rows = await db.query('SELECT device_id, assigned_at FROM user_device_assignments WHERE user_id = ? ORDER BY assigned_at ASC', [uid]);
  return rows.map(r => ({ device_id: Number(r.device_id), assigned_at: r.assigned_at }));
};

exports.findByDeviceId = async (device_id) => {
  const did = ensureInt(device_id, 'device_id');
  const rows = await db.query('SELECT user_id, assigned_at FROM user_device_assignments WHERE device_id = ? ORDER BY assigned_at ASC', [did]);
  return rows.map(r => ({ user_id: Number(r.user_id), assigned_at: r.assigned_at }));
};

exports.exists = async (user_id, device_id) => {
  const uid = ensureInt(user_id, 'user_id');
  const did = ensureInt(device_id, 'device_id');
  const rows = await db.query('SELECT 1 as ok FROM user_device_assignments WHERE user_id = ? AND device_id = ? LIMIT 1', [uid, did]);
  return rows && rows.length > 0;
};

exports.list = async ({ limit = 50, offset = 0 } = {}) => {
  limit = Math.min(Number(limit) || 50, 100);
  offset = Number(offset) || 0;
  const rows = await db.query('SELECT user_id, device_id, assigned_at FROM user_device_assignments ORDER BY assigned_at ASC LIMIT ? OFFSET ?', [limit, offset]);
  return rows.map(r => ({ user_id: Number(r.user_id), device_id: Number(r.device_id), assigned_at: r.assigned_at }));
};

exports.delete = async (user_id, device_id) => {
  const uid = ensureInt(user_id, 'user_id');
  const did = ensureInt(device_id, 'device_id');
  const [result] = await db.pool.execute('DELETE FROM user_device_assignments WHERE user_id = ? AND device_id = ?', [uid, did]);
  return { affectedRows: result.affectedRows || 0 };
};

// Test helper
exports._reset = async () => {
  await db.query('DELETE FROM user_device_assignments');
};

module.exports = exports;
