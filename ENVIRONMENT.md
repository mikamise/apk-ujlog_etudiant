# ⚙️ GESTION DES ENVIRONNEMENTS & CONTROLE D'ACCÈS — UJLOG ÉTUDIANTS

Ce document détaille la politique de séparation des environnements, la gestion des secrets et le principe du moindre privilège d'infrastructure pour la plateforme **UJLOG Étudiants**.

---

## 🌐 1. MATRICE SÉPARATIVE DES ENVIRONNEMENTS

| Paramètre | Development | Staging | Production |
| :--- | :--- | :--- | :--- |
| **Usage** | Développement local & tests unitaires. | Qualification, simulations de pannes DB & tests de résilience. | Service actif à destination des étudiants UJLOG. |
| **Database** | PostgreSQL local ou conteneur de dev. | Instance PostgreSQL Staging dédiée. | Cluster PostgreSQL managé avec réplique Standby. |
| **Secrets & Keys** | Credentials factices de test (`.env`). | Clés Staging isolées. | Coffre-fort de secrets chiffré (Secret Manager). |
| **PWA & Cache** | Désactivés ou rafraîchissement à chaud. | Stratégie Service Worker active pour qualification. | Service Worker & Manifest PWA de production. |
| **Log Level** | `DEBUG` | `INFO` | `WARN` / `ERROR` (avec masquage des PII). |

---

## 🔐 2. RÈGLES DE SÉCURITÉ POUR LES VARIABLES D'ENVIRONNEMENT

1. **Isolation stricte Serveur / Client** :
   - Seules les variables destinées au navigateur sont préfixées par `NEXT_PUBLIC_`.
   - `DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY` sont des **secrets exclusivement côté serveur**. Elles ne doivent JAMAIS comporter le préfixe `NEXT_PUBLIC_`.
2. **Interdiction d'exposition dans le code source** :
   - Aucun secret ne doit figurer en dur dans les fichiers `.ts`, `.tsx`, `.json` ou dans les commits Git.
   - Utilisation systématique du fichier `.env.example` comme modèle de structure sans valeur réelle.

---

## 🛡️ 3. CONTROLE D'ACCÈS INFRASTRUCTURE & MOINDRE PRIVILÈGE

- **Accès à la Base de Données** : Seule l'application serveur (via IP autorisées ou VPC Connector) et le script de sauvegarde chiffré possèdent des identifiants de connexion DB.
- **Droits de Déploiement** : L'accès aux commandes de déploiement en production est restreint au Lead Dev / Administrateur Système après validation de la pipeline CI/CD.
- **Consultation des Logs** : Les logs d'audit et applicatifs sont accessibles uniquement aux administrateurs autorisés avec masquage automatique des adresses emails (`u***r@domain.ci`) et tokens.
