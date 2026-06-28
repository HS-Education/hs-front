import {ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {interval} from 'rxjs';
import {UserDataService} from '../../services/user-data.service';
import {AuthService} from '../../../auth/services/auth.service';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {TranslocoService, TranslocoPipe} from '@jsverse/transloco';
import {ThemeService} from '../../services/theme.service';
import {NotificationService} from '../../services/notification.service';
import {Notification} from '../../models/notification.model';
import {NotificationPreference} from '../../models/notification-preference.model';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterLinkActive,
    DatePipe,
    TranslocoPipe
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar implements OnInit {
  protected readonly userDataService = inject(UserDataService);
  protected readonly themeService = inject(ThemeService);
  protected readonly translocoService = inject(TranslocoService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly userProfile = this.userDataService.userProfile;
  readonly isMobileMenuOpen = signal(false);
  
  readonly unreadNotifications = signal<Notification[]>([]);
  readonly isNotificationsOpen = signal(false);
  
  readonly isPreferencesOpen = signal(false);
  readonly notificationPreferences = signal<NotificationPreference | null>(null);
  readonly showNotificationSettings = signal(false);

  ngOnInit() {
    this.fetchNotifications();
    interval(300000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchNotifications());
  }

  fetchNotifications() {
    if (!this.userDataService.isAuthenticated()) return;
    this.notificationService.getUnreadNotifications().subscribe({
      next: (notifications) => this.unreadNotifications.set(notifications),
      error: () => {}
    });
  }

  fetchNotificationPreferences() {
    if (!this.userDataService.isAuthenticated()) return;
    this.notificationService.getPreferences().subscribe({
      next: (prefs) => this.notificationPreferences.set(prefs),
      error: () => {}
    });
  }

  toggleNotifications(): void {
    this.isNotificationsOpen.update((open) => !open);
  }

  closeNotifications(): void {
    this.isNotificationsOpen.set(false);
  }

  togglePreferences(): void {
    const willOpen = !this.isPreferencesOpen();
    this.isPreferencesOpen.set(willOpen);
    if (willOpen && !this.notificationPreferences()) {
      this.fetchNotificationPreferences();
    }
  }

  closePreferences(): void {
    this.isPreferencesOpen.set(false);
  }

  toggleNotificationPreference(key: keyof NotificationPreference): void {
    const current = this.notificationPreferences();
    if (!current) return;
    
    const updated = { ...current, [key]: !current[key] };
    this.notificationPreferences.set(updated as NotificationPreference);
    
    this.notificationService.updatePreferences(updated).subscribe({
      next: (prefs) => this.notificationPreferences.set(prefs),
      error: () => this.notificationPreferences.set(current)
    });
  }

  markAsRead(id: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.unreadNotifications.update(notifications => 
          notifications.filter(n => n.id !== id)
        );
      },
      error: () => {}
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open: boolean) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleViewMode(): void {
    this.userDataService.toggleTeacherViewMode();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  get activeLang(): string {
    return this.translocoService.getActiveLang();
  }

  setLanguage(lang: string): void {
    this.translocoService.setActiveLang(lang);
    localStorage.setItem('appLang', lang);
  }

  onLogOut(): void {
    this.userDataService.loggingOut.set(true);
    this.authService.logOut().subscribe({
      next: () => {
        this.userDataService.clearUser();
        void this.router.navigate(['/sign-in']).then(() => {
          this.userDataService.loggingOut.set(false);
        });
      },
      error: () => {
        this.userDataService.loggingOut.set(false);
      }
    });
  }
}
