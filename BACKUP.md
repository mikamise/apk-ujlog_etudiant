# 💾 STRATÉGIE DE SAUVEGARDE & RÈGLE 3-2-1 — UJLOG ÉTUDIANTS

Ce document définit la politique d'archivage, de chiffrement et de rétention des données pour la base de données PostgreSQL de la plateforme universitaire **UJLOG Étudiants**.

---

## 🎯 1. OBJECTIFS DE RECOUVREMENT (RPO & RTO)

Pour une plateforme d'information et de gestion académique universitaire :

| Métrique | Valeur Cible | Description |
| :--- | :---: | :--- |
| **RPO** (*Recovery Point Objective*) | **1 Heure** | Perte maximale acceptable de données enregistrées en cas de désastre majeur en journée d'examen. |
| **RTO** (*Recovery Time Objective*) | **30 Minutes** | Durée maximale acceptable pour réactiver le service après une panne totale d'infrastructure. |

---

## 📐 2. STRATÉGIE 3-2-1 DE SAUVEGARDE

1. **3 Copies des Données** :
   - Copie 1 : Base de données PostgreSQL primaire active en production.
   - Copie 2 : Réplique de secours en lecture/Standby synchrone.
   - Copie 3 : Dumps d'archives compressés et chiffrés.
2. **2 Supports / Emplacements Différents** :
   - Support A : Disques durs SSD managés du serveur PostgreSQL.
   - Support B : Bucket de stockage d'objets cloud hautement disponible.
3. **1 Copie Hors-Site (Off-Site)** :
   - Bucket répliqué géographiquement dans une seconde région cloud distincte.

---

## ⏰ 3. FRÉQUENCE ET RÉTENTION DES SAUVEGARDES

- **Sauvegardes Automatiques Continue (WAL / Point-In-Time Recovery)** :
  - Archivage continu des journaux de transaction PostgreSQL pour restauration à n'importe quelle seconde dans les 7 derniers jours.
- **Sauvegardes Quotidiennes (Full Dump)** :
  - Exécutées tous les jours à 02h00 UTC.
  - Rétention : Conservées pendant 30 jours.
- **Sauvegardes Mensuelles** :
  - Exécutées le 1er de chaque mois.
  - Rétention : Conservées pendant 12 mois (Fins d'années académiques).

---

## 🔐 4. CHIFFREMENT & SÉCURITÉ DES BACKUPS

- **Chiffrement au Repos (At-Rest)** : Toutes les sauvegardes stockées sont chiffrées via l'algorithme AES-256 avec gestion des clés gérée par un service KMS.
- **Chiffrement en Transit** : Tous les transferts de dumps de sauvegardes s'effectuent via TLS 1.3.
- **Principe du Moindre Privilège** : Le bucket de sauvegarde est inaccessible publiquement. Seul le compte de service d'automatisation des backups dispose des droits d'écriture.

---

## 🤖 5. SCRIPT DE SAUVEGARDE AUTOMATISÉE (EXEMPLE CONCEPTUEL)

```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/ujlog_backups"
BACKUP_FILE="${BACKUP_DIR}/ujlog_prod_${TIMESTAMP}.dump"
GPG_PASSPHRASE_FILE="/etc/ujlog/backup_gpg.key"

mkdir -p "$BACKUP_DIR"

# 1. Extraction du dump PostgreSQL
pg_dump "$DATABASE_URL" -F c -b -v -f "$BACKUP_FILE"

# 2. Chiffrement AES-256 avec GPG
gpg --batch --yes --passphrase-file "$GPG_PASSPHRASE_FILE" --symmetric --cipher-algo AES256 "$BACKUP_FILE"

# 3. Transfert vers le stockage répliqué
gsutil cp "${BACKUP_FILE}.gpg" gs://ujlog-db-backups-encrypted/daily/

# 4. Nettoyage local
rm -f "$BACKUP_FILE" "${BACKUP_FILE}.gpg"
echo "✅ Sauvegarde UJLOG exécutée avec succès : ${TIMESTAMP}"
```

---

## 🚨 6. GESTION DES ÉCHECS DE SAUVEGARDE

Si une sauvegarde échoue :
1. Émission immédiate d'un log critique `SYSTEM_ERROR` via `security-logger.ts`.
2. Alerte Slack / Email transmise à l'équipe technique.
3. Exécution automatique d'une tentative de retry (maximum 3 essais espacés de 5 minutes).
