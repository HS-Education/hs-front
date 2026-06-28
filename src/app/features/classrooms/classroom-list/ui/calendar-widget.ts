import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CalendarEvent } from '../../data-access/models/calendar-event.model';
import { inject } from '@angular/core';

interface CalendarDay {
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
            {{ 'CALENDAR.TITLE_SUBTITLE' | transloco: { defaultValue: 'Calendario Académico' } }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button (click)="previousMonth()" class="p-2 rounded-xl hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus:outline-none">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button (click)="goToToday()" class="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-xs font-bold text-[var(--text-primary)] transition focus:outline-none">
            {{ 'CALENDAR.TODAY' | transloco: { defaultValue: 'Hoy' } }}
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
                  [class.bg-[var(--brand-primary)]]="day.isToday"
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
                    (click)="onEventClick(event, $event)"
                    role="button"
                    tabindex="0"
                    class="px-1.5 py-1 text-[10px] font-bold rounded-md truncate cursor-pointer hover:opacity-80 transition-opacity border-l-2"
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

  // Inputs
  readonly events = input<CalendarEvent[]>([]);
  readonly selectedCourseId = input<number | null>(null);
  
  // Outputs
  readonly eventClicked = output<CalendarEvent>();

  // State
  readonly currentDate = signal(new Date());

  // Computed
  readonly currentYear = computed(() => this.currentDate().getFullYear());
  readonly currentMonth = computed(() => this.currentDate().getMonth());
  
  readonly currentMonthName = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.transloco.getActiveLang() || 'es-ES', { month: 'long' });
    return formatter.format(this.currentDate());
  });

  readonly weekDays = computed(() => {
    const lang = this.transloco.getActiveLang() || 'es-ES';
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

  onEventClick(event: CalendarEvent, clickEvent: MouseEvent) {
    clickEvent.stopPropagation();
    this.eventClicked.emit(event);
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
      'bg-blue-500/10 text-blue-700 border-blue-500 dark:bg-blue-500/20 dark:text-blue-300',
      'bg-emerald-500/10 text-emerald-700 border-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300',
      'bg-amber-500/10 text-amber-700 border-amber-500 dark:bg-amber-500/20 dark:text-amber-300',
      'bg-purple-500/10 text-purple-700 border-purple-500 dark:bg-purple-500/20 dark:text-purple-300',
      'bg-pink-500/10 text-pink-700 border-pink-500 dark:bg-pink-500/20 dark:text-pink-300',
    ];
    return colors[event.courseId % colors.length];
  }
}
