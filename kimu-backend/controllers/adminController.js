const CompanySettings = require('../models/CompanySettings');
const SystemSettings = require('../models/SystemSettings');
const AuditLog = require('../models/AuditLog');

async function getSettings(req, res, next) { try { const [company, system] = await Promise.all([CompanySettings.findOne({ key: 'default' }), SystemSettings.findOne({ key: 'default' })]); res.json({ success: true, data: { company: company || {}, system: system || {} } }); } catch (error) { next(error); } }
async function updateSettings(req, res, next) { try { const company = await CompanySettings.findOneAndUpdate({ key: 'default' }, { ...req.body.company, key: 'default' }, { new: true, upsert: true, runValidators: true }); const system = await SystemSettings.findOneAndUpdate({ key: 'default' }, { ...req.body.system, key: 'default' }, { new: true, upsert: true, runValidators: true }); await AuditLog.create({ user: req.user._id, action: 'updated system settings', entity: 'settings' }); res.json({ success: true, message: 'System settings saved successfully.', data: { company, system } }); } catch (error) { next(error); } }
async function audit(req, res, next) { try { const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100).populate('user', 'fullName email role'); res.json({ success: true, data: logs }); } catch (error) { next(error); } }
module.exports = { getSettings, updateSettings, audit };