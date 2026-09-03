const express = require('express');
const { login, register, getMe, logout } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Only existing admins can create new staff accounts.
router.post('/register', protect, authorize('super_admin', 'admin'), register);

module.exports = router;
