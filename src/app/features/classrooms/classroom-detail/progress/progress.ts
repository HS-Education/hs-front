import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { UserDataService } from '../../../../shared/services/user-data.service';
import {
  AchievementService,
  ClassroomAchievementResource,
  StudentAchievementResource,
  StudentPerformanceSummaryResource,
  TopicPerformance
} from './services/achievement.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../shared/services/toast.service';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { Modal } from '../../../../shared/components/modal/modal';
import { MarkdownMathPipe } from '../../../../shared/pipes/markdown-math.pipe';
import { ClassroomService } from '../../data-access/classroom.service';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { QuestionnaireService } from '../../data-access/questionnaire.service';

@Component({
  selector: 'app-progress',
  imports: [ReactiveFormsModule, DecimalPipe, UpperCasePipe, Modal],
  templateUrl: './progress.html',
  styles: `
    .hide-spin-button::-webkit-outer-spin-button,
    .hide-spin-button::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .hide-spin-button {
      -moz-appearance: textfield;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  protected readonly userDataService = inject(UserDataService);
  private readonly achievementService = inject(AchievementService);
  private readonly classroomService = inject(ClassroomService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly questionnaireService = inject(QuestionnaireService);

  readonly classroomId = input.required<number>();
  readonly courseId = input.required<number>();
  readonly academicYearId = input.required<number>();

  protected readonly sanitizer = inject(DomSanitizer);

  // Preview Signals
  readonly previewDocumentTitle = signal<string>('');
  readonly previewSecureUrl = signal<SafeResourceUrl | null>(null);
  readonly previewLoading = signal<boolean>(false);

  // State
  readonly studentData = signal<StudentAchievementResource | null>(null);
  readonly classroomData = signal<ClassroomAchievementResource | null>(null);
  readonly summaryData = signal<StudentPerformanceSummaryResource | null>(null);

  readonly isLoading = signal(false);
  readonly isLoadingSummary = signal(false);
  readonly isGeneratingInsight = signal(false);

  // Per-student insights (for teacher view)
  readonly studentInsights = signal<Record<number, string | null>>({});
  readonly loadingStudentInsightId = signal<number | null>(null);
  readonly generatingInsightStudentId = signal<number | null>(null);
  isRecModalOpen = signal(false);
  isGeneratingRec = signal(false);
  recStudentName = signal<string>('');
  recStudentId = signal<number | null>(null);
  isRoadmapModalOpen = signal(false);
  selectedTopicForRoadmap = signal<TopicPerformance | null>(null);

  // Grading Periods
  readonly gradingPeriods = signal<Array<{ id: number; bimester: string }>>([]);
  readonly selectedGradingPeriodId = signal<number | null>(null);

  // Teacher View UI State
  readonly expandedStudentId = signal<number | null>(null);

  readonly recForm = this.fb.group({
    topicId: [0, Validators.required],
    numQuestions: [5, [Validators.required, Validators.min(5), Validators.max(10)]]
  });
  readonly currentStudentTopics = signal<any[]>([]);

  // Computed KPIs for Teacher View
  readonly totalStudents = computed(() => {
    const data = this.classroomData();
    return data?.performance.students.length ?? 0;
  });

  readonly studentsExcelling = computed(() => {
    const data = this.classroomData();
    if (!data) return 0;
    return data.performance.students.filter(s => s.averageScore >= 80).length;
  });

  readonly studentsAtRisk = computed(() => {
    const data = this.classroomData();
    if (!data) return 0;
    return data.performance.students.filter(s => s.averageScore < 50).length;
  });

  readonly studentsRegular = computed(() => {
    const data = this.classroomData();
    if (!data) return 0;
    return data.performance.students.filter(s => s.averageScore >= 50 && s.averageScore < 80).length;
  });

  readonly sortedStudents = computed(() => {
    const data = this.classroomData();
    if (!data) return [];
    return [...data.performance.students].sort((a, b) => b.averageScore - a.averageScore);
  });

  readonly sortedStudentTopics = computed(() => {
    const data = this.studentData();
    const gpId = this.selectedGradingPeriodId();
    const cId = this.courseId();
    if (!data || !data.performance || !data.performance.topics || !gpId || !cId) return [];
    
    return data.performance.topics
      .filter(t => t.gradingPeriodId === gpId && t.courseId === cId)
      .sort((a, b) => a.weekNumber - b.weekNumber);
  });

  // Computed for new Classroom Trend Graph
  readonly weeklyClassroomTrend = computed(() => {
    const data = this.classroomData();
    if (!data) return [];

    const weekScores = new Map<number, { total: number; count: number }>();

    for (const student of data.performance.students) {
      for (const topic of student.topics) {
        if (topic.courseId === this.courseId()) {
          const current = weekScores.get(topic.weekNumber) || { total: 0, count: 0 };
          current.total += topic.percentage;
          current.count += 1;
          weekScores.set(topic.weekNumber, current);
        }
      }
    }

    return Array.from(weekScores.entries())
      .map(([weekNumber, stats]) => ({
        weekNumber,
        averageScore: stats.total / stats.count
      }))
      .sort((a, b) => a.weekNumber - b.weekNumber);
  });

  // SVG chart helpers
  readonly maxWeeklyScore = computed(() => {
    const summary = this.summaryData();
    if (!summary || summary.weeklyProgression.length === 0) return 100;
    return Math.max(100, ...summary.weeklyProgression.map(w => w.averageScore));
  });

  constructor() {
    effect(() => {
      const cId = this.classroomId();
      if (cId) {
        this.loadData(cId);
      }
    });

    effect(() => {
      const ayId = this.academicYearId();
      if (ayId) {
        this.loadGradingPeriods(ayId);
      }
    });

    effect(() => {
      const gpId = this.selectedGradingPeriodId();
      const courseId = this.courseId();
      const studentId = this.userDataService.userProfile()?.id;
      if (gpId && courseId && studentId && this.userDataService.isStudentView()) {
        this.loadStudentSummary(studentId, courseId, gpId);
      }
    });
  }

  refreshData() {
    const cId = this.classroomId();
    if (cId) {
      this.loadData(cId);
    }
  }

  private loadData(classroomId: number) {
    this.isLoading.set(true);
    if (this.userDataService.isStudentView()) {
      const userProfile = this.userDataService.userProfile();
      if (userProfile && (userProfile.roles.includes('TEACHER') || userProfile.roles.includes('COORDINATOR'))) {
        setTimeout(() => {
          this.studentData.set(this.getMockStudentData());
          this.isLoading.set(false);
        }, 400);
        return;
      }

      const studentId = userProfile?.id;
      if (!studentId) return;
      this.achievementService.getStudentAchievements(studentId).subscribe({
        next: (data) => {
          this.studentData.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      this.achievementService.getClassroomAchievements(classroomId).subscribe({
        next: (data) => {
          this.classroomData.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  private loadGradingPeriods(academicYearId: number) {
    this.classroomService.getGradingPeriods(academicYearId).subscribe({
      next: (periods) => {
        const order: Record<string, number> = { 'FIRST': 1, 'SECOND': 2, 'THIRD': 3, 'FOURTH': 4 };
        const sortedPeriods = [...periods].sort((a, b) => {
          const orderA = order[a.bimester?.toUpperCase()] || 99;
          const orderB = order[b.bimester?.toUpperCase()] || 99;
          return orderA - orderB;
        });

        this.gradingPeriods.set(sortedPeriods);
        if (sortedPeriods.length > 0 && !this.selectedGradingPeriodId()) {
          this.selectedGradingPeriodId.set(sortedPeriods[0].id);
        }
      },
      error: () => {}
    });
  }

  private loadStudentSummary(studentId: number, courseId: number, gradingPeriodId: number) {
    this.isLoadingSummary.set(true);

    const userProfile = this.userDataService.userProfile();
    if (this.userDataService.isStudentView() && userProfile && (userProfile.roles.includes('TEACHER') || userProfile.roles.includes('COORDINATOR'))) {
      setTimeout(() => {
        this.summaryData.set(this.getMockSummaryData(gradingPeriodId));
        this.isLoadingSummary.set(false);
      }, 400);
      return;
    }

    this.achievementService.getStudentPerformanceSummary(studentId, courseId, gradingPeriodId).subscribe({
      next: (data) => {
        this.summaryData.set(data);
        this.isLoadingSummary.set(false);
      },
      error: () => {
        this.summaryData.set(null);
        this.isLoadingSummary.set(false);
      }
    });
  }

  onGradingPeriodChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.selectedGradingPeriodId.set(value ? +value : null);
  }

  translateBimester(bimester: string): string {
    const translations: Record<string, string> = {
      'FIRST': '1er Bimestre',
      'SECOND': '2do Bimestre',
      'THIRD': '3er Bimestre',
      'FOURTH': '4to Bimestre'
    };
    return translations[bimester?.toUpperCase()] || bimester;
  }

  // Regenerate student insight (student view)
  regenerateStudentInsight() {
    const studentId = this.userDataService.userProfile()?.id;
    const studentName = this.userDataService.userProfile()?.name || 'Estudiante';
    if (!studentId) return;
    this.isGeneratingInsight.set(true);
    this.achievementService.generateStudentPerformanceInsight(studentId, studentName).subscribe({
      next: () => {
        this.isGeneratingInsight.set(false);
        this.loadData(this.classroomId());
      },
      error: () => this.isGeneratingInsight.set(false)
    });
  }

  // Regenerate classroom insight (teacher view)
  regenerateClassroomInsight() {
    this.isGeneratingInsight.set(true);
    this.achievementService.generateClassroomInsight(this.classroomId()).subscribe({
      next: () => {
        this.isGeneratingInsight.set(false);
        this.loadData(this.classroomId());
      },
      error: () => this.isGeneratingInsight.set(false)
    });
  }

  // Load individual student insight (teacher view, on expand)
  loadStudentInsight(studentId: number, studentName?: string) {
    if (this.studentInsights()[studentId] !== undefined) return; // already loaded
    this.loadingStudentInsightId.set(studentId);
    this.achievementService.getStudentAchievements(studentId).subscribe({
      next: (data) => {
        if (!data.latestInsight && studentName) {
          this.generateInsightForStudent(studentId, studentName);
        } else {
          this.studentInsights.update(map => ({...map, [studentId]: data.latestInsight}));
        }
        this.loadingStudentInsightId.set(null);
      },
      error: () => {
        this.studentInsights.update(map => ({...map, [studentId]: null}));
        this.loadingStudentInsightId.set(null);
      }
    });
  }

  // Generate insight for a specific student (teacher view)
  generateInsightForStudent(studentId: number, studentName: string) {
    this.generatingInsightStudentId.set(studentId);
    this.achievementService.generateStudentPerformanceInsight(studentId, studentName).subscribe({
      next: () => {
        // Reload the student insight
        this.studentInsights.update(map => {
          const newMap = {...map};
          delete newMap[studentId]; // force reload
          return newMap;
        });
        this.generatingInsightStudentId.set(null);
        this.loadStudentInsight(studentId);
      },
      error: () => this.generatingInsightStudentId.set(null)
    });
  }

  // Toggle student expanded + load insight
  toggleStudentDetails(studentId: number, studentName: string) {
    if (this.expandedStudentId() === studentId) {
      this.expandedStudentId.set(null);
    } else {
      this.expandedStudentId.set(studentId);
      this.loadStudentInsight(studentId, studentName);
    }
  }

  // Recommendations (per student context)
  openRecModal(student: any) {
    this.recForm.reset({ numQuestions: 5 });
    this.recStudentName.set(student?.studentName ?? '');
    this.recStudentId.set(student?.studentId ?? null);
    
    let recommendedTopics = student?.topics?.filter((t: any) => t.percentage < 80) || [];
    if (recommendedTopics.length === 0) {
      recommendedTopics = student?.topics || []; // fallback si no hay menores a 80
    }
    this.currentStudentTopics.set(recommendedTopics);
    
    let lowestTopicId = 0;
    if (recommendedTopics.length > 0) {
      const lowest = recommendedTopics.reduce((prev: any, current: any) => (prev.percentage < current.percentage) ? prev : current);
      lowestTopicId = lowest.topicId;
    }
    this.recForm.patchValue({ topicId: lowestTopicId });

    this.isRecModalOpen.set(true);
  }

  closeRecModal = () => {
    this.isRecModalOpen.set(false);
  }

  increaseRecQuestions() {
    const current = this.recForm.value.numQuestions || 5;
    if (current < 10) {
      this.recForm.patchValue({ numQuestions: current + 1 });
    }
  }

  decreaseRecQuestions() {
    const current = this.recForm.value.numQuestions || 5;
    if (current > 5) {
      this.recForm.patchValue({ numQuestions: current - 1 });
    }
  }

  submitRecommendation() {
    if (this.recForm.invalid) return;
    this.isGeneratingRec.set(true);
    const val = this.recForm.value;

    const selectedTopic = this.currentStudentTopics().find(t => t.topicId === Number(val.topicId));
    if (!selectedTopic) {
      this.isGeneratingRec.set(false);
      return;
    }

    const studentId = this.recStudentId();
    if (!studentId) {
      this.isGeneratingRec.set(false);
      return;
    }

    this.questionnaireService.generateRemedialQuestionnaire(
      studentId,
      selectedTopic.courseId,
      selectedTopic.gradingPeriodId,
      selectedTopic.weekNumber,
      selectedTopic.topicId,
      val.numQuestions!
    ).subscribe({
      next: () => {
        this.toastService.success('Cuestionario recomendado generado exitosamente');
        this.isGeneratingRec.set(false);
        this.closeRecModal();
      },
      error: () => this.isGeneratingRec.set(false)
    });
  }

  openRoadmapModal(topic: TopicPerformance) {
    if (!topic.progressHistory || topic.progressHistory.length <= 1) return;
    this.selectedTopicForRoadmap.set(topic);
    this.isRoadmapModalOpen.set(true);
  }

  closeRoadmapModal = () => {
    this.isRoadmapModalOpen.set(false);
    this.selectedTopicForRoadmap.set(null);
  }

  // SVG Helpers
  getBarHeight(score: number): number {
    const max = this.maxWeeklyScore();
    return max > 0 ? (score / max) * 140 : 0;
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'var(--brand-forest)';
    if (score >= 50) return 'var(--brand-mustard)';
    return 'var(--brand-error)';
  }

  getDonutDasharray(percentage: number): string {
    const circumference = 2 * Math.PI * 40;
    const filled = (percentage / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  getDonutCircumference(): number {
    return 2 * Math.PI * 40;
  }

  private getMockStudentData(): StudentAchievementResource {
    return {
      performance: {
        studentId: 999,
        studentName: 'Alumno Demostrativo',
        averageScore: 78,
        topics: [
          { topicId: 1, topicName: 'Ecuaciones Lineales', weekNumber: 1, score: 18, percentage: 90, gradingPeriodId: 1, courseId: this.courseId(), progressHistory: [50, 75, 90] },
          { topicId: 2, topicName: 'Geometría Básica', weekNumber: 2, score: 14, percentage: 70, gradingPeriodId: 1, courseId: this.courseId(), progressHistory: [40, 70] },
          { topicId: 3, topicName: 'Álgebra de Funciones', weekNumber: 3, score: 9, percentage: 45, gradingPeriodId: 1, courseId: this.courseId(), progressHistory: [45] },
          { topicId: 4, topicName: 'Derivadas', weekNumber: 1, score: 12, percentage: 60, gradingPeriodId: 2, courseId: this.courseId(), progressHistory: [60] }
        ]
      },
      latestInsight: 'Hola Alumno Demostrativo, veo que tienes un rendimiento destacado en Ecuaciones Lineales. Sin embargo, Álgebra de Funciones requiere atención inmediata. Te recomiendo revisar este material de apoyo.\n\n**Fuente:** Guía de Álgebra **Enlace de descarga:** /api/v1/courses/1/documents/1/download'
    };
  }

  private getMockSummaryData(gradingPeriodId: number): StudentPerformanceSummaryResource {
    return {
      studentId: 999,
      gradingPeriodId,
      bimesterAverage: 68,
      weeklyProgression: [
        { weekNumber: 1, averageScore: 90, needsRemedial: false },
        { weekNumber: 2, averageScore: 70, needsRemedial: false },
        { weekNumber: 3, averageScore: 45, needsRemedial: true }
      ],
      definitiveGrades: [
        { questionnaireId: 101, weekNumber: 1, score: 18 },
        { questionnaireId: 102, weekNumber: 2, score: 14 },
        { questionnaireId: 103, weekNumber: 3, score: 9 }
      ]
    };
  }

  getSources(content: string | null | undefined): {name: string, courseId: number, documentId: number, downloadUrl: string}[] {
    if (!content) return [];
    const sources: {name: string, courseId: number, documentId: number, downloadUrl: string}[] = [];
    
    const regex1 = /(?:\*\*)?Fuente:(?:\*\*)?\s*(.*?)\s*(?:\*\*)?Enlace de descarga:(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
    let match: RegExpExecArray | null;
    while ((match = regex1.exec(content)) !== null) {
      sources.push({
        name: match[1].replace(/\*\*/g, '').trim(),
        courseId: Number(match[2]),
        documentId: Number(match[3]),
        downloadUrl: `/api/v1/courses/${match[2]}/documents/${match[3]}/download`
      });
    }

    const regex2 = /\[([^\]]+)\]\((?:.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download)\)/gi;
    while ((match = regex2.exec(content)) !== null) {
      if (!sources.some(s => s.courseId === Number(match![2]) && s.documentId === Number(match![3]))) {
        sources.push({
          name: match![1].replace(/\*\*/g, '').trim(),
          courseId: Number(match![2]),
          documentId: Number(match![3]),
          downloadUrl: `/api/v1/courses/${match![2]}/documents/${match![3]}/download`
        });
      }
    }

    return sources;
  }

  renderInsightContent(rawText: string | null | undefined): SafeHtml {
    rawText = rawText || '';
    const sources = this.getSources(rawText);

    if (sources.length > 0) {
      const regex1 = /\s*(?:\[\d+\])?\s*(?:\*\*)?Fuente:(?:\*\*)?\s*(.*?)\s*(?:\*\*)?Enlace de descarga:(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
      rawText = rawText.replace(regex1, '');

      const regex2 = /\s*(?:(?:\*\*)?Material de apoyo:(?:\*\*)?\s*)?\[([^\]]+)\]\((?:.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download)\)/gi;
      rawText = rawText.replace(regex2, '');
      
      // Cleanup AI hallucinated source text
      rawText = rawText.replace(/(?:\*\*)?Fuente:(?:\*\*)?\s*Contexto[^\n]*/gi, '');
    }

    let htmlString = MarkdownMathPipe.process(rawText);

    if (sources.length > 0) {
      htmlString = htmlString.replace(/\s*\[(\d+)\]/g, (match, p1) => {
        const idx = Number(p1) - 1;
        if (idx >= 0 && idx < sources.length) {
          return ''; // Strip inline citations
        }
        return match;
      });

      // Remove empty paragraphs that might be left over from stripping
      htmlString = htmlString.replace(/<p>(?:\s|<br\/>)*<\/p>/gi, '');

      let badgesHtml = '<div class="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2.5">';
      sources.forEach((src, idx) => {
        badgesHtml += `<a href="javascript:void(0)" data-source-index="${idx}" class="inline-flex items-center gap-1.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 hover:underline px-3 py-1.5 rounded-lg font-semibold text-xs transition border border-[var(--brand-primary)]/20 w-auto">
            <span class="text-[var(--brand-primary)] font-bold px-0.5 py-0.5 text-[10px] tracking-wide">[${idx + 1}]</span> 
            <span>${src.name}</span>
          </a>`;
      });
      badgesHtml += '</div>';

      htmlString += badgesHtml;
    }

    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
  }

  handleInsightClick(event: MouseEvent, content: string | null | undefined): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a[data-source-index]');
    if (anchor) {
      event.preventDefault();
      const indexAttr = anchor.getAttribute('data-source-index');
      if (indexAttr !== null) {
        const idx = Number(indexAttr);
        const sources = this.getSources(content);
        if (idx >= 0 && idx < sources.length) {
          const src = sources[idx];
          this.previewDocument(src.courseId, src.documentId, src.name);
        }
      }
    }
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
        this.toastService.error('No se pudo cargar la previsualización del documento.');
      }
    });
  }

  closePreview(): void {
    this.previewSecureUrl.set(null);
    this.previewDocumentTitle.set('');
  }
}
