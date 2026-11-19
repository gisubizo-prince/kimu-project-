const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/contactController');

const router = express.Router();

router.post('/', controller.submit);
router.get('/', protect, authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.list);

module.exports = router;
