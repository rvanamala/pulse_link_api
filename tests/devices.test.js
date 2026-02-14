require('dotenv').config();
const db = require('../src/config/db');
const subscribers = require('../src/models/subscribers');
const devices = require('../src/models/devices');

describe('devices model', () => {
  let subscriber;

  beforeAll(async () => {
    // Ensure subscribers table exists (used as FK)
    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        plan_type ENUM('basic','premium','enterprise') DEFAULT 'basic',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        address VARCHAR(300) NOT NULL,
        phone_number VARCHAR(12) NOT NULL UNIQUE,
        geo_location POINT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure devices table exists
    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscriber_id INT NOT NULL,
        mac_id VARCHAR(100) NOT NULL,
        model_name VARCHAR(100) NULL,
        INDEX (mac_id),
        CONSTRAINT fk_device_subscriber FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // create subscriber fixture
    // If other tables reference subscribers, remove dependent rows first to avoid FK constraint errors
    try { await db.query('DELETE FROM user_device_assignments'); } catch (e) {}
    try { await db.query('DELETE FROM devices'); } catch (e) {}
    try { await db.query('DELETE FROM users'); } catch (e) {}
    await subscribers._reset();
    subscriber = await subscribers.create({ name: 'DevSub', address: 'Addr', phone_number: '8001' });
  });

  beforeEach(async () => {
    // clean devices
    await devices._reset();
  });

  afterAll(async () => {
    await db.pool.end();
  });

  test('create/find/update/delete workflow', async () => {
    const created = await devices.create({ subscriber_id: subscriber.id, mac_id: 'mac-001', model_name: 'M1' });
    expect(created).toHaveProperty('id');

    const found = await devices.findByMacId('mac-001');
    expect(found).not.toBeNull();
    expect(found.model_name).toBe('M1');

    const upd = await devices.updateById(created.id, { model_name: 'M2', mac_id: 'mac-002' });
    expect(upd.affectedRows).toBeGreaterThanOrEqual(0);

    const after = await devices.findById(created.id);
    expect(after).not.toBeNull();
    expect(after.mac_id).toBe('mac-002');
    expect(after.model_name).toBe('M2');

    const del = await devices.deleteById(created.id);
    expect(del.affectedRows).toBe(1);

    const missing = await devices.findById(created.id);
    expect(missing).toBeNull();
  }, 20000);

  test('creating device with non-existent subscriber_id errors', async () => {
    await expect(devices.create({ subscriber_id: 999999, mac_id: 'x' })).rejects.toThrow(/subscriber_id/);
  });

});
