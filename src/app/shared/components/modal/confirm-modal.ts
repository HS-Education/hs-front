import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Modal } from './modal';

@Component({
  selector: 'app-confirm-modal',
  imports: [Modal],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="title()" [onClose]="onCancel">
      <div class="space-y-4">
        <p class="text-sm text-[var(--text-secondary)] leading-relaxed">{{ message() }}</p>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition" (click)="onCancel()">Cancelar</button>
          <button type="button" class="rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] px-5 py-2.5 text-xs font-bold text-white transition active:scale-[0.98]" (click)="onConfirm()">Aceptar</button>
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
  readonly onCancel = input<() => void>(() => {});
  readonly onConfirmCallback = input<() => void>(() => {});

  onConfirm() {
    const cb = this.onConfirmCallback();
    if (cb) cb();
  }
}
