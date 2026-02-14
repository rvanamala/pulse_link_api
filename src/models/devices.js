// Devices model for MySQL
// Schema expected:
// id INT AUTO_INCREMENT PRIMARY KEY
// subscriber_id INT NOT NULL (foreign key -> subscribers.id)
// mac_id VARCHAR(100) NOT NULL
// model_name VARCHAR(100) NULL

const db = require('../config/db');
const subscribersModel = require('./subscribers');

function ensureInt(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer`);
  return n;
}

function validateMacId(mac) {
  if (!mac || typeof mac !== 'string') throw new Error('mac_id required');
  if (mac.length > 100) throw new Error('mac_id too long (max 100)');
}

function validateModelName(name) {
  if (name === undefined || name === null) return;
  if (typeof name !== 'string') throw new Error('model_name must be a string');
  if (name.length > 100) throw new Error('model_name too long (max 100)');
}

async function ensureSubscriberExists(subscriber_id) {
  const s = await subscribersModel.findById(subscriber_id);
  if (!s) throw new Error('subscriber_id does not reference an existing subscriber');
}

// Create device
exports.create = async ({ subscriber_id, mac_id, model_name }) => {
  const sid = ensureInt(subscriber_id, 'subscriber_id');
  validateMacId(mac_id);
  validateModelName(model_name);

  await ensureSubscriberExists(sid);

  const sql = 'INSERT INTO devices (subscriber_id, mac_id, model_name) VALUES (?, ?, ?)';
  try {
    const mParam = model_name === undefined ? null : model_name;
    const [result] = await db.pool.execute(sql, [sid, mac_id, mParam]);
    const id = result && result.insertId ? Number(result.insertId) : null;
    if (id) return await exports.findById(id);
    return { id, subscriber_id: sid, mac_id, model_name };
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
  const rows = await db.query('SELECT id, subscriber_id, mac_id, model_name FROM devices WHERE id = ? LIMIT 1', [id]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { id: Number(r.id), subscriber_id: Number(r.subscriber_id), mac_id: r.mac_id, model_name: r.model_name };
};

// Find by mac_id
exports.findByMacId = async (mac_id) => {
  if (!mac_id) return null;
  const rows = await db.query('SELECT id, subscriber_id, mac_id, model_name FROM devices WHERE mac_id = ? LIMIT 1', [mac_id]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { id: Number(r.id), subscriber_id: Number(r.subscriber_id), mac_id: r.mac_id, model_name: r.model_name };
};

// List devices
exports.list = async ({ limit = 50, offset = 0 } = {}) => {
  limit = Math.min(Number(limit) || 50, 100);
  offset = Number(offset) || 0;
  const rows = await db.query('SELECT id, subscriber_id, mac_id, model_name FROM devices ORDER BY id ASC LIMIT ? OFFSET ?', [limit, offset]);
  return rows.map(r => ({ id: Number(r.id), subscriber_id: Number(r.subscriber_id), mac_id: r.mac_id, model_name: r.model_name }));
};

// Update by id
exports.updateById = async (id, { subscriber_id, mac_id, model_name }) => {
  if (!id) throw new Error('id required');
  const fields = [];
  const params = [];
  if (subscriber_id !== undefined) {
    const sid = ensureInt(subscriber_id, 'subscriber_id');
    await ensureSubscriberExists(sid);
    fields.push('subscriber_id = ?');
    params.push(sid);
  }
  if (mac_id !== undefined) {
    validateMacId(mac_id);
    fields.push('mac_id = ?');
    params.push(mac_id);
  }
  if (model_name !== undefined) {
    validateModelName(model_name);
    fields.push('model_name = ?');
    params.push(model_name);
  }
  if (fields.length === 0) throw new Error('no fields to update');
  params.push(id);
  const sql = `UPDATE devices SET ${fields.join(', ')} WHERE id = ?`;
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
  const [result] = await db.pool.execute('DELETE FROM devices WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows || 0 };
};

// Test helper
exports._reset = async () => {
  await db.query('DELETE FROM devices');
  try { await db.query('ALTER TABLE devices AUTO_INCREMENT = 1'); } catch (e) { }
};

module.exports = exports;
