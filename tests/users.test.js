require('dotenv').config();
const db = require('../src/config/db');
const roles = require('../src/models/roles');
const subscribers = require('../src/models/subscribers');
const users = require('../src/models/users');

describe('users model', () => {
  let role;
  let subscriber;

  beforeAll(async () => {
    // Ensure required tables
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

    // create fixtures
  await roles._reset();
  // remove dependent records referencing subscribers to avoid FK failures
  try { await db.query('DELETE FROM user_device_assignments'); } catch (e) {}
  try { await db.query('DELETE FROM devices'); } catch (e) {}
  try { await db.query('DELETE FROM users'); } catch (e) {}
  await subscribers._reset();
  await users._reset();

    role = await roles.create({ role_name: 'tester' });
    subscriber = await subscribers.create({ name: 'Sub A', address: 'Addr', phone_number: '9001' });
  });

  afterAll(async () => {
    await db.pool.end();
  });

  beforeEach(async () => {
    await users._reset();
  });

  test('create/find/update/delete workflow', async () => {
    const created = await users.create({
      subscriber_id: subscriber.id,
      email: 'u1@example.com',
      role_id: role.id,
      username: 'user1',
      password_hash: 'pw'
    });
    expect(created).toHaveProperty('id');

    const found = await users.findByUsername('user1');
    expect(found).not.toBeNull();
    expect(found.email).toBe('u1@example.com');

    const upd = await users.updateById(created.id, { username: 'user1b', email: 'u1b@example.com' });
    expect(upd.affectedRows).toBeGreaterThanOrEqual(0);

    const after = await users.findById(created.id);
    expect(after).not.toBeNull();
    expect(after.username).toBe('user1b');
    expect(after.email).toBe('u1b@example.com');

    const del = await users.deleteById(created.id);
    expect(del.affectedRows).toBe(1);

    const missing = await users.findById(created.id);
    expect(missing).toBeNull();
  }, 20000);

  test('duplicate email/username throws DUPLICATE', async () => {
    await users.create({ subscriber_id: subscriber.id, email: 'dup@example.com', role_id: role.id, username: 'dupuser' });
    await expect(users.create({ subscriber_id: subscriber.id, email: 'dup@example.com', role_id: role.id, username: 'dupuser2' })).rejects.toMatchObject({ code: 'DUPLICATE' });
    await expect(users.create({ subscriber_id: subscriber.id, email: 'dup2@example.com', role_id: role.id, username: 'dupuser' })).rejects.toMatchObject({ code: 'DUPLICATE' });
  });

});
