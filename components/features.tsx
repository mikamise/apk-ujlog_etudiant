'use client';

import Image from 'next/image';
import { BookOpen, Download, Search, Bell, Users, ShieldCheck, Landmark, Compass, Sparkles, FileText, CheckCircle2, Award } from 'lucide-react';
import { motion } from 'motion/react';

const features = [
  {
    title: 'Cours Magistraux (CM)',
    description: 'Accédez aux polycopiés et diapositives officiels de chaque unité d&apos;enseignement (UE).',
    icon: BookOpen,
    tag: 'Théorie & Concepts',
    color: 'orange'
  },
  {
    title: 'Travaux Dirigés (TD)',
    description: 'Exercices corrigés, fiches méthodologiques de cartographie et de statistiques géographiques.',
    icon: FileText,
    tag: 'Pratique & Méthode',
    color: 'green'
  },
  {
    title: 'Annales d&apos;Examens',
    description: 'Consultez les sujets des sessions antérieures pour une préparation ciblée et efficace.',
    icon: Compass,
    tag: 'Révisions Ciblées',
    color: 'orange'
  },
  {
    title: 'Téléchargement Direct',
    description: 'Téléchargez les documents PDF et visualisez-les hors connexion sur votre appareil.',
    icon: Download,
    tag: 'Hors-Ligne',
    color: 'green'
  },
  {
    title: 'Recherche Instantanée',
    description: 'Filtrez vos cours par semestre (Semestre 1 et Semestre 2), par enseignant ou par mot-clé thématique.',
    icon: Search,
    tag: 'Filtres Rapides',
    color: 'orange'
  },
  {
    title: 'Accès Étudiant & Délégué',
    description: 'Espace sécurisé pour chaque étudiant et interface dédiée aux délégués de promotion.',
    icon: ShieldCheck,
    tag: 'Sécurité & Droits',
    color: 'green'
  },
];

export function Features() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
  };

  return (
    <section id="presentation" className="py-16 sm:py-24 bg-white relative overflow-hidden border-b border-ujlog-border">
      {/* Background soft accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-orange-50/50 via-transparent to-transparent pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header - Centered with University & Department Branding */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          {/* Dual Institutional Badges */}
          <div className="inline-flex items-center gap-3 p-2 bg-ujlog-cream border border-ujlog-border rounded-2xl shadow-2xs mx-auto">
            <div className="relative w-8 h-8 bg-white rounded-lg p-0.5 shadow-2xs border border-orange-100">
              <Image 
                src="/logo-ujlog.png" 
                alt="Logo UJLOG" 
                fill 
                className="object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="h-4 w-px bg-ujlog-border" />
            <div className="relative w-8 h-8 bg-white rounded-lg p-0.5 shadow-2xs border border-orange-100">
              <Image 
                src="/logo-geographie.jpg" 
                alt="Logo Département Géographie" 
                fill 
                className="object-contain rounded-md"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[11px] font-black uppercase text-ujlog-primary-dark pr-1 tracking-wider">
              Département de Géographie • UJLOG
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-950 tracking-tight">
            Présentation Pédagogique du Département <br />
            <span className="text-ujlog-primary-dark">Votre portail officiel de formation</span>
          </h2>

          <p className="text-xs sm:text-sm text-ujlog-ink-soft leading-relaxed font-normal max-w-2xl mx-auto">
            Retrouvez tous vos enseignements universitaires, fiches de méthodologie, cours magistraux (CM), travaux dirigés (TD) et annales d&apos;examens organisés par niveau de la Licence 1 au Master 2.
          </p>
        </motion.div>

        {/* DUAL INSTITUTIONAL SHOWCASE (Université & Département with Photos) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Université Jean Lorougnon Guédé */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl border border-ujlog-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
          >
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-ujlog-cream border-b border-ujlog-border">
              <Image
                src="/campus-geographie.jpg"
                alt="Campus Universitaire UJLOG Daloa"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="relative w-10 h-10 bg-white rounded-xl p-1 shadow-md border border-orange-200">
                  <Image src="/logo-ujlog.png" alt="Logo UJLOG" fill className="object-contain" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-900/90 text-orange-100 px-3 py-1 rounded-full shadow-md backdrop-blur-xs">
                  Université Publique
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between bg-white">
              <div>
                <p className="text-[11px] font-bold text-ujlog-primary-dark uppercase tracking-widest">Campus Principal • Daloa</p>
                <h3 className="text-xl font-black text-ujlog-ink tracking-tight mt-0.5">Université Jean Lorougnon Guédé (UJLOG)</h3>
                <p className="text-xs sm:text-sm text-ujlog-ink-soft leading-relaxed mt-2">
                  Créée pour promouvoir l&apos;excellence académique, l&apos;Université Jean Lorougnon Guédé offre un cadre d&apos;études moderne, rigoureux et tourné vers l&apos;innovation, le développement durable et la réussite des étudiants.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ujlog-border text-xs">
                <div className="flex items-center gap-2 text-ujlog-ink-soft font-bold">
                  <CheckCircle2 className="w-4 h-4 text-orange-700 shrink-0" />
                  <span>Cadre moderne & verdoyant</span>
                </div>
                <div className="flex items-center gap-2 text-ujlog-ink-soft font-bold">
                  <CheckCircle2 className="w-4 h-4 text-orange-700 shrink-0" />
                  <span>Système LMD certifié</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Département de Géographie */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-3xl border border-ujlog-border overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
          >
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-ujlog-cream border-b border-ujlog-border">
              <Image
                src="/cartographie-geographie.jpg"
                alt="Enseignements et Cartographie Géographique"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="relative w-10 h-10 bg-white rounded-xl p-1 shadow-md border border-green-200">
                  <Image src="/logo-geographie.jpg" alt="Logo Géographie" fill className="object-contain rounded-lg" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-green-900/90 text-green-100 px-3 py-1 rounded-full shadow-md backdrop-blur-xs">
                  UFR Sciences Sociales
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between bg-white">
              <div>
                <p className="text-[11px] font-bold text-green-800 uppercase tracking-widest">Formation Spécialisée • Cartographie & SIG</p>
                <h3 className="text-xl font-black text-ujlog-ink tracking-tight mt-0.5">Département de Géographie</h3>
                <p className="text-xs sm:text-sm text-ujlog-ink-soft leading-relaxed mt-2">
                  Le Département de Géographie assure une formation complète combinant géographie physique, géographie humaine, aménagement du territoire, analyse géomatique et ateliers pratiques de terrain.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-ujlog-border text-xs">
                <div className="flex items-center gap-2 text-ujlog-ink-soft font-bold">
                  <CheckCircle2 className="w-4 h-4 text-orange-700 shrink-0" />
                  <span>Enseignements CM & TD</span>
                </div>
                <div className="flex items-center gap-2 text-ujlog-ink-soft font-bold">
                  <CheckCircle2 className="w-4 h-4 text-orange-700 shrink-0" />
                  <span>Ateliers & Sorties terrain</span>
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Feature Cards Grid (6 Cards Organized) */}
        <div id="fonctionnalites" className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-ujlog-ink uppercase tracking-tight">
              Services & Fonctionnalités de la Plateforme
            </h3>
            <p className="text-xs text-ujlog-ink-soft font-medium">
              Explorez tous les outils développés pour votre réussite universitaire.
            </p>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div 
                  variants={item}
                  key={index}
                  className="p-6 rounded-3xl bg-ujlog-cream/90 border border-ujlog-border hover:border-orange-500/60 hover:bg-orange-50/30 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 group hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-ujlog-border/90 flex items-center justify-center text-ujlog-primary-dark group-hover:text-orange-700 group-hover:border-orange-300 shadow-xs transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-ujlog-ink-soft bg-white px-2.5 py-1 rounded-xl border border-ujlog-border shadow-2xs">
                      {feature.tag}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-black text-sm sm:text-base text-ujlog-ink tracking-tight group-hover:text-ujlog-primary-dark transition-colors">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-ujlog-ink-soft font-normal leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
