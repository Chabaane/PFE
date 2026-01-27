import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SyncManagerService } from '../../services/offline/sync-manager';

@Component({
  selector: 'app-synchronisation-status',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './synchronisation-status.html',
  styleUrls: ['./synchronisation-status.scss']
})
export class SynchronisationStatusComponent implements OnInit {
  status: any = {};
  isOnline = true;

  constructor(private syncManager: SyncManagerService) {}

  ngOnInit(): void {
    this.syncManager.syncStatus$.subscribe(status => {
      this.status = status;
      this.isOnline = status.online;
    });
  }

  getStatusIcon(): string {
    if (this.status.isSyncing) return 'sync fa-spin';
    if (!this.isOnline) return 'wifi-slash';
    if (this.status.pendingItems > 0) return 'sync-exclamation';
    return 'wifi';
  }

  getStatusColor(): string {
    if (this.status.isSyncing) return 'text-warning';
    if (!this.isOnline) return 'text-danger';
    if (this.status.pendingItems > 0) return 'text-warning';
    return 'text-success';
  }

  getStatusText(): string {
    if (this.status.isSyncing) return 'Synchronisation en cours...';
    if (!this.isOnline) return 'Mode hors ligne';
    if (this.status.pendingItems > 0) return `${this.status.pendingItems} en attente`;
    return 'Synchronisé';
  }

  forceSync(): void {
    if (this.isOnline && !this.status.isSyncing) {
      this.syncManager.forceSync();
    }
  }
}
