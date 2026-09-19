'use client';
import { GraduationCap, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const levels = [
  { id: 'L1', name: 'Licence 1', desc: 'Tronc commun L1', color: 'from-orange-500/15 via-orange-500/5 to-green-500/10 border-orange-500/30 text-ujlog-primary-dark' },
  { id: 'L2', name: 'Licence 2', desc: 'Tronc commun L2', color: 'from-orange-500/15 via-green-500/10 to-orange-500/5 border-orange-500/30 text-ujlog-primary-dark' },
  { id: 'L3', name: 'Licence 3', desc: 'Spécialisations L3', color: 'from-green-500/15 via-orange-500/10 to-orange-500/5 border-green-500/30 text-green-950' },
  { id: 'M1', name: 'Master 1', desc: 'Cycle Master M1', color: 'from-green-500/15 via-orange-500/10 to-green-500/5 border-green-500/30 text-green-950' },
  { id: 'M2', name: 'Master 2', desc: 'Cycle Terminal M2', color: 'from-orange-600/15 via-green-500/10 to-orange-500/10 border-orange-600/30 text-ujlog-primary-dark' },
  { id: 'EC', name: 'Enseignant chercheur', desc: 'Espace Recherche', color: 'from-orange-600/20 via-orange-500/10 to-green-500/20 border-orange-600/40 text-ujlog-primary-dark' },
];

export function AcademicPath() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
  };

  return (
    <section id="parcours" className="py-16 sm:py-20 relative bg-ujlog-cream overflow-hidden">
      {/* Decorative blurred background Orbs */}
      <div className="absolute top-1/2 left-10 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-green-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12 space-y-2"
        >
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-ujlog-primary-dark bg-orange-100/80 px-3 py-1 rounded-lg border border-orange-300/60 backdrop-blur-sm shadow-2xs">
            <Sparkles className="w-3 h-3 text-green-600" />
            <span>Niveaux d&apos;Études Académiques</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-ujlog-ink tracking-tight">
            Parcours de Formation LMD
          </h2>
          <p className="text-xs sm:text-sm text-ujlog-ink-soft font-normal leading-relaxed">
            Consultez les programmes et ressources organisés par niveau d&apos;études.
          </p>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          {levels.map((level) => (
            <motion.div 
              variants={item}
              key={level.id}
              className={`p-5 rounded-2xl bg-gradient-to-br ${level.color} backdrop-blur-xl border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between space-y-4`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-white/90 backdrop-blur-md text-ujlog-primary-dark rounded-xl flex items-center justify-center border border-white/60 shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-ujlog-ink-soft bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-ujlog-border">
                  {level.id}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-black text-ujlog-ink tracking-tight">
                  {level.name}
                </h3>
                <p className="text-[11px] text-ujlog-ink-soft font-medium mt-0.5">
                  {level.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
