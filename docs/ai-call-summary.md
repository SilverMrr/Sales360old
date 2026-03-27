# Rendre la maquette Sales360 fonctionnelle : IA d'écoute d'appel, résumé et next steps

## 1) Objectif produit
Ajouter un module qui :
1. enregistre (ou capte) l'audio d'un appel,
2. transcrit la conversation,
3. génère un résumé actionnable,
4. propose/ajoute automatiquement les **next steps** (relance, devis, démo, email).

---

## 2) Architecture recommandée (MVP)

### Front-end (votre maquette actuelle)
- Bouton `Démarrer l'appel` / `Arrêter`.
- Upload audio (ou stream temps réel) vers une API backend.
- Affichage de :
  - transcription,
  - résumé,
  - next steps (checklist + échéance + propriétaire).

### Backend API (Node.js + TypeScript conseillé)
Endpoints typiques :
- `POST /api/calls` → crée un appel,
- `POST /api/calls/:id/audio` → reçoit l'audio,
- `POST /api/calls/:id/process` → lance transcription + résumé,
- `GET /api/calls/:id/summary` → retourne résultat.

Pipeline backend :
1. audio → STT,
2. STT → LLM résumé structuré,
3. sauvegarde en base,
4. retour UI.

### Base de données
- PostgreSQL (Supabase/Neon pour démarrer vite).
- Tables minimales :
  - `calls` (id, contact_id, started_at, ended_at, status)
  - `call_transcripts` (call_id, speaker, start_ms, end_ms, text)
  - `call_summaries` (call_id, summary, sentiment, risk_level)
  - `next_steps` (call_id, title, owner, due_date, priority, status)

---

## 3) Outils à prendre (stack pragmatique)

### Option A — rapide à livrer (recommandée)
- **Frontend** : votre HTML/CSS/JS actuel + migration progressive vers React/Next.js (facultatif au début).
- **Backend** : Node.js + Fastify ou NestJS.
- **IA** :
  - Speech-to-Text : modèle de transcription (ex. Whisper-like / API STT),
  - Résumé + extraction d'actions : GPT via API.
- **DB** : PostgreSQL.
- **Queue** (si appels longs) : BullMQ + Redis.
- **Stockage audio** : S3/R2/Supabase Storage.

### Option B — entreprise / conformité renforcée
- Même base, avec :
  - chiffrement fort des enregistrements,
  - séparation des environnements,
  - audit trail,
  - contrôle de conservation (retention policy),
  - anonymisation PII.

---

## 4) Design du prompt (résumé + next steps)
Demander une sortie JSON stricte pour être exploitable automatiquement.

Exemple de schéma attendu :
```json
{
  "summary": "...",
  "customer_intent": "...",
  "objections": ["..."],
  "sentiment": "positive|neutral|negative",
  "next_steps": [
    {
      "title": "Envoyer proposition commerciale",
      "owner": "AE",
      "due_date": "2026-04-02",
      "priority": "high"
    }
  ],
  "crm_fields": {
    "deal_stage": "Proposal",
    "estimated_amount": 45000,
    "close_date": "2026-04-30"
  }
}
```

Bonnes pratiques :
- forcer une structure JSON,
- limiter la longueur du résumé,
- imposer des dates ISO (`YYYY-MM-DD`),
- classifier la confiance de chaque next step.

---

## 5) Flux produit concret dans Sales360
1. Le commercial lance un appel depuis `telephony.html`.
2. À la fin : bouton `Analyser l'appel`.
3. Le backend traite (transcription + résumé + actions).
4. `recommendations.html` affiche les next steps auto-générés.
5. Le commercial valide/édite avant envoi CRM.

---

## 6) Sécurité et légal (important)
- Afficher un consentement d'enregistrement selon pays/région.
- Chiffrer audio + transcript au repos et en transit.
- Masquer/retirer données sensibles (PII) avant stockage long terme.
- Conserver uniquement la durée nécessaire (politique de rétention).

---

## 7) Plan d'implémentation en 2 semaines (MVP)

### Semaine 1
- Mettre en place backend API + stockage audio.
- Ajouter endpoint de transcription.
- Persister transcript en DB.

### Semaine 2
- Ajouter génération résumé + next steps.
- Afficher les résultats dans UI.
- Ajouter validation manuelle avant écriture CRM.

Critères de succès MVP :
- résumé disponible < 30 s après l'appel,
- au moins 3 next steps pertinents dans 80% des appels,
- édition manuelle possible avant sauvegarde.

---

## 8) Démarrer immédiatement (checklist)
- [ ] Créer un backend Node/TS (`/api`).
- [ ] Ajouter stockage audio.
- [ ] Implémenter endpoint transcription.
- [ ] Implémenter endpoint résumé structuré JSON.
- [ ] Ajouter écran "Post-call summary".
- [ ] Sauvegarder next steps en base.
- [ ] Connecter la page recommandations.

