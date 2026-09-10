'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  ShieldCheck,
  Check,
  XCircle,
  CheckCircle2,
  X,
  Search,
  Sparkles,
  Send,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RoleInvitation {
  id: string;
  email: string;
  role: 'admin' | 'super_admin' | 'delegate';
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function SuperAdminsView() {
  const [invitations, setInvitations] = useState<RoleInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'super_admin'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/invitations');
      const data = await res.json();
      setInvitations(data.success && Array.isArray(data.invitations) ? data.invitations : []);
    } catch {
      // Aucune donnée fictive : liste vide en cas d'échec réseau.
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInvitations();
  }, [loadInvitations]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole }),
      });
      const data = await res.json();

      if (!data.success) {
        setSubmitError(data.error || 'Impossible d’envoyer l’invitation.');
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(data.message || `Invitation envoyée à ${newEmail}.`);
      setNewEmail('');
      loadInvitations();
    } catch {
      setSubmitError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInvitations = invitations.filter((inv) =>
    inv.email.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel: Record<RoleInvitation['status'], { label: string; className: string; icon: React.ReactNode }> = {
    pending: { label: 'En attente', className: 'bg-orange-100 text-ujlog-primary-dark border border-orange-200', icon: <Sparkles className="w-3 h-3" /> },
    accepted: { label: 'Activée', className: 'bg-green-100 text-green-800 border border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    expired: { label: 'Expirée', className: 'bg-stone-100 text-ujlog-ink-soft border border-ujlog-border', icon: <XCircle className="w-3 h-3" /> },
    revoked: { label: 'Révoquée', className: 'bg-rose-100 text-rose-800 border border-rose-200', icon: <XCircle className="w-3 h-3" /> },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-green-700 uppercase tracking-wider mb-1">
            <KeyRound className="w-4 h-4 text-green-600" />
            <span>Gestion des Droits d&apos;Accès Globaux</span>
          </div>
          <h1 className="font-display text-xl font-bold text-ujlog-ink tracking-tight">
            Administrateurs &amp; invitations
          </h1>
          <p className="text-xs text-ujlog-ink-soft max-w-xl">
            Invitez un Administrateur ou Super Administrateur par e-mail. Aucun compte n&apos;est créé automatiquement : la personne invitée active elle-même son accès via un lien personnel, valable 24 heures.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            setSubmitError(null);
            setSubmitSuccess(null);
            setNewEmail('');
          }}
          className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Inviter un administrateur</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="p-4 bg-green-50 border-l-4 border-green-600 rounded-r-xl border-y border-r border-green-200/80 space-y-1.5 text-xs text-green-950">
        <div className="flex items-center gap-2 font-extrabold uppercase text-[11px] text-green-900">
          <Sparkles className="w-4 h-4 text-green-600" />
          <span>Comment ça marche</span>
        </div>
        <p className="leading-relaxed font-medium">
          Saisissez l&apos;adresse e-mail et le rôle souhaité. Un lien d&apos;activation unique, à usage unique, est envoyé automatiquement par e-mail. Vous ne verrez jamais ce lien en clair ici — c&apos;est voulu, pour la sécurité du compte.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-ujlog-ink-soft/50 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par e-mail"
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-ujlog-border rounded-xl text-xs text-ujlog-ink focus:outline-none focus:ring-2 focus:ring-green-500/25"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-ujlog-border shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-ujlog-ink-soft flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Chargement des invitations…</span>
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="p-8 text-center text-xs text-ujlog-ink-soft">
            Aucune invitation pour le moment.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-ujlog-cream text-ujlog-ink-soft uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Expire le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredInvitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-ujlog-cream/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-ujlog-ink">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-green-100 text-green-800 flex items-center justify-center font-bold text-xs border border-green-200">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span>{inv.email}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-ujlog-ink-soft uppercase text-[10px] font-bold">{inv.role}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusLabel[inv.status].className}`}>
                      {statusLabel[inv.status].icon}
                      <span>{statusLabel[inv.status].label}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-ujlog-ink-soft">
                    {new Date(inv.expires_at).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Add Invitation */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-ujlog-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-soft-warm"
            >
              <div className="flex items-center justify-between border-b border-ujlog-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-xl text-green-800">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase text-ujlog-ink">Nouvelle invitation</h3>
                    <p className="text-[10px] text-ujlog-ink-soft">Envoi d&apos;un lien d&apos;activation sécurisé</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-1 text-ujlog-ink-soft/60 hover:text-ujlog-ink-soft cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-orange-700 mx-auto" />
                  <p className="text-xs font-bold text-ujlog-primary-dark">{submitSuccess}</p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-full py-2 bg-white hover:bg-ujlog-cream text-ujlog-ink border border-ujlog-border font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvitation} className="space-y-3">
                  {submitError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold">
                      {submitError}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-ujlog-ink-soft uppercase">
                      E-mail <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Entrez l'adresse e-mail"
                      className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-ujlog-ink-soft uppercase">Rôle</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as 'admin' | 'super_admin')}
                      className="w-full px-3 py-2 bg-ujlog-cream border border-ujlog-border rounded-xl text-xs text-ujlog-ink font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 cursor-pointer"
                    >
                      <option value="admin">Administrateur</option>
                      <option value="super_admin">Super Administrateur</option>
                    </select>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-2.5 bg-ujlog-cream text-ujlog-ink-soft font-bold text-xs rounded-xl hover:bg-ujlog-border cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Envoyer l&apos;invitation</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
