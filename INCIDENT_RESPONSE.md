# 🚨 PROTOCOLE DE GESTION DES INCIDENTS — UJLOG ÉTUDIANTS

Ce document définit les règles de gestion des incidents de sécurité, des pannes d'infrastructure et des dégradations de service pour la plateforme **UJLOG Étudiants**.

---

## 🚦 1. NIVEAUX DE SÉVÉRITÉ DES INCIDENTS

| Niveau | Critères | Délai de Prise en Charge |
| :--- | :--- | :---: |
| **SEV-1 (CRITIQUE)** | Indisponibilité totale de l'application, panne de la base de données PostgreSQL, compromission de sécurité ou fuite de données. | **< 15 minutes** |
| **SEV-2 (MAJEUR)** | Fonctionnalité clé bloquée (ex: authentification impossible, publication de cours impossible pour les délégués), forte hausse des réponses 429 / Rate Limit. | **< 1 Heure** |
| **SEV-3 (MINEUR)** | Dysfonctionnement isolé sans impact sur la sécurité (ex: lenteur d'un widget secondaire, bogue d'affichage mineur). | **< 24 Heures** |

---

## 🔄 2. ROULEMENT DU PROTOCOLE EN 6 ÉTAPES

```text
DÉTECTION (Alerte / Monitoring / /api/health)
        ↓
ANALYSE (Identification de la cause racine via Request ID et logs)
        ↓
CONFINEMENT (Isolation du problème, Rate Limiting, Rollback)
        ↓
CORRECTION (Fix à chaud ou Restauration DB)
        ↓
REPRISE (Validation du Health Check & Déblocage)
        ↓
POST-MORTEM (Documentation & Amélioration continue)
```

---

## 🔍 3. DÉTECTION & DIAGNOSTIC RAPIDE

1. **Vérifier l'état global du système** :
   ```bash
   curl -i https://ujlog-applet.ci/api/health
   ```
2. **Filtrer les logs d'erreurs récents** :
   Inspecter les logs JSON pour rechercher les événements avec `level: "ERROR"` ou `severity: "CRITICAL"` :
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.level=ERROR" --limit 20
   ```
3. **Traçabilité par Request ID** :
   Utiliser l'en-tête `X-Request-Id` fourni par l'utilisateur ou la console pour suivre le parcours complet de la requête de l'API à la base de données.

---

## 🔔 4. SEUILS D'ALERTE AUTOMATIQUE

- **Erreurs HTTP 500** : Alerte si > 1% des requêtes sur une fenêtre de 5 minutes.
- **Taux de blocage Rate Limit (HTTP 429)** : Alerte si > 50 requêtes bloquées par minute.
- **Temps de réponse DB** : Alerte si la latence `/api/health` dépasse 1000 ms pendant 3 minutes consécutives.
- **Ressources mémoire** : Alerte si l'utilisation de la mémoire Heap dépasse 85%.

---

## 📝 5. MODÈLE DE POST-MORTEM

Après la résolution de tout incident SEV-1 ou SEV-2, un rapport Post-Mortem doit être rédigé sous 48h incluant :
1. **Chronologie des événements** (Heure de détection, heure de confinement, heure de résolution).
2. **Cause racine** (*Root Cause Analysis*).
3. **Impact utilisateur** (Nombre de sessions affectées, requêtes en échec).
4. **Actions correctives préventives** à intégrer dans le backlog de développement.
