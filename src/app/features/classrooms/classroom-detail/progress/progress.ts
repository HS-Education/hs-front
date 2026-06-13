import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { UserDataService } from '../../../../shared/services/user-data.service';
import {
  AchievementService,
  ClassroomAchievementResource,
  StudentAchievementResource,
  StudentPerformanceSummaryResource
} from './services/achievement.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../shared/services/toast.service';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { Modal } from '../../../../shared/components/modal/modal';
import { MarkdownMathPipe } from '../../../../shared/pipes/markdown-math.pipe';
import { ClassroomService } from '../../data-access/classroom.service';

@Component({
  selector: 'app-progress',
  imports: [ReactiveFormsModule, DecimalPipe, UpperCasePipe, Modal, MarkdownMathPipe],
  templateUrl: './progress.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  protected readonly userDataService = inject(UserDataService);
  private readonly achievementService = inject(AchievementService);
  private readonly classroomService = inject(ClassroomService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  readonly classroomId = input.required<number>();
  readonly courseId = input.required<number>();
  readonly academicYearId = input.required<number>();

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

  // Grading Periods
  readonly gradingPeriods = signal<Array<{ id: number; bimester: string }>>([]);
  readonly selectedGradingPeriodId = signal<number | null>(null);

  // Recommendation Modal (per student)
  readonly isRecModalOpen = signal(false);
  readonly isGeneratingRec = signal(false);
  readonly recStudentName = signal<string>('');

  // Teacher View UI State
  readonly expandedStudentId = signal<number | null>(null);

  readonly recForm = this.fb.group({
    topicName: ['', Validators.required],
    contextText: ['', Validators.required],
    numQuestions: [5, [Validators.required, Validators.min(1), Validators.max(20)]]
  });

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
    if (!data || !data.performance || !data.performance.topics) return [];
    return [...data.performance.topics].sort((a, b) => a.weekNumber - b.weekNumber);
  });

  // Computed for new Classroom Trend Graph
  readonly weeklyClassroomTrend = computed(() => {
    const data = this.classroomData();
    if (!data) return [];

    const weekScores = new Map<number, { total: number; count: number }>();

    for (const student of data.performance.students) {
      for (const topic of student.topics) {
        const current = weekScores.get(topic.weekNumber) || { total: 0, count: 0 };
        current.total += topic.score;
        current.count += 1;
        weekScores.set(topic.weekNumber, current);
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

  private loadData(classroomId: number) {
    this.isLoading.set(true);
    if (this.userDataService.isStudentView()) {
      const studentId = this.userDataService.userProfile()?.id;
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
        this.gradingPeriods.set(periods);
        if (periods.length > 0 && !this.selectedGradingPeriodId()) {
          this.selectedGradingPeriodId.set(periods[0].id);
        }
      },
      error: () => {}
    });
  }

  private loadStudentSummary(studentId: number, courseId: number, gradingPeriodId: number) {
    this.isLoadingSummary.set(true);
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

  // Regenerate student insight (student view)
  regenerateStudentInsight() {
    const studentId = this.userDataService.userProfile()?.id;
    if (!studentId) return;
    this.isGeneratingInsight.set(true);
    this.achievementService.generateStudentInsight(studentId).subscribe({
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
  loadStudentInsight(studentId: number) {
    if (this.studentInsights()[studentId] !== undefined) return; // already loaded
    this.loadingStudentInsightId.set(studentId);
    this.achievementService.getStudentAchievements(studentId).subscribe({
      next: (data) => {
        this.studentInsights.update(map => ({...map, [studentId]: data.latestInsight}));
        this.loadingStudentInsightId.set(null);
      },
      error: () => {
        this.studentInsights.update(map => ({...map, [studentId]: null}));
        this.loadingStudentInsightId.set(null);
      }
    });
  }

  // Generate insight for a specific student (teacher view)
  generateInsightForStudent(studentId: number) {
    this.generatingInsightStudentId.set(studentId);
    this.achievementService.generateStudentInsight(studentId).subscribe({
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
  toggleStudentDetails(studentId: number) {
    if (this.expandedStudentId() === studentId) {
      this.expandedStudentId.set(null);
    } else {
      this.expandedStudentId.set(studentId);
      this.loadStudentInsight(studentId);
    }
  }

  // Recommendations (per student context)
  openRecModal(studentName?: string) {
    this.recForm.reset({ numQuestions: 5 });
    this.recStudentName.set(studentName ?? '');
    this.isRecModalOpen.set(true);
  }

  closeRecModal = () => {
    this.isRecModalOpen.set(false);
  }

  submitRecommendation() {
    if (this.recForm.invalid) return;
    this.isGeneratingRec.set(true);
    const val = this.recForm.value;

    this.achievementService.generateClassroomRecommendation(this.classroomId(), {
      topicName: val.topicName!,
      contextText: val.contextText!,
      numQuestions: val.numQuestions!
    }).subscribe({
      next: () => {
        this.toastService.success('Cuestionario recomendado generado exitosamente');
        this.isGeneratingRec.set(false);
        this.closeRecModal();
      },
      error: () => this.isGeneratingRec.set(false)
    });
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
}
