// services/indexed-db.service.ts
import { Injectable } from '@angular/core';
import { Parcelle } from './parcelle.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private dbName = 'AgriManagerDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error('Erreur IndexedDB:', event);
        reject(event);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB initialisé');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer le store pour les parcelles
        if (!db.objectStoreNames.contains('parcelles')) {
          const parcelleStore = db.createObjectStore('parcelles', { keyPath: 'id' });
          parcelleStore.createIndex('agriculteurId', 'agriculteurId', { unique: false });
          parcelleStore.createIndex('estSynchronise', 'estSynchronise', { unique: false });
        }

        // Créer le store pour les modifications offline
        if (!db.objectStoreNames.contains('modifications')) {
          db.createObjectStore('modifications', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  // Parcelles
  async ajouterParcelle(parcelle: Parcelle): Promise<void> {
    return this.withDatabase((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['parcelles'], 'readwrite');
        const store = transaction.objectStore('parcelles');
        const request = store.add(parcelle);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event);
      });
    });
  }

  async getParcelles(): Promise<Parcelle[]> {
    return this.withDatabase((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['parcelles'], 'readonly');
        const store = transaction.objectStore('parcelles');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event);
      });
    });
  }

  async getParcellesOffline(): Promise<Parcelle[]> {
    const parcelles = await this.getParcelles();
    return parcelles.filter(p => !p.estSynchronise);
  }

  async mettreAJourParcelle(parcelle: Parcelle): Promise<void> {
    return this.withDatabase((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['parcelles'], 'readwrite');
        const store = transaction.objectStore('parcelles');
        const request = store.put(parcelle);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event);
      });
    });
  }

  async supprimerParcelle(id: number): Promise<void> {
    return this.withDatabase((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['parcelles'], 'readwrite');
        const store = transaction.objectStore('parcelles');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event);
      });
    });
  }

  // Méthode utilitaire pour les opérations IndexedDB
  private async withDatabase<T>(operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
    if (!this.db) {
      await this.initDatabase();
    }

    if (!this.db) {
      throw new Error('Base de données non initialisée');
    }

    return operation(this.db);
  }
}
