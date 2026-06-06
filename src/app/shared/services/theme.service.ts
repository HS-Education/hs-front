import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly themeSignal = signal<'light' | 'dark'>('light');

  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    // Load initial theme from localStorage or system preference
    const savedTheme = localStorage.getItem('hs-theme') as 'light' | 'dark';
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.themeSignal.set(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.themeSignal.set(prefersDark ? 'dark' : 'light');
    }

    // Effect to apply theme class globally on document element
    effect(() => {
      const activeTheme = this.themeSignal();
      const root = document.documentElement;
      if (activeTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('hs-theme', activeTheme);
    });
  }

  toggleTheme(): void {
    this.themeSignal.update((current) => (current === 'light' ? 'dark' : 'light'));
  }
}
