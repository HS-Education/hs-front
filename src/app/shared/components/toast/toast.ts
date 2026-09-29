import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass, TranslocoPipe],
  template: `
    <div
      class="pointer-events-none fixed inset-x-4 bottom-4 z-[9999] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[24rem]"
      aria-live="polite"
      aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="animate-slide-in-right pointer-events-auto flex items-start gap-3 rounded-2xl border border-l-4 border-[var(--border)] bg-[var(--surface)]/95 p-4 text-[var(--text-primary)] shadow-2xl shadow-black/10 backdrop-blur-xl"
          role="status"
          [ngClass]="{
            'border-l-[var(--brand-forest)]': toast.type === 'success',
            'border-l-[var(--brand-error)]': toast.type === 'error',
            'border-l-[var(--brand-mustard)]': toast.type === 'warning',
            'border-l-[var(--brand-primary)]': toast.type === 'info'
          }">

          <div
            class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            [ngClass]="{
              'bg-[var(--brand-forest)]/15 text-[var(--brand-forest)]': toast.type === 'success',
              'bg-[var(--brand-error)]/15 text-[var(--brand-error)]': toast.type === 'error',
              'bg-[var(--brand-mustard)]/15 text-[var(--brand-mustard)]': toast.type === 'warning',
              'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]': toast.type === 'info'
            }">
            @switch (toast.type) {
              @case ('success') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              @case ('error') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              @case ('warning') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              @case ('info') {
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            }
          </div>

          <div class="flex-1 pt-1.5 text-sm font-semibold leading-snug text-[var(--text-primary)]">{{ toast.message }}</div>

          <button
            type="button"
            (click)="toastService.remove(toast.id)"
            class="shrink-0 rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
            [attr.aria-label]="'COMMON.CLOSE' | transloco">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    @keyframes slide-in-right {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in-right {
      animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      .animate-slide-in-right { animation: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  protected readonly toastService = inject(ToastService);
}
