import {LanguageService} from '../../../../core/i18n/language.service';
import {untracked} from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { UserDataService } from '../../../../shared/services/user-data.service';
import {
  AchievementService,
  ClassroomAchievementResource,
  ClassroomQuestionnaireProgress,
  StudentAchievementResource,
  StudentPerformance,
  StudentPerformanceSummaryResource,
  TopicPerformance
} from './services/achievement.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../shared/services/toast.service';
import { DecimalPipe } from '@angular/common';
import { Modal } from '../../../../shared/components/modal/modal';
import { MarkdownMathPipe, sanitizeRenderedHtml } from '../../../../shared/pipes/markdown-math.pipe';
import { thirdGap } from '../../../../shared/utils/performance-statistics';
import { ClassroomService } from '../../data-access/classroom.service';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { AvailableQuestionnaire, QuestionnaireService } from '../../data-access/questionnaire.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { StyledSelectDirective } from '../../../../shared/directives/styled-select.directive';

export interface AnnualBimesterSummary {
  period: { id: number; bimester: string };
  periodId: number;
  bimesterNumber: number;
  periodName: string;
  shortName: string;
  hasData: boolean;
  topicsCount: number;
  averageScore: number | null;
  percentage: number;
  topics: TopicPerformance[];
}

export type AchievementLevel = 'advanced' | 'intermediate' | 'basic' | 'critical';

interface DomainTopic extends TopicPerformance {
  evaluationCount: number;
}

@Component({
  selector: 'app-progress',
  imports: [ReactiveFormsModule, DecimalPipe, Modal, TranslocoPipe, StyledSelectDirective],
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
    .balance-flip-scene {
      perspective: 900px;
    }
    .balance-flip-inner {
      position: relative;
      display: grid;
      width: 100%;
      transform-style: preserve-3d;
      transition: transform 520ms cubic-bezier(0.2, 0.75, 0.25, 1);
    }
    .balance-flip-inner.is-flipped {
      transform: rotateY(180deg);
    }
    .balance-flip-face {
      grid-area: 1 / 1;
      min-width: 0;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .balance-flip-back {
      transform: rotateY(180deg);
    }
    .balance-domain-card {
      --domain-tone: var(--progress-in-process);
      min-height: 4.5rem;
      padding: 0.625rem;
      border: 1px solid color-mix(in srgb, var(--domain-tone) 30%, var(--border));
      border-radius: 0.75rem;
      background: color-mix(in srgb, var(--domain-tone) 10%, var(--surface));
    }
    .grade-range-input {
      position: absolute;
      inset: 50% 0 auto;
      width: 100%;
      height: 2rem;
      margin: 0;
      transform: translateY(-50%);
      appearance: none;
      background: transparent;
      pointer-events: none;
      -webkit-appearance: none;
    }
    .grade-range-input::-webkit-slider-runnable-track { height: 0.75rem; background: transparent; }
    .grade-range-input::-moz-range-track { height: 0.75rem; background: transparent; }
    .grade-range-input::-webkit-slider-thumb {
      width: 1.25rem;
      height: 1.25rem;
      margin-top: -0.25rem;
      border: 3px solid var(--surface);
      border-radius: 50%;
      background: var(--brand-primary);
      box-shadow: 0 0 0 1px var(--brand-primary), 0 1px 4px #0003;
      cursor: ew-resize;
      pointer-events: auto;
      appearance: none;
      -webkit-appearance: none;
    }
    .grade-range-input::-moz-range-thumb {
      width: 1rem;
      height: 1rem;
      border: 3px solid var(--surface);
      border-radius: 50%;
      background: var(--brand-primary);
      box-shadow: 0 0 0 1px var(--brand-primary), 0 1px 4px #0003;
      cursor: ew-resize;
      pointer-events: auto;
    }
    .gap-chart-panel {
      container-type: inline-size;
    }
    @container (max-width: 390px) {
      .gap-preset-button { padding-inline: 0.375rem; font-size: 0.625rem; }
    }
    .detail-mode-viewport { overflow: hidden; }
    .detail-enter-gap { animation: detail-from-right 240ms ease-out; }
    .detail-enter-coverage { animation: detail-from-left 240ms ease-out; }
    @keyframes detail-from-right { from { opacity: 0.55; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes detail-from-left { from { opacity: 0.55; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
    @media (prefers-reduced-motion: reduce) {
      .balance-flip-inner {
        transition-duration: 1ms;
      }
      .detail-enter-gap, .detail-enter-coverage { animation: none; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Progress {
  private readonly language = inject(LanguageService);
  private translate(key: string, params?: Record<string, unknown>): string {
    this.language.activeLanguage();
    return this.translocoService.translate(key, params);
  }
  protected readonly userDataService = inject(UserDataService);
  private readonly achievementService = inject(AchievementService);
  private readonly classroomService = inject(ClassroomService);
  private readonly fb = inject(FormBuilder);
  private readonly toastService = inject(ToastService);
  private readonly translocoService = inject(TranslocoService);
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
  readonly studentQuestionnaires = signal<AvailableQuestionnaire[]>([]);
  readonly isStudentGradesModalOpen = signal(false);
  readonly isStudentInsightModalOpen = signal(false);

  readonly isLoading = signal(false);
  readonly isLoadingSummary = signal(false);
  readonly isGeneratingInsight = signal(false);
  readonly hideSimulatedStudentInsightReferences = computed(() => {
    const user = this.userDataService.userProfile();
    return this.userDataService.isStudentView()
      && (user?.roles ?? []).some(role => !['STUDENT', 'ROLE_STUDENT'].includes(role));
  });

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

  // Student View Bimester Filter, Promedio Slider & Balance Slider
  readonly selectedBimesterFilter = signal<number | 'all'>('all');
  readonly hoveredLegendLevel = signal<AchievementLevel | null>(null);
  readonly averageSlideIndex = signal<number>(0);
  readonly balanceSlideIndex = signal<number>(0);
  readonly balanceMajorTopicIndex = signal<number>(0);
  readonly balanceMinorTopicIndex = signal<number>(0);
  private lastBalanceWheelTime = 0;
  private touchBalanceStartX = 0;
  readonly isStudentNotesModalOpen = signal(false);
  readonly selectedTopicForNotes = signal<TopicPerformance | null>(null);
  readonly studentNotesTab = signal<'weekly' | 'improvement'>('improvement');
  readonly selectedAttemptIndex = signal<number | 'all'>('all');
  readonly openedFromAnnual = signal<boolean>(false);
  readonly selectedAnnualBimester = signal<AnnualBimesterSummary | null>(null);

  getAchievementLevel(score: number | null | undefined): AchievementLevel | null {
    if (score === null || score === undefined) return null;
    if (score >= 18) return 'advanced';
    if (score >= 16) return 'intermediate';
    if (score >= 13) return 'basic';
    return 'critical';
  }

  isScoreHighlighted(score: number | null | undefined): boolean {
    const active = this.hoveredLegendLevel();
    if (!active) return false;
    return this.getAchievementLevel(score) === active;
  }

  isScoreDimmed(score: number | null | undefined): boolean {
    const active = this.hoveredLegendLevel();
    if (!active) return false;
    return this.getAchievementLevel(score) !== active;
  }

  readonly activeModalTopics = computed(() => {
    if (this.openedFromAnnual() && this.selectedAnnualBimester()) {
      return this.selectedAnnualBimester()!.topics;
    }
    return this.sortedStudentTopics();
  });

  readonly currentModalBimesterName = computed(() => {
    if (this.openedFromAnnual() && this.selectedAnnualBimester()) {
      return this.getBimesterFullSpanishName(this.selectedAnnualBimester()!.bimesterNumber);
    }
    const topic = this.selectedTopicForNotes();
    if (topic?.gradingPeriodId) {
      const idx = this.gradingPeriods().findIndex(p => p.id === topic.gradingPeriodId);
      return this.getBimesterFullSpanishName(idx >= 0 ? idx + 1 : topic.gradingPeriodId);
    }
    const periodId = this.selectedBimesterFilter();
    if (typeof periodId === 'number') {
      const idx = this.gradingPeriods().findIndex(p => p.id === periodId);
      return this.getBimesterFullSpanishName(idx >= 0 ? idx + 1 : periodId);
    }
    return this.translate('BIMESTERS.FIRST');
  });

  readonly currentModalBimesterAverage = computed<number | null>(() => {
    if (this.openedFromAnnual() && this.selectedAnnualBimester()) {
      return this.selectedAnnualBimester()!.averageScore;
    }
    const topics = this.activeModalTopics();
    if (topics.length > 0) {
      const sum = topics.reduce((acc, t) => acc + t.score, 0);
      return sum / topics.length;
    }
    return this.studentData()?.performance.averageScore !== undefined
      ? this.percentageToGrade(this.studentData()!.performance.averageScore)
      : null;
  });

  getBimesterFullSpanishName(val: number | string): string {
    const s = String(val).toUpperCase();
    if (s === '1' || s === 'FIRST' || s.includes('1')) return this.translate('BIMESTERS.FIRST');
    if (s === '2' || s === 'SECOND' || s.includes('2')) return this.translate('BIMESTERS.SECOND');
    if (s === '3' || s === 'THIRD' || s.includes('3')) return this.translate('BIMESTERS.THIRD');
    if (s === '4' || s === 'FOURTH' || s.includes('4')) return this.translate('BIMESTERS.FOURTH');
    return this.translate('BIMESTERS.FIRST');
  }
  private lastWheelTime = 0;
  private touchStartX = 0;

  // Grading Periods
  readonly gradingPeriods = signal<Array<{ id: number; bimester: string }>>([]);
  readonly selectedGradingPeriodId = signal<number | null>(null);
  readonly teacherPeriodId = signal<number | null>(null);
  readonly classroomProgressDetails = signal<ClassroomQuestionnaireProgress[]>([]);
  readonly progressDetailsLoading = signal(false);
  readonly progressDetailsError = signal(false);
  readonly averageMode = signal<'classroom' | 'bimester'>('classroom');
  readonly teacherAverageSlideIndex = signal<number>(0);
  private lastTeacherWheelTime = 0;
  private teacherTouchStartX = 0;
  readonly detailCardMode = signal<'coverage' | 'gap'>('coverage');
  readonly distributionHoveredIndex = signal<number | null>(null);
  readonly gapRangeMin = signal(0);
  readonly gapRangeMax = signal(20);
  readonly gapRangePreset = signal<'bottom' | 'top' | 'all' | null>(null);
  readonly activeSliderThumb = signal<'min' | 'max' | null>(null);

  readonly gapRangeBarStyle = computed(() => {
    const min = this.gapRangeMin();
    const max = this.gapRangeMax();
    return {
      left: `${min * 5}%`,
      width: `${Math.max(0, (max - min) * 5)}%`,
    };
  });
  private detailTouchStartX = 0;
  private lastDetailWheelTime = 0;
  readonly selectedWeekKey = signal<string | null>(null);
  readonly isDistributionModalOpen = signal(false);
  readonly selectedBucketIndex = signal<number | null>(null);
  readonly selectedDistributionStudentId = signal<number | null>(null);
  readonly distributionTab = signal<'grades' | 'sery' | 'topics'>('grades');
  readonly gradesViewMode = signal<'student' | 'matrix'>('student');
  readonly selectedTopicKey = signal<string | null>(null);

  // Teacher View UI State
  readonly expandedStudentId = signal<number | null>(null);
  readonly isStudentModalOpen = signal(false);
  readonly isClassroomInsightModalOpen = signal(false);
  readonly isRankingModalOpen = signal(false);
  readonly rankingFilter = signal<'all' | 'top' | 'bottom'>('all');

  readonly selectedStudentData = computed(() => {
    const studentId = this.expandedStudentId();
    if (!studentId) return null;
    return this.classroomData()?.performance.students.find(s => s.studentId === studentId) || null;
  });

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
    return data.performance.students.filter(s => (s.topics?.length ?? 0) > 0 && this.percentageToGrade(s.averageScore) >= 13).length;
  });

  readonly normalQuestionnaires = computed(() => this.classroomProgressDetails().filter(q => q.type === 'NORMAL'));
  readonly filteredQuestionnaires = computed(() => this.normalQuestionnaires().filter(q =>
    this.teacherPeriodId() === null || q.gradingPeriodId === this.teacherPeriodId()));
  readonly questionnaireDeliveries = computed(() => {
    const students = this.classroomData()?.performance.students ?? [];
    const quizzes = this.filteredQuestionnaires();
    const expected = students.length * quizzes.length;
    const completed = quizzes.reduce((total, quiz) => total + students.filter(student =>
      quiz.submissions.some(submission => submission.studentId === student.studentId)).length, 0);
    return { completed, expected, coverage: expected ? completed / expected * 100 : 0 };
  });

  private latestSubmission(quiz: ClassroomQuestionnaireProgress, studentId: number) {
    return quiz.submissions.filter(s => s.studentId === studentId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  }

  private gradeRows(quizzes: ClassroomQuestionnaireProgress[], periodId: number | null) {
    return (this.classroomData()?.performance.students ?? []).flatMap(student => {
      const topics = (student.topics ?? []).filter(topic =>
        topic.courseId === this.courseId() && (periodId === null || topic.gradingPeriodId === periodId));
      if (topics.length) {
        return [{ ...student, grade: this.mean(topics.map(topic => topic.score)) }];
      }
      const scores = quizzes.map(q => this.latestSubmission(q, student.studentId)?.score).filter((score): score is number => score !== undefined);
      return scores.length ? [{ ...student, grade: scores.reduce((sum, score) => sum + score, 0) / scores.length }] : [];
    });
  }

  readonly teacherStudentGrades = computed(() => this.gradeRows(this.filteredQuestionnaires(), this.teacherPeriodId()));
  readonly overallAverage = computed(() => this.mean(this.gradeRows(this.normalQuestionnaires(), null).map(s => s.grade)));
  readonly activeBimesterId = computed(() => this.teacherPeriodId() ?? this.gradingPeriods().at(-1)?.id ?? null);
  readonly bimesterAverage = computed(() => this.mean(this.gradeRows(
    this.normalQuestionnaires().filter(q => q.gradingPeriodId === this.activeBimesterId()), this.activeBimesterId()
  ).map(s => s.grade)));
  readonly displayedAverage = computed(() => this.teacherPeriodId() === null || this.averageMode() === 'classroom'
    ? this.overallAverage() : this.bimesterAverage());
  readonly displayedEvaluatedCount = computed(() => this.teacherPeriodId() === null || this.averageMode() === 'classroom'
    ? this.gradeRows(this.normalQuestionnaires(), null).length
    : this.gradeRows(this.normalQuestionnaires().filter(q => q.gradingPeriodId === this.teacherPeriodId()), this.teacherPeriodId()).length);

  private mean(values: number[]) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  readonly coverageStudents = computed(() => {
    return this.teacherStudentGrades();
  });

  readonly selectedWeeks = computed(() => {
    const weeks = new Map<string, { key: string; periodId: number; weekNumber: number; quizzes: ClassroomQuestionnaireProgress[] }>();
    for (const quiz of this.filteredQuestionnaires()) {
      const key = `${quiz.gradingPeriodId}:${quiz.weekNumber}`;
      if (!weeks.has(key)) weeks.set(key, { key, periodId: quiz.gradingPeriodId, weekNumber: quiz.weekNumber, quizzes: [] });
      weeks.get(key)!.quizzes.push(quiz);
    }
    for (const student of this.classroomData()?.performance.students ?? []) {
      for (const topic of student.topics ?? []) {
        if (topic.courseId !== this.courseId() || (this.teacherPeriodId() !== null && topic.gradingPeriodId !== this.teacherPeriodId())) continue;
        const key = `${topic.gradingPeriodId}:${topic.weekNumber}`;
        if (!weeks.has(key)) weeks.set(key, { key, periodId: topic.gradingPeriodId, weekNumber: topic.weekNumber, quizzes: [] });
      }
    }
    return [...weeks.values()].sort((a, b) => a.periodId - b.periodId || a.weekNumber - b.weekNumber);
  });
  readonly activeWeek = computed(() => this.selectedWeeks().find(w => w.key === this.selectedWeekKey()) ?? this.selectedWeeks().at(-1) ?? null);
  readonly weekDeliveredStudents = computed(() => {
    const week = this.activeWeek();
    if (!week?.quizzes.length) return [];
    return (this.classroomData()?.performance.students ?? []).filter(student =>
      week.quizzes.every(quiz => quiz.submissions.some(submission => submission.studentId === student.studentId)));
  });
  readonly weekCompletedCount = computed(() => this.weekDeliveredStudents().length);
  readonly weekExpectedDeliveries = computed(() => (this.activeWeek()?.quizzes.length ?? 0) * this.totalStudents());
  readonly weekCompletedDeliveries = computed(() => {
    const week = this.activeWeek();
    if (!week) return 0;
    return week.quizzes.reduce((count, quiz) => count + (this.classroomData()?.performance.students ?? []).filter(student =>
      quiz.submissions.some(submission => submission.studentId === student.studentId)).length, 0);
  });
  readonly weekPendingDeliveries = computed(() => Math.max(0, this.weekExpectedDeliveries() - this.weekCompletedDeliveries()));
  readonly rankedTeacherStudents = computed(() => [...this.teacherStudentGrades()].sort((a, b) => b.grade - a.grade));
  readonly gapThirdBoundaries = computed(() => {
    const students = this.rankedTeacherStudents();
    if (!students.length) return null;
    const thirdSize = Math.max(1, Math.ceil(students.length / 3));
    const bottom = students.slice(-thirdSize);
    const top = students.slice(0, thirdSize);
    return {
      bottomMin: Math.min(...bottom.map(student => student.grade)),
      bottomMax: Math.max(...bottom.map(student => student.grade)),
      topMin: Math.min(...top.map(student => student.grade)),
      topMax: Math.max(...top.map(student => student.grade)),
    };
  });
  readonly studentsInGapRange = computed(() => this.rankedTeacherStudents().filter(student =>
    student.grade >= this.gapRangeMin() && student.grade <= this.gapRangeMax()));
  readonly topThird = computed(() => this.rankedTeacherStudents().slice(0, Math.ceil(this.rankedTeacherStudents().length / 3)));
  readonly bottomThird = computed(() => this.rankedTeacherStudents().length < 2 ? [] : this.rankedTeacherStudents().slice(-Math.ceil(this.rankedTeacherStudents().length / 3)).reverse());
  readonly topThirdAverage = computed(() => this.mean(this.topThird().map(student => student.grade)));
  readonly bottomThirdAverage = computed(() => this.mean(this.bottomThird().map(student => student.grade)));

  readonly distributionStudents = computed(() => this.teacherStudentGrades().filter(student => {
    const index = this.selectedBucketIndex();
    return index !== null && this.bucketForGrade(student.grade) === index;
  }).sort((a, b) => b.grade - a.grade));
  readonly distributionStudent = computed(() => this.classroomData()?.performance.students.find(s => s.studentId === this.selectedDistributionStudentId()) ?? null);
  readonly selectedDistributionStudent = computed(() =>
    this.distributionStudents().find(s => s.studentId === this.selectedDistributionStudentId()) ?? null
  );
  readonly selectedStudentWeeklyGrades = computed(() => {
    const student = this.distributionStudent();
    if (!student) return [];
    return this.selectedWeeks().map(week => {
      const topic = (student.topics ?? []).find(t => t.courseId === this.courseId()
        && t.gradingPeriodId === week.periodId && t.weekNumber === week.weekNumber);
      const submissions = week.quizzes.map(quiz => this.latestSubmission(quiz, student.studentId)?.score)
        .filter((score): score is number => score !== undefined);
      const score = topic?.score ?? (submissions.length ? this.mean(submissions) : null);
      return {
        key: week.key,
        periodId: week.periodId,
        periodName: this.periodName(week.periodId),
        weekNumber: week.weekNumber,
        topicName: topic?.topicName ?? (submissions.length ? this.translate('I18N.WEEK_ASSESSMENT', {week: week.weekNumber}) : this.translate('UI_TEXT.NO_ASSESSMENT_RECORDED')),
        score,
        hasScore: score !== null,
      };
    });
  });
  getAchievementLevelName(score: number): string {
    if (score >= 18) return 'Logro Destacado';
    if (score >= 16) return 'Logro Esperado';
    if (score >= 13) return 'En Proceso';
    return 'En Inicio';
  }
  readonly distributionGradeRows = computed(() => this.distributionStudents().map(student => ({
    student,
    grades: this.selectedWeeks().map(week => {
      const topic = (student.topics ?? []).find(t => t.courseId === this.courseId()
        && t.gradingPeriodId === week.periodId && t.weekNumber === week.weekNumber);
      const submissions = week.quizzes.map(quiz => this.latestSubmission(quiz, student.studentId)?.score)
        .filter((score): score is number => score !== undefined);
      return {
        key: week.key,
        periodId: week.periodId,
        weekNumber: week.weekNumber,
        score: topic?.score ?? (submissions.length ? this.mean(submissions) : null),
      };
    }),
  })));
  readonly distributionTopics = computed(() => (this.distributionStudent()?.topics ?? [])
    .filter(topic => topic.courseId === this.courseId() && (this.teacherPeriodId() === null || topic.gradingPeriodId === this.teacherPeriodId()))
    .sort((a, b) => a.gradingPeriodId - b.gradingPeriodId || a.weekNumber - b.weekNumber));
  readonly activeDistributionTopic = computed<TopicPerformance | null>(() => this.distributionTopics().find(t => `${t.gradingPeriodId}:${t.topicId}` === this.selectedTopicKey()) ?? this.distributionTopics()[0] ?? null);
  readonly studentQuestionResults = computed(() => {
    const studentId = this.selectedDistributionStudentId();
    const topic = this.activeDistributionTopic();
    if (!studentId || !topic) return [];
    return this.classroomProgressDetails()
      .filter(q => q.gradingPeriodId === topic.gradingPeriodId && (this.teacherPeriodId() === null || q.gradingPeriodId === this.teacherPeriodId()))
      .flatMap(q => q.submissions.filter(s => s.studentId === studentId).flatMap(s => s.answers
        .filter(a => a.topicId === topic.topicId)
        .map(a => ({ ...a, weekNumber: q.weekNumber, submittedAt: s.submittedAt }))))
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  });

  bucketForGrade(grade: number) {
    return grade < 13 ? 0 : grade < 16 ? 1 : grade < 18 ? 2 : 3;
  }

  readonly studentsAtRisk = computed(() => {
    const data = this.classroomData();
    if (!data) return 0;
    return data.performance.students.filter(s => (s.topics?.length ?? 0) > 0 && this.percentageToGrade(s.averageScore) < 13).length;
  });

  readonly studentsRegular = computed(() => {
    const data = this.classroomData();
    if (!data) return 0;
    return data.performance.students.filter(s => (s.topics?.length ?? 0) > 0 && this.percentageToGrade(s.averageScore) >= 13 && this.percentageToGrade(s.averageScore) < 18).length;
  });

  readonly hasEvaluatedStudents = computed(() => {
    const data = this.classroomData();
    if (!data) return false;
    return data.performance.students.some(s => (s.topics?.length ?? 0) > 0);
  });

  readonly sortedStudents = computed(() => {
    const data = this.classroomData();
    if (!data) return [];
    return [...data.performance.students]
      .filter(s => (s.topics?.length ?? 0) > 0)
      .sort((a, b) => b.averageScore - a.averageScore);
  });

  readonly teacherSelectedBimesterName = computed(() => {
    const periodId = this.teacherPeriodId();
    if (periodId === null) {
      return this.translate('PROGRESS.EXPLORER.ALL_PERIODS');
    }
    const period = this.gradingPeriods().find(p => p.id === periodId);
    return period ? this.translateBimester(period.bimester) : '';
  });

  readonly teacherBimestersAnnual = computed(() => {
    const periods = this.gradingPeriods();
    const students = this.classroomData()?.performance.students ?? [];
    const total = students.length;
    return periods.map((period, index) => {
      const quizzes = this.normalQuestionnaires().filter(q => q.gradingPeriodId === period.id);
      const rows = this.gradeRows(quizzes, period.id);
      const evaluatedCount = rows.length;
      const expected = total * quizzes.length;
      const delivered = quizzes.reduce((count, quiz) => count + students.filter(student =>
        quiz.submissions.some(submission => submission.studentId === student.studentId)).length, 0);
      const coverage = expected > 0 ? delivered / expected * 100 : 0;
      const average = this.mean(rows.map(r => r.grade));
      return {
        periodId: period.id,
        bimesterNumber: index + 1,
        name: this.translateBimester(period.bimester),
        shortName: this.translate('BIMESTERS.BIMESTER_' + (index + 1)),
        evaluatedCount,
        delivered,
        expected,
        total,
        coverage,
        average,
        hasData: expected > 0
      };
    });
  });

  /** Students with at least one submitted assessment, used by teacher dashboard widgets. */
  readonly evaluatedStudents = computed(() => {
    return this.coverageStudents();
  });

  readonly evaluatedStudentsCount = computed(() => {
    return this.evaluatedStudents().length;
  });

  readonly evaluationCoverage = computed(() => this.questionnaireDeliveries().coverage);

  readonly disapprovedStudents = computed(() => this.studentsAtRisk());

  readonly topStudents = computed(() => this.sortedStudents().slice(0, 3));

  /** Keeps the full ranking available while offering quick top/bottom third views. */
  readonly filteredRankingStudents = computed(() => {
    const students = this.sortedStudents();
    const thirdSize = Math.ceil(students.length / 3);

    if (this.rankingFilter() === 'top') return students.slice(0, thirdSize);
    if (this.rankingFilter() === 'bottom') return students.slice(-thirdSize);
    return students;
  });

  /** Difference between the upper and lower thirds of evaluated students. */
  readonly levelGap = computed(() => {
    if (this.teacherPeriodId() === null) {
      const activePeriods = this.gradingPeriods();
      const gaps: number[] = [];
      for (const p of activePeriods) {
        const quizzes = this.normalQuestionnaires().filter(q => q.gradingPeriodId === p.id);
        const rows = [...this.gradeRows(quizzes, p.id)].sort((a, b) => b.grade - a.grade);
        if (rows.length >= 2) {
          gaps.push(thirdGap(rows.map(row => row.grade)));
        }
      }
      if (gaps.length > 0) {
        return this.mean(gaps);
      }
    }
    return thirdGap(this.rankedTeacherStudents().map(student => student.grade));
  });

  readonly levelGapLabel = computed(() => {
    const gap = this.levelGap();
    if (gap < 2) return 'PROGRESS.DASHBOARD.GAP_STABLE';
    if (gap < 4) return 'PROGRESS.DASHBOARD.GAP_MODERATE';
    return 'PROGRESS.DASHBOARD.GAP_HIGH';
  });

  readonly selectedBimesterName = computed(() => {
    const filter = this.selectedBimesterFilter();
    if (filter === 'all') {
      return this.translate('PROGRESS.EXPLORER.ALL_PERIODS');
    }
    const period = this.gradingPeriods().find(p => p.id === filter);
    return period ? this.translateBimester(period.bimester) : '';
  });

  readonly studentBimesterAverage = computed(() => {
    const summary = this.summaryData();
    if (summary?.bimesterAverage !== undefined && summary.bimesterAverage !== null) {
      return this.percentageToGrade(summary.bimesterAverage);
    }
    const topics = this.sortedStudentTopics();
    if (topics.length > 0) {
      const sum = topics.reduce((acc, t) => acc + t.score, 0);
      return sum / topics.length;
    }
    const data = this.studentData();
    return data ? this.percentageToGrade(data.performance.averageScore) : 0;
  });

  readonly sortedStudentTopics = computed(() => {
    const data = this.studentData();
    const filter = this.selectedBimesterFilter();
    const cId = this.courseId();
    if (!data || !data.performance || !data.performance.topics || !cId) return [];

    let topics = data.performance.topics.filter(t => t.courseId === cId);

    if (filter !== 'all') {
      const isSimulation = this.userDataService.isStudentView()
        && (this.userDataService.isTeacher() || this.userDataService.isCoordinator());
      const periodId = isSimulation
        ? this.gradingPeriods().findIndex(period => period.id === filter) + 1
        : filter;
      topics = topics.filter(t => t.gradingPeriodId === periodId);
    }

    return topics.sort((a, b) => a.gradingPeriodId - b.gradingPeriodId || a.weekNumber - b.weekNumber);
  });

  /**
   * 4 Bimester performance summaries for the Annual Timeline view ("Todos los bimestres").
   */
  readonly studentBimestersAnnual = computed(() => {
    const data = this.studentData();
    const cId = this.courseId();
    const periods = this.gradingPeriods();
    if (!periods || periods.length === 0) return [];

    const allTopics = (data?.performance?.topics ?? []).filter(t => t.courseId === cId);
    const isSimulation = this.userDataService.isStudentView()
      && (this.userDataService.isTeacher() || this.userDataService.isCoordinator());

    return periods.map((period, index) => {
      const periodId = isSimulation ? index + 1 : period.id;
      const periodTopics = allTopics
        .filter(t => t.gradingPeriodId === periodId)
        .sort((a, b) => a.weekNumber - b.weekNumber);

      const hasData = periodTopics.length > 0;
      const averageScore = hasData
        ? periodTopics.reduce((acc, t) => acc + t.score, 0) / periodTopics.length
        : null;

      const percentage = averageScore !== null ? (averageScore / 20) * 100 : 0;

      return {
        period,
        periodId: period.id,
        bimesterNumber: index + 1,
        periodName: this.translateBimester(period.bimester),
        shortName: this.translate('BIMESTERS.BIMESTER_' + (index + 1)),
        hasData,
        topicsCount: periodTopics.length,
        averageScore,
        percentage,
        topics: periodTopics
      };
    });
  });

  // Group weekly performance by topic so the domain card represents mastery by theme,
  // not a single unusually high/low weekly result.
  readonly studentStrengths = computed<{ majorDomains: DomainTopic[]; minorDomains: DomainTopic[]; best: DomainTopic; opportunity: DomainTopic | null } | null>(() => {
    const records = this.sortedStudentTopics();
    if (records.length === 0) return null;

    const topicsById = new Map<number, TopicPerformance[]>();
    for (const record of records) {
      const topicRecords = topicsById.get(record.topicId) ?? [];
      topicRecords.push(record);
      topicsById.set(record.topicId, topicRecords);
    }

    const domains: DomainTopic[] = Array.from(topicsById.values()).map(topicRecords => {
      const latest = topicRecords[topicRecords.length - 1];
      const averageScore = topicRecords.reduce((sum, record) => sum + record.score, 0) / topicRecords.length;
      const averagePercentage = topicRecords.reduce((sum, record) => sum + record.percentage, 0) / topicRecords.length;
      return {
        ...latest,
        score: Number(averageScore.toFixed(2)),
        percentage: Number(averagePercentage.toFixed(2)),
        evaluationCount: topicRecords.length
      };
    }).sort((a, b) => b.score - a.score || a.topicName.localeCompare(b.topicName));

    const highestScore = domains[0].score;
    const majorDomains = domains.filter(topic => topic.score === highestScore);
    const minorDomains = domains
      .filter(topic => topic.score < 13)
      .sort((a, b) => a.score - b.score || a.topicName.localeCompare(b.topicName));

    const best = majorDomains[this.balanceMajorTopicIndex() % majorDomains.length];
    const opportunity = minorDomains.length > 0
      ? minorDomains[this.balanceMinorTopicIndex() % minorDomains.length]
      : null;

    return { majorDomains, minorDomains, best, opportunity };
  });

  readonly selectedStudentQuestionnaires = computed(() => {
    const periodId = this.selectedGradingPeriodId();
    return this.studentQuestionnaires().filter(q => q.courseId === this.courseId() && (!periodId || q.gradingPeriodId === periodId));
  });

  /**
   * The simulated student view does not call the questionnaire listing endpoint.
   * Use its summary grades as a visual fallback so the cards remain representative
   * while real students continue using the endpoint data.
   */
  readonly studentQuestionnaireSegments = computed(() => {
    const available = this.selectedStudentQuestionnaires();
    if (available.length > 0) return available;

    return (this.summaryData()?.definitiveGrades ?? []).map(grade => ({
      id: grade.questionnaireId,
      status: 'COMPLETED' as const
    }));
  });

  readonly completedQuestionnaires = computed(() => this.studentQuestionnaireSegments().filter(q => q.status === 'COMPLETED').length);

  readonly questionnaireCompletion = computed(() => {
    const segments = this.studentQuestionnaireSegments();
    const total = segments.length;
    return total > 0 ? (this.completedQuestionnaires() / total) * 100 : 0;
  });

  readonly courseProgress = computed(() => {
    const total = this.studentQuestionnaireSegments().length;
    if (total > 0) return this.questionnaireCompletion();
    const summary = this.summaryData();
    return summary && summary.weeklyProgression.length > 0 ? Math.min(100, summary.weeklyProgression.length * 20) : 0;
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
          current.total += topic.score;
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

  // New Dashboard Widgets Data
  readonly gradeDistribution = computed(() => {
    let buckets = [
      { label: '0–12', count: 0, color: 'var(--progress-reinforce)' },
      { label: '13–15', count: 0, color: 'var(--progress-in-process)' },
      { label: '16–17', count: 0, color: 'var(--progress-achieved)' },
      { label: '18–20', count: 0, color: 'var(--progress-excellent)' }
    ];
    for (const student of this.teacherStudentGrades()) {
      buckets[this.bucketForGrade(student.grade)].count++;
    }
    const max = Math.max(...buckets.map(b => b.count));
    return buckets.map((b, index) => ({ ...b, index, height: max > 0 ? (b.count / max) * 100 : 0 }));
  });

  readonly topicMastery = computed(() => {
    const data = this.classroomData();
    if (!data) return [];
    const topicsMap = new Map<number, { name: string, total: number, count: number }>();
    for (const student of data.performance.students) {
      for (const topic of student.topics) {
        if (topic.courseId === this.courseId()) {
          const current = topicsMap.get(topic.topicId) || { name: topic.topicName, total: 0, count: 0 };
          current.total += topic.percentage;
          current.count += 1;
          topicsMap.set(topic.topicId, current);
        }
      }
    }
    return Array.from(topicsMap.values())
      .map(t => ({ name: t.name, average: t.total / t.count }))
      .sort((a, b) => b.average - a.average);
  });

  readonly earlyWarningStudents = computed(() => {
    return this.sortedStudents().filter(s => this.percentageToGrade(s.averageScore) < 13).slice(0, 4);
  });

  // SVG chart helpers
  readonly maxWeeklyScore = computed(() => {
    const summary = this.summaryData();
    return 20;
  });

  constructor() {
    effect(() => {
      this.language.activeLanguage();
      untracked(() => {
        if (this.userDataService.isStudentView() && (this.userDataService.isTeacher() || this.userDataService.isCoordinator()) && this.studentData()?.performance.studentId === 999) {
          this.studentData.set(this.getMockStudentData());
        }
      });
    });
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
      this.questionnaireService.getAvailableQuestionnaires().subscribe({
        next: (questionnaires) => this.studentQuestionnaires.set(questionnaires),
        error: () => this.studentQuestionnaires.set([])
      });
      this.achievementService.getStudentAchievements(studentId).subscribe({
        next: (data) => {
          this.studentData.set(data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      this.progressDetailsLoading.set(true);
      this.progressDetailsError.set(false);
      this.achievementService.getClassroomProgressDetails(classroomId).subscribe({
        next: details => {
          this.classroomProgressDetails.set(details);
          this.progressDetailsLoading.set(false);
        },
        error: () => {
          this.classroomProgressDetails.set([]);
          this.progressDetailsError.set(true);
          this.progressDetailsLoading.set(false);
        }
      });
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
    const userProfile = this.userDataService.userProfile();
    if (this.userDataService.isStudentView() && userProfile && (userProfile.roles.includes('TEACHER') || userProfile.roles.includes('COORDINATOR'))) {
      const index = this.gradingPeriods().findIndex(p => p.id === gradingPeriodId);
      const periodIndex = index >= 0 ? index + 1 : gradingPeriodId;
      this.summaryData.set(this.getMockSummaryData(periodIndex));
      this.isLoadingSummary.set(false);
      return;
    }

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

  onTeacherPeriodChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.teacherPeriodId.set(value ? +value : null);
    const selectedPreset = this.gapRangePreset();
    if (selectedPreset) this.setGapRangePreset(selectedPreset);
    if (!value) this.averageMode.set('classroom');
    this.teacherAverageSlideIndex.set(0);
    this.selectedWeekKey.set(null);
    this.isDistributionModalOpen.set(false);
  }

  onWeekChange(event: Event) {
    this.selectedWeekKey.set((event.target as HTMLSelectElement).value);
  }

  onTopicChange(event: Event) {
    this.selectedTopicKey.set((event.target as HTMLSelectElement).value);
  }

  openDistributionModal(index: number) {
    this.selectedBucketIndex.set(index);
    const students = this.distributionStudents();
    this.selectedDistributionStudentId.set(students[0]?.studentId ?? null);
    this.selectedTopicKey.set(null);
    this.distributionTab.set('grades');
    this.gradesViewMode.set('student');
    this.isDistributionModalOpen.set(true);
  }

  closeDistributionModal = () => this.isDistributionModalOpen.set(false);

  selectDistributionStudent(studentId: number) {
    this.selectedDistributionStudentId.set(studentId);
    this.selectedTopicKey.set(null);
    if (this.distributionTab() === 'sery') this.loadStudentInsight(studentId);
  }

  selectDistributionTab(tab: 'grades' | 'sery' | 'topics') {
    this.distributionTab.set(tab);
    if (tab === 'grades') {
      if (!this.selectedDistributionStudentId()) {
        this.selectedDistributionStudentId.set(this.distributionStudents()[0]?.studentId ?? null);
      }
      return;
    }

    // Sery and topic details require an intentional student selection.
    this.selectedDistributionStudentId.set(null);
    this.selectedTopicKey.set(null);
  }

  periodName(periodId: number): string {
    const period = this.gradingPeriods().find(p => p.id === periodId);
    return period ? this.translateBimester(period.bimester) : '';
  }

  translateBimester(bimester: string): string {
    return this.translate('BIMESTERS.' + bimester.toUpperCase());
  }

  // Regenerate student insight (student view)
  regenerateStudentInsight() {
    const studentId = this.userDataService.userProfile()?.id;
    const studentName = this.userDataService.userProfile()?.name || this.translate('ENUM.STUDENT');
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
  openStudentModal(studentId: number, studentName: string) {
    this.expandedStudentId.set(studentId);
    this.isStudentModalOpen.set(true);
    this.loadStudentInsight(studentId, studentName);
  }

  closeStudentModal = () => {
    this.isStudentModalOpen.set(false);
    this.expandedStudentId.set(null);
  }

  openClassroomInsightModal = () => {
    this.isClassroomInsightModalOpen.set(true);
  }

  closeClassroomInsightModal = () => {
    this.isClassroomInsightModalOpen.set(false);
  }

  openStudentGradesModal = () => this.isStudentGradesModalOpen.set(true);

  closeStudentGradesModal = () => this.isStudentGradesModalOpen.set(false);

  openStudentInsightModal = () => this.isStudentInsightModalOpen.set(true);

  closeStudentInsightModal = () => this.isStudentInsightModalOpen.set(false);

  openRankingModal = () => {
    this.rankingFilter.set('all');
    this.isRankingModalOpen.set(true);
  }

  closeRankingModal = () => {
    this.isRankingModalOpen.set(false);
  }

  setRankingFilter(filter: 'all' | 'top' | 'bottom') {
    this.rankingFilter.set(filter);
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
        this.toastService.success(this.translate('CLASSROOMS.QUIZZES.RECOMMENDED_GENERATE_SUCCESS'));
        this.isGeneratingRec.set(false);
        this.closeRecModal();
      },
      error: () => this.isGeneratingRec.set(false)
    });
  }

  onStudentBimesterFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    if (value === 'all') {
      this.selectedBimesterFilter.set('all');
      this.selectedGradingPeriodId.set(null);
      this.averageSlideIndex.set(0);
      this.summaryData.set(null);
      this.isLoadingSummary.set(false);
    } else {
      const numValue = +value;
      this.selectedBimesterFilter.set(numValue);
      this.selectedGradingPeriodId.set(numValue);
      // USER REQUIREMENT: Leave on general (0), let the user decide if they want to slide to bimestral
      this.averageSlideIndex.set(0);
      const studentId = this.userDataService.userProfile()?.id;
      const courseId = this.courseId();
      if (studentId && courseId) {
        this.loadStudentSummary(studentId, courseId, numValue);
      }
    }
  }

  selectBimesterFromAnnualCard(periodId: number) {
    this.selectedBimesterFilter.set(periodId);
    this.selectedGradingPeriodId.set(periodId);
    this.averageSlideIndex.set(0);
    const studentId = this.userDataService.userProfile()?.id;
    const courseId = this.courseId();
    if (studentId && courseId) {
      this.loadStudentSummary(studentId, courseId, periodId);
    }
  }

  onPromedioWheel(event: WheelEvent) {
    // Only allow sliding between General and Bimestral when a specific bimester is selected
    if (this.selectedBimesterFilter() === 'all') return;
    if (Math.abs(event.deltaX) > 20 && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
      const now = Date.now();
      if (now - this.lastWheelTime < 350) return;
      this.lastWheelTime = now;

      if (event.deltaX > 0) {
        this.averageSlideIndex.set(1);
      } else {
        this.averageSlideIndex.set(0);
      }
    }
  }

  onPromedioTouchStart(event: TouchEvent) {
    if (this.selectedBimesterFilter() === 'all') return;
    if (event.touches.length > 0) {
      this.touchStartX = event.touches[0].clientX;
    }
  }

  onPromedioTouchEnd(event: TouchEvent) {
    if (this.selectedBimesterFilter() === 'all') return;
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const diffX = touchEndX - this.touchStartX;
      if (Math.abs(diffX) > 35) {
        if (diffX < 0) {
          this.averageSlideIndex.set(1);
        } else {
          this.averageSlideIndex.set(0);
        }
      }
    }
  }

  setAverageSlide(index: number) {
    this.averageSlideIndex.set(index);
  }

  onTeacherPromedioWheel(event: WheelEvent) {
    if (this.teacherPeriodId() === null) return;
    if (Math.abs(event.deltaX) > 20 && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
      const now = Date.now();
      if (now - this.lastTeacherWheelTime < 350) return;
      this.lastTeacherWheelTime = now;

      if (event.deltaX > 0) {
        this.teacherAverageSlideIndex.set(1);
      } else {
        this.teacherAverageSlideIndex.set(0);
      }
    }
  }

  onTeacherPromedioTouchStart(event: TouchEvent) {
    if (this.teacherPeriodId() === null) return;
    if (event.touches.length > 0) {
      this.teacherTouchStartX = event.touches[0].clientX;
    }
  }

  onTeacherPromedioTouchEnd(event: TouchEvent) {
    if (this.teacherPeriodId() === null) return;
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const diffX = touchEndX - this.teacherTouchStartX;
      if (Math.abs(diffX) > 35) {
        if (diffX < 0) {
          this.teacherAverageSlideIndex.set(1);
        } else {
          this.teacherAverageSlideIndex.set(0);
        }
      }
    }
  }

  setTeacherAverageSlide(index: number) {
    this.teacherAverageSlideIndex.set(index);
  }

  setDetailCardMode(mode: 'coverage' | 'gap'): void {
    this.detailCardMode.set(mode);
  }

  onDetailWheel(event: WheelEvent): void {
    if (Math.abs(event.deltaX) <= 20 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    const now = Date.now();
    if (now - this.lastDetailWheelTime < 350) return;
    this.lastDetailWheelTime = now;
    this.setDetailCardMode(event.deltaX > 0 ? 'gap' : 'coverage');
  }

  onDetailTouchStart(event: TouchEvent): void {
    this.detailTouchStartX = event.touches[0]?.clientX ?? 0;
  }

  onDetailTouchEnd(event: TouchEvent): void {
    if ((event.target as HTMLElement)?.closest('input, select')) return;
    const distance = (event.changedTouches[0]?.clientX ?? this.detailTouchStartX) - this.detailTouchStartX;
    if (Math.abs(distance) > 35) this.setDetailCardMode(distance < 0 ? 'gap' : 'coverage');
  }

  setGapRangeMin(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = Number(input.value);
    const maxVal = this.gapRangeMax();
    // Clamping estricto: el mínimo nunca puede superar al máximo
    const clamped = Math.min(maxVal, Math.max(0, raw));
    input.value = String(clamped);
    this.gapRangeMin.set(clamped);
    this.gapRangePreset.set(null);
  }

  setGapRangeMax(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = Number(input.value);
    const minVal = this.gapRangeMin();
    // Clamping estricto: el máximo nunca puede ser menor que el mínimo
    const clamped = Math.max(minVal, Math.min(20, raw));
    input.value = String(clamped);
    this.gapRangeMax.set(clamped);
    this.gapRangePreset.set(null);
  }

  onGapTrackClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).tagName === 'INPUT') return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width) return;
    const clickX = event.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const grade = Math.round(percent * 20 * 2) / 2;
    const min = this.gapRangeMin();
    const max = this.gapRangeMax();
    if (Math.abs(grade - min) <= Math.abs(grade - max)) {
      this.gapRangeMin.set(Math.min(max, Math.max(0, grade)));
    } else {
      this.gapRangeMax.set(Math.max(min, Math.min(20, grade)));
    }
    this.gapRangePreset.set(null);
  }

  setGapRangePreset(preset: 'bottom' | 'top' | 'all'): void {
    if (preset === 'all' || this.gapRangePreset() === preset) {
      this.gapRangeMin.set(0);
      this.gapRangeMax.set(20);
      this.gapRangePreset.set(null);
      return;
    }
    const bounds = this.gapThirdBoundaries();
    if (!bounds) return;
    if (preset === 'bottom') {
      const newMax = Math.min(20, Math.ceil(bounds.bottomMax * 2) / 2);
      this.gapRangeMin.set(0);
      this.gapRangeMax.set(newMax);
    } else {
      const newMin = Math.max(0, Math.floor(bounds.topMin * 2) / 2);
      this.gapRangeMin.set(newMin);
      this.gapRangeMax.set(20);
    }
    this.gapRangePreset.set(preset);
  }

  getCoverageColor(coverage: number): string {
    if (coverage >= 80) return 'var(--progress-success)';
    if (coverage >= 50) return 'var(--brand-primary)';
    return 'var(--progress-reinforce)';
  }

  getCoverageBgColor(coverage: number): string {
    if (coverage >= 80) return 'rgba(22, 101, 52, 0.1)';
    if (coverage >= 50) return 'var(--brand-primary-soft)';
    return 'rgba(185, 28, 28, 0.1)';
  }

  onBalanceWheel(event: WheelEvent) {
    if (!this.studentStrengths()) return;
    if (Math.abs(event.deltaX) > 20 && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
      const now = Date.now();
      if (now - this.lastBalanceWheelTime < 350) return;
      this.lastBalanceWheelTime = now;
      this.cycleBalanceTopic(event.deltaX > 0 ? 1 : -1);
    }
  }

  selectBalanceTopic(side: 0 | 1, index: number): void {
    if (side === 0) this.balanceMajorTopicIndex.set(index);
    else this.balanceMinorTopicIndex.set(index);
  }

  toggleBalanceSide(): void {
    this.balanceSlideIndex.update(side => side === 0 ? 1 : 0);
  }

  private cycleBalanceTopic(direction: -1 | 1): void {
    const strengths = this.studentStrengths();
    if (!strengths) return;

    const side = this.balanceSlideIndex();
    const topicCount = side === 0 ? strengths.majorDomains.length : strengths.minorDomains.length;
    if (topicCount <= 1) return;

    const selectedIndex = side === 0 ? this.balanceMajorTopicIndex() : this.balanceMinorTopicIndex();
    const nextIndex = (selectedIndex + direction + topicCount) % topicCount;
    this.selectBalanceTopic(side === 0 ? 0 : 1, nextIndex);
  }

  onBalanceTouchStart(event: TouchEvent) {
    if (event.touches.length > 0) {
      this.touchBalanceStartX = event.touches[0].clientX;
    }
  }

  onBalanceTouchEnd(event: TouchEvent) {
    if (!this.studentStrengths()) return;
    if (event.changedTouches.length > 0) {
      const touchEndX = event.changedTouches[0].clientX;
      const diffX = touchEndX - this.touchBalanceStartX;
      if (Math.abs(diffX) > 35) {
        this.cycleBalanceTopic(diffX < 0 ? 1 : -1);
      }
    }
  }

  getTopicImprovement(topic: TopicPerformance): {
    hasHistory: boolean;
    initialScore: number;
    currentScore: number;
    diff: number;
    hasImproved: boolean;
    attemptsCount: number;
  } {
    const history = topic.progressHistory;
    if (!history || history.length <= 1) {
      return {
        hasHistory: false,
        initialScore: topic.score,
        currentScore: topic.score,
        diff: 0,
        hasImproved: false,
        attemptsCount: history?.length || 1
      };
    }

    const initialScore = this.percentageToGrade(history[0]);
    const currentScore = this.percentageToGrade(history[history.length - 1]);
    const diff = currentScore - initialScore;

    return {
      hasHistory: true,
      initialScore,
      currentScore,
      diff,
      hasImproved: diff > 0,
      attemptsCount: history.length
    };
  }

  getTopicWeeklyGrades(topic: TopicPerformance): Array<{ questionnaireId: number; weekNumber: number; score: number }> {
    const summary = this.summaryData();
    if (summary && summary.definitiveGrades.length > 0) {
      const match = summary.definitiveGrades.filter(g => g.weekNumber === topic.weekNumber);
      if (match.length > 0) return match;
    }
    return [{
      questionnaireId: topic.topicId,
      weekNumber: topic.weekNumber,
      score: topic.score
    }];
  }

  openStudentNotesModal(topic: TopicPerformance) {
    this.selectedTopicForNotes.set(topic);
    this.selectedAttemptIndex.set('all');
    this.openedFromAnnual.set(false);
    this.selectedAnnualBimester.set(null);
    this.studentNotesTab.set('improvement');
    this.isStudentNotesModalOpen.set(true);
  }

  openBimesterDirectModal(bim: AnnualBimesterSummary) {
    this.selectedAnnualBimester.set(bim);
    this.openedFromAnnual.set(true);
    this.selectedAttemptIndex.set('all');
    if (bim.topics.length > 0) {
      this.selectedTopicForNotes.set(bim.topics[0]);
    } else {
      this.selectedTopicForNotes.set(null);
    }
    this.studentNotesTab.set('improvement');
    this.isStudentNotesModalOpen.set(true);
  }

  selectTopicInModal(topic: TopicPerformance) {
    this.selectedTopicForNotes.set(topic);
    this.selectedAttemptIndex.set('all');
  }

  closeStudentNotesModal = () => {
    this.isStudentNotesModalOpen.set(false);
    this.selectedTopicForNotes.set(null);
    this.openedFromAnnual.set(false);
    this.selectedAnnualBimester.set(null);
  };

  setStudentNotesTab(tab: 'weekly' | 'improvement') {
    this.studentNotesTab.set(tab);
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
  percentageToGrade(percentage: number): number {
    return Math.max(0, Math.min(20, percentage / 5));
  }

  getBarHeight(score: number): number {
    const max = this.maxWeeklyScore();
    return max > 0 ? (score / max) * 140 : 0;
  }

  getScoreColor(score: number): string {
    if (score >= 18) return 'var(--progress-excellent)';
    if (score >= 16) return 'var(--progress-achieved)';
    if (score >= 13) return 'var(--progress-in-process)';
    return 'var(--progress-reinforce)';
  }

  getWeakestTopic(student: StudentPerformance): string {
    const weakest = student.topics?.reduce((current, topic) =>
      !current || topic.percentage < current.percentage ? topic : current, student.topics[0]);
    return weakest?.topicName ?? this.translate('PROGRESS.DASHBOARD.NO_TOPIC');
  }

  getInsightExcerpt(insight: string | null | undefined, maxChars = 105): string {
    if (!insight) return this.translate('PROGRESS.SERY.NO_INSIGHT_TEACHER');

    const plainText = insight
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/[*_`#]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(?:Estimad[oa]\s+(?:profesor(?:a)?|docente)|Dear\s+(?:teacher|professor))[,.:;]?\s*/i, '');

    const firstSentence = plainText.match(/^.*?[.!?](?=\s|$)/)?.[0];
    if (maxChars <= 105 && firstSentence && firstSentence.length <= maxChars) return firstSentence;
    if (plainText.length <= maxChars) return plainText;
    const excerpt = plainText.slice(0, maxChars);
    return `${excerpt.slice(0, excerpt.lastIndexOf(' ')).trimEnd()}…`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }

  getPercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  getTrendChartWidth(): number {
    return Math.max(520, this.weeklyClassroomTrend().length * 110 + 60);
  }

  getTrendX(index: number): number {
    const points = this.weeklyClassroomTrend().length;
    if (points <= 1) return this.getTrendChartWidth() / 2;
    return 40 + index * ((this.getTrendChartWidth() - 80) / (points - 1));
  }

  getTrendY(score: number): number {
    const safeScore = Math.max(0, Math.min(20, score));
    return 174 - (safeScore * 6.7);
  }

  getTrendPoints(): string {
    return this.weeklyClassroomTrend()
      .map((week, index) => `${this.getTrendX(index)},${this.getTrendY(week.averageScore)}`)
      .join(' ');
  }

  getTrendAreaPath(): string {
    const trend = this.weeklyClassroomTrend();
    if (trend.length === 0) return '';
    const firstX = this.getTrendX(0);
    const lastX = this.getTrendX(trend.length - 1);
    const points = trend.map((week, index) => `${this.getTrendX(index)},${this.getTrendY(week.averageScore)}`);
    return `M ${firstX} 174 L ${points.join(' L ')} L ${lastX} 174 Z`;
  }

  getDonutDasharray(percentage: number): string {
    const circumference = 2 * Math.PI * 40;
    const filled = (Math.max(0, Math.min(100, percentage)) / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  getDonutCircumference(): number {
    return 2 * Math.PI * 40;
  }

  private getMockStudentData(): StudentAchievementResource {
    return {
      performance: {
        studentId: 999,
        studentName: this.translate('I18N.DEMO_STUDENT'),
        averageScore: 78,
        topics: [
          // 1er Bimestre (Period 1)
          { topicId: 1, topicName: this.translate('I18N.DEMO_LINEAR_EQUATIONS'), weekNumber: 1, score: 18, percentage: 90, gradingPeriodId: 1, courseId: this.courseId(), progressHistory: [50, 75, 90] },
          { topicId: 2, topicName: this.translate('I18N.DEMO_BASIC_GEOMETRY'), weekNumber: 2, score: 14, percentage: 70, gradingPeriodId: 1, courseId: this.courseId(), progressHistory: [40, 70] },
          { topicId: 3, topicName: this.translate('I18N.DEMO_FUNCTION_ALGEBRA'), weekNumber: 3, score: 9, percentage: 45, gradingPeriodId: 1, courseId: this.courseId(), progressHistory: [30, 45] },
          { topicId: 5, topicName: this.translate('I18N.DEMO_QUADRATIC_FUNCTIONS'), weekNumber: 4, score: 16, percentage: 80, gradingPeriodId: 1, courseId: this.courseId(), progressHistory: [50, 65, 80] },
          // 2do Bimestre (Period 2)
          { topicId: 4, topicName: this.translate('I18N.DEMO_DERIVATIVES'), weekNumber: 1, score: 12, percentage: 60, gradingPeriodId: 2, courseId: this.courseId(), progressHistory: [40, 60] },
          { topicId: 6, topicName: this.translate('I18N.DEMO_LIMITS'), weekNumber: 2, score: 15, percentage: 75, gradingPeriodId: 2, courseId: this.courseId(), progressHistory: [45, 60, 75] },
          // 3er Bimestre (Period 3)
          { topicId: 7, topicName: this.translate('I18N.DEMO_INTEGRALS'), weekNumber: 1, score: 17, percentage: 85, gradingPeriodId: 3, courseId: this.courseId(), progressHistory: [55, 70, 85] }
          // 4to Bimestre (Period 4) has no topics yet to show clean empty bimester state
        ]
      },
      latestInsight: this.translate('I18N.DEMO_INSIGHT')
    };
  }

  private getMockSummaryData(gradingPeriodId: number): StudentPerformanceSummaryResource {
    if (gradingPeriodId === 2) {
      return {
        studentId: 999,
        gradingPeriodId: 2,
        bimesterAverage: 67.5,
        weeklyProgression: [
          { weekNumber: 1, averageScore: 60, needsRemedial: true },
          { weekNumber: 2, averageScore: 75, needsRemedial: false }
        ],
        definitiveGrades: [
          { questionnaireId: 104, weekNumber: 1, score: 12 },
          { questionnaireId: 105, weekNumber: 2, score: 15 }
        ]
      };
    }
    if (gradingPeriodId === 3) {
      return {
        studentId: 999,
        gradingPeriodId: 3,
        bimesterAverage: 85,
        weeklyProgression: [
          { weekNumber: 1, averageScore: 85, needsRemedial: false }
        ],
        definitiveGrades: [
          { questionnaireId: 106, weekNumber: 1, score: 17 }
        ]
      };
    }
    if (gradingPeriodId === 4) {
      return {
        studentId: 999,
        gradingPeriodId: 4,
        bimesterAverage: 0,
        weeklyProgression: [],
        definitiveGrades: []
      };
    }

    // Default: 1er Bimestre (Period 1)
    return {
      studentId: 999,
      gradingPeriodId: 1,
      bimesterAverage: 71.25,
      weeklyProgression: [
        { weekNumber: 1, averageScore: 90, needsRemedial: false },
        { weekNumber: 2, averageScore: 70, needsRemedial: false },
        { weekNumber: 3, averageScore: 45, needsRemedial: true },
        { weekNumber: 4, averageScore: 80, needsRemedial: false }
      ],
      definitiveGrades: [
        { questionnaireId: 101, weekNumber: 1, score: 18 },
        { questionnaireId: 102, weekNumber: 2, score: 14 },
        { questionnaireId: 103, weekNumber: 3, score: 9 },
        { questionnaireId: 104, weekNumber: 4, score: 16 }
      ]
    };
  }

  getSources(content: string | null | undefined): {name: string, courseId: number, documentId: number, downloadUrl: string}[] {
    if (!content) return [];
    const sources: {name: string, courseId: number, documentId: number, downloadUrl: string}[] = [];
    
    const regex1 = /(?:\*\*)?(?:Fuente|Source):(?:\*\*)?\s*(.*?)\s*(?:\*\*)?(?:Enlace de descarga|Download link):(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
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

  renderInsightContent(rawText: string | null | undefined, showReferences = true): SafeHtml {
    rawText = rawText || '';
    const sources = this.getSources(rawText);

    if (sources.length > 0 || !showReferences) {
      const regex1 = /\s*(?:\[\d+\])?\s*(?:\*\*)?(?:Fuente|Source):(?:\*\*)?\s*(.*?)\s*(?:\*\*)?(?:Enlace de descarga|Download link):(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
      rawText = rawText.replace(regex1, '');

      const regex2 = /\s*(?:(?:\*\*)?Material de apoyo:(?:\*\*)?\s*)?\[([^\]]+)\]\((?:.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download)\)/gi;
      rawText = rawText.replace(regex2, '');
      
      // Cleanup AI hallucinated source text
      rawText = rawText.replace(/(?:\*\*)?(?:Fuente|Source):(?:\*\*)?\s*Contexto[^\n]*/gi, '');

      if (!showReferences) {
        rawText = rawText.replace(/\n\s*(?:\*\*)?(?:referencias?|fuentes consultadas)(?:\*\*)?:?\s*[\s\S]*$/i, '');
      }
    }

    let htmlString = MarkdownMathPipe.process(rawText);

    if (sources.length > 0 || !showReferences) {
      htmlString = htmlString.replace(/\s*\[(\d+)\]/g, (match, p1) => {
        const idx = Number(p1) - 1;
        if (!showReferences || (idx >= 0 && idx < sources.length)) {
          return ''; // Strip inline citations
        }
        return match;
      });

      // Remove empty paragraphs that might be left over from stripping
      htmlString = htmlString.replace(/<p>(?:\s|<br\/>)*<\/p>/gi, '');

      if (showReferences) {
        let badgesHtml = '<div class="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2.5">';
        sources.forEach((src, idx) => {
          badgesHtml += `<a href="javascript:void(0)" data-source-index="${idx}" class="inline-flex items-center gap-1.5 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] hover:underline px-3 py-1.5 rounded-lg font-semibold text-xs transition border border-[var(--brand-primary)]/20 w-auto">
            <span class="text-[var(--brand-primary)] font-bold px-0.5 py-0.5 text-[10px] tracking-wide">[${idx + 1}]</span> 
            <span>${src.name}</span>
          </a>`;
        });
        badgesHtml += '</div>';

        htmlString += badgesHtml;
      }
    }

    return this.sanitizer.bypassSecurityTrustHtml(sanitizeRenderedHtml(htmlString));
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
        this.toastService.error(this.translate('CLASSROOMS.QUIZZES.PREVIEW_ERROR'));
      }
    });
  }

  closePreview(): void {
    this.previewSecureUrl.set(null);
    this.previewDocumentTitle.set('');
  }
}
