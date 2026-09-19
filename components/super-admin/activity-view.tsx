'use client';

import { useState } from 'react';
import { History, Search, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { SystemAuditLog } from '@/lib/admin-types';

interface ActivityViewProps {
  logs: SystemAuditLog[];
}

export function ActivityView({ logs }: ActivityViewProps) {
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    return (
      !search ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-ujlog-primary uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Sécurité & Traçabilité</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
            Journal d&apos;activité & audit
          </h1>
          <p className="text-xs text-ujlog-ink-soft/60">
            Enregistrement immuable des actions d&apos;administration, des connexions et des modifications de privilèges.
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-ujlog-primary bg-white border border-ujlog-border px-3 py-1.5 rounded-xl">
          Total : {filteredLogs.length} événements
        </span>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border border-ujlog-border rounded-3xl shadow-soft-warm">
        <div className="relative">
          <Search className="w-4 h-4 text-ujlog-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par utilisateur, action, cible..."
            className="w-full pl-10 pr-3.5 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink placeholder-ujlog-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-ujlog-border rounded-3xl overflow-hidden shadow-soft-warm">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-ujlog-ink-soft space-y-2">
            <History className="w-8 h-8 text-ujlog-ink-soft mx-auto" />
            <p className="font-bold text-ujlog-ink-soft/60">Aucun journal trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ujlog-ink-soft">
              <thead className="bg-ujlog-cream text-ujlog-ink-soft/60 font-bold uppercase text-[10px] tracking-wider border-b border-ujlog-border">
                <tr>
                  <th className="py-3.5 px-4">Utilisateur</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Cible</th>
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4">Résultat</th>
                  <th className="py-3.5 px-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ujlog-border/60 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-ujlog-cream/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-ujlog-ink">{log.userName}</p>
                      <p className="text-[10px] font-mono text-ujlog-ink-soft/60">{log.userEmail}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-ujlog-primary">{log.action}</p>
                      {log.details && <p className="text-[10px] text-ujlog-ink-soft">{log.details}</p>}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-ujlog-ink">{log.target}</td>
                    <td className="py-3.5 px-4 font-mono text-ujlog-ink-soft/60 text-[11px]">
                      {new Date(log.timestamp).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.result === 'Succès'
                            ? 'bg-ujlog-primary-light text-ujlog-primary border border-ujlog-primary/20'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {log.result === 'Succès' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{log.result}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-ujlog-ink-soft text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
