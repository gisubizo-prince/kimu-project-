const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/attendanceController');
const router = express.Router();
router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('super_admin', 'admin', 'hr_staff', 'security', 'manager'), controller.record);
router.patch('/:id/checkout', authorize('super_admin', 'admin', 'hr_staff', 'security', 'manager'), controller.checkout);
module.exports = router;