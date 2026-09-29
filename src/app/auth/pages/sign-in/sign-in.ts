import { TranslocoPipe , TranslocoService} from '@jsverse/transloco';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {UserDataService} from '../../../shared/services/user-data.service';
import {Router} from '@angular/router';
import {SignInRequest} from '../../models/sign-in.model';
import {finalize} from 'rxjs';

@Component({
  selector: 'app-sign-in',
  imports: [TranslocoPipe,
    ReactiveFormsModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private readonly translocoService = inject(TranslocoService);
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
      this.errorMessage.set(this.translocoService.translate('UI_TEXT.COMPLETE_ALL_FIELDS'));
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
          if (isPasswordUpdateRequired(err)) {
            void this.router.navigate(['/update-password'], { queryParams: { username: this.form.controls.username.value } });
            return;
          }
          this.errorMessage.set(
            isHttpUnauthorized(err)
              ? this.translocoService.translate('UI_TEXT.INVALID_CREDENTIALS')
              : this.translocoService.translate('UI_TEXT.CONNECTION_ERROR_PLEASE_TRY_AGAIN')
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

function isPasswordUpdateRequired(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: unknown }).status === 403 &&
    'error' in err &&
    typeof (err as { error?: unknown }).error === 'object' &&
    (err as { error?: { reason?: string } }).error !== null &&
    ((err as any).error.reason === 'TEMPORARY_PASSWORD' || (err as any).error.reason === 'PASSWORD_EXPIRED')
  );
}
