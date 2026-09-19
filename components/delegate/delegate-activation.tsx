'use client';

import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface DelegateActivationProps {
  onSwitchToLogin: () => void;
}

/**
 * L'ancien système "code d'activation saisi manuellement" a été supprimé
 * (faille de sécurité — voir audit). Un statut Délégué s'active désormais
 * exclusivement via un lien d'invitation personnel envoyé par e-mail par
 * un administrateur (/api/admin/invitations -> /invitation/accepter).
 * Cet écran explique le nouveau fonctionnement plutôt que de proposer un
 * formulaire de code qui ne correspond plus à l'architecture réelle.
 */
export function DelegateActivation({ onSwitchToLogin }: DelegateActivationProps) {
  return (
    <div className="max-w-xl mx-auto w-full py-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-ujlog-border/90 shadow-sm space-y-6"
      >
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="inline-flex items-center gap-1.5 text-ujlog-ink-soft hover:text-ujlog-primary-dark text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour à la connexion Délégué</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-ujlog-secondary-100 text-ujlog-secondary flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-ujlog-ink tracking-tight">
              Devenir Délégué
            </h1>
            <p className="text-xs text-ujlog-ink-soft">
              L&apos;activation se fait désormais par invitation e-mail, pas par code.
            </p>
          </div>
        </div>

        <div className="bg-ujlog-cream rounded-2xl p-5 border border-ujlog-border space-y-3">
          <div className="flex items-start gap-2.5">
            <Mail className="w-4 h-4 text-ujlog-primary-dark shrink-0 mt-0.5" />
            <p className="text-xs text-ujlog-ink-soft leading-relaxed">
              Un administrateur du département doit d&apos;abord vous envoyer une invitation
              officielle à votre adresse e-mail, avec le niveau et la filière concernés.
              Vous recevrez un lien personnel, valable 24 heures et à usage unique, qui vous
              permettra de créer directement votre compte Délégué.
            </p>
          </div>
          <p className="text-xs text-ujlog-ink-soft leading-relaxed">
            Vous pensez devoir être délégué mais n&apos;avez reçu aucune invitation ?
            Rapprochez-vous de l&apos;administration du Département de Géographie.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
