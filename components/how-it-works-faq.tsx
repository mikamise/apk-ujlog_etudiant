'use client';

import { useState } from 'react';
import { LogIn, UserPlus, Rocket, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

const steps = [
  {
    icon: LogIn,
    title: 'Accéder à la plateforme',
    desc: "Connectez-vous depuis votre navigateur, sur téléphone ou ordinateur.",
  },
  {
    icon: UserPlus,
    title: 'Créer un compte ou se connecter',
    desc: "L'inscription est libre et immédiate pour tout étudiant du Département de Géographie.",
  },
  {
    icon: Rocket,
    title: 'Commencer',
    desc: 'Accédez à vos cours, suivez votre progression et restez informé des nouvelles publications.',
  },
];

const faqs = [
  {
    q: "L'application est-elle gratuite ?",
    a: "Oui, l'application UJLOG Étudiants est entièrement gratuite pour tous les étudiants du Département de Géographie.",
  },
  {
    q: 'Qui peut créer un compte ?',
    a: "N'importe quel étudiant peut créer son compte librement. Les comptes délégué, administrateur et super administrateur sont créés uniquement sur invitation.",
  },
  {
    q: 'Puis-je utiliser l\'application sans connexion internet ?',
    a: 'Les cours que vous avez explicitement téléchargés restent consultables hors ligne. Une connexion est nécessaire pour se connecter et découvrir de nouveaux cours.',
  },
  {
    q: 'Comment passer au niveau supérieur ?',
    a: "Depuis votre Profil, un bouton « Passer au niveau supérieur » met à jour votre niveau et vous donne accès aux cours correspondants.",
  },
];

export function HowItWorksFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="comment-ca-marche" className="py-16 sm:py-20 bg-ujlog-cream border-b border-ujlog-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Comment ça marche */}
        <div>
          <div className="text-center mb-10 space-y-2">
            <p className="text-[11px] font-bold text-ujlog-primary uppercase tracking-widest">Simple et rapide</p>
            <h2 className="text-2xl sm:text-3xl font-black text-ujlog-ink tracking-tight">Comment ça marche ?</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-white border border-ujlog-border rounded-3xl p-6 text-center space-y-3 shadow-soft-warm relative"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-ujlog-primary-dark text-white text-[11px] font-black rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="w-12 h-12 mx-auto bg-ujlog-primary-light text-ujlog-primary-dark rounded-2xl flex items-center justify-center">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-ujlog-ink">{step.title}</h3>
                <p className="text-xs text-ujlog-ink-soft leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div id="faq">
          <div className="text-center mb-8 space-y-2">
            <p className="text-[11px] font-bold text-ujlog-secondary uppercase tracking-widest">Questions fréquentes</p>
            <h2 className="text-2xl sm:text-3xl font-black text-ujlog-ink tracking-tight">FAQ</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-2.5">
            {faqs.map((item, i) => (
              <div key={item.q} className="bg-white border border-ujlog-border rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer"
                >
                  <span className="text-xs font-bold text-ujlog-ink">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-ujlog-ink-soft shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3.5 text-xs text-ujlog-ink-soft leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
