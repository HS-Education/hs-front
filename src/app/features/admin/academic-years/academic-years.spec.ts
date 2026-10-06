import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse} from '@angular/common/http';
import {TranslocoService} from '@jsverse/transloco';
import {of, Subject} from 'rxjs';
import {AcademicYears} from './academic-years';
import {AcademicYearService} from './services/academic-year.service';
import {GradingPeriod} from './models/academic-year.model';
import {ToastService} from '../../../shared/services/toast.service';

describe('two-week grading-period updates', () => {
  let page: AcademicYears;
  let response: Subject<GradingPeriod>;
  let update: ReturnType<typeof vi.fn>;
  let period: GradingPeriod;

  beforeEach(() => {
    response = new Subject<GradingPeriod>();
    update = vi.fn(() => response);
    TestBed.configureTestingModule({providers: [
      {provide: AcademicYearService, useValue: {
        updateGradingPeriod: update,
        getAllAcademicYears: vi.fn(() => of([{id: 1, year: 2030, status: 'PLANNED'}])),
      }},
      {provide: ToastService, useValue: {}},
      {provide: TranslocoService, useValue: {translate: (key: string) => key}},
    ]});
    page = TestBed.runInInjectionContext(() => new AcademicYears());
    page.selectedYear.set({id: 1, year: 2030, status: 'PLANNED'});
    period = {id: 2, academicYearId: 1, academicYearName: 2030,
      bimester: 'BIMESTER_2', startDate: null, endDate: null, status: 'PLANNED'};
    page.gradingPeriods.set([period]);
    page.startEdit(period);
    page.editStartDate.set('2030-04-01');
    page.editEndDate.set('2030-04-15');
  });

  it('submits exactly two weeks and displays the server-confirmed dates', () => {
    page.saveEdit(period);
    expect(update).toHaveBeenCalledExactlyOnceWith(1, 2, {
      startDate: '2030-04-01', endDate: '2030-04-15',
    });
    response.next({...period, startDate: '2030-04-01', endDate: '2030-04-15'});
    expect(page.gradingPeriods()[0].endDate).toBe('2030-04-15');
    expect(page.gradingPeriods()[0].startDate).toBe('2030-04-01');
    expect(page.editingPeriodId()).toBeNull();
    expect(page.editStartDate()).toBe('');
  });

  it('retains unsaved edits and original dates when the backend rejects a shorter period', () => {
    page.editEndDate.set('2030-04-14');
    page.saveEdit(period);
    response.error(new HttpErrorResponse({status: 400, error: {
      message: "A grading period must last at least 2 weeks. Current duration: '1' weeks.",
    }}));
    expect(page.editingPeriodId()).toBe(2);
    expect(page.editEndDate()).toBe('2030-04-14');
    expect(page.gradingPeriods()[0].endDate).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
