import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Modal } from './modal';

@Component({
  selector: 'app-confirm-modal',
  imports: [Modal],
  template: `
    <app-modal [isOpen]="isOpen()" [title]="title()" [onClose]="onCancel">
      <div class="space-y-4">
        <p class="text-sm text-slate-700">{{ message() }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded px-3 py-2" (click)="onCancel()">Cancelar</button>
          <button type="button" class="rounded bg-sky-600 px-4 py-2 text-white" (click)="onConfirm()">Aceptar</button>
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
