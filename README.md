# Mon Équilibre

Application mobile native de gestion financière personnelle pensée pour l'Afrique francophone.

## Principes du produit

- Android et iOS avec React Native, Expo et TypeScript.
- Fonctionnement local hors connexion après installation.
- SQLite sur l'appareil : aucun compte en ligne ni serveur financier permanent.
- Profil et devise adaptés au pays sélectionné.
- Les montants sont stockés en unités monétaires mineures, selon la précision officielle de chaque devise.
- Les transferts entre portefeuilles ne sont ni des revenus ni des dépenses.
- Les revenus attendus ne sont pas considérés comme reçus.
- Sauvegarde et restauration manuelles des données locales.

## Pays et devises

Le catalogue initial couvre 25 pays africains, notamment les pays de l'UEMOA (XOF), de la CEMAC (XAF), la RDC (CDF), la Guinée (GNF), le Maroc (MAD), la Tunisie (TND), l'Algérie (DZD), la Mauritanie (MRU), Djibouti (DJF), le Burundi (BIF), le Rwanda (RWF), Madagascar (MGA) et les Comores (KMF).

Les deux francs CFA sont distingués : XOF pour l'Afrique de l'Ouest et XAF pour l'Afrique centrale. La devise est affichée à partir du pays choisi.

## Fonctionnalités déjà développées

- Onboarding avec pays, devise et profil de revenus.
- Tableau de bord alimenté par les données locales.
- Portefeuilles : espèces, banque, Mobile Money, épargne et autres.
- Enregistrement des revenus et dépenses.
- Transferts atomiques entre portefeuilles de même devise.
- Budgets mensuels par catégorie.
- Objectifs d'épargne avec versements transférés vers un portefeuille Épargne.
- Suivi des dettes et créances avec paiements comptabilisés.
- Échéances récurrentes pour revenus et dépenses, avec confirmation manuelle avant écriture.
- Assistant financier local à règles explicables.
- Statistiques mensuelles et répartition des dépenses.
- Export et restauration d'une sauvegarde JSON locale.
- Paramètres du profil et gestion des portefeuilles.
- Vérification TypeScript et tests unitaires des conversions monétaires via GitHub Actions.

## Points encore à terminer et valider

- Suivi transport : véhicules, carburant, entretien, taxi-moto et transports publics.
- Historique des prix du carburant saisis par l'utilisateur, avec date d'application.
- Calendrier financier local pour les échéances et dépenses à anticiper.
- Calendrier financier plus complet, rappels et notifications locales.
- Import de données plus robuste, tests automatisés des calculs et migrations de base de données.
- Tests fonctionnels sur appareils Android et iPhone.
- Vérification de l'accessibilité, des tailles d'écran et des thèmes clair/sombre.
- Builds EAS et préparation de la distribution Android/iOS.

## Stack

- React Native 0.81
- Expo SDK 54
- TypeScript
- Expo Router
- expo-sqlite
- expo-file-system, expo-sharing et expo-document-picker

## Développement

Le projet utilise GitHub Actions pour lancer `npm install` puis `npm run typecheck` à chaque push sur `main` et à chaque pull request.

Les builds natifs seront produits avec EAS Build. La compilation cloud évite d'avoir besoin d'un Mac local pour générer un build iOS, mais la distribution iOS reste soumise aux exigences de signature et au programme développeur Apple.

## Confidentialité

Les données financières sont conservées localement sur l'appareil. Les sauvegardes exportées sont des fichiers contenant des informations sensibles : l'utilisateur doit les stocker dans un emplacement sûr.
