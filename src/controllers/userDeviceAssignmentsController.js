const assignments = require('../models/userDeviceAssignments');

exports.create = async (req, res) => {
  try {
    const payload = req.body || {};
    const created = await assignments.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    if (err && err.code === 'DUPLICATE') return res.status(409).json({ error: 'duplicate' });
    return res.status(400).json({ error: err.message || 'invalid input' });
  }
};

exports.list = async (req, res) => {
  try {
    const { limit, offset } = req.query || {};
    const rows = await assignments.list({ limit, offset });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'internal error' });
  }
};

exports.getByUser = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const rows = await assignments.findByUserId(userId);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message || 'invalid user id' });
  }
};

exports.getByDevice = async (req, res) => {
  try {
    const deviceId = Number(req.params.deviceId);
    const rows = await assignments.findByDeviceId(deviceId);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message || 'invalid device id' });
  }
};

exports.exists = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceId = Number(req.params.deviceId);
    const ok = await assignments.exists(userId, deviceId);
    res.json({ exists: !!ok });
  } catch (err) {
    res.status(400).json({ error: err.message || 'invalid ids' });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deviceId = Number(req.params.deviceId);
    const result = await assignments.delete(userId, deviceId);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message || 'invalid ids' });
  }
};

module.exports = exports;
