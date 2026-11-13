export interface CountryOption {
  label: string;
  code: string;
  currency: string;
  currencyLabel: string;
}

export const COUNTRIES: CountryOption[] = [
  { label: "Bénin", code: "BJ", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Burkina Faso", code: "BF", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Côte d'Ivoire", code: "CI", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Guinée-Bissau", code: "GW", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Mali", code: "ML", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Niger", code: "NE", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Sénégal", code: "SN", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Togo", code: "TG", currency: "XOF", currencyLabel: "Franc CFA d'Afrique de l'Ouest" },
  { label: "Cameroun", code: "CM", currency: "XAF", currencyLabel: "Franc CFA d'Afrique centrale" },
  { label: "République centrafricaine", code: "CF", currency: "XAF", currencyLabel: "Franc CFA d'Afrique centrale" },
  { label: "Tchad", code: "TD", currency: "XAF", currencyLabel: "Franc CFA d'Afrique centrale" },
  { label: "République du Congo", code: "CG", currency: "XAF", currencyLabel: "Franc CFA d'Afrique centrale" },
  { label: "Gabon", code: "GA", currency: "XAF", currencyLabel: "Franc CFA d'Afrique centrale" },
  { label: "Guinée équatoriale", code: "GQ", currency: "XAF", currencyLabel: "Franc CFA d'Afrique centrale" },
  { label: "République démocratique du Congo", code: "CD", currency: "CDF", currencyLabel: "Franc congolais" },
  { label: "Guinée", code: "GN", currency: "GNF", currencyLabel: "Franc guinéen" },
  { label: "Maroc", code: "MA", currency: "MAD", currencyLabel: "Dirham marocain" },
  { label: "Tunisie", code: "TN", currency: "TND", currencyLabel: "Dinar tunisien" },
  { label: "Algérie", code: "DZ", currency: "DZD", currencyLabel: "Dinar algérien" },
  { label: "Mauritanie", code: "MR", currency: "MRU", currencyLabel: "Ouguiya mauritanienne" },
  { label: "Djibouti", code: "DJ", currency: "DJF", currencyLabel: "Franc djiboutien" },
  { label: "Burundi", code: "BI", currency: "BIF", currencyLabel: "Franc burundais" },
  { label: "Rwanda", code: "RW", currency: "RWF", currencyLabel: "Franc rwandais" },
  { label: "Madagascar", code: "MG", currency: "MGA", currencyLabel: "Ariary malgache" },
  { label: "Comores", code: "KM", currency: "KMF", currencyLabel: "Franc comorien" },
];
