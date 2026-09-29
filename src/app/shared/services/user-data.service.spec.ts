import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { UserDataService } from './user-data.service';

describe('UserDataService signals', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { me: () => of(null) } }],
    });
  });

  it('derives student view from role and teacher view toggle', () => {
    const state = TestBed.inject(UserDataService);
    state.setUser({ id: 1, name: 'Teacher', username: 'teacher', roles: ['TEACHER'] });
    expect(state.isAuthenticated()).toBe(true);
    expect(state.isTeacher()).toBe(true);
    expect(state.isStudentView()).toBe(false);

    state.toggleTeacherViewMode();
    expect(state.isStudentView()).toBe(true);
    state.clearUser();
    expect(state.isAuthenticated()).toBe(false);
  });
});
