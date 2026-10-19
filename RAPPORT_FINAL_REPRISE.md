# UJLOG Étudiant — remise de la refonte (19 octobre 2026)

## Changements présents dans cette archive
- Harmonisation visuelle autour d'Inter et de l'orange UJLOG, surfaces plus sobres, focus clavier et réduction des animations selon les préférences système.
- Navigation générale responsive et point d'entrée commun `/dashboard` après connexion, avec accès aux espaces spécialisés soumis aux rôles existants.
- Dashboard avec recherche, filtre par niveau, cours publiés et états de chargement/erreur/vide ; page de détail de cours et accès aux ressources.
- Pages d'authentification, profil, sauvegardes/téléchargements, archives et notifications intégrées à la refonte.
- Téléchargements de ressources conservés dans le cache local dédié et métadonnées IndexedDB ; le Service Worker ne met pas en cache les réponses API ni les pages privées.
- Routes de notifications et d'abonnements Web Push présentes ; migration SQL additive pour les abonnements.
- Fichiers de configuration existants et noms des variables d'environnement conservés dans le code. Aucun fichier `.env` secret n'est inclus dans l'archive.

## Contrôles effectués ici
- `node --check public/sw.js` : réussi.
- Scan statique ciblé : aucune occurrence des identifiants fictifs ciblés `UJLOG-2026-0842`, `John Doe`, `Jane Doe` ou des adresses de démonstration dans `app`, `components` et `lib`.
- Présence confirmée des routes Web Push et de la migration `0011_web_push_subscriptions.sql`.
- Inventaire statique antérieur du projet : 23 pages applicatives et 69 références de routes locales analysées ; aucune route inconnue n'avait été détectée.

## Limites à ne pas masquer
- `npm run build` n'a pas pu démarrer : le binaire `next` est absent de l'installation locale (`sh: 1: next: not found`). Le build de production et ESLint ne sont donc **pas validés** dans cet environnement.
- Le parcours navigateur réel mobile/ordinateur, les appels Supabase de production et la livraison Web Push ne sont pas testés ici.
- Pour activer les notifications système, il faut encore exécuter la migration additive dans le projet Supabase existant et configurer `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` et `VAPID_SUBJECT` côté serveur. Les clés privées ne doivent jamais être publiques.
- La refonte de la vitrine est volontairement limitée : la page publique existante doit rester inchangée selon la demande. Les sections marquées non terminées dans `REFONTE_PROGRESS.md` restent à vérifier/achever ; cette remise ne doit pas être décrite comme une recette de production réussie.

## Avant le push
1. Décompresser cette archive dans une copie de travail propre et vérifier le diff par rapport au dépôt GitHub actuel.
2. Garder le même projet Supabase et les mêmes noms de variables d'environnement. Un dépôt GitHub neuf ne transporte pas les réglages Vercel d'un ancien projet ; rattacher le dépôt au projet Vercel existant si l'on veut conserver ses variables et domaines.
3. Faire une sauvegarde de la base, puis appliquer uniquement la migration additive Web Push si cette fonctionnalité est souhaitée.
4. Installer les dépendances avec Node.js 20+ (`npm ci` si le lockfile est cohérent), puis exécuter `npm run lint` et `npm run build` avant déploiement.
5. Tester connexion/inscription/réinitialisation, droits de chaque rôle, cours, téléchargements hors ligne, notifications et installation PWA sur Android et ordinateur.
