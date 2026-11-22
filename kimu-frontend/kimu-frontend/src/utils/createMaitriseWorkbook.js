import ExcelJS from 'exceljs';

export async function createMaitriseWorkbook(summary, vehicles) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KIMU';
  workbook.created = new Date();
  workbook.addWorksheet('Incamake').addRows(summary);
  const vehicleSheet = workbook.addWorksheet('Ibinyabiziga');
  vehicleSheet.columns = Object.keys(vehicles[0] || {}).map((header) => ({ header, key: header, width: Math.max(14, header.length + 2) }));
  vehicles.forEach((vehicle) => vehicleSheet.addRow(vehicle));
  return workbook.xlsx.writeBuffer();
}
