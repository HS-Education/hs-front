import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center" role="presentation">
        <!-- backdrop -->
        <div
          class="absolute inset-0 bg-black/40"
          (click)="handleBackdropClick()"
          aria-hidden="true"
        ></div>

        <!-- dialog -->
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          class="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-lg"
        >
          <header class="flex items-center justify-between border-b px-4 py-3">
            <h3 id="modal-title" class="text-sm font-medium">{{ title() }}</h3>
            <button
              type="button"
              class="ml-4 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
              (click)="close()"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </header>

          <section class="p-4">
            <ng-content></ng-content>
          </section>
        </div>
      </div>
    }
  `,
  styles: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly isOpen = input.required<boolean>();
  readonly title = input<string | null>(null);
  readonly onClose = input<(() => void) | null>(null);

  close() {
    const cb = this.onClose();
    if (cb) cb();
    else console.warn('Modal: onClose callback not provided');
  }

  handleBackdropClick() {
    this.close();
  }
}
