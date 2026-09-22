import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Server,
  CalendarCheck,
  Calendar,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  MapPin,
  Layers,
  Lock,
  Image as ImageIcon,
  CheckCheck,
  Check,
} from 'lucide-react';
import { loadCompletedReportsFromFirestore } from '../services/firestoreStore';

export interface SubJobDetail {
  name: string;
  tag: string;
  device: string;
  duration: string;
  file: string;
  time: string;
  desc: string;
}

export interface CompletedPMItem {
  id: string;
  year: number;
  title: string;
  completedAt: string;
  period: string;
  region: string;
  subJobsCount: number;
  pointsCount: number;
  subJobs: SubJobDetail[];
}

// Completed reports are loaded from localStorage after real user submissions.
const pmCompletedData: CompletedPMItem[] = []; /*
  {
    id: 'PM-2026-SEP-001',
    year: 2026,
    title: 'PM September 2026 – Inspeksi & Pemeliharaan Rutin Gardu & Hub Operasional Medan',
    completedAt: '14 Sep 2026, 16:45 WIB',
    period: '01 Sep 2026 – 28 Sep 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 4,
    pointsCount: 12,
    subJobs: [
      {
        name: 'Daftar Jobs 1: Cek Catu Daya Gardu',
        tag: 'A1',
        device: 'Gardu Induk Trafo Hub #01 – Sayap Barat',
        duration: '35 Menit',
        file: 'trafo_panel_check_01.jpg',
        time: '14 Sep 2026, 14:15 WIB (GPS Valid)',
        desc: 'Tegangan stabil 220V, tidak ada dengung berlebih atau kenaikan suhu isolator. Baut grounding kencang dan bersih.',
      },
      {
        name: 'Daftar Jobs 2: Inspeksi Suhu & Rak Server',
        tag: 'B1',
        device: 'Panel Distribusi Utama LV-04',
        duration: '20 Menit',
        file: 'panel_lv04_terminal.jpg',
        time: '14 Sep 2026, 14:40 WIB (GPS Valid)',
        desc: 'Kondisi busbar bersih dari korosi, fuse disconnect switch berfungsi baik, ventilasi fan beroperasi otomatis.',
      },
      {
        name: 'Daftar Jobs 3: Uji Genset Cadangan 10kVA',
        tag: 'C1',
        device: 'Genset Backup Silent 10kVA Perkins',
        duration: '30 Menit',
        file: 'genset_panel_test.jpg',
        time: '14 Sep 2026, 16:00 WIB (GPS Valid)',
        desc: 'Simulasi otomatis transfer switch (ATS) berjalan 6 detik. Oli dan filter solar dalam kuota baik, baterai starter 12.8V.',
      },
      {
        name: 'Daftar Jobs 4: Validasi BAST & Kunci Segel',
        tag: 'D1',
        device: 'Berita Acara Serah Terima (BAST) & Segel Pintu Hub',
        duration: '15 Menit',
        file: 'bast_signed_doc.jpg',
        time: '14 Sep 2026, 16:45 WIB (GPS Valid)',
        desc: 'BAST fisik telah ditandatangani bersama koordinator fasilitas Medan. Pintu shelter disegel dengan nomor seri MAJO-MDN-8849.',
      },
    ],
  },
  {
    id: 'PM-2026-AUG-004',
    year: 2026,
    title: 'PM Agustus 2026 – Kalibrasi Sensor Temperatur & Audit Baterai UPS Sub-Stasiun Medan',
    completedAt: '26 Agu 2026, 17:10 WIB',
    period: '01 Agu 2026 – 28 Agu 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 8,
    subJobs: [
      {
        name: 'Audit Baterai UPS 120kVA',
        tag: 'A1',
        device: 'Bank Baterai UPS 120kVA (Rack A & B)',
        duration: '45 Menit',
        file: 'ups_bank_medan.jpg',
        time: '26 Agu 2026, 15:30 WIB (GPS Valid)',
        desc: 'Status Normal, tegangan rata-rata 13.6V per sel, tidak ada tanda-tanda kebocoran asam atau penumpukan sulfasi.',
      },
      {
        name: 'Kalibrasi Thermostat Ruang Server',
        tag: 'B1',
        device: 'Sensor Suhu Enclosure & Thermostat Digital',
        duration: '30 Menit',
        file: 'thermo_calib_check.jpg',
        time: '26 Agu 2026, 16:40 WIB (GPS Valid)',
        desc: 'Deviasi suhu 0.2°C memenuhi ambang toleransi standar telco. Alarm high-temp responsif saat simulasi trigger.',
      },
    ],
  },
  {
    id: 'PM-2026-JUL-002',
    year: 2026,
    title: 'PM Juli 2026 – Uji Proteksi Lightning Arrester & Sistem Grounding Medan Hub',
    completedAt: '22 Jul 2026, 15:30 WIB',
    period: '01 Jul 2026 – 25 Jul 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 8,
    subJobs: [
      {
        name: 'Pemeriksaan Bak Kontrol Grounding',
        tag: 'A1',
        device: 'Bak Kontrol Grounding Tower Utama #01',
        duration: '40 Menit',
        file: 'earth_tester_log.jpg',
        time: '22 Jul 2026, 14:10 WIB (GPS Valid)',
        desc: 'Nilai resistansi terukur 0.32 Ohm (Lolos standar PLN/Telco < 1.0 Ohm). Klem tembaga bebas oksidasi hijau.',
      },
    ],
  },
  {
    id: 'PM-2026-JUN-003',
    year: 2026,
    title: 'PM Juni 2026 – Preventive Pemeliharaan HVAC Pendingin Presisi InRow & Chiller',
    completedAt: '24 Jun 2026, 16:00 WIB',
    period: '01 Jun 2026 – 26 Jun 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 9,
    subJobs: [
      {
        name: 'Cek Tekanan Freon & Kompresor InRow',
        tag: 'A1',
        device: 'AC Presisi Liebert HPM #01',
        duration: '50 Menit',
        file: 'hvac_compressor_inrow.jpg',
        time: '24 Jun 2026, 14:00 WIB (GPS Valid)',
        desc: 'Tekanan suction 68 psi, discharge 220 psi. Filter udara diganti baru tipe MERV 11.',
      },
    ],
  },
  {
    id: 'PM-2026-MAY-005',
    year: 2026,
    title: 'PM Mei 2026 – Audit Keamanan Fisik Access Door RFID & Kamera Perimeter CCTV',
    completedAt: '20 Mei 2026, 14:30 WIB',
    period: '02 Mei 2026 – 25 Mei 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 6,
    subJobs: [
      {
        name: 'Pengujian Magnetic Lock & Sensor Pintu',
        tag: 'A1',
        device: 'Maglock Server Gate A & B',
        duration: '25 Menit',
        file: 'maglock_fail_safe_test.jpg',
        time: '20 Mei 2026, 13:40 WIB (GPS Valid)',
        desc: 'Fungsi fail-safe dan rilis darurat fire alarm berfungsi sempurna. Log tap RFID selaras dengan database pusat.',
      },
    ],
  },
  {
    id: 'PM-2026-APR-001',
    year: 2026,
    title: 'PM April 2026 – Penggantian Pelumas Mesin & Filter Solar Genset Cadangan Hub',
    completedAt: '18 Apr 2026, 16:15 WIB',
    period: '01 Apr 2026 – 24 Apr 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 7,
    subJobs: [
      {
        name: 'Penggantian Oli Mesin 15W-40',
        tag: 'A1',
        device: 'Genset Silent Perkins 10kVA',
        duration: '45 Menit',
        file: 'genset_oil_change.jpg',
        time: '18 Apr 2026, 15:20 WIB (GPS Valid)',
        desc: 'Oli mesin diganti 14 Liter, filter oli dan separator solar baru dipasang dan diuji running load.',
      },
    ],
  },
  {
    id: 'PM-2026-MAR-002',
    year: 2026,
    title: 'PM Maret 2026 – Termografi Inframerah Panel Distribusi Utama & MCB Kabinet',
    completedAt: '21 Mar 2026, 17:00 WIB',
    period: '01 Mar 2026 – 26 Mar 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 4,
    pointsCount: 14,
    subJobs: [
      {
        name: 'Scanning Fluke Thermal Camera',
        tag: 'A1',
        device: 'Panel LV Distribution Core',
        duration: '40 Menit',
        file: 'thermal_scan_fluke.jpg',
        time: '21 Mar 2026, 16:30 WIB (GPS Valid)',
        desc: 'Tidak ditemukan hotspot termal abnormal. Delta temperatur busbar rata-rata berada pada kisaran 32-36°C.',
      },
    ],
  },
  {
    id: 'PM-2026-FEB-001',
    year: 2026,
    title: 'PM Februari 2026 – Uji Proteksi Fire Suppression FM200 & Smoke Detector',
    completedAt: '19 Feb 2026, 13:50 WIB',
    period: '01 Feb 2026 – 22 Feb 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 8,
    subJobs: [
      {
        name: 'Inspeksi Tekanan Tabung FM200',
        tag: 'A1',
        device: 'Tabung Silinder FM200 45Kg',
        duration: '30 Menit',
        file: 'fm200_pressure_gauge.jpg',
        time: '19 Feb 2026, 13:10 WIB (GPS Valid)',
        desc: 'Manometer menunjukkan tekanan hijau di 25 Bar. Nozzle pemancar bersih dari debu atau sarang laba-laba.',
      },
    ],
  },
  {
    id: 'PM-2026-JAN-003',
    year: 2026,
    title: 'PM Januari 2026 – Pemeliharaan Awal Tahun Kebersihan Enclosure & Dust Cleaning',
    completedAt: '25 Jan 2026, 15:45 WIB',
    period: '05 Jan 2026 – 28 Jan 2026',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 10,
    subJobs: [
      {
        name: 'Dust Cleaning Blower ESD-Safe',
        tag: 'A1',
        device: 'Rak Distribusi Switch & ODF Optik',
        duration: '35 Menit',
        file: 'odf_dust_clean.jpg',
        time: '25 Jan 2026, 14:40 WIB (GPS Valid)',
        desc: 'Semua tray ODF dibersihkan dengan pneumatic blower antistatik, patchcord diperiksa attenuasi optik.',
      },
    ],
  },
  {
    id: 'PM-2025-DEC-002',
    year: 2025,
    title: 'PM Desember 2025 – Audit Akhir Tahun Sistem Kelistrikan & Genset Hub Medan',
    completedAt: '28 Des 2025, 17:30 WIB',
    period: '01 Des 2025 – 29 Des 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 4,
    pointsCount: 12,
    subJobs: [
      {
        name: 'Audit Tutup Tahun Catu Daya Cadangan',
        tag: 'A1',
        device: 'Genset & ATS Kontroler DeepSea',
        duration: '60 Menit',
        file: 'ats_deepsea_audit.jpg',
        time: '28 Des 2025, 16:50 WIB (GPS Valid)',
        desc: 'Pengecekan log riwayat genset selama setahun. Total jam jalan 48 jam tanpa insiden blackout.',
      },
    ],
  },
  {
    id: 'PM-2025-NOV-004',
    year: 2025,
    title: 'PM November 2025 – Pengujian Cadangan Daya Inverter & Rectifier 48V DC',
    completedAt: '25 Nov 2025, 14:20 WIB',
    period: '01 Nov 2025 – 27 Nov 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 8,
    subJobs: [
      {
        name: 'Uji Beban Modul Rectifier 48V',
        tag: 'A1',
        device: 'Rectifier Emerson Netsure 50A',
        duration: '40 Menit',
        file: 'rectifier_load_log.jpg',
        time: '25 Nov 2025, 13:50 WIB (GPS Valid)',
        desc: 'Efisiensi rectifier 94.2%, modul redundancy N+1 beroperasi normal saat satu modul dicabut.',
      },
    ],
  },
  {
    id: 'PM-2025-OCT-001',
    year: 2025,
    title: 'PM Oktober 2025 – Inspeksi Sambungan Penangkal Petir & Tower Rooftop Medan',
    completedAt: '23 Okt 2025, 16:40 WIB',
    period: '01 Okt 2025 – 26 Okt 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 6,
    subJobs: [
      {
        name: 'Pemeriksaan Klem Tembaga Tower',
        tag: 'A1',
        device: 'Head Terminal ESE & Down Conductor',
        duration: '45 Menit',
        file: 'arrester_head_check.jpg',
        time: '23 Okt 2025, 15:40 WIB (GPS Valid)',
        desc: 'Struktur tiang arrester kokoh, spanner kencang, koneksi kabel grounding bebas retak.',
      },
    ],
  },
  {
    id: 'PM-2025-SEP-003',
    year: 2025,
    title: 'PM September 2025 – Kalibrasi Sensor Pintu Otomatis & Kelembaban Ruangan',
    completedAt: '20 Sep 2025, 15:10 WIB',
    period: '01 Sep 2025 – 24 Sep 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 7,
    subJobs: [
      {
        name: 'Kalibrasi Hygrometer Digital',
        tag: 'A1',
        device: 'Hygrometer Server Room Floor #01',
        duration: '30 Menit',
        file: 'hygro_calib_2025.jpg',
        time: '20 Sep 2025, 14:30 WIB (GPS Valid)',
        desc: 'Kelembaban ruangan 48% RH (ideal dalam range 45-55% RH non-kondensasi).',
      },
    ],
  },
  {
    id: 'PM-2025-AUG-002',
    year: 2025,
    title: 'PM Agustus 2025 – Pengecekan Sistem Otomatisasi ATS & Transfer Switch Gardu',
    completedAt: '22 Agu 2025, 16:30 WIB',
    period: '01 Agu 2025 – 25 Agu 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 6,
    subJobs: [
      {
        name: 'Simulasi Padam PLN Mendadak',
        tag: 'A1',
        device: 'Panel ATS Hub Medan',
        duration: '35 Menit',
        file: 'ats_transfer_sim.jpg',
        time: '22 Agu 2025, 15:40 WIB (GPS Valid)',
        desc: 'Transfer switch merespons 4.8 detik setelah trigger loss PLN. Tidak ada ripple tegangan tajam.',
      },
    ],
  },
  {
    id: 'PM-2025-JUL-001',
    year: 2025,
    title: 'PM Juli 2025 – Audit Kapasitas Baterai Cadangan UPS Lithium Modular',
    completedAt: '26 Jul 2025, 17:15 WIB',
    period: '01 Jul 2025 – 28 Jul 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 8,
    subJobs: [
      {
        name: 'Uji Discharge Rate Baterai LiFePO4',
        tag: 'A1',
        device: 'Modul Baterai LiFePO4 48V 100Ah',
        duration: '55 Menit',
        file: 'lifepo4_test_discharge.jpg',
        time: '26 Jul 2025, 16:20 WIB (GPS Valid)',
        desc: 'SOH (State of Health) tercatat 98.4%, suhu sel terdistribusi merata di 26°C.',
      },
    ],
  },
  {
    id: 'PM-2025-JUN-002',
    year: 2025,
    title: 'PM Juni 2025 – Pembersihan Filter Intake AC Precision & Uji Motor Fan',
    completedAt: '24 Jun 2025, 14:45 WIB',
    period: '01 Jun 2025 – 27 Jun 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 6,
    subJobs: [
      {
        name: 'Pembersihan Kondensor Eksternal',
        tag: 'A1',
        device: 'Outdoor Chiller Unit AC-01',
        duration: '40 Menit',
        file: 'condenser_cleaning_2025.jpg',
        time: '24 Jun 2025, 14:00 WIB (GPS Valid)',
        desc: 'Fin sirip kondensor dibersihkan dengan coil cleaner netral, laju pembuangan panas meningkat optimal.',
      },
    ],
  },
  {
    id: 'PM-2025-MAY-003',
    year: 2025,
    title: 'PM Mei 2025 – Inspeksi Sambungan Busbar Tembaga Gardu Listrik Medan',
    completedAt: '21 Mei 2025, 15:50 WIB',
    period: '01 Mei 2025 – 25 Mei 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 9,
    subJobs: [
      {
        name: 'Torque Wrench Check Baut Busbar',
        tag: 'A1',
        device: 'Main Busbar 800A LV',
        duration: '45 Menit',
        file: 'busbar_torque_check.jpg',
        time: '21 Mei 2025, 15:00 WIB (GPS Valid)',
        desc: 'Seluruh baut M12 dikencangkan kembali sesuai torsi pabrikan 45 Nm dengan tanda segel cat.',
      },
    ],
  },
  {
    id: 'PM-2025-APR-002',
    year: 2025,
    title: 'PM April 2025 – Uji Integritas Saluran Pembuangan Air Kondensasi AC Data Center',
    completedAt: '17 Apr 2025, 13:40 WIB',
    period: '01 Apr 2025 – 22 Apr 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 6,
    subJobs: [
      {
        name: 'Pemeriksaan Pompa Kondensat',
        tag: 'A1',
        device: 'Drain Pump Little Giant #02',
        duration: '25 Menit',
        file: 'drain_pump_test.jpg',
        time: '17 Apr 2025, 13:15 WIB (GPS Valid)',
        desc: 'Level float sensor responsif, selang drainase fleksibel bebas lumut dan aliran lancar ke pembuangan luar.',
      },
    ],
  },
  {
    id: 'PM-2025-MAR-001',
    year: 2025,
    title: 'PM Maret 2025 – Pengujian Sensor Kebocoran Air (Water Leak Detection) Raised Floor',
    completedAt: '20 Mar 2025, 16:20 WIB',
    period: '01 Mar 2025 – 26 Mar 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 7,
    subJobs: [
      {
        name: 'Trigger Simulasi Kabel Sensor WLD',
        tag: 'A1',
        device: 'Kabel Sensing TraceTek TT1000',
        duration: '30 Menit',
        file: 'wld_sensor_test.jpg',
        time: '20 Mar 2025, 15:45 WIB (GPS Valid)',
        desc: 'Detektor membaca sinyal rembesan air pada meter ke-14 dengan akurasi 100%. Buzzer alarm aktif normal.',
      },
    ],
  },
  {
    id: 'PM-2025-FEB-004',
    year: 2025,
    title: 'PM Februari 2025 – Pemeriksaan Fisik Kabel Power Feeder Tegangan Menengah',
    completedAt: '25 Feb 2025, 16:50 WIB',
    period: '01 Feb 2025 – 27 Feb 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 3,
    pointsCount: 8,
    subJobs: [
      {
        name: 'Inspeksi Isolasi Kabel XLPE 20kV',
        tag: 'A1',
        device: 'Feeder Kabel TM Masuk Gardu',
        duration: '40 Menit',
        file: 'feeder_xlpe_check.jpg',
        time: '25 Feb 2025, 16:05 WIB (GPS Valid)',
        desc: 'Terminasi isolasi resin mulus, pelindung armor bebas gigitan hewan pengerat, kabel tersangga rapi pada rak.',
      },
    ],
  },
  {
    id: 'PM-2025-JAN-002',
    year: 2025,
    title: 'PM Januari 2025 – Kalibrasi Meteran Daya Digital (Digital Power Meter) Schneider',
    completedAt: '22 Jan 2025, 15:35 WIB',
    period: '02 Jan 2025 – 26 Jan 2025',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 6,
    subJobs: [
      {
        name: 'Verifikasi Akurasi kWh Meter',
        tag: 'A1',
        device: 'Schneider PowerLogic PM5350',
        duration: '35 Menit',
        file: 'power_meter_schneider.jpg',
        time: '22 Jan 2025, 15:00 WIB (GPS Valid)',
        desc: 'Perhitungan power factor 0.96 lagging, pembacaan tegangan L-N 221.2V presisi dengan multitester kalibrasi.',
      },
    ],
  },
  {
    id: 'PM-2024-DEC-003',
    year: 2024,
    title: 'PM Desember 2024 – Pemeliharaan Akhir Tahun Gardu & Hub Operasional Medan',
    completedAt: '27 Des 2024, 16:40 WIB',
    period: '01 Des 2024 – 29 Des 2024',
    region: 'Medan – Hub Operasional',
    subJobsCount: 4,
    pointsCount: 11,
    subJobs: [
      {
        name: 'Tutup Buku Pemeliharaan 2024',
        tag: 'A1',
        device: 'Panel Hub & Genset Perimeter',
        duration: '50 Menit',
        file: 'yearend_pm_2024.jpg',
        time: '27 Des 2024, 15:55 WIB (GPS Valid)',
        desc: 'Seluruh catatan checklist fisik dan digital disahkan bersama manajemen regional Medan tanpa temuan mayor.',
      },
    ],
  },
  {
    id: 'PM-2024-NOV-001',
    year: 2024,
    title: 'PM November 2024 – Uji Sirkulasi Udara Cold Aisle Containment & Suhu Exhaust',
    completedAt: '21 Nov 2024, 14:15 WIB',
    period: '01 Nov 2024 – 25 Nov 2024',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 6,
    subJobs: [
      {
        name: 'Pengukuran Airflow Anemometer',
        tag: 'A1',
        device: 'Cold Aisle Enclosure Server Row 1-4',
        duration: '30 Menit',
        file: 'airflow_anemo_test.jpg',
        time: '21 Nov 2024, 13:40 WIB (GPS Valid)',
        desc: 'Kecepatan angin laminar teratur 1.8 m/s, segel pintu sliding door tertutup rapat tanpa kebocoran udara dingin.',
      },
    ],
  },
  {
    id: 'PM-2024-OCT-002',
    year: 2024,
    title: 'PM Oktober 2024 – Uji Fungsi Lampu Darurat & Battery Exit Indicator Shelter',
    completedAt: '19 Okt 2024, 15:00 WIB',
    period: '01 Okt 2024 – 24 Okt 2024',
    region: 'Medan – Hub Operasional',
    subJobsCount: 2,
    pointsCount: 5,
    subJobs: [
      {
        name: 'Uji Ketahanan Emergency Light LED',
        tag: 'A1',
        device: 'Lampu Darurat Philips Hub Medan',
        duration: '20 Menit',
        file: 'emergency_light_check.jpg',
        time: '19 Okt 2024, 14:35 WIB (GPS Valid)',
        desc: 'Daya tahan baterai darurat melampaui 120 menit iluminasi kontinyu saat simulasi blackout total.',
      },
    ],
  },
]; */

interface RiwayatSelesaiViewProps {
  onTriggerToast: (message: string, isSuccess?: boolean) => void;
  userUid?: string;
}

export const RiwayatSelesaiView: React.FC<RiwayatSelesaiViewProps> = ({ onTriggerToast, userUid }) => {
  // State for search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [cloudReports, setCloudReports] = useState<CompletedPMItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCompletedReportsFromFirestore(userUid).then((reports) => {
      if (!cancelled) setCloudReports(reports as unknown as CompletedPMItem[]);
    }).catch(() => {
      // Local reports remain available when Firestore is unavailable.
    });
    return () => {
      cancelled = true;
    };
  }, [userUid]);

  // State for expanded PM cards
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    'PM-2026-SEP-001': false,
  });

  // State for selected subjob per PM card (default index 0)
  const [selectedSubJobIndices, setSelectedSubJobIndices] = useState<Record<string, number>>({});

  // State for photo preview modal
  const [previewPhoto, setPreviewPhoto] = useState<{ title: string; filename: string } | null>(null);

  // Real-time Clock State
  const [currentTime, setCurrentTime] = useState<{
    timeString: string;
    dayName: string;
    dateString: string;
  }>({
    timeString: '08:32:47',
    dayName: 'JUMAT',
    dateString: '11 Sep 2026',
  });

  useEffect(() => {
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const updateClock = () => {
      const now = new Date();
      const dName = days[now.getDay()];
      const dNum = String(now.getDate()).padStart(2, '0');
      const mName = months[now.getMonth()];
      const yNum = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      setCurrentTime({
        timeString: `${hh}:${mm}:${ss}`,
        dayName: dName,
        dateString: `${dNum} ${mName} ${yNum}`,
      });
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load only user-submitted reports from localStorage.
  const allPmItems = useMemo(() => {
    try {
      const stored = localStorage.getItem('majo_completed_reports');
      if (stored) {
        const parsed: CompletedPMItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove duplicates if any
          const combined = [...cloudReports, ...parsed];
          const unique = Array.from(new Map(combined.map((report) => [report.id, report])).values());
          return unique;
        }
      }
      if (cloudReports.length > 0) return cloudReports;
    } catch {
      // fallback
    }
    return pmCompletedData;
  }, [cloudReports]);

  // Filter Data
  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allPmItems.filter((pm) => {
      const matchesQuery =
        query === '' ||
        pm.id.toLowerCase().includes(query) ||
        pm.title.toLowerCase().includes(query) ||
        pm.region.toLowerCase().includes(query);

      const matchesYear = filterYear === 'all' || pm.year.toString() === filterYear;
      return matchesQuery && matchesYear;
    });
  }, [allPmItems, searchQuery, filterYear]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterYear]);

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPoints = filteredData.reduce((sum, item) => sum + item.pointsCount, 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = useMemo(
    () => filteredData.slice(startIndex, endIndex),
    [filteredData, startIndex, endIndex]
  );

  // Toggle card details
  const toggleDetails = (pmId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [pmId]: !prev[pmId],
    }));
  };

  // Switch active subjob
  const selectSubJob = (pmId: string, index: number) => {
    setSelectedSubJobIndices((prev) => ({
      ...prev,
      [pmId]: index,
    }));
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterYear('all');
    setCurrentPage(1);
  };

  // Export Excel Handlers
  const handleExportAll = () => {
    onTriggerToast(
      `Mengunduh seluruh Rekapitulasi Riwayat PM 100% Selesai (${filteredData.length} tugas .xlsx)...`,
      true
    );
  };

  const handleDownloadSingle = (pmId: string) => {
    onTriggerToast(`Mengunduh berkas BAST & Laporan Excel untuk ${pmId}...`, true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Page Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0C1B33] tracking-tight">
            Riwayat Tugas PM Selesai
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Arsip seluruh pekerjaan pemeliharaan preventif (Preventive Maintenance) yang telah rampung 100%.
          </p>
        </div>
      </div>

      {/* Metric Stat Cards (3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Stat 1: Total PM Diselesaikan */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Total PM Diselesaikan
            </span>
            <div className="text-2xl font-black text-[#0C1B33] mt-1 flex items-baseline gap-1.5">
              <span>{totalItems}</span>
              <span className="text-xs font-semibold text-emerald-600">Penugasan</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg border border-emerald-100 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 2: Total Perangkat Diperiksa */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              TOTAL Perangkat Diperiksa
            </span>
            <div className="text-2xl font-black text-[#0C1B33] mt-1 flex items-baseline gap-1.5">
              <span>{totalPoints}</span>
              <span className="text-xs font-semibold text-blue-600">Perangkat yang diperiksa</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg border border-blue-100 shrink-0">
            <Server className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 3: Waktu & Kalender Operasional */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Waktu &amp; Kalender Operasional
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-black text-[#0C1B33] tracking-tight font-mono">
                {currentTime.timeString}{' '}
                <span className="text-xs font-bold text-slate-400 font-sans">WIB</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-bold text-[10px] tracking-wide">
                {currentTime.dayName}
              </span>
              <span className="text-slate-600 font-medium">{currentTime.dateString}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg border border-indigo-100 shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          {/* Real-time Search Input */}
          <div className="relative w-full flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="searchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID tugas, judul PM, atau wilayah..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-700 shadow-2xs transition"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                id="clearSearchBtn"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Periode / Tahun */}
          <div className="w-full sm:w-auto flex items-center space-x-2">
            <div className="relative w-full sm:w-auto min-w-[210px]">
              <select
                id="filterMonth"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 text-slate-700 font-medium appearance-none cursor-pointer whitespace-nowrap"
              >
                <option value="all">Semua Periode ({allPmItems.length} Tugas)</option>
                {Array.from(new Set(allPmItems.map((item) => item.year))).sort((a, b) => Number(b) - Number(a)).map((year) => (
                  <option key={year} value={year}>Tahun {year}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tombol Export Rekap Excel */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleExportAll}
            className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs gap-2 shrink-0 whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Rekap Excel</span>
          </button>
        </div>
      </div>

      {/* Section: Daftar PM Selesai */}
      <div className="space-y-4">
        {totalItems === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Tidak ada riwayat PM yang sesuai</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Silakan ubah kata kunci pencarian atau reset filter periode untuk melihat data lainnya.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          /* Scrollable Task List Container */
          <div className="max-h-[640px] overflow-y-auto pr-1 space-y-4 rounded-2xl custom-scroll" id="pm-list-container">
            {currentItems.map((pm) => {
              const isExpanded = !!expandedCards[pm.id];
              const currentSubJobIdx = selectedSubJobIndices[pm.id] || 0;
              const activeSubJob =
                pm.subJobs && pm.subJobs[currentSubJobIdx] ? pm.subJobs[currentSubJobIdx] : pm.subJobs[0];

              return (
                <div
                  key={pm.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition hover:border-slate-300"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-50/50">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>100% Selesai</span>
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-500">ID: {pm.id}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          Selesai pada: <strong className="text-slate-700">{pm.completedAt}</strong>
                        </span>
                      </div>
                      <h3 className="text-lg font-extrabold text-[#0C1B33] tracking-tight">
                        {pm.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Periode: {pm.period}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>Wilayah: {pm.region}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {pm.subJobsCount} Sub-Jobs ({pm.pointsCount} Titik Perangkat)
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center space-x-2.5 self-start lg:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleDetails(pm.id)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lihat Detail Checklist</span>
                        <ChevronDown
                          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(pm.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Unduh BAST &amp; Excel</span>
                      </button>
                    </div>
                  </div>

                  {/* Detail Breakdown Accordion (Expandable) */}
                  {isExpanded && (
                    <div className="p-6 space-y-6 border-t border-slate-100 bg-white animate-in fade-in duration-150">
                      {/* Sub-Jobs Tabs */}
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                          Rekap Checklist Per-Sub Jobs:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {pm.subJobs.map((sj, sIdx) => {
                            const isTabActive = sIdx === currentSubJobIdx;
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => selectSubJob(pm.id, sIdx)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                                  isTabActive
                                    ? 'bg-[#0C1B33] text-white font-bold shadow-2xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isTabActive
                                      ? 'bg-emerald-400 text-[#0C1B33] font-black'
                                      : 'bg-slate-300 text-slate-700'
                                  }`}
                                >
                                  {sIdx + 1}
                                </span>
                                <span className="truncate max-w-[220px]">{sj.name}</span>
                                <CheckCircle2
                                  className={`w-3.5 h-3.5 ${
                                    isTabActive ? 'text-emerald-300' : 'text-emerald-500'
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active SubJob Content Display */}
                      {activeSubJob && (
                        <div className="space-y-4">
                          <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3.5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                              <div className="flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                  {activeSubJob.tag}
                                </span>
                                <span className="text-sm font-bold text-[#0C1B33]">
                                  Titik Perangkat: {activeSubJob.device}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                                <Lock className="w-3 h-3 text-emerald-600" />
                                <span>Terkunci &amp; Diverifikasi</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-6 text-xs">
                              {/* Status Perangkat */}
                              <div className="flex items-center">
                                <span className="w-28 text-slate-500 font-medium shrink-0">
                                  Status Perangkat
                                </span>
                                <span className="mr-2 text-slate-400">:</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                  <span>Normal</span>
                                </span>
                              </div>

                              {/* Durasi Pengerjaan */}
                              <div className="flex items-center">
                                <span className="w-28 text-slate-500 font-medium shrink-0">
                                  Durasi Pengerjaan
                                </span>
                                <span className="mr-2 text-slate-400">:</span>
                                <span className="font-semibold text-slate-700">{activeSubJob.duration}</span>
                              </div>

                              {/* Foto Bukti Fisik */}
                              <div className="flex items-center">
                                <span className="w-28 text-slate-500 font-medium shrink-0">
                                  Foto Bukti Fisik
                                </span>
                                <span className="mr-2 text-slate-400">:</span>
                                <div className="flex items-center space-x-2">
                                  <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-700 flex items-center gap-1.5 truncate max-w-[180px]">
                                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="truncate">{activeSubJob.file}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewPhoto({
                                        title: `Foto Bukti: ${activeSubJob.device}`,
                                        filename: activeSubJob.file,
                                      })
                                    }
                                    className="text-blue-600 hover:underline font-semibold text-[11px] shrink-0 cursor-pointer"
                                  >
                                    Lihat Foto
                                  </button>
                                </div>
                              </div>

                              {/* Waktu Verifikasi */}
                              <div className="flex items-center">
                                <span className="w-28 text-slate-500 font-medium shrink-0">
                                  Waktu Verifikasi
                                </span>
                                <span className="mr-2 text-slate-400">:</span>
                                <span className="text-slate-600">{activeSubJob.time}</span>
                              </div>

                              {/* Keterangan Hasil */}
                              <div className="flex items-start md:col-span-2">
                                <span className="w-28 text-slate-500 font-medium shrink-0 pt-0.5">
                                  Keterangan Hasil
                                </span>
                                <span className="mr-2 text-slate-400 pt-0.5">:</span>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 text-xs flex-1">
                                  {activeSubJob.desc}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar Control */}
        {totalItems > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-medium" id="pagination-info">
              Menampilkan <span className="font-bold text-slate-800">{startIndex + 1}</span>-
              <span className="font-bold text-slate-800">{endIndex}</span> dari{' '}
              <span className="font-bold text-slate-800">{totalItems}</span> tugas selesai
            </div>
            <div className="flex items-center space-x-1.5" id="pagination-controls">
              {/* Prev Button */}
              <button
                type="button"
                id="btnPrev"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>

              {/* Dynamic Number Buttons */}
              <div className="flex items-center space-x-1" id="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      p === safeCurrentPage
                        ? 'bg-[#0C1B33] text-white font-bold shadow-2xs'
                        : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              <button
                type="button"
                id="btnNext"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1 cursor-pointer"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Preview Foto Bukti Inspeksi */}
      {previewPhoto && (
        <div
          id="photoModal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-sm font-bold text-[#0C1B33] truncate pr-2">
                {previewPhoto.title || 'Foto Bukti Fisik Lapangan'}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-center space-y-4">
              <div className="w-full h-64 bg-slate-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden">
                <ImageIcon className="w-12 h-12 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-600">
                  {previewPhoto.filename}
                </span>
                <span className="text-[10px] text-slate-400 mt-1">
                  1920 x 1080 px • 2.4 MB • Geotag: Medan (3.5952° N, 98.6722° E)
                </span>
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-[#0C1B33]/85 backdrop-blur-md rounded text-[10px] text-white font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>TIMESTAMP: DIVERIFIKASI &amp; TERKUNCI CLOUD</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-left leading-relaxed">
                Foto bukti fisik telah diverifikasi oleh sistem dan tersinkronisasi aman ke cloud repository MAJO.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-2 bg-[#0C1B33] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
