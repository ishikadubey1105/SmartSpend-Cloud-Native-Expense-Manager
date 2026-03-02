const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getProfile, updateProfile, syncUser } = require('../controllers/userController');

router.post('/sync', authenticate, syncUser);
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, updateProfile);

module.exports = router;
