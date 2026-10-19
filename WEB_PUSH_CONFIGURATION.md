# Configuration des notifications système (Web Push)

1. Exécuter la migration `supabase/migrations/0011_web_push_subscriptions.sql` sur le projet Supabase existant. Cette migration ajoute uniquement la table des abonnements ; elle ne modifie ni comptes ni cours.
2. Installer les dépendances avec `npm install` ou `bun install` afin d'ajouter `web-push`.
3. Générer une paire de clés sur une machine de confiance : `npx web-push generate-vapid-keys`.
4. Ajouter `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT` dans les variables d’environnement du serveur (Vercel), jamais dans une variable `NEXT_PUBLIC_*`. Ne jamais publier la clé privée.
5. Déployer l’application en HTTPS. Chaque utilisateur doit ouvrir Paramètres et autoriser les notifications sur chaque appareil.
6. Tester un nouvel envoi de notification de cours sur Android Chrome/PWA, application au premier plan, en arrière-plan et fermée.

Les notifications push ne peuvent pas être livrées instantanément à un appareil hors ligne ; le service push du navigateur les livre lorsqu’il redevient joignable, selon les limites de l’OS et du navigateur. Les notifications internes restent stockées dans Supabase et apparaissent au retour en ligne. Les e-mails seuls ne créent pas une notification système.
