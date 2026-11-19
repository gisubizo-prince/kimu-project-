const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/taxiDriverController');

const router = express.Router();
router.get('/', controller.listPublished);
router.get('/manage', protect, authorize('super_admin', 'admin'), controller.listAll);
router.get('/:id', controller.getPublished);
router.post('/', protect, authorize('super_admin', 'admin'), controller.create);
router.put('/:id', protect, authorize('super_admin', 'admin'), controller.update);
router.delete('/:id', protect, authorize('super_admin', 'admin'), controller.remove);
module.exports = router;
