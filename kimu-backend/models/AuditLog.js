const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    recordId: { type: String, trim: true },
    details: { type: require('mongoose').Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Audit events are append-only at both the application and database-role layers.
// This guard prevents accidental edits/deletes through Mongoose query APIs.
const immutableOperations = [
  'updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne',
  'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove',
];
auditLogSchema.pre('save', function rejectSavedAuditMutation() {
  if (!this.isNew) throw new Error('Audit log entries are append-only.');
});
auditLogSchema.pre(immutableOperations, function rejectAuditMutation() {
  throw new Error('Audit log entries are append-only.');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
