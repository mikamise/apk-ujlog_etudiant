# Vérification des notifications et autorisations — UJLOG Étudiant UFR SSH

## Modifications de cette passe
- Ajout d'une bannière/toast dans l'espace étudiant qui interroge l'API authentifiée `/api/notifications` toutes les 25 secondes lorsque l'application est ouverte, et signale les nouvelles notifications sans rejouer tout l'historique au premier chargement.
- Lorsqu'une nouvelle notification arrive alors que l'onglet est masqué mais que l'application reste active, le composant peut afficher une notification système si l'utilisateur a accordé l'autorisation.
- Ajout dans `public/sw.js` des gestionnaires `push` et `notificationclick`, afin que le service worker sache afficher une notification push reçue et ouvrir sa destination.
- Ajout dans Paramètres d'une action explicite pour demander l'autorisation des notifications système et d'informations claires sur la caméra et le stockage.
- Ajout de `capture="user"` au sélecteur de photo de profil pour favoriser l'ouverture de la caméra frontale sur les appareils mobiles compatibles.
- Conservation des API et des notifications Supabase existantes ; aucune donnée fictive ni clé secrète n'a été ajoutée au client.

## Limites importantes avant mise en production
- Les notifications in-app et la permission navigateur sont câblées dans le client. **Les notifications système lorsque l'application est complètement fermée exigent un émetteur Web Push côté serveur**, des clés VAPID privées gardées uniquement côté serveur, une route sécurisée d'enregistrement des abonnements et une table Supabase avec RLS. Le dépôt inspecté ne contenait pas ce circuit complet ; les seuls gestionnaires `push` du service worker ne suffisent pas à envoyer des push.
- Les courriels ne déclenchent pas automatiquement une notification sur le téléphone. Il faut que le serveur envoie aussi un message Web Push à l'abonnement du terminal.
- Le navigateur ne propose pas de permission générale de « stockage » comme pour la caméra. Le stockage des téléchargements passe par Cache Storage/IndexedDB, géré par le navigateur. L'accès à la caméra est demandé au moment de choisir une photo ; `capture` reste dépendant du navigateur et du système.
- L'avatar actuel est mis en cache dans le profil local côté client ; une vraie synchronisation multi-appareils nécessite un stockage serveur sécurisé et une URL d'avatar dans le profil.

## Tests réalisés
- `node --check public/sw.js` : réussi.
- Vérifications statiques des points d'intégration : composants d'alerte dans le layout authentifié, action d'autorisation dans Paramètres et attribut caméra dans le profil présents.
- `npm ci --ignore-scripts --no-audit --no-fund` a dépassé le délai de l'environnement. Les dépendances ne sont donc pas installées et je n'ai pas pu exécuter ESLint ni le build Next.js. Ne pas considérer ce ZIP comme validé pour le Play Store sans exécuter `npm ci`, `npm run lint` et `npm run build`.
