import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Modal } from './modal';

@Component({
  selector: 'app-confirm-modal',
  imports: [Modal],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="title()" [onClose]="onCancel()">
      <div class="space-y-4">
        <p class="text-sm text-[var(--text-secondary)] leading-relaxed">{{ message() }}</p>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" [disabled]="loading()" class="rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed" (click)="handleCancel()">Cancelar</button>
          <button type="button" [disabled]="loading()" class="rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] px-5 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2" (click)="onConfirm()">
            @if (loading()) {
              <svg class="h-3.5 w-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Enviando...</span>
            } @else {
              Aceptar
            }
          </button>
        </div>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmModal {
  readonly isOpen = input.required<boolean>();
  readonly title = input<string | null>(null);
  readonly message = input<string | null>(null);
  readonly loading = input<boolean>(false);
  readonly onCancel = input<() => void>(() => {});
  readonly onConfirmCallback = input<() => void>(() => {});

  handleCancel() {
    const cb = this.onCancel();
    if (cb) cb();
  }

  onConfirm() {
    const cb = this.onConfirmCallback();
    if (cb) cb();
  }
}
