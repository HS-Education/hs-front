import {computed, inject, Injectable, signal, NgZone} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../../auth/services/auth.service';
import {UserProfile} from '../models/user-profile.model';
import {firstValueFrom} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

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

  readonly isAdmin = computed(() => {
    const roles = this.user()?.roles ?? [];
    return roles.some(role => ['ADMIN', 'ROLE_ADMIN'].includes(role));
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

  readonly isTakingQuiz = signal(false);
  private quizChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.quizChannel = new BroadcastChannel('quiz_state_channel');
      
      this.quizChannel.onmessage = (event) => {
        this.ngZone.run(() => {
          if (event.data && typeof event.data.isTakingQuiz === 'boolean') {
            this.isTakingQuiz.set(event.data.isTakingQuiz);
            if (event.data.isTakingQuiz && this.router.url.includes('/chat')) {
              this.router.navigate(['/classrooms']);
            }
          } else if (event.data && event.data.type === 'REQUEST_STATE') {
            if (this.isTakingQuiz()) {
              this.quizChannel?.postMessage({ isTakingQuiz: this.isTakingQuiz() });
            }
          }
        });
      };

      this.quizChannel.postMessage({ type: 'REQUEST_STATE' });
    }
  }

  setTakingQuiz(state: boolean): void {
    this.isTakingQuiz.set(state);
    if (this.quizChannel) {
      this.quizChannel.postMessage({ isTakingQuiz: state });
    }
  }
}
