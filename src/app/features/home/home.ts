import {ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed, effect} from '@angular/core';
import {UserDataService} from '../../shared/services/user-data.service';
import {RouterModule} from '@angular/router';
import {ClassroomService} from '../classrooms/data-access/classroom.service';
import {Classroom} from '../classrooms/data-access/models/responses/classroom.model';
import {TranslateEnumPipe} from '../../shared/pipes/translate-enum.pipe';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';
import {CalendarEvent} from '../classrooms/data-access/models/calendar-event.model';
import {CalendarDay, CalendarWidget} from '../classrooms/classroom-list/ui/calendar-widget';
import {DayEventsModal} from '../../shared/components/event-modal/day-events-modal';
import {QuestionnaireService, AvailableQuestionnaire} from '../classrooms/data-access/questionnaire.service';
import {Document} from '../classrooms/data-access/models/responses/document.model';
import {SeryBubbleService} from '../../shared/components/sery-bubble/sery-bubble.service';
import {forkJoin} from 'rxjs';
import {TutorialService, PlatformTutorial} from '../help/data-access/tutorial.service';
import {toSignal} from '@angular/core/rxjs-interop';

export interface RecentActivity {
  id: string;
  type: 'QUIZ' | 'DOCUMENT' | 'TUTORIAL';
  titleKey: string;
  titleParams?: Record<string, string | number>;
  description: string;
  descriptionKey?: string;
  timestamp: Date;
  icon: string;
  route: Array<string | number>;
  queryParams?: Record<string, string | number>;
}

@Component({
  selector: 'app-home',
  imports: [RouterModule, TranslateEnumPipe, TranslocoPipe, CalendarWidget, DayEventsModal],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit, OnDestroy {
  protected readonly userDataService = inject(UserDataService);
  private readonly classroomService = inject(ClassroomService);
  private readonly questionnaireService = inject(QuestionnaireService);
  private readonly translocoService = inject(TranslocoService);
  private readonly seryBubbleService = inject(SeryBubbleService);
  private readonly tutorialService = inject(TutorialService);
  private readonly activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  formatActivityDay(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  formatActivityTime(date: Date): string {
    return new Intl.DateTimeFormat(this.activeLanguage() === 'es' ? 'es-PE' : 'en-US', {
      hour: '2-digit', minute: '2-digit',
    }).format(date);
  }

  constructor() {
    effect(() => {
      const isFiltered = this.selectedCourseIdFilter() !== null;
      this.seryBubbleService.setCourseFiltered(isFiltered);
    });
  }

  ngOnDestroy(): void {
    this.seryBubbleService.setCourseFiltered(false);
  }

  openSeryBubble(): void {
    this.seryBubbleService.open();
  }

  readonly userProfile = this.userDataService.userProfile;
  readonly classrooms = signal<Classroom[]>([]);
  readonly questionnaires = signal<AvailableQuestionnaire[]>([]);
  readonly classroomDocuments = signal<Array<{ classroom: Classroom; document: Document }>>([]);
  readonly tutorials = signal<PlatformTutorial[]>([]);
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

  readonly recentActivity = computed(() => {
    const classroomByCourse = new Map(this.classrooms().map(c => [c.courseId, c]));
    const canUseGlobalRepository = this.userDataService.isCoordinator()
      && !this.userDataService.isAdmin()
      && !this.userDataService.isStudentView();
    const quizActivities: RecentActivity[] = this.questionnaires()
      .filter(q => !!q.createdAt && classroomByCourse.has(q.courseId))
      .map(q => {
        const latestAttempt = [...q.pastAttempts]
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
        const wasCompleted = !!latestAttempt;

        return {
          id: `quiz-${q.id}`,
          type: 'QUIZ',
          titleKey: wasCompleted ? 'HOME.ACTIVITY.QUIZ_COMPLETED' : 'HOME.ACTIVITY.QUIZ_GENERATED',
          titleParams: { week: q.weekNumber },
          description: classroomByCourse.get(q.courseId)!.courseName,
          timestamp: new Date(wasCompleted ? latestAttempt.submittedAt : q.createdAt!),
          icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9l-4-4H9zM9 5v4h4M9 14l2 2 4-4',
          route: latestAttempt
            ? ['/classrooms', classroomByCourse.get(q.courseId)!.id, 'quizzes', latestAttempt.instanceId]
            : ['/classrooms', classroomByCourse.get(q.courseId)!.id],
          queryParams: latestAttempt ? undefined : { tab: 'quizzes', questionnaireId: q.id },
        };
      });

    const documentActivities: RecentActivity[] = this.classroomDocuments()
      .filter(item => !!item.document.createdAt)
      .map(item => ({
        id: `document-${item.document.id}`,
        type: 'DOCUMENT',
        titleKey: 'HOME.ACTIVITY.DOCUMENT_UPLOADED',
        titleParams: { title: item.document.title },
        description: item.classroom.courseName,
        timestamp: new Date(item.document.createdAt!),
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        route: canUseGlobalRepository ? ['/repository'] : ['/classrooms', item.classroom.id],
        queryParams: canUseGlobalRepository ? undefined : { tab: 'repo' },
      }));

    const tutorialActivities: RecentActivity[] = this.tutorials()
      .filter(tutorial => !!tutorial.createdAt)
      .map(tutorial => ({
        id: `tutorial-${tutorial.id}`,
        type: 'TUTORIAL' as const,
        titleKey: 'HOME.ACTIVITY.TUTORIAL_CREATED',
        titleParams: { title: tutorial.title },
        description: '',
        descriptionKey: 'HOME.ACTIVITY.HELP_CENTER',
        timestamp: new Date(tutorial.createdAt),
        route: ['/help'],
        queryParams: { tutorial: tutorial.id },
        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
      }));

    return [...quizActivities, ...documentActivities, ...tutorialActivities]
      .filter(activity => !Number.isNaN(activity.timestamp.getTime()))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  });

  readonly recentActivityGroups = computed(() => {
    const groups = new Map<string, { date: Date; activities: RecentActivity[] }>();
    for (const activity of this.recentActivity()) {
      const key = `${activity.timestamp.getFullYear()}-${activity.timestamp.getMonth()}-${activity.timestamp.getDate()}`;
      const group = groups.get(key) ?? { date: activity.timestamp, activities: [] };
      group.activities.push(activity);
      groups.set(key, group);
    }
    return [...groups.values()];
  });

  // Calendar State
  readonly selectedCourseIdFilter = signal<number | null>(null);
  readonly selectedCalendarDay = signal<CalendarDay | null>(null);

  // Eventos reales: únicamente cuestionarios devueltos por el backend.
  readonly calendarEvents = computed<CalendarEvent[]>(() => {
    this.activeLanguage();
    const classrooms = this.classrooms();
    const classroomByCourse = new Map(classrooms.map(c => [c.courseId, c]));
    const roles = this.userProfile()?.roles ?? [];
    const isStudentOnly = roles.some(role => ['STUDENT', 'ROLE_STUDENT'].includes(role))
      && !roles.some(role => ['TEACHER', 'ROLE_TEACHER', 'COORDINATOR', 'ROLE_COORDINATOR', 'ADMIN', 'ROLE_ADMIN'].includes(role));
    const isCoordinatorTeacherStudentView = !this.userDataService.isAdmin()
      && this.userDataService.isCoordinator()
      && this.userDataService.isTeacher()
      && this.userDataService.teacherViewMode() === 'STUDENT';

    return this.questionnaires()
      .filter(q => classroomByCourse.has(q.courseId))
      .map(q => {
        const classroom = classroomByCourse.get(q.courseId)!;
        const latestAttempt = [...q.pastAttempts]
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
        return {
          id: `quiz-${q.id}`,
          questionnaireId: q.id,
          // Solo un intento enviado tiene vista de resultados. Uno activo se abre desde la lista para reanudarlo.
          questionnaireInstanceId: latestAttempt?.instanceId ?? null,
          title: this.translocoService.translate('HOME.CALENDAR.QUIZ_TITLE', { week: q.weekNumber }),
          courseName: classroom.courseName,
          description: '',
          date: q.createdAt ? new Date(q.createdAt) : new Date(),
          courseId: classroom.id,
          type: 'QUIZ' as const,
          navigationTarget: isStudentOnly && latestAttempt
            ? 'QUESTIONNAIRE'
            : isCoordinatorTeacherStudentView
              ? 'CLASSROOM_QUIZZES'
              : 'NONE',
          sectionName: classroom.section.name,
          educationLevel: classroom.section.educationLevel,
          gradeLevel: classroom.section.gradeLevel,
        };
      });
  });

  openDayEventsModal(day: CalendarDay) {
    this.selectedCalendarDay.set(day);
  }

  closeDayEventsModal() {
    this.selectedCalendarDay.set(null);
  }

  ngOnInit() {
    this.loadClassrooms();
    this.tutorialService.getAll().subscribe({
      next: tutorials => this.tutorials.set(tutorials),
      error: () => this.tutorials.set([])
    });
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
        this.questionnaireService.getAvailableQuestionnaires().subscribe({
          next: questionnaires => this.questionnaires.set(questionnaires),
          error: () => this.questionnaires.set([])
        });
        this.loadClassroomDocuments(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private loadClassroomDocuments(classrooms: Classroom[]) {
    if (classrooms.length === 0) return;

    forkJoin(classrooms.map(classroom =>
      this.classroomService.getClassroomDocuments(classroom.courseId)
    )).subscribe({
      next: documentLists => this.classroomDocuments.set(
        documentLists.flatMap((documents, index) =>
          documents.map(document => ({ classroom: classrooms[index]!, document }))
        )
      ),
      error: () => this.classroomDocuments.set([])
    });
  }
}
