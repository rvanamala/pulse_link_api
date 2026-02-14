require('dotenv').config();
const users = require('../src/models/users');

(async () => {
  try {
    console.log('Resetting users table (DELETE) ...');
    await users._reset();

    console.log('Creating user alice ...');
    const created = await users.create({ username: 'alice', passwordHash: 'hashed_pw_123' });
    console.log('Created:', created);

    console.log('Finding by username alice ...');
    const found = await users.findByUsername('alice');
    console.log('Found:', found);

    console.log('Updating username to alice2 ...');
    const update = await users.updateById(created.id, { username: 'alice2' });
    console.log('Update result:', update);

    console.log('Listing users ...');
    const list = await users.list({ limit: 10 });
    console.log('List:', list);

    console.log('Deleting user ...');
    const del = await users.deleteById(created.id);
    console.log('Delete result:', del);

    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Error during test:', err);
    process.exit(2);
  }
})();
