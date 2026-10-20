import React, { useMemo, useState } from 'react';

export interface ApprovalReport {
  id: string;
  jobId: string;
  title: string;
  region: string;
  submittedBy: string;
  technicianName?: string;
  completedAt: string;
  savedAt?: string;
  pointsCount: number;
  subJobs: Record<string, unknown>[];
}

interface ApprovalViewProps {
  reports: ApprovalReport[];
  busyReportId: string | null;
  onApprove: (report: ApprovalReport) => Promise<boolean>;
  onRequestRevision: (report: ApprovalReport, reason: string) => Promise<boolean>;
}

const valueOrDash = (value: unknown): string =>
  value === undefined || value === null || value === '' ? '—' : String(value);

export const ApprovalView: React.FC<ApprovalViewProps> = ({
  reports,
  busyReportId,
  onApprove,
  onRequestRevision,
}) => {
  const [selectedReportId, setSelectedReportId] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || reports[0],
    [reports, selectedReportId]
  );

  const requestRevision = async () => {
    const reason = revisionReason.trim();
    if (!selectedReport || !reason) {
      setReasonError('Alasan revisi wajib diisi agar petugas tahu bagian yang harus diperbaiki.');
      return;
    }
    setReasonError('');
    if (await onRequestRevision(selectedReport, reason)) setRevisionReason('');
  };

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Pemeriksaan laporan PM</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-on-surface">Approval</h1>
          <p className="mt-1 text-sm text-secondary">
            Periksa seluruh input dan bukti yang dikirim petugas sebelum menyelesaikan PM.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
          {reports.length} laporan menunggu pemeriksaan
        </span>
      </header>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center">
          <span aria-hidden="true" className="material-symbols-outlined text-4xl text-emerald-600">task_alt</span>
          <h2 className="mt-2 font-bold text-on-surface">Tidak ada laporan menunggu approval</h2>
          <p className="mt-1 text-sm text-secondary">Laporan PM yang baru diserahkan petugas akan tampil di sini.</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.7fr)]">
          <nav aria-label="Laporan yang menunggu approval" className="flex flex-col gap-2">
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                aria-current={selectedReport?.id === report.id ? 'true' : undefined}
                onClick={() => {
                  setSelectedReportId(report.id);
                  setRevisionReason('');
                  setReasonError('');
                }}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selectedReport?.id === report.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low'
                }`}
              >
                <span className="block text-sm font-bold text-on-surface">{report.title || report.jobId}</span>
                <span className="mt-1 block text-xs text-secondary">{report.region} · {report.technicianName || report.submittedBy}</span>
                <span className="mt-2 block text-[11px] text-secondary">{report.completedAt || report.savedAt || 'Waktu tidak tersedia'}</span>
                <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {report.pointsCount} respons · Menunggu approval
                </span>
              </button>
            ))}
          </nav>

          {selectedReport && (
            <article className="min-w-0 overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
              <div className="border-b border-outline-variant/20 bg-surface-container-low/60 p-5">
                <p className="text-xs font-semibold text-secondary">{selectedReport.jobId} · {selectedReport.region}</p>
                <h2 className="mt-1 text-lg font-bold text-on-surface">{selectedReport.title}</h2>
                <p className="mt-1 text-xs text-secondary">
                  Petugas: {selectedReport.technicianName || selectedReport.submittedBy} · Dikirim: {selectedReport.completedAt || selectedReport.savedAt || '—'}
                </p>
              </div>

              <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4 sm:p-5">
                {selectedReport.subJobs.map((response, index) => {
                  const photos = Array.isArray(response.photos)
                    ? response.photos as Record<string, unknown>[]
                    : response.photoUrl
                      ? [{ photoUrl: response.photoUrl, name: response.file, caption: response.caption }]
                      : [];
                  return (
                    <section key={String(response.id || `${selectedReport.id}-${index}`)} className="rounded-xl border border-outline-variant/30 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-on-surface">
                          {index + 1}. {valueOrDash(response.name)}
                        </h3>
                        <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold text-secondary">
                          {valueOrDash(response.subLocation)}{response.place ? ` · ${String(response.place)}` : ''}
                        </span>
                      </div>
                      <dl className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2">
                        <div><dt className="font-semibold text-secondary">Perangkat / tempat</dt><dd className="mt-0.5 text-on-surface">{valueOrDash(response.device)}</dd></div>
                        <div><dt className="font-semibold text-secondary">Kondisi</dt><dd className="mt-0.5 text-on-surface">{valueOrDash(response.status)}</dd></div>
                        <div><dt className="font-semibold text-secondary">Nilai kondisi</dt><dd className="mt-0.5 text-on-surface">{valueOrDash(response.conditionValue)}</dd></div>
                        <div><dt className="font-semibold text-secondary">Waktu respons</dt><dd className="mt-0.5 text-on-surface">{valueOrDash(response.time)}</dd></div>
                        <div><dt className="font-semibold text-secondary">Durasi</dt><dd className="mt-0.5 text-on-surface">{valueOrDash(response.duration)}</dd></div>
                        <div><dt className="font-semibold text-secondary">Keterangan / hasil</dt><dd className="mt-0.5 whitespace-pre-wrap text-on-surface">{valueOrDash(response.desc || response.logicOutput)}</dd></div>
                      </dl>
                      {photos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-secondary">Foto bukti dan caption</p>
                          <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            {photos.map((photo, photoIndex) => (
                              <figure key={`${selectedReport.id}-${index}-${photoIndex}`} className="overflow-hidden rounded-lg border border-outline-variant/30">
                                {typeof photo.photoUrl === 'string' && photo.photoUrl.startsWith('https://') ? (
                                  <a href={photo.photoUrl} target="_blank" rel="noreferrer" className="block bg-surface-container-low">
                                    <img src={photo.photoUrl} alt={String(photo.caption || photo.name || 'Foto bukti PM')} className="h-40 w-full object-contain" loading="lazy" />
                                  </a>
                                ) : (
                                  <div className="flex h-20 items-center justify-center bg-surface-container-low text-xs text-secondary">Foto tidak tersedia</div>
                                )}
                                <figcaption className="p-2 text-xs">
                                  <span className="block font-semibold text-on-surface">{valueOrDash(photo.name)}</span>
                                  <span className="mt-1 block whitespace-pre-wrap text-secondary">{valueOrDash(photo.caption)}</span>
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              <div className="border-t border-outline-variant/20 bg-surface-container-low/40 p-4 sm:p-5">
                <label htmlFor="approval-revision-reason" className="block text-xs font-bold text-on-surface">
                  Alasan revisi <span className="font-normal text-secondary">(wajib jika laporan dikembalikan)</span>
                </label>
                <textarea
                  id="approval-revision-reason"
                  value={revisionReason}
                  onChange={(event) => {
                    setRevisionReason(event.target.value);
                    if (event.target.value.trim()) setReasonError('');
                  }}
                  rows={3}
                  placeholder="Jelaskan bagian yang perlu diperbaiki oleh petugas..."
                  className="mt-2 w-full rounded-xl border border-outline-variant/40 bg-white p-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
                {reasonError && <p className="mt-1 text-xs font-semibold text-error" role="alert">{reasonError}</p>}
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={busyReportId === selectedReport.id}
                    onClick={requestRevision}
                    className="min-h-10 rounded-xl border border-error/30 px-4 py-2 text-xs font-bold text-error hover:bg-error-container/30 disabled:opacity-50"
                  >
                    Minta Revisi
                  </button>
                  <button
                    type="button"
                    disabled={busyReportId === selectedReport.id}
                    onClick={() => onApprove(selectedReport)}
                    className="min-h-10 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary hover:bg-primary-container disabled:opacity-50"
                  >
                    {busyReportId === selectedReport.id ? 'Menyimpan...' : 'Setujui & Selesaikan PM'}
                  </button>
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
};
