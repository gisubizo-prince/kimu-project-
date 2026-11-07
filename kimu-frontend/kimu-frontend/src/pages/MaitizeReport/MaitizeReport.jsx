import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import kimuLogo from '../../assets/kimu.png';
import './MaitizeReport.css';

const CARS = [
  { car: 'Levin 1', plate: 'RAI631P' },
  { car: 'Levin 2', plate: 'RAK165B' },
  { car: 'Dongfeng', plate: 'RAJ016W' },
];
const CAR_NAMES = CARS.map((vehicle) => vehicle.car);
const CONDITIONS = ['Good', 'Fair', 'Problem'];

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

export default function MaitizeReport() {
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
    api.get('/maitize-reports').then((response) => setHistory(response.data.data || [])).catch((requestError) => setError(requestError.message));
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
      const response = await api.post('/maitize-reports', completedPayload);
      setSavedReport(response.data.data);
      setStep(6);
      setView('new');
    } catch (requestError) { setError(requestError.message || 'Unable to save the report.'); }
    finally { setSaving(false); }
  }

  async function openSavedReport(id) {
    setError('');
    try {
      const response = await api.get(`/maitize-reports/${id}`);
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
    const data = exportableReport(report);
    downloadBlob(JSON.stringify(data, null, 2), `maitize-report-${report.date}.json`, 'application/json');
  }

  async function downloadExcel(report) {
    const XLSX = await import('xlsx');
    const data = exportableReport(report);
    const workbook = XLSX.utils.book_new();
    const summary = [
      ['DAILY CLASS REPORT'],
      ['Date', data.date],
      ['Class/Group', data.class_group],
      [],
      ['ATTENDANCE PARTICULARS', 'TOTAL'],
      ['Students attended', data.students.attended],
      ['Students missed', data.students.missed],
      ['Total registered', data.students.total_registered],
      [],
      ['Total KM used', data.totals.km_used],
      ['Total hours worked', data.totals.hours_worked],
      ['Ikitonderwa', data.ikitonderwa],
      ['Reported by', data.reported_by],
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Class Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.cars), 'Vehicle Utilization');
    XLSX.writeFile(workbook, `maitize-report-${report.date}.xlsx`);
  }

  async function downloadPdf(report) {
    const document = await buildPdf(report);
    document.save(`maitize-report-${report.date}.pdf`);
  }

  const title = step < stepNames.length ? stepNames[step] : 'Report generated';

  return <main className="maitize-report">
    <header className="maitize-report__header">
      <div><p className="kimu-eyebrow">METRIZE DRIVING SCHOOL</p><h1>MAITIZE REPORT</h1><p>Create and archive a daily class and vehicle report.</p></div>
      <div className="maitize-report__tabs" role="tablist" aria-label="Report views">
        <button className={view === 'new' ? 'is-active' : ''} onClick={() => { setView('new'); setError(''); }} role="tab" aria-selected={view === 'new'}>New report</button>
        <button className={view === 'history' ? 'is-active' : ''} onClick={() => { setView('history'); setError(''); }} role="tab" aria-selected={view === 'history'}>Saved reports</button>
      </div>
    </header>

    {error && <p className="maitize-report__error" role="alert">{error}</p>}

    {view === 'history' ? <section className="maitize-report__panel">
      <div className="maitize-report__section-heading"><div><h2>Saved daily reports</h2><p>Latest 100 reports</p></div><button className="kimu-btn kimu-btn--primary" onClick={startNewReport}>New report</button></div>
      <div className="maitize-report__table-wrap"><table><thead><tr><th>Date</th><th>Class/group</th><th>Attended</th><th>Missed</th><th>Registered</th><th>KM used</th><th>Hours</th><th>Reported by</th><th></th></tr></thead><tbody>
        {history.length === 0 ? <tr><td colSpan="9">No saved reports yet.</td></tr> : history.map((report) => <tr key={report._id}><td>{report.date}</td><td>{report.class_group}</td><td>{report.students.attended}</td><td>{report.students.missed}</td><td>{report.students.total_registered}</td><td>{report.totals.km_used}</td><td>{Number(report.totals.hours_worked).toFixed(2)}</td><td>{report.reported_by}</td><td><button className="maitize-report__text-button" onClick={() => openSavedReport(report._id)}>Open</button></td></tr>)}
      </tbody></table></div>
    </section> : step === 6 && savedReport ? <GeneratedReport report={savedReport} onNew={startNewReport} onPdf={() => downloadPdf(savedReport)} onJson={() => downloadJson(savedReport)} onExcel={() => downloadExcel(savedReport)} /> : <>
      <nav className="maitize-report__progress" aria-label="Report steps">{stepNames.map((name, index) => <div key={name} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''}><span>{index + 1}</span>{name}</div>)}</nav>
      <section className="maitize-report__panel">
        <div className="maitize-report__section-heading"><div><p className="kimu-eyebrow">STEP {step + 1} OF 6</p><h2>{step === 2 ? `Vehicle ${carIndex + 1} of ${CAR_NAMES.length}: ${currentCar.car} (${currentCar.plate})` : title}</h2></div></div>
        {step === 0 && <div className="maitize-report__form-grid">
          <label>Training date<input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} /></label>
          <label>Class or group<input value={form.class_group} onChange={(event) => updateForm('class_group', event.target.value)} placeholder="e.g. MAITRISE GROUP A" /></label>
        </div>}

        {step === 1 && <div className="maitize-report__form-grid">
          <label>Students attended<input type="number" min="0" step="1" value={form.students.attended} onChange={(event) => updateStudents('attended', event.target.value)} /></label>
          <label>Students missed<input type="number" min="0" step="1" value={form.students.missed} onChange={(event) => updateStudents('missed', event.target.value)} /></label>
          <div className="maitize-report__computed"><span>Total registered</span><strong>{(wholeNumber(form.students.attended) || 0) + (wholeNumber(form.students.missed) || 0)}</strong></div>
        </div>}

        {step === 2 && <VehicleStep car={currentCar} updateCar={updateCar} />}

        {step === 3 && <div className="maitize-report__incident">
          <p>Did anything serious or unusual happen during today&apos;s training? For example, an accident, vehicle breakdown, student injury, teacher issue, or delay.</p>
          <div className="maitize-report__choice-row"><label><input type="radio" name="incident" checked={form.incident_answer === 'yes'} onChange={() => { updateForm('incident_answer', 'yes'); updateForm('incident_details', ''); }} /> Yes</label><label><input type="radio" name="incident" checked={form.incident_answer === 'no'} onChange={() => { updateForm('incident_answer', 'no'); updateForm('incident_details', ''); }} /> No</label></div>
          {form.incident_answer === 'yes' && <label>Describe what happened<textarea rows="4" value={form.incident_details} onChange={(event) => updateForm('incident_details', event.target.value)} /></label>}
          {form.incident_answer === 'no' && <p className="maitize-report__note-preview">The report will say: “Nothing unusual to report.”</p>}
        </div>}

        {step === 4 && <div className="maitize-report__form-grid"><label>Full name of person preparing the report<input value={form.reported_by} onChange={(event) => updateForm('reported_by', event.target.value)} /></label></div>}

        {step === 5 && <ReviewSummary data={completedPayload} onEdit={editStep} />}

        {step < 5 && <div className="maitize-report__actions">
          {step > 0 && <button className="kimu-btn kimu-btn--secondary" onClick={previousStep}>Back</button>}
          <button className="kimu-btn kimu-btn--primary" onClick={nextStep}>{step === 5 ? 'Review report' : 'Continue'}</button>
        </div>}
        {step === 5 && <div className="maitize-report__actions">
          <button className="kimu-btn kimu-btn--secondary" onClick={previousStep}>Back</button>
          <button className="kimu-btn kimu-btn--primary" onClick={generateReport} disabled={saving}>{saving ? 'Saving report...' : 'YES, generate the report'}</button>
        </div>}
        {step === 5 && <p className="maitize-report__confirm-hint">Confirm that all details are correct before generating and saving this report.</p>}
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
  return <div className="maitize-report__vehicle-step">
    <div className="maitize-report__choice-row">
      <button type="button" className={`maitize-report__choice ${car.status === 'Used' ? 'is-selected' : ''}`} onClick={() => updateCar('status', 'Used')}>Used today</button>
      <button type="button" className={`maitize-report__choice ${car.status === 'Not used' ? 'is-selected' : ''}`} onClick={() => updateCar('status', 'Not used')}>Not used</button>
    </div>
    {car.status === 'Used' && <>
      <div className="maitize-report__form-grid">
        <label>Teacher / instructor<input value={car.teacher} onChange={(event) => updateCar('teacher', event.target.value)} /></label>
        <label>KM at start<input type="number" min="0" step="any" value={car.km_start} onChange={(event) => updateCar('km_start', event.target.value)} /></label>
        <label>KM at end<input type="number" min="0" step="any" value={car.km_end} onChange={(event) => updateCar('km_end', event.target.value)} /></label>
        <label>Condition at start<select value={car.condition_start} onChange={(event) => updateCar('condition_start', event.target.value)}><option value="">Choose condition</option>{CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
        <label>Condition at end<select value={car.condition_end} onChange={(event) => updateCar('condition_end', event.target.value)}><option value="">Choose condition</option>{CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
        <label>Class start time<input value={car.start_time} onChange={(event) => updateCar('start_time', event.target.value)} placeholder="8am, 08:00, saa mbiri" /></label>
        <label>Class end time<input value={car.end_time} onChange={(event) => updateCar('end_time', event.target.value)} placeholder="11:30am, 11:30" /></label>
      </div>
      {(car.condition_start === 'Problem' || car.condition_end === 'Problem') && <label className="maitize-report__full-field">Describe the vehicle problem<textarea rows="3" value={car.problem_details} onChange={(event) => updateCar('problem_details', event.target.value)} /></label>}
      <div className="maitize-report__vehicle-calculation"><span>KM used so far: <strong>{Math.max(kmUsed, 0)}</strong></span><span>Hours so far: <strong>{hours.toFixed(2)}</strong></span></div>
      {unusual && <label className="maitize-report__unusual"><input type="checkbox" checked={car.confirm_unusual} onChange={(event) => updateCar('confirm_unusual', event.target.checked)} /><span>Is this correct? I verified the mileage or class duration.</span></label>}
    </>}
    {car.status === 'Not used' && <p className="maitize-report__note-preview">This vehicle will appear as NOT USED and will not be included in totals.</p>}
  </div>;
}

function ReviewSummary({ data, onEdit }) {
  return <div className="maitize-report__review">
    <section><div className="maitize-report__review-heading"><h3>Class details</h3><button onClick={() => onEdit(0)}>Edit</button></div><p>Date: {data.date} · Class/group: {data.class_group}</p></section>
    <section><div className="maitize-report__review-heading"><h3>Student attendance</h3><button onClick={() => onEdit(1)}>Edit</button></div><p>Attended {data.students.attended} · Missed {data.students.missed} · Total registered {data.students.total_registered}</p></section>
    <section><div className="maitize-report__review-heading"><h3>Vehicle utilization</h3><button onClick={() => onEdit(2, 0)}>Edit</button></div><div className="maitize-report__table-wrap"><table><thead><tr><th>Car</th><th>Plate</th><th>Teacher</th><th>KM start</th><th>KM end</th><th>KM used</th><th>Condition</th><th>Start</th><th>End</th><th>Hours</th></tr></thead><tbody>{data.cars.map((car) => <tr key={car.car}><td>{car.car}</td><td>{car.plate}</td>{car.status === 'Not used' ? <td colSpan="8">NOT USED</td> : <><td>{car.teacher}</td><td>{car.km_start}</td><td>{car.km_end}</td><td>{car.km_used}</td><td>{car.condition_start} / {car.condition_end}</td><td>{car.start_time}</td><td>{car.end_time}</td><td>{car.hours_worked.toFixed(2)}</td></>}</tr>)}<tr className="maitize-report__total-row"><td colSpan="5">TOTAL</td><td>{data.totals.km_used}</td><td colSpan="3"></td><td>{data.totals.hours_worked.toFixed(2)}</td></tr></tbody></table></div></section>
    <section><div className="maitize-report__review-heading"><h3>Ikitonderwa</h3><button onClick={() => onEdit(3)}>Edit</button></div><p className="maitize-report__preserve-lines">{data.ikitonderwa}</p></section>
    <section><div className="maitize-report__review-heading"><h3>Reported by</h3><button onClick={() => onEdit(4)}>Edit</button></div><p>{data.reported_by}</p></section>
  </div>;
}

function GeneratedReport({ report, onNew, onPdf, onJson, onExcel }) {
  const data = exportableReport(report);
  return <section className="maitize-report__panel">
    <div className="maitize-report__section-heading"><div><p className="kimu-eyebrow">REPORT SAVED</p><h2>Daily class report generated</h2><p>{report.date} · {report.class_group}</p></div><button className="kimu-btn kimu-btn--secondary" onClick={onNew}>Start another report</button></div>
    <ReportDocument report={data} />
    <div className="maitize-report__export-actions"><button className="kimu-btn kimu-btn--primary" onClick={onPdf}>Download PDF</button><button className="kimu-btn kimu-btn--secondary" onClick={onExcel}>Export Excel</button><button className="kimu-btn kimu-btn--secondary" onClick={onJson}>Download JSON</button></div>
    <details className="maitize-report__json"><summary>Saved report JSON</summary><pre>{JSON.stringify(data, null, 2)}</pre></details>
  </section>;
}

function ReportDocument({ report }) {
  return <article className="maitize-report__document">
    <img className="maitize-report__document-logo" src={kimuLogo} alt="Kimu Transport logo" />
    <h2>METRIZE</h2><h3>DAILY CLASS REPORT</h3>
    <p><strong>Date:</strong> {report.date} <strong>Class/Group:</strong> {report.class_group}</p>
    <table><thead><tr><th colSpan="2">ATTENDANCE PARTICULARS</th></tr></thead><tbody><tr><td>Students attended</td><td>{report.students.attended}</td></tr><tr><td>Students missed</td><td>{report.students.missed}</td></tr><tr><th>TOTAL REGISTERED</th><th>{report.students.total_registered}</th></tr></tbody></table>
    <div className="maitize-report__table-wrap"><table><thead><tr><th rowSpan="2">NO.</th><th colSpan="3">VEHICLE INFORMATION</th><th colSpan="3">VEHICLE MILEAGE</th><th colSpan="2">VEHICLE CONDITION</th><th colSpan="3">TRAINING HOURS</th></tr><tr><th>VEHICLE</th><th>PLATE</th><th>TEACHER</th><th>KM START</th><th>KM END</th><th>KM USED</th><th>START</th><th>END</th><th>START TIME</th><th>END TIME</th><th>HOURS</th></tr></thead><tbody>{report.cars.map((car, index) => <tr key={car.car}><td>{index + 1}</td><td>{car.car}</td><td>{car.plate || '-'}</td>{car.status === 'Not used' ? <td colSpan="9">NOT USED</td> : <><td>{car.teacher}</td><td>{car.km_start}</td><td>{car.km_end}</td><td>{car.km_used}</td><td>{car.condition_start}</td><td>{car.condition_end}</td><td>{car.start_time}</td><td>{car.end_time}</td><td>{car.hours_worked.toFixed(2)}</td></>}</tr>)}<tr className="maitize-report__total-row"><td colSpan="6">TOTAL</td><td>{report.totals.km_used}</td><td colSpan="4"></td><td>{report.totals.hours_worked.toFixed(2)}</td></tr></tbody></table></div>
    <h4>ICYITONDERWA</h4><p className="maitize-report__preserve-lines">{report.ikitonderwa}</p>
    <div className="maitize-report__signature-grid"><div><strong>PREPARED BY</strong><span>JEAN</span><i /><small>Signature</small><span>Date: __________________</span></div><div><strong>VERIFIED BY</strong><span>AGNES</span><i /><small>Signature</small><span>Date: __________________</span></div><div><strong>APPROVED BY</strong><span>CEO NKUNZIRYAYO JEAN PIERRE</span><span>CEO - KIMU TRANSPORT AND MULTISERVICE</span><i /><small>Signature</small><span>Date: __________________</span></div></div>
    <p className="maitize-report__reported-by">Reported by: {report.reported_by}</p>
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
  return { date: form.date, class_group: form.class_group.trim(), students: { attended, missed, total_registered: attended + missed }, cars, totals: { km_used: cars.reduce((total, car) => total + car.km_used, 0), hours_worked: Number(cars.reduce((total, car) => total + car.hours_worked, 0).toFixed(2)) }, ikitonderwa: [note, ...problemNotes].join('\n'), reported_by: form.reported_by.trim() };
}

function exportableReport(report) {
  return {
    date: report.date,
    class_group: report.class_group,
    students: report.students,
    cars: report.cars,
    totals: report.totals,
    ikitonderwa: report.ikitonderwa,
    reported_by: report.reported_by,
    signatures: report.signatures || { prepared_by: 'JEAN', verified_by: 'AGNES', approved_by: 'CEO NKUNZIRYAYO JEAN PIERRE' },
  };
}

async function buildPdf(report) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await loadLogo();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const headerLogoWidth = pageWidth - 28;
  const headerLogoHeight = headerLogoWidth * logo.naturalHeight / logo.naturalWidth;
  doc.addImage(logo, 'PNG', 14, 5, headerLogoWidth, headerLogoHeight);
  const titleY = 5 + headerLogoHeight + 8;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('METRIZE DAILY CLASS REPORT', pageWidth / 2, titleY, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${report.date}     Class/Group: ${report.class_group}`, pageWidth / 2, titleY + 6, { align: 'center' });

  autoTable(doc, {
    theme: 'grid', startY: titleY + 10, margin: { left: 14, right: 14, bottom: 14 },
    head: [['ATTENDANCE PARTICULARS', 'TOTAL']],
    body: [['Students attended', report.students.attended], ['Students missed', report.students.missed], [{ content: 'TOTAL REGISTERED', styles: { fontStyle: 'bold' } }, { content: report.students.total_registered, styles: { fontStyle: 'bold' } }]],
    styles: { fontSize: 7, cellPadding: 1.2, textColor: [0, 0, 0], fillColor: [255, 255, 255], lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 24, halign: 'center' } },
  });

  const body = report.cars.map((car, index) => car.status === 'Not used'
    ? [index + 1, car.car, car.plate || '-', { content: 'NOT USED', colSpan: 9, styles: { halign: 'center', fontStyle: 'bold' } }]
    : [index + 1, car.car, car.plate || '-', car.teacher, car.km_start, car.km_end, car.km_used, car.condition_start, car.condition_end, car.start_time, car.end_time, car.hours_worked.toFixed(2)]);
  body.push([{ content: 'TOTAL', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right' } }, { content: report.totals.km_used, styles: { fontStyle: 'bold', halign: 'center' } }, '', '', '', '', { content: report.totals.hours_worked.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } }]);
  const groupRow = [
    { content: 'NO.', rowSpan: 2 },
    { content: 'VEHICLE INFORMATION', colSpan: 3 },
    { content: 'VEHICLE MILEAGE', colSpan: 3 },
    { content: 'VEHICLE CONDITION', colSpan: 2 },
    { content: 'TRAINING HOURS', colSpan: 3 },
  ];
  const columnRow = ['VEHICLE', 'PLATE', 'TEACHER', 'KM AT START', 'KM AT END', 'KM USED', 'CONDITION AT START', 'CONDITION AT END', 'START TIME', 'END TIME', 'HOURS WORKED'];
  autoTable(doc, {
    theme: 'grid', startY: doc.lastAutoTable.finalY + 4, margin: { left: 14, right: 14, bottom: 13 },
    head: [groupRow, columnRow], body, showHead: 'everyPage',
    styles: { fontSize: 6, cellPadding: 1.2, overflow: 'linebreak', valign: 'middle', textColor: [0, 0, 0], fillColor: [255, 255, 255], lineColor: [0, 0, 0], lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 20 }, 2: { cellWidth: 20 }, 3: { cellWidth: 31 }, 4: { cellWidth: 18, halign: 'right' }, 5: { cellWidth: 18, halign: 'right' }, 6: { cellWidth: 17, halign: 'right' }, 7: { cellWidth: 23 }, 8: { cellWidth: 23 }, 9: { cellWidth: 21 }, 10: { cellWidth: 21 }, 11: { cellWidth: 18, halign: 'right' } },
  });

  let cursorY = doc.lastAutoTable.finalY + 7;
  const noteLines = doc.splitTextToSize(report.ikitonderwa || 'Nta kintu kidasanzwe cyabaye.', pageWidth - 28);
  const noteHeight = 11 + noteLines.length * 3.5;
  if (cursorY + noteHeight + 38 > pageHeight - 12) { doc.addPage(); cursorY = 14; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
  doc.text('ICYITONDERWA', 14, cursorY);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(noteLines, 14, cursorY + 6);
  cursorY += noteHeight;
  if (cursorY + 31 > pageHeight - 12) { doc.addPage(); cursorY = 14; }
  const signatureBlocks = [
    ['Byateguwe na:', 'NIYONZIMA JEAN PIERRE', "DRIVER'S TRAINER"],
    ['Byagenzuwe na:', 'MANIRAGUHA AGNES', 'HEAD OF TRANSPORT'],
    ['Byemejwe na:', 'NKUNZIRYAYO JEAN PIERRE', 'CEO KIMU TRANSPORT'],
  ];
  const signatureXs = [14, 107, 200];
  signatureBlocks.forEach((block, index) => {
    const x = signatureXs[index];
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(block[0], x, cursorY);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(doc.splitTextToSize(block[1], 82), x, cursorY + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(doc.splitTextToSize(block[2], 82), x, cursorY + 10);
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25); doc.line(x, cursorY + 23, x + 78, cursorY + 23);
  });

  const generatedDate = new Date().toLocaleDateString('en-GB');
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(0, 0, 0);
    doc.line(14, pageHeight - 9, pageWidth - 14, pageHeight - 9);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${generatedDate}`, 14, pageHeight - 4);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 4, { align: 'right' });
  }
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