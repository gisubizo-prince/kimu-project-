const { recordActivity } = require('../utils/activity');

function createResourceController(Model, options = {}) {
  const searchable = options.searchable || [];
  const uniqueFields = options.uniqueFields || [];

  return {
    list: async (req, res, next) => {
      try {
        const filter = {};
        if (req.query.search && searchable.length) {
          filter.$or = searchable.map((field) => ({ [field]: { $regex: req.query.search, $options: 'i' } }));
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
        if (uniqueFields.length) {
          const duplicate = await Model.findOne({ $or: uniqueFields.filter((field) => req.body[field]).map((field) => ({ [field]: { $regex: `^${escapeRegex(String(req.body[field]).trim())}$`, $options: 'i' } })) }).lean();
          if (duplicate) return res.status(409).json({ success: false, message: 'An employee with the same name or employee number already exists.' });
        }
        const item = await Model.create(req.body);
        if (options.activity) await recordActivity({ user: req.user, ...options.activity.create(item), recordId: item._id });
        res.status(201).json({ success: true, data: item });
      } catch (error) { next(error); }
    },
    update: async (req, res, next) => {
      try {
        if (uniqueFields.length) {
          const duplicate = await Model.findOne({ _id: { $ne: req.params.id }, $or: uniqueFields.filter((field) => req.body[field]).map((field) => ({ [field]: { $regex: `^${escapeRegex(String(req.body[field]).trim())}$`, $options: 'i' } })) }).lean();
          if (duplicate) return res.status(409).json({ success: false, message: 'An employee with the same name or employee number already exists.' });
        }
        const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(options.populate || []);
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = createResourceController;