'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

function AcceptInvitationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Lien d’invitation invalide : aucun jeton trouvé dans l’URL.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, firstName, lastName, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Impossible d’activer ce compte.');
        setIsLoading(false);
        return;
      }
      setSuccess(true);
      if (data.role) setActivatedRole(data.role);
    } catch {
      setError('Une erreur technique est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const [activatedRole, setActivatedRole] = useState<string | null>(null);

  if (success) {
    const isStaffAdmin = activatedRole === 'admin' || activatedRole === 'super_admin';
    const targetLogin = isStaffAdmin ? '/super-admin/login' : '/login';

    return (
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-soft-warm border border-ujlog-border p-7 text-center space-y-4">
        <div className="w-14 h-14 bg-green-gradient text-white rounded-2xl flex items-center justify-center shadow-glow-green mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="font-display text-lg font-bold text-ujlog-ink">Compte activé</h1>
        <p className="text-xs text-ujlog-ink-soft leading-relaxed">
          Votre compte officiel a été activé avec succès. Vous pouvez désormais vous connecter immédiatement avec vos identifiants.
        </p>
        <Link
          href={targetLogin}
          className="inline-flex w-full items-center justify-center bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-sm shadow-glow-orange hover:brightness-105 transition-all"
        >
          {isStaffAdmin ? 'Accéder à la console Super Admin' : 'Aller à la connexion'}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white w-full max-w-sm rounded-3xl shadow-soft-warm border border-ujlog-border p-7 space-y-4">
      <div className="text-center space-y-1.5">
        <span className="inline-flex items-center gap-1.5 bg-ujlog-primary-light text-ujlog-primary-dark text-xs font-bold px-3 py-1.5 rounded-xl mb-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Invitation officielle
        </span>
        <h1 className="font-display text-lg font-bold text-ujlog-ink">Activer mon invitation</h1>
        <p className="text-xs text-ujlog-ink-soft">Créez votre mot de passe pour finaliser votre compte.</p>
      </div>

      {!token && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Ce lien semble incomplet. Utilisez exactement le lien reçu par e-mail.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200/80 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            required
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
          />
          <input
            required
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
          />
        </div>
        <input
          required
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
        />
        <input
          required
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-ujlog-border bg-ujlog-cream text-xs font-medium text-ujlog-ink focus:bg-white focus:outline-none focus:ring-2 focus:ring-ujlog-primary/20 focus:border-ujlog-primary transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !token}
          className="w-full bg-terracotta-gradient text-white py-3 rounded-2xl font-bold text-sm shadow-glow-orange hover:brightness-105 transition-all disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Activer mon compte</span>}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-ujlog-border flex items-center justify-center p-2 mx-auto mb-5">
        <div className="relative w-full h-full">
          <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain rounded-lg" referrerPolicy="no-referrer" />
        </div>
      </div>
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-ujlog-primary" />}>
        <AcceptInvitationForm />
      </Suspense>
    </div>
  );
}
