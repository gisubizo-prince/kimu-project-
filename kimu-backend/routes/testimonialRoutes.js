const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/testimonialController');

const router = express.Router();

router.get('/', controller.listPublished);
router.get('/manage', protect, authorize('super_admin', 'admin'), controller.listAll);
router.post('/', protect, authorize('super_admin', 'admin'), controller.create);
router.delete('/:id', protect, authorize('super_admin', 'admin'), controller.remove);

module.exports = router;
