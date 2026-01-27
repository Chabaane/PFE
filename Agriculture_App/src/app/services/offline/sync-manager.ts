import { Injectable } from '@angular/core';
import { StorageService } from '../offline/storage';
import { SynchronisationService } from '../api/synchronisation';
import { BehaviorSubject } from 'rxjs';

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  pendingItems: number;
  online: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SyncManagerService {
  private syncStatus = new BehaviorSubject<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    pendingItems: 0,
    online: navigator.onLine
  });

  syncStatus$ = this.syncStatus.asObservable();

  constructor(
    private storageService: StorageService,
    private syncService: SynchronisationService
  ) {
    this.initialize();
  }

  private initialize(): void {
    // Écouter les changements de connexion
    this.storageService.addOnlineListener((online) => {
      this.updateStatus({ online });

      if (online) {
        this.trySync();
      }
    });

    // Vérifier les données en attente
    this.updatePendingItems();
  }

  // Modifiez la méthode trySync
async trySync(): Promise<void> {
  if (this.syncStatus.value.isSyncing || !this.syncStatus.value.online) {
    return;
  }

  const pendingItems = this.storageService.getDonneesASynchroniser();

  if (pendingItems.length === 0) {
    return;
  }

  this.updateStatus({ isSyncing: true });

  try {
    const syncRequest = {
      deviceId: this.storageService.getDeviceId(),
      donneesLocales: pendingItems,
      lastSyncDate: this.syncStatus.value.lastSync || undefined // Change null à undefined
    };

    const response = await this.syncService.synchroniser(syncRequest).toPromise();

    // Vérifiez que response n'est pas undefined
    if (response && response.success) {
      // Marquer comme synchronisé
      pendingItems.forEach(item => {
        if (item.idLocal) {
          this.storageService.markAsSynced(item.idLocal);
        }
      });

      this.updateStatus({
        isSyncing: false,
        lastSync: new Date(),
        pendingItems: 0
      });
    } else {
      // Gérer les conflits
      console.error('Erreurs de synchronisation:', response?.conflits);
      this.updateStatus({ isSyncing: false });
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
    this.updateStatus({ isSyncing: false });
  }
}

  queueForSync(typeObjet: string, contenuJSON: string): void {
    const donneeLocale = {
      typeObjet,
      contenuJSON,
      etat: 'À synchroniser',
      deviceId: this.storageService.getDeviceId(),
      dateCreation: new Date()
    };

    this.storageService.saveDonneeLocale(donneeLocale);
    this.updatePendingItems();

    // Essayer de synchroniser immédiatement si en ligne
    if (this.syncStatus.value.online) {
      this.trySync();
    }
  }

  private updatePendingItems(): void {
    const pendingItems = this.storageService.getDonneesASynchroniser().length;
    this.updateStatus({ pendingItems });
  }

  private updateStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus.next({
      ...this.syncStatus.value,
      ...updates
    });
  }

  forceSync(): void {
    this.trySync();
  }

  clearLocalData(): void {
    this.storageService.clearSyncedData();
    this.updatePendingItems();
  }
}
