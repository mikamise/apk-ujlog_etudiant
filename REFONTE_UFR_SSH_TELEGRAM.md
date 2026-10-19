# Livraison — UJLoG Étudiant / UFR SSH

Cette livraison est une première passe de refonte de l'interface de l'application existante, sans remplacement du système d'authentification ni des API.

## Modifications effectuées
- Identité interne harmonisée vers UFR SSH (les noms de matières et filières, dont Géographie et Histoire-Géographie, restent des disciplines et ne sont pas supprimés).
- Onboarding réécrit avec un parcours d'accueil plus direct, ressources, hors connexion et expérience mobile. Les étapes et la redirection existantes sont conservées.
- Icône SVG dédiée « SSH · UJLoG Étudiant » ajoutée et référencée sur les surfaces internes concernées.
- Styles globaux ajoutés pour une interface plus nette, inspirée de la clarté de Telegram : navigation, surfaces, champs, focus clavier et interactions tactiles.
- Suppression de l'identifiant étudiant fictif dans le profil.
- Les années d'archives ne sont plus préremplies par des années arbitraires ; elles doivent provenir des données disponibles.
- La vitrine publique (components/vitrine) n'a pas été modifiée.

## À valider avant production
- Exécuter `npm ci`, `npm run lint` et `npm run build` avec Node.js 20 ou supérieur.
- Vérifier les flux connexion, inscription, confirmation d'e-mail, mot de passe oublié et réinitialisation avec les variables Supabase réelles.
- Tester les téléchargements hors connexion après fermeture/réouverture, les notifications de publication, les invitations et les permissions de chaque rôle.
- Le mode sombre complet, les préférences détaillées et l'envoi de notifications push système nécessitent encore une vérification fonctionnelle dédiée ; ils ne doivent pas être considérés comme validés uniquement par les styles visuels.
