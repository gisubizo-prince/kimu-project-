const User = require('../models/User');
const { ROLES } = require('../models/User');
const AuditLog = require('../models/AuditLog');

async function list(req, res, next) { try { const users = await User.find().sort({ fullName: 1 }).collation({ locale: 'en', strength: 2 }); res.json({ success: true, data: users.map((user) => user.toSafeObject()) }); } catch (error) { next(error); } }
async function create(req, res, next) {
  try {
    const { fullName, email, password, phone, role } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    if (typeof fullName !== 'string' || fullName.length > 200 || typeof email !== 'string' || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length > 128 || (phone !== undefined && (typeof phone !== 'string' || phone.length > 40))) return res.status(400).json({ success: false, message: 'User details are invalid.' });
    if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
    if (role === 'super_admin' && req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Only a super administrator can assign the super administrator role.' });
    const user = await User.create({ fullName, email, password, phone, role: role || 'manager' });
    if (role === 'super_admin') await AuditLog.create({ user: req.user._id, action: 'assigned super_admin role', entity: 'user', recordId: String(user._id), details: { role } });
    res.status(201).json({ success: true, data: { user: user.toSafeObject() } });
  } catch (error) { next(error); }
}
async function update(req, res, next) {
  try {
    const { fullName, phone, role, isActive } = req.body;
    if (fullName !== undefined && (typeof fullName !== 'string' || fullName.length > 200)) return res.status(400).json({ success: false, message: 'Name is invalid.' });
    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 40)) return res.status(400).json({ success: false, message: 'Phone is invalid.' });
    if (isActive !== undefined && typeof isActive !== 'boolean') return res.status(400).json({ success: false, message: 'isActive must be a boolean.' });
    if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const touchesSuperAdmin = user.role === 'super_admin' || role === 'super_admin';
    if (touchesSuperAdmin && req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Only a super administrator can modify a super administrator account.' });
    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    const removingActiveSuperAdmin = user.role === 'super_admin' && (role !== undefined && role !== 'super_admin' || isActive === false);
    if (removingActiveSuperAdmin) {
      const activeSuperAdmins = await User.countDocuments({ role: 'super_admin', isActive: true });
      if (activeSuperAdmins <= 1) return res.status(409).json({ success: false, message: 'The last active super administrator cannot be deactivated.' });
    }
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    await user.save();
    if (role !== undefined || isActive !== undefined) await AuditLog.create({ user: req.user._id, action: 'updated user access', entity: 'user', recordId: String(user._id), details: { role: user.role, isActive: user.isActive } });
    res.json({ success: true, data: { user: user.toSafeObject() } });
  } catch (error) { next(error); }
}
module.exports = { list, create, update };
