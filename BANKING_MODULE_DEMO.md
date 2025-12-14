# Démonstration du Module Banque

Ce document décrit le fonctionnement du module Banque et fournit des données de test pour une démonstration complète.

## Table des matières

1.  [Flux de travail général](#flux-de-travail-général)
2.  [Étape 1: Paramétrage Initial](#étape-1-paramétrage-initial)
    *   [1.1 Créer une Banque](#11-créer-une-banque)
    *   [1.2 Créer un Type de Transaction](#12-créer-un-type-de-transaction)
    *   [1.3 Créer un Compte Bancaire](#13-créer-un-compte-bancaire)
3.  [Étape 2: Opérations Quotidiennes](#étape-2-opérations-quotidiennes)
    *   [2.1 Enregistrer un Chèque Reçu](#21-enregistrer-un-chèque-reçu)
    *   [2.2 Enregistrer une Transaction Manuelle](#22-enregistrer-une-transaction-manuelle)
    *   [2.3 Gérer le Cycle de Vie d'un Chèque](#23-gérer-le-cycle-de-vie-dun-chèque)
4.  [Étape 3: Rapprochement Bancaire](#étape-3-rapprochement-bancaire)
    *   [3.1 Importer un Relevé Bancaire](#31-importer-un-relevé-bancaire)
    *   [3.2 Effectuer le Rapprochement](#32-effectuer-le-rapprochement)
5.  [Étape 4: Vue d'ensemble sur le Dashboard](#étape-4-vue-densemble-sur-le-dashboard)

---

## Flux de travail général

Le module est conçu pour suivre un flux logique :

1.  **Paramétrage** : Configurer les entités de base (banques, comptes).
2.  **Opérations** : Enregistrer les transactions et les chèques au quotidien.
3.  **Rapprochement** : Importer les relevés officiels de la banque et les comparer avec les opérations enregistrées dans le système.
4.  **Analyse** : Utiliser le dashboard pour avoir une vue d'ensemble de la santé financière.

---

## Étape 1: Paramétrage Initial

Nous commençons par configurer les informations de base.

### 1.1 Créer une Banque

Accédez à `Banque > Accès Rapide > Banques`.

*   Cliquez sur **"Nouvelle Banque"**.
*   Remplissez le formulaire avec les données de test suivantes :

| Champ          | Valeur             |
| -------------- | ------------------ |
| **Nom**        | `Crédit Agricole`  |
| **Code Swift** | `AGRIFRPP`         |
| **Pays**       | `France`           |

### 1.2 Créer un Type de Transaction

Accédez à `Banque > Accès Rapide > Types Transactions`.

*   Cliquez sur **"Nouveau Type"**.
*   Remplissez le formulaire. Ces types serviront à catégoriser vos dépenses et revenus. Créez les types suivants :

| Label                 | Direction | Catégorie      |
| --------------------- | --------- | -------------- |
| `Frais bancaires`     | `DEBIT`   | `Frais`        |
| `Virement Fournisseur`| `DEBIT`   | `Paiement`     |
| `Virement Client`     | `CREDIT`  | `Encaissement` |

### 1.3 Créer un Compte Bancaire

Accédez à `Banque > Accès Rapide > Comptes`.

*   Cliquez sur **"Nouveau Compte Bancaire"**.
*   Remplissez le formulaire avec les données de test :

| Champ                           | Valeur                          |
| ------------------------------- | ------------------------------- |
| **Nom du compte**               | `Compte Courant Principal`      |
| **Banque**                      | `Crédit Agricole` (créée à l'étape 1.1) |
| **Type de compte**              | `Compte Courant`                |
| **Solde initial**               | `10000`                         |
| **Devise**                      | `EUR`                           |
| **IBAN**                        | `FR7630004000031234567890185`   |
| **Journal comptable associé**  | `(Sélectionnez un journal)`     |

---

## Étape 2: Opérations Quotidiennes

Maintenant que le système est configuré, enregistrons quelques opérations.

### 2.1 Enregistrer un Chèque Reçu

Un client vous a payé par chèque.

Accédez à `Banque > Accès Rapide > Chèques`.

*   Cliquez sur **"Nouveau chèque"** et sélectionnez **"Chèque reçu"**.
*   Remplissez le formulaire :

| Champ              | Valeur                      |
| ------------------ | --------------------------- |
| **Type**           | `Reçu`                      |
| **Numéro de chèque** | `834521`                    |
| **Montant**        | `1500`                      |
| **Tiers**          | `Client A` (le nom du client) |
| **Date d'émission**| `(Date du jour)`            |
| **Date d'échéance**| `(Date du jour + 30 jours)` |
| **Compte cible**   | `Compte Courant Principal`  |

Ce chèque apparaîtra dans la liste avec le statut **"En portefeuille"**.

### 2.2 Enregistrer une Transaction Manuelle

Vous avez payé une facture par virement.

Accédez à `Banque > Accès Rapide > Transactions`.

*   Cliquez sur **"Nouvelle transaction"**.
*   Remplissez le formulaire :

| Champ                  | Valeur                          |
| ---------------------- | ------------------------------- |
| **Compte bancaire**    | `Compte Courant Principal`      |
| **Label**              | `Paiement facture Fournisseur X`|
| **Montant**            | `500`                           |
| **Type**               | `DEBIT`                         |
| **Type de transaction**| `Virement Fournisseur`          |
| **Date**               | `(Date du jour)`                |

Cette transaction apparaîra avec le statut **"Brouillon"**.
*   Cliquez sur les actions de la transaction et sélectionnez **"Valider"**. Le statut passe à **"Validé"** et le solde du compte est mis à jour.
    *   **Solde avant :** 10 000 €
    *   **Solde après :** 9 500 €

### 2.3 Gérer le Cycle de Vie d'un Chèque

Retournez à la liste des chèques.

1.  **Remise en banque** :
    *   Sur le chèque `834521`, cliquez sur les actions et sélectionnez **"Remettre en banque"**.
    *   Le statut du chèque passe à **"Remis en banque"**.
2.  **Encaissement** :
    *   Quelques jours plus tard, la banque confirme l'encaissement.
    *   Sur le même chèque, cliquez sur les actions et sélectionnez **"Encaisser"**.
    *   Le statut du chèque passe à **"Encaissé"**.
    *   **Action automatique** : Une nouvelle transaction bancaire de **+1500 €** est automatiquement créée et validée.
    *   **Solde avant :** 9 500 €
    *   **Solde après :** 11 000 €

---

## Étape 3: Rapprochement Bancaire

À la fin du mois, vous recevez votre relevé bancaire.

### 3.1 Importer un Relevé Bancaire

Accédez à `Banque > Accès Rapide > Relevés` (ou `Rapprochement`).

*   Cliquez sur **"Importer un relevé"**.
*   Sélectionnez le `Compte Courant Principal`.
*   Uploadez le fichier de relevé suivant.

**Données de test pour le fichier `releve.csv` :**

```csv
Date,Libelle,Debit,Credit
2025-12-10,PAIEMENT FACTURE FOURNISSEUR X,500.00,
2025-12-12,REMISE CHEQUE 834521,1500.00
2025-12-15,FRAIS BANCAIRES TENUE DE COMPTE,15.00,
2025-12-20,VIREMENT CLIENT B,,750.00
```

### 3.2 Effectuer le Rapprochement

*   Après l'import, cliquez sur le nouveau relevé dans la liste pour ouvrir l'écran de rapprochement.
*   L'interface affiche les lignes du relevé à gauche et les transactions du système à droite.

1.  **Rapprochement Automatique/Suggéré** :
    *   La ligne du relevé "PAIEMENT FACTURE FOURNISSEUR X" (-500 €) devrait être automatiquement suggérée ou rapprochée avec la transaction manuelle que nous avons créée. **Cliquez pour valider le rapprochement.**
    *   La ligne "REMISE CHEQUE 834521" (+1500 €) devrait être rapprochée avec la transaction générée par l'encaissement du chèque. **Cliquez pour valider.**

2.  **Création de Transaction depuis le Relevé** :
    *   La ligne "FRAIS BANCAIRES TENUE DE COMPTE" (-15 €) n'existe pas dans le système.
    *   Sur la ligne du relevé, cliquez sur le bouton **"Créer"**.
    *   Le système pré-remplit le formulaire de transaction. Attribuez-lui le type `Frais bancaires`. Validez. La ligne est maintenant rapprochée.

3.  **Rapprochement Manuel** :
    *   La ligne "VIREMENT CLIENT B" (+750 €) n'a pas de correspondance exacte.
    *   Supposons que vous aviez enregistré une transaction manuelle pour un autre montant ou avec un libellé légèrement différent.
    *   Vous pouvez sélectionner manuellement la ligne de relevé et la transaction correspondante dans les listes pour les lier.

Une fois toutes les lignes rapprochées, le statut du relevé passe à **"Rapproché"**.

---

## Étape 4: Vue d'ensemble sur le Dashboard

Retournez au dashboard principal du module `Banque`.

*   **KPIs mis à jour** :
    *   Le **Solde Total** reflète le solde final après toutes les opérations.
    *   Les compteurs de transactions et chèques en attente devraient être à 0.
*   **Alertes** : Les alertes concernant les relevés à rapprocher ont dû disparaître.
*   **Liste des comptes** : Le solde du `Compte Courant Principal` est maintenant à jour et fiable.

Cette démonstration couvre le cycle complet de la gestion bancaire dans l'application.
