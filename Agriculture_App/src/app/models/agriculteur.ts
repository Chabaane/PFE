import { Parcelle } from './parcelle';

export interface Agriculteur {
  idAgriculteur: number;
  nom: string;
  prenom: string;
  telephone: string;
  localisation: string;
  parcelles?: Parcelle[];
  dateCreation?: Date;
  dateModification?: Date;
}

export interface CreateAgriculteurDto {
  nom: string;
  prenom: string;
  telephone: string;
  localisation: string;
}

export interface UpdateAgriculteurDto {
  nom?: string;
  prenom?: string;
  telephone?: string;
  localisation?: string;
}
