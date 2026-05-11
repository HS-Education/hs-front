import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {UserDataService} from '../../services/user-data.service';
import {AuthService} from '../../../auth/services/auth.service';
import {Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  protected readonly userDataService = inject(UserDataService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly userProfile = this.userDataService.userProfile;

  onLogOut(): void {
    this.authService.logOut().subscribe({
      next: () => {
        this.userDataService.clearUser();
        void this.router.navigate(['/sign-in']);
      },
    });
  }
}
