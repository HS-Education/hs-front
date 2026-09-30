import {LocalizedDatePipe} from '../../../shared/pipes/localized-date.pipe';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Modal } from '../../../shared/components/modal/modal';
import { UserDataService } from '../../../shared/services/user-data.service';
import { ClassroomService } from '../../classrooms/data-access/classroom.service';
import { Classroom } from '../../classrooms/data-access/models/responses/classroom.model';
import { AchievementService, AreaAchievementResource, TopicPerformance } from '../../classrooms/classroom-detail/progress/services/achievement.service';
import { MarkdownMathPipe, sanitizeRenderedHtml } from '../../../shared/pipes/markdown-math.pipe';
import { weightedAverage } from '../../../shared/utils/performance-statistics';
import { TranslateEnumPipe } from '../../../shared/pipes/translate-enum.pipe';
import { StyledSelectDirective } from '../../../shared/directives/styled-select.directive';
import { AreaTeacherComparison } from './area-teacher-comparison';
import {ToastService} from '../../../shared/services/toast.service';
import { SeryGenerationStateService } from '../../../shared/services/sery-generation-state.service';
import {finalize, timeout, TimeoutError} from 'rxjs';

interface AreaGradeNode {
  gradeLevel: string;
  educationLevel: string;
  sections: string[];
}

interface AreaTreeSelection {
  gradeLevel: string;
  educationLevel: string;
  section: string | null;
}

interface AreaScopeStudent {
  studentId: number;
  name: string;
  score: number | null;
  topics: TopicPerformance[];
  topicAttempts: TopicPerformance[];
  sections: string[];
}

interface AreaCourseNode {
  courseId: number;
  courseName: string;
  grades: AreaGradeNode[];
}

@Component({
  selector: 'app-area-metrics',
  standalone: true,
  imports: [LocalizedDatePipe, CommonModule, Modal, TranslocoPipe, TranslateEnumPipe, StyledSelectDirective, AreaTeacherComparison],
  templateUrl: './area-metrics.html',
  styles: `
.metrics-view[hidden] { display: none; }
.metrics-explorer { overflow-anchor: none; }
.metrics-view { animation: metrics-view-enter 360ms cubic-bezier(.2,.75,.25,1) both; min-height: 330px; }
.metrics-view-navigation { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 18px; }
.metrics-view-navigation button { display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0; width: 28px; height: 28px; border: 1px solid var(--border); border-radius: 50%; color: var(--text-primary); transition: background 180ms, color 180ms; }
.metrics-view-navigation svg { display: block; flex-shrink: 0; }
.annual-period-badge { display: inline-flex; align-items: center; justify-content: center; height: 38px; min-width: 64px; padding: 0 12px; line-height: 1; }
.metrics-view-navigation button:hover:not(:disabled) { color: var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 8%, var(--surface)); }
.metrics-view-navigation button:disabled { opacity: .3; cursor: default; }
.metrics-view-navigation button:focus-visible { outline: 2px solid var(--brand-primary); outline-offset: 3px; }
.metrics-view-navigation .view-dot { width: 7px; height: 7px; background: var(--border); border: 0; }
.metrics-view-navigation .view-dot.active { background: var(--brand-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 15%, transparent); }
.metrics-view-navigation span { font-size: 10px; color: var(--text-secondary); margin-right: auto; }
@keyframes metrics-view-enter { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .metrics-view { animation: none; } }
.academic-tree-viewport {
  overflow-x: auto;
  padding: 8px 0 12px;
}

.academic-tree {
  width: max-content;
  min-width: 100%;
  color: var(--text-primary);
  --tree-line: var(--text-primary);
}

.academic-tree ul {
  display: flex;
  justify-content: center;
  position: relative;
  margin: 0;
  padding: var(--tree-step, 28px) 0 0;
  list-style: none;
}

.academic-tree li {
  position: relative;
  flex: 1;
  padding: var(--tree-step, 28px) 10px 0;
  text-align: center;
}

/* Horizontal branches meet the vertical stem at the center of each child. */
.academic-tree li::before,
.academic-tree li::after {
  content: '';
  position: absolute;
  top: 0;
  right: 50%;
  width: 50%;
  height: var(--tree-step, 28px);
  border-top: 1.5px solid var(--tree-line);
  filter: drop-shadow(0 1px 0 color-mix(in srgb, var(--text-primary) 12%, transparent));
}

.academic-tree li::after {
  right: auto;
  left: 50%;
  border-left: 1.5px solid var(--tree-line);
}

.academic-tree li:first-child::before,
.academic-tree li:last-child::after {
  border: 0;
}

.academic-tree li:last-child::before {
  border-right: 1.5px solid var(--tree-line);
}

.academic-tree li:only-child::before,
.academic-tree li:only-child::after {
  display: none;
}

.academic-tree li:only-child {
  padding-top: 0;
}

.academic-tree ul ul::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  height: var(--tree-step, 28px);
  border-left: 1.5px solid var(--tree-line);
  filter: drop-shadow(0 1px 0 color-mix(in srgb, var(--text-primary) 12%, transparent));
}

.academic-tree .tree-root {
  padding-top: 0;
}

.tree-node {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  min-height: 52px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-primary);
  font-size: 13px;
}

.tree-caption,
.tree-course label {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
}

.tree-course {
  min-width: 180px;
  background: var(--surface);
}

.tree-grade {
  min-width: 110px;
  min-height: 40px;
  padding-block: 6px;
  background: var(--surface);
}

.tree-section {
  min-width: 68px;
  min-height: 60px;
  padding: 8px 10px;
}

.tree-explorer { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; transition: grid-template-columns 260ms ease; }
.tree-map-pane { min-width: 0; display: flex; flex-direction: column; align-self: start; }
.grade-branch { padding: 10px 6px 12px; border: 1px solid transparent; border-radius: 14px; }
.academic-tree .tree-root > li > ul > li::before,
.academic-tree .tree-root > li > ul > li::after { height: calc(var(--tree-step, 28px) + 11px); }
.grade-branch.branch-selected { border-color: var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 6%, transparent); }
button.tree-node { cursor: pointer; color: var(--text-primary); transition: background 150ms, border-color 150ms; }
button.tree-node:hover { background: color-mix(in srgb, var(--brand-primary) 10%, var(--surface)); }
button.tree-node:focus-visible { outline: 2px solid var(--brand-primary); outline-offset: 3px; }
.tree-node.node-selected { border-color: var(--brand-primary); color: var(--brand-primary); }
.tree-map-hint { margin-top: 2px; text-align: center; font-size: 11px; color: var(--text-secondary); }
.tree-detail { min-width: 0; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: var(--bg-primary); animation: tree-detail-open 320ms cubic-bezier(.2,.75,.25,1) both; }
.tree-detail-close { color: color-mix(in srgb, var(--brand-error) 78%, var(--text-secondary)); background: color-mix(in srgb, var(--brand-error) 9%, var(--surface)); border-color: color-mix(in srgb, var(--brand-error) 28%, var(--border)); transition: color 160ms, background 160ms, border-color 160ms, transform 160ms; }
.tree-detail-close:hover { color: var(--brand-error); background: color-mix(in srgb, var(--brand-error) 16%, var(--surface)); border-color: color-mix(in srgb, var(--brand-error) 46%, var(--border)); transform: scale(1.04); }
.tree-detail-close:focus-visible { outline: 2px solid color-mix(in srgb, var(--brand-error) 65%, transparent); outline-offset: 2px; }
.tree-detail.is-closing { animation: tree-detail-close 320ms cubic-bezier(.2,.75,.25,1) forwards; transform-origin: top right; pointer-events: none; }
@keyframes tree-detail-open { from { opacity: 0; transform: translateX(16px) scale(.985); } to { opacity: 1; transform: translateX(0) scale(1); } }
@keyframes tree-detail-close { to { opacity: 0; transform: translateX(16px) scale(.98); } }
@media (prefers-reduced-motion: reduce) { .tree-explorer { transition-duration: 0ms; } .tree-detail, .tree-detail.is-closing, .scope-level-panel, .scope-level-panel.is-closing { animation-duration: 1ms; } }
.focus-tree { padding: 10px 0 4px; text-align: center; }
.focus-grade { position: relative; }
.focus-grade::after { content: ''; position: absolute; left: 50%; bottom: -14px; height: 14px; border-left: 1px solid var(--border); }
.focus-sections { display: flex; position: relative; justify-content: space-around; gap: 8px; margin-top: 28px; }
.focus-sections::before { content: ''; position: absolute; top: -14px; left: calc(50% / var(--section-count)); right: calc(50% / var(--section-count)); border-top: 1px solid var(--border); }
.focus-section { position: relative; flex: 1; min-width: 0; max-width: 136px; min-height: 76px; padding: 8px 10px; }
.focus-section::before { content: ''; position: absolute; top: -14px; left: 50%; height: 14px; border-left: 1px solid var(--border); }
.scope-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: stretch; gap: 8px; margin-top: 16px; }
.scope-metrics.grade-scope { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.scope-metrics.section-scope { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.scope-metric { position: relative; padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
.scope-metric-center { text-align: center; }
.scope-metric p { font-size: 10px; color: var(--text-secondary); }
.scope-metric p.scope-metric-label { font-size: 11px; font-weight: 600; line-height: 1.25; }
.scope-metric p.topic-metric-label { font-size: 10px; }
.scope-metric strong { display: block; margin-top: 4px; font-size: 24px; line-height: 1.2; color: var(--text-primary); }
.scope-metric-center strong { margin-top: 9px; font-size: 29px; }
.scope-metric-average strong { margin-top: 10px; font-size: 36px; }
.scope-metric small { font-size: 11px; font-weight: 500; color: var(--text-secondary); }
.topic-period-carousel { display: flex; min-width: 0; flex: 1; align-items: center; margin-top: 5px; overflow-x: auto; overscroll-behavior-x: contain; scroll-behavior: smooth; scroll-snap-type: x mandatory; scrollbar-width: none; }
.topic-period-carousel::-webkit-scrollbar { display: none; }
.topic-period-page { box-sizing: border-box; flex: 0 0 100%; min-width: 0; padding-right: 8px; scroll-snap-align: start; scroll-snap-stop: always; }
.topic-period-header { display: grid; min-width: 0; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; column-gap: 14px; }
.topic-period-header .topic-metric-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.topic-period-label { min-width: 0; font-size: 9px; white-space: nowrap; }
.topic-period-row { display: flex; min-width: 0; align-items: center; gap: 8px; margin-top: 4px; }
.topic-tie-list { display: grid; width: 100%; min-width: 0; height: 40px; max-height: 40px; flex: 1; align-content: center; justify-items: start; gap: 3px; overflow-x: hidden; overflow-y: auto; scrollbar-color: var(--border) transparent; scrollbar-width: thin; }
.topic-tie-chip { display: block; width: max-content; max-width: 100%; overflow: hidden; padding: 1px 4px; border-radius: 5px; background: var(--bg-primary); color: var(--text-primary); font-size: 9px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.topic-period-score { width: 52px; flex: 0 0 52px; text-align: center; font-size: 14px !important; }
.scope-metric-topics { padding-bottom: 24px; }
.topic-period-controls { display: flex; position: absolute; right: 12px; bottom: 8px; align-items: center; }
.topic-period-dots { display: flex; align-items: center; gap: 6px; margin: 0 0 0 8px; }
.topic-period-dot { display: block; width: 6px; height: 6px; border-radius: 50%; background: var(--period-color, var(--border)); transition: transform 150ms, box-shadow 150ms; }
.topic-period-dot.active { transform: scale(1.25); box-shadow: 0 0 0 2px color-mix(in srgb, var(--period-color, var(--border)) 28%, transparent); }
.topic-period-arrow { display: flex; width: 18px; height: 18px; flex: 0 0 18px; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 50%; background: var(--surface); color: var(--text-secondary); cursor: pointer; transition: opacity 140ms ease, color 150ms, border-color 150ms, background 150ms; }
.topic-period-arrow.is-hidden { opacity: 0; pointer-events: none; }
.topic-period-next-slot { display: grid; width: 18px; grid-template-columns: 18px; overflow: hidden; margin-left: 8px; transition: width 180ms ease, grid-template-columns 180ms ease, margin-left 180ms ease; }
.topic-period-next-slot.is-collapsed { width: 0; grid-template-columns: 0; margin-left: 0; }
.topic-period-arrow:hover { border-color: var(--brand-primary); background: color-mix(in srgb, var(--brand-primary) 10%, var(--surface)); color: var(--brand-primary); }
.topic-period-arrow:focus-visible { outline: 2px solid var(--brand-primary); outline-offset: 2px; }
.scope-metric-action { text-align: left; cursor: pointer; transition: border-color 160ms, background 160ms, transform 160ms; }
.scope-metric-action:hover { transform: translateY(-1px); }
.scope-metric-action:hover, .scope-metric-action[aria-pressed="true"] { border-color: var(--progress-reinforce); }
.achievement-level { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 6px 8px; border: 1px solid transparent; border-radius: 8px; font-size: 11px; text-align: left; color: var(--text-secondary); cursor: pointer; transition: background 160ms, border-color 160ms, color 160ms, transform 160ms; }
.achievement-level:hover { background: var(--surface); }
.achievement-level:hover { transform: translateY(-1px); }
.achievement-level[aria-pressed="true"] { border-color: var(--level-color); background: color-mix(in srgb, var(--level-color) 8%, transparent); color: var(--text-primary); }
.achievement-segment { height: 100%; padding: 0; border: 0; cursor: pointer; transition: opacity 150ms; }
.achievement-segment:hover { opacity: .8; }
.achievement-segment:focus-visible { outline: 2px solid var(--text-primary); outline-offset: -2px; }
.scope-level-panel { margin-top: 10px; padding: 10px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); animation: scope-panel-open 220ms cubic-bezier(.2,.75,.25,1) both; }
.scope-level-panel.is-closing { animation: scope-panel-close 180ms ease-in forwards; pointer-events: none; }
@keyframes scope-panel-open { from { opacity: 0; transform: translateY(8px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes scope-panel-close { to { opacity: 0; transform: translateY(6px) scale(.99); } }
.scope-level-carousel { max-height: 124px; overflow-x: auto; overflow-y: hidden; margin-top: 8px; overscroll-behavior-x: contain; scroll-behavior: smooth; scroll-snap-type: x mandatory; scrollbar-color: var(--border) transparent; scrollbar-width: thin; }
.scope-level-pages { display: flex; width: 100%; }
.scope-level-page { display: grid; flex: 0 0 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: min-content; align-content: start; gap: 6px; padding: 1px 2px 7px; scroll-snap-align: start; }
.scope-level-page.single-student .scope-level-row { grid-column: 1 / -1; }
.scope-level-row { display: flex; min-width: 0; min-height: 42px; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border: 1px solid color-mix(in srgb, var(--border) 70%, transparent); border-radius: 8px; background: var(--bg-primary); font-size: 11px; color: var(--text-primary); }
.scope-level-row p { font-size: 11px; }
.scope-students { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.scope-student-card { padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
.scope-name-list { min-width: 0; max-height: 58px; overflow-y: auto; }
.scope-name-list p { font-size: 12px; color: var(--text-primary); }
.scope-student-highlight { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
.scope-student-score { flex: 0 0 auto; font-size: 24px; font-weight: 800; line-height: 1; }
@media (min-width: 1100px) {
  .tree-explorer.is-split { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .is-split .tree-map-pane { align-self: stretch; min-height: 0; container-type: size; }
  .is-split .tree-map-content { margin-block: auto; }
  .is-split .academic-tree-viewport { flex: none; padding-block: 8px 12px; }
  .is-split .academic-tree {
    width: 100%;
    min-width: 0;
    --tree-step: clamp(42px, calc(6cqh + 2cqw), 64px);
    --tree-node-height: clamp(56px, 9cqw, 68px);
    --tree-node-font: clamp(11px, 2cqw, 14px);
  }
  .is-split .academic-tree li { min-width: 0; padding-left: 2px; padding-right: 2px; }
  .is-split .grade-branch { padding-left: 4px; padding-right: 4px; }
  .is-split .academic-tree .tree-node { min-height: var(--tree-node-height); font-size: var(--tree-node-font); padding: 10px clamp(8px, 1.5cqw, 12px); }
  .is-split .academic-tree .tree-section { min-width: clamp(44px, 8cqw, 72px); padding-inline: 2px; }
  .is-split .academic-tree .tree-grade { min-width: clamp(72px, 16cqw, 116px); min-height: 40px; padding-block: 6px; }
  .is-split .academic-tree .tree-course { padding-block: 8px; }
  .is-split .academic-tree .tree-caption,
  .is-split .academic-tree .tree-course label { font-size: clamp(10px, 1.65cqw, 12px); }
  .is-split .tree-map-hint { padding-bottom: 0; }
}
@media (max-width: 540px) {
  .tree-detail { padding: 12px; }
  .scope-metric { padding: 9px; }
  .scope-metric strong { font-size: 20px; }
  .scope-metric-center strong { font-size: 25px; }
  .scope-metric-average strong { font-size: 30px; }
  .scope-students { grid-template-columns: minmax(0, 1fr); }
  .focus-sections { flex-wrap: wrap; }
}
  `
})
export class AreaMetrics implements OnInit, OnDestroy {
  private readonly userDataService = inject(UserDataService);
  private readonly classroomService = inject(ClassroomService);
  private readonly achievementService = inject(AchievementService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly translocoService = inject(TranslocoService);
  private readonly toastService = inject(ToastService);
  private readonly seryGenerationState = inject(SeryGenerationStateService);

  readonly isLoading = signal(true);
  readonly areaLoadFailed = signal(false);
  readonly explorerView = signal(0);
  private explorerWheelLocked = false;
  private explorerWheelTimer: ReturnType<typeof setTimeout> | null = null;

  setExplorerView(index: number): void { this.explorerView.set(Math.max(0, Math.min(1, index))); }

  onExplorerWheel(event: WheelEvent): void {
    // Nested carousels retain their own navigation; a diagram consumes gestures only while it can scroll.
    const target = event.target as HTMLElement;
    if (target.closest('.topic-period-carousel, .achievement-students-carousel, .comparison-chart, .compare-picks, .teacher-tree-viewport, .tree-pagination')) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (Math.abs(delta) < 8) return;
    const diagram = target.closest<HTMLElement>('.academic-tree-viewport, .teacher-tree-viewport');
    if (diagram && diagram.scrollWidth > diagram.clientWidth + 2 &&
        ((delta > 0 && diagram.scrollLeft + diagram.clientWidth < diagram.scrollWidth - 2) ||
         (delta < 0 && diagram.scrollLeft > 2))) return;
    event.preventDefault();
    if (!this.explorerWheelLocked) {
      this.explorerWheelLocked = true;
      this.setExplorerView(this.explorerView() + (delta > 0 ? 1 : -1));
    }
    if (this.explorerWheelTimer) clearTimeout(this.explorerWheelTimer);
    this.explorerWheelTimer = setTimeout(() => { this.explorerWheelLocked = false; this.explorerWheelTimer = null; }, 700);
  }

  ngOnDestroy(): void {
    if (this.explorerWheelTimer) clearTimeout(this.explorerWheelTimer);
    if (this.topicWheelUnlockTimer) clearTimeout(this.topicWheelUnlockTimer);
    if (this.topicScrollSyncTimer) clearTimeout(this.topicScrollSyncTimer);
    if (this.achievementPanelCloseTimer) clearTimeout(this.achievementPanelCloseTimer);
    if (this.treeSummaryCloseTimer) clearTimeout(this.treeSummaryCloseTimer);
  }
  readonly coordinatorAreaId = signal<number | null>(null);
  readonly coordinatorAreaName = signal('');
  readonly areaData = signal<AreaAchievementResource | null>(null);
  readonly isGeneratingAreaInsight = computed(() => {
    const areaId = this.coordinatorAreaId();
    return areaId !== null && this.seryGenerationState.isGenerating('area', areaId);
  });
  readonly areaInsightError = signal<string | null>(null);
  readonly isAreaInsightModalOpen = signal(false);
  readonly selectedCourseId = signal<number | null>(1);
  readonly isTreeLoading = signal(false);
  readonly treeError = signal(false);
  readonly areaClassrooms = signal<Classroom[]>([]);
  readonly gradingPeriodNumbers = signal<Record<number, number>>({});
  readonly treeSelection = signal<AreaTreeSelection | null>(null);
  readonly selectedAchievementLevel = signal<string | null>(null);
  readonly selectedTopicPeriodIndex = signal(0);
  private topicWheelLocked = false;
  private topicWheelUnlockTimer: ReturnType<typeof setTimeout> | null = null;
  private topicScrollSyncTimer: ReturnType<typeof setTimeout> | null = null;
  readonly isClosingAchievementPanel = signal(false);
  private achievementPanelCloseTimer: ReturnType<typeof setTimeout> | null = null;
  readonly isClosingTreeSummary = signal(false);
  private treeSummaryCloseTimer: ReturnType<typeof setTimeout> | null = null;
  readonly currentAreaClassrooms = computed(() => {
    const areaName = this.coordinatorAreaName().trim().toLocaleLowerCase();
    const performanceIds = new Set(this.areaPerformance()?.classrooms.map(classroom => classroom.classroomId) ?? []);
    const classrooms = this.areaClassrooms().filter(classroom =>
      classroom.areaName?.trim().toLocaleLowerCase() === areaName || performanceIds.has(classroom.id));
    const active = classrooms.filter(classroom => classroom.academicYearStatus === 'ACTIVE');
    const latestYear = Math.max(...classrooms.map(classroom => classroom.academicYearName));
    return active.length ? active : classrooms.filter(classroom => classroom.academicYearName === latestYear);
  });
  /* Árbol real conservado para reactivar la conexión con las aulas.
  readonly areaClassrooms = signal<Classroom[]>([]);
  readonly courseTree = computed<AreaCourseNode[]>(() => {
    const classrooms = this.areaClassrooms();
    const activeYearClassrooms = classrooms.filter(classroom => classroom.academicYearStatus === 'ACTIVE');
    const latestYear = Math.max(...classrooms.map(classroom => classroom.academicYearName));
    const currentClassrooms = activeYearClassrooms.length
      ? activeYearClassrooms
      : classrooms.filter(classroom => classroom.academicYearName === latestYear);
    const courses = new Map<number, {
      courseName: string;
      grades: Map<string, { gradeLevel: string; educationLevel: string; sections: Set<string> }>;
    }>();
    for (const classroom of currentClassrooms) {
      const course = courses.get(classroom.courseId) ?? { courseName: classroom.courseName, grades: new Map() };
      const gradeKey = `${classroom.section.educationLevel}:${classroom.section.gradeLevel}`;
      const grade = course.grades.get(gradeKey) ?? {
        gradeLevel: classroom.section.gradeLevel,
        educationLevel: classroom.section.educationLevel,
        sections: new Set<string>()
      };
      grade.sections.add(classroom.section.name);
      course.grades.set(gradeKey, grade);
      courses.set(classroom.courseId, course);
    }
    const gradeOrder = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH'];
    const rank = (grade: string): number => gradeOrder.indexOf(grade) < 0 ? gradeOrder.length : gradeOrder.indexOf(grade);
    return [...courses.entries()]
      .map(([courseId, course]) => ({
        courseId,
        courseName: course.courseName,
        grades: [...course.grades.values()]
          .map(grade => ({ ...grade, sections: [...grade.sections].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) }))
          .sort((a, b) => rank(a.gradeLevel) - rank(b.gradeLevel) || a.educationLevel.localeCompare(b.educationLevel))
      }))
      .sort((a, b) => a.courseName.localeCompare(b.courseName));
  });
  */

  // Keep the example branches for layout exploration, and bind existing classrooms by ID.
  readonly courseTree = computed<AreaCourseNode[]>(() => {
    const courses = new Map<number, AreaCourseNode>();
    for (const classroom of this.currentAreaClassrooms()) {
      const course = courses.get(classroom.courseId) ?? {
        courseId: classroom.courseId, courseName: classroom.courseName,
        grades: ['FIRST', 'SECOND', 'THIRD'].map(gradeLevel => ({
          gradeLevel, educationLevel: 'SECONDARY', sections: ['A', 'B', 'C']
        }))
      };
      let grade = course.grades.find(item => item.gradeLevel === classroom.section.gradeLevel
        && item.educationLevel === classroom.section.educationLevel);
      if (!grade) {
        grade = { gradeLevel: classroom.section.gradeLevel, educationLevel: classroom.section.educationLevel, sections: [] };
        course.grades.push(grade);
      }
      if (!grade.sections.includes(classroom.section.name)) grade.sections.push(classroom.section.name);
      grade.sections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      courses.set(classroom.courseId, course);
    }
    if (!courses.size) return [{
      courseId: 1, courseName: 'RAZONAMIENTO MATEMATICO',
      grades: ['FIRST', 'SECOND', 'THIRD'].map(gradeLevel => ({
        gradeLevel, educationLevel: 'SECONDARY', sections: ['A', 'B', 'C']
      }))
    }];
    const order = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH'];
    return [...courses.values()].map(course => ({ ...course,
      grades: course.grades.sort((a, b) => a.educationLevel.localeCompare(b.educationLevel)
        || order.indexOf(a.gradeLevel) - order.indexOf(b.gradeLevel))
    })).sort((a, b) => a.courseName.localeCompare(b.courseName));
  });

  readonly selectedCourse = computed<AreaCourseNode | null>(() => this.courseTree().find(course => course.courseId === this.selectedCourseId()) ?? this.courseTree()[0] ?? null);
  readonly selectedGrade = computed(() => {
    const selection = this.treeSelection();
    if (!selection) return null;
    return this.selectedCourse()?.grades.find(grade => grade.gradeLevel === selection.gradeLevel
      && grade.educationLevel === selection.educationLevel) ?? null;
  });
  readonly selectedMetrics = computed(() => {
    const selection = this.treeSelection();
    return this.buildScopeMetrics(selection ? this.getScopeClassrooms(selection, selection.section) : []);
  });
  readonly selectedSections = computed(() => {
    const grade = this.selectedGrade();
    return grade?.sections.map(name => ({ name, metrics: this.buildScopeMetrics(this.getScopeClassrooms(grade, name)) })) ?? [];
  });
  readonly gradeSectionExtremes = computed(() => {
    const sections = this.selectedSections().filter(section => section.metrics.classroomCount > 0);
    const evaluatedSections = sections.filter(section => section.metrics.averageScore !== null);
    if (!evaluatedSections.length) return { best: null, lowest: null, sectionCount: 0, linkedSectionCount: sections.length };
    const scores = evaluatedSections.map(section => section.metrics.averageScore as number);
    const bestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const getSectionsAtScore = (score: number) => evaluatedSections
      .filter(section => Math.abs((section.metrics.averageScore ?? 0) - score) < 0.0001)
      .map(section => section.name);
    return {
      best: { averageScore: bestScore, sections: getSectionsAtScore(bestScore) },
      lowest: { averageScore: lowestScore, sections: getSectionsAtScore(lowestScore) },
      sectionCount: evaluatedSections.length,
      linkedSectionCount: sections.length
    };
  });
  readonly selectedTopicPeriodHighlights = computed(() => {
    const topicPeriods = new Map<number, Map<number, { topicName: string; total: number; count: number }>>();
    for (const student of this.selectedMetrics().students) {
      for (const topic of student.topicAttempts) {
        const topics = topicPeriods.get(topic.gradingPeriodId) ?? new Map<number, { topicName: string; total: number; count: number }>();
        const summary = topics.get(topic.topicId) ?? { topicName: topic.topicName, total: 0, count: 0 };
        summary.total += topic.percentage / 5;
        summary.count += 1;
        topics.set(topic.topicId, summary);
        topicPeriods.set(topic.gradingPeriodId, topics);
      }
    }
    const periodNumbers = this.gradingPeriodNumbers();
    const periodIds = [...new Set([
      ...topicPeriods.keys(),
      ...Object.keys(periodNumbers).map(Number)
    ])].sort((a, b) => (periodNumbers[a] ?? a) - (periodNumbers[b] ?? b) || a - b);
    return periodIds.map((periodId, index) => {
      const topics = [...(topicPeriods.get(periodId)?.values() ?? [])]
        .map(topic => ({ topicName: topic.topicName, averageScore: topic.total / topic.count }));
      const highestAverage = topics.length ? Math.max(...topics.map(topic => topic.averageScore)) : null;
      return {
        periodId,
        bimesterNumber: periodNumbers[periodId] ?? index + 1,
        averageScore: highestAverage,
        topics: highestAverage === null ? [] : topics.filter(topic => Math.abs(topic.averageScore - highestAverage) < 0.0001)
          .sort((a, b) => a.topicName.localeCompare(b.topicName))
      };
    });
  });
  readonly selectedLevel = computed(() => this.selectedMetrics().bands.find(band => band.key === this.selectedAchievementLevel()) ?? null);
  readonly selectedLevelStudents = computed(() => this.selectedMetrics().students
    .filter(student => this.getAchievementLevel(student.score) === this.selectedAchievementLevel())
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name)));
  readonly selectedLevelStudentPages = computed(() => {
    const students = this.selectedLevelStudents();
    const pages: AreaScopeStudent[][] = [];
    for (let index = 0; index < students.length; index += 4) pages.push(students.slice(index, index + 4));
    return pages;
  });

  // Derived state
  readonly areaPerformance = computed(() => this.areaData()?.performance);
  readonly latestInsight = computed(() => this.areaData()?.latestInsight);

  readonly sortedClassrooms = computed(() => {
    return [...this.classroomStats()].sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1));
  });

  readonly classroomStats = computed(() => {
    const classrooms = this.areaPerformance()?.classrooms ?? [];
    return classrooms.map(classroom => {
      const studentScores = classroom.students.map(student => ({
        student,
        topics: student.topics,
        score: student.averageScore
      }));
      const evaluated = studentScores.filter(item => item.topics.length > 0 && item.score !== null);
      const scores = evaluated.map(item => item.score as number);
      const bands = this.createAchievementBands(scores);
      return {
        ...classroom,
        studentScores,
        evaluatedCount: evaluated.length,
        coverage: classroom.students.length ? evaluated.length / classroom.students.length * 100 : 0,
        averageScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        bands
      };
    });
  });

  readonly areaSummary = computed(() => {
    const classrooms = this.classroomStats();
    const studentCount = classrooms.reduce((sum, classroom) => sum + classroom.students.length, 0);
    const evaluatedCount = classrooms.reduce((sum, classroom) => sum + classroom.evaluatedCount, 0);
    const bands = this.createAchievementBands(classrooms.flatMap(classroom =>
      classroom.studentScores.filter(item => item.score !== null && item.topics.length > 0).map(item => item.score as number)
    ));
    return {
      classroomCount: classrooms.length,
      studentCount,
      evaluatedCount,
      coverage: studentCount ? evaluatedCount / studentCount * 100 : 0,
      averageScore: weightedAverage(classrooms.map(classroom => ({
        score: classroom.averageScore, weight: classroom.evaluatedCount,
      })), 5),
      bands
    };
  });

  ngOnInit() {
    this.loadCoordinatorArea();
  }

  selectCourse(courseId: number): void {
    this.cancelTreeSummaryClose();
    this.cancelAchievementPanelClose();
    this.selectedCourseId.set(courseId);
    this.treeSelection.set(null);
    this.selectedAchievementLevel.set(null);
    this.selectedTopicPeriodIndex.set(0);
  }

  selectGrade(grade: AreaGradeNode): void {
    if (this.isGradeSelected(grade) && this.treeSelection()?.section === null) {
      this.closeTreeSummary();
      return;
    }
    this.cancelTreeSummaryClose();
    this.cancelAchievementPanelClose();
    this.selectedAchievementLevel.set(null);
    this.selectedTopicPeriodIndex.set(0);
    this.treeSelection.set({ gradeLevel: grade.gradeLevel, educationLevel: grade.educationLevel, section: null });
  }

  selectSection(grade: AreaGradeNode, section: string): void {
    if (this.isGradeSelected(grade) && this.treeSelection()?.section === section) {
      this.closeTreeSummary();
      return;
    }
    this.cancelTreeSummaryClose();
    this.cancelAchievementPanelClose();
    this.selectedAchievementLevel.set(null);
    this.selectedTopicPeriodIndex.set(0);
    this.treeSelection.set({ gradeLevel: grade.gradeLevel, educationLevel: grade.educationLevel, section });
  }

  scrollTopicPeriod(carousel: HTMLElement, index: number): void {
    const boundedIndex = Math.max(0, Math.min(index, this.selectedTopicPeriodHighlights().length - 1));
    this.selectedTopicPeriodIndex.set(boundedIndex);
    carousel.scrollTo({ left: boundedIndex * carousel.clientWidth, behavior: 'smooth' });
  }

  stepTopicPeriod(carousel: HTMLElement, direction: -1 | 1): void {
    this.scrollTopicPeriod(carousel, this.selectedTopicPeriodIndex() + direction);
  }

  onTopicPeriodWheel(event: WheelEvent): void {
    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.shiftKey ? event.deltaY : 0;
    if (Math.abs(horizontalDelta) < 4) return;
    event.preventDefault();
    const carousel = event.currentTarget as HTMLElement;
    if (!this.topicWheelLocked) {
      this.topicWheelLocked = true;
      this.stepTopicPeriod(carousel, horizontalDelta > 0 ? 1 : -1);
    }
    if (this.topicWheelUnlockTimer) clearTimeout(this.topicWheelUnlockTimer);
    this.topicWheelUnlockTimer = setTimeout(() => {
      this.topicWheelLocked = false;
      this.topicWheelUnlockTimer = null;
    }, 700);
  }

  onTopicPeriodScroll(event: Event): void {
    const carousel = event.currentTarget as HTMLElement;
    if (carousel.clientWidth <= 0) return;
    if (this.topicScrollSyncTimer) clearTimeout(this.topicScrollSyncTimer);
    this.topicScrollSyncTimer = setTimeout(() => {
      if (!carousel.isConnected) {
        this.topicScrollSyncTimer = null;
        return;
      }
      const settledIndex = Math.max(0, Math.min(
        Math.round(carousel.scrollLeft / carousel.clientWidth),
        this.selectedTopicPeriodHighlights().length - 1
      ));
      if (settledIndex !== this.selectedTopicPeriodIndex()) this.selectedTopicPeriodIndex.set(settledIndex);
      this.topicScrollSyncTimer = null;
    }, 180);
  }

  getBimesterTranslationKey(bimesterNumber: number): string {
    return `BIMESTERS.BIMESTER_${bimesterNumber}`;
  }

  closeTreeSummary(): void {
    if (!this.treeSelection() || this.isClosingTreeSummary()) return;
    this.cancelAchievementPanelClose();
    this.isClosingTreeSummary.set(true);
    this.selectedAchievementLevel.set(null);
    this.treeSummaryCloseTimer = setTimeout(() => {
      this.treeSelection.set(null);
      this.isClosingTreeSummary.set(false);
      this.treeSummaryCloseTimer = null;
    }, 320);
  }

  private cancelTreeSummaryClose(): void {
    if (this.treeSummaryCloseTimer) clearTimeout(this.treeSummaryCloseTimer);
    this.treeSummaryCloseTimer = null;
    this.isClosingTreeSummary.set(false);
  }

  isGradeSelected(grade: AreaGradeNode): boolean {
    return this.treeSelection()?.gradeLevel === grade.gradeLevel
      && this.treeSelection()?.educationLevel === grade.educationLevel;
  }

  selectAchievementLevel(level: string): void {
    if (this.selectedAchievementLevel() === level) {
      this.closeAchievementPanel();
      return;
    }
    this.cancelAchievementPanelClose();
    this.selectedAchievementLevel.set(level);
  }

  closeAchievementPanel(): void {
    if (!this.selectedAchievementLevel() || this.isClosingAchievementPanel()) return;
    this.isClosingAchievementPanel.set(true);
    this.achievementPanelCloseTimer = setTimeout(() => {
      this.selectedAchievementLevel.set(null);
      this.isClosingAchievementPanel.set(false);
      this.achievementPanelCloseTimer = null;
    }, 180);
  }

  private cancelAchievementPanelClose(): void {
    if (this.achievementPanelCloseTimer) clearTimeout(this.achievementPanelCloseTimer);
    this.achievementPanelCloseTimer = null;
    this.isClosingAchievementPanel.set(false);
  }

  private getAchievementLevel(score: number): string {
    if (score <= 12) return 'CRITICAL';
    if (score <= 15) return 'BASIC';
    if (score <= 17) return 'INTERMEDIATE';
    return 'ADVANCED';
  }

  hasLinkedClassroom(grade: AreaGradeNode, section: string): boolean {
    return this.getScopeClassrooms(grade, section).length > 0;
  }

  private getScopeClassrooms(grade: Pick<AreaGradeNode, 'gradeLevel' | 'educationLevel'>, section: string | null): Classroom[] {
    return this.currentAreaClassrooms().filter(classroom => classroom.courseId === this.selectedCourse()?.courseId
      && classroom.section.gradeLevel === grade.gradeLevel
      && classroom.section.educationLevel === grade.educationLevel
      && (section === null || classroom.section.name === section));
  }

  private buildScopeMetrics(classrooms: Classroom[]) {
    const performance = new Map((this.areaPerformance()?.classrooms ?? []).map(classroom => [classroom.classroomId, classroom]));
    const students = new Map<number, AreaScopeStudent>();
    for (const classroom of classrooms) {
      for (const student of performance.get(classroom.id)?.students ?? []) {
        const entry: AreaScopeStudent = students.get(student.studentId) ?? { studentId: student.studentId, name: student.studentName, score: null, topics: [], topicAttempts: [], sections: [] };
        if (!entry.sections.includes(classroom.section.name)) entry.sections.push(classroom.section.name);
        for (const topic of student.topics.filter(topic => topic.courseId === classroom.courseId)) {
          if (!entry.topicAttempts.some(existing => existing.topicId === topic.topicId
            && existing.gradingPeriodId === topic.gradingPeriodId && existing.weekNumber === topic.weekNumber)) {
            entry.topicAttempts.push(topic);
          }
          if (!entry.topics.some(existing => existing.topicId === topic.topicId && existing.gradingPeriodId === topic.gradingPeriodId)) entry.topics.push(topic);
        }
        students.set(student.studentId, entry);
      }
    }
    const all = [...students.values()].map(student => ({ ...student,
      score: student.topics.length ? student.topics.reduce((sum, topic) => sum + topic.percentage, 0) / student.topics.length / 5 : null
    }));
    const evaluated = all.filter((student): student is AreaScopeStudent & { score: number } => student.score !== null);
    const scores = evaluated.map(student => student.score);
    const highestScore = scores.length ? Math.max(...scores) : null;
    const lowestScore = scores.length ? Math.min(...scores) : null;
    return {
      classroomCount: classrooms.length,
      studentCount: all.length,
      evaluatedCount: evaluated.length,
      reinforcementCount: evaluated.filter(student => this.getAchievementLevel(student.score) === 'CRITICAL').length,
      students: evaluated,
      averageScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
      highest: evaluated.filter(student => highestScore !== null && Math.abs(student.score - highestScore) < 0.0001),
      lowest: evaluated.filter(student => lowestScore !== null && Math.abs(student.score - lowestScore) < 0.0001),
      bands: this.createAchievementBands(scores.map(score => score * 5))
    };
  }

  openAreaInsightModal = (): void => this.isAreaInsightModalOpen.set(true);
  closeAreaInsightModal = (): void => this.isAreaInsightModalOpen.set(false);

  generateAreaInsight(): void {
    const areaId = this.coordinatorAreaId();
    if (!areaId || !this.seryGenerationState.begin('area', areaId)) return;
    this.areaInsightError.set(null);
    this.achievementService.generateAreaInsight(areaId).pipe(
      timeout({first: 130_000}),
      finalize(() => this.seryGenerationState.finish('area', areaId))
    ).subscribe({
      next: (response) => {
        const insightText = response?.insightText?.trim();
        if (!insightText) {
          this.areaInsightError.set('AREAS.INSIGHT_GENERATION_ERROR');
          return;
        }
        this.areaData.update(current => current ? {
          ...current,
          latestInsight: insightText,
          latestInsightCreatedAt: new Date().toISOString()
        } : current);
        this.toastService.success(this.translocoService.translate('AREAS.INSIGHT_GENERATION_SUCCESS'));
      },
      error: (error: unknown) => {
        this.areaInsightError.set(error instanceof TimeoutError
          ? 'AREAS.INSIGHT_GENERATION_TIMEOUT'
          : 'AREAS.INSIGHT_GENERATION_ERROR');
      }
    });
  }

  getInsightExcerpt(insight: string | null | undefined, maxChars = 150): string {
    if (!insight) return this.translocoService.translate('AREAS.INSIGHT_PENDING');

    const plainText = insight
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`#]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (plainText.length <= maxChars) return plainText;
    const excerpt = plainText.slice(0, maxChars);
    return `${excerpt.slice(0, excerpt.lastIndexOf(' ')).trimEnd()}…`;
  }

  private createAchievementBands(scores: number[]) {
    return [
      { key: 'CRITICAL', count: scores.filter(score => score / 5 <= 12).length, color: 'var(--progress-reinforce)' },
      { key: 'BASIC', count: scores.filter(score => score / 5 > 12 && score / 5 <= 15).length, color: 'var(--progress-in-process)' },
      { key: 'INTERMEDIATE', count: scores.filter(score => score / 5 > 15 && score / 5 <= 17).length, color: 'var(--progress-achieved)' },
      { key: 'ADVANCED', count: scores.filter(score => score / 5 > 17).length, color: 'var(--progress-excellent)' }
    ];
  }

  private loadCoordinatorArea() {
    this.isLoading.set(true);
    this.areaLoadFailed.set(false);
    const user = this.userDataService.userProfile();
    if (!user) {
      this.isLoading.set(false);
      return;
    }

    this.classroomService.getAreas().subscribe({
      next: (areas) => {
        // The backend AreaResource only exposes coordinatorName, not coordinatorId.
        // We match by the user's full name to find their assigned area.
        const matchingArea = areas.find(a => a.coordinatorName === user.name);
        if (matchingArea) {
          this.coordinatorAreaId.set(matchingArea.id);
          this.loadAreaAchievements(matchingArea.id);
          this.loadAreaClassrooms(matchingArea.name);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.areaLoadFailed.set(true);
        this.isLoading.set(false);
      }
    });
  }

  private loadAreaAchievements(areaId: number) {
    this.achievementService.getAreaAchievements(areaId).subscribe({
      next: (data) => {
        this.areaData.set(data);
        this.isLoading.set(false);
        
      },
      error: (error: unknown) => {
        if (!(error instanceof HttpErrorResponse && error.status === 404)) {
          this.areaLoadFailed.set(true);
        }
        this.isLoading.set(false);
      }
    });
  }

  private loadAreaClassrooms(areaName: string): void {
    this.coordinatorAreaName.set(areaName);
    this.isTreeLoading.set(true);
    this.treeError.set(false);
    this.classroomService.getAllClassrooms().subscribe({
      next: classrooms => {
        this.areaClassrooms.set(classrooms);
        this.loadGradingPeriodNumbers(this.currentAreaClassrooms());
        this.selectedCourseId.set(this.courseTree()[0]?.courseId ?? null);
        this.isTreeLoading.set(false);
      },
      error: error => {
        this.areaClassrooms.set([]);
        this.selectedCourseId.set(null);
        this.treeError.set(error.status !== 404);
        this.isTreeLoading.set(false);
      }
    });
  }

  private loadGradingPeriodNumbers(classrooms: Classroom[]): void {
    const academicYearIds = [...new Set(classrooms.map(classroom => classroom.academicYearId))];
    for (const academicYearId of academicYearIds) {
      this.classroomService.getGradingPeriods(academicYearId).subscribe({
        next: periods => {
          const orderedPeriods = [...periods].sort((a, b) => {
            const order = (value: string) => Number(value.match(/\d+/)?.[0]) || ({ FIRST: 1, SECOND: 2, THIRD: 3, FOURTH: 4 } as Record<string, number>)[value] || 99;
            return order(a.bimester) - order(b.bimester);
          });
          const periodNumbers = Object.fromEntries(orderedPeriods.map((period, index) => {
            const explicitNumber = Number(period.bimester.match(/\d+/)?.[0]);
            return [period.id, explicitNumber || index + 1];
          }));
          this.gradingPeriodNumbers.update(current => ({ ...current, ...periodNumbers }));
        },
        error: () => undefined
      });
    }
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

  renderInsightContent(rawText: string | null | undefined): SafeHtml {
    rawText = rawText || '';
    const sources = this.getSources(rawText);

    if (sources.length > 0) {
      const regex1 = /\s*(?:\[\d+\])?\s*(?:\*\*)?(?:Fuente|Source):(?:\*\*)?\s*(.*?)\s*(?:\*\*)?(?:Enlace de descarga|Download link):(?:\*\*)?\s*.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download/gi;
      rawText = rawText.replace(regex1, '');

      const regex2 = /\s*(?:(?:\*\*)?Material de apoyo:(?:\*\*)?\s*)?\[([^\]]+)\]\((?:.*?(?:\/api\/v1)?\/courses\/(\d+)\/documents\/(\d+)\/download)\)/gi;
      rawText = rawText.replace(regex2, '');
      
      // Cleanup AI hallucinated source text
      rawText = rawText.replace(/(?:\*\*)?(?:Fuente|Source):(?:\*\*)?\s*Contexto[^\n]*/gi, '');
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
        badgesHtml += `<a href="javascript:void(0)" data-source-index="${idx}" class="inline-flex items-center gap-1.5 bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary-soft)] hover:underline px-3 py-1.5 rounded-lg font-semibold text-xs transition border border-[var(--brand-primary)]/20 w-auto">
            <span class="text-[var(--brand-primary)] font-bold px-0.5 py-0.5 text-[10px] tracking-wide">[${idx + 1}]</span> 
            <span>${src.name}</span>
          </a>`;
      });
      badgesHtml += '</div>';

      htmlString += badgesHtml;
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
          this.classroomService.getDocumentDownloadUrl(src.courseId, src.documentId).subscribe({
            next: (response) => {
              const link = document.createElement('a');
              link.href = response.url;
              link.download = src.name;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            },
            error: (err) => console.error('Error getting download URL:', err)
          });
        }
      }
    }
  }

  getScoreColorClass(score: number): string {
    if (score >= 90) return 'text-[var(--progress-excellent)]';
    if (score >= 80) return 'text-[var(--progress-achieved)]';
    if (score >= 65) return 'text-[var(--progress-in-process)]';
    return 'text-[var(--progress-reinforce)]';
  }

  getScoreColor(score: number): string {
    if (score >= 90) return 'var(--progress-excellent)';
    if (score >= 80) return 'var(--progress-achieved)';
    if (score >= 65) return 'var(--progress-in-process)';
    return 'var(--progress-reinforce)';
  }

  getScoreBgClass(score: number): string {
    if (score >= 90) return 'bg-[var(--progress-excellent)]/10';
    if (score >= 80) return 'bg-[var(--progress-achieved)]/10';
    if (score >= 65) return 'bg-[var(--progress-in-process)]/10';
    return 'bg-[var(--progress-reinforce)]/10';
  }

  getScoreProgressClass(score: number): string {
    if (score >= 90) return 'bg-[var(--progress-excellent)]';
    if (score >= 80) return 'bg-[var(--progress-achieved)]';
    if (score >= 65) return 'bg-[var(--progress-in-process)]';
    return 'bg-[var(--progress-reinforce)]';
  }

  getGradeCategory(score: number): string {
    if (score >= 90) return this.translocoService.translate('AREAS.GRADE_EXCELLENT');
    if (score >= 80) return this.translocoService.translate('AREAS.GRADE_ACHIEVED');
    if (score >= 65) return this.translocoService.translate('AREAS.GRADE_IN_PROGRESS');
    return this.translocoService.translate('AREAS.GRADE_NEEDS_ATTENTION');
  }
}
