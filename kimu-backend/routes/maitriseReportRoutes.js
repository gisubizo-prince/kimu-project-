const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/maitriseReportController');

const router = express.Router();
router.use(protect);
router.get('/', controller.list);
router.get('/:id', controller.getById);
router.post('/', authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.create);

module.exports = router;