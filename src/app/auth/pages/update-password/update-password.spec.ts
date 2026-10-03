import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslocoService} from '@jsverse/transloco';
import {Subject} from 'rxjs';
import {UpdatePassword} from './update-password';
import {AuthService} from '../../services/auth.service';

describe('UpdatePassword', () => {
  let page: UpdatePassword;
  let response: Subject<unknown>;
  let changePassword: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    response = new Subject();
    changePassword = vi.fn(() => response);
    TestBed.configureTestingModule({providers: [
      {provide: AuthService, useValue: {changePassword}},
      {provide: Router, useValue: {navigate: vi.fn().mockResolvedValue(true)}},
      {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: new Map([['username', '20260002']])}}},
      {provide: TranslocoService, useValue: {translate: (key: string) => key}},
    ]});
    page = TestBed.runInInjectionContext(() => new UpdatePassword());
    page.ngOnInit();
  });

  it('toggles each password independently without changing its value', () => {
    page.form.controls.oldPassword.setValue('old-secret');
    page.togglePassword('oldPassword');
    expect(page.visiblePasswords()).toEqual({oldPassword: true, newPassword: false, confirmPassword: false});
    page.togglePassword('confirmPassword');
    expect(page.visiblePasswords().newPassword).toBe(false);
    expect(page.form.controls.oldPassword.value).toBe('old-secret');
    page.togglePassword('oldPassword');
    expect(page.visiblePasswords().oldPassword).toBe(false);
  });

  it('rejects nonmatching passwords and prevents duplicate submissions', () => {
    page.form.patchValue({oldPassword: 'old-secret', newPassword: 'New-secret!', confirmPassword: 'Different-secret!'});
    page.onSubmit();
    expect(changePassword).not.toHaveBeenCalled();
    expect(page.errorMessage()).toBe('UI_TEXT.THE_NEW_PASSWORDS_DO_NOT_MATCH');
    page.form.controls.confirmPassword.setValue('New-secret!');
    page.onSubmit();
    page.onSubmit();
    expect(changePassword).toHaveBeenCalledExactlyOnceWith({username: '20260002', oldPassword: 'old-secret', newPassword: 'New-secret!'});
    response.error({status: 400});
    expect(page.loading()).toBe(false);
  });
});
