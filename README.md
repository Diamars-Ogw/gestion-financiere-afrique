# Mon Budget

Application mobile native de gestion financière personnelle pensée pour l'Afrique francophone.

## Principes du produit

- Android et iOS avec React Native, Expo et TypeScript.
- Fonctionnement local hors connexion après installation.
- SQLite sur l'appareil : aucun compte en ligne ni serveur financier permanent.
- Profil et devise adaptés au pays sélectionné.
- Montants stockés en unités monétaires mineures, avec conversion décimale exacte selon la précision de chaque devise.
- Les transferts entre portefeuilles ne sont ni des revenus ni des dépenses.
- Les revenus attendus ne sont pas considérés comme reçus.
- Sauvegarde et restauration manuelles des données locales.
- Rappels locaux facultatifs, sans serveur.

## Pays et devises

Le catalogue initial couvre 25 pays africains, notamment les pays de l'UEMOA (XOF), de la CEMAC (XAF), la RDC (CDF), la Guinée (GNF), le Maroc (MAD), la Tunisie (TND), l'Algérie (DZD), la Mauritanie (MRU), Djibouti (DJF), le Burundi (BIF), le Rwanda (RWF), Madagascar (MGA) et les Comores (KMF).

Les deux francs CFA sont distingués : XOF pour l'Afrique de l'Ouest et XAF pour l'Afrique centrale. La devise est affichée à partir du pays choisi. Les montants sont rejetés si leur précision dépasse celle de la devise.

## Fonctionnalités développées

- Onboarding en étapes avec pays, devise, profil de revenus, choix initial entre Mobile Money, espèces ou banque, et solde facultatif.
- Tableau de bord alimenté par les données locales.
- Portefeuilles : espèces, banque, Mobile Money, épargne et autres.
- Revenus, dépenses et transferts entre portefeuilles de même devise.
- Avertissement si une dépense dépasse le solde suivi ; les transferts restent bloqués si le solde source est insuffisant.
- Budgets mensuels par catégorie.
- Objectifs d'épargne avec versements transférés vers un portefeuille Épargne.
- Suivi des dettes et créances avec paiements comptabilisés.
- Échéances récurrentes pour revenus et dépenses, avec confirmation manuelle avant écriture.
- Assistant financier local à règles explicables.
- Statistiques mensuelles et répartition des dépenses.
- Suivi transport : véhicules, carburant, entretien, taxi-moto et transports publics.
- Historique des prix du carburant saisis par l'utilisateur, avec date d'application.
- Calendrier financier et rappels locaux facultatifs à 9 h.
- Export et restauration d'un fichier de sauvegarde local, incluant les données transport et calendrier. Les anciennes sauvegardes Mon Équilibre restent reconnues.
- Paramètres du profil et gestion des portefeuilles.
- Thèmes clair et sombre au choix (Réglages > Apparence), police Plus Jakarta Sans embarquée, solde masquable, tableau de bord avec anneau d'épargne et graphique par catégorie.

## Vérifications automatisées

GitHub Actions exécute :
- npm run typecheck : vérification TypeScript.
- npm test : tests des conversions monétaires, des dates et des contrastes des thèmes.
- npm run check:bundle : export du bundle Android Expo.
- Un rapport npm audit sur les dépendances.

## Points encore à terminer et valider

- Amélioration des fonctions de modification et de gestion de l'historique.
- Import de sauvegarde plus strict et tests des migrations SQLite.
- Vérification complète de l'accessibilité et des petites tailles d'écran.
- Valider le rendu des thèmes clair et sombre sur appareils Android et iPhone (palettes testées automatiquement pour le contraste).
- Tests fonctionnels sur appareils Android et iPhone.
- Configuration du projet EAS, compilation APK et préparation de la distribution.
- Préparation de la distribution iOS, soumise aux exigences de signature et au programme développeur Apple.

## Stack

- React Native 0.81
- Expo SDK 54
- TypeScript
- Expo Router
- expo-sqlite
- expo-notifications
- expo-file-system, expo-sharing et expo-document-picker
- expo-linear-gradient, react-native-svg et @expo-google-fonts/plus-jakarta-sans (interface)

## Développement

Installer les dépendances avec npm install, puis lancer npm run typecheck, npm test et npm run check:bundle.

Les builds natifs seront produits avec EAS Build. La compilation cloud évite d'avoir besoin d'un Mac local pour générer un build iOS, mais la distribution iOS reste soumise aux exigences de signature et au programme développeur Apple.

## Confidentialité

Les données financières sont conservées localement sur l'appareil. Les sauvegardes exportées sont des fichiers contenant des informations sensibles : l'utilisateur doit les stocker dans un emplacement sûr.
