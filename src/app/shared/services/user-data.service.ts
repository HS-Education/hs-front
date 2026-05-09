import {computed, inject, Injectable, signal} from '@angular/core';
import {AuthService} from '../../auth/services/auth.service';
import {UserProfile} from '../models/user-profile.model';

@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  private readonly authService = inject(AuthService);
  private readonly user = signal<UserProfile | null>(null);

  readonly userProfile = computed(() => this.user());
  readonly isAuthenticated = computed(() => !!this.user());

  setUser(profile: UserProfile): void {
    this.user.set(profile);
  }

  clearUser(): void {
    this.user.set(null);
  }

  restoreSession(): void {
    this.authService.me().subscribe({
      next: (profile) => {
        this.setUser(profile);
      },
      error: () => {
        this.clearUser();
      },
    });
  }
}
