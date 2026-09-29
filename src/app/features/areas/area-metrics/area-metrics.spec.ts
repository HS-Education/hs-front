import {TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {TranslocoService} from '@jsverse/transloco';
import {Subject} from 'rxjs';
import {UserDataService} from '../../../shared/services/user-data.service';
import {ToastService} from '../../../shared/services/toast.service';
import {ClassroomService} from '../../classrooms/data-access/classroom.service';
import {AchievementService, AreaAchievementResource} from '../../classrooms/classroom-detail/progress/services/achievement.service';
import {AreaMetrics} from './area-metrics';

describe('AreaMetrics insight refresh', () => {
  let component: AreaMetrics;
  let response: Subject<{insightText: string}>;
  let generateAreaInsight: ReturnType<typeof vi.fn>;
  let success: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    response = new Subject<{insightText: string}>();
    generateAreaInsight = vi.fn(() => response.asObservable());
    success = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        {provide: UserDataService, useValue: {}},
        {provide: ClassroomService, useValue: {}},
        {provide: AchievementService, useValue: {generateAreaInsight}},
        {provide: DomSanitizer, useValue: {}},
        {provide: TranslocoService, useValue: {translate: (key: string) => key}},
        {provide: ToastService, useValue: {success}},
      ],
    });
    component = TestBed.runInInjectionContext(() => new AreaMetrics());
    component.coordinatorAreaId.set(1);
    component.areaData.set({
      targetId: 1,
      latestInsight: 'Previous analysis',
      latestInsightCreatedAt: null,
      performance: {areaId: 1, areaName: 'Matemática', averageScore: 19, classrooms: []},
    } satisfies AreaAchievementResource);
  });

  afterEach(() => {
    vi.useRealTimers();
    component.ngOnDestroy();
  });

  it('shows progress, updates the summary and clears the loading state on success', () => {
    component.generateAreaInsight();
    expect(generateAreaInsight).toHaveBeenCalledWith(1);
    expect(component.isGeneratingAreaInsight()).toBe(true);

    response.next({insightText: 'Updated analysis'});
    response.complete();

    expect(component.isGeneratingAreaInsight()).toBe(false);
    expect(component.areaData()?.latestInsight).toBe('Updated analysis');
    expect(component.areaInsightError()).toBeNull();
    expect(success).toHaveBeenCalledOnce();
  });

  it('keeps the coordinator refresh active when the view is recreated for the same area', () => {
    component.generateAreaInsight();

    const returningView = TestBed.runInInjectionContext(() => new AreaMetrics());
    returningView.coordinatorAreaId.set(1);

    expect(returningView.isGeneratingAreaInsight()).toBe(true);
    returningView.generateAreaInsight();
    expect(generateAreaInsight).toHaveBeenCalledTimes(1);

    response.next({insightText: 'Updated analysis'});
    response.complete();

    expect(returningView.isGeneratingAreaInsight()).toBe(false);
    returningView.ngOnDestroy();
  });

  it('ends a stalled request and preserves the previous summary', async () => {
    vi.useFakeTimers();
    component.generateAreaInsight();

    await vi.advanceTimersByTimeAsync(130_000);

    expect(component.isGeneratingAreaInsight()).toBe(false);
    expect(component.areaInsightError()).toBe('AREAS.INSIGHT_GENERATION_TIMEOUT');
    expect(component.areaData()?.latestInsight).toBe('Previous analysis');
  });

  it('clears progress and preserves the summary when the request fails', () => {
    component.generateAreaInsight();

    response.error(new Error('Service unavailable'));

    expect(component.isGeneratingAreaInsight()).toBe(false);
    expect(component.areaInsightError()).toBe('AREAS.INSIGHT_GENERATION_ERROR');
    expect(component.areaData()?.latestInsight).toBe('Previous analysis');
    expect(success).not.toHaveBeenCalled();
  });

  it('rejects an empty insight and permits another attempt', () => {
    component.generateAreaInsight();
    response.next({insightText: '   '});
    response.complete();

    expect(component.isGeneratingAreaInsight()).toBe(false);
    expect(component.areaInsightError()).toBe('AREAS.INSIGHT_GENERATION_ERROR');
    expect(component.areaData()?.latestInsight).toBe('Previous analysis');
    expect(success).not.toHaveBeenCalled();

    component.generateAreaInsight();
    expect(generateAreaInsight).toHaveBeenCalledTimes(2);
    expect(component.areaInsightError()).toBeNull();
  });
});
