import { Injectable, signal } from '@angular/core';

export type SeryInsightScope = 'area' | 'classroom';

@Injectable({ providedIn: 'root' })
export class SeryGenerationStateService {
  private readonly activeGenerations = signal<ReadonlySet<string>>(new Set());

  isGenerating(scope: SeryInsightScope, targetId: number): boolean {
    return this.activeGenerations().has(this.key(scope, targetId));
  }

  begin(scope: SeryInsightScope, targetId: number): boolean {
    const key = this.key(scope, targetId);
    let started = false;

    this.activeGenerations.update((active) => {
      if (active.has(key)) return active;
      const next = new Set(active);
      next.add(key);
      started = true;
      return next;
    });

    return started;
  }

  finish(scope: SeryInsightScope, targetId: number): void {
    const key = this.key(scope, targetId);
    this.activeGenerations.update((active) => {
      if (!active.has(key)) return active;
      const next = new Set(active);
      next.delete(key);
      return next;
    });
  }

  private key(scope: SeryInsightScope, targetId: number): string {
    return `${scope}:${targetId}`;
  }
}
