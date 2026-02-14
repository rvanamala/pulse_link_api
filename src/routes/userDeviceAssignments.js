const express = require('express');
const router = express.Router();
const controller = require('../controllers/userDeviceAssignmentsController');
const auth = require('../middleware/auth');

router.get('/', auth, controller.list);
router.get('/user/:userId', auth, controller.getByUser);
router.get('/device/:deviceId', auth, controller.getByDevice);
router.get('/exists/:userId/:deviceId', auth, controller.exists);

router.post('/', auth, controller.create);
router.delete('/:userId/:deviceId', auth, controller.delete);

module.exports = router;
