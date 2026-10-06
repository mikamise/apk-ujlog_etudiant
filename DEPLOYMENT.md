# 🚀 GUIDE DE DÉPLOIEMENT & PROTOCOLE ROLLBACK — UJLOG ÉTUDIANTS

Ce document définit les règles et procédures de déploiement sécurisé pour la plateforme universitaire **UJLOG Étudiants**.

---

## 🏢 1. STRATÉGIE D'ENVIRONNEMENTS SÉPARÉS

Le cycle de vie du code suit un flux unidirectionnel strict :

```text
DEVELOPMENT (Local / Cloud Run Dev)
       ↓ (Pull Request & CI Auto-Tests)
STAGING (Environnement de Qualification & Validation)
       ↓ (Validation des Tests & Approbation Manuelle)
PRODUCTION (Cloud Run Prod + Cluster PostgreSQL Haute Disponibilité)
```

- **Développement** : Utilise une base de données isolée et des credentials factices.
- **Staging** : Miroir exact de la production. Sert aux tests de non-régression, aux simulations de pannes DB et de restauration.
- **Production** : Accès restreint. Seules les images validées en Staging y sont déployées.

---

## 📋 2. PRÉREQUIS AVANT TOUT DÉPLOIEMENT EN PRODUCTION

1. **Pipeline CI Vert** :
   - ESLint (`npm run lint`) -> 0 erreur.
   - Typecheck TypeScript -> 0 erreur.
   - Tests de sécurité RBAC (`scripts/test-auth-rbac.ts`) -> 100% réussi.
   - Tests de résilience & charge (`scripts/test-phase8-resilience.ts`) -> 100% réussi.
   - Build Production (`npm run build`) -> Validé.
2. **Sauvegarde Préalable de la Base de Données** :
   - Exécuter un snapshot/dump automatique de la base PostgreSQL avant toute migration Schema Prisma.
3. **Audit des Migrations Prisma** :
   - Interdiction formelle d'exécuter `prisma db push` en production.
   - Seule la commande `npx prisma migrate deploy` est autorisée.
   - Toute migration contenant des instructions destructives (`DROP TABLE`, `ALTER COLUMN TYPE` non rétrocompatible) doit faire l'objet d'un plan de migration en deux étapes (Expand & Contract).

---

## 🛠️ 3. ÉTAPES DU DÉPLOIEMENT PAS À PAS

### Étape 1 : Validation Staging
```bash
# 1. Récupération de la branche validée
git checkout staging && git pull origin staging

# 2. Exécution des tests de préparation
npm ci
npm run lint
npx tsx scripts/test-phase8-resilience.ts
npm run build
```

### Étape 2 : Sauvegarde & Migration DB (Production)
```bash
# 1. Sauvegarde automatique PostgreSQL (voir BACKUP.md)
pg_dump $DATABASE_URL -F c -b -v -f ./backups/pre_deploy_$(date +%Y%m%d_%H%M%S).dump

# 2. Application des migrations Prisma
npx prisma migrate deploy
```

### Étape 3 : Déploiement Progressif (Zero-Downtime)
Sur Cloud Run / Container Registry :
1. Déployer la nouvelle révision avec 0% de trafic attribué.
2. Interroger `/api/health` sur l'URL directe du nouveau conteneur.
3. Si `/api/health` renvoie `200 healthy`, basculer progressivement le trafic :
   - 10% du trafic pendant 5 minutes.
   - 50% du trafic pendant 10 minutes.
   - 100% du trafic si les métriques d'erreur 500 restent à 0.

---

## 🔄 4. PROTOCOLE DE ROLLBACK (RETOUR EN ARRIÈRE EN MOINS DE 5 MIN)

En cas d'anomalie critique post-déploiement (hausse des 500, blocage des sessions, panne API) :

1. **Rollback Applicatif Immédiat (30 secondes)** :
   ```bash
   # Basculer le trafic à 100% sur la révision précédente dans Cloud Run
   gcloud run services update-traffic ujlog-etudiants-prod --to-revisions=PREVIOUS_STABLE_REVISION=100
   ```
2. **Rollback de la Base de Données (si migration non-destructive)** :
   Si la base a subi une migration destructive incompatible, restaurer le snapshot pré-déploiement :
   ```bash
   pg_restore -d $DATABASE_URL --clean --if-exists ./backups/pre_deploy_TIMESTAMP.dump
   ```
3. **Notification & Post-Mortem** :
   Ouvrir un ticket d'incident (voir `INCIDENT_RESPONSE.md`).

---

## 📊 5. MONITORING POST-DÉPLOIEMENT

Après chaque déploiement, surveiller les métriques durant les fenêtres clés :
- **T + 5 minutes** : Vérification des logs d'erreurs 500 et de la latence `/api/health`.
- **T + 15 minutes** : Contrôle du taux d'échec des connexions `/api/auth/login`.
- **T + 60 minutes** : Validation des statistiques de taux de rafraîchissement des sessions PWA.
