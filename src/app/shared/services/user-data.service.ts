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
  readonly loggingOut = signal(false);

  readonly isCoordinator = computed(() => {
    const roles = this.user()?.roles ?? [];
    return roles.some(role => ['COORDINATOR', 'ROLE_COORDINATOR', 'ADMIN', 'ROLE_ADMIN'].includes(role));
  });

  readonly isTeacher = computed(() => {
    const roles = this.user()?.roles ?? [];
    return roles.some(role => ['TEACHER', 'ROLE_TEACHER'].includes(role));
  });

  readonly teacherViewMode = signal<'TEACHER' | 'STUDENT'>('TEACHER');

  readonly isStudentView = computed(() => {
    const user = this.user();
    if (!user) return false;
    const hasTeacherRole = user.roles.some(role => ['TEACHER', 'ROLE_TEACHER'].includes(role));
    if (hasTeacherRole) {
      return this.teacherViewMode() === 'STUDENT';
    }
    return user.roles.some(role => ['STUDENT', 'ROLE_STUDENT'].includes(role));
  });

  toggleTeacherViewMode(): void {
    this.teacherViewMode.update((mode) => (mode === 'TEACHER' ? 'STUDENT' : 'TEACHER'));
  }

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
