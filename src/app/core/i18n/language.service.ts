import {DOCUMENT} from '@angular/common';
import {effect, inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {TranslocoService} from '@jsverse/transloco';
import {firstValueFrom} from 'rxjs';

export type AppLanguage = 'es' | 'en';

export function storedLanguage(): AppLanguage {
  return localStorage.getItem('appLang') === 'en' ? 'en' : 'es';
}

@Injectable({providedIn: 'root'})
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private selectionVersion = 0;
  readonly activeLanguage = toSignal(this.transloco.langChanges$, {initialValue: storedLanguage()});

  constructor() {
    effect(() => {
      const language = this.activeLanguage();
      this.document.documentElement.lang = language;
      localStorage.setItem('appLang', language);
    });
  }

  async initialize(): Promise<void> {
    await firstValueFrom(this.transloco.load(storedLanguage()));
  }

  async setLanguage(language: AppLanguage): Promise<void> {
    const version = ++this.selectionVersion;
    await firstValueFrom(this.transloco.load(language));
    if (version === this.selectionVersion) this.transloco.setActiveLang(language);
  }
}
