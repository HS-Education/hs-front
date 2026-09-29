import { Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly translocoService = inject(TranslocoService);
  readonly toasts = signal<ToastMessage[]>([]);
  private idCounter = 0;
  private readonly coalesceWindowMs = 800;
  private readonly lastToastByType = new Map<ToastType, {
    id: number;
    message: string;
    createdAt: number;
    replaceable: boolean;
  }>();

  show(message: string, type: ToastType = 'info', replaceable = false) {
    const resolvedMessage = this.resolveMessage(message);
    const now = Date.now();
    const previous = this.lastToastByType.get(type);

    // HTTP interceptors and feature components can report the same operation in
    // the same tick. Replace only generic or truly duplicated messages so that
    // independent operations still keep their own feedback.
    if (
      previous &&
      now - previous.createdAt <= this.coalesceWindowMs &&
      (previous.replaceable || previous.message === resolvedMessage)
    ) {
      this.remove(previous.id);
    }

    const id = this.idCounter++;
    const toast: ToastMessage = { id, message: resolvedMessage, type };
    this.toasts.update(t => [...t, toast]);
    this.lastToastByType.set(type, { id, message: resolvedMessage, createdAt: now, replaceable });

    setTimeout(() => {
      this.remove(id);
    }, 4000);
  }

  success(message: string, replaceable = false) { this.show(message, 'success', replaceable); }
  error(message: string, replaceable = false) { this.show(message, 'error', replaceable); }
  warning(message: string) { this.show(message, 'warning'); }
  info(message: string) { this.show(message, 'info'); }

  remove(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));

    for (const [type, lastToast] of this.lastToastByType.entries()) {
      if (lastToast.id === id) {
        this.lastToastByType.delete(type);
      }
    }
  }

  private resolveMessage(message: string): string {
    // Final safeguard: a technical i18n key must never reach an end user.
    // Keep token characters separate from delimiters so untrusted messages
    // cannot trigger excessive regex backtracking on long inputs.
    const looksLikeTranslationKey = /^[A-Z][A-Z0-9]*(?:[._][A-Z][A-Z0-9]*)+$/.test(message);
    if (!looksLikeTranslationKey) return message;

    const translated = this.translocoService.translate(message);
    if (translated !== message) return translated;

    // Some server and legacy responses use TOAST_MESSAGE_UNAVAILABLE instead
    // of the dot notation used by Transloco. Resolve that form as well.
    const normalizedKey = message.replace(/^([A-Z][A-Z0-9]*)_/, '$1.');
    const normalizedTranslation = this.translocoService.translate(normalizedKey);
    if (normalizedTranslation !== normalizedKey) return normalizedTranslation;

    const fallbackKey = 'TOAST.MESSAGE_UNAVAILABLE';
    const fallbackTranslation = this.translocoService.translate(fallbackKey);
    if (fallbackTranslation !== fallbackKey) return fallbackTranslation;

    // This can occur before the active language file finishes loading during
    // automatic cookie-session restoration. Never expose an i18n key to users.
    return this.translocoService.getActiveLang() === 'en'
      ? 'We could not display this message. Please try again.'
      : 'No se pudo mostrar este mensaje. Inténtalo nuevamente.';
  }
}
