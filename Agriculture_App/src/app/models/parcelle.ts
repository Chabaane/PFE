import { Point } from './point';

export interface Parcelle {
  idParcelle: number;
  nom: string;
  geometrie: string;  // ← Changement clé : 'geometrie' au lieu de 'contourJson'
  surface: number;    // ← Note: c'est 'Surface' dans le backend
  superficie?: number;
  altitudeMoyenne?: number;
  penteMoyenne?: number;
  dateCreation: Date;
  dateModification?: Date;
  etatSynchronisation: string;
  agriculteurId: number;
}

export interface CreateParcelleDto {
  nom: string;
  contour: Point[];
  agriculteurId: number;
}

export interface UpdateParcelleDto {
  nom?: string;
  contour?: Point[];
}
