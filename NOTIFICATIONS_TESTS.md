# Vérifications notifications

## Vérifications statiques effectuées
- `node --check public/sw.js` : réussi.
- Clés VAPID privées : utilisées uniquement dans les handlers/traitements serveur et documentées comme variables serveur sans préfixe `NEXT_PUBLIC_`.
- Route d’abonnement : exige une session authentifiée, valide l’endpoint HTTPS et les clés, et écrit via `service_role` côté serveur.
- Table `push_subscriptions` : RLS activée et aucun accès direct accordé à `anon` ou `authenticated`.
- Les abonnements expirés (HTTP 404/410) sont supprimés au prochain envoi.

## À exécuter avant mise en production
1. Appliquer la migration `0011_web_push_subscriptions.sql` dans Supabase.
2. Installer les dépendances pour prendre en compte `web-push` et `@types/web-push`.
3. Configurer les trois variables VAPID côté serveur.
4. Exécuter `npm run lint` et `npm run build` après installation des dépendances.
5. Tester sur téléphone Android et PWA installée : autorisation, abonnement, réception en arrière-plan, application fermée, refus/révocation d’autorisation, désabonnement et retour en ligne.

Ces tests réels ne peuvent pas être déclarés réussis tant que la migration et les secrets ne sont pas configurés sur l’environnement de déploiement.
