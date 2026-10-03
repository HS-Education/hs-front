import {LocalizedDatePipe} from '../../pipes/localized-date.pipe';
import {ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef, ElementRef, HostListener} from '@angular/core';
import {UserDataService} from '../../services/user-data.service';
import {AuthService} from '../../../auth/services/auth.service';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {TranslocoService, TranslocoPipe} from '@jsverse/transloco';
import {ThemeService} from '../../services/theme.service';
import {NotificationService} from '../../services/notification.service';
import {Notification} from '../../models/notification.model';
import {NotificationPreference} from '../../models/notification-preference.model';

import {LanguageService, AppLanguage} from '../../../core/i18n/language.service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterLinkActive,
    LocalizedDatePipe,
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
  private readonly language = inject(LanguageService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  protected readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly userProfile = this.userDataService.userProfile;
  readonly isMobileMenuOpen = signal(false);
  
  readonly unreadNotifications = signal<Notification[]>([]);
  readonly isNotificationsOpen = signal(false);
  
  readonly isPreferencesOpen = signal(false);
  readonly isLanguageMenuOpen = signal(false);
  readonly isThemeMenuOpen = signal(false);
  readonly notificationPreferences = signal<NotificationPreference | null>(null);
  readonly showNotificationSettings = signal(false);

  ngOnInit() {
    this.fetchNotifications();
    const user = this.userDataService.userProfile();
    const disconnectRealtime = user
      ? this.notificationService.connectRealtime((notification) => {
          this.unreadNotifications.update((current) => [notification, ...current.filter((n) => n.id !== notification.id)]);
        }, () => this.fetchNotifications())
      : undefined;
    this.destroyRef.onDestroy(() => disconnectRealtime?.());
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
    if (willOpen && !this.userDataService.isAdmin() && !this.notificationPreferences()) {
      this.fetchNotificationPreferences();
    }
  }

  closePreferences(): void {
    this.isPreferencesOpen.set(false);
    this.isLanguageMenuOpen.set(false);
    this.isThemeMenuOpen.set(false);
  }

  toggleThemeMenu(): void {
    const shouldOpen = !this.isThemeMenuOpen();
    this.isThemeMenuOpen.set(shouldOpen);
    if (shouldOpen) this.isLanguageMenuOpen.set(false);
  }

  toggleLanguageMenu(): void {
    const shouldOpen = !this.isLanguageMenuOpen();
    this.isLanguageMenuOpen.set(shouldOpen);
    if (shouldOpen) this.isThemeMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  closeUtilityPanelsOnOutsideClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeNotifications();
      this.closePreferences();
    }
  }

  onPreferencesPanelClick(event: MouseEvent): void {
    event.stopPropagation();
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!target.closest('[data-theme-dropdown]')) this.isThemeMenuOpen.set(false);
    if (!target.closest('[data-language-dropdown]')) this.isLanguageMenuOpen.set(false);
  }

  toggleNotificationPreference(key: keyof NotificationPreference): void {
    const current = this.notificationPreferences();
    if (!current) return;
    
    const updated = { ...current, [key]: !current[key] };
    const { userId: _userId, ...request } = updated;
    this.notificationPreferences.set(updated as NotificationPreference);
    
    this.notificationService.updatePreferences(request).subscribe({
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

  setTheme(theme: 'light' | 'dark'): void {
    this.themeService.setTheme(theme);
    this.isThemeMenuOpen.set(false);
  }

  get activeLang(): string {
    return this.language.activeLanguage();
  }

  setLanguage(lang: string): void {
    if (lang !== 'es' && lang !== 'en') return;
    void this.language.setLanguage(lang as AppLanguage);
    this.isLanguageMenuOpen.set(false);
  }

  onLogOut(): void {
    if (this.userDataService.loggingOut()) return;
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
