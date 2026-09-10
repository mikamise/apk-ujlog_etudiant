'use client';

import {
  Users,
  UserCheck,
  BookOpen,
  Send,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { SystemStats, SystemAuditLog } from '@/lib/admin-types';
import type { AdminTabType } from '@/components/super-admin/admin-sidebar';
import { motion } from 'motion/react';

interface OverviewViewProps {
  stats: SystemStats;
  recentLogs: SystemAuditLog[];
  onNavigateTab: (tab: AdminTabType) => void;
  onOpenAddDelegate: () => void;
}

export function OverviewView({
  stats,
  recentLogs,
  onNavigateTab,
  onOpenAddDelegate
}: OverviewViewProps) {
  const statCards: {
    title: string;
    value: string;
    sub: string;
    icon: typeof Users;
    accent: 'orange' | 'green';
    actionTab: AdminTabType;
  }[] = [
    {
      title: 'Nombre total d’étudiants',
      value: stats.totalStudents.toLocaleString('fr-FR'),
      sub: 'Comptes actifs sur la plateforme',
      icon: Users,
      accent: 'orange',
      actionTab: 'students'
    },
    {
      title: 'Nombre de Délégués',
      value: stats.totalDelegates.toLocaleString('fr-FR'),
      sub: 'Délégués de filières et niveaux',
      icon: UserCheck,
      accent: 'green',
      actionTab: 'delegates'
    },
    {
      title: 'Nombre de cours',
      value: stats.totalCourses.toLocaleString('fr-FR'),
      sub: 'Supports CM, TD, Sujets & PVs',
      icon: BookOpen,
      accent: 'orange',
      actionTab: 'courses'
    },
    {
      title: 'Publications récentes',
      value: stats.recentPublicationsCount.toLocaleString('fr-FR'),
      sub: 'Ressources validées cette semaine',
      icon: Send,
      accent: 'green',
      actionTab: 'courses'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-terracotta-gradient rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-glow-orange">
        <svg className="absolute -top-14 -right-14 w-64 h-64 opacity-20 pointer-events-none" viewBox="0 0 480 480" fill="none">
          <circle cx="300" cy="120" r="90" stroke="#fff" strokeWidth="1.5" />
          <circle cx="300" cy="120" r="130" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/25 rounded-full text-[10px] font-bold text-white uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Centre de contrôle</span>
          </div>
          <h1 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">
            Espace administrateur
          </h1>
          <p className="text-xs text-white/85 max-w-xl">
            Supervision des étudiants, des délégués académiques, des publications de cours et de l&apos;audit de sécurité.
          </p>
        </div>

        <div className="flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={onOpenAddDelegate}
            className="px-4 py-2.5 bg-white hover:bg-white/90 active:scale-[0.99] text-ujlog-primary-dark font-bold text-xs rounded-xl shadow-soft-warm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un délégué</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('activity')}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>Journal d&apos;activité</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onNavigateTab(card.actionTab)}
              className="p-5 bg-white border border-ujlog-border hover:border-ujlog-primary/40 rounded-3xl space-y-3 cursor-pointer transition-all hover:-translate-y-0.5 group shadow-soft-warm"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-2xl ${card.accent === 'orange' ? 'bg-ujlog-primary-light text-ujlog-primary' : 'bg-ujlog-secondary-50 text-ujlog-secondary'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-ujlog-ink-soft font-bold flex items-center gap-0.5 group-hover:text-ujlog-primary transition-colors">
                  Détails
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">{card.title}</p>
                <p className="text-2xl font-display font-bold text-ujlog-ink mt-0.5">{card.value}</p>
              </div>
              <p className="text-[10px] text-ujlog-ink-soft">{card.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Active Users & Quick Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white border border-ujlog-border rounded-3xl p-5 space-y-4 shadow-soft-warm">
          <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-ujlog-primary" />
              <h3 className="text-xs font-bold text-ujlog-ink">
                Activité récente de la plateforme
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('activity')}
              className="text-[11px] text-ujlog-secondary hover:underline font-bold"
            >
              Tout afficher
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-ujlog-ink-soft">
              Aucune activité récente enregistrée.
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-ujlog-cream/70 border border-ujlog-border rounded-2xl flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-ujlog-primary-light rounded-xl text-ujlog-primary mt-0.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-ujlog-ink">{log.action}</p>
                      <p className="text-[11px] text-ujlog-ink-soft">{log.target}</p>
                      {log.details && (
                        <p className="text-[10px] text-ujlog-ink-soft mt-0.5">{log.details}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-right shrink-0">
                    <span className="text-[10px] text-ujlog-ink-soft flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[9px] font-bold text-ujlog-secondary uppercase mt-0.5">{log.userName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick System Status Panel */}
        <div className="bg-white border border-ujlog-border rounded-3xl p-5 space-y-4 shadow-soft-warm">
          <div className="border-b border-ujlog-border pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-ujlog-ink">
              État du système
            </h3>
            <span className="px-2 py-0.5 bg-ujlog-secondary-50 text-ujlog-secondary border border-ujlog-secondary-100 text-[10px] font-bold rounded-full">
              Opérationnel
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-ujlog-cream/70 rounded-2xl border border-ujlog-border flex items-center justify-between">
              <span className="text-ujlog-ink-soft">Année universitaire</span>
              <span className="font-bold text-ujlog-ink">2026-2027</span>
            </div>

            <div className="p-3 bg-ujlog-cream/70 rounded-2xl border border-ujlog-border flex items-center justify-between">
              <span className="text-ujlog-ink-soft">Sécurité des rôles</span>
              <span className="font-bold text-ujlog-secondary">Serveur vérifié</span>
            </div>

            <div className="p-3 bg-ujlog-cream/70 rounded-2xl border border-ujlog-border flex items-center justify-between">
              <span className="text-ujlog-ink-soft">Dernière sauvegarde</span>
              <span className="font-bold text-ujlog-ink">Automatique</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigateTab('statistics')}
              className="w-full py-2.5 px-3 bg-ujlog-cream hover:bg-ujlog-primary-light text-ujlog-ink text-xs font-bold rounded-xl border border-ujlog-border transition-all cursor-pointer"
            >
              Consulter les statistiques détaillées
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
