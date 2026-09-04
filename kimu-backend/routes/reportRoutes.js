const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/reportController');

const router = express.Router();
router.use(protect);
router.post('/email', authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.emailReport);

module.exports = router;
