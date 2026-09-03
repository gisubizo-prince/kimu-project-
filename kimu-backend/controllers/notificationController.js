const Notification = require('../models/Notification');

async function list(req, res, next) {
  try {
    const filter = { $or: [{ recipient: null }, { recipient: req.user._id }] };
    if (req.query.type && req.query.type !== 'all') filter.type = req.query.type;
    if (req.query.read === 'true' || req.query.read === 'false') filter.read = req.query.read === 'true';
    const [items, unread] = await Promise.all([Notification.find(filter).sort({ createdAt: -1 }).limit(100), Notification.countDocuments({ ...filter, read: false })]);
    res.json({ success: true, data: items, unread });
  } catch (error) { next(error); }
}
async function markRead(req, res, next) {
  try { const item = await Notification.findOneAndUpdate({ _id: req.params.id, $or: [{ recipient: null }, { recipient: req.user._id }] }, { read: true }, { new: true }); if (!item) return res.status(404).json({ success: false, message: 'Notification not found.' }); res.json({ success: true, data: item }); } catch (error) { next(error); }
}
async function markAllRead(req, res, next) {
  try { await Notification.updateMany({ $or: [{ recipient: null }, { recipient: req.user._id }], read: false }, { read: true }); res.json({ success: true, message: 'All notifications marked as read.' }); } catch (error) { next(error); }
}
async function remove(req, res, next) {
  try { const item = await Notification.findOneAndDelete({ _id: req.params.id, $or: [{ recipient: null }, { recipient: req.user._id }] }); if (!item) return res.status(404).json({ success: false, message: 'Notification not found.' }); res.json({ success: true, message: 'Notification deleted.' }); } catch (error) { next(error); }
}
module.exports = { list, markRead, markAllRead, remove };