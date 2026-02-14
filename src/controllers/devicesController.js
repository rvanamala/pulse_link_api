const devices = require('../models/devices');

exports.create = async (req, res) => {
  try {
    const payload = req.body || {};
    const created = await devices.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 'DUPLICATE') return res.status(409).json({ error: 'duplicate' });
    return res.status(400).json({ error: err.message || 'invalid input' });
  }
};

exports.list = async (req, res) => {
  try {
    const { limit, offset } = req.query || {};
    const rows = await devices.list({ limit, offset });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await devices.findById(id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: 'invalid id' });
  }
};

exports.getByMac = async (req, res) => {
  try {
    const mac = req.params.mac;
    const row = await devices.findByMacId(mac);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: 'invalid mac' });
  }
};

exports.update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body || {};
    const result = await devices.updateById(id, payload);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    const updated = await devices.findById(id);
    res.json(updated);
  } catch (err) {
    if (err && err.code === 'DUPLICATE') return res.status(409).json({ error: 'duplicate' });
    res.status(400).json({ error: err.message || 'invalid input' });
  }
};

exports.delete = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await devices.deleteById(id);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'invalid id' });
  }
};

module.exports = exports;
