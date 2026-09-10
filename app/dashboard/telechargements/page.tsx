'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HardDrive, FileText, Trash2, Loader2, AlertCircle, FolderOpen } from 'lucide-react';
import {
  listDownloadRecords,
  removeLocalDownload,
  openOfflineFile,
  getTotalOfflineStorageBytes,
  type DownloadRecord,
} from '@/lib/offline-downloads';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 Ko';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function TelechargementsPage() {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [list, total] = await Promise.all([listDownloadRecords(), getTotalOfflineStorageBytes()]);
      setRecords(list.filter((r) => r.status === 'downloaded' || r.status === 'error').sort(
        (a, b) => (b.downloadedAt || '').localeCompare(a.downloadedAt || '')
      ));
      setTotalBytes(total);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);


  const handleOpen = async (record: DownloadRecord) => {
    try {
      await openOfflineFile(record.fileId);
    } catch {
      // Fichier local introuvable (ex. vidé par le navigateur) : on rafraîchit la liste.
      refresh();
    }
  };

  const handleRemove = async (record: DownloadRecord) => {
    setRemovingId(record.fileId);
    try {
      await removeLocalDownload(record.fileId);
      await refresh();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors font-semibold text-xs mb-1.5 group"
          >
            <div className="w-6 h-6 rounded-lg bg-white border border-ujlog-border flex items-center justify-center group-hover:bg-ujlog-primary-light transition-colors">
              <ArrowLeft className="w-3 h-3" />
            </div>
            <span>Tableau de bord</span>
          </Link>
          <h1 className="text-base sm:text-lg font-bold text-ujlog-ink tracking-tight">Mes téléchargements</h1>
          <p className="text-ujlog-ink-soft font-normal text-xs mt-0.5">
            Documents disponibles hors ligne, enregistrés sur cet appareil.
          </p>
        </div>

        <div className="bg-white px-3 py-2 rounded-xl border border-ujlog-border shadow-soft-warm self-start sm:self-auto flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-ujlog-primary" />
          <span className="text-xs font-bold text-ujlog-ink">{formatBytes(totalBytes)}</span>
          <span className="text-[10px] text-ujlog-ink-soft">utilisés sur cet appareil</span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-ujlog-ink-soft/60 font-semibold text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-ujlog-primary" />
          <span>Chargement de vos téléchargements...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center py-10 bg-white rounded-2xl border border-ujlog-border p-6 shadow-soft-warm space-y-3">
          <div className="w-10 h-10 bg-ujlog-primary-light border border-ujlog-primary/20 rounded-xl flex items-center justify-center text-ujlog-primary">
            <FolderOpen className="w-5 h-5" />
          </div>
          <h2 className="text-xs sm:text-sm font-bold text-ujlog-ink">Aucun document hors ligne</h2>
          <p className="text-ujlog-ink-soft font-normal text-xs leading-relaxed max-w-xs">
            Téléchargez un cours depuis la page Cours pour le rendre disponible ici, même sans connexion.
          </p>
          <Link
            href="/dashboard/cours"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-ujlog-primary-dark text-white font-bold text-xs rounded-xl hover:brightness-105 transition-all mt-1"
          >
            Parcourir les cours
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map((record) => (
            <div
              key={record.fileId}
              className="bg-white rounded-2xl p-3.5 border border-ujlog-border shadow-soft-warm flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${record.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-ujlog-primary-light text-ujlog-primary'
                }`}>
                {record.status === 'error' ? <AlertCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-ujlog-ink truncate">{record.title}</p>
                <p className="text-[11px] text-ujlog-ink-soft/70 truncate">{record.fileName}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ujlog-ink-soft">
                  {record.status === 'error' ? (
                    <span className="text-red-600 font-semibold">Échec du téléchargement</span>
                  ) : (
                    <>
                      <span>{formatBytes(record.sizeBytes)}</span>
                      <span>•</span>
                      <span>{formatDate(record.downloadedAt)}</span>
                      <span>•</span>
                      <span className="text-ujlog-secondary-dark font-semibold">Disponible hors ligne</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {record.status === 'downloaded' && (
                  <button
                    onClick={() => handleOpen(record)}
                    className="px-2.5 py-1.5 rounded-lg bg-ujlog-ink text-white text-[11px] font-bold hover:bg-ujlog-primary-dark transition-colors cursor-pointer"
                  >
                    Ouvrir
                  </button>
                )}
                <button
                  onClick={() => handleRemove(record)}
                  disabled={removingId === record.fileId}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Supprimer de cet appareil (le cours reste disponible en ligne)"
                >
                  {removingId === record.fileId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <p className="text-[10px] text-ujlog-ink-soft/60 text-center pt-2">
            Supprimer un document ici ne fait que libérer de l&apos;espace sur cet appareil — il reste disponible en ligne et pourra être retéléchargé.
          </p>
        </div>
      )}
    </div>
  );
}
