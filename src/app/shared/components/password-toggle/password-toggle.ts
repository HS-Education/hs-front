import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-password-toggle',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="toggle.emit()" [disabled]="disabled()"
      [attr.aria-controls]="controls()" [attr.aria-pressed]="visible()"
      [attr.aria-label]="(visible() ? 'UI_TEXT.HIDE_PASSWORD' : 'UI_TEXT.SHOW_PASSWORD') | transloco"
      [title]="(visible() ? 'UI_TEXT.HIDE_PASSWORD' : 'UI_TEXT.SHOW_PASSWORD') | transloco"
      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--brand-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] disabled:opacity-50">
      <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        @if (visible()) {
          <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.4A11.5 11.5 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.3 6.3A20 20 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.6-1.6" />
        } @else {
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        }
      </svg>
    </button>
  `,
})
export class PasswordToggle {
  readonly visible = input(false);
  readonly disabled = input(false);
  readonly controls = input.required<string>();
  readonly toggle = output<void>();
}
