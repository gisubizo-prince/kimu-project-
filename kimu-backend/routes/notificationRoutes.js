const express = require('express');
const { protect } = require('../middleware/auth');
const { list, markRead, markAllRead, remove } = require('../controllers/notificationController');
const router = express.Router();
router.get('/', protect, list);
router.patch('/read-all', protect, markAllRead);
router.patch('/:id/read', protect, markRead);
router.delete('/:id', protect, remove);
module.exports = router;