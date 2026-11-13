import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import kimuLogo from '../../assets/kimu.png';
import './MaitriseReport.css';

const CARS = [
  { car: 'Levin 1', plate: 'RAI631P' },
  { car: 'Levin 2', plate: 'RAK165B' },
  { car: 'Dongfeng', plate: 'RAJ016W' },
];
const CAR_NAMES = CARS.map((vehicle) => vehicle.car);
const CONDITIONS = ['Good', 'Fair', 'Problem'];
const REPORT_SIGNERS = [
  { label: 'Byateguwe na:', name: 'NIYONZIMA JEAN PIERRE', title: "DRIVER'S TRAINER" },
  { label: 'Byagenzuwe na:', name: 'HITIMANA JEAN', title: 'TRAINING CENTER COORDINATOR' },
  { label: 'Byagenzuwe na:', name: 'MANIRAGUHA AGNES', title: 'HEAD OF TRANSPORT' },
  { label: 'Byemejwe na:', name: 'NKUNZIRYAYO JEAN PIERRE', title: 'CEO KIMU TRANSPORT' },
];

function emptyReport() {
  return {
    date: '',
    class_group: '',
    students: { attended: '', missed: '' },
    cars: CARS.map(({ car, plate }) => ({
      car,
      plate,
      status: '',
      teacher: '',
      km_start: '',
      km_end: '',
      condition_start: '',
      condition_end: '',
      start_time: '',
      end_time: '',
      problem_details: '',
      confirm_unusual: false,
    })),
    incident_answer: '',
    incident_details: '',
    reported_by: '',
  };
}

export default function MaitriseReport() {
  const [form, setForm] = useState(emptyReport);
  const [step, setStep] = useState(0);
  const [carIndex, setCarIndex] = useState(0);
  const [view, setView] = useState('new');
  const [savedReport, setSavedReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (view !== 'history') return;
    api.get('/maitrise-reports').then((response) => setHistory(response.data.data || [])).catch((requestError) => setError(requestError.message));
  }, [view]);

  const currentCar = form.cars[carIndex];
  const completedPayload = buildPayload(form);
  const stepNames = ['Class', 'Students', 'Vehicles', 'Ikitonderwa', 'Reporter', 'Review'];

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateStudents(field, value) {
    setForm((current) => ({ ...current, students: { ...current.students, [field]: value } }));
  }

  function updateCar(field, value) {
    setForm((current) => ({
      ...current,
      cars: current.cars.map((car, index) => index === carIndex ? { ...car, [field]: value, confirm_unusual: false } : car),
    }));
  }

  function advanceCar() {
    setError('');
    if (!currentCar.status) return setError('Choose whether this car was used today.');
    if (currentCar.status === 'Used') {
      const startKm = numeric(currentCar.km_start);
      const endKm = numeric(currentCar.km_end);
      const startTime = parseTrainingTime(currentCar.start_time);
      const endTime = parseTrainingTime(currentCar.end_time);
      if (!currentCar.teacher.trim()) return setError('Enter the teacher who used this car.');
      if (startKm === null || endKm === null || (currentCar.car !== 'Dongfeng' && endKm < startKm)) return setError('The ending KM must be greater than or equal to the starting KM.');
      if (!CONDITIONS.includes(currentCar.condition_start) || !CONDITIONS.includes(currentCar.condition_end)) return setError('Choose Good, Fair, or Problem for both vehicle conditions.');
      if (!startTime || !endTime || endTime.minutes <= startTime.minutes) return setError('Enter valid times and make sure the end time is later than the start time.');
      if ((currentCar.condition_start === 'Problem' || currentCar.condition_end === 'Problem') && !currentCar.problem_details.trim()) return setError('Describe the vehicle condition problem.');
      const hours = (endTime.minutes - startTime.minutes) / 60;
      const unusual = (currentCar.car !== 'Dongfeng' && endKm - startKm > 300) || hours > 12;
      if (unusual && !currentCar.confirm_unusual) return setError('Is this correct? Confirm the unusual KM or class duration before continuing.');
    }
    if (carIndex < CAR_NAMES.length - 1) setCarIndex((index) => index + 1);
    else setStep(3);
  }

  function nextStep() {
    setError('');
    if (step === 0) {
      if (!form.date || !form.class_group.trim()) return setError('Enter the training date and class/group name.');
    }
    if (step === 1) {
      const attended = wholeNumber(form.students.attended);
      const missed = wholeNumber(form.students.missed);
      if (attended === null || missed === null) return setError('Student totals must be whole numbers, zero or greater.');
      setForm((current) => ({ ...current, students: { attended, missed } }));
    }
    if (step === 2) return advanceCar();
    if (step === 3 && form.incident_answer === 'yes' && !form.incident_details.trim()) return setError('Describe what happened, or select No if nothing unusual happened.');
    if (step === 4 && !form.reported_by.trim()) return setError('Enter the name of the person preparing this report.');
    setStep((current) => current + 1);
  }

  function previousStep() {
    setError('');
    if (step === 2 && carIndex > 0) setCarIndex((index) => index - 1);
    else if (step === 3) { setStep(2); setCarIndex(CAR_NAMES.length - 1); }
    else setStep((current) => Math.max(current - 1, 0));
  }

  function editStep(targetStep, targetCar = 0) {
    setError('');
    setStep(targetStep);
    if (targetStep === 2) setCarIndex(targetCar);
  }

  async function generateReport() {
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/maitrise-reports', completedPayload);
      setSavedReport(response.data.data);
      setStep(6);
      setView('new');
    } catch (requestError) { setError(requestError.message || 'Unable to save the report.'); }
    finally { setSaving(false); }
  }

  async function openSavedReport(id) {
    setError('');
    try {
      const response = await api.get(`/maitrise-reports/${id}`);
      setSavedReport(response.data.data);
      setStep(6);
      setView('new');
    } catch (requestError) { setError(requestError.message || 'Unable to open the saved report.'); }
  }

  function startNewReport() {
    setForm(emptyReport());
    setSavedReport(null);
    setCarIndex(0);
    setStep(0);
    setView('new');
    setError('');
  }

  function downloadJson(report) {
    const data = kinyarwandaReport(report);
    downloadBlob(JSON.stringify(data, null, 2), `raporo-maitrise-${report.date}.json`, 'application/json');
  }

  async function downloadExcel(report) {
    const XLSX = await import('xlsx');
    const data = exportableReport(report);
    const workbook = XLSX.utils.book_new();
    const summary = [
      ['RAPORO Y’UMUNSI'],
      ['Itariki', data.date],
      [],
      ["ABASHOFERI", 'UMUBARE'],
      ['Abitabiriye', data.students.attended],
      ['Abasibye', data.students.missed],
      ['Abiyandikishije bose', data.students.total_registered],
      [],
      ['Icyitonderwa', data.ikitonderwa],
      ['Raporo yateguwe na', data.reported_by],
    ];
    const vehicles = data.cars.map((car, index) => ({
      'Nomero': index + 1,
      Imodoka: formatVehicleName(car),
      Umwarimu: car.teacher || '-',
      'KM yo gutangira': formatKilometers(car.km_start),
      'KM yo kurangiza': formatKilometers(car.km_end),
      'KM zakozwe': formatKilometers(car.km_used),
      'Imiterere yo gutangira': translateCondition(car.condition_start),
      'Imiterere yo kurangiza': translateCondition(car.condition_end),
      'Igihe cyo gutangira': car.start_time || '-',
      'Igihe cyo kurangiza': car.end_time || '-',
      'Amasaha yakoreshejwe': Number(car.hours_worked).toFixed(2),
      'Imikoreshereze': car.status === 'Not used' ? 'Ntiyakoreshejwe' : 'Yarakoreshejwe',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Incamake');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(vehicles), 'Ibinyabiziga');
    XLSX.writeFile(workbook, `raporo-maitrise-${report.date}.xlsx`);
  }

  async function downloadPdf(report) {
    const document = await buildPdf(report);
    document.save(`raporo-maitrise-${report.date}.pdf`);
  }

  const title = step < stepNames.length ? stepNames[step] : 'Report generated';

  return <main className="maitrise-report">
    <header className="maitrise-report__header">
      <div><p className="kimu-eyebrow">MAITRISE DRIVING SCHOOL</p><h1>MAITRISE REPORT</h1><p>Create and archive a daily class and vehicle report.</p></div>
      <div className="maitrise-report__tabs" role="tablist" aria-label="Report views">
        <button className={view === 'new' ? 'is-active' : ''} onClick={() => { setView('new'); setError(''); }} role="tab" aria-selected={view === 'new'}>New report</button>
        <button className={view === 'history' ? 'is-active' : ''} onClick={() => { setView('history'); setError(''); }} role="tab" aria-selected={view === 'history'}>Saved reports</button>
      </div>
    </header>

    {error && <p className="maitrise-report__error" role="alert">{error}</p>}

    {view === 'history' ? <section className="maitrise-report__panel">
      <div className="maitrise-report__section-heading"><div><h2>Saved daily reports</h2><p>Latest 100 reports</p></div><button className="kimu-btn kimu-btn--primary" onClick={startNewReport}>New report</button></div>
      <div className="maitrise-report__table-wrap"><table><thead><tr><th>Date</th><th>Class/group</th><th>Attended</th><th>Missed</th><th>Registered</th><th>KM used</th><th>Hours</th><th>Reported by</th><th></th></tr></thead><tbody>
        {history.length === 0 ? <tr><td colSpan="9">No saved reports yet.</td></tr> : history.map((report) => <tr key={report._id}><td>{report.date}</td><td>{report.class_group}</td><td>{report.students.attended}</td><td>{report.students.missed}</td><td>{report.students.total_registered}</td><td>{formatKilometers(report.totals.km_used)}</td><td>{Number(report.totals.hours_worked).toFixed(2)}</td><td>{report.reported_by}</td><td><button className="maitrise-report__text-button" onClick={() => openSavedReport(report._id)}>Open</button></td></tr>)}
      </tbody></table></div>
    </section> : step === 6 && savedReport ? <GeneratedReport report={savedReport} onNew={startNewReport} onPdf={() => downloadPdf(savedReport)} onJson={() => downloadJson(savedReport)} onExcel={() => downloadExcel(savedReport)} /> : <>
      <nav className="maitrise-report__progress" aria-label="Report steps">{stepNames.map((name, index) => <div key={name} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}><span>{index + 1}</span>{name}</div>)}</nav>
      <section className="maitrise-report__panel">
        <div className="maitrise-report__section-heading"><div><p className="kimu-eyebrow">STEP {step + 1} OF 6</p><h2>{step === 2 ? `Vehicle ${carIndex + 1} of ${CAR_NAMES.length}: ${currentCar.car} (${currentCar.plate})` : title}</h2></div></div>
        {step === 0 && <div className="maitrise-report__form-grid">
          <label>Training date<input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} /></label>
          <label>Class or group<input value={form.class_group} onChange={(event) => updateForm('class_group', event.target.value)} placeholder="e.g. MAITRISE GROUP A" /></label>
        </div>}

        {step === 1 && <div className="maitrise-report__form-grid">
          <label>Students attended<input type="number" min="0" step="1" value={form.students.attended} onChange={(event) => updateStudents('attended', event.target.value)} /></label>
          <label>Students missed<input type="number" min="0" step="1" value={form.students.missed} onChange={(event) => updateStudents('missed', event.target.value)} /></label>
          <div className="maitrise-report__computed"><span>Total registered</span><strong>{(wholeNumber(form.students.attended) || 0) + (wholeNumber(form.students.missed) || 0)}</strong></div>
        </div>}

        {step === 2 && <VehicleStep car={currentCar} updateCar={updateCar} />}

        {step === 3 && <div className="maitrise-report__incident">
          <p>Did anything serious or unusual happen during today&apos;s training? For example, an accident, vehicle breakdown, student injury, teacher issue, or delay.</p>
          <div className="maitrise-report__choice-row"><label><input type="radio" name="incident" checked={form.incident_answer === 'yes'} onChange={() => { updateForm('incident_answer', 'yes'); updateForm('incident_details', ''); }} /> Yes</label><label><input type="radio" name="incident" checked={form.incident_answer === 'no'} onChange={() => { updateForm('incident_answer', 'no'); updateForm('incident_details', ''); }} /> No</label></div>
          {form.incident_answer === 'yes' && <label>Describe what happened<textarea rows="4" value={form.incident_details} onChange={(event) => updateForm('incident_details', event.target.value)} /></label>}
          {form.incident_answer === 'no' && <p className="maitrise-report__note-preview">The report will say: “Nothing unusual to report.”</p>}
        </div>}

        {step === 4 && <div className="maitrise-report__form-grid"><label>Full name of person preparing the report<input value={form.reported_by} onChange={(event) => updateForm('reported_by', event.target.value)} /></label></div>}

        {step === 5 && <ReviewSummary data={completedPayload} onEdit={editStep} />}

        {step < 5 && <div className="maitrise-report__actions">
          {step > 0 && <button className="kimu-btn kimu-btn--secondary" onClick={previousStep}>Back</button>}
          <button className="kimu-btn kimu-btn--primary" onClick={nextStep}>{step === 5 ? 'Review report' : 'Continue'}</button>
        </div>}
        {step === 5 && <div className="maitrise-report__actions">
          <button className="kimu-btn kimu-btn--secondary" onClick={previousStep}>Back</button>
          <button className="kimu-btn kimu-btn--primary" onClick={generateReport} disabled={saving}>{saving ? 'Saving report...' : 'YES, generate the report'}</button>
        </div>}
        {step === 5 && <p className="maitrise-report__confirm-hint">Confirm that all details are correct before generating and saving this report.</p>}
      </section>
    </>}
  </main>;
}

function VehicleStep({ car, updateCar }) {
  const start = parseTrainingTime(car.start_time);
  const end = parseTrainingTime(car.end_time);
  const kmUsed = numeric(car.km_end) !== null && numeric(car.km_start) !== null ? numeric(car.km_end) - numeric(car.km_start) : 0;
  const hours = start && end && end.minutes > start.minutes ? (end.minutes - start.minutes) / 60 : 0;
  const unusual = kmUsed > 300 || hours > 12;
  return <div className="maitrise-report__vehicle-step">
    <div className="maitrise-report__choice-row">
      <button type="button" className={`maitrise-report__choice ${car.status === 'Used' ? 'is-selected' : ''}`} onClick={() => updateCar('status', 'Used')}>Used today</button>
      <button type="button" className={`maitrise-report__choice ${car.status === 'Not used' ? 'is-selected' : ''}`} onClick={() => updateCar('status', 'Not used')}>Not used</button>
    </div>
    {car.status === 'Used' && <>
      <div className="maitrise-report__form-grid">
        <label>Teacher / instructor<input value={car.teacher} onChange={(event) => updateCar('teacher', event.target.value)} /></label>
        <label>KM at start<input type="number" min="0" step="any" value={car.km_start} onChange={(event) => updateCar('km_start', event.target.value)} /></label>
        <label>KM at end<input type="number" min="0" step="any" value={car.km_end} onChange={(event) => updateCar('km_end', event.target.value)} /></label>
        <label>Condition at start<select value={car.condition_start} onChange={(event) => updateCar('condition_start', event.target.value)}><option value="">Choose condition</option>{CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
        <label>Condition at end<select value={car.condition_end} onChange={(event) => updateCar('condition_end', event.target.value)}><option value="">Choose condition</option>{CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
        <label>Class start time<input value={car.start_time} onChange={(event) => updateCar('start_time', event.target.value)} placeholder="8am, 08:00, saa mbiri" /></label>
        <label>Class end time<input value={car.end_time} onChange={(event) => updateCar('end_time', event.target.value)} placeholder="11:30am, 11:30" /></label>
      </div>
      {(car.condition_start === 'Problem' || car.condition_end === 'Problem') && <label className="maitrise-report__full-field">Describe the vehicle problem<textarea rows="3" value={car.problem_details} onChange={(event) => updateCar('problem_details', event.target.value)} /></label>}
      <div className="maitrise-report__vehicle-calculation"><span>KM used so far: <strong>{Math.max(kmUsed, 0)}</strong></span><span>Hours so far: <strong>{hours.toFixed(2)}</strong></span></div>
      {unusual && <label className="maitrise-report__unusual"><input type="checkbox" checked={car.confirm_unusual} onChange={(event) => updateCar('confirm_unusual', event.target.checked)} /><span>Is this correct? I verified the mileage or class duration.</span></label>}
    </>}
    {car.status === 'Not used' && <p className="maitrise-report__note-preview">This vehicle will appear as NOT USED and will not be included in totals.</p>}
  </div>;
}

function ReviewSummary({ data, onEdit }) {
  return <div className="maitrise-report__review">
    <section><div className="maitrise-report__review-heading"><h3>Class details</h3><button onClick={() => onEdit(0)}>Edit</button></div><p>Date: {data.date} · Class/group: {data.class_group}</p></section>
    <section><div className="maitrise-report__review-heading"><h3>Student attendance</h3><button onClick={() => onEdit(1)}>Edit</button></div><p>Attended {data.students.attended} · Missed {data.students.missed} · Total registered {data.students.total_registered}</p></section>
    <section><div className="maitrise-report__review-heading"><h3>Vehicle utilization</h3><button onClick={() => onEdit(2, 0)}>Edit</button></div><div className="maitrise-report__table-wrap"><table><thead><tr><th>Imodoka</th><th>Teacher</th><th>KM start</th><th>KM end</th><th>KM used</th><th>Condition</th><th>Start</th><th>End</th><th>Hours</th></tr></thead><tbody>{data.cars.map((car) => <tr key={car.car}><td>{formatVehicleName(car)}</td>{car.status === 'Not used' ? <td colSpan="8">NOT USED</td> : <><td>{car.teacher}</td><td>{formatKilometers(car.km_start)}</td><td>{formatKilometers(car.km_end)}</td><td>{formatKilometers(car.km_used)}</td><td>{translateCondition(car.condition_start)} / {translateCondition(car.condition_end)}</td><td>{car.start_time}</td><td>{car.end_time}</td><td>{car.hours_worked.toFixed(2)}</td></>}</tr>)}</tbody></table></div></section>
    <section><div className="maitrise-report__review-heading"><h3>Ikitonderwa</h3><button onClick={() => onEdit(3)}>Edit</button></div><p className="maitrise-report__preserve-lines">{data.ikitonderwa}</p></section>
    <section><div className="maitrise-report__review-heading"><h3>Reported by</h3><button onClick={() => onEdit(4)}>Edit</button></div><p>{data.reported_by}</p></section>
  </div>;
}

function GeneratedReport({ report, onNew, onPdf, onJson, onExcel }) {
  const data = exportableReport(report);
  return <section className="maitrise-report__panel">
    <div className="maitrise-report__section-heading"><div><p className="kimu-eyebrow">RAPORO YABITSWE</p><h2>Raporo y'amasomo y'umunsi yarakozwe</h2><p>{report.date} · {report.class_group}</p></div><button className="kimu-btn kimu-btn--secondary" onClick={onNew}>Tangira indi raporo</button></div>
    <ReportDocument report={data} />
    <div className="maitrise-report__export-actions"><button className="kimu-btn kimu-btn--primary" onClick={onPdf}>Kuramo PDF</button><button className="kimu-btn kimu-btn--secondary" onClick={onExcel}>Ohereza muri Excel</button><button className="kimu-btn kimu-btn--secondary" onClick={onJson}>Kuramo JSON</button></div>
    <details className="maitrise-report__json"><summary>Reba raporo mu miterere ya JSON</summary><pre>{JSON.stringify(kinyarwandaReport(data), null, 2)}</pre></details>
  </section>;
}

function ReportDocument({ report }) {
  const vehiclesUsed = report.cars.filter((car) => car.status === 'Used').length;
  return <article className="maitrise-report__document">
    <section className="maitrise-report__document-page">
      <img className="maitrise-report__document-logo" src={kimuLogo} alt="Kimu Transport logo" />
      <header className="maitrise-report__document-heading">
        <div><p>MAITRISE · DAILY TRAINING REPORT</p><h2>Raporo y'umunsi</h2></div>
        <div><strong>{report.date}</strong><span>{report.class_group}</span></div>
      </header>
      <div className="maitrise-report__executive-summary">
        <div><span>Abitabiriye</span><strong>{report.students.attended}</strong></div>
        <div><span>Abasibye</span><strong>{report.students.missed}</strong></div>
        <div><span>Abanyeshuri bose</span><strong>{report.students.total_registered}</strong></div>
        <div><span>Imodoka zakoreshejwe</span><strong>{vehiclesUsed} / {report.cars.length}</strong></div>
        <div><span>Intera yose</span><strong>{formatKilometers(report.totals.km_used)} km</strong></div>
        <div><span>Amasaha yose</span><strong>{Number(report.totals.hours_worked).toFixed(2)}</strong></div>
      </div>
      <div className="maitrise-report__table-wrap">
        <table className="maitrise-report__vehicle-table">
          <thead><tr><th>No.</th><th>Imodoka</th><th>Umwarimu</th><th>KM gutangira</th><th>KM gusoza</th><th>KM zakozwe</th><th>Imiterere (intangiriro / isoza)</th><th>Amasaha (itangiriro - isoza)</th><th>Igiteranyo</th></tr></thead>
          <tbody>{report.cars.map((car, index) => <tr key={car.car}><td>{index + 1}</td><td>{formatVehicleName(car)}</td>{car.status === 'Not used' ? <td colSpan="7">Ntiyakoreshejwe</td> : <><td>{car.teacher}</td><td>{formatKilometers(car.km_start)}</td><td>{formatKilometers(car.km_end)}</td><td>{formatKilometers(car.km_used)}</td><td>{translateCondition(car.condition_start)} / {translateCondition(car.condition_end)}</td><td>{car.start_time} - {car.end_time}</td><td>{Number(car.hours_worked).toFixed(2)} h</td></>}</tr>)}</tbody>
        </table>
      </div>
      <section className="maitrise-report__executive-note"><h3>Icyitonderwa / Ibibazo</h3><p className="maitrise-report__preserve-lines">{report.ikitonderwa || 'Nta kindi cyanditswe.'}</p></section>
      <footer className="maitrise-report__document-footer">
        <p>Yateguwe na: <strong>{report.reported_by || '-'}</strong></p>
        <div className="maitrise-report__signature-grid">{REPORT_SIGNERS.map((signer) => <div key={signer.name}><strong>{signer.label}</strong><span>{signer.name}</span><small>{signer.title}</small><i /></div>)}</div>
      </footer>
    </section>
  </article>;
}

function buildPayload(form) {
  const cars = form.cars.map((car) => {
    if (car.status !== 'Used') return { car: car.car, plate: car.plate, status: 'Not used', teacher: null, km_start: null, km_end: null, km_used: 0, condition_start: null, condition_end: null, start_time: null, end_time: null, hours_worked: 0, problem_details: '' };
    const start = parseTrainingTime(car.start_time);
    const end = parseTrainingTime(car.end_time);
    const kmStart = numeric(car.km_start) ?? 0;
    const kmEnd = numeric(car.km_end) ?? 0;
    return { car: car.car, plate: car.plate, status: 'Used', teacher: car.teacher.trim(), km_start: kmStart, km_end: kmEnd, km_used: Math.max(kmEnd - kmStart, 0), condition_start: car.condition_start, condition_end: car.condition_end, start_time: start?.value || '', end_time: end?.value || '', hours_worked: start && end && end.minutes > start.minutes ? Number(((end.minutes - start.minutes) / 60).toFixed(2)) : 0, problem_details: car.problem_details.trim() };
  });
  const problemNotes = cars.filter((car) => car.problem_details).map((car) => `${car.car}: ${car.problem_details}`);
  const note = form.incident_answer === 'yes' ? form.incident_details.trim() : problemNotes.length ? '' : 'Nothing unusual to report.';
  const attended = wholeNumber(form.students.attended) || 0;
  const missed = wholeNumber(form.students.missed) || 0;
  return { date: form.date, class_group: form.class_group.trim(), students: { attended, missed, total_registered: attended + missed }, cars, totals: { km_used: cars.reduce((total, car) => total + car.km_used, 0), hours_worked: Number(cars.reduce((total, car) => total + car.hours_worked, 0).toFixed(2)) }, ikitonderwa: cleanReportNote([note, ...problemNotes].join('\n')) || 'No additional notes.', reported_by: form.reported_by.trim() };
}

function exportableReport(report) {
  return {
    date: report.date,
    class_group: report.class_group,
    students: report.students,
    cars: report.cars,
    totals: report.totals,
    ikitonderwa: cleanReportNote(report.ikitonderwa),
    reported_by: report.reported_by,
    signatures: report.signatures || { prepared_by: 'JEAN', verified_by: 'AGNES', approved_by: 'CEO NKUNZIRYAYO JEAN PIERRE', maitrise_director: 'HITIMANA JEAN' },
  };
}

function kinyarwandaReport(report) {
  const data = exportableReport(report);
  return {
    itariki: data.date,
    icyiciro_cyangwa_itsinda: data.class_group,
    abanyeshuri: {
      bitabiriye: data.students.attended,
      abataritabiriye: data.students.missed,
      abanditswe_bose: data.students.total_registered,
    },
    ibinyabiziga: data.cars.map((car, index) => ({
      nimero: index + 1,
      imodoka: formatVehicleName(car),
      umwarimu: car.teacher || '-',
      km_yo_gutangira: roundKilometers(car.km_start),
      km_yo_kurangiza: roundKilometers(car.km_end),
      km_zakozwe: roundKilometers(car.km_used),
      imiterere_yo_gutangira: translateCondition(car.condition_start),
      imiterere_yo_kurangiza: translateCondition(car.condition_end),
      igihe_cyo_gutangira: car.start_time || '-',
      igihe_cyo_kurangiza: car.end_time || '-',
      amasaha_yakoreshejwe: Number(car.hours_worked).toFixed(2),
      uko_ikinyabiziga_cyakoreshejwe: car.status === 'Not used' ? 'Ntiyakoreshejwe' : 'Cyakoreshejwe',
    })),
    icyitonderwa: data.ikitonderwa,
    raporo_yateguwe_na: data.reported_by,
    abasinya: REPORT_SIGNERS.map(({ label, name, title }) => ({ uwasinye: name, inshingano: title, igikorwa: label })),
  };
}

function roundKilometers(value) {
  return value === null || value === undefined ? null : Number(Number(value).toFixed(1));
}

function formatKilometers(value) {
  const rounded = roundKilometers(value);
  return rounded === null ? '-' : rounded.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function formatVehicleName(car) {
  return car.plate ? `${car.car} (${car.plate})` : car.car;
}

function translateCondition(condition) {
  return { Good: 'Byiza', Fair: 'Bisanzwe', Problem: 'Ikibazo' }[condition] || '-';
}

function cleanReportNote(value) {
  return String(value || '')
    .replace(/Muri\s+Maitrise\s+dukeneye\s+umushoferi\s+usimbura\s+uwagiye\s+kugira\s+ngo\s+amahugurwa\s+akomeze\s+kugenda\s+neza[.,]?\s+ariko\s+mugihe\s+ataraboneka\s+twari\s+turikwifashisha\s+GISUBIZO\s+PRINCE\s+mumahugurwa[.!]?/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function buildPdf(sourceReport) {
  const report = exportableReport(sourceReport);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 9;
  const contentWidth = pageWidth - margin * 2;
  const logoHeight = contentWidth * logo.naturalHeight / logo.naturalWidth;
  doc.addImage(logo, 'PNG', margin, 7, contentWidth, logoHeight);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text("MAITRISE | RAPORO Y'UMUNSI", margin, 76);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Itsinda: ${report.class_group || '-'}     Itariki: ${report.date}`, pageWidth - margin, 76, { align: 'right' });

  autoTable(doc, {
    theme: 'grid',
    startY: 80,
    margin: { left: margin, right: margin, bottom: 8 },
    head: [['ABITABIRIYE', 'ABATARITABIRIYE', 'ABANYESHURI BOSE', 'IMODOKA ZAKORESHEJWE', 'INTERA YOSE (KM)', 'AMASAHA YOSE']],
    body: [[report.students.attended, report.students.missed, report.students.total_registered, `${report.cars.filter((car) => car.status === 'Used').length} / ${report.cars.length}`, formatKilometers(report.totals.km_used), Number(report.totals.hours_worked).toFixed(2)]],
    styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0], fillColor: [255, 255, 255], lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
    headStyles: { fontSize: 8, fillColor: [235, 242, 238], textColor: [0, 0, 0], lineColor: [0, 0, 0], fontStyle: 'bold' },
  });

  const body = report.cars.map((car, index) => [
    index + 1,
    formatVehicleName(car),
    car.status === 'Used' ? car.teacher : 'Ntiyakoreshejwe',
    car.status === 'Used' ? formatKilometers(car.km_start) : '-',
    car.status === 'Used' ? formatKilometers(car.km_end) : '-',
    car.status === 'Used' ? formatKilometers(car.km_used) : '-',
    car.status === 'Used' ? `${translateCondition(car.condition_start)} / ${translateCondition(car.condition_end)}` : '-',
    car.status === 'Used' ? `${car.start_time} - ${car.end_time}` : '-',
    car.status === 'Used' ? `${Number(car.hours_worked).toFixed(2)} h` : '-',
  ]);
  autoTable(doc, {
    theme: 'grid',
    startY: doc.lastAutoTable.finalY + 4,
    margin: { left: margin, right: margin, bottom: 8 },
    head: [['NO.', 'IMODOKA', 'UMWARIMU', 'KM YO GUTANGIRA', 'KM YO GUSOZA', 'KM ZAKOZWE', 'IMITERERE (TANGIRA / SOZA)', 'AMASAHA (TANGIRA - SOZA)', 'IGITERANYO']],
    body,
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle', textColor: [0, 0, 0], fillColor: [255, 255, 255], lineColor: [0, 0, 0], lineWidth: 0.2 },
    headStyles: { fontSize: 7, fillColor: [235, 242, 238], textColor: [0, 0, 0], lineColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 31 }, 2: { cellWidth: 31 }, 3: { cellWidth: 27 }, 4: { cellWidth: 27 }, 5: { cellWidth: 23 }, 6: { cellWidth: 42 }, 7: { cellWidth: 43 }, 8: { cellWidth: 28 } },
  });

  const note = report.ikitonderwa || 'Nta kindi cyanditswe.';
  const noteTitleY = doc.lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ICYITONDERWA / IBIBAZO', margin, noteTitleY);
  const signatureY = pageHeight - 24;
  let noteFontSize = 9;
  let noteLines;
  do {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(noteFontSize);
    noteLines = doc.splitTextToSize(note, contentWidth);
    if (noteLines.length * noteFontSize * 0.42 <= signatureY - noteTitleY - 5 || noteFontSize <= 7) break;
    noteFontSize -= 0.5;
  } while (noteFontSize > 6.5);
  doc.setFontSize(noteFontSize);
  doc.text(noteLines, margin, noteTitleY + 5, { lineHeightFactor: 0.9 });

  const signatureXs = [margin, 79, 149, 219];
  REPORT_SIGNERS.forEach((signer, index) => {
    const x = signatureXs[index];
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(signer.label, x, signatureY);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize(signer.name, 64), x, signatureY + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(doc.splitTextToSize(signer.title, 64), x, signatureY + 8);
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25); doc.line(x, signatureY + 14, x + 64, signatureY + 14);
  });

  const generatedDate = new Date().toLocaleDateString('en-GB');
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, pageHeight - 6, pageWidth - margin, pageHeight - 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
  doc.text(`Byakozwe: ${generatedDate}   |   Yateguwe na: ${report.reported_by || '-'}`, margin, pageHeight - 3);
  doc.text('MAITRISE', pageWidth - margin, pageHeight - 3, { align: 'right' });
  return doc;
}

function loadLogo() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = kimuLogo;
  });
}

function numeric(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function wholeNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function parseTrainingTime(value) {
  const raw = String(value || '').trim().toLowerCase();
  const meridiem = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(raw);
  if (meridiem) {
    let hours = Number(meridiem[1]);
    const minutes = Number(meridiem[2] || 0);
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (meridiem[3] === 'am' && hours === 12) hours = 0;
    if (meridiem[3] === 'pm' && hours !== 12) hours += 12;
    return formattedTime(hours, minutes);
  }
  const clock = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (hours > 23 || minutes > 59) return null;
    return formattedTime(hours, minutes);
  }
  const kinyarwanda = raw.replace(/[’']/g, '').replace(/\s+/g, ' ');
  const phrases = { 'saa moya': 1, 'saa imwe': 1, 'saa mbiri': 2, 'saa mbili': 2, 'saa tatu': 3, 'saa yine': 4, 'saa enye': 4, 'saa tanu': 5, 'saa tano': 5, 'saa sita': 6, 'saa saba': 7, 'saa munani': 8, 'saa umunani': 8, 'saa cyenda': 9, 'saa icyenda': 9, 'saa kumi': 10, 'saa kumi nimwe': 11, 'saa kumi nibiri': 12, 'saa kumi nebyiri': 12 };
  if (phrases[kinyarwanda]) return formattedTime(phrases[kinyarwanda] + 6, 0);
  const saaNumber = /^saa\s+(\d{1,2})$/.exec(kinyarwanda);
  if (saaNumber && Number(saaNumber[1]) >= 1 && Number(saaNumber[1]) <= 12) return formattedTime(Number(saaNumber[1]) + 6, 0);
  return null;
}

function formattedTime(hours, minutes) {
  return { value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, minutes: hours * 60 + minutes };
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}