import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser';
import {TranslocoService} from '@jsverse/transloco';
import {Progress} from './progress';
import {LanguageService} from '../../../../core/i18n/language.service';
import {UserDataService} from '../../../../shared/services/user-data.service';
import {ToastService} from '../../../../shared/services/toast.service';
import {SeryGenerationStateService} from '../../../../shared/services/sery-generation-state.service';
import {AchievementService} from './services/achievement.service';
import {ClassroomService} from '../../data-access/classroom.service';
import {QuestionnaireService} from '../../data-access/questionnaire.service';

const reference = 'Fuente: 30pg Enlace de descarga: /api/v1/courses/10/documents/30/download';

describe('progress references by audience', () => {
  const studentView = signal(true);
  const profile = signal({id: 7, roles: ['STUDENT']});
  let page: Progress;

  beforeEach(() => {
    studentView.set(true);
    profile.set({id: 7, roles: ['STUDENT']});
    TestBed.configureTestingModule({providers: [
      FormBuilder,
      {provide: LanguageService, useValue: {activeLanguage: () => 'es'}},
      {provide: UserDataService, useValue: {isStudentView: studentView, userProfile: profile, isTeacher: () => profile().roles.includes('TEACHER')}},
      {provide: AchievementService, useValue: {}},
      {provide: ClassroomService, useValue: {}},
      {provide: QuestionnaireService, useValue: {}},
      {provide: ToastService, useValue: {}},
      {provide: TranslocoService, useValue: {}},
      {provide: SeryGenerationStateService, useValue: {}},
      {provide: DomSanitizer, useValue: {bypassSecurityTrustHtml: (html: string) => html}},
    ]});
    page = TestBed.runInInjectionContext(() => new Progress());
  });

  it('shows one numbered document link with its registered title for a student', () => {
    const html = String(page.renderInsightContent('Repasa probabilidad.\n' + reference + '\n' + reference));
    expect(html).toContain('Repasa probabilidad.');
    expect(html).toContain('[1]');
    expect(html).toContain('30pg');
    expect((html.match(/data-source-index=/g) || []).length).toBe(1);
    expect(html).not.toContain('Enlace de descarga:');
  });

  it.each(['TEACHER', 'COORDINATOR', 'ADMIN'])('hides references for %s', role => {
    profile.set({id: 7, roles: [role]});
    studentView.set(false);
    const html = String(page.renderInsightContent('Repasa el tema.\n' + reference));
    expect(html).toContain('Repasa el tema.');
    expect(html).not.toContain('data-source-index');
    expect(html).not.toContain('30pg');
    expect(html).not.toContain('/download');
  });

  it('hides references for staff simulating the student view', () => {
    profile.set({id: 7, roles: ['TEACHER']});
    const html = String(page.renderInsightContent('Informe.\n' + reference));
    expect(html).not.toContain('data-source-index');
    expect(html).not.toContain('30pg');
  });

  it('keeps references hidden in an explicitly staff-only student report', () => {
    expect(String(page.renderInsightContent(reference, false))).not.toContain('data-source-index');
  });

  it('does not show quoted source extracts in the explanation', () => {
    const html = String(page.renderInsightContent('Repasa el tema.\n**Fuente**: “fragmento 70% y 60%”\n' + reference));
    expect(html).not.toContain('fragmento');
    expect(html).toContain('30pg');
  });
  it('allows the classroom summary button for a teacher who is also coordinator', () => {
    profile.set({id: 7, roles: ['TEACHER', 'COORDINATOR']});
    studentView.set(false);
    expect(page.canGenerateClassroomInsight()).toBe(true);
    studentView.set(true);
    expect(page.canGenerateClassroomInsight()).toBe(false);
    studentView.set(false);
    profile.set({id: 7, roles: ['COORDINATOR']});
    expect(page.canGenerateClassroomInsight()).toBe(false);
  });

});
