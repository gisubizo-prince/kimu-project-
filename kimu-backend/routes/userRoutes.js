const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { list, create, update } = require('../controllers/userController');
const router = express.Router();
router.use(protect, authorize('super_admin', 'admin'));
router.get('/', list);
router.post('/', create);
router.put('/:id', update);
module.exports = router;