require('dotenv').config();
const db = require('../src/config/db');
const subscribers = require('../src/models/subscribers');

describe('subscribers model', () => {
  beforeAll(async () => {
    // Ensure table exists for tests (safe to run repeatedly)
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
  });

  beforeEach(async () => {
    // Remove dependent rows (assignments, devices, users) to avoid FK constraint errors
    try { await db.query('DELETE FROM user_device_assignments'); } catch (e) {}
    try { await db.query('DELETE FROM devices'); } catch (e) {}
    try { await db.query('DELETE FROM users'); } catch (e) {}
    await subscribers._reset();
  });

  test('create/find/update/delete workflow', async () => {
    const created = await subscribers.create({
      name: 'Test User',
      address: '1 Test St',
      phone_number: '+1234567890',
      plan_type: 'basic',
      geo_location: { lat: 10, lng: 20 }
    });
    expect(created).toHaveProperty('id');

    const found = await subscribers.findByPhoneNumber('+1234567890');
    expect(found).not.toBeNull();
    expect(found.name).toBe('Test User');

    const upd = await subscribers.updateById(created.id, { name: 'Updated', phone_number: '+1234567891' });
    expect(upd.affectedRows).toBeGreaterThanOrEqual(0);

    const after = await subscribers.findById(created.id);
    expect(after).not.toBeNull();
    expect(after.name).toBe('Updated');
    expect(after.phone_number).toBe('+1234567891');

    const del = await subscribers.deleteById(created.id);
    expect(del.affectedRows).toBe(1);

    const missing = await subscribers.findById(created.id);
    expect(missing).toBeNull();
  }, 20000);

  test('duplicate phone_number throws DUPLICATE', async () => {
    await subscribers.create({ name: 'A', address: 'addr', phone_number: '0001' });
    await expect(subscribers.create({ name: 'B', address: 'addr2', phone_number: '0001' })).rejects.toMatchObject({ code: 'DUPLICATE' });
  });

  afterAll(async () => {
    await db.pool.end();
  });
});
