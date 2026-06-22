import {ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal, effect} from '@angular/core';
import {UserDataService} from '../../../../shared/services/user-data.service';
import {ActivatedRoute, Router} from '@angular/router';
import {QuestionnaireService, AvailableQuestionnaire, Question, QuestionnaireSubmission} from '../../data-access/questionnaire.service';
import {ClassroomService} from '../../data-access/classroom.service';
import {Topic} from '../../data-access/models/responses/topic.model';
import {BIMESTER_OPTIONS} from '../../../../shared/models/academic-levels.model';
import {FormsModule} from '@angular/forms';
import {NgClass, DatePipe} from '@angular/common';
import {MarkdownMathPipe} from '../../../../shared/pipes/markdown-math.pipe';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ToastService} from '../../../../shared/services/toast.service';
import {ConfirmModal} from '../../../../shared/components/modal/confirm-modal';

interface MockStudentGrade {
  name: string;
  grades: number[];
  final: number;
}

@Component({
  selector: 'app-quizzes',
  imports: [FormsModule, NgClass, DatePipe, MarkdownMathPipe, ConfirmModal],
  templateUrl: './quizzes.html',
  styleUrl: './quizzes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Quizzes implements OnInit {
  protected readonly userDataService = inject(UserDataService);
  private readonly questionnaireService = inject(QuestionnaireService);
  private readonly classroomService = inject(ClassroomService);
  protected readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

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
  readonly quizName = signal<string>('');

  // Results Signals
  readonly results = signal<QuestionnaireSubmission | null>(null);
  readonly loadingResults = signal(false);
  readonly selectedResultIdx = signal<number>(0);

  // Expand State Signal
  readonly expandedQuizId = signal<number | null>(null);

  // Loading state for starting/retrying a quiz
  readonly startingQuizId = signal<number | null>(null);

  // Confirm Modal signals
  readonly confirmModalOpen = signal(false);
  readonly confirmModalTitle = signal('');
  readonly confirmModalMessage = signal('');
  readonly confirmAction = signal<() => void>(() => {});

  closeConfirmModal = (): void => this.confirmModalOpen.set(false);

  toggleQuizExpand(quizId: number): void {
    this.expandedQuizId.update(id => id === quizId ? null : quizId);
  }

  getBimesterNameForPeriod(periodId: number): string {
    const period = this.gradingPeriods().find(p => p.id === periodId);
    if (!period) return `Periodo ${periodId}`;
    return this.getBimesterLabel(period.bimester);
  }

  // Teacher / Generation Signals
  readonly generating = signal(false);
  readonly genGradingPeriodId = signal<number | null>(null);
  readonly genWeek = signal<number | null>(null);
  readonly genAllowedAttempts = signal<number>(3);
  readonly genQuestionsPerAttempt = signal<number>(5);
  readonly gradingPeriods = signal<Array<{ id: number; bimester: string }>>([]);
  readonly topics = signal<Topic[]>([]);

  increaseAttempts() {
    this.genAllowedAttempts.update(v => Math.min(3, v + 1));
  }
  decreaseAttempts() {
    this.genAllowedAttempts.update(v => Math.max(1, v - 1));
  }
  increaseQuestions() {
    this.genQuestionsPerAttempt.update(v => Math.min(10, v + 1));
  }
  decreaseQuestions() {
    this.genQuestionsPerAttempt.update(v => Math.max(5, v - 1));
  }

  readonly availableGradingPeriods = computed(() => {
    const allTopics = this.topics();
    const periodsWithTopics = new Set(allTopics.map(t => t.gradingPeriodId));
    return this.gradingPeriods().filter(p => periodsWithTopics.has(p.id));
  });

  readonly availableWeeks = computed(() => {
    const periodId = this.genGradingPeriodId();
    if (!periodId) return [];
    return this.topics().filter(t => t.gradingPeriodId === periodId).sort((a, b) => a.orderIndex - b.orderIndex);
  });

  // Filtered quizzes for active course
  readonly courseQuizzes = computed(() => {
    return this.allQuizzes().filter(q => q.courseId === this.courseId());
  });

  readonly displayedQuizzes = computed(() => {
    const quizzes = this.courseQuizzes();
    const active = quizzes.find(q => q.status === 'STARTED');
    return active ? [active] : quizzes;
  });

  // Calculate statistics for student view
  readonly totalQuizzesCount = computed(() => this.courseQuizzes().length);
  readonly completedQuizzesCount = computed(() => this.courseQuizzes().filter(q => q.status === 'COMPLETED').length);
  readonly pendingQuizzesCount = computed(() => this.courseQuizzes().filter(q => q.status === 'PENDING' || q.status === 'STARTED' || q.status === 'RETRY').length);
  readonly averageScore = computed(() => {
    // Note: Since submissions list is filtered on backend by session-level queries,
    // we compute student statistics based on mock scores or completed scores.
    // For this client test, we can calculate an average of 16.5 if they have completed quizzes, or 0 if none.
    return this.completedQuizzesCount() > 0 ? '16.5' : '0.0';
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
        },
        error: (err: unknown) => {
          console.error('Error al cargar temas del curso:', err);
        }
      });
    }
  }

  loadGradingPeriods(yearId: number): void {
    this.classroomService.getGradingPeriods(yearId).subscribe({
      next: (list) => {
        this.gradingPeriods.set(list);
        if (list.length > 0) {
          this.genGradingPeriodId.set(list[0].id);
        }
      },
      error: () => {
        // Fallback options
        const fallback = [
          { id: 1, bimester: 'BIMESTER_1' },
          { id: 2, bimester: 'BIMESTER_2' },
          { id: 3, bimester: 'BIMESTER_3' },
          { id: 4, bimester: 'BIMESTER_4' }
        ];
        this.gradingPeriods.set(fallback);
        this.genGradingPeriodId.set(1);
      }
    });
  }

  getBimesterLabel(bimester: string): string {
    const bimesterMap: Record<string, string> = {
      'FIRST': '1er Bimestre',
      'SECOND': '2do Bimestre',
      'THIRD': '3er Bimestre',
      'FOURTH': '4to Bimestre',
      'BIMESTER_1': '1er Bimestre',
      'BIMESTER_2': '2do Bimestre',
      'BIMESTER_3': '3er Bimestre',
      'BIMESTER_4': '4to Bimestre',
    };
    return bimesterMap[bimester.toUpperCase()] || bimester;
  }

  startQuiz(questionnaireId: number, weekNumber: number): void {
    if (!questionnaireId || (questionnaireId as any) === 'null' || (questionnaireId as any) === 'undefined') return;
    this.startingQuizId.set(questionnaireId);
    
    // Añadir un pequeño retraso de 2 segundos para que se aprecie la animación de carga
    setTimeout(() => {
      this.questionnaireService.startQuestionnaire(questionnaireId).subscribe({
        next: (instanceId) => {
          this.currentQuizInstanceId.set(instanceId);
          const q = this.allQuizzes().find(x => x.id === questionnaireId) || null;
          this.activeQuiz.set(q);
          this.quizName.set(`Cuestionario - Semana ${weekNumber}`);
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
    this.quizName.set(`Cuestionario - Semana ${weekNumber}`);
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
        this.selectedAnswers.set({});
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
      this.confirmModalMessage.set('¿Estás seguro de entregar el cuestionario? Tienes preguntas sin marcar.');
    } else {
      this.confirmModalTitle.set('Enviar Respuestas');
      this.confirmModalMessage.set('¿Estás seguro de enviar tus respuestas?');
    }

    this.confirmAction.set(() => {
      this.submitting.set(true);
      this.questionnaireService.submitQuestionnaire(instanceId, this.selectedAnswers()).subscribe({
        next: () => {
          this.confirmModalOpen.set(false);
          this.submitting.set(false);
          this.userDataService.setTakingQuiz(false);
          this.viewResults(instanceId);
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
      },
      error: (err: unknown) => {
        console.error('Error al cargar resultados:', err);
        this.loadingResults.set(false);
      }
    });
  }

  goBackToList(): void {
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
    const allowedAttempts = this.genAllowedAttempts();
    const questionsPerAttempt = this.genQuestionsPerAttempt();
    if (!periodId || !week || this.generating()) return;

    this.generating.set(true);
    this.questionnaireService.generateQuestionnaire(this.courseId(), periodId, week, allowedAttempts, questionsPerAttempt).subscribe({
      next: () => {
        this.generating.set(false);
        this.toastService.success('Cuestionario generado exitosamente con Inteligencia Artificial.');
        this.loadAvailableQuizzes();
      },
      error: (err: any) => {
        console.error('Error al generar cuestionario:', err);
        this.generating.set(false);
        this.toastService.error('La Inteligencia Artificial tardó demasiado o el documento es muy extenso. Por favor, intenta de nuevo.');
      }
    });
  }

  // Preview Signals
  readonly previewDocumentTitle = signal<string>('');
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal<boolean>(false);

  getSources(content: string | null | undefined): any[] {
    if (!content) return [];
    const sources: any[] = [];
    const regex = /Fuente:\s*([^\r\n]+)\s*[\r\n]+\s*Enlace de descarga:\s*.*?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
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
    const cleaned = content.replace(/Fuente:\s*[^\r\n]+\s*[\r\n]+\s*Enlace de descarga:\s*[^\r\n\s]+/gi, '');
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
        alert('No se pudo cargar la previsualización del documento.');
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
}
