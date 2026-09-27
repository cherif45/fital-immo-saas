# FITAL-IMMO — Configuration des Paiements

Ce guide explique **comment créer un compte Wave Business / PayDunya** et **comment insérer les clés API dans l'app**.

---

## 💳 1. WAVE BUSINESS

### 1.1 Créer un compte Wave Business

1. Va sur **https://business.wave.com**
2. Clique sur **"Créer un compte"**
3. Remplis le formulaire :
   - **Nom commercial** : TRANS IMMOBILIER SERVICES SARL
   - **Email** : `tiser.immo@gmail.com`
   - **Téléphone** : `+221 33 825 59 67`
   - **Mot de passe** : crée un mot de passe fort

### 1.2 Documents KYC requis

Pour valider ton compte marchand, prépare :

| Document | Obligatoire |
|----------|-------------|
| **RCCM** (Registre de Commerce) | ✅ Oui |
| **NINEA** | ✅ Oui |
| **CNI du gérant** (recto/verso) | ✅ Oui |
| **RIB / compte de settlement** | ✅ Oui |
| **Justificatif de domicile** | Recommandé |
| **Photo enseigne / local** | Parfois |

**Pour FITAL-IMMO :**
- RCCM : `SN-DKR-2023.B.12158`
- NINEA : `0101576352V5`

### 1.3 Délais

- **Validation KYC** : 24 à 72h
- **Plafond avant KYC complet** : Réduit
- **Plafond après KYC** : 1 000 000 FCFA / transaction
- **Accès API** : Après validation KYC

### 1.4 Récupérer les clés API

1. Une fois le KYC validé, connecte-toi à ton compte Wave Business
2. Va dans **Développeur** → **API Keys**
3. Copie :
   - **API Key** : commence par `wave_sn_prod_...`
   - **Webhook Secret** : commence par `whsec_...`

### 1.5 Configurer le webhook

Chez Wave Business, configure l'URL de webhook :

```
https://fital-immo-gestion-locative-loyers-wine.vercel.app/api/wave/webhook
```

Sélectionne les événements :
- `checkout.session.completed`
- `checkout.session.failed`

---

## 💳 2. PAYDUNYA

### 2.1 Créer un compte PayDunya

1. Va sur **https://paydunya.com**
2. Clique sur **"S'inscrire"** → **"Espace développeurs"**
3. Remplis :
   - **Email** : `tiser.immo@gmail.com`
   - **Nom commercial** : TRANS IMMOBILIER SERVICES SARL
   - **Téléphone** : `+221 33 825 59 67`

### 2.2 Mode TEST vs LIVE

- **Mode TEST** : Par défaut, paiements simulés. Aucun KYC requis.
- **Mode LIVE** : Paiements réels. KYC complet requis (5-10 jours).

### 2.3 Documents KYC (pour LIVE)

| Document | Obligatoire |
|----------|-------------|
| **CNI du gérant** | ✅ Oui |
| **RCCM** | ✅ Oui |
| **NINEA** | ✅ Oui |
| **RIB / IBAN** | ✅ Oui |

### 2.4 Récupérer les clés

1. Connecte-toi à ton compte PayDunya
2. Menu **"Intégrez notre API"**
3. Clique **"Configurer une nouvelle application"**
4. Remplis le formulaire
5. Copie les 4 clés :

| Clé | Description |
|-----|-------------|
| `PAYDUNYA-MASTER-KEY` | Identifiant compte |
| `PAYDUNYA-PRIVATE-KEY` | Signature |
| `PAYDUNYA-PUBLIC-KEY` | Frontend (mode onsite) |
| `PAYDUNYA-TOKEN` | Auth API |

### 2.5 Tester en mode TEST

1. Dans le dashboard PayDunya, crée un **client fictif** avec un solde
2. Utilise les clés `test_...`
3. Fais un paiement test

### 2.6 Configurer le webhook (IPN)

Chez PayDunya, configure l'URL IPN :

```
https://fital-immo-gestion-locative-loyers-wine.vercel.app/api/paydunya/webhook
```

---

## 💳 3. ORANGE MONEY

### 3.1 Créer un compte marchand

1. Contacte **Orange Business Sénégal**
2. Demande un compte **Orange Money Marchand**
3. Fournis les documents d'entreprise (RCCM, NINEA, CNI)

### 3.2 Délais

- **Validation** : 3 à 7 jours
- **Plafond** : 2 000 000 FCFA / transaction

### 3.3 Récupérer les clés

Une fois validé, Orange te fournit :
- **API Key**
- **Merchant ID**

---

## 🔑 4. INSÉRER LES CLÉS DANS L'APP

### 4.1 Via l'interface (recommandé)

1. Connecte-toi en tant qu'**ADMIN**
2. Va dans **Paramètres** → onglet **"Paiements en ligne"**
3. Pour chaque provider, remplis :

**Wave :**
- **Wave API Key** : `wave_sn_prod_xxx`
- **Wave Webhook Secret** : `whsec_xxx`
- Coche **"Activé"**

**Orange Money :**
- **Orange Money API Key** : `xxx`
- **Merchant ID** : `MERCHANT-xxx`
- Coche **"Activé"**

**PayDunya :**
- **Master Key** : `xxx`
- **Private Key** : `live_private_xxx`
- **Public Key** : `live_public_xxx`
- **Token** : `xxx`
- **Mode** : `Test` ou `Production`
- Coche **"Activé"**

4. Coche **"Paiements en ligne ACTIVÉS"** en haut
5. Clique sur **"Enregistrer"**

### 4.2 Vérifier que les clés sont bien enregistrées

En SQL :
```sql
SELECT 
  agency_id,
  wave_api_key IS NOT NULL AS wave_ok,
  orange_money_api_key IS NOT NULL AS om_ok,
  paydunya_master_key IS NOT NULL AS paydunya_ok,
  payments_enabled
FROM agency_settings
WHERE agency_id = '5f581aa8-6e92-47a6-ae8e-a28a9de66140';
```

---

## 🧪 5. TESTER UN PAIEMENT

### 5.1 Test avec PayDunya (mode TEST)

PayDunya permet de tester sans KYC :

1. Crée un compte PayDunya → **Espace développeurs**
2. Récupère les clés `test_...`
3. Dans le dashboard, crée un **client fictif** avec un solde de 50 000 FCFA
4. Configure les clés TEST dans l'app
5. Fais un paiement test avec ce client fictif

### 5.2 Test avec Wave (nécessite KYC)

1. Une fois le KYC validé
2. Récupère les clés `wave_sn_prod_...`
3. Configure dans l'app
4. Fais un vrai paiement (montant minimum)

### 5.3 Vérifier le webhook

Après un paiement test :

1. Va sur **Vercel → Logs**
2. Cherche `POST /api/wave/webhook` ou `/api/paydunya/webhook`
3. Vérifie que le webhook a bien été reçu
4. En SQL :
```sql
SELECT id, status, provider_transaction_id, created_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔧 6. PROBLÈMES FRÉQUENTS

### ❌ Le paiement passe mais le statut reste "pending"

**Cause** : Le webhook n'est pas configuré ou l'URL est mauvaise.

**Solution** :
1. Vérifie l'URL de webhook chez Wave/PayDunya
2. Teste manuellement :
```powershell
curl.exe -X POST https://ton-app.vercel.app/api/wave/webhook -H "Content-Type: application/json" -d "{}"
```
→ Doit retourner une erreur JSON (pas 404)

### ❌ `{"error":"Wave n'est pas configuré pour cette agence."}`

**Cause** : Les clés API ne sont pas dans `agency_settings`.

**Solution** :
1. Va dans Paramètres → Paiements en ligne
2. Vérifie que les clés sont bien saisies
3. Vérifie que "Activé" est coché
4. Enregistre

### ❌ `401 Unauthorized` de Wave

**Cause** : Clé API invalide ou expirée.

**Solution** :
1. Vérifie la clé sur Wave Business
2. Re-copie-la sans espaces
3. Re-enregistre dans l'app

---

*Document à maintenir à jour.*