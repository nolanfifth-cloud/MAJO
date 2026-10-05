import type ExcelJS from 'exceljs';
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

export interface CompletedPmReportExport {
  id: string;
  year?: number;
  title: string;
  completedAt: string;
  period: string;
  region: string;
  subJobsCount: number;
  pointsCount: number;
  submittedBy?: string;
  subJobs: Array<{
    name: string;
    tag?: string;
    device: string;
    duration: string;
    file: string;
    time: string;
    desc: string;
    status?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

export async function downloadCompletedPmReport(report: CompletedPmReportExport): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MAJO Portal';
  workbook.created = new Date();
  workbook.modified = new Date();

  const bast = workbook.addWorksheet('BAST', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  });
  bast.columns = [
    { width: 25 },
    { width: 34 },
    { width: 25 },
    { width: 34 },
  ];
  bast.mergeCells('A1:D1');
  bast.getCell('A1').value = 'BERITA ACARA SERAH TERIMA (BAST)';
  bast.getCell('A1').font = { bold: true, size: 16, color: { argb: COLORS.white } };
  bast.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navy } };
  bast.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  bast.getRow(1).height = 34;
  bast.mergeCells('A2:D2');
  bast.getCell('A2').value = 'Dokumen serah terima pekerjaan Preventive Maintenance';
  bast.getCell('A2').font = { italic: true, size: 10, color: { argb: COLORS.slate } };
  bast.getCell('A2').alignment = { horizontal: 'center' };
  bast.addRow([]);

  const bastRows: Array<[string, string, string, string]> = [
    ['Nomor PM', report.id, 'Nama Pekerjaan', report.title],
    ['Periode Pelaksanaan', report.period, 'Wilayah', report.region],
    ['Tanggal Selesai', report.completedAt, 'Jumlah Sub-Tugas', String(report.subJobsCount)],
    ['Jumlah Titik Checklist', String(report.pointsCount), 'Status', 'Selesai 100%'],
  ];
  bastRows.forEach((values) => {
    const row = bast.addRow(values);
    row.height = 32;
    row.eachCell((cell, columnNumber) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
      if (columnNumber === 1 || columnNumber === 3) {
        cell.font = { bold: true, color: { argb: COLORS.slate }, size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.paleSlate } };
      } else {
        cell.font = { color: { argb: COLORS.navy }, size: 10 };
      }
    });
  });
  bast.addRow([]);
  bast.mergeCells('A8:D8');
  bast.getCell('A8').value = 'Pernyataan Serah Terima';
  bast.getCell('A8').font = { bold: true, size: 11, color: { argb: COLORS.navy } };
  bast.mergeCells('A9:D10');
  bast.getCell('A9').value = `Pekerjaan "${report.title}" di wilayah ${report.region} telah diselesaikan dan dilaporkan oleh petugas pada ${report.completedAt}. Rincian Something To Do dan hasil pemeriksaan tercantum pada sheet Detail Checklist.`;
  bast.getCell('A9').alignment = { vertical: 'top', wrapText: true };
  bast.getCell('A9').font = { size: 10, color: { argb: COLORS.navy } };
  bast.getRow(9).height = 32;
  bast.getRow(10).height = 24;
  bast.addRow([]);
  bast.addRow(['Petugas Pelaksana', '', 'Penerima / PIC', '']);
  bast.addRow(['Nama: ____________________', '', 'Nama: ____________________', '']);
  bast.addRow(['Tanda tangan: ______________', '', 'Tanda tangan: ______________', '']);
  bast.addRow(['Tanggal: __________________', '', 'Tanggal: __________________', '']);
  bast.getRow(12).font = { bold: true, color: { argb: COLORS.navy } };
  [13, 14, 15].forEach((rowNumber) => { bast.getRow(rowNumber).height = 30; });
  bast.pageSetup.printArea = 'A1:D15';

  const details = workbook.addWorksheet('Detail Checklist', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  details.columns = [
    { header: 'No', key: 'no', width: 8 },
    { header: 'Sub-Tugas', key: 'subtask', width: 32 },
    { header: 'Something To Do', key: 'task', width: 38 },
    { header: 'Titik Perangkat', key: 'device', width: 32 },
    { header: 'Status / Kondisi', key: 'status', width: 20 },
    { header: 'Durasi', key: 'duration', width: 16 },
    { header: 'Foto Bukti', key: 'photo', width: 28 },
    { header: 'Waktu Verifikasi', key: 'time', width: 28 },
    { header: 'GPS', key: 'gps', width: 28 },
    { header: 'Keterangan', key: 'notes', width: 54 },
  ];
  const header = details.getRow(1);
  styleTableHeader(header);
  const rows = report.subJobs.map((item, index) => details.addRow({
    no: index + 1,
    subtask: item.name,
    task: item.name,
    device: item.device,
    status: item.status || 'Belum diisi',
    duration: item.duration,
    photo: item.file,
    time: item.time,
    gps: item.latitude !== undefined && item.longitude !== undefined
      ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
      : '',
    notes: item.desc,
  }));
  styleBodyRows(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `BAST_Laporan_${report.id.replace(/[^a-zA-Z0-9-_]/g, '_')}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

export async function downloadCompletedPmReports(reports: CompletedPmReportExport[]): Promise<void> {
  if (reports.length === 0) throw new Error('Tidak ada laporan untuk diekspor.');
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MAJO Portal';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Rekap Riwayat', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  summary.columns = [
    { header: 'ID PM', key: 'id', width: 24 },
    { header: 'Nama Pekerjaan', key: 'title', width: 42 },
    { header: 'Tahun', key: 'year', width: 12 },
    { header: 'Tanggal Selesai', key: 'completedAt', width: 24 },
    { header: 'Periode', key: 'period', width: 28 },
    { header: 'Wilayah', key: 'region', width: 30 },
    { header: 'Jumlah Sub-Tugas', key: 'subJobsCount', width: 18 },
    { header: 'Jumlah Checklist', key: 'pointsCount', width: 18 },
    { header: 'Dikirim Oleh', key: 'submittedBy', width: 28 },
  ];
  styleTableHeader(summary.getRow(1));
  const summaryRows = reports.map((report) => summary.addRow({
    id: report.id,
    title: report.title,
    year: report.year,
    completedAt: report.completedAt,
    period: report.period,
    region: report.region,
    subJobsCount: report.subJobsCount,
    pointsCount: report.pointsCount,
    submittedBy: report.submittedBy || '',
  }));
  styleBodyRows(summaryRows);
  summary.autoFilter = { from: 'A1', to: 'I1' };

  const details = workbook.addWorksheet('Detail Checklist', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  details.columns = [
    { header: 'ID PM', key: 'reportId', width: 24 },
    { header: 'Nama Pekerjaan', key: 'title', width: 42 },
    { header: 'Sub-Tugas', key: 'subtask', width: 32 },
    { header: 'Titik Perangkat', key: 'device', width: 32 },
    { header: 'Status / Kondisi', key: 'status', width: 22 },
    { header: 'Durasi', key: 'duration', width: 16 },
    { header: 'Foto Bukti', key: 'photo', width: 28 },
    { header: 'Waktu Verifikasi', key: 'time', width: 28 },
    { header: 'GPS', key: 'gps', width: 28 },
    { header: 'Keterangan', key: 'notes', width: 54 },
  ];
  styleTableHeader(details.getRow(1));
  const detailRows = reports.flatMap((report) => report.subJobs.map((item) => details.addRow({
    reportId: report.id,
    title: report.title,
    subtask: item.name,
    device: item.device,
    status: item.status || 'Belum diisi',
    duration: item.duration,
    photo: item.file,
    time: item.time,
    gps: item.latitude !== undefined && item.longitude !== undefined
      ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
      : '',
    notes: item.desc,
  })));
  styleBodyRows(detailRows);
  details.autoFilter = { from: 'A1', to: 'J1' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Rekap_Riwayat_PM_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPmReportExcel(target: PmItem): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
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
