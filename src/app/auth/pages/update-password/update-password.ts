import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {ChangePasswordRequest} from '../../models/change-password.model';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-update-password',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './update-password.html',
  styleUrl: './update-password.css',
})
export class UpdatePassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    oldPassword: ['', [Validators.required]],
    newPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).*$/)
      ]
    ],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const username = this.route.snapshot.queryParamMap.get('username');
    if (username) {
      this.form.controls.username.setValue(username);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.errorMessage.set('Completa todos los campos correctamente.');
      return;
    }

    if (this.form.controls.newPassword.value !== this.form.controls.confirmPassword.value) {
      this.errorMessage.set('Las nuevas contraseñas no coinciden.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loading.set(true);

    const payload: ChangePasswordRequest = {
      username: this.form.controls.username.value,
      oldPassword: this.form.controls.oldPassword.value,
      newPassword: this.form.controls.newPassword.value,
    };

    this.authService.changePassword(payload)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.successMessage.set('Contraseña actualizada correctamente. Redirigiendo...');
          setTimeout(() => {
            void this.router.navigate(['/sign-in']);
          }, 2000);
        },
        error: (err: unknown) => {
          if (
            typeof err === 'object' &&
            err !== null &&
            'error' in err &&
            typeof (err as { error?: unknown }).error === 'object' &&
            (err as { error?: { message?: string } }).error !== null &&
            (err as any).error.message
          ) {
            this.errorMessage.set((err as any).error.message);
          } else {
            this.errorMessage.set('Error al actualizar la contraseña. Verifica tus datos e intenta nuevamente.');
          }
        },
      });
  }
}
