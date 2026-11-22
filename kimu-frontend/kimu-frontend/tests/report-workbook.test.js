import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { createMaitriseWorkbook } from '../src/utils/createMaitriseWorkbook.js';

test('Maitrise workbook retains summary and vehicle worksheets and values', async () => {
  const bytes = await createMaitriseWorkbook([
    ['RAPORO Y’UMUNSI'],
    ['Itariki', '2026-11-22'],
    ['Abitabiriye', 12],
  ], [{ Nomero: 1, Imodoka: 'Levin 1', 'KM zakozwe': '45' }]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes));
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ['Incamake', 'Ibinyabiziga']);
  assert.equal(workbook.getWorksheet('Incamake').getCell('B2').value, '2026-11-22');
  assert.equal(workbook.getWorksheet('Ibinyabiziga').getRow(2).getCell(2).value, 'Levin 1');
});
