import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {UserDataService} from '../../../shared/services/user-data.service';
import {Router} from '@angular/router';
import {SignInRequest} from '../../models/sign-in.model';
import {finalize} from 'rxjs';

@Component({
  selector: 'app-sign-in',
  imports: [
    ReactiveFormsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userDataService = inject(UserDataService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.errorMessage.set('Completa todos los campos.');
      return;
    }

    this.errorMessage.set(null);
    this.loading.set(true);

    const payload: SignInRequest = {
      username: this.form.controls.username.value,
      password: this.form.controls.password.value,
    };

    this.authService.SignIn(payload)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (profile) => {
          this.userDataService.setUser(profile);
          if (profile.roles.includes('ADMIN')) {
            void this.router.navigate(['/admin/academic-years']);
          } else {
            void this.router.navigate(['/home']);
          }
        },
        error: (err: unknown) => {
          this.errorMessage.set(
            isHttpUnauthorized(err)
              ? 'Credenciales inválidas'
              : 'Error de conexión. Intenta nuevamente.'
          );
        },
      });
  }
}

function isHttpUnauthorized(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: unknown }).status === 401
  );
}
