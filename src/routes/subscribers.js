const express = require('express');
const router = express.Router();
const controller = require('../controllers/subscribersController');
const auth = require('../middleware/auth');

router.get('/', auth, controller.list);
router.get('/phone/:phone', auth, controller.getByPhone);
router.get('/:id', auth, controller.getById);

router.post('/', auth, controller.create);
router.put('/:id', auth, controller.update);
router.delete('/:id', auth, controller.delete);

module.exports = router;
