# ZEN Knowledge — RAG interne

ZEN Knowledge est une application **Fullstack / RAG / Sécurité** permettant à plusieurs sociétés de centraliser leurs documents internes et d'interroger uniquement les contenus auxquels chaque utilisateur est autorisé à accéder.

Le système gère la **bibliothèque documentaire**, le **versioning**, l'**ingestion asynchrone**, la **recherche vectorielle**, les **réponses sourcées**, l'**historique des échanges**, le **feedback utilisateur**, les **révisions documentaires** et une vue d'**observabilité RAG**.

> Projet réalisé dans le cadre du test technique **ZEN Group — Fullstack AI / Automation — Série F / Choix F1**.

## Liens

- **Application de démonstration :** `<URL_DE_DEMO>`
- **Dépôt Git :** `<URL_DU_REPOSITORY>`
- **Vidéo de démonstration :** `<URL_DE_LA_VIDEO>`

---

## Fonctionnalités principales

### Gestion multi-sociétés et permissions

- sociétés et services séparés ;
- utilisateurs avec rôles `ADMIN`, `GESTIONNAIRE` et `COLLABORATEUR` ;
- invitation des utilisateurs par e-mail ;
- isolation des données par société ;
- filtrage des documents par société, service, rôle, date de révision et état de publication.

### Bibliothèque documentaire

- ajout et modification de documents PDF ;
- stockage objet compatible S3 ;
- versioning des fichiers ;
- suivi de l'état d'ingestion ;
- publication de la version courante ;
- prévisualisation sécurisée du PDF ;
- gestion d'une date de révision documentaire.

<p align="center">
  <img src="docs/screenshots/documents.png" alt="Bibliothèque documentaire ZEN Knowledge" width="900">
</p>

<p align="center">
  <em>Bibliothèque documentaire avec suivi des documents, versions, statuts et périmètres d'accès.</em>
</p>

### RAG documentaire

- extraction du texte page par page ;
- nettoyage et découpage en chunks ;
- génération d'embeddings ;
- recherche sémantique avec `pgvector` ;
- récupération des passages autorisés uniquement ;
- génération d'une réponse à partir des passages récupérés ;
- citations vérifiées côté serveur ;
- ouverture de la source PDF à la page concernée ;
- abstention lorsque les sources sont insuffisantes.

### Conversation et qualité

- historique des messages en base ;
- conservation des passages récupérés et de leur score ;
- citations persistées ;
- feedback `UTILE` / `INEXACT` ;
- journalisation de la latence, du modèle et des tokens ;
- tableau d'observabilité réservé à l'administrateur.

### Révision documentaire

- détection des documents arrivés à leur date de révision ;
- création d'une tâche de révision ;
- passage du document à l'état `A_VALIDER` ;
- relances e-mail planifiées via n8n ;
- suivi des relances envoyées ou en échec.

---

## Stack technique

| Couche | Technologies |
|---|---|
| Application | Next.js 16, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Base UI |
| Authentification | Auth.js / NextAuth v5, Credentials, JWT |
| Validation | Zod |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Base de données | PostgreSQL 17 + pgvector |
| Stockage documentaire | S3 compatible / MinIO |
| Automatisation | n8n |
| Embeddings | Gemini `gemini-embedding-2`, 768 dimensions |
| Recherche vectorielle | distance cosinus via pgvector |
| E-mails | SMTP via n8n |
| Conteneurs locaux | Docker Compose |

---

## Architecture

```mermaid
flowchart LR
    U[Utilisateur] --> APP[Next.js 16]

    APP --> AUTH[Auth.js / JWT]
    APP --> DB[(PostgreSQL + pgvector)]
    APP --> S3[(S3 / MinIO)]
    APP --> N8N[n8n]

    N8N --> GEM[Gemini Embedding API]
    N8N --> LLM[LLM de génération]
    N8N --> SMTP[SMTP]

    N8N --> API[API internes Next.js]
    API --> DB
    API --> S3

    DB --> APP
    S3 --> APP
```

L'application Next.js reste la **source d'autorité métier et sécurité**. n8n orchestre les traitements externes et asynchrones mais ne décide pas seul des droits d'accès aux documents.

### Séparation des responsabilités

- **Next.js** : interface, authentification, permissions, logique métier, recherche vectorielle, validation des réponses et persistance.
- **PostgreSQL / pgvector** : données métier, historique conversationnel, embeddings et recherche sémantique.
- **S3 / MinIO** : stockage privé des PDF.
- **n8n** : ingestion, embeddings, génération de réponse, invitations et relances de révision.
- **Gemini Embedding** : représentation vectorielle des chunks et des questions.

---

## Flux RAG

```mermaid
sequenceDiagram
    actor User as Collaborateur
    participant App as Next.js
    participant DB as PostgreSQL/pgvector
    participant N8N as n8n
    participant AI as APIs IA

    User->>App: Pose une question
    App->>App: Vérifie identité et périmètre documentaire
    App->>DB: Enregistre question + exécution RAG
    App->>N8N: Demande embedding de la question
    N8N->>AI: Génère embedding 768D
    AI-->>N8N: Embedding
    N8N-->>App: Embedding
    App->>DB: Recherche vectorielle sur versions autorisées
    DB-->>App: Top passages + scores

    alt Aucun passage assez pertinent
        App->>DB: Enregistre une abstention
        App-->>User: Sources insuffisantes
    else Passages disponibles
        App->>N8N: Question + passages autorisés
        N8N->>AI: Génération contrainte par les sources
        AI-->>N8N: Réponse + références
        N8N-->>App: Réponse structurée
        App->>App: Vérifie citations et extraits
        App->>DB: Enregistre réponse, passages et citations
        App-->>User: Réponse sourcée
    end
```

### Exemple de réponse sourcée

<p align="center">
  <img src="docs/screenshots/citation.png" alt="Chat RAG avec citations" width="900">
</p>

<p align="center">
  <em>Réponse générée à partir des passages autorisés, avec citations persistées et vérifiables.</em>
</p>

### Vérification d'une citation

<p align="center">
  <img src="docs/screenshots/preview.png" alt="Prévisualisation de la source PDF" width="900">
</p>

<p align="center">
  <em>Un clic sur une citation ouvre directement le document source au passage concerné.</em>
</p>

### Paramètres actuels de recherche

- modèle d'embedding : `gemini-embedding-2` ;
- dimension : `768` ;
- `topK` par défaut : `5` ;
- seuil minimal de similarité : `0.55` ;
- distance : cosinus avec l'opérateur pgvector `<=>`.

---

## Ingestion documentaire

Le workflow d'ingestion suit le flux suivant :

```text
Upload PDF
  → stockage S3
  → création d'une VersionDocument
  → déclenchement n8n
  → extraction page par page
  → nettoyage
  → découpage
  → embeddings
  → enregistrement des chunks
  → publication après validation
```

### Découpage actuel

- taille maximale d'un chunk : **1500 caractères** ;
- overlap : **200 caractères** ;
- maximum : **200 chunks par document** ;
- chaque chunk reste attaché à une seule page afin de conserver des citations fiables.

---

## Sécurité et isolation des données

La sécurité est appliquée **avant la récupération des passages**, et pas uniquement dans le prompt du LLM.

Pour un collaborateur, une source doit notamment :

1. appartenir à sa société ;
2. être accessible à son rôle ;
3. appartenir à son service ou être globale à la société ;
4. ne pas être supprimée ;
5. ne pas avoir dépassé sa date de révision ;
6. utiliser la dernière version publiée.

Le gestionnaire dispose d'un périmètre plus large sur sa propre société. L'administrateur possède des écrans d'administration dédiés mais n'est pas utilisé comme moyen de contourner la politique documentaire du chat.

Autres protections mises en place :

- mots de passe hashés avec bcrypt ;
- session JWT limitée dans le temps ;
- secrets de webhooks ;
- comparaison des secrets internes avec `timingSafeEqual` ;
- endpoints PDF protégés par une nouvelle vérification des permissions ;
- réponses PDF servies avec `private, no-store` ;
- validation Zod des retours des workflows ;
- validation côté serveur de la cohérence entre références, citations et passages réellement récupérés.

---

# Installation locale

## 1. Prérequis

- Node.js **20+** ;
- npm ;
- Docker Desktop / Docker Engine avec Docker Compose ;
- une clé API Gemini pour les embeddings ;
- un compte SMTP si les invitations et relances e-mail doivent être testées.

## 2. Cloner le projet

```bash
git clone <URL_DU_REPOSITORY>
cd zenknowledge
npm install
```

## 3. Variables d'environnement

Copier le fichier d'exemple :

```bash
cp .env.example .env
```

Exemple de configuration locale :

```env
# Database
DATABASE_URL="postgresql://zen:zen_local_password@localhost:5432/zen_knowledge"

# Auth
AUTH_SECRET=<GENERER_UN_SECRET_LONG>
AUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"

# Seed admin
SEED_ADMIN_NAME="Administrateur"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD=<MOT_DE_PASSE_DE_12_CARACTERES_MINIMUM>

# n8n - webhooks appelés par Next.js
N8N_INVITATION_WEBHOOK_URL="http://localhost:5678/webhook/user-invitation"
N8N_INGESTION_URL="http://localhost:5678/webhook/documents/ingest"
N8N_QUESTION_EMBEDDING_URL="http://localhost:5678/webhook/chat/embed-question"
N8N_ANSWER_URL="http://localhost:5678/webhook/chat/answer"

# Secrets n8n
N8N_WEBHOOK_SECRET=<SECRET_WEBHOOK>
N8N_INTERNAL_API_SECRET=<SECRET_API_INTERNE>
N8N_REVISION_WEBHOOK_SECRET=<SECRET_REVISION>

# S3 / MinIO local
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_BUCKET="zen-documents"
S3_ACCESS_KEY_ID=<MINIO_ACCESS_KEY>
S3_SECRET_ACCESS_KEY=<MINIO_SECRET_KEY>
```


## 4. Démarrer les services Docker

Le fichier `compose.yaml` fournit :

- PostgreSQL 17 avec pgvector ;
- n8n ;
- MinIO ;
- un conteneur d'initialisation du bucket MinIO.

```bash
docker compose up -d
```

Vérifier les conteneurs :

```bash
docker compose ps
```

Services locaux par défaut :

| Service | URL / port |
|---|---|
| Next.js | `http://localhost:3000` |
| PostgreSQL | `localhost:5432` |
| n8n | `http://localhost:5678` |
| MinIO API | `http://localhost:9000` |
| MinIO Console | `http://localhost:9001` |

## 5. Initialiser PostgreSQL

Les migrations créent également l'extension `vector`.

```bash
npx prisma generate
npx prisma migrate deploy
```

Créer l'administrateur initial :

```bash
npx prisma db seed
```

## 6. Configurer n8n

Ouvrir :

```text
http://localhost:5678
```

Importer les exports JSON présents dans le dépôt :

- `W1 — Ingestion document.json` ;
- `W2 — Embedding question.json` ;
- `W3 - revison workflow.json` ;
- `Invitation.json` ;
- le workflow de génération de réponse exposant `/webhook/chat/answer`.

Configurer ensuite les credentials n8n :

- **Gemini API** : Header Auth avec la clé API Gemini ;
- **SMTP account** : compte d'envoi des invitations et relances ;
- **Header Auth** des webhooks : doit correspondre aux secrets envoyés par l'application ;
- secrets des appels vers les endpoints internes Next.js.

### Important en local avec n8n dans Docker

Depuis le conteneur n8n, `localhost:3000` désigne le conteneur lui-même, et non l'application Next.js exécutée sur la machine hôte.

Avec Docker Desktop, utiliser généralement :

```text
http://host.docker.internal:3000
```

pour les nœuds n8n qui appellent les routes internes Next.js.

Les exports de workflow doivent donc utiliser une URL adaptée à l'environnement plutôt qu'une URL de production codée en dur.

## 7. Démarrer l'application

```bash
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

---

## Workflows n8n

| Workflow | Responsabilité |
|---|---|
| W1 — Ingestion document | téléchargement du PDF, extraction, découpage, embeddings, finalisation de l'ingestion |
| W2 — Embedding question | validation de la question et génération de son embedding |
| Chat answer | génération d'une réponse à partir des passages autorisés |
| Invitation | envoi de l'e-mail d'invitation utilisateur |
| W3 — Révision | création des tâches de révision et envoi des relances |

Les workflows externes ne reçoivent que les données nécessaires à leur tâche. Les opérations sensibles sur la base restent effectuées par l'application ou par des endpoints internes authentifiés.

<p align="center">
  <img src="docs/screenshots/n8n.png" alt="Workflow n8n de ZEN Knowledge" width="900">
</p>

<p align="center">
  <em>Orchestration n8n des traitements d'ingestion, d'embedding, de génération et d'automatisation.</em>
</p>

---

## Modèle de données simplifié

```mermaid
erDiagram
    Societe ||--o{ Service : contient
    Societe ||--o{ Utilisateur : contient
    Societe ||--o{ Document : possede

    Service ||--o{ Utilisateur : regroupe
    Service ||--o{ Document : classe

    Utilisateur ||--o{ Document : proprietaire
    Document ||--o{ VersionDocument : versionne
    VersionDocument ||--o{ Chunk : contient
    VersionDocument ||--o{ ExecutionIngestion : suit

    Utilisateur ||--|| Conversation : possede
    Conversation ||--o{ Message : contient
    Message ||--o{ ExecutionRAG : question
    ExecutionRAG ||--o{ PassageRecupere : recupere
    Chunk ||--o{ PassageRecupere : source
    Message ||--o{ Citation : cite
    PassageRecupere ||--o{ Citation : prouve
    Message ||--o{ Feedback : recoit

    Document ||--o{ TacheRevision : declenche
    TacheRevision ||--o{ Relance : planifie
```

---

## Organisation du code

```text
src/
├── app/
│   ├── (auth)/                  # Connexion et invitation
│   ├── (dashboard)/             # Dashboard, documents, chat, sociétés...
│   └── api/
│       ├── documents/           # Lecture / preview PDF sécurisée
│       └── internal/            # Endpoints réservés aux workflows
├── modules/
│   ├── auth/
│   ├── chat/
│   ├── companies/
│   ├── documents/
│   ├── invitations/
│   ├── observability/
│   ├── services/
│   └── users/
├── server/
│   ├── auth/
│   ├── storage/                 # S3
│   └── workflows/               # Bridges Next.js ↔ n8n
└── generated/prisma/

prisma/
├── migrations/
├── schema.prisma
└── seed.ts
```

L'organisation par modules permet de garder ensemble les composants UI, actions serveur, validations et accès aux données d'un même domaine fonctionnel.

---

# Choix techniques

## PostgreSQL + pgvector plutôt qu'une base vectorielle séparée

Les embeddings et les données métier restent dans la même base. Cela simplifie :

- les transactions ;
- le déploiement ;
- l'isolation multi-sociétés ;
- les jointures entre source, version, document et permissions ;
- la traçabilité des passages réellement utilisés.

Prisma gère le modèle métier, tandis qu'une requête SQL paramétrée est utilisée pour l'opération vectorielle pgvector.

## n8n pour les traitements d'automatisation

n8n rend les workflows d'ingestion, d'e-mail et d'IA visibles et modifiables sans déplacer la logique d'autorisation hors de l'application.

Ce découpage permet également de remplacer un fournisseur IA sans réécrire toute l'application.

## Stockage S3 compatible

L'application utilise l'API S3 plutôt qu'un stockage local afin de conserver la même abstraction entre développement et production.

MinIO est utilisé pour reproduire cette architecture en local.

## Sécurité avant génération

Le filtrage est effectué **avant** l'appel au LLM. Le modèle ne reçoit donc pas des documents auxquels l'utilisateur n'a pas accès.

Une seconde vérification est effectuée avant la persistance de la réponse afin de réduire les risques liés à un document modifié pendant l'exécution.

## Citations vérifiables

Une citation n'est pas acceptée simplement parce que le LLM a écrit `[1]`.

Le serveur vérifie notamment que :

- le numéro cité correspond à un passage réellement récupéré ;
- l'extrait annoncé est présent dans ce passage ;
- les références présentes dans la réponse correspondent aux citations structurées ;
- la source appartient toujours à une version accessible.

## Abstention explicite

Lorsqu'aucun passage ne dépasse le seuil de pertinence ou lorsque les sources ne suffisent pas, l'application retourne une réponse d'abstention au lieu de forcer une génération non sourcée.

---

# Limites actuelles

Le projet privilégie un périmètre clair et démontrable. Les limites actuelles sont donc explicites :

| Limite | Impact / évolution possible |
|---|---|
| PDF uniquement | ajouter DOCX, HTML ou autres formats via un pipeline d'extraction unifié |
| Pas d'OCR | les PDF scannés sans couche texte échouent ; ajouter OCR ou vision en amont |
| Fichier limité à 3 Mo | augmenter la limite avec upload multipart / traitement asynchrone adapté |
| 200 chunks maximum | limite volontaire pour maîtriser le coût et le temps d'ingestion |
| Recherche vectorielle seule | ajouter recherche hybride BM25 + vecteurs puis reranking |
| Seuil `0.55` statique | calibrer le seuil sur un jeu d'évaluation métier |
| `topK = 5` fixe | rendre la récupération adaptative selon la requête |
| Modèle d'embedding fixé à 768D | prévoir une stratégie de migration / ré-indexation lors d'un changement de modèle |
| Une conversation principale par utilisateur | le schéma actuel impose `utilisateurId` unique ; ajouter plusieurs threads si nécessaire |
| Coût estimé prévu mais non calculé systématiquement | ajouter la tarification par modèle dans l'observabilité |
| Pas de reranker dédié | utile lorsque le volume documentaire devient plus important |
| Orchestration dépendante de n8n | prévoir retry, dead-letter ou queue dédiée pour un très fort volume |

---

## Observabilité

L'écran administrateur permet de suivre notamment :

- nombre d'exécutions RAG ;
- succès et échecs ;
- latence moyenne ;
- latence P95 ;
- tokens d'entrée et de sortie ;
- réponses avec sources insuffisantes ;
- modèle utilisé ;
- passages récupérés et leurs scores ;
- feedback utilisateur.

<p align="center">
  <img src="docs/screenshots/observability.png" alt="Observabilité RAG ZEN Knowledge" width="900">
</p>

<p align="center">
  <em>Vue administrateur pour suivre les exécutions RAG, la latence, les tokens, les sources et les feedbacks.</em>
</p>

Aucun secret, credential ou embedding n'est chargé dans cette vue.

---

## Scénarios de démonstration conseillés

1. Se connecter en administrateur et montrer la séparation des sociétés.
2. Créer ou ouvrir un gestionnaire et présenter la bibliothèque documentaire de sa société.
3. Ajouter un PDF, montrer le statut d'ingestion puis sa publication.
4. Se connecter comme collaborateur et poser une question couverte par le document.
5. Ouvrir une citation et montrer le PDF à la page utilisée.
6. Poser une question hors périmètre pour montrer l'abstention.
7. Donner un feedback `Utile` ou `Inexact`.
8. Terminer par la vue d'observabilité et, si le temps le permet, le workflow n8n d'ingestion.

---

## Captures d'écran

Les captures utilisées dans ce README sont stockées dans :

```text
docs/screenshots/
├── documents.png
├── citation.png
├── preview.png
├── observability.png
└── n8n.png
```

Elles illustrent respectivement la bibliothèque documentaire, les réponses sourcées, l'ouverture d'une citation dans le PDF, l'observabilité RAG et l'orchestration n8n.

---

## Commandes utiles

```bash
# Développement
npm run dev

# Build production
npm run build
npm run start

# Lint
npm run lint

# Prisma
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Infrastructure locale
docker compose up -d
docker compose ps
docker compose logs -f n8n
docker compose down
```

---

## Déploiement

L'architecture peut être déployée avec :

- **Next.js** sur Vercel ou un runtime Node.js ;
- **PostgreSQL** disposant de l'extension pgvector ;
- **stockage S3 compatible** ;
- **n8n Cloud** ou n8n auto-hébergé.

En production :

- utiliser des secrets distincts du développement ;
- ne jamais exposer MinIO/PostgreSQL publiquement sans nécessité ;
- utiliser HTTPS ;
- configurer les URLs de callback n8n par environnement ;
- stocker les credentials IA et SMTP dans le gestionnaire de credentials n8n ;
- ne jamais versionner `.env`.

---

## Auteur

**Yessine Eleuchi**  
Software Engineer — Full-Stack & Applied AI

