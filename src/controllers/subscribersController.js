const subscribers = require('../models/subscribers');

exports.create = async (req, res) => {
  try {
    const { name, plan_type, address, phone_number, geo_location } = req.body || {};
    const created = await subscribers.create({ name, plan_type, address, phone_number, geo_location });
    return res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 'DUPLICATE') return res.status(409).json({ error: 'phone_number already exists' });
    return res.status(400).json({ error: err.message || 'invalid input' });
  }
};

exports.list = async (req, res) => {
  try {
    const { limit, offset } = req.query || {};
    const rows = await subscribers.list({ limit, offset });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await subscribers.findById(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: 'invalid id' });
  }
};

exports.getByPhone = async (req, res) => {
  try {
    const phone = req.params.phone;
    const row = await subscribers.findByPhoneNumber(phone);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: 'invalid phone' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const result = await subscribers.updateById(id, payload);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    const updated = await subscribers.findById(id);
    res.json(updated);
  } catch (err) {
    if (err && err.code === 'DUPLICATE') return res.status(409).json({ error: 'phone_number already exists' });
    res.status(400).json({ error: err.message || 'invalid input' });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await subscribers.deleteById(id);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'invalid id' });
  }
};

module.exports = exports;
