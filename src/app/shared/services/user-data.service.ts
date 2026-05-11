import {computed, inject, Injectable, signal} from '@angular/core';
import {AuthService} from '../../auth/services/auth.service';
import {UserProfile} from '../models/user-profile.model';
import {firstValueFrom} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  private readonly authService = inject(AuthService);

  private readonly user = signal<UserProfile | null>(null);
  private readonly sessionLoaded = signal(false);

  readonly userProfile = computed(() => this.user());
  readonly isAuthenticated = computed(() => !!this.user());
  readonly isSessionLoaded = computed(() => this.sessionLoaded());

  setUser(profile: UserProfile): void {
    this.user.set(profile);
  }

  clearUser(): void {
    this.user.set(null);
  }

  async restoreSession(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.authService.me());
      this.setUser(profile);
    } catch {
      this.clearUser();
    } finally {
      this.sessionLoaded.set(true);
    }
  }
}
