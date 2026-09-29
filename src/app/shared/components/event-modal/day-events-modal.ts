import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Modal } from '../modal/modal';
import { CalendarEvent } from '../../../features/classrooms/data-access/models/calendar-event.model';

@Component({
  selector: 'app-day-events-modal',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, Modal],
  template: `
    <app-modal [isOpen]="isOpen()" [onClose]="handleClose" [title]="'CALENDAR.DAY_QUESTIONNAIRES' | transloco" widthClass="max-w-lg">
      <div class="space-y-2">
        @if (date(); as selectedDate) {
          <p class="text-xs font-medium text-[var(--text-secondary)]">{{ formatDate(selectedDate) }}</p>
        }

        <div class="space-y-2">
          @for (event of events(); track event.id) {
            <article class="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div class="p-4">
                <div class="flex items-start gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <div>
                        <span class="inline-flex rounded-md bg-[var(--brand-primary-soft)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand-primary)]">{{ 'CALENDAR.QUESTIONNAIRE' | transloco }}</span>
                        <p class="mt-1 text-sm font-extrabold text-[var(--text-primary)]">{{ event.title }}</p>
                      </div>
                      @if (event.sectionName) {
                        <span class="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                          {{ 'CALENDAR.SECTION' | transloco }} {{ event.sectionName }}
                        </span>
                      }
                    </div>

                    <div class="mt-3 flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)]/70 px-3 py-2 text-xs">
                      <svg class="h-4 w-4 shrink-0 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M7 3v4m10-4v4M5 11h14v8H5z" /></svg>
                      <span class="font-semibold text-[var(--text-secondary)]">{{ formatAcademicInfo(event) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              @if (event.navigationTarget === 'QUESTIONNAIRE' || event.navigationTarget === 'CLASSROOM_QUIZZES') {
                <div class="flex justify-end border-t border-[var(--border)] bg-[var(--bg-secondary)]/30 px-4 py-3">
                  <a
                    [routerLink]="event.navigationTarget === 'QUESTIONNAIRE'
                      ? ['/classrooms', event.courseId, 'quizzes', event.questionnaireInstanceId]
                      : ['/classrooms', event.courseId]"
                    [queryParams]="event.navigationTarget === 'CLASSROOM_QUIZZES' ? { tab: 'quizzes' } : null"
                    (click)="closed.emit()"
                    class="inline-flex items-center gap-2 rounded-lg bg-[var(--button-primary-bg)] px-3 py-2 text-xs font-bold text-[var(--button-primary-text)] transition hover:bg-[var(--button-primary-hover)]"
                  >
                    {{ 'CALENDAR.VIEW_RESULTS' | transloco }}
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7" /></svg>
                  </a>
                </div>
              }
            </article>
          }
        </div>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayEventsModal {
  protected readonly transloco = inject(TranslocoService);
  readonly isOpen = input(false);
  readonly date = input<Date | null>(null);
  readonly events = input<CalendarEvent[]>([]);
  readonly closed = output<void>();

  handleClose = () => this.closed.emit();

  formatDate(date: Date): string {
    const locale = this.transloco.getActiveLang() === 'en' ? 'en-US' : 'es-PE';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date);
  }

  formatAcademicInfo(event: CalendarEvent): string {
    const course = event.courseName ?? '';
    const grade = event.gradeLevel ? ` - ${this.formatOrdinalGrade(event.gradeLevel)}` : '';
    const level = event.educationLevel
      ? ` ${this.transloco.translate('CLASSROOMS.CARD.OF').toLowerCase()} ${this.transloco.translate(`ENUM.${event.educationLevel}`).toLowerCase()}`
      : '';

    return `${course}${grade}${level}`;
  }

  private formatOrdinalGrade(gradeLevel: string): string {
    const grades: Record<string, number> = {
      FIRST: 1,
      SECOND: 2,
      THIRD: 3,
      FOURTH: 4,
      FIFTH: 5,
      SIXTH: 6,
    };
    const number = grades[gradeLevel.toUpperCase()];
    if (!number) return gradeLevel;

    if (this.transloco.getActiveLang() === 'es') return `${number}°`;
    const suffix = number === 1 ? 'st' : number === 2 ? 'nd' : number === 3 ? 'rd' : 'th';
    return `${number}${suffix}`;
  }

}
