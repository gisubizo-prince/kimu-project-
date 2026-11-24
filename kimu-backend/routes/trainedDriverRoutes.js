const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/trainedDriverController');

const router = express.Router();
router.use(protect);
router.get('/', controller.list);
router.post('/', authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.create);
router.put('/:id', authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.update);
router.patch('/:id/status', authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.updateStatus);
router.delete('/:id', authorize('super_admin', 'admin'), controller.remove);
module.exports = router;
