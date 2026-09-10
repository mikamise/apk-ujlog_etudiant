'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, X, CheckCircle2, Headphones, Sparkles } from 'lucide-react';
import { useUser } from '@/hooks/use-user';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { user } = useUser();
  const [lastName, setLastName] = useState(user.lastName || '');
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [email, setEmail] = useState(user.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName || !firstName || !email || !message) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubject('');
    setMessage('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white border border-ujlog-border rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ujlog-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100/80 rounded-2xl flex items-center justify-center text-ujlog-primary-dark border border-orange-200">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-ujlog-ink tracking-tight">
                    Contacter le Service Client
                  </h3>
                  <p className="text-xs text-ujlog-ink-soft font-medium">
                    Assistance académique & technique UJLOG
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft hover:bg-ujlog-cream rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-700 mx-auto border border-orange-200 shadow-sm animate-in zoom-in-75">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-ujlog-ink">Message envoyé avec succès !</h4>
                  <p className="text-xs text-ujlog-ink-soft max-w-sm mx-auto font-medium leading-relaxed">
                    Votre préoccupation a été transmise directement au service pédagogique (<span className="font-bold text-ujlog-primary-dark">contact@ujlog.ci</span>). Vous recevrez une réponse sur votre boîte mail dans les plus brefs délais.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-orange-800 hover:bg-orange-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">
                      Nom <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Votre nom"
                      className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">
                      Prénom <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Votre prénom"
                      className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">
                    E-mail <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Entrez votre e-mail"
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">
                    Sujet / Objet
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="ex: Problème d'accès à un cours, question sur le profil..."
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-ujlog-ink-soft uppercase tracking-wider">
                    Votre préoccupation <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Détaillez clairement votre demande ou votre problème..."
                    className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-700 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2.5 border border-ujlog-border bg-white hover:bg-ujlog-cream text-ujlog-ink-soft font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 bg-orange-800 hover:bg-orange-900 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer la préoccupation'}</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
