# UJLoG Étudiant — chantier de refonte UFR SSH

## Changements intégrés dans cette archive

- Identité d'application UFR SSH dans les métadonnées et l'icône dédiée `/icon-ssh.svg`, sans remplacer les noms des disciplines, filières ou cours existants.
- Parcours d'onboarding existant conservé avec les textes adaptés à l'UFR SSH.
- Interface générale harmonisée autour d'une navigation claire inspirée des applications de messagerie : surfaces, états actifs, contrôles tactiles, focus clavier et prise en charge du thème clair/sombre déjà présente dans les styles.
- Tableau de bord étudiant : retrait de la limite d'affichage arbitraire de huit cours dans le résultat filtré. L'API garde une pagination contrôlée côté serveur et les protections existantes.
- Profil : aucun identifiant étudiant n'est inventé si le compte n'en fournit pas.
- Archives : aucune année ni aucun cours fictif n'est injecté dans les listes étudiantes lorsque l'API échoue.
- Les routes d'API, la validation côté serveur, les rôles, Supabase et la protection des secrets côté serveur sont conservés. Aucun secret d'environnement n'a été ajouté au code client.

## Limites et tests requis avant production

Cette archive est une refonte incrémentale du projet existant, pas une réécriture totale de chaque écran. La compilation, les tests de navigateur, les tests d'intégration Supabase et les essais sur appareil doivent être exécutés dans un environnement disposant des dépendances et variables d'environnement du projet.

### Vérifications conseillées

1. `npm ci` puis `npm run lint` et `npm run build` avec Node.js 20+.
2. Tester connexion, inscription, confirmation par e-mail, récupération et changement de mot de passe.
3. Tester les rôles étudiant, délégué, admin et super-admin sur les pages ET sur les API (accès direct interdit sans permission).
4. Publier un cours de test ciblé sur un niveau ; vérifier la notification, puis télécharger le document, fermer l'application, passer hors ligne et l'ouvrir depuis les téléchargements.
5. Vérifier que supprimer une copie hors ligne ne supprime pas le document distant.
6. Activer les données de démonstration sur l'aperçu super-admin et confirmer qu'aucune donnée n'est modifiée côté serveur.
7. Contrôler le parcours onboarding, le thème clair/sombre/système, l'affichage mobile et la vitrine publique.

Ne pas déployer en production avant que ces tests soient passés dans l'environnement du projet.
