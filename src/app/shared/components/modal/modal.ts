import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  imports: [TranslocoPipe],
  selector: 'app-modal',
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
        <!-- backdrop -->
        <div
          class="absolute inset-0 bg-black/50"
          (click)="handleBackdropClick()"
          aria-hidden="true"
        ></div>
 
        <!-- dialog -->
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          [class]="'relative z-10 max-h-[90vh] w-full overflow-auto rounded-xl bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-lg ' + widthClass()"
        >
          <header class="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <h3 id="modal-title" class="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">{{ title() }}</h3>
              <ng-content select="[modal-header-badge]"></ng-content>
            </div>
            <div class="flex items-center gap-3 ml-4 shrink-0">
              <ng-content select="[modal-header-right]"></ng-content>
              @if (onBack()) {
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[var(--brand-primary)] bg-[var(--brand-primary-soft)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg transition focus:outline-none cursor-pointer"
                  (click)="handleBack()"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>{{ backLabel() || ('I18N.BACK' | transloco) }}</span>
                </button>
              }
              <button
                type="button"
                [class]="'rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors focus:outline-none cursor-pointer ' + closeButtonClass()"
                (click)="close()"
                aria-label="{{ 'PROGRESS.MODALS.CLOSE' | transloco }}"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
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
  readonly onBack = input<(() => void) | null>(null);
  readonly backLabel = input<string>('');
  readonly widthClass = input<string>('max-w-3xl');
  readonly closeButtonClass = input<string>('hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]');

  close() {
    const cb = this.onClose();
    if (cb) cb();
    else console.warn('Modal: onClose callback not provided');
  }

  handleBack() {
    const cb = this.onBack();
    if (cb) cb();
  }

  handleBackdropClick() {
    this.close();
  }
}
