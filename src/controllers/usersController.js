const users = require('../models/users');

exports.create = async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };
    const created = await users.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 'DUPLICATE') return res.status(409).json({ error: 'duplicate' });
    return res.status(400).json({ error: err.message || 'invalid input' });
  }
};

exports.list = async (req, res) => {
  try {
    const { limit, offset } = req.query || {};
    const rows = await users.list({ limit, offset });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await users.findById(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: 'invalid id' });
  }
};

exports.getByUsername = async (req, res) => {
  try {
    const username = req.params.username;
    const row = await users.findByUsername(username);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: 'invalid username' });
  }
};

exports.getByEmail = async (req, res) => {
  try {
    const email = req.params.email;
    const row = await users.findByEmail(email);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: 'invalid email' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = { ...(req.body || {}) };
    const result = await users.updateById(id, payload);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    const updated = await users.findById(id);
    res.json(updated);
  } catch (err) {
    if (err && err.code === 'DUPLICATE') return res.status(409).json({ error: 'duplicate' });
    res.status(400).json({ error: err.message || 'invalid input' });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await users.deleteById(id);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'invalid id' });
  }
};

module.exports = exports;
