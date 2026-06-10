import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {UserDataService} from '../../services/user-data.service';
import {AuthService} from '../../../auth/services/auth.service';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {ThemeService} from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  protected readonly userDataService = inject(UserDataService);
  protected readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userProfile = this.userDataService.userProfile;
  readonly isMobileMenuOpen = signal(false);

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
