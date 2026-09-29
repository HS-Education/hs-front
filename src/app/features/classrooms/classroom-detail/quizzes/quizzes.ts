import {LanguageService} from '../../../../core/i18n/language.service';
import {LocalizedDatePipe} from '../../../../shared/pipes/localized-date.pipe';
import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal, effect} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {UserDataService} from '../../../../shared/services/user-data.service';
import {ActivatedRoute, Router} from '@angular/router';
import {QuestionnaireService, AvailableQuestionnaire, Question, QuestionnaireSubmission, QuestionnaireAttempt} from '../../data-access/questionnaire.service';
import {ClassroomService} from '../../data-access/classroom.service';
import {Topic} from '../../data-access/models/responses/topic.model';
import {BIMESTER_OPTIONS} from '../../../../shared/models/academic-levels.model';
import {FormsModule} from '@angular/forms';
import {NgClass, DecimalPipe} from '@angular/common';
import {MarkdownMathPipe} from '../../../../shared/pipes/markdown-math.pipe';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ToastService} from '../../../../shared/services/toast.service';
import {ConfirmModal} from '../../../../shared/components/modal/confirm-modal';
import {Modal} from '../../../../shared/components/modal/modal';
import {TranslocoPipe, TranslocoService} from '@jsverse/transloco';
import {OnboardingService} from '../../../onboarding/data-access/onboarding.service';
import {StyledSelectDirective} from '../../../../shared/directives/styled-select.directive';
import {EMPTY, Subscription, timer} from 'rxjs';
import {catchError, switchMap, takeWhile} from 'rxjs/operators';

interface MockStudentGrade {
  name: string;
  grades: number[];
  final: number;
}

@Component({
  selector: 'app-quizzes',
  imports: [FormsModule, NgClass, LocalizedDatePipe, DecimalPipe, MarkdownMathPipe, ConfirmModal, Modal, TranslocoPipe, StyledSelectDirective],
  templateUrl: './quizzes.html',
  styleUrl: './quizzes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quizzes implements OnInit {
  private readonly language = inject(LanguageService);
  private translate(key: string, params?: Record<string, unknown>): string {
    this.language.activeLanguage();
    return this.translocoService.translate(key, params);
  }
  protected readonly userDataService = inject(UserDataService);
  private readonly questionnaireService = inject(QuestionnaireService);
  private readonly classroomService = inject(ClassroomService);
  protected readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly translocoService = inject(TranslocoService);
  private readonly onboardingService = inject(OnboardingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly courseId = input.required<number>();
  readonly classroomId = input.required<number>();

  // State Signals
  readonly allQuizzes = signal<AvailableQuestionnaire[]>([]);
  readonly loadingQuizzes = signal(true);
  readonly viewState = signal<'LIST' | 'TAKING_QUIZ' | 'VIEW_RESULTS'>('LIST');

  // Quiz-taking Signals
  readonly currentQuizInstanceId = signal<number | null>(null);
  readonly activeQuiz = signal<AvailableQuestionnaire | null>(null);
  readonly quizQuestions = signal<Question[]>([]);
  readonly currentQuestionIndex = signal<number>(0);
  readonly selectedAnswers = signal<{[key: number]: number}>({});
  readonly answeredCount = computed(() => Object.keys(this.selectedAnswers()).length);
  readonly submitting = signal(false);
  private readonly quizWeek = signal<number | null>(null);
  readonly quizName = computed(() => this.quizWeek() === null ? '' : this.translate('I18N.WEEK_QUIZ', {week: this.quizWeek()}));

  // Results Signals
  readonly results = signal<QuestionnaireSubmission | null>(null);
  readonly loadingResults = signal(false);
  readonly retryingFeedback = signal(false);
  readonly selectedResultIdx = signal<number>(0);
  private feedbackPolling?: Subscription;

  scoreColor(score: number): string {
    if (score >= 18) return 'var(--progress-excellent)';
    if (score >= 16) return 'var(--progress-achieved)';
    if (score >= 13) return 'var(--progress-in-process)';
    return 'var(--progress-reinforce)';
  }

  // Expand State Signal
  readonly expandedQuizId = signal<number | null>(null);

  // Onboarding
  readonly showOnboardingBanner = signal(false);

  // Loading state for starting/retrying a quiz
  readonly startingQuizId = signal<number | null>(null);
  readonly studentViewStartModalOpen = signal(false);
  readonly isClassroomTeacher = signal(false);
  readonly isStudentViewSimulation = computed(() =>
    !this.userDataService.isAdmin()
    && (this.userDataService.isTeacher() || this.userDataService.isCoordinator())
    && this.userDataService.teacherViewMode() === 'STUDENT'
  );
  readonly canTeacherGenerate = computed(() =>
    this.isClassroomTeacher() && this.userDataService.isTeacher() && !this.userDataService.isCoordinator()
  );

  // Confirm Modal signals
  readonly confirmModalOpen = signal(false);
  readonly confirmModalTitle = signal('');
  readonly confirmModalMessage = signal('');
  readonly confirmAction = signal<() => void>(() => {});

  private answersStorageKey(instanceId: number): string {
    return `hs-quiz-answers-${instanceId}`;
  }

  private restoreAnswers(instanceId: number, questions: Question[]): void {
    try {
      const saved = localStorage.getItem(this.answersStorageKey(instanceId));
      const answers = saved ? JSON.parse(saved) as Record<string, number> : {};
      const validAnswers: {[key: number]: number} = {};
      for (const question of questions) {
        const answer = answers[String(question.id)];
        if (Number.isInteger(answer) && answer >= 0 && answer < question.options.length) {
          validAnswers[question.id] = answer;
        }
      }
      this.selectedAnswers.set(validAnswers);
    } catch {
      this.selectedAnswers.set({});
    }
  }

  private saveAnswers(instanceId: number, answers: {[key: number]: number}): void {
    localStorage.setItem(this.answersStorageKey(instanceId), JSON.stringify(answers));
  }

  private clearSavedAnswers(instanceId: number): void {
    localStorage.removeItem(this.answersStorageKey(instanceId));
  }

  closeConfirmModal = (): void => this.confirmModalOpen.set(false);
  closeStudentViewStartModal = (): void => this.studentViewStartModalOpen.set(false);

  toggleQuizExpand(quizId: number): void {
    this.expandedQuizId.update(id => id === quizId ? null : quizId);
  }

  getBimesterNameForPeriod(periodId: number): string {
    const period = this.gradingPeriods().find(p => p.id === periodId);
    if (!period) return this.translate('I18N.PERIOD', {number: periodId});
    return this.getBimesterLabel(period.bimester);
  }

  getBimesterOrder(bimester: string): number {
    if (!bimester) return 99;
    const upper = bimester.toUpperCase();
    if (upper.includes('1') || upper.includes('FIRST') || upper.includes('PRIMER')) return 1;
    if (upper.includes('2') || upper.includes('SECOND') || upper.includes('SEGUND')) return 2;
    if (upper.includes('3') || upper.includes('THIRD') || upper.includes('TERCER')) return 3;
    if (upper.includes('4') || upper.includes('FOURTH') || upper.includes('CUART')) return 4;
    return 99;
  }

  // Teacher / Generation Signals
  readonly generating = signal(false);
  readonly genGradingPeriodId = signal<number | null>(null);
  readonly genWeek = signal<number | null>(null);
  readonly gradingPeriods = signal<Array<{ id: number; bimester: string; status?: 'PLANNED' | 'ACTIVE' | 'FINISHED' }>>([]);
  readonly gradingPeriodsLoaded = signal(false);
  readonly topics = signal<Topic[]>([]);
  readonly topicsLoaded = signal(false);

  readonly sortedGradingPeriods = computed(() => {
    return [...this.gradingPeriods()].sort((a, b) => this.getBimesterOrder(a.bimester) - this.getBimesterOrder(b.bimester));
  });

  readonly activeGradingPeriod = computed(() => this.sortedGradingPeriods().find(period => period.status === 'ACTIVE') ?? null);

  readonly availableGradingPeriods = computed(() => {
    const activePeriod = this.activeGradingPeriod();
    return activePeriod ? [activePeriod] : [];
  });

  readonly hasTopicsForSelectedPeriod = computed(() => {
    const periodId = this.genGradingPeriodId();
    return periodId !== null && this.topics().some(topic => topic.gradingPeriodId === periodId);
  });

  readonly availableWeeks = computed(() => {
    const periodId = Number(this.genGradingPeriodId());
    if (!periodId || periodId !== this.activeGradingPeriod()?.id || !this.topicsLoaded()) return [];
    const existingWeekNumbers = new Set(
      this.courseQuizzes()
        .filter(q => q.gradingPeriodId === periodId)
        .map(q => q.weekNumber)
    );
    return this.topics()
      .filter(t => t.gradingPeriodId === periodId && !existingWeekNumbers.has(t.orderIndex))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  });

  onGenPeriodChange(newPeriodId: number | string | null): void {
    const requestedId = newPeriodId ? Number(newPeriodId) : null;
    const id = requestedId === this.activeGradingPeriod()?.id ? requestedId : null;
    this.genGradingPeriodId.set(id);
    this.genWeek.set(null);
  }

  readonly questionnaireExistsForSelection = computed(() => {
    const periodId = Number(this.genGradingPeriodId());
    const week = Number(this.genWeek());
    if (!periodId || !week) return false;
    return this.courseQuizzes().some(quiz =>
      quiz.gradingPeriodId === periodId && quiz.weekNumber === week
    );
  });

  // Filtered quizzes for active course
  readonly courseQuizzes = computed(() => {
    return this.allQuizzes().filter(q => q.courseId === this.courseId());
  });

  // Student filtering & display state
  readonly studentBimesterFilter = signal<number | 'all'>('all');
  readonly studentStatusFilter = signal<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  readonly activeStartedQuiz = computed(() => {
    return this.courseQuizzes().find(q => q.status === 'STARTED') || null;
  });

  readonly filteredStudentQuizzes = computed(() => {
    let list = this.courseQuizzes();
    const bim = this.studentBimesterFilter();
    if (bim !== 'all') {
      list = list.filter(q => q.gradingPeriodId === bim);
    }
    return list;
  });

  readonly displayedQuizzes = computed(() => {
    return this.filteredStudentQuizzes();
  });

  getTopicNameForQuiz(quiz: AvailableQuestionnaire): string {
    const topic = this.topics().find(t => t.gradingPeriodId === quiz.gradingPeriodId && t.orderIndex === quiz.weekNumber);
    return topic?.name ?? (this.translate('I18N.WEEK_TOPIC', {week: quiz.weekNumber}));
  }

  getBestOrLatestAttempt(quiz: AvailableQuestionnaire): QuestionnaireAttempt | null {
    if (!quiz.pastAttempts || quiz.pastAttempts.length === 0) return null;
    return [...quiz.pastAttempts].sort((a, b) => b.score - a.score)[0];
  }

  getTotalQuestionsForQuiz(quiz: AvailableQuestionnaire): number {
    const best = this.getBestOrLatestAttempt(quiz);
    if (best?.totalQuestions) return best.totalQuestions;
    return quiz.questionsPerAttempt ?? 5;
  }

  // Calculate statistics for student view
  readonly totalQuizzesCount = computed(() => this.courseQuizzes().length);
  readonly completedQuizzesCount = computed(() => this.courseQuizzes().filter(q => q.status === 'COMPLETED').length);
  readonly pendingQuizzesCount = computed(() => this.courseQuizzes().filter(q => q.status === 'PENDING' || q.status === 'STARTED' || q.status === 'RETRY').length);
  readonly studentCalculatedAverage = computed<number | null>(() => {
    const completed = this.courseQuizzes().filter(q => q.status === 'COMPLETED' && q.pastAttempts && q.pastAttempts.length > 0);
    if (completed.length === 0) return null;
    let sum = 0;
    for (const q of completed) {
      const best = Math.max(...q.pastAttempts.map(a => a.score));
      sum += best;
    }
    return sum / completed.length;
  });
  readonly averageScore = computed(() => {
    const avg = this.studentCalculatedAverage();
    return avg !== null ? avg.toFixed(1) : (this.completedQuizzesCount() > 0 ? '16.5' : '0.0');
  });

  // Teacher filtering & statistics
  readonly teacherFilterBimester = signal<number | 'all'>('all');
  readonly teacherFilteredQuizzes = computed(() => {
    const bim = this.teacherFilterBimester();
    if (bim === 'all') return this.courseQuizzes();
    return this.courseQuizzes().filter(q => q.gradingPeriodId === bim);
  });
  readonly teacherActivePeriodsCount = computed(() => {
    return new Set(this.courseQuizzes().map(q => q.gradingPeriodId)).size;
  });
  readonly teacherCoveredTopicsCount = computed(() => {
    return new Set(this.courseQuizzes().map(q => `${q.gradingPeriodId}-${q.weekNumber}`)).size;
  });
  readonly teacherPendingTopicsCount = computed(() => {
    const total = this.topics().length;
    const covered = this.teacherCoveredTopicsCount();
    return Math.max(0, total - covered);
  });
  readonly teacherRemainingPeriodsCount = computed(() => {
    const total = this.sortedGradingPeriods().length || 4;
    const active = this.teacherActivePeriodsCount();
    return Math.max(0, total - active);
  });

  // Teacher view computed stats and mock data based on actual quizzes
  readonly teacherTableQuizzes = computed(() => {
    const sorted = [...this.courseQuizzes()].sort((a, b) => b.id - a.id);
    return sorted.slice(0, 3).reverse();
  });

  private readonly baseStudents = [
    { name: 'Henry (Estudiante)', baseScore: 17 },
    { name: 'Maria Belen', baseScore: 15 },
    { name: 'Carlos Perez', baseScore: 16 }
  ];

  readonly teacherMockStudents = computed<MockStudentGrade[]>(() => {
    const quizzes = this.teacherTableQuizzes();
    return this.baseStudents.map(student => {
      let total = 0;
      const grades = quizzes.map(q => {
        const pseudoRandom = ((q.id * 13) % 5) - 2;
        const score = Math.max(0, Math.min(20, student.baseScore + pseudoRandom));
        total += score;
        return score;
      });
      const final = quizzes.length > 0 ? Math.round(total / quizzes.length) : 0;
      return {
        name: student.name,
        grades,
        final
      };
    });
  });

  readonly mockAverageScore = computed(() => {
    const students = this.teacherMockStudents();
    if (students.length === 0) return '0.0';
    const sum = students.reduce((acc, curr) => acc + curr.final, 0);
    return (sum / students.length).toFixed(1);
  });

  ngOnInit(): void {
    this.loadAvailableQuizzes();
    this.loadClassroomInfo();

    if (!this.isStudentViewSimulation()) {
      this.onboardingService.getStatus().subscribe({
        next: (status) => {
          if (!status.quizzesCompleted) {
            this.showOnboardingBanner.set(true);
          }
        }
      });
    }

    // Check if there is an instanceId in the route
    this.route.paramMap.subscribe(params => {
      const instanceIdStr = params.get('instanceId');
      if (instanceIdStr) {
        const instanceId = Number(instanceIdStr);
        if (!isNaN(instanceId)) {
          this.currentQuizInstanceId.set(instanceId);
          this.viewResults(instanceId);
        }
      } else {
        if (this.viewState() === 'VIEW_RESULTS') {
          this.viewState.set('LIST');
          this.results.set(null);
        }
      }
    });
  }

  constructor() {
    effect(() => {
      const weeks = this.availableWeeks();
      if (weeks.length > 0) {
        this.genWeek.set(weeks[0].orderIndex);
      } else {
        this.genWeek.set(null);
      }
    });
  }

  loadAvailableQuizzes(): void {
    this.loadingQuizzes.set(true);
    this.questionnaireService.getAvailableQuestionnaires().subscribe({
      next: (list) => {
        this.allQuizzes.set(list);
        if (this.viewState() === 'VIEW_RESULTS' && this.currentQuizInstanceId()) {
          this.trySetActiveQuiz(this.currentQuizInstanceId()!);
        }
        this.loadingQuizzes.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al cargar cuestionarios:', err);
        this.loadingQuizzes.set(false);
      }
    });
  }

  loadClassroomInfo(): void {
    const user = this.userDataService.userProfile();
    if (user) {
      this.classroomService.getClassroomMembers(this.classroomId()).subscribe({
        next: (members) => {
          this.isClassroomTeacher.set(members.some(member =>
            member.userId === user.id && member.roleInClassroom.toUpperCase() === 'TEACHER'
          ));
        },
        error: () => this.isClassroomTeacher.set(false)
      });

      this.classroomService.getClassrooms(user.id).subscribe({
        next: (list) => {
          const match = list.find(c => c.courseId === this.courseId());
          if (match) {
            this.loadGradingPeriods(match.academicYearId);
          }
        },
        error: (err: unknown) => {
          console.error('Error al cargar info de aula para quizzes:', err);
        }
      });

      this.classroomService.getClassroomTopics(this.courseId()).subscribe({
        next: (topicsList) => {
          this.topics.set(topicsList);
          this.topicsLoaded.set(true);
        },
        error: (err: unknown) => {
          console.error('Error al cargar temas del curso:', err);
          this.topicsLoaded.set(true);
        }
      });
    }
  }

  loadGradingPeriods(yearId: number): void {
    this.classroomService.getGradingPeriods(yearId).subscribe({
      next: (list) => {
        const sorted = [...list].sort((a, b) => this.getBimesterOrder(a.bimester) - this.getBimesterOrder(b.bimester));
        this.gradingPeriods.set(sorted);
        this.gradingPeriodsLoaded.set(true);
        this.genGradingPeriodId.set(sorted.find(period => period.status === 'ACTIVE')?.id ?? null);
        this.genWeek.set(null);
      },
      error: () => {
        this.gradingPeriods.set([]);
        this.genGradingPeriodId.set(null);
        this.gradingPeriodsLoaded.set(true);
      }
    });
  }

  getBimesterLabel(bimester: string): string {
    if (!bimester) return '';
    const key = bimester.toUpperCase();
    const translated = this.translate('BIMESTERS.' + key);
    if (translated && !translated.startsWith('BIMESTERS.')) return translated;
    if (key.includes('1') || key.includes('FIRST')) return this.translate('BIMESTERS.FIRST');
    if (key.includes('2') || key.includes('SECOND')) return this.translate('BIMESTERS.SECOND');
    if (key.includes('3') || key.includes('THIRD')) return this.translate('BIMESTERS.THIRD');
    if (key.includes('4') || key.includes('FOURTH')) return this.translate('BIMESTERS.FOURTH');
    return bimester;
  }

  startQuiz(questionnaireId: number, weekNumber: number): void {
    if (!questionnaireId || (questionnaireId as any) === 'null' || (questionnaireId as any) === 'undefined') return;

    if (this.isStudentViewSimulation()) {
      this.studentViewStartModalOpen.set(true);
      return;
    }

    this.startingQuizId.set(questionnaireId);
    
    // Añadir un pequeño retraso de 2 segundos para que se aprecie la animación de carga
    setTimeout(() => {
      this.questionnaireService.startQuestionnaire(questionnaireId).subscribe({
        next: (instanceId) => {
          this.currentQuizInstanceId.set(instanceId);
          const q = this.allQuizzes().find(x => x.id === questionnaireId) || null;
          this.activeQuiz.set(q);
          this.quizWeek.set(weekNumber);
          this.startingQuizId.set(null);
          this.loadQuestions(instanceId);
        },
        error: (err: unknown) => {
          console.error('Error al iniciar cuestionario:', err);
          this.startingQuizId.set(null);
        }
      });
    }, 2000);
  }

  resumeQuiz(instanceId: number, weekNumber: number): void {
    if (!instanceId || (instanceId as any) === 'null' || (instanceId as any) === 'undefined') return;
    this.currentQuizInstanceId.set(instanceId);
    const q = this.allQuizzes().find(x => x.activeInstanceId === instanceId) || null;
    this.activeQuiz.set(q);
    this.quizWeek.set(weekNumber);
    this.loadQuestions(instanceId);
  }

  loadQuestions(instanceId: number): void {
    if (!instanceId || (instanceId as any) === 'null' || (instanceId as any) === 'undefined') return;
    this.loadingResults.set(true);
    this.quizQuestions.set([]);
    this.questionnaireService.getQuestions(instanceId).subscribe({
      next: (questions) => {
        this.quizQuestions.set(questions);
        this.currentQuestionIndex.set(0);
        this.restoreAnswers(instanceId, questions);
        this.viewState.set('TAKING_QUIZ');
        this.userDataService.setTakingQuiz(true);
        this.loadingResults.set(false);
      },
      error: (err: unknown) => {
        console.error('Error al descargar preguntas:', err);
        this.loadingResults.set(false);
      }
    });
  }

  selectOption(questionId: number, optionIndex: number): void {
    this.selectedAnswers.update(curr => {
      const next = { ...curr };
      if (next[questionId] === optionIndex) {
        delete next[questionId];
      } else {
        next[questionId] = optionIndex;
      }
      const instanceId = this.currentQuizInstanceId();
      if (instanceId) this.saveAnswers(instanceId, next);
      return next;
    });
  }

  nextQuestion(): void {
    if (this.currentQuestionIndex() < this.quizQuestions().length - 1) {
      this.currentQuestionIndex.update(idx => idx + 1);
    }
  }

  prevQuestion(): void {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update(idx => idx - 1);
    }
  }

  isCurrentQuestionAnswered(): boolean {
    const questions = this.quizQuestions();
    const index = this.currentQuestionIndex();
    if (questions.length === 0) return false;
    const currentQ = questions[index];
    return this.selectedAnswers()[currentQ.id] !== undefined;
  }

  isAllQuestionsAnswered(): boolean {
    const questions = this.quizQuestions();
    const answers = this.selectedAnswers();
    if (questions.length === 0) return false;
    return questions.every(q => answers[q.id] !== undefined);
  }

  submitQuiz(): void {
    const instanceId = this.currentQuizInstanceId();
    if (!instanceId || (instanceId as any) === 'null' || (instanceId as any) === 'undefined' || this.submitting()) return;

    if (!this.isAllQuestionsAnswered()) {
      this.confirmModalTitle.set('Preguntas sin responder');
      this.confirmModalMessage.set(this.translate('UI_TEXT.ARE_YOU_SURE_YOU_WANT_TO_SUBMIT_THE'));
    } else {
      this.confirmModalTitle.set('Enviar Respuestas');
      this.confirmModalMessage.set(this.translate('UI_TEXT.ARE_YOU_SURE_YOU_WANT_TO_SUBMIT_YOUR'));
    }

    this.confirmAction.set(() => {
      this.submitting.set(true);
      this.questionnaireService.submitQuestionnaire(instanceId, this.selectedAnswers()).subscribe({
        next: submission => {
          this.clearSavedAnswers(instanceId);
          this.confirmModalOpen.set(false);
          this.submitting.set(false);
          this.userDataService.setTakingQuiz(false);
          this.showSubmissionResults(instanceId, submission);
        },
        error: (err: unknown) => {
          console.error('Error al enviar cuestionario:', err);
          this.confirmModalOpen.set(false);
          this.submitting.set(false);
        }
      });
    });
    this.confirmModalOpen.set(true);
  }

  viewResults(instanceId: number): void {
    if (!instanceId || (instanceId as any) === 'null' || (instanceId as any) === 'undefined') return;
    this.currentQuizInstanceId.set(instanceId);
    
    const currentUrl = this.router.url;
    if (!currentUrl.includes(`/quizzes/${instanceId}`)) {
      this.router.navigate(['classrooms', this.classroomId(), 'quizzes', instanceId]);
      return;
    }

    this.loadingResults.set(true);
    this.viewState.set('VIEW_RESULTS');
    
    this.questionnaireService.getSubmissionResults(instanceId).subscribe({
      next: (res) => {
        this.results.set(res);
        this.trySetActiveQuiz(instanceId);
        this.loadingResults.set(false);
        this.pollFeedback(instanceId);
      },
      error: (err: unknown) => {
        console.error('Error al cargar resultados:', err);
        this.loadingResults.set(false);
      }
    });
  }

  private showSubmissionResults(instanceId: number, submission: QuestionnaireSubmission): void {
    this.currentQuizInstanceId.set(instanceId);
    this.results.set(submission);
    this.loadingResults.set(false);
    this.viewState.set('VIEW_RESULTS');
    this.trySetActiveQuiz(instanceId);
    if (!this.router.url.includes(`/quizzes/${instanceId}`)) {
      this.router.navigate(['classrooms', this.classroomId(), 'quizzes', instanceId]);
    }
    this.pollFeedback(instanceId);
  }

  private pollFeedback(instanceId: number): void {
    this.feedbackPolling?.unsubscribe();
    if (!this.hasPendingFeedback()) return;

    this.feedbackPolling = timer(2000, 3000).pipe(
      switchMap(() => this.questionnaireService.getSubmissionResults(instanceId)
        .pipe(catchError(() => EMPTY))),
      takeWhile((submission, index) =>
        (submission.feedbackStatus === 'PENDING' || submission.feedbackStatus === 'PROCESSING') && index < 59, true),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(submission => {
      if (this.currentQuizInstanceId() === instanceId) this.results.set(submission);
    });
  }

  private hasPendingFeedback(): boolean {
    const status = this.results()?.feedbackStatus;
    return status === 'PENDING' || status === 'PROCESSING';
  }

  retryFeedback(): void {
    const instanceId = this.currentQuizInstanceId();
    if (!instanceId || this.retryingFeedback()) return;
    this.retryingFeedback.set(true);
    this.questionnaireService.retryFeedback(instanceId).subscribe({
      next: () => {
        const current = this.results();
        if (current) this.results.set({...current, feedbackStatus: 'PENDING'});
        this.retryingFeedback.set(false);
        this.pollFeedback(instanceId);
      },
      error: () => {
        this.retryingFeedback.set(false);
        this.toastService.error(this.translate('CLASSROOMS.QUIZZES.RESULTS.FEEDBACK_RETRY_ERROR'));
      }
    });
  }

  goBackToList(): void {
    this.feedbackPolling?.unsubscribe();
    this.viewState.set('LIST');
    this.userDataService.setTakingQuiz(false);
    this.currentQuizInstanceId.set(null);
    this.quizQuestions.set([]);
    this.results.set(null);
    this.router.navigate(['classrooms', this.classroomId()], { queryParams: { tab: 'quizzes' } });
  }

  generateQuiz(): void {
    const periodId = this.genGradingPeriodId();
    const week = this.genWeek();
    const weekIsAvailable = this.availableWeeks().some(topic => topic.orderIndex === week);
    if (!periodId || periodId !== this.activeGradingPeriod()?.id || !week || !weekIsAvailable
      || this.generating() || this.questionnaireExistsForSelection()) return;

    this.generating.set(true);
    this.questionnaireService.generateQuestionnaire(this.courseId(), periodId, week, 5).subscribe({
      next: () => {
        this.generating.set(false);
        this.genWeek.set(null);
        this.toastService.success(this.translate('CLASSROOMS.QUIZZES.GENERATE_SUCCESS'));
        this.loadAvailableQuizzes();
      },
      error: (err: any) => {
        console.error('Error al generar cuestionario:', err);
        this.generating.set(false);
        this.toastService.error(this.translate('CLASSROOMS.QUIZZES.GENERATE_ERROR'));
      }
    });
  }

  getTopicName(topicId: number): string {
    return this.topics().find(topic => topic.id === topicId)?.name ?? this.translate('I18N.TOPIC', {number: topicId});
  }

  getDifficultyLabel(difficulty: Question['difficulty']): string {
    return difficulty === 'LOW' ? this.translate('UI_TEXT.LOW_DIFFICULTY') : this.translate('UI_TEXT.MEDIUM_DIFFICULTY');
  }

  // Preview Signals
  readonly previewDocumentTitle = signal<string>('');
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal<boolean>(false);

  getSources(content: string | null | undefined): any[] {
    if (!content) return [];
    const sources: any[] = [];
    const regex = /(?:Fuente|Source):\s*([^\r\n]+)\s*[\r\n]+\s*(?:Enlace de descarga|Download link):\s*.*?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      sources.push({
        name: match[1].trim(),
        courseId: Number(match[2]),
        documentId: Number(match[3]),
        downloadUrl: `/api/v1/courses/${match[2]}/documents/${match[3]}/download`
      });
    }
    return sources;
  }

  private trySetActiveQuiz(instanceId: number): void {
    if (!this.activeQuiz()) {
      const quiz = this.allQuizzes().find(q => q.activeInstanceId === instanceId || q.pastAttempts?.some(p => p.instanceId === instanceId)) || null;
      if (quiz) {
        this.activeQuiz.set(quiz);
      }
    }
  }

  cleanMessageContent(content: string | null | undefined): string {
    if (!content) return '';
    const cleaned = content.replace(/(?:Fuente|Source):\s*[^\r\n]+\s*[\r\n]+\s*(?:Enlace de descarga|Download link):\s*[^\r\n\s]+/gi, '');
    return cleaned.trim();
  }

  previewDocument(courseId: number, documentId: number, name: string): void {
    this.previewDocumentTitle.set(name);
    this.previewSecureUrl.set(null);
    this.previewLoading.set(true);

    this.classroomService.getDocumentDownloadUrl(courseId, documentId).subscribe({
      next: (response) => {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(response.url);
        this.previewSecureUrl.set(safeUrl);
        this.previewLoading.set(false);
      },
      error: (err) => {
        console.error('Error al obtener URL de previsualización:', err);
        this.previewLoading.set(false);
        alert(this.translate('UI_TEXT.UNABLE_TO_LOAD_THE_DOCUMENT_PREVIEW'));
      }
    });
  }

  scrollTo(idx: number): void {
    this.selectedResultIdx.set(idx);
    const el = document.getElementById('q-' + idx);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  closePreview(): void {
    this.previewSecureUrl.set(null);
    this.previewDocumentTitle.set('');
  }

  downloadSource(courseId: number, documentId: number): void {
    this.classroomService.getDocumentDownloadUrl(courseId, documentId).subscribe({
      next: (response) => {
        window.open(response.url, '_blank');
      },
      error: (err) => {
        console.error('Error al descargar:', err);
      }
    });
  }

  markOnboardingCompleted(): void {
    this.onboardingService.completeQuizzes().subscribe({
      next: () => {
        this.showOnboardingBanner.set(false);
        this.toastService.success(this.translate('CLASSROOMS.QUIZZES.ONBOARDING_COMPLETED_SUCCESS'));
      },
      error: () => {
        this.toastService.error(this.translate('CLASSROOMS.QUIZZES.ONBOARDING_COMPLETED_ERROR'));
      }
    });
  }
}
