const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

async function recordActivity({ user, title, description, type, priority = 'normal', action, entity, recordId }) {
  await Promise.all([
    Notification.create({ title, description, type, priority }),
    user && AuditLog.create({ user: user._id, action, entity, recordId: recordId ? String(recordId) : undefined }),
  ]);
}

module.exports = { recordActivity };