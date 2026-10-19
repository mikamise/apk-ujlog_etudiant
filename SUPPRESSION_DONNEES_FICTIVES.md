# Suppression des données fictives

- Le tableau de bord super-administrateur affiche exclusivement les statistiques (`stats`) et journaux (`recentLogs`) fournis par les sources réelles de l'application.
- Les chiffres, utilisateurs, cours, journaux et adresses de démonstration ont été retirés de l'interface super-administrateur.
- Aucun compte, cours, document, invitation ou enregistrement Supabase n'a été supprimé ou modifié par cette correction.
- Les données métier restent gérées par les routes serveur et la base de données configurée. Les valeurs vides affichées lorsque l'API ne fournit pas de données ne sont pas remplacées par des exemples inventés.
- Cette correction ne remplace pas une sauvegarde de la base de données. Avant tout déploiement, conserver les variables d'environnement de production côté serveur et ne jamais publier de clés secrètes dans le dépôt ou le navigateur.

## Vérification

Recherche effectuée dans les fichiers TypeScript/TSX pour les marqueurs de démonstration du tableau de bord (`demo.admin`, `demo.delegate`, `demo-1`, `demoStats`, `demoLogs` et le bouton de données de démonstration) : aucune occurrence restante dans le code d'interface.
