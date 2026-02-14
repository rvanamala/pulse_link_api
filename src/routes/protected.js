const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.get('/api/protected', auth, (req, res) => {
  res.json({ message: `Hello ${req.user.username}, you have accessed a protected route.` });
});

module.exports = router;
