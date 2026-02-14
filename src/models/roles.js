// Roles model for MySQL
// Schema expected:
// id INT AUTO_INCREMENT PRIMARY KEY
// role_name VARCHAR(50) NOT NULL UNIQUE

const db = require('../config/db');

function validateRoleName(role_name) {
  if (!role_name || typeof role_name !== 'string') throw new Error('role_name required');
  if (role_name.length > 50) throw new Error('role_name too long (max 50)');
}

// Create a role. Returns the created row.
exports.create = async ({ role_name }) => {
  validateRoleName(role_name);
  const sql = 'INSERT INTO roles (role_name) VALUES (?)';
  try {
    const [result] = await db.pool.execute(sql, [role_name]);
    const id = result && result.insertId ? Number(result.insertId) : null;
    if (id) return await exports.findById(id);
    return { id, role_name };
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
  const rows = await db.query('SELECT id, role_name FROM roles WHERE id = ? LIMIT 1', [id]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { id: Number(r.id), role_name: r.role_name };
};

// Find by role_name
exports.findByName = async (role_name) => {
  if (!role_name) return null;
  const rows = await db.query('SELECT id, role_name FROM roles WHERE role_name = ? LIMIT 1', [role_name]);
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { id: Number(r.id), role_name: r.role_name };
};

// List roles
exports.list = async ({ limit = 50, offset = 0 } = {}) => {
  limit = Math.min(Number(limit) || 50, 100);
  offset = Number(offset) || 0;
  const rows = await db.query('SELECT id, role_name FROM roles ORDER BY id ASC LIMIT ? OFFSET ?', [limit, offset]);
  return rows.map(r => ({ id: Number(r.id), role_name: r.role_name }));
};

// Update by id
exports.updateById = async (id, { role_name }) => {
  if (!id) throw new Error('id required');
  const fields = [];
  const params = [];
  if (role_name !== undefined) {
    validateRoleName(role_name);
    fields.push('role_name = ?');
    params.push(role_name);
  }
  if (fields.length === 0) throw new Error('no fields to update');
  params.push(id);
  const sql = `UPDATE roles SET ${fields.join(', ')} WHERE id = ?`;
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
  const [result] = await db.pool.execute('DELETE FROM roles WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows || 0 };
};

// Test helper
exports._reset = async () => {
  await db.query('DELETE FROM roles');
  try { await db.query('ALTER TABLE roles AUTO_INCREMENT = 1'); } catch (e) { }
};

module.exports = exports;
