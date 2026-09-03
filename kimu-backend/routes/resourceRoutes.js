const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const createResourceController = require('../controllers/resourceController');

function createResourceRoutes(Model, options = {}) {
  const router = express.Router();
  const controller = createResourceController(Model, options);
  router.use(protect);
  router.get('/', controller.list);
  router.post('/', authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.create);
  router.put('/:id', authorize('super_admin', 'admin', 'hr_staff', 'manager'), controller.update);
  router.delete('/:id', authorize('super_admin', 'admin'), controller.remove);
  return router;
}

module.exports = createResourceRoutes;