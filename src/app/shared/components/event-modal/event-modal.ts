import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {LocalizedDatePipe} from '../../pipes/localized-date.pipe';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Modal } from '../modal/modal';
import { CalendarEvent } from '../../../features/classrooms/data-access/models/calendar-event.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [CommonModule, LocalizedDatePipe, TranslocoPipe, Modal, RouterLink],
  template: `
    <app-modal [isOpen]="isOpen()" [onClose]="handleClose" [title]="'CALENDAR.EVENT_DETAILS' | transloco">
      @if (event()) {
        <div class="space-y-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                [class]="getBadgeClasses(event()!.type)"
              >
                {{ getTypeName(event()!.type) | transloco }}
              </span>
              <span class="text-xs text-[var(--text-secondary)] font-medium">
                {{ event()!.date | localizedDate:'fullDate' }}
              </span>
            </div>
            <h3 class="text-xl font-black text-[var(--text-primary)] leading-tight mt-1">
              {{ event()!.title }}
            </h3>
          </div>
          
          <div class="text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border)]">
            {{ event()!.description }}
          </div>
          
          <div class="flex justify-end pt-2">
            <button 
              type="button" 
              (click)="close()"
              class="px-5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-secondary)] transition mr-3"
            >
              {{ 'COMMON.CLOSE' | transloco: { defaultValue: ('PROGRESS.MODALS.CLOSE' | transloco) } }}
            </button>
            
            @if (event()!.navigationTarget !== 'NONE') {
            <a 
              [routerLink]="getRoute(event()!)"
              [queryParams]="getQueryParams(event()!)"
              (click)="navigate()"
              class="px-5 py-2 rounded-xl bg-[var(--button-primary-bg)] text-white text-xs font-bold hover:bg-[var(--button-primary-hover)] transition inline-flex items-center gap-2 shadow-sm"
            >
              {{ event()!.type === 'QUIZ'
                ? (event()!.navigationTarget === 'QUESTIONNAIRE'
                    ? ('CALENDAR.GO_TO_QUESTIONNAIRE' | transloco)
                    : ('CALENDAR.VIEW_QUESTIONNAIRES' | transloco))
                : ('CALENDAR.GO_TO_COURSE' | transloco) }}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
            }
          </div>
        </div>
      }
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventModal {
  readonly isOpen = input<boolean>(false);
  readonly event = input<CalendarEvent | null>(null);
  
  readonly closed = output<void>();

  handleClose = () => {
    this.closed.emit();
  };

  close(e?: Event) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    this.closed.emit();
  }

  /** Closes the overlay without cancelling the router link navigation. */
  navigate() {
    this.closed.emit();
  }

  getRoute(event: CalendarEvent): unknown[] {
    if (event.navigationTarget === 'QUESTIONNAIRE' && (event.questionnaireInstanceId || event.questionnaireId)) {
      return ['/classrooms', event.courseId, 'quizzes', event.questionnaireInstanceId ?? event.questionnaireId];
    }
    return ['/classrooms', event.courseId];
  }

  getQueryParams(event: CalendarEvent): { tab: string } | null {
    return event.navigationTarget === 'CLASSROOM_QUIZZES' ? { tab: 'quizzes' } : null;
  }

  getTypeName(type: string): string {
    switch (type) {
      case 'QUIZ': return 'CALENDAR.QUESTIONNAIRE';
      case 'ASSIGNMENT': return 'I18N.SUBMISSION';
      default: return 'I18N.EVENT';
    }
  }

  getBadgeClasses(type: string): string {
    switch (type) {
      case 'QUIZ': return 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]';
      case 'ASSIGNMENT': return 'bg-[var(--color-warning)] text-[var(--text-primary)]';
      default: return 'bg-[var(--color-info)] text-[var(--text-primary)]';
    }
  }
}
