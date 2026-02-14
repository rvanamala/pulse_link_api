require('dotenv').config();
const db = require('../src/config/db');
const roles = require('../src/models/roles');
const subscribers = require('../src/models/subscribers');
const users = require('../src/models/users');
const devices = require('../src/models/devices');
const assignments = require('../src/models/userDeviceAssignments');

describe('userDeviceAssignments model', () => {
  let role, subscriber, user, device;

  beforeAll(async () => {
    // Ensure base tables exist
    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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

    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        subscriber_id INT NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role_id INT NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(100) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

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

    await db.pool.execute(`
      CREATE TABLE IF NOT EXISTS user_device_assignments (
        user_id INT NOT NULL,
        device_id INT NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, device_id),
        CONSTRAINT fk_user_assignment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_user_assignment_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

  // reset - clear dependent tables first to avoid FK constraint errors
  try { await db.query('DELETE FROM user_device_assignments'); } catch (e) {}
  try { await db.query('DELETE FROM devices'); } catch (e) {}
  try { await db.query('DELETE FROM users'); } catch (e) {}
  await roles._reset();
  await subscribers._reset();
  await users._reset();
  await devices._reset();
  await assignments._reset();

    role = await roles.create({ role_name: 'tester' });
    subscriber = await subscribers.create({ name: 'AssignSub', address: 'Addr', phone_number: '7001' });
    user = await users.create({ subscriber_id: subscriber.id, email: 'a@ex.com', role_id: role.id, username: 'assignUser' });
    device = await devices.create({ subscriber_id: subscriber.id, mac_id: 'm-1', model_name: 'X' });
  });

  afterAll(async () => {
    await db.pool.end();
  });

  beforeEach(async () => {
    // clean assignments
    await assignments._reset();
  });

  test('assign/unassign workflow', async () => {
    const created = await assignments.create({ user_id: user.id, device_id: device.id });
    expect(created).toHaveProperty('user_id');

    const list = await assignments.findByUserId(user.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].device_id).toBe(device.id);

    const exists = await assignments.exists(user.id, device.id);
    expect(exists).toBe(true);

    const del = await assignments.delete(user.id, device.id);
    expect(del.affectedRows).toBe(1);

    const missing = await assignments.exists(user.id, device.id);
    expect(missing).toBe(false);
  });

  test('duplicate assignment throws DUPLICATE', async () => {
    await assignments.create({ user_id: user.id, device_id: device.id });
    await expect(assignments.create({ user_id: user.id, device_id: device.id })).rejects.toMatchObject({ code: 'DUPLICATE' });
  });

  test('assigning with non-existent fk errors', async () => {
    await expect(assignments.create({ user_id: 999999, device_id: device.id })).rejects.toThrow(/user_id/);
    await expect(assignments.create({ user_id: user.id, device_id: 999999 })).rejects.toThrow(/device_id/);
  });

});
