import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {LanguageService} from '../../../../core/i18n/language.service';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CalendarEvent } from '../../data-access/models/calendar-event.model';
import { inject } from '@angular/core';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar-widget',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
  template: `
    <div class="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <!-- Calendar Header -->
      <div class="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-secondary)]/30">
        <div class="flex flex-col">
          <h3 class="text-base font-black text-[var(--text-primary)] tracking-tight capitalize">
            {{ currentMonthName() }} {{ currentYear() }}
          </h3>
          <p class="text-[9px] text-[var(--text-secondary)] font-bold tracking-wider uppercase mt-0.5">
            {{ 'CALENDAR.TITLE_SUBTITLE' | transloco }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="previousMonth()" class="p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus:outline-none">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button (click)="goToToday()" class="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition focus:outline-none">
            {{ 'CALENDAR.TODAY' | transloco }}
          </button>
          <button (click)="nextMonth()" class="p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus:outline-none">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="flex-1 p-3 lg:p-4 bg-[var(--bg-primary)]">
        <!-- Weekdays Header -->
        <div class="grid grid-cols-7 mb-1">
          @for (day of weekDays(); track day) {
            <div class="text-center text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider py-1">
              {{ day }}
            </div>
          }
        </div>

        <!-- Days Grid -->
        <div class="grid grid-cols-7 gap-1 lg:gap-1.5 auto-rows-fr">
          @for (day of calendarDays(); track day.date.toISOString()) {
            <div
              (click)="onDayClick(day)"
              [class.cursor-pointer]="day.events.length > 0"
              [class.hover:border-[var(--brand-primary)]]="day.events.length > 0"
              class="min-h-[50px] lg:min-h-[60px] rounded-lg border p-1 flex flex-col transition-colors"
              [class.bg-[var(--surface)]]="day.isCurrentMonth"
              [class.bg-[var(--bg-secondary)]]="!day.isCurrentMonth"
              [class.border-[var(--border)]]="!day.isToday"
              [class.border-[var(--brand-primary)]]="day.isToday"
              [class.shadow-sm]="day.isToday"
              [class.opacity-50]="!day.isCurrentMonth"
            >
              <!-- Day Number -->
              <div class="flex justify-between items-start mb-1 px-1">
                <span 
                  class="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full"
                  [class.text-[var(--text-primary)]]="day.isCurrentMonth && !day.isToday"
                  [class.text-[var(--text-secondary)]]="!day.isCurrentMonth"
                  [class.bg-[var(--button-primary-bg)]]="day.isToday"
                  [class.text-white]="day.isToday"
                >
                  {{ day.date.getDate() }}
                </span>
                
                @if (day.events.length > 2) {
                  <span class="text-[9px] font-bold text-[var(--text-secondary)] mt-1">+{{ day.events.length - 2 }}</span>
                }
              </div>

              <!-- Events -->
              <div class="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                @for (event of day.events.slice(0, 2); track event.id) {
                  <div 
                    class="px-1.5 py-1 text-[10px] font-bold rounded-md truncate border-l-2 pointer-events-none select-none"
                    [class]="getEventColorClasses(event)"
                    [title]="event.title"
                  >
                    {{ event.title }}
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    .custom-scrollbar::-webkit-scrollbar {
      width: 2px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: var(--border);
      border-radius: 10px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarWidget {
  readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  // Inputs
  readonly events = input<CalendarEvent[]>([]);
  readonly selectedCourseId = input<number | null>(null);
  
  // Outputs
  readonly dayClicked = output<CalendarDay>();

  // State
  readonly currentDate = signal(new Date());

  // Computed
  readonly currentYear = computed(() => this.currentDate().getFullYear());
  readonly currentMonth = computed(() => this.currentDate().getMonth());
  
  readonly currentMonthName = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.language.activeLanguage(), { month: 'long' });
    return formatter.format(this.currentDate());
  });

  readonly weekDays = computed(() => {
    const lang = this.language.activeLanguage();
    const formatter = new Intl.DateTimeFormat(lang, { weekday: 'short' });
    const days = [];
    // Start on Monday (Jan 1, 2024 was a Monday)
    for (let i = 1; i <= 7; i++) {
      days.push(formatter.format(new Date(2024, 0, i)));
    }
    return days;
  });

  readonly filteredEvents = computed(() => {
    const all = this.events();
    const courseId = this.selectedCourseId();
    if (courseId === null) return all;
    return all.filter(e => e.courseId === courseId);
  });

  readonly calendarDays = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const events = this.filteredEvents();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Adjust for Monday start (getDay() returns 0 for Sunday)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: this.isSameDay(date, today),
        events: this.getEventsForDate(date, events)
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: this.isSameDay(date, today),
        events: this.getEventsForDate(date, events)
      });
    }

    // Next month days to complete grid (42 cells = 6 weeks)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: this.isSameDay(date, today),
        events: this.getEventsForDate(date, events)
      });
    }

    return days;
  });

  // Actions
  previousMonth() {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      newDate.setMonth(d.getMonth() - 1);
      return newDate;
    });
  }

  nextMonth() {
    this.currentDate.update(d => {
      const newDate = new Date(d);
      newDate.setMonth(d.getMonth() + 1);
      return newDate;
    });
  }

  goToToday() {
    this.currentDate.set(new Date());
  }

  onDayClick(day: CalendarDay) {
    if (day.events.length > 0) {
      this.dayClicked.emit(day);
    }
  }

  // Helpers
  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  private getEventsForDate(date: Date, events: CalendarEvent[]): CalendarEvent[] {
    return events.filter(e => this.isSameDay(e.date, date));
  }

  getEventColorClasses(event: CalendarEvent): string {
    // Generate deterministic colors based on courseId
    const colors = [
      'bg-[var(--calendar-event-1-bg)] text-[var(--calendar-event-1-text)] border-[var(--calendar-event-1-border)]',
      'bg-[var(--calendar-event-2-bg)] text-[var(--calendar-event-2-text)] border-[var(--calendar-event-2-border)]',
      'bg-[var(--calendar-event-3-bg)] text-[var(--calendar-event-3-text)] border-[var(--calendar-event-3-border)]',
      'bg-[var(--calendar-event-4-bg)] text-[var(--calendar-event-4-text)] border-[var(--calendar-event-4-border)]',
      'bg-[var(--calendar-event-5-bg)] text-[var(--calendar-event-5-text)] border-[var(--calendar-event-5-border)]',
    ];
    return colors[event.courseId % colors.length];
  }
}
