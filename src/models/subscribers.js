// Subscribers model for MySQL
// Table schema reference:
// id INT AUTO_INCREMENT PRIMARY KEY
// name VARCHAR(255) NOT NULL
// plan_type ENUM('basic','premium','enterprise') DEFAULT 'basic'
// created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// address VARCHAR(300) NOT NULL
// phone_number VARCHAR(12) NOT NULL UNIQUE
// geo_location POINT NULL

const db = require('../config/db');

const ALLOWED_PLAN_TYPES = ['basic', 'premium', 'enterprise'];

function validateName(name) {
  if (!name || typeof name !== 'string') throw new Error('name required');
  if (name.length > 255) throw new Error('name too long (max 255)');
}

function validateAddress(address) {
  if (!address || typeof address !== 'string') throw new Error('address required');
  if (address.length > 300) throw new Error('address too long (max 300)');
}

function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') throw new Error('phone_number required');
  if (phone.length > 12) throw new Error('phone_number too long (max 12)');
  // basic characters check (digits, +, - allowed). Adjust if you have stricter rules.
  if (!/^[0-9+\-()\s]+$/.test(phone)) throw new Error('phone_number contains invalid characters');
}

function validatePlanType(plan) {
  if (plan === undefined || plan === null) return; // DB default will apply
  if (!ALLOWED_PLAN_TYPES.includes(plan)) throw new Error('invalid plan_type');
}

function geoToWkt(geo) {
  // Accept { lat, lng } or { latitude, longitude }
  if (!geo) return null;
  const lat = geo.lat ?? geo.latitude;
  const lng = geo.lng ?? geo.longitude;
  if (lat === undefined || lng === undefined) return null;
  const nlat = Number(lat);
  const nlng = Number(lng);
  if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return null;
  // WKT POINT expects: POINT(lon lat)
  return `POINT(${nlng} ${nlat})`;
}

function parseWktPoint(wkt) {
  if (!wkt) return null;
  // wkt example: "POINT(lon lat)"
  const m = wkt.match(/^POINT\s*\(\s*([0-9+\-.eE]+)\s+([0-9+\-.eE]+)\s*\)$/);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  return { lat, lng: lon };
}

// Create a subscriber. Returns { id, name, plan_type, created_at, address, phone_number, geo_location }
exports.create = async ({ name, plan_type, address, phone_number, geo_location }) => {
  validateName(name);
  validateAddress(address);
  validatePhoneNumber(phone_number);
  validatePlanType(plan_type);

  const columns = ['name', 'plan_type', 'address', 'phone_number'];
  const placeholders = ['?', '?', '?', '?'];
  const params = [name, plan_type ?? 'basic', address, phone_number];

  const wkt = geoToWkt(geo_location);
  if (wkt) {
    columns.push('geo_location');
    placeholders.push('ST_GeomFromText(?)');
    params.push(wkt);
  }

  const sql = `INSERT INTO subscribers (${columns.join(',')}) VALUES (${placeholders.join(',')})`;
  try {
    const [result] = await db.pool.execute(sql, params);
    const id = result && result.insertId ? Number(result.insertId) : null;
    // Return created row (read it back to include created_at and normalized geo)
    if (id) return await exports.findById(id);
    return { id, name, plan_type: plan_type ?? 'basic', address, phone_number, geo_location };
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
  const rows = await db.query(
    `SELECT id, name, plan_type, created_at, address, phone_number, ST_AsText(geo_location) as geoWkt
     FROM subscribers WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    name: r.name,
    plan_type: r.plan_type,
    created_at: r.created_at,
    address: r.address,
    phone_number: r.phone_number,
    geo_location: parseWktPoint(r.geoWkt)
  };
};

// Find by phone number (unique)
exports.findByPhoneNumber = async (phone) => {
  if (!phone) return null;
  const rows = await db.query(
    `SELECT id, name, plan_type, created_at, address, phone_number, ST_AsText(geo_location) as geoWkt
     FROM subscribers WHERE phone_number = ? LIMIT 1`,
    [phone]
  );
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return {
    id: Number(r.id),
    name: r.name,
    plan_type: r.plan_type,
    created_at: r.created_at,
    address: r.address,
    phone_number: r.phone_number,
    geo_location: parseWktPoint(r.geoWkt)
  };
};

// List subscribers with simple pagination
exports.list = async ({ limit = 50, offset = 0 } = {}) => {
  limit = Math.min(Number(limit) || 50, 100);
  offset = Number(offset) || 0;
  const rows = await db.query(
    `SELECT id, name, plan_type, created_at, address, phone_number, ST_AsText(geo_location) as geoWkt
     FROM subscribers ORDER BY id ASC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows.map(r => ({
    id: Number(r.id),
    name: r.name,
    plan_type: r.plan_type,
    created_at: r.created_at,
    address: r.address,
    phone_number: r.phone_number,
    geo_location: parseWktPoint(r.geoWkt)
  }));
};

// Update by id. Accepts subset of fields { name, plan_type, address, phone_number, geo_location }
exports.updateById = async (id, { name, plan_type, address, phone_number, geo_location }) => {
  if (!id) throw new Error('id required');
  const fields = [];
  const params = [];
  if (name !== undefined) {
    validateName(name);
    fields.push('name = ?');
    params.push(name);
  }
  if (plan_type !== undefined) {
    validatePlanType(plan_type);
    fields.push('plan_type = ?');
    params.push(plan_type);
  }
  if (address !== undefined) {
    validateAddress(address);
    fields.push('address = ?');
    params.push(address);
  }
  if (phone_number !== undefined) {
    validatePhoneNumber(phone_number);
    fields.push('phone_number = ?');
    params.push(phone_number);
  }
  if (geo_location !== undefined) {
    const wkt = geoToWkt(geo_location);
    if (wkt) {
      fields.push('geo_location = ST_GeomFromText(?)');
      params.push(wkt);
    } else {
      // explicit null
      fields.push('geo_location = NULL');
    }
  }
  if (fields.length === 0) throw new Error('no fields to update');
  params.push(id);
  const sql = `UPDATE subscribers SET ${fields.join(', ')} WHERE id = ?`;
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
  const [result] = await db.pool.execute('DELETE FROM subscribers WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows || 0 };
};

// Helper: remove all rows (use with caution in dev/test)
exports._reset = async () => {
  await db.query('DELETE FROM subscribers');
  try {
    await db.query('ALTER TABLE subscribers AUTO_INCREMENT = 1');
  } catch (err) {
    // ignore
  }
};

module.exports = exports;
