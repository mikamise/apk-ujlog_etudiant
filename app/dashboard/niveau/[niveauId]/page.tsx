'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, ChevronRight, GraduationCap } from 'lucide-react';
import { useEffect } from 'react';

const levelData: Record<string, { name: string; desc: string; parcours: { id: string; name: string; code: string }[] }> = {
  l3: {
    name: 'Licence 3',
    desc: 'Troisième année de spécialisation universitaire',
    parcours: [
      { id: 'histoire', name: 'Histoire', code: 'HIST-L3' },
      { id: 'geographie', name: 'Géographie', code: 'GEO-L3' },
      { id: 'histoire-geographie', name: 'Histoire-Géographie', code: 'HG-L3' }
    ]
  },
  m1: {
    name: 'Master 1',
    desc: 'Cycle supérieur et recherche approfondie',
    parcours: [
      { id: 'geo-population', name: 'Géographie, Population et Développement territorial', code: 'GPDT-M1' },
      { id: 'geo-valorisation', name: 'Géographie, Valorisation du Milieu naturel', code: 'GVMN-M1' }
    ]
  },
  m2: {
    name: 'Master 2',
    desc: 'Cycle terminal de master et préparation de mémoire',
    parcours: [
      { id: 'geo-population', name: 'Géographie, Population et Développement territorial', code: 'GPDT-M2' },
      { id: 'geo-valorisation', name: 'Géographie, Valorisation du Milieu naturel', code: 'GVMN-M2' }
    ]
  }
};

export default function NiveauParcoursPage() {
  const params = useParams();
  const router = useRouter();
  const niveauId = (params?.niveauId as string) || "";
  
  useEffect(() => {
    if (niveauId === 'l1' || niveauId === 'l2') {
      router.replace(`/dashboard/cours?niveau=${niveauId}`);
    }
  }, [niveauId, router]);

  const data = levelData[niveauId];

  if (!data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <p className="text-ujlog-ink-soft text-xs font-semibold">Niveau académique introuvable.</p>
        <Link 
          href="/dashboard" 
          className="px-3.5 py-2 bg-orange-800 text-white font-bold text-xs rounded-xl inline-block hover:bg-orange-900 transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-5">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
        
        <motion.div variants={itemVariants}>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-primary-dark transition-colors font-semibold text-xs mb-2 group"
          >
            <div className="w-6 h-6 rounded-lg bg-white border border-ujlog-border flex items-center justify-center group-hover:bg-orange-50 transition-colors">
              <ArrowLeft className="w-3 h-3" />
            </div>
            <span>Tableau de bord</span>
          </Link>
          
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-orange-50 border border-orange-200 text-ujlog-primary-dark flex items-center justify-center font-bold text-xs">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-ujlog-ink tracking-tight">
                {data.name}
              </h1>
              <p className="text-ujlog-ink-soft font-normal text-xs mt-0.5">
                {data.desc}. Sélectionnez votre parcours pour consulter les cours.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.parcours.map((p) => (
            <Link 
              key={p.id}
              href={`/dashboard/cours?niveau=${niveauId}&parcours=${p.id}`}
              className="bg-white rounded-2xl p-4 shadow-2xs border border-ujlog-border transition-all flex items-center justify-between group hover:border-orange-300 hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-ujlog-cream border border-ujlog-border text-ujlog-primary-dark flex items-center justify-center group-hover:bg-orange-800 group-hover:text-white transition-colors shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ujlog-primary-dark bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 uppercase tracking-wider block w-fit mb-0.5">
                    {p.code}
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-ujlog-ink group-hover:text-ujlog-primary-dark transition-colors leading-snug">
                    {p.name}
                  </h3>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-ujlog-ink-soft/60 group-hover:text-ujlog-primary-dark group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </Link>
          ))}
        </motion.div>

      </motion.div>
    </div>
  );
}
