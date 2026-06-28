import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Modal } from '../modal/modal';
import { CalendarEvent } from '../../../features/classrooms/data-access/models/calendar-event.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-event-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, Modal, RouterLink],
  template: `
    <app-modal [isOpen]="isOpen()" [onClose]="handleClose" [title]="'CALENDAR.EVENT_DETAILS' | transloco: { defaultValue: 'Detalles del Evento' }">
      @if (event()) {
        <div class="space-y-6">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                [class]="getBadgeClasses(event()!.type)"
              >
                {{ getTypeName(event()!.type) }}
              </span>
              <span class="text-xs text-[var(--text-secondary)] font-medium">
                {{ event()!.date | date:'fullDate' }}
              </span>
            </div>
            <h3 class="text-xl font-black text-[var(--text-primary)] leading-tight mt-2">
              {{ event()!.title }}
            </h3>
          </div>
          
          <div class="text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-secondary)]/50 p-4 rounded-xl border border-[var(--border)]">
            {{ event()!.description }}
          </div>
          
          <div class="flex justify-end pt-4">
            <button 
              type="button" 
              (click)="close($event)" 
              class="px-5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-secondary)] transition mr-3"
            >
              {{ 'COMMON.CLOSE' | transloco: { defaultValue: 'Cerrar' } }}
            </button>
            
            <a 
              [routerLink]="['/classrooms', event()!.courseId]"
              (click)="close($event)"
              class="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold hover:bg-[var(--brand-primary-dark)] transition inline-flex items-center gap-2 shadow-sm"
            >
              {{ 'CALENDAR.GO_TO_COURSE' | transloco: { defaultValue: 'Ir al curso' } }}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
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

  getTypeName(type: string): string {
    switch (type) {
      case 'QUIZ': return 'Cuestionario';
      case 'ASSIGNMENT': return 'Entrega';
      default: return 'Evento';
    }
  }

  getBadgeClasses(type: string): string {
    switch (type) {
      case 'QUIZ': return 'bg-[var(--brand-primary)] text-white';
      case 'ASSIGNMENT': return 'bg-[var(--brand-mustard)] text-white';
      default: return 'bg-blue-600 text-white';
    }
  }
}
