import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-2xl border animate-slide-in-right max-w-sm backdrop-blur-md"
          [ngClass]="{
            'bg-[#f0fdf4]/95 text-[#166534] border-[#bbf7d0] shadow-[#166534]/10': toast.type === 'success',
            'bg-[#fef2f2]/95 text-[#b91c1c] border-[#fecaca] shadow-[#b91c1c]/10': toast.type === 'error',
            'bg-[#fefce8]/95 text-[#ca8a04] border-[#fef08a] shadow-[#ca8a04]/10': toast.type === 'warning',
            'bg-[var(--surface)]/95 text-[var(--text-primary)] border-[var(--border)] shadow-black/5': toast.type === 'info'
          }">
          
          <!-- Icon based on type -->
          <div class="shrink-0 mt-0.5">
            @switch (toast.type) {
              @case ('success') {
                <svg class="h-5 w-5 text-[#166534]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              @case ('error') {
                <svg class="h-5 w-5 text-[#b91c1c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              @case ('warning') {
                <svg class="h-5 w-5 text-[#ca8a04]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              @case ('info') {
                <svg class="h-5 w-5 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            }
          </div>

          <div class="flex-1 text-sm font-semibold tracking-wide leading-tight pt-0.5">{{ toast.message }}</div>
          
          <button (click)="toastService.remove(toast.id)" class="shrink-0 rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none">
            <svg class="h-4.5 w-4.5 opacity-70 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  protected readonly toastService = inject(ToastService);
}
