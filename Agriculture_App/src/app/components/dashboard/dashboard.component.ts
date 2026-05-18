import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/api/auth.service';
import { ChatComponent } from '../chat/chat.component';
import { LanguageSwitcherComponent } from 'src/app/components/language-switcher/language-switcher.component';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ChatComponent,
    LanguageSwitcherComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  sidebarCollapsed = false;
  mobileSidebarOpen = false;

  private routerSub?: Subscription;
  private readonly MOBILE_BREAKPOINT = 991;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    const saved = localStorage.getItem('sidebarCollapsed');
    this.sidebarCollapsed = saved === 'true';
  }

  ngOnInit(): void {
    // Fermer la sidebar mobile à chaque navigation
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.mobileSidebarOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  // ---- Toggle sidebar ----
  toggleSidebar(): void {
    if (window.innerWidth <= this.MOBILE_BREAKPOINT) {
      this.toggleMobileSidebar();
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
    }
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  // Fermer la sidebar mobile si on clique hors de la sidebar (Escape)
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.mobileSidebarOpen) {
      this.mobileSidebarOpen = false;
    }
  }

  // ---- Auth ----
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getUserName(): string {
    const user = (this.authService as any).currentUserSubject?.value;
    return user?.nom || 'Utilisateur';
  }


  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
