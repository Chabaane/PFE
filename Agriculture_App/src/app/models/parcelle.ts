import { Point } from './point';

export interface Parcelle {
  idParcelle: number;
  nom: string;
  contourJson: string;
  contour?: Point[];
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
