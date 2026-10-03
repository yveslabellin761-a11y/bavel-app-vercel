export interface WorldCity {
  name: string;
  region: string;
  country: string;
  fullName: string;
}

export const WORLD_LOCATIONS: WorldCity[] = [
  // Paris & Surrounding from screenshot
  { name: "Paris", region: "Paris", country: "France", fullName: "Paris, Paris, France" },
  { name: "Paris-Charles de Gaulle Airport", region: "Paris", country: "France", fullName: "Paris-Charles de Gaulle Airport, Paris, France" },
  { name: "Paris-Orly Airport", region: "Paris", country: "France", fullName: "Paris-Orly Airport, Paris, France" },
  { name: "Paris-l'Hôpital", region: "Saône-et-Loire", country: "France", fullName: "Paris-l'Hôpital, Saône-et-Loire, France" },
  { name: "Parisot", region: "Tarn", country: "France", fullName: "Parisot, Tarn, France" },
  { name: "Parisot", region: "Tarn-et-Garonne", country: "France", fullName: "Parisot, Tarn-et-Garonne, France" },
  { name: "Paris", region: "Texas", country: "États-Unis", fullName: "Paris, Texas, États-Unis" },
  { name: "Paris", region: "Tennessee", country: "États-Unis", fullName: "Paris, Tennessee, États-Unis" },
  { name: "Parish of Clarendon", region: "Clarendon", country: "Jamaïque", fullName: "Parish of Clarendon, Clarendon, Jamaïque" },
  { name: "Paris", region: "Kentucky", country: "États-Unis", fullName: "Paris, Kentucky, États-Unis" },

  // Abidjan & Côte d'Ivoire
  { name: "Abidjan", region: "Région des Lagunes", country: "Côte d'Ivoire", fullName: "Abidjan, Région des Lagunes, Côte d'Ivoire" },
  { name: "Yamoussoukro", region: "Bélier", country: "Côte d'Ivoire", fullName: "Yamoussoukro, Bélier, Côte d'Ivoire" },
  { name: "Bouaké", region: "GBêkê", country: "Côte d'Ivoire", fullName: "Bouaké, GBêkê, Côte d'Ivoire" },
  { name: "San-Pédro", region: "San-Pédro", country: "Côte d'Ivoire", fullName: "San-Pédro, San-Pédro, Côte d'Ivoire" },
  { name: "Korhogo", region: "Poro", country: "Côte d'Ivoire", fullName: "Korhogo, Poro, Côte d'Ivoire" },
  { name: "Daloa", region: "Haut-Sassandra", country: "Côte d'Ivoire", fullName: "Daloa, Haut-Sassandra, Côte d'Ivoire" },
  { name: "Man", region: "Tonkpi", country: "Côte d'Ivoire", fullName: "Man, Tonkpi, Côte d'Ivoire" },
  { name: "Gagnoa", region: "Gôh", country: "Côte d'Ivoire", fullName: "Gagnoa, Gôh, Côte d'Ivoire" },

  // Major French cities
  { name: "Le Mans", region: "Sarthe", country: "France", fullName: "Le Mans, Sarthe, France" },
  { name: "Lyon", region: "Rhône", country: "France", fullName: "Lyon, Rhône, France" },
  { name: "Marseille", region: "Bouches-du-Rhône", country: "France", fullName: "Marseille, Bouches-du-Rhône, France" },
  { name: "Bordeaux", region: "Gironde", country: "France", fullName: "Bordeaux, Gironde, France" },
  { name: "Toulouse", region: "Haute-Garonne", country: "France", fullName: "Toulouse, Haute-Garonne, France" },
  { name: "Nice", region: "Alpes-Maritimes", country: "France", fullName: "Nice, Alpes-Maritimes, France" },
  { name: "Nantes", region: "Loire-Atlantique", country: "France", fullName: "Nantes, Loire-Atlantique, France" },
  { name: "Strasbourg", region: "Bas-Rhin", country: "France", fullName: "Strasbourg, Bas-Rhin, France" },
  { name: "Montpellier", region: "Hérault", country: "France", fullName: "Montpellier, Hérault, France" },
  { name: "Lille", region: "Nord", country: "France", fullName: "Lille, Nord, France" },
  { name: "Rennes", region: "Ille-et-Vilaine", country: "France", fullName: "Rennes, Ille-et-Vilaine, France" },
  { name: "Reims", region: "Marne", country: "France", fullName: "Reims, Marne, France" },
  { name: "Toulon", region: "Var", country: "France", fullName: "Toulon, Var, France" },
  { name: "Saint-Étienne", region: "Loire", country: "France", fullName: "Saint-Étienne, Loire, France" },
  { name: "Le Havre", region: "Seine-Maritime", country: "France", fullName: "Le Havre, Seine-Maritime, France" },
  { name: "Grenoble", region: "Isère", country: "France", fullName: "Grenoble, Isère, France" },
  { name: "Dijon", region: "Côte-d'Or", country: "France", fullName: "Dijon, Côte-d'Or, France" },
  { name: "Angers", region: "Maine-et-Loire", country: "France", fullName: "Angers, Maine-et-Loire, France" },
  { name: "Nîmes", region: "Gard", country: "France", fullName: "Nîmes, Gard, France" },
  { name: "Aix-en-Provence", region: "Bouches-du-Rhône", country: "France", fullName: "Aix-en-Provence, Bouches-du-Rhône, France" },

  // Africa (Senegal, Cameroon, Mali, Togo, Benin, Congo, Gabon, Morocco, Tunisia, Algeria, etc.)
  { name: "Dakar", region: "Région de Dakar", country: "Sénégal", fullName: "Dakar, Région de Dakar, Sénégal" },
  { name: "Saint-Louis", region: "Saint-Louis", country: "Sénégal", fullName: "Saint-Louis, Saint-Louis, Sénégal" },
  { name: "Douala", region: "Littoral", country: "Cameroun", fullName: "Douala, Littoral, Cameroun" },
  { name: "Yaoundé", region: "Centre", country: "Cameroun", fullName: "Yaoundé, Centre, Cameroun" },
  { name: "Bamako", region: "District de Bamako", country: "Mali", fullName: "Bamako, District de Bamako, Mali" },
  { name: "Lomé", region: "Région Maritime", country: "Togo", fullName: "Lomé, Région Maritime, Togo" },
  { name: "Cotonou", region: "Littoral", country: "Bénin", fullName: "Cotonou, Littoral, Bénin" },
  { name: "Ouagadougou", region: "Centre", country: "Burkina Faso", fullName: "Ouagadougou, Centre, Burkina Faso" },
  { name: "Kinshasa", region: "Kinshasa", country: "RDC", fullName: "Kinshasa, Kinshasa, RDC" },
  { name: "Brazzaville", region: "Brazzaville", country: "Congo", fullName: "Brazzaville, Brazzaville, Congo" },
  { name: "Libreville", region: "Estuaire", country: "Gabon", fullName: "Libreville, Estuaire, Gabon" },
  { name: "Conakry", region: "Région de Conakry", country: "Guinée", fullName: "Conakry, Région de Conakry, Guinée" },
  { name: "Casablanca", region: "Casablanca-Settat", country: "Maroc", fullName: "Casablanca, Casablanca-Settat, Maroc" },
  { name: "Rabat", region: "Rabat-Salé-Kénitra", country: "Maroc", fullName: "Rabat, Rabat-Salé-Kénitra, Maroc" },
  { name: "Marrakech", region: "Marrakech-Safi", country: "Maroc", fullName: "Marrakech, Marrakech-Safi, Maroc" },
  { name: "Tunis", region: "Gouvernorat de Tunis", country: "Tunisie", fullName: "Tunis, Gouvernorat de Tunis, Tunisie" },
  { name: "Alger", region: "Wilaya d'Alger", country: "Algérie", fullName: "Alger, Wilaya d'Alger, Algérie" },
  { name: "Oran", region: "Wilaya d'Oran", country: "Algérie", fullName: "Oran, Wilaya d'Oran, Algérie" },

  // Americas & Europe & Asia
  { name: "Montréal", region: "Québec", country: "Canada", fullName: "Montréal, Québec, Canada" },
  { name: "Québec", region: "Québec", country: "Canada", fullName: "Québec, Québec, Canada" },
  { name: "Bruxelles", region: "Bruxelles-Capitale", country: "Belgique", fullName: "Bruxelles, Région de Bruxelles-Capitale, Belgique" },
  { name: "Genève", region: "Canton de Genève", country: "Suisse", fullName: "Genève, Canton de Genève, Suisse" },
  { name: "Lausanne", region: "Vaud", country: "Suisse", fullName: "Lausanne, Vaud, Suisse" },
  { name: "Londres", region: "Greater London", country: "Royaume-Uni", fullName: "Londres, Greater London, Royaume-Uni" },
  { name: "New York", region: "New York", country: "États-Unis", fullName: "New York, New York, États-Unis" },
  { name: "Los Angeles", region: "Californie", country: "États-Unis", fullName: "Los Angeles, Californie, États-Unis" },
  { name: "Miami", region: "Floride", country: "États-Unis", fullName: "Miami, Floride, États-Unis" },
  { name: "Madrid", region: "Communauté de Madrid", country: "Espagne", fullName: "Madrid, Communauté de Madrid, Espagne" },
  { name: "Barcelone", region: "Catalogne", country: "Espagne", fullName: "Barcelone, Catalogne, Espagne" },
  { name: "Rome", region: "Latium", country: "Italie", fullName: "Rome, Latium, Italie" },
  { name: "Berlin", region: "Berlin", country: "Allemagne", fullName: "Berlin, Berlin, Allemagne" },
  { name: "Tokyo", region: "Tokyo", country: "Japon", fullName: "Tokyo, Tokyo, Japon" }
];

export function searchLocations(query: string): WorldCity[] {
  const q = query.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!q) return [];

  const matched = WORLD_LOCATIONS.filter(item => {
    const fn = item.fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return fn.includes(q);
  });

  if (matched.length > 0) return matched;

  // Fallback for custom search queries anywhere in the world
  const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
  return [
    {
      name: capitalized,
      region: "Région Principale",
      country: "International",
      fullName: `${capitalized}, Région Principale, International`
    },
    {
      name: `${capitalized}-Aéroport`,
      region: "International",
      country: "International",
      fullName: `${capitalized}-Aéroport International`
    }
  ];
}
