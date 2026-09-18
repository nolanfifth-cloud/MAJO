import ExcelJS from 'exceljs';
import { PmItem } from '../types';

const COLORS = {
  navy: '0C1B33',
  blue: '2563EB',
  paleBlue: 'EAF2FF',
  green: '059669',
  paleGreen: 'DCFCE7',
  slate: '475569',
  paleSlate: 'F1F5F9',
  border: 'CBD5E1',
  white: 'FFFFFF',
};

function styleTableHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: COLORS.navy } },
      bottom: { style: 'thin', color: { argb: COLORS.navy } },
    };
  });
}

function styleBodyRows(rows: ExcelJS.Row[]) {
  rows.forEach((row, index) => {
    row.height = 26;
    row.eachCell((cell) => {
      cell.font = { color: { argb: COLORS.navy }, size: 10 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
      if (index % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    });
  });
}

export async function downloadPmReportExcel(target: PmItem): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MAJO Portal';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Laporan PM', {
    views: [{ state: 'frozen', ySplit: 8 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  sheet.columns = [
    { key: 'a', width: 7 },
    { key: 'b', width: 38 },
    { key: 'c', width: 25 },
    { key: 'd', width: 28 },
    { key: 'e', width: 24 },
    { key: 'f', width: 25 },
    { key: 'g', width: 19 },
    { key: 'h', width: 18 },
    { key: 'i', width: 16 },
    { key: 'j', width: 18 },
    { key: 'k', width: 24 },
    { key: 'l', width: 30 },
  ];

  sheet.mergeCells('A1:L1');
  const title = sheet.getCell('A1');
  title.value = 'LAPORAN PREVENTIVE MAINTENANCE';
  title.font = { bold: true, size: 18, color: { argb: COLORS.white } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
  title.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 34;

  sheet.mergeCells('A2:L2');
  const subtitle = sheet.getCell('A2');
  subtitle.value = `${target.code}  |  ${target.title}`;
  subtitle.font = { bold: true, size: 12, color: { argb: COLORS.navy } };
  subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.paleBlue } };
  subtitle.alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(2).height = 30;

  const metrics = [
    ['STATUS', `${target.progress}% SELESAI`],
    ['CHECKLIST SELESAI', `${target.doneCount} / ${target.totalCount}`],
    ['SUB-STASIUN', target.subStationCount || 12],
    ['TANGGAL EXPORT', new Date()],
  ];
  metrics.forEach(([label, value], index) => {
    const startColumn = index * 3 + 1;
    const labelCell = sheet.getCell(4, startColumn);
    const valueCell = sheet.getCell(5, startColumn);
    sheet.mergeCells(4, startColumn, 4, startColumn + 1);
    sheet.mergeCells(5, startColumn, 5, startColumn + 1);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.font = { bold: true, size: 9, color: { argb: COLORS.slate } };
    valueCell.font = { bold: true, size: 13, color: { argb: index === 0 ? COLORS.green : COLORS.navy } };
    labelCell.fill = valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index === 0 ? COLORS.paleGreen : COLORS.paleSlate } };
    labelCell.alignment = valueCell.alignment = { vertical: 'middle', horizontal: 'left' };
    labelCell.border = valueCell.border = {
      top: { style: 'thin', color: { argb: COLORS.border } },
      bottom: { style: 'thin', color: { argb: COLORS.border } },
      left: { style: 'thin', color: { argb: COLORS.border } },
      right: { style: 'thin', color: { argb: COLORS.border } },
    };
  });
  sheet.getRow(4).height = 19;
  sheet.getRow(5).height = 28;

  const summaryHeaders = [
    'ID PM',
    'Nama PM',
    'Periode Pelaksanaan',
    'Penanggung Jawab',
    'Jabatan PIC',
    'Wilayah Cakupan',
    'Jumlah Sub-Stasiun',
    'Status Progres',
    'Item Selesai',
    'Total Checklist',
    'Tanggal Unduh',
    'PIC Verifikasi',
  ];
  const summaryRow = [
    target.code,
    target.title,
    target.dates,
    target.pic,
    target.picRole,
    target.regions,
    target.subStationCount || 12,
    `${target.progress}% Selesai`,
    target.doneCount,
    target.totalCount,
    new Date(),
    'Belum ditentukan',
  ];

  sheet.addRow([]);
  const summaryHeaderRow = sheet.addRow(summaryHeaders);
  styleTableHeader(summaryHeaderRow);
  const summaryDataRow = sheet.addRow(summaryRow);
  styleBodyRows([summaryDataRow]);
  summaryDataRow.getCell(8).font = { bold: true, color: { argb: COLORS.green }, size: 10 };
  summaryDataRow.getCell(11).numFmt = 'dd mmmm yyyy, hh:mm';
  summaryDataRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  summaryDataRow.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
  summaryDataRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.addTable({
    name: 'RingkasanPM',
    ref: `A8:L9`,
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: summaryHeaders.map((name) => ({ name })),
    rows: [summaryRow],
  });

  sheet.mergeCells('A11:L11');
  const detailTitle = sheet.getCell('A11');
  detailTitle.value = 'RINCIAN MODUL & STATUS VERIFIKASI LAPANGAN';
  detailTitle.font = { bold: true, size: 13, color: { argb: COLORS.white } };
  detailTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blue } };
  detailTitle.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(11).height = 26;

  const detailHeaders = ['No', 'Modul Pekerjaan', 'Target Checklist', 'Status', 'Catatan Verifikasi'];
  const detailStartRow = 12;
  const detailHeaderRow = sheet.getRow(detailStartRow);
  detailHeaders.forEach((header, index) => {
    detailHeaderRow.getCell(index + 1).value = header;
  });
  sheet.mergeCells(`E${detailStartRow}:L${detailStartRow}`);
  styleTableHeader(detailHeaderRow);

  const modules = target.modules || [];
  const detailRows = modules.map((module, index) => [
    index + 1,
    module.name,
    `${module.itemCount} Item`,
    target.progress === 100 ? 'Selesai (Verified)' : 'Dalam Proses',
    target.progress === 100 ? 'Checklist selesai dan diverifikasi oleh PIC.' : 'Menunggu penyelesaian teknisi.',
  ]);

  detailRows.forEach((values, index) => {
    const row = sheet.getRow(detailStartRow + 1 + index);
    values.forEach((value, valueIndex) => row.getCell(valueIndex + 1).value = value);
    sheet.mergeCells(`E${row.number}:L${row.number}`);
    row.getCell(4).font = { bold: true, color: { argb: COLORS.green }, size: 10 };
  });
  styleBodyRows(detailRows.map((_, index) => sheet.getRow(detailStartRow + 1 + index)));
  detailRows.forEach((_, index) => {
    const row = sheet.getRow(detailStartRow + 1 + index);
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sheet.addTable({
    name: 'RincianModul',
    ref: `A${detailStartRow}:L${detailStartRow + detailRows.length}`,
    headerRow: true,
    style: { theme: 'TableStyleMedium4', showRowStripes: true },
    columns: [
      { name: 'No' },
      { name: 'Modul Pekerjaan' },
      { name: 'Target Checklist' },
      { name: 'Status' },
      { name: 'Catatan Verifikasi' },
      ...Array.from({ length: 8 }, (_, index) => ({ name: `Detail ${index + 1}` })),
    ],
    rows: detailRows.map((row) => [...row, '', '', '', '', '', '', '', '']),
  });

  sheet.autoFilter = { from: 'A8', to: 'L9' };
  sheet.pageSetup.printArea = `A1:L${detailStartRow + detailRows.length}`;
  sheet.headerFooter.oddFooter = '&LMAJO Portal&CInternal Report&RPage &P of &N';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Laporan_${target.code}_${target.progress}_Selesai.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
