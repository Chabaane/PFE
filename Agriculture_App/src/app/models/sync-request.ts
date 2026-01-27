export interface SyncRequest {
  deviceId: string;
  donneesLocales: DonneeLocale[];
  lastSyncDate?: Date; // Rend nullable avec ?
}

export interface DonneeLocale {
  idLocal?: number;
  typeObjet: string;
  contenuJSON: string;
  etat: string;
  deviceId: string;
  dateCreation: Date;
  dateSynchronisation?: Date;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  objetsTraites: number;
  conflits?: Conflit[];
}

export interface Conflit {
  idObjet: number;
  typeObjet: string;
  message: string;
}
