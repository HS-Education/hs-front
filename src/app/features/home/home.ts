import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AuthService} from '../../auth/services/auth.service';
import {UserDataService} from '../../shared/services/user-data.service';
import {Router} from '@angular/router';
import {finalize} from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly authService = inject(AuthService);
  private readonly userDataService = inject(UserDataService);
  private readonly router = inject(Router);

  readonly userProfile = this.userDataService.userProfile;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onLogOut() {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .logOut()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.userDataService.clearUser?.();
          void this.router.navigate(['/log-in']);
        },
        error: () => {
          this.errorMessage.set('No se pudo cerrar sesión. Intenta nuevamente.');
        },
      });
  }
}
