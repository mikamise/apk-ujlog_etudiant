'use client';

import { useUser } from '@/hooks/use-user';
import { 
  GraduationCap, 
  ChevronRight, 
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { LEVEL_CODE_TO_LABEL, FIELD_CODE_TO_LABEL } from '@/lib/academic-reference';

const levels = [
  { 
    id: 'l1', 
    name: 'Licence 1', 
    type: 'direct', 
    code: 'L1', 
    desc: 'Tronc commun L1',
    chip: 'bg-terracotta-gradient shadow-glow-orange'
  },
  { 
    id: 'l2', 
    name: 'Licence 2', 
    type: 'direct', 
    code: 'L2', 
    desc: 'Tronc commun L2',
    chip: 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_12px_26px_-12px_rgba(37,99,235,0.4)]'
  },
  { 
    id: 'l3', 
    name: 'Licence 3', 
    type: 'choice', 
    code: 'L3', 
    desc: 'Spécialisations Histoire & Géo',
    chip: 'bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_12px_26px_-12px_rgba(124,58,237,0.4)]'
  },
  { 
    id: 'm1', 
    name: 'Master 1', 
    type: 'choice', 
    code: 'M1', 
    desc: 'Cycles de recherche M1',
    chip: 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-[0_12px_26px_-12px_rgba(225,29,72,0.4)]'
  },
  { 
    id: 'm2', 
    name: 'Master 2', 
    type: 'choice', 
    code: 'M2', 
    desc: 'Cycle terminal et mémoires',
    chip: 'bg-green-gradient shadow-glow-green'
  },
];

export default function DashboardHome() {
  const { user } = useUser();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      
      {/* Welcome Hero Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden bg-terracotta-gradient rounded-[28px] p-5 sm:p-7 text-white shadow-glow-orange"
      >
        {/* Topographic motif + blur orbs */}
        <svg className="absolute -top-16 -right-20 w-80 h-80 opacity-30 pointer-events-none" viewBox="0 0 480 480" fill="none">
          <circle cx="300" cy="150" r="80" stroke="rgba(255,247,237,0.3)" strokeWidth="1.5" />
          <circle cx="300" cy="150" r="120" stroke="rgba(255,247,237,0.2)" strokeWidth="1.5" />
          <circle cx="300" cy="150" r="160" stroke="rgba(255,247,237,0.12)" strokeWidth="1.5" />
        </svg>
        <div className="absolute right-20 -bottom-10 w-44 h-44 bg-green-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-[10px] font-bold text-orange-50">
              <Sparkles className="w-3 h-3 text-green-200" />
              <span>Espace Officiel • Session 2026-2027</span>
            </div>
            
            <h1 className="font-display text-base sm:text-lg lg:text-xl font-bold tracking-tight text-orange-50">
              {getGreeting()}, {user.civility ? `${user.civility} ` : ''}{user.firstName ? `${user.firstName} ${user.lastName}` : 'Étudiant'}
            </h1>
            
            <p className="text-xs text-orange-50/85 leading-relaxed font-normal">
              Bienvenue sur votre portail universitaire. Sélectionnez votre niveau d&apos;études ci-dessous pour accéder directement à vos cours, TD et ressources académiques.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <div className="bg-white/12 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 text-left">
              <span className="text-[9px] uppercase font-bold text-green-200 tracking-wider block">Cursus actif</span>
              <span className="text-xs font-bold text-white block mt-0.5 truncate">
                {(user.level && LEVEL_CODE_TO_LABEL[user.level]) || 'Non défini'} • {(user.field && FIELD_CODE_TO_LABEL[user.field]) || 'Tronc commun'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Select Level Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6.5 h-6.5 rounded-xl bg-terracotta-gradient text-white flex items-center justify-center shadow-glow-orange">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h2 className="font-display text-xs sm:text-sm font-bold text-ujlog-ink tracking-tight">
              Choisissez votre niveau académique
            </h2>
          </div>
          <span className="text-[10px] text-ujlog-ink-soft font-bold uppercase tracking-wider">5 niveaux disponibles</span>
        </div>

        {/* Level Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {levels.map((level) => {
            const href = level.type === 'direct' 
              ? `/dashboard/cours?niveau=${level.id}` 
              : `/dashboard/niveau/${level.id}`;

            const isUserLevel = user.level?.toLowerCase().includes(level.code.toLowerCase());

            return (
              <Link
                key={level.id}
                href={href}
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all duration-300 flex items-center justify-between group bg-white ${
                  isUserLevel 
                    ? 'border-ujlog-secondary-light shadow-glow-green ring-2 ring-ujlog-secondary-light/40 bg-ujlog-secondary-50' 
                    : 'border-ujlog-border shadow-soft-warm hover:border-ujlog-primary/60 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 text-white transition-all ${level.chip}`}>
                    {level.code}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-ujlog-ink group-hover:text-ujlog-primary-dark transition-colors truncate">
                        {level.name}
                      </span>
                      {isUserLevel && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-ujlog-secondary-100 text-ujlog-secondary font-extrabold rounded-md">
                          Votre niveau
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ujlog-ink-soft font-medium truncate mt-0.5">
                      {level.desc}
                    </p>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0 ${isUserLevel ? 'text-ujlog-secondary' : 'text-ujlog-primary'}`} />
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
