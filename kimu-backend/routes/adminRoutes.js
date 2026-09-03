const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getSettings, updateSettings, audit } = require('../controllers/adminController');
const router = express.Router();
router.use(protect, authorize('super_admin', 'admin'));
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/audit-log', audit);
module.exports = router;