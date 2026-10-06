# 🚑 PLAN DE RESTAURATION & DISASTER RECOVERY — UJLOG ÉTUDIANTS

Ce document définit la procédure opérationnelle de restauration de données en cas de sinistre, corruption de données ou perte de la base de données PostgreSQL.

---

## 🔄 1. CYCLE DE VIE DE RESTAURATION

```text
DÉTECTION D'ANOMALIE
        ↓
QUALIFICATION DU SINISTRE (Correction applicative VS Restauration DB)
        ↓
TEST DE RESTAURATION EN ENVRIONNEMENT STAGING (Mandatoire)
        ↓
VALIDATION DE L'INTÉGRITÉ DES DONNÉES EN STAGING
        ↓
RESTAURATION CONTRÔLÉE EN PRODUCTION
        ↓
VÉRIFICATION DES ACCÈS & REPRISE DE SERVICE
```

---

## 🛠️ 2. ÉTAPES DÉTAILLÉES DE RESTAURATION

### Étape 1 : Téléchargement et Déchiffrement du Backup
```bash
# 1. Récupération de la dernière sauvegarde chiffrée
gsutil cp gs://ujlog-db-backups-encrypted/daily/ujlog_prod_LATEST.dump.gpg ./

# 2. Déchiffrement de l'archive
gpg --batch --yes --passphrase-file /etc/ujlog/backup_gpg.key --decrypt ujlog_prod_LATEST.dump.gpg > ujlog_restore.dump
```

### Étape 2 : Restauration en Environnement Staging (Test à Blanc)
```bash
# 1. Réinitialisation de la base de staging
npx prisma db execute --stdin --url $STAGING_DATABASE_URL <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
EOF

# 2. Injection du dump restauré
pg_restore -d $STAGING_DATABASE_URL --clean --if-exists ujlog_restore.dump

# 3. Exécution des vérifications de migration Prisma
npx prisma migrate status --url $STAGING_DATABASE_URL
```

### Étape 3 : Exécution du Script de Test d'Intégrité (Staging)
Exécuter la suite de tests automatisée de récupération :
```bash
npx tsx scripts/test-disaster-recovery.ts
```
Ce script vérifie :
- Présence et intégrité des utilisateurs (Étudiants, Délégués, Admins).
- Cohérence des cours, des rôles et des niveaux académiques.
- Intégrité des sessions actives et des journaux d'audit de sécurité.

### Étape 4 : Bascule en Production (Si validation Staging à 100%)
1. Basculer l'application en mode maintenance temporaire via l'en-tête de réponse.
2. Effectuer la restauration sur la base de données de production :
   ```bash
   pg_restore -d $PRODUCTION_DATABASE_URL --clean --if-exists ujlog_restore.dump
   ```
3. Vérifier le point de terminaison de santé `/api/health`.
4. Lever le mode maintenance.

---

## 🧪 3. PROTOCOLE DE TEST PERIODE DE DÉSASTRE (DISASTER RECOVERY DRILL)

La fiabilité des procédures de restauration est testée tous les 3 mois en environnement Staging :
- Simulation de la suppression totale des tables (`DROP SCHEMA public CASCADE`).
- Chronométrage de la restauration complète (Contrôle du RTO < 30 minutes).
- Validation de zéro perte d'intégrité référentielle sur les cours et les utilisateurs.
