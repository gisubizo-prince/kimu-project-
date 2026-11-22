const { recordActivity } = require('../utils/activity');

function createResourceController(Model, options = {}) {
  const searchable = options.searchable || [];
  const uniqueFields = options.uniqueFields || [];

  return {
    list: async (req, res, next) => {
      try {
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        if (search.length > 100) return res.status(400).json({ success: false, message: 'Search term is too long.' });
        const filter = {};
        if (search && searchable.length) {
          filter.$or = searchable.map((field) => ({ [field]: { $regex: escapeRegex(search), $options: 'i' } }));
        }
        if (req.query.status) filter.status = req.query.status;
        const items = await Model.find(filter)
          .sort({ fullName: 1, createdAt: -1 })
          .collation({ locale: 'en', strength: 2 })
          .populate(options.populate || []);
        res.json({ success: true, data: items });
      } catch (error) { next(error); }
    },
    create: async (req, res, next) => {
      try {
        const payload = sanitizePayload(Model, req.body);
        if (payload.error) return res.status(400).json({ success: false, message: payload.error });
        if (uniqueFields.length) {
          const duplicate = await Model.findOne({ $or: uniqueFields.filter((field) => payload.data[field]).map((field) => ({ [field]: { $regex: `^${escapeRegex(String(payload.data[field]).trim())}$`, $options: 'i' } })) }).lean();
          if (duplicate) return res.status(409).json({ success: false, message: 'An employee with the same name or employee number already exists.' });
        }
        const item = await Model.create(payload.data);
        if (options.activity) await recordActivity({ user: req.user, ...options.activity.create(item), recordId: item._id });
        res.status(201).json({ success: true, data: item });
      } catch (error) { next(error); }
    },
    update: async (req, res, next) => {
      try {
        const payload = sanitizePayload(Model, req.body);
        if (payload.error) return res.status(400).json({ success: false, message: payload.error });
        if (uniqueFields.length) {
          const duplicate = await Model.findOne({ _id: { $ne: req.params.id }, $or: uniqueFields.filter((field) => payload.data[field]).map((field) => ({ [field]: { $regex: `^${escapeRegex(String(payload.data[field]).trim())}$`, $options: 'i' } })) }).lean();
          if (duplicate) return res.status(409).json({ success: false, message: 'An employee with the same name or employee number already exists.' });
        }
        const item = await Model.findByIdAndUpdate(req.params.id, { $set: payload.data }, { new: true, runValidators: true }).populate(options.populate || []);
        if (!item) return res.status(404).json({ success: false, message: 'Record not found.' });
        if (options.activity) await recordActivity({ user: req.user, ...options.activity.update(item), recordId: item._id });
        res.json({ success: true, data: item });
      } catch (error) { next(error); }
    },
    remove: async (req, res, next) => {
      try {
        const item = await Model.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Record not found.' });
        if (options.activity) await recordActivity({ user: req.user, ...options.activity.remove(item), recordId: item._id });
        res.json({ success: true, message: 'Record deleted.' });
      } catch (error) { next(error); }
    },
  };
}

function sanitizePayload(Model, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Request body must be an object.' };
  const allowed = new Set(Object.keys(Model.schema.paths).filter((field) => !['_id', '__v', 'createdAt', 'updatedAt'].includes(field)));
  const keys = Object.keys(body);
  if (keys.some((field) => !allowed.has(field) || field.startsWith('$') || field.includes('.'))) return { error: 'Request contains unsupported fields.' };
  return { data: body };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = createResourceController;
module.exports.sanitizePayload = sanitizePayload;
