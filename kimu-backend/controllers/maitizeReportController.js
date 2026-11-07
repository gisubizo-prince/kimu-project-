const MaitizeReport = require('../models/MaitizeReport');
const { CAR_NAMES, CAR_PLATES, CONDITIONS } = MaitizeReport;

async function create(req, res, next) {
  try {
    const { date, class_group: classGroup, students, cars, ikitonderwa, reported_by: reportedBy } = req.body;
    if (!isValidDate(date)) return res.status(400).json({ success: false, message: 'Enter a valid training date.' });
    if (!String(classGroup || '').trim()) return res.status(400).json({ success: false, message: 'Class or group name is required.' });
    const attended = wholeNumber(students?.attended);
    const missed = wholeNumber(students?.missed);
    if (attended === null || missed === null) return res.status(400).json({ success: false, message: 'Student totals must be whole numbers greater than or equal to zero.' });
    if (!String(reportedBy || '').trim()) return res.status(400).json({ success: false, message: 'Reporter name is required.' });
    if (!Array.isArray(cars) || cars.length !== CAR_NAMES.length) return res.status(400).json({ success: false, message: 'Include all three vehicles in the report.' });

    const normalizedCars = [];
    for (let index = 0; index < CAR_NAMES.length; index += 1) {
      const car = cars[index];
      if (!car || typeof car !== 'object') return res.status(400).json({ success: false, message: 'Each vehicle entry must be an object.' });
      if (car.car !== CAR_NAMES[index]) return res.status(400).json({ success: false, message: 'Vehicles must be Levin 1, Levin 2, and Dongfeng in order.' });
      if (car.status === 'Not used') {
        normalizedCars.push({ car: CAR_NAMES[index], plate: CAR_PLATES[index], status: 'Not used', teacher: null, km_start: null, km_end: null, km_used: 0, condition_start: null, condition_end: null, start_time: null, end_time: null, hours_worked: 0, problem_details: '' });
        continue;
      }
      if (car.status !== 'Used') return res.status(400).json({ success: false, message: `Choose whether ${CAR_NAMES[index]} was used.` });
      const kmStart = finiteNumber(car.km_start);
      const kmEnd = finiteNumber(car.km_end);
      const start = parseTime(car.start_time);
      const end = parseTime(car.end_time);
      if (!String(car.teacher || '').trim()) return res.status(400).json({ success: false, message: `Enter the teacher for ${CAR_NAMES[index]}.` });
      if (kmStart === null || kmEnd === null || (CAR_NAMES[index] !== 'Dongfeng' && kmEnd < kmStart)) return res.status(400).json({ success: false, message: `Check the kilometre readings for ${CAR_NAMES[index]}. The ending reading must be at least the starting reading.` });
      if (!CONDITIONS.includes(car.condition_start) || !CONDITIONS.includes(car.condition_end)) return res.status(400).json({ success: false, message: `Choose valid start and end conditions for ${CAR_NAMES[index]}.` });
      if (start === null || end === null || end.minutes <= start.minutes) return res.status(400).json({ success: false, message: `End time must be later than start time for ${CAR_NAMES[index]}.` });
      const problemDetails = String(car.problem_details || '').trim();
      if ((car.condition_start === 'Problem' || car.condition_end === 'Problem') && !problemDetails) return res.status(400).json({ success: false, message: `Describe the condition problem for ${CAR_NAMES[index]}.` });
      normalizedCars.push({
        car: CAR_NAMES[index], plate: CAR_PLATES[index], status: 'Used', teacher: String(car.teacher).trim(), km_start: kmStart, km_end: kmEnd,
        km_used: Math.max(kmEnd - kmStart, 0), condition_start: car.condition_start, condition_end: car.condition_end,
        start_time: start.value, end_time: end.value, hours_worked: Number(((end.minutes - start.minutes) / 60).toFixed(2)), problem_details: problemDetails,
      });
    }

    const incidents = normalizedCars.filter((car) => car.problem_details).map((car) => `${car.car}: ${car.problem_details}`);
    const userNote = String(ikitonderwa || '').trim();
    const note = [...(userNote ? [userNote] : []), ...incidents].join('\n');
    if (!note) return res.status(400).json({ success: false, message: 'Class notes are required. Enter an incident or confirm that nothing unusual happened.' });
    const report = await MaitizeReport.create({
      date,
      class_group: String(classGroup).trim(),
      students: { attended, missed, total_registered: attended + missed },
      cars: normalizedCars,
      totals: {
        km_used: normalizedCars.reduce((sum, car) => sum + car.km_used, 0),
        hours_worked: Number(normalizedCars.reduce((sum, car) => sum + car.hours_worked, 0).toFixed(2)),
      },
      ikitonderwa: note,
      reported_by: String(reportedBy).trim(),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: report });
  } catch (error) { next(error); }
}

async function list(req, res, next) {
  try {
    const reports = await MaitizeReport.find().select('date class_group students totals reported_by createdAt').sort({ date: -1, createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: reports });
  } catch (error) { next(error); }
}

async function getById(req, res, next) {
  try {
    const report = await MaitizeReport.findById(req.params.id).select('-__v').lean();
    if (!report) return res.status(404).json({ success: false, message: 'Daily report not found.' });
    res.json({ success: true, data: report });
  } catch (error) { next(error); }
}

function wholeNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function finiteNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { value, minutes: hours * 60 + minutes };
}

module.exports = { create, list, getById };