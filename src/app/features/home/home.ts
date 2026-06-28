import {ChangeDetectionStrategy, Component, inject, OnInit, signal, computed} from '@angular/core';
import {UserDataService} from '../../shared/services/user-data.service';
import {RouterModule} from '@angular/router';
import {ClassroomService} from '../classrooms/data-access/classroom.service';
import {Classroom} from '../classrooms/data-access/models/responses/classroom.model';
import {DatePipe} from '@angular/common';
import {TranslateEnumPipe} from '../../shared/pipes/translate-enum.pipe';
import {TranslocoPipe} from '@jsverse/transloco';
import {CalendarEvent} from '../classrooms/data-access/models/calendar-event.model';
import {CalendarWidget} from '../classrooms/classroom-list/ui/calendar-widget';
import {EventModal} from '../../shared/components/event-modal/event-modal';

export interface RecentActivity {
  id: number;
  type: 'INSIGHT' | 'DOCUMENT' | 'SYSTEM' | 'STUDENT_CHAT' | 'STUDENT_COURSE';
  titleKey: string;
  descriptionKey: string;
  timestamp: Date;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, DatePipe, TranslateEnumPipe, TranslocoPipe, CalendarWidget, EventModal],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit {
  protected readonly userDataService = inject(UserDataService);
  private readonly classroomService = inject(ClassroomService);

  readonly userProfile = this.userDataService.userProfile;
  readonly classrooms = signal<Classroom[]>([]);
  readonly loading = signal(true);

  // Determine Active Dashboard
  readonly activeDashboard = computed(() => {
    if (this.userDataService.isAdmin() || this.userDataService.isCoordinator()) {
      if (this.userDataService.teacherViewMode() === 'STUDENT') return 'STUDENT';
      return 'COORDINATOR';
    }
    if (this.userDataService.isTeacher()) {
      if (this.userDataService.teacherViewMode() === 'STUDENT') return 'STUDENT';
      return 'TEACHER';
    }
    return 'STUDENT';
  });

  // Computed KPIs
  readonly totalClassrooms = computed(() => this.classrooms().length);
  readonly totalCourses = computed(() => {
    const courseIds = new Set(this.classrooms().map(c => c.courseId));
    return courseIds.size;
  });

  // Mock Recent Activity (Dynamically filtered by dashboard)
  readonly allRecentActivity = signal<RecentActivity[]>([
    {
      id: 1,
      type: 'INSIGHT',
      titleKey: 'HOME.ACTIVITY.INSIGHT_TITLE',
      descriptionKey: 'HOME.ACTIVITY.INSIGHT_DESC',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      icon: 'M13 10V3L4 14h7v7l9-11h-7z'
    },
    {
      id: 2,
      type: 'DOCUMENT',
      titleKey: 'HOME.ACTIVITY.DOC_TITLE',
      descriptionKey: 'HOME.ACTIVITY.DOC_DESC',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      id: 3,
      type: 'SYSTEM',
      titleKey: 'HOME.ACTIVITY.SYS_TITLE',
      descriptionKey: 'HOME.ACTIVITY.SYS_DESC',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
    },
    {
      id: 4,
      type: 'STUDENT_CHAT',
      titleKey: 'HOME.ACTIVITY.CHAT_TITLE',
      descriptionKey: 'HOME.ACTIVITY.CHAT_DESC',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    },
    {
      id: 5,
      type: 'STUDENT_COURSE',
      titleKey: 'HOME.ACTIVITY.COURSE_TITLE',
      descriptionKey: 'HOME.ACTIVITY.COURSE_DESC',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
    }
  ]);

  readonly recentActivity = computed(() => {
    const dashboard = this.activeDashboard();
    const activities = this.allRecentActivity();
    
    if (dashboard === 'STUDENT') {
      return activities.filter(a => a.type === 'STUDENT_CHAT' || a.type === 'STUDENT_COURSE');
    } else if (dashboard === 'TEACHER') {
      return activities.filter(a => a.type === 'INSIGHT' || a.type === 'DOCUMENT' || a.type === 'STUDENT_CHAT');
    } else {
      // Coordinator / Admin
      return activities.filter(a => a.type === 'INSIGHT' || a.type === 'DOCUMENT' || a.type === 'SYSTEM');
    }
  });

  // Calendar State
  readonly selectedCourseIdFilter = signal<number | null>(null);
  readonly isModalOpen = signal<boolean>(false);
  readonly selectedEvent = signal<CalendarEvent | null>(null);

  // Computed Mock Events based on classrooms
  readonly mockEvents = computed<CalendarEvent[]>(() => {
    const list = this.classrooms();
    if (!list || list.length === 0) return [];
    
    const events: CalendarEvent[] = [];
    const today = new Date();
    
    // Generate some stable fake events based on course IDs
    list.forEach((course, index) => {
      // Event 1: A Quiz coming up in a few days
      const d1 = new Date(today);
      d1.setDate(today.getDate() + (index % 5) + 2);
      events.push({
        id: `event-${course.id}-1`,
        title: `Cuestionario Semanal - ${course.courseName.substring(0, 15)}...`,
        description: `Evaluación correspondiente a la unidad actual del curso ${course.courseName}. Asegúrate de repasar los últimos documentos subidos al repositorio.`,
        date: d1,
        courseId: course.id,
        type: 'QUIZ'
      });

      // Event 2: An Assignment that was due a few days ago
      const d2 = new Date(today);
      d2.setDate(today.getDate() - (index % 4) - 1);
      events.push({
        id: `event-${course.id}-2`,
        title: `Entrega de Proyecto`,
        description: `Fecha límite para la entrega de la asignación principal del bimestre.`,
        date: d2,
        courseId: course.id,
        type: 'ASSIGNMENT'
      });
      
      // Event 3: A general event today for the first course
      if (index === 0) {
        events.push({
          id: `event-${course.id}-3`,
          title: `Revisión de Notas`,
          description: `El profesor publicará las notas finales del mes hoy.`,
          date: today,
          courseId: course.id,
          type: 'EVENT'
        });
      }
    });

    return events;
  });

  openEventModal(event: CalendarEvent) {
    this.selectedEvent.set(event);
    this.isModalOpen.set(true);
  }

  closeEventModal() {
    this.isModalOpen.set(false);
    setTimeout(() => this.selectedEvent.set(null), 300); // clear after animation
  }

  ngOnInit() {
    this.loadClassrooms();
  }

  private loadClassrooms() {
    const user = this.userProfile();
    if (!user) {
      this.loading.set(false);
      return;
    }

    this.classroomService.getClassrooms(user.id).subscribe({
      next: (data) => {
        this.classrooms.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
