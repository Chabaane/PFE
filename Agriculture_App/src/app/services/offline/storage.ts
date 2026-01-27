import { Injectable } from '@angular/core';
import { DonneeLocale } from '../../models/sync-request';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'agriculture_offline_data';
  private readonly DEVICE_ID_KEY = 'agriculture_device_id';

  constructor() {
    this.initializeDeviceId();
  }

  private initializeDeviceId(): void {
    if (!this.getDeviceId()) {
      const deviceId = this.generateDeviceId();
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
  }

  private generateDeviceId(): string {
    return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getDeviceId(): string {
    return localStorage.getItem(this.DEVICE_ID_KEY) || '';
  }

  saveDonneeLocale(donnee: DonneeLocale): void {
    const donnees = this.getDonneesLocales();
    donnee.idLocal = donnees.length + 1;
    donnee.dateCreation = new Date();
    donnees.push(donnee);
    this.saveDonneesLocales(donnees);
  }

  getDonneesLocales(): DonneeLocale[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  getDonneesASynchroniser(): DonneeLocale[] {
    const donnees = this.getDonneesLocales();
    return donnees.filter(d => d.etat === 'À synchroniser');
  }

  updateDonneeLocale(id: number, updates: Partial<DonneeLocale>): void {
    const donnees = this.getDonneesLocales();
    const index = donnees.findIndex(d => d.idLocal === id);

    if (index !== -1) {
      donnees[index] = { ...donnees[index], ...updates };
      this.saveDonneesLocales(donnees);
    }
  }

  markAsSynced(id: number): void {
    this.updateDonneeLocale(id, {
      etat: 'Synchronisé',
      dateSynchronisation: new Date()
    });
  }

  clearSyncedData(): void {
    const donnees = this.getDonneesLocales();
    const pending = donnees.filter(d => d.etat === 'À synchroniser');
    this.saveDonneesLocales(pending);
  }

  private saveDonneesLocales(donnees: DonneeLocale[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(donnees));
  }

  isOnline(): boolean {
    return navigator.onLine;
  }

  addOnlineListener(callback: (online: boolean) => void): void {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}
