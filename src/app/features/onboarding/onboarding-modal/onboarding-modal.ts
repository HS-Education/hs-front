import { Component, output, inject, ChangeDetectionStrategy, signal, computed, HostListener, OnInit, AfterViewInit } from '@angular/core';
import { UserDataService } from '../../../shared/services/user-data.service';
import { TranslocoPipe } from '@jsverse/transloco';

interface OnboardingStep {
  icon: string;
  titleKey: string;
  descKey: string;
  iconBgClass: string;
  targetId?: string;
}

@Component({
  selector: 'app-onboarding-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  template: `
    <!-- Full-screen container -->
    <div class="fixed inset-0 z-[100] animate-fade-in">
      
      <!-- SVG Backdrop with Spotlight Cutout -->
      <svg class="absolute inset-0 h-full w-full pointer-events-auto" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            @if (targetRect(); as rect) {
              <rect
                [attr.x]="rect.left - 8"
                [attr.y]="rect.top - 8"
                [attr.width]="rect.width + 16"
                [attr.height]="rect.height + 16"
                rx="8"
                fill="black"
                class="transition-all duration-300"
              />
            }
          </mask>
        </defs>
        <!-- The darkened background -->
        <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.5)" mask="url(#spotlight-mask)" />
      </svg>

      <!-- Modal Card -->
      <div 
        class="absolute bg-[var(--surface)] rounded-2xl shadow-2xl shadow-black/20 border border-[var(--border)] overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto"
        [style.width.px]="cardWidth"
        [style.top.px]="cardTop()"
        [style.left.px]="cardLeft()"
        [style.transform]="targetRect() ? 'none' : 'translate(-50%, -50%)'"
      >
        <!-- Progress bar -->
        <div class="h-1 bg-[var(--border)]">
          <div
            class="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-hover)] transition-all duration-500 ease-in-out"
            [style.width.%]="progressPercent()">
          </div>
        </div>

        <!-- Header -->
        <div class="px-6 pt-6 pb-4 text-center">
          <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-3 text-2xl"
               [class]="currentStep().iconBgClass">
            <span>{{ currentStep().icon }}</span>
          </div>
          <h2 class="text-lg font-extrabold text-[var(--text-primary)] leading-tight">
            {{ currentStep().titleKey | transloco }}
          </h2>
          <p class="mt-1.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            {{ currentStep().descKey | transloco }}
          </p>
        </div>

        <!-- Step dots -->
        <div class="flex justify-center gap-1.5 pb-2">
          @for (step of steps(); track $index) {
            <button
              type="button"
              (click)="goTo($index)"
              class="h-2 rounded-full transition-all duration-300"
              [class.w-6]="currentIndex() === $index"
              [class.bg-[var(--button-primary-bg)]]="currentIndex() === $index"
              [class.w-2]="currentIndex() !== $index"
              [class.bg-[var(--border)]]="currentIndex() !== $index"
              [style.background-color]="currentIndex() !== $index ? 'var(--text-secondary)' : ''"
              [style.opacity]="currentIndex() !== $index ? '0.2' : '1'">
            </button>
          }
        </div>

        <!-- Footer actions -->
        <div class="px-6 pb-6 pt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            (click)="prev()"
            [class.invisible]="currentIndex() === 0"
            class="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-secondary)] transition">
            {{ 'ONBOARDING.PREV' | transloco }}
          </button>

          <span class="text-[10px] text-[var(--text-secondary)]">
            {{ currentIndex() + 1 }} / {{ steps().length }}
          </span>

          @if (isLast()) {
            <button
              type="button"
              (click)="finish()"
              class="px-5 py-2 text-xs font-bold text-white bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] rounded-lg transition active:scale-[0.97] shadow-sm shadow-[var(--brand-primary)]/30">
              {{ 'ONBOARDING.FINISH' | transloco }}
            </button>
          } @else {
            <button
              type="button"
              (click)="next()"
              class="px-5 py-2 text-xs font-bold text-white bg-[var(--button-primary-bg)] hover:bg-[var(--button-primary-hover)] rounded-lg transition active:scale-[0.97] shadow-sm shadow-[var(--brand-primary)]/30">
              {{ 'ONBOARDING.NEXT' | transloco }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class OnboardingModal implements OnInit, AfterViewInit {
  readonly completed = output<void>();
  private readonly userDataService = inject(UserDataService);

  readonly currentIndex = signal(0);
  readonly windowWidth = signal(0);
  readonly windowHeight = signal(0);
  readonly targetRect = signal<DOMRect | null>(null);
  readonly cardWidth = 340;

  // Steps vary by role
  readonly steps = computed<OnboardingStep[]>(() => {
    if (this.userDataService.isAdmin()) {
      return [];
    }

    const common: OnboardingStep[] = [
      {
        icon: '👋',
        titleKey: 'ONBOARDING.WELCOME.TITLE',
        descKey: 'ONBOARDING.WELCOME.DESC',
        iconBgClass: 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
      },
      {
        icon: '🏠',
        titleKey: 'ONBOARDING.HOME.TITLE',
        descKey: 'ONBOARDING.HOME.DESC',
        iconBgClass: 'bg-[var(--color-warning-soft)]',
        targetId: 'nav-home'
      },
      {
        icon: '📚',
        titleKey: 'ONBOARDING.CLASSROOMS.TITLE',
        descKey: 'ONBOARDING.CLASSROOMS.DESC',
        iconBgClass: 'bg-[var(--color-info-soft)]',
        targetId: 'nav-classrooms'
      },
    ];

    const coordinatorExtra: OnboardingStep[] = [
      {
        icon: '📁',
        titleKey: 'ONBOARDING.REPOSITORY.TITLE',
        descKey: 'ONBOARDING.REPOSITORY.DESC',
        iconBgClass: 'bg-[var(--calendar-event-4-bg)]',
        targetId: 'nav-repository'
      },
    ];

    const chatStep: OnboardingStep = {
      icon: '🤖',
      titleKey: 'ONBOARDING.SERY.TITLE',
      descKey: 'ONBOARDING.SERY.DESC',
      iconBgClass: 'bg-[var(--color-success-soft)]',
      targetId: 'sery-bubble'
    };

    if (this.userDataService.isCoordinator() && !this.userDataService.isAdmin()) {
      return [...common, ...coordinatorExtra, chatStep];
    }
    return [...common, chatStep];
  });

  readonly currentStep = computed(() => this.steps()[this.currentIndex()]);
  readonly isLast = computed(() => this.currentIndex() === this.steps().length - 1);
  readonly progressPercent = computed(() => ((this.currentIndex() + 1) / this.steps().length) * 100);

  readonly cardTop = computed(() => {
    const rect = this.targetRect();
    const h = this.windowHeight(); // Re-evaluate when window changes
    if (!rect) {
      return h / 2; // Centered
    }
    const cardHeight = 280;
    return Math.min(Math.max(rect.top - 20, 24), h - cardHeight - 24);
  });

  readonly cardLeft = computed(() => {
    const rect = this.targetRect();
    const w = this.windowWidth(); // Re-evaluate when window changes
    if (!rect) {
      return w / 2; // Centered
    }
    const gap = 24;
    const rightPosition = rect.right + gap;
    const leftPosition = rect.left - this.cardWidth - gap;
    const preferredPosition = rightPosition + this.cardWidth <= w - gap
      ? rightPosition
      : leftPosition;
    return Math.min(Math.max(preferredPosition, gap), Math.max(gap, w - this.cardWidth - gap));
  });

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.windowWidth.set(window.innerWidth);
      this.windowHeight.set(window.innerHeight);
    }
  }

  ngAfterViewInit() {
    this.updateTargetRect();
  }

  @HostListener('window:resize')
  onResize() {
    this.windowWidth.set(window.innerWidth);
    this.windowHeight.set(window.innerHeight);
    this.updateTargetRect();
  }

  next(): void {
    if (!this.isLast()) {
      this.currentIndex.update(i => i + 1);
      setTimeout(() => this.updateTargetRect(), 0);
    }
  }

  prev(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
      setTimeout(() => this.updateTargetRect(), 0);
    }
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
    setTimeout(() => this.updateTargetRect(), 0);
  }

  finish(): void {
    this.completed.emit();
  }

  private updateTargetRect(): void {
    const step = this.currentStep();
    // Only show spotlight on desktop (lg breakpoint = 1024px in tailwind)
    if (step && step.targetId && this.windowWidth() >= 1024) {
      const el = document.getElementById(step.targetId);
      if (el) {
        this.targetRect.set(el.getBoundingClientRect());
        return;
      }
    }
    this.targetRect.set(null);
  }
}
