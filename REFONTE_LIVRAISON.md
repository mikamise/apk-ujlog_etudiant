# État de livraison — UJLoG Étudiant / UFR SSH

## Modifications de cette passe
- Ajout d'une page Paramètres accessible depuis la navigation mobile et la barre latérale de bureau.
- Choix du thème clair, sombre ou système, enregistré localement et appliqué sur les pages via un bootstrap global.
- Option de réduction des animations, avec respect de `prefers-reduced-motion`.
- Préférence d'interface compacte enregistrée localement (le réglage est prêt, mais ne modifie pas encore la densité de chaque écran).
- Couche CSS d'harmonisation : états de focus visibles, zones tactiles, champs cohérents, surfaces et premières adaptations de couleurs en thème sombre.
- Métadonnées et identité UFR SSH conservées sans remplacer les noms des disciplines ni des filières.
- Systèmes d'authentification, API, comptes et données existants conservés.

## Ce qui n'est PAS certifié
Cette archive n'est pas certifiée comme refonte intégrale terminée ni comme prête pour la production. Les dépendances ne sont pas installées dans cet environnement ; `npm ci`, `npm run lint` et `npm run build` n'ont donc pas été exécutés. Le thème sombre peut nécessiter des ajustements écran par écran car plusieurs composants utilisent des couleurs utilitaires explicites. La préférence compacte est enregistrée mais pas encore appliquée partout. Les flux réels d'authentification, notifications, invitations et téléchargements doivent être testés avec les variables de production et des comptes de test.

## Vérifications à effectuer avant déploiement
1. Installer avec Node.js 20+ : `npm ci`.
2. Exécuter `npm run lint` puis `npm run build`.
3. Tester le thème clair/sombre/système sur les pages d'accueil connecté, cours, profil, notifications, téléchargement, administration, connexion, inscription et réinitialisation.
4. Tester les parcours d'authentification avec Supabase réel, sans modifier ni supprimer les comptes existants.
5. Vérifier les permissions API par rôle, l'envoi et la réception des notifications, les invitations sécurisées et les fichiers téléchargés hors connexion après fermeture/réouverture.
