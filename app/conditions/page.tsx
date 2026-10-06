import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: "Conditions d'utilisation — UJLOG Étudiant",
};

export default function ConditionsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-ujlog-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-3">
          <Link href="/register" className="flex items-center gap-2 text-ujlog-ink-soft hover:text-ujlog-ink transition-colors">
            <div className="w-8 h-8 rounded-xl bg-ujlog-cream border border-ujlog-border flex items-center justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Retour</span>
          </Link>
          <div className="w-8 h-8 rounded-lg bg-white border border-ujlog-border overflow-hidden ml-auto">
            <div className="relative w-full h-full">
              <Image src="/logo-geographie.jpg" alt="Logo Département de Géographie" fill className="object-contain" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-bold text-ujlog-ink mb-2">Conditions d&apos;utilisation</h1>
        <p className="text-sm text-ujlog-ink-soft mb-10">Dernière mise à jour : 2026. Applicable à l&apos;application et au site UJLOG Étudiant.</p>

        <div className="space-y-8 text-sm text-ujlog-ink leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-bold mb-2">1. Objet de la plateforme</h2>
            <p className="text-ujlog-ink-soft">
              UJLOG Étudiant est une plateforme indépendante, réalisée par et pour les étudiants du Département de Géographie
              de l&apos;Université Jean Lorougnon Guédé (Daloa). Elle donne accès aux cours, travaux dirigés, sujets d&apos;examens
              et résultats classés par niveau, semestre et filière. Elle n&apos;est pas un service officiel de l&apos;université.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold mb-2">2. Création de compte</h2>
            <p className="text-ujlog-ink-soft">
              L&apos;inscription est réservée aux étudiants du département. Vous vous engagez à fournir une identité, un niveau
              et une filière exacts. Toute inscription frauduleuse peut entraîner la suspension du compte.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold mb-2">3. Utilisation des documents</h2>
            <p className="text-ujlog-ink-soft">
              Les cours, TD et sujets mis à disposition sont destinés à un usage personnel et pédagogique. Leur redistribution
              en dehors de la plateforme, à des fins commerciales ou sans l&apos;accord des enseignants concernés, n&apos;est pas
              autorisée.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold mb-2">4. Espace délégué</h2>
            <p className="text-ujlog-ink-soft">
              Les délégués de section disposent d&apos;un accès permettant de publier et mettre à jour les ressources de leur
              niveau. Ils sont responsables de l&apos;exactitude des documents qu&apos;ils publient.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold mb-2">5. Données personnelles</h2>
            <p className="text-ujlog-ink-soft">
              Les informations fournies à l&apos;inscription (identité, niveau, filière, e-mail) servent uniquement à
              l&apos;organisation de l&apos;accès aux cours. Elles ne sont ni vendues ni partagées avec des tiers à des fins
              commerciales.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold mb-2">6. Modification des conditions</h2>
            <p className="text-ujlog-ink-soft">
              Ces conditions peuvent évoluer avec la plateforme. La version en vigueur est toujours celle publiée sur cette page.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold mb-2">7. Contact</h2>
            <p className="text-ujlog-ink-soft">
              Pour toute question relative à ces conditions, contactez l&apos;équipe via le formulaire de contact de la page
              d&apos;accueil.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
