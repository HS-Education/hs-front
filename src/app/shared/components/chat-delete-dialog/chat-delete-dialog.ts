import {ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild} from '@angular/core';
import {TranslocoPipe} from '@jsverse/transloco';
import {ChatSession} from '../../../features/chat/data-access/models/chat-session.model';

let nextDialogId = 0;

@Component({
  selector: 'app-chat-delete-dialog',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog [attr.aria-labelledby]="titleId" [attr.aria-describedby]="descriptionId"
      [attr.aria-busy]="loading()" (cancel)="cancel($event)" (click)="backdrop($event)"
      class="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--text-primary)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div class="p-6 sm:p-7">
        <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-error)]/10 text-[var(--brand-error)]">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" />
          </svg>
        </div>
        <h2 [id]="titleId" class="text-lg font-extrabold">{{ 'CHAT.MODAL.DELETE_TITLE' | transloco }}</h2>
        <p class="mt-2 text-sm font-bold text-[var(--brand-primary)]">{{ 'CHAT.SESSION_PREFIX' | transloco }}{{ session()?.sessionNumber }}</p>
        <p [id]="descriptionId" class="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{{ 'CHAT.MODAL.DELETE_DESCRIPTION' | transloco }}</p>
        @if (error()) {
          <p role="alert" class="mt-4 rounded-xl bg-[var(--brand-error)]/10 p-3 text-sm text-[var(--brand-error)]">{{ 'CHAT.MODAL.DELETE_ERR' | transloco }}</p>
        }
      </div>
      <footer class="flex flex-wrap justify-end gap-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]/40 px-6 py-4">
        <button type="button" autofocus [disabled]="loading()" (click)="cancel()" class="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--bg-secondary)] disabled:opacity-50">{{ 'PROGRESS.MODALS.CANCEL' | transloco }}</button>
        <button type="button" [disabled]="loading()" (click)="confirm()" class="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-error)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
          @if (loading()) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true"></span> }
          {{ (loading() ? 'CHAT.MODAL.DELETING' : 'CHAT.BTN_DELETE_SESSION') | transloco }}
        </button>
      </footer>
    </dialog>
  `,
})
export class ChatDeleteDialog {
  readonly session = input<ChatSession | null>(null);
  readonly loading = input(false);
  readonly error = input(false);
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();
  readonly titleId = `chat-delete-title-${nextDialogId++}`;
  readonly descriptionId = `${this.titleId}-description`;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (!element) return;
      if (this.session() && !element.open) element.showModal();
      else if (!this.session() && element.open) element.close();
    });
  }

  cancel(event?: Event): void {
    event?.preventDefault();
    if (!this.loading()) this.cancelled.emit();
  }

  confirm(): void { if (!this.loading()) this.confirmed.emit(); }

  backdrop(event: MouseEvent): void {
    const element = this.dialog()?.nativeElement;
    if (!element || event.target !== element) return;
    const bounds = element.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.cancel();
  }
}
