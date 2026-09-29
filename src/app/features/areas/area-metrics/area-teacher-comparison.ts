import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { StyledSelectDirective } from '../../../shared/directives/styled-select.directive';
import { TranslateEnumPipe } from '../../../shared/pipes/translate-enum.pipe';
import { Classroom } from '../../classrooms/data-access/models/responses/classroom.model';
import { AreaPerformanceResource } from '../../classrooms/classroom-detail/progress/services/achievement.service';
import { COMPARISON_DEMO_CLASSROOMS, COMPARISON_DEMO_PERFORMANCE } from './area-comparison-demo';

interface ComparisonScope { teacher: string | null; courseId: number | null; classroomId: number | null }

// Compare student/course averages, not raw questionnaire totals. Missing marks are never zero.
export function comparisonMetrics(classrooms: Classroom[], performance: AreaPerformanceResource | null) {
  const records = new Map<string, { studentId: number; topics: Map<string, number> }>();
  const available = new Map(performance?.classrooms.map(item => [item.classroomId, item]) ?? []);
  let missingClassrooms = 0;
  for (const classroom of classrooms) {
    const data = available.get(classroom.id);
    if (!data) { missingClassrooms++; continue; }
    for (const student of data.students) {
      const key = `${student.studentId}:${classroom.courseId}`;
      const record = records.get(key) ?? { studentId: student.studentId, topics: new Map<string, number>() };
      for (const topic of student.topics) {
        if (topic.courseId === classroom.courseId && topic.percentage != null && Number.isFinite(topic.percentage)) {
          record.topics.set(`${topic.topicId}:${topic.gradingPeriodId}`, Math.max(0, Math.min(100, topic.percentage)) / 5);
        }
      }
      records.set(key, record);
    }
  }
  const evaluated = [...records.values()].filter(record => record.topics.size).map(record => ({
    studentId: record.studentId,
    score: [...record.topics.values()].reduce((sum, score) => sum + score, 0) / record.topics.size,
  }));
  return {
    average: evaluated.length ? evaluated.reduce((sum, item) => sum + item.score, 0) / evaluated.length : null,
    students: new Set(evaluated.map(item => item.studentId)).size,
    totalStudents: new Set([...records.values()].map(item => item.studentId)).size,
    evaluations: evaluated.length,
    excellent: evaluated.length ? evaluated.filter(item => item.score > 17).length / evaluated.length * 100 : null,
    classrooms: classrooms.length,
    missingClassrooms,
  };
}

@Component({
  selector: 'app-area-teacher-comparison',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, StyledSelectDirective, TranslateEnumPipe],
  templateUrl: './area-teacher-comparison.html',
  styles: `
:host{display:block;color:var(--text-primary)}
button{cursor:pointer}button:focus-visible{outline:2px solid var(--brand-primary);outline-offset:3px}
.comparison-toolbar{display:flex;align-items:center;justify-content:flex-start;margin-bottom:12px}.comparison-toolbar p{font-size:12px;color:var(--text-secondary);max-width:560px;margin:0}
.teacher-explorer{display:grid;grid-template-columns:minmax(0,1fr);gap:24px}.teacher-map{min-width:0;display:flex;flex-direction:column;justify-content:center;min-height:330px;container-type:inline-size}.teacher-tree-viewport{overflow-x:auto;padding:16px 2px 8px}.teacher-tree{min-width:100%;width:max-content}.teacher-tree ul{display:flex;justify-content:center;position:relative;list-style:none;margin:0;padding:28px 0 0}.teacher-tree ul.root{padding-top:0}.teacher-tree li{text-align:center;position:relative;padding:28px 10px 0;flex-shrink:0}.teacher-tree .root>li{padding-top:0}.teacher-tree li::before,.teacher-tree li::after{content:'';position:absolute;top:0;width:50%;height:28px;border-top:1px solid var(--text-secondary)}.teacher-tree li::before{right:50%}.teacher-tree li::after{left:50%;border-left:1px solid var(--text-secondary)}.teacher-tree li:only-child::before,.teacher-tree li:only-child::after{display:none}.teacher-tree li:only-child{padding-top:0}.teacher-tree li:first-child::after{border-radius:5px 0 0 0}.teacher-tree li:last-child::before{border-right:1px solid var(--text-secondary);border-radius:0 5px 0 0}.teacher-tree li:first-child::before,.teacher-tree li:last-child::after{border:0}.teacher-tree ul ul::before{content:'';position:absolute;top:0;left:50%;height:28px;border-left:1px solid var(--text-secondary)}
.diagram-node{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:10px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface);font-size:12px;max-width:220px;transition:border-color 220ms,background 220ms,transform 220ms}.diagram-node:hover{border-color:var(--brand-primary);background:color-mix(in srgb,var(--brand-primary) 8%,var(--surface));transform:translateY(-2px)}.root-node{width:230px;max-width:270px}.root-node label,.diagram-node small{font-size:10px;color:var(--text-secondary)}.root-node select{width:100%}.teacher-node{width:160px;min-height:90px;background:color-mix(in srgb,var(--bg-secondary) 55%,var(--surface))}.avatar{display:grid;place-items:center;width:28px;height:28px;border-radius:10px;background:color-mix(in srgb,var(--color-success) 23%,var(--surface));color:var(--color-success);font-weight:800}.teacher-branch{display:flex;flex-direction:column;align-items:center;min-width:196px;padding:8px;border:1px solid transparent;border-radius:16px;transition:border-color 280ms,background 280ms}.teacher-branch.selected{border-color:color-mix(in srgb,var(--brand-primary) 48%,transparent);background:color-mix(in srgb,var(--brand-primary) 3%,transparent)}.classroom-picker{position:relative;display:flex;flex-direction:column;gap:6px;width:100%;max-width:220px;margin-top:16px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--bg-secondary);text-align:left}.classroom-picker::before{content:'';position:absolute;left:50%;bottom:100%;height:16px;border-left:1px solid var(--text-secondary)}.classroom-picker label{font-size:10px;color:var(--text-secondary)}.classroom-picker select{width:100%;max-width:100%;font-size:11px}.diagram-hint{margin:12px 0 6px;text-align:center;font-size:11px;color:var(--text-secondary)}.open-comparison{align-self:center;border:1px solid var(--border);border-radius:10px;background:var(--surface);padding:10px 16px;font-size:12px;transition:background 220ms}.open-comparison:hover{background:color-mix(in srgb,var(--brand-primary) 10%,var(--surface))}.open-comparison span{margin-left:12px}
.teacher-detail{min-width:0;border:1px solid var(--border);border-radius:16px;padding:18px;background:var(--bg-secondary);animation:detail-in 420ms cubic-bezier(.2,.75,.25,1) both}.teacher-detail.is-closing{animation:detail-out 420ms cubic-bezier(.2,.75,.25,1) both}.detail-header{display:flex;justify-content:space-between;align-items:center;gap:12px}.detail-header small{font-size:10px;text-transform:uppercase;color:var(--text-secondary)}.detail-header h3{font-size:17px;margin:5px 0;font-weight:800}.detail-header p{font-size:11px;color:var(--text-secondary);margin:0}.close-summary{display:flex;align-items:center;justify-content:center;padding:0;box-sizing:border-box;flex:0 0 28px;width:28px;height:28px;border:1px solid color-mix(in srgb,#ff7379 25%,var(--border));border-radius:9px;background:color-mix(in srgb,#ff7379 8%,var(--surface));color:#ff7379;transition:background 180ms}.close-summary svg{display:block;flex-shrink:0}.close-summary:hover{background:color-mix(in srgb,#ff7379 20%,var(--surface))}
.view-tabs{display:flex;gap:4px;margin:16px 0 12px;padding:4px;border:1px solid var(--border);border-radius:11px;background:var(--bg-primary)}.view-tabs button{flex:1;min-width:0;padding:8px 10px;border-radius:8px;color:var(--text-secondary);font-size:11px;transition:color 180ms,background 180ms}.view-tabs button.active{color:var(--text-primary);background:var(--surface);box-shadow:0 1px 4px #0002}
.summary-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}.summary-cards article{border:1px solid var(--border);border-radius:12px;background:var(--surface);min-height:110px;padding:12px 6px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px}.summary-cards h4{font-size:11px;font-weight:500;color:var(--text-secondary);margin:0}.summary-cards strong{font-size:32px;line-height:1.1;font-weight:850}.summary-cards small{font-size:10px;font-weight:500;color:var(--text-secondary)}.summary-cards strong small{margin-left:3px}
.teacher-tree-viewport{overflow-y:hidden;flex-shrink:0}.teacher-explorer.is-comparing{align-items:center}
.comparison-panel{height:350px;display:flex;flex-direction:column;gap:6px;border:1px solid var(--border);background:var(--surface);border-radius:12px;padding:12px}.panel-heading h4{font-size:13px;font-weight:700;margin:0}.comparison-context{font-size:10px;color:var(--text-secondary);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chart-options{height:28px;flex-shrink:0;min-width:0;display:flex;align-items:center}.compare-picks{display:flex;gap:5px;overflow:auto;scrollbar-width:thin;white-space:nowrap}.compare-picks button{flex-shrink:0;font-size:10px;padding:4px 7px;border:1px solid var(--border);border-radius:7px;color:var(--text-secondary);transition:background 180ms,border-color 180ms}.compare-picks button.active{color:var(--brand-primary);border-color:var(--brand-primary);background:color-mix(in srgb,var(--brand-primary) 8%,var(--surface))}.chart-hint{font-size:10px;color:var(--text-secondary)}
.comparison-chart{flex:1;min-height:140px;position:relative;margin-top:2px;touch-action:pan-y}.chart-scale{position:absolute;left:0;top:20px;bottom:34px;width:20px;display:flex;flex-direction:column;justify-content:space-between;font-size:9px;color:var(--text-secondary)}.chart-scale span{line-height:0}.chart-grid{position:absolute;left:26px;right:0;top:20px;bottom:34px;display:flex;flex-direction:column;justify-content:space-between}.chart-grid span{border-top:1px solid var(--border)}.chart-columns{position:relative;display:grid;grid-template-columns:repeat(var(--chart-count),minmax(0,1fr));gap:10px;height:100%;margin-left:26px;padding-top:20px}.chart-column{min-width:0;display:flex;flex-direction:column;align-items:stretch;text-align:center;animation:row-in 220ms ease both;border-radius:7px}.bar-stage{flex:1;min-height:0;display:flex;align-items:flex-end;justify-content:center}.bar-fill{position:relative;width:min(46%,36px);border-radius:6px 6px 0 0;opacity:.65;transition:height 360ms,opacity 180ms}.chart-column.active .bar-fill,.chart-column:hover .bar-fill{opacity:1}.bar-fill.no-marks{height:3px!important;background:transparent!important;border-top:1px dashed var(--text-secondary)}.bar-value{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;font-size:14px;font-weight:800;white-space:nowrap}.bar-label{height:34px;padding:6px 2px 0;font-size:9px;line-height:12px;color:var(--text-secondary);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.chart-column.active .bar-label{color:var(--text-primary);font-weight:700}.chart-empty{grid-column:1/-1;align-self:center;font-size:11px;color:var(--text-secondary)}
.chart-detail{height:50px;flex-shrink:0;padding:7px 9px;border:1px solid var(--border);border-radius:9px;background:var(--bg-primary)}.chart-detail strong{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.chart-detail div{display:flex;justify-content:space-between;gap:6px;margin-top:5px;font-size:9px;color:var(--text-secondary)}.chart-footer{height:22px;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px}.chart-footer>span{font-size:9px;color:var(--text-secondary)}.chart-footer nav{display:flex;align-items:center;gap:6px}.chart-footer button{display:grid;place-items:center;width:22px;height:22px;border:1px solid var(--border);border-radius:50%;font-size:16px;line-height:1;transition:background 180ms}.chart-footer button:hover:not(:disabled){background:var(--bg-primary);color:var(--brand-primary)}.chart-footer button:disabled{opacity:.3;cursor:default}.chart-footer small{font-size:9px;white-space:nowrap;color:var(--text-secondary)}.empty-message,.method-note{font-size:11px;color:var(--text-secondary);line-height:1.6;margin:12px 0 0}.method-note{font-size:10px}
:host-context(:root:not(.dark)) .chart-detail .excellent-rate{color:#168f73!important}
.teacher-map{min-height:410px}.teacher-tree ul{padding-top:40px}.teacher-tree li{padding-top:40px}.teacher-tree li::before,.teacher-tree li::after,.teacher-tree ul ul::before{height:40px}.teacher-tree .root>li,.teacher-tree li:only-child,.teacher-tree ul.root{padding-top:0}.teacher-list>li{padding-inline:4px}.teacher-branch{width:156px;min-width:0}.teacher-node{width:138px;min-height:96px}.teacher-node strong{font-weight:800;line-height:1.4}.root-node{border-width:1.5px}.teacher-tree li::before,.teacher-tree li::after,.teacher-tree ul ul::before,.classroom-picker::before{border-color:color-mix(in srgb,var(--text-secondary) 75%,transparent)}.classroom-picker{min-width:0;animation:row-in 240ms ease both}
.teacher-explorer{align-items:start}.teacher-detail{align-self:start;padding:12px 16px 14px}.view-tabs{margin-top:12px}.teacher-map{min-height:340px}.teacher-tree{width:100%;min-width:560px}.teacher-tree>.root>li{width:100%;padding-inline:0}.teacher-tree .teacher-list{display:grid;grid-template-columns:repeat(var(--teacher-count),minmax(0,1fr));width:100%}.teacher-list>li{min-width:0;animation:row-in 260ms ease both}.teacher-branch{width:100%;max-width:240px;margin-inline:auto;padding:4px}.teacher-node{width:100%;max-width:210px;min-height:100px;padding:10px 8px}.teacher-node strong{font-size:12px}.classroom-picker{max-width:210px;padding:4px}
.tree-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;margin-top:8px;padding:0 8px}.tree-pagination>span{font-size:11px;color:var(--text-secondary)}.page-controls,.chart-footer nav{display:flex;align-items:center;gap:8px;border:1px solid var(--border-strong);border-radius:10px;background:var(--bg-secondary);padding:3px 6px}.page-controls button,.chart-footer button{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:26px;height:26px;padding:0;border:1px solid var(--border);border-radius:7px;color:var(--brand-primary);background:var(--surface)}.page-controls button:hover:not(:disabled),.chart-footer button:hover:not(:disabled){background:var(--bg-primary);border-color:var(--brand-primary)}.page-controls button:disabled,.chart-footer button:disabled{opacity:.35;cursor:default;background:transparent;color:var(--text-secondary)}.page-controls svg,.chart-footer svg{display:block;flex-shrink:0}.page-controls small,.chart-footer small{font-size:11px;font-weight:700;min-width:30px;text-align:center;color:var(--text-primary)}.chart-footer{height:36px}.chart-footer nav{height:34px}.chart-footer>span{font-size:10px}
.method-notes{display:grid;gap:2px;border-top:1px solid var(--border);padding-top:7px;font-size:10px;line-height:1.4;color:var(--text-secondary)}.method-notes p{margin:0}.method-caution{font-size:inherit;border:0;padding:0}
.compare-picks{scrollbar-color:var(--border-strong) transparent}.compare-picks::-webkit-scrollbar{height:3px}.compare-picks::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:4px}.compare-picks::-webkit-scrollbar-track{background:transparent}
@keyframes detail-in{from{opacity:0;transform:translateX(16px) scale(.985)}to{opacity:1;transform:none}}@keyframes detail-out{to{opacity:0;transform:translateX(16px) scale(.985)}}@keyframes row-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
@media(min-width:1100px){.teacher-explorer.is-split{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}@media(max-width:700px){.comparison-toolbar{align-items:stretch;flex-direction:column;gap:10px}.summary-cards strong{font-size:26px}.summary-cards{grid-template-columns:1fr}.teacher-detail{padding:12px}.row-meta{flex-wrap:wrap}.teacher-map{min-height:280px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
  `,
})
export class AreaTeacherComparison {
  readonly classrooms = input.required<Classroom[]>();
  readonly performance = input<AreaPerformanceResource | null>(null);
  readonly areaName = input('');
  // Keep the mock scenario active while the coordinator evaluates this prototype.
  readonly displayedClassrooms = computed(() => COMPARISON_DEMO_CLASSROOMS);
  readonly displayedPerformance = computed(() => COMPARISON_DEMO_PERFORMANCE);
  readonly courseId = signal<number | null>(null);
  readonly selection = signal<ComparisonScope | null>({ teacher: null, courseId: null, classroomId: null });
  readonly viewTab = signal<'summary' | 'teachers' | 'courses'>('summary');
  readonly comparedKeys = signal<string[]>([]);
  readonly chartPageIndex = signal(0);
  readonly treePageIndex = signal(0);
  readonly selectedChartKey = signal<string | null>(null);
  private chartWheelTimer: ReturnType<typeof setTimeout> | null = null;
  private treeWheelTimer: ReturnType<typeof setTimeout> | null = null;
  readonly closing = signal(false);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly courses = computed(() => [...new Map(this.displayedClassrooms().map(room => [room.courseId,
    { id: room.courseId, name: room.courseName }])).values()].sort((a, b) => a.name.localeCompare(b.name)));
  readonly filteredClassrooms = computed(() => this.displayedClassrooms().filter(room => this.courseId() === null || room.courseId === this.courseId()));
  // The classroom API exposes teacher names, not teacher IDs. Keep the grouping local to this view.
  teacherKey(room: Classroom) { return room.teacherName?.trim().toLocaleLowerCase() || '__unassigned'; }
  diagramCourseLabel(name: string) {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() === 'RAZONAMIENTO MATEMATICO' ? 'R. Matemático' : name;
  }
  readonly teachers = computed(() => {
    const groups = new Map<string, { key: string; name: string; classrooms: Classroom[] }>();
    for (const room of this.filteredClassrooms()) {
      const key = this.teacherKey(room);
      const group = groups.get(key) ?? { key, name: room.teacherName?.trim() || '', classrooms: [] };
      group.classrooms.push(room); groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  });
  readonly treePageCount = computed(() => Math.max(1, Math.ceil(this.teachers().length / 4)));
  readonly pagedTeachers = computed(() => {
    const start = Math.min(this.treePageIndex(), this.treePageCount() - 1) * 4;
    return this.teachers().slice(start, start + 4);
  });
  readonly scopeClassrooms = computed(() => {
    const scope = this.selection();
    return this.filteredClassrooms().filter(room => !scope ||
      ((scope.teacher === null || this.teacherKey(room) === scope.teacher) &&
       (scope.courseId === null || room.courseId === scope.courseId) &&
       (scope.classroomId === null || room.id === scope.classroomId)));
  });
  readonly metrics = computed(() => comparisonMetrics(this.scopeClassrooms(), this.displayedPerformance()));
  readonly scopeTeacher = computed(() => this.teachers().find(teacher => teacher.key === this.selection()?.teacher));
  readonly scopeCourse = computed(() => this.courses().find(course => course.id === (this.selection()?.courseId ?? this.courseId())));
  readonly scopeClassroom = computed(() => this.displayedClassrooms().find(room => room.id === this.selection()?.classroomId));
  readonly rows = computed(() => {
    const rooms = this.viewTab() === 'courses'
      ? this.displayedClassrooms()
      : this.filteredClassrooms();
    const groups = new Map<string, { key: string; name: string; rooms: Classroom[] }>();
    for (const room of rooms) {
      const teacherMode = this.viewTab() === 'teachers';
      if (teacherMode && !room.teacherName?.trim()) continue;
      const key = teacherMode ? this.teacherKey(room) : String(room.courseId);
      const group = groups.get(key) ?? { key, name: teacherMode ? room.teacherName!.trim() : room.courseName, rooms: [] };
      group.rooms.push(room); groups.set(key, group);
    }
    return [...groups.values()].map(group => ({ ...group, metrics: comparisonMetrics(group.rooms, this.displayedPerformance()) }))
      .sort((a, b) => (b.metrics.average ?? -1) - (a.metrics.average ?? -1) || a.name.localeCompare(b.name));
  });
  readonly visibleRows = computed(() => this.viewTab() === 'teachers' && this.comparedKeys().length
    ? this.rows().filter(row => this.comparedKeys().includes(row.key))
    : this.rows());
  readonly chartPageCount = computed(() => Math.max(1, Math.ceil(this.visibleRows().length / 4)));
  readonly chartRows = computed(() => {
    const start = Math.min(this.chartPageIndex(), this.chartPageCount() - 1) * 4;
    return this.visibleRows().slice(start, start + 4);
  });
  readonly activeChartRow = computed(() => {
    const rows = this.chartRows();
    return rows.length ? rows.find(row => row.key === this.selectedChartKey()) ?? rows[0] : null;
  });
  setCourse(value: string) {
    const previous = this.selection();
    this.courseId.set(value === '' ? null : Number(value));
    this.treePageIndex.set(0);
    this.clearComparison(); this.cancelClose();
    if (previous) {
      const teacher = this.filteredClassrooms().some(room => this.teacherKey(room) === previous.teacher) ? previous.teacher : null;
      this.selection.set({ teacher, courseId: this.courseId(), classroomId: null });
      if (teacher) this.treePageIndex.set(Math.floor(this.teachers().findIndex(item => item.key === teacher) / 4));
    }
  }
  select(scope: ComparisonScope) {
    this.cancelClose();
    if (JSON.stringify(scope) === JSON.stringify(this.selection())) { this.close(); return; }
    this.viewTab.set('summary');
    this.comparedKeys.set([]);
    this.selection.set(scope);
  }
  selectTeacherClassroom(teacher: string, classroomId: string) {
    const room = this.teachers().find(item => item.key === teacher)?.classrooms.find(item => String(item.id) === classroomId);
    this.select({ teacher, courseId: room?.courseId ?? this.courseId(), classroomId: room?.id ?? null });
  }
  close() {
    this.cancelClose(); this.closing.set(true);
    this.closeTimer = setTimeout(() => { this.selection.set(null); this.closing.set(false); this.closeTimer = null; }, 320);
  }
  private cancelClose() { if (this.closeTimer) clearTimeout(this.closeTimer); this.closeTimer = null; this.closing.set(false); }
  setTab(tab: 'summary' | 'teachers' | 'courses') {
    this.cancelClose();
    this.viewTab.set(tab);
    this.clearComparison();
    if (tab === 'courses') {
      this.courseId.set(null);
      this.treePageIndex.set(0);
    }
    if (tab !== 'summary' && this.selection()) {
      this.selection.set({ teacher: null, courseId: this.courseId(), classroomId: null });
    }
  }
  private resetChart() {
    this.chartPageIndex.set(0);
    this.selectedChartKey.set(null);
  }
  clearComparison() { this.comparedKeys.set([]); this.resetChart(); }
  toggleCompare(key: string) {
    this.comparedKeys.update(keys => keys.includes(key) ? keys.filter(item => item !== key) : [...keys, key]);
    this.resetChart();
  }
  stepChartPage(direction: number) {
    this.chartPageIndex.update(index => Math.max(0, Math.min(this.chartPageCount() - 1, index + direction)));
    this.selectedChartKey.set(null);
  }
  stepTreePage(direction: number) {
    this.treePageIndex.update(index => Math.max(0, Math.min(this.treePageCount() - 1, index + direction)));
    const scope = this.selection();
    if (scope?.teacher && !this.pagedTeachers().some(teacher => teacher.key === scope.teacher)) {
      this.cancelClose();
      this.selection.set({ teacher: null, courseId: this.courseId(), classroomId: null });
    }
  }
  onTreeWheel(event: WheelEvent) {
    const viewport = event.currentTarget as HTMLElement | null;
    if (this.treePageCount() === 1 || (viewport && viewport.scrollWidth > viewport.clientWidth + 1)) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (Math.abs(delta) < 8) return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.treeWheelTimer) this.stepTreePage(delta > 0 ? 1 : -1);
    if (this.treeWheelTimer) clearTimeout(this.treeWheelTimer);
    this.treeWheelTimer = setTimeout(() => { this.treeWheelTimer = null; }, 700);
  }
  onChartWheel(event: WheelEvent) {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.shiftKey ? event.deltaY : 0;
    if (Math.abs(delta) < 8) return;
    event.preventDefault();
    event.stopPropagation();
    if (!this.chartWheelTimer) this.stepChartPage(delta > 0 ? 1 : -1);
    if (this.chartWheelTimer) clearTimeout(this.chartWheelTimer);
    this.chartWheelTimer = setTimeout(() => { this.chartWheelTimer = null; }, 700);
  }
  color(score: number | null) { return score === null ? 'var(--text-secondary)' : score > 17 ? '#55b99a' : score > 15 ? '#a6d766' : score > 12 ? '#efbc4b' : '#ff7379'; }
  ngOnDestroy() { this.cancelClose(); if (this.chartWheelTimer) clearTimeout(this.chartWheelTimer); if (this.treeWheelTimer) clearTimeout(this.treeWheelTimer); }
}
