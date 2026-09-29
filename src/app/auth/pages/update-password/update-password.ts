import { TranslocoPipe , TranslocoService} from '@jsverse/transloco';
import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../services/auth.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';
import {ChangePasswordRequest} from '../../models/change-password.model';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-update-password',
  imports: [TranslocoPipe,
    ReactiveFormsModule,
    RouterLink
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './update-password.html',
  styleUrl: './update-password.css',
})
export class UpdatePassword implements OnInit {
  private readonly translocoService = inject(TranslocoService);
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
      this.errorMessage.set(this.translocoService.translate('UI_TEXT.COMPLETE_ALL_FIELDS_CORRECTLY'));
      return;
    }

    if (this.form.controls.newPassword.value !== this.form.controls.confirmPassword.value) {
      this.errorMessage.set(this.translocoService.translate('UI_TEXT.THE_NEW_PASSWORDS_DO_NOT_MATCH'));
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
          this.successMessage.set(this.translocoService.translate('UI_TEXT.PASSWORD_UPDATED_SUCCESSFULLY_REDIRECTING'));
          setTimeout(() => {
            void this.router.navigate(['/sign-in']);
          }, 2000);
        },
        error: () => {
          this.errorMessage.set(this.translocoService.translate('UI_TEXT.UNABLE_TO_UPDATE_YOUR_PASSWORD_CHECK_YOUR_DETAILS'));
        },
      });
  }
}
