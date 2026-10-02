import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {TranslocoService} from '@jsverse/transloco';
import {Subject} from 'rxjs';
import {SignIn} from './sign-in';
import {AuthService} from '../../services/auth.service';
import {UserDataService} from '../../../shared/services/user-data.service';
import {UserProfile} from '../../../shared/models/user-profile.model';

describe('SignIn submission', () => {
  let page: SignIn;
  let response: Subject<UserProfile>;
  let signIn: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let setUser: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    response = new Subject<UserProfile>();
    signIn = vi.fn(() => response);
    navigate = vi.fn().mockResolvedValue(true);
    setUser = vi.fn();
    TestBed.configureTestingModule({providers: [
      {provide: AuthService, useValue: {SignIn: signIn}},
      {provide: UserDataService, useValue: {setUser}},
      {provide: Router, useValue: {navigate}},
      {provide: TranslocoService, useValue: {translate: (key: string) => key}},
    ]});
    page = TestBed.runInInjectionContext(() => new SignIn());
  });

  it('rejects blank usernames before sending a request', () => {
    page.form.setValue({username: '   ', password: 'secret'});
    page.onSubmit();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('prevents duplicate requests and keeps loading until navigation finishes', async () => {
    let finishNavigation!: (result: boolean) => void;
    navigate.mockReturnValue(new Promise<boolean>(resolve => {finishNavigation = resolve;}));
    page.form.setValue({username: '  admin  ', password: '  Keep spaces!  '});
    page.onSubmit();
    page.onSubmit();
    expect(signIn).toHaveBeenCalledExactlyOnceWith({username: 'admin', password: '  Keep spaces!  '});
    const profile = {id: 1, name: 'Admin', username: 'admin', roles: ['ROLE_ADMIN']};
    response.next(profile);
    response.complete();
    expect(setUser).toHaveBeenCalledWith(profile);
    expect(navigate).toHaveBeenCalledWith(['/admin/academic-years']);
    expect(page.loading()).toBe(true);
    finishNavigation(true);
    await Promise.resolve();
    expect(page.loading()).toBe(false);
  });

  it('uses the submitted username when a temporary password requires updating', () => {
    page.form.setValue({username: '  20260002  ', password: 'temporary'});
    page.onSubmit();
    page.form.controls.username.setValue('changed while pending');
    response.error({status: 403, error: {reason: 'TEMPORARY_PASSWORD'}});
    expect(navigate).toHaveBeenCalledWith(['/update-password'], {queryParams: {username: '20260002'}});
    expect(page.loading()).toBe(false);
    expect(page.errorMessage()).toBeNull();
  });

  it('allows retrying invalid credentials', () => {
    page.form.setValue({username: 'admin', password: 'wrong'});
    page.onSubmit();
    response.error({status: 401});
    expect(page.loading()).toBe(false);
    expect(page.errorMessage()).toBe('UI_TEXT.INVALID_CREDENTIALS');
  });
});
