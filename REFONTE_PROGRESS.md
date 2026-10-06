# UJLOG Étudiant — Refondation UX/UI

## Lot 01 — socle navigation, session et typographie

Date : 2026-10-06

### Modifications appliquées

- Inter devient la famille typographique principale de l'application, y compris les titres.
- Suppression de la dépendance visuelle aux titres Times New Roman / Space Grotesk.
- L'entrée `/` vérifie désormais la session avant d'afficher la vitrine.
- Toute session authentifiée est redirigée vers `/dashboard`, quel que soit le rôle. Les espaces délégué et administration sont des destinations secondaires accessibles uniquement si le rôle l'autorise.
- L'onboarding PWA reste réservé au premier lancement de l'application installée lorsqu'aucune session valide n'existe.
- `/login` vérifie une session existante avant d'afficher inutilement le formulaire.
- `/super-admin/login` vérifie également une session administrateur existante.
- L'espace administration distingue désormais clairement :
  - « Retour à l’espace étudiant » : conserve la session et revient au dashboard étudiant.
  - « Se déconnecter » : ferme réellement la session.

### Validation

- Analyse statique TypeScript lancée.
- Validation complète `npm ci` / `next build` non disponible dans cet environnement : installation des dépendances interrompue par délai réseau/environnement.
- Le ZIP original n'est pas modifié.

## Lot 02 — vitrine et contrôle d'accès du menu

- L'entrée `/` envoie désormais tous les utilisateurs authentifiés vers `/dashboard`, sans distinction de rôle.
- Les liens d'accès délégué / administration du menu sont masqués lorsqu'ils ne sont pas autorisés.
- L'accès à l'administration depuis le menu pointe vers `/super-admin`, avec la garde d'autorisation existante.
- La connexion dédiée `/super-admin/login` revient d'abord au dashboard général après authentification.
- La vitrine reçoit une nouvelle direction visuelle : Inter, surfaces plus sobres, hiérarchie éditoriale, orange UJLOG maîtrisé, navigation plus compacte et responsive.
- Les coordonnées de contact de la vitrine sont alignées sur l'adresse de contact configurée du projet.

### Validation du lot 02

- Vérification statique des fichiers modifiés effectuée.
- Build complet non déclaré : les dépendances du projet ne sont pas installées dans l'environnement d'exécution.

## Prochains lots

1. Nouveau design system UJLOG.
2. Refonte complète de la vitrine/entrée.
3. Shell dashboard + navigation mobile/desktop.
4. Dashboard étudiant et parcours niveaux → matières → cours.
5. Profil, favoris, téléchargements, archives, notifications.
6. Délégué.
7. Super-admin.
8. États loading/empty/error/offline et accessibilité.
9. Audit de toutes les routes et redirections.
10. PWA / installation / cache / reprise de session.
11. QA finale et build de production.

## Lot 02 — Socle visuel / vitrine
- [x] Unification typographique de la vitrine sur Inter.
- [x] Nouveau système de couleurs, surfaces, bordures, rayons et ombres.
- [x] Header/navigation premium et responsive.
- [x] Hero sans dépendance visuelle à une photo externe : fond clair, formes discrètes et hiérarchie éditoriale.
- [x] Refonte visuelle des cartes, timeline, fonctionnalités, téléchargement, formulaires et footer.
- [x] États de focus et réduction des mouvements respectés.
- [ ] Refonte structurelle du JSX de la vitrine et suppression du legacy JS DOM.
- [ ] Audit complet des liens et formulaires de la vitrine.

## Lot 03 — Dashboard shell / langage visuel
- [x] Suppression des gradients dans le dashboard principal.
- [x] Hiérarchie des niveaux simplifiée avec accents cohérents.
- [x] Hero dashboard passé sur une surface orange de marque sans effets de flou.
- [x] Navigation générale alignée sur le nouveau système de surfaces et d'actions.
- [ ] Refonte structurelle complète du dashboard (contenu, recherche, matières, semestre, raccourcis).
- [ ] Refonte détaillée de la navigation mobile et desktop.
## Lot en cours — Dashboard général
- [x] Le dashboard général devient le point d'entrée commun à tous les rôles.
- [x] Affichage réel des cours publiés sur le dashboard.
- [x] Recherche globale des ressources depuis le dashboard.
- [x] Filtre rapide par niveau.
- [x] États loading / erreur / vide.
- [x] Ajout de la route `/dashboard/cours/[id]` pour supprimer les liens de cours orphelins.
- [x] Détail d'un cours avec ressources et sauvegarde.
- [x] Téléchargement du cours via la route GET sécurisée existante.
- [ ] QA visuelle et fonctionnelle complète à effectuer en fin de refonte.



## Lot 04 — Authentification
- [x] Toute connexion réussie arrive sur `/dashboard`, indépendamment du rôle.
- [x] Une session déjà active visitant `/login` revient directement au dashboard.
- [x] La politique « Se souvenir de moi » est remplacée par une indication honnête de session persistante ; la persistance réelle reste gérée par Supabase SSR.
- [x] Les parcours administrateur utilisent également le dashboard général comme point d'entrée après authentification.
- [x] Les écrans d'authentification commencent à utiliser le langage visuel UJLOG unifié, sans gradients artificiels.
- [ ] Audit fonctionnel final de confirmation, inscription, invitation, mot de passe oublié/réinitialisation et erreurs.
- [ ] Validation production avec les dépendances installées.


## Lot espace général — 2026-10-06
- Dashboard traité comme point d'entrée commun à tous les rôles.
- Navigation générale harmonisée : Cours, Sauvegardes, Notifications, Profil, Téléchargements, Archives.
- Accès Délégué/Administration conditionné aux autorisations.
- Libellés et états de l'espace général rendus neutres vis-à-vis du rôle.
- Retour depuis les espaces spécialisés conserve la session générale.

## Lot 05 — profondeur technique / QA intermédiaire — 2026-10-06
- [x] Service Worker : aucune page HTML personnalisée privée n'est persistée dans le cache de pages.
- [x] Cache des API : aucune réponse API n'est conservée par le Service Worker ; les réponses JSON standardisées sont `no-store`.
- [x] Hors-ligne : les fichiers pédagogiques explicitement téléchargés restent dans le cache utilisateur dédié.
- [x] Accessibilité globale : support `prefers-reduced-motion`, focus clavier visible et safe-area utilities ajoutés au socle.
- [x] Audit statique des références de routes : 69 références locales analysées, aucune route inconnue détectée.
- [x] Audit statique des pages : 23 pages applicatives inventoriées, dont offline, erreur, détail cours et espaces spécialisés.
- [x] Sélection des cours allégée : recherche persistante, filtres avancés repliables, statistiques secondaires supprimées de l'en-tête.
- [x] Vérification syntaxique du Service Worker réussie.
- [ ] Installation propre des dépendances et `next build` de production : à valider dans un environnement où l'installation npm peut aboutir.
- [ ] QA navigateur réelle mobile/desktop et tests des flux Supabase avec variables d'environnement de production.
