const express = require('express');
const router = express.Router();
const controller = require('../controllers/devicesController');
const auth = require('../middleware/auth');

router.get('/', auth, controller.list);
router.get('/id/:id', auth, controller.getById);
router.get('/mac/:mac', auth, controller.getByMac);

router.post('/', auth, controller.create);
router.put('/:id', auth, controller.update);
router.delete('/:id', auth, controller.delete);

module.exports = router;
