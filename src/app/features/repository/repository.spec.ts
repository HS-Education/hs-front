import {TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {TranslocoService} from '@jsverse/transloco';
import {of, Subject} from 'rxjs';
import {Repository} from './repository';
import {ClassroomService} from '../classrooms/data-access/classroom.service';
import {Classroom} from '../classrooms/data-access/models/responses/classroom.model';
import {Topic} from '../classrooms/data-access/models/responses/topic.model';
import {ToastService} from '../../shared/services/toast.service';
import {UserDataService} from '../../shared/services/user-data.service';

describe('repository topic weeks and order', () => {
  let page: Repository;
  let add: ReturnType<typeof vi.fn>;
  let reorder: ReturnType<typeof vi.fn>;
  const topic = (id: number, period: number, order: number): Topic =>
    ({id, name: `Topic ${id}`, gradingPeriodId: period, orderIndex: order});

  beforeEach(() => {
    add = vi.fn(() => new Subject<void>());
    reorder = vi.fn(() => of(undefined));
    TestBed.configureTestingModule({providers: [
      {provide: ClassroomService, useValue: {addTopic: add, reorderTopics: reorder}},
      {provide: UserDataService, useValue: {}},
      {provide: DomSanitizer, useValue: {}},
      {provide: ToastService, useValue: {error: vi.fn()}},
      {provide: TranslocoService, useValue: {translate: (key: string) => key}},
    ]});
    page = TestBed.runInInjectionContext(() => new Repository());
    page.selectedCourseId.set(10);
    page.classrooms.set([{courseId: 10, academicYearStatus: 'PLANNED'} as Classroom]);
    page.gradingPeriods.set([
      {id: 1, bimester: 'FIRST', startDate: '2026-10-24', endDate: '2026-11-07'},
      {id: 2, bimester: 'SECOND', startDate: '2026-11-08', endDate: '2026-11-22'},
    ]);
    page.newTopicGradingPeriodId.set(1);
    page.newTopicName.set('New topic');
  });

  it('groups by grading period before sorting weeks', () => {
    page.topics.set([topic(4, 2, 2), topic(2, 1, 2), topic(3, 2, 1), topic(1, 1, 1)]);
    expect(page.orderedTopics().map(t => t.id)).toEqual([1, 2, 3, 4]);
    expect(page.hasInvalidTopicOrder()).toBe(false);
  });

  it('blocks a third topic for two complete weeks, independently in each period', () => {
    page.topics.set([topic(1, 1, 1), topic(2, 1, 2)]);
    expect(page.topicPeriodWeeks()).toBe(2);
    expect(page.canSaveTopic()).toBe(false);
    page.addTopic();
    expect(add).not.toHaveBeenCalled();
    page.newTopicGradingPeriodId.set(2);
    expect(page.canSaveTopic()).toBe(true);
  });

  it('blocks undated periods and counts only complete weeks across DST dates', () => {
    expect(page.getPeriodWeeks({id: 1, bimester: 'BIMESTER_1', startDate: '2026-10-24', endDate: '2026-11-06'})).toBe(1);
    page.gradingPeriods.set([{id: 1, bimester: 'BIMESTER_1'}]);
    expect(page.topicPeriodWeeks()).toBeNull();
    expect(page.canSaveTopic()).toBe(false);
  });

  it('prevents duplicate submissions while a new topic is being saved', () => {
    page.addTopic();
    page.addTopic();
    expect(add).toHaveBeenCalledExactlyOnceWith(10, 'New topic', 1);
    expect(page.savingTopic()).toBe(true);
  });

  it('cannot move a topic across grading periods', () => {
    page.topics.set([topic(1, 1, 1), topic(2, 1, 2), topic(3, 2, 1)]);
    expect(page.canReorderTopic(1, 'down')).toBe(false);
    page.reorderTopic(1, 'down');
    expect(reorder).not.toHaveBeenCalled();
  });

  it('reorders within a period without mutating the current records or mixing week indexes', () => {
    const first = topic(1, 1, 1);
    page.topics.set([first, topic(2, 1, 2), topic(3, 2, 1)]);
    page.reorderTopic(1, 'up');
    expect(first.orderIndex).toBe(1);
    expect(reorder).toHaveBeenCalledExactlyOnceWith(10, [
      {topicId: 2, gradingPeriodId: 1, orderIndex: 1},
      {topicId: 1, gradingPeriodId: 1, orderIndex: 2},
      {topicId: 3, gradingPeriodId: 2, orderIndex: 1},
    ]);
  });

  it('repairs the repeated indexes from the reported example only on request', () => {
    page.topics.set([topic(1, 1, 1), topic(2, 1, 1), topic(3, 2, 2), topic(4, 2, 2)]);
    expect(page.hasInvalidTopicOrder()).toBe(true);
    expect(reorder).not.toHaveBeenCalled();
    page.normalizeTopicOrder();
    expect(page.topics().map(t => t.orderIndex)).toEqual([1, 2, 1, 2]);
    expect(page.hasInvalidTopicOrder()).toBe(false);
  });

  it('does not repair order or add topics after the academic year starts', () => {
    page.topics.set([topic(1, 1, 2)]);
    page.classrooms.set([{courseId: 10, academicYearStatus: 'ACTIVE'} as Classroom]);
    page.normalizeTopicOrder();
    page.addTopic();
    expect(reorder).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });
});
