export interface DonneesMeteo {
  idDonnee: number;
  dateHeure: Date;
  temperature: number;
  humidite: number;
  pression: number;
  vitesseVent: number;
  directionVent: string;
  pluviometrie: number;
  rayonnementSolaire: number;
  stationMeteoId?: number;
}
