import {ChangeDetectionStrategy, Component, inject, signal, OnInit, DestroyRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {interval} from 'rxjs';
import {UserDataService} from '../../services/user-data.service';
import {AuthService} from '../../../auth/services/auth.service';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {ThemeService} from '../../services/theme.service';
import {NotificationService} from '../../services/notification.service';
import {Notification} from '../../models/notification.model';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    DatePipe
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar implements OnInit {
  protected readonly userDataService = inject(UserDataService);
  protected readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly userProfile = this.userDataService.userProfile;
  readonly isMobileMenuOpen = signal(false);
  
  readonly unreadNotifications = signal<Notification[]>([]);
  readonly isNotificationsOpen = signal(false);
  
  readonly isPreferencesOpen = signal(false);

  ngOnInit() {
    this.fetchNotifications();
    interval(60000)
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

  toggleNotifications(): void {
    this.isNotificationsOpen.update((open) => !open);
  }

  closeNotifications(): void {
    this.isNotificationsOpen.set(false);
  }

  togglePreferences(): void {
    this.isPreferencesOpen.update(open => !open);
  }

  closePreferences(): void {
    this.isPreferencesOpen.set(false);
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
