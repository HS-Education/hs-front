import {TestBed} from '@angular/core/testing';
import {TranslocoService} from '@jsverse/transloco';
import {Users} from './users';
import {UserService} from './services/user.service';
import {ToastService} from '../../../shared/services/toast.service';

describe('generated password clipboard', () => {
  let page: Users;
  let writeText: ReturnType<typeof vi.fn>;
  const toast = {success: vi.fn(), error: vi.fn()};
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  beforeEach(() => {
    toast.success.mockClear();
    toast.error.mockClear();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
    TestBed.configureTestingModule({providers: [
      {provide: UserService, useValue: {}},
      {provide: ToastService, useValue: toast},
      {provide: TranslocoService, useValue: {translate: (key: string) => key}},
    ]});
    page = TestBed.runInInjectionContext(() => new Users());
  });
  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete (navigator as unknown as {clipboard?: unknown}).clipboard;
  });

  it('copies the generated password without including it in a notification', async () => {
    page.generatePassword();
    const generated = page.newPassword();
    await page.copyPassword();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(generated);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('ADMIN.USERS.PASSWORD_COPIED');
    expect(page.isCopyingPassword()).toBe(false);
    page.closeModal();
    expect(page.newPassword()).toBe('');
  });

  it('does nothing for an empty password and handles denied clipboard access', async () => {
    await page.copyPassword();
    expect(writeText).not.toHaveBeenCalled();
    page.newPassword.set('Secret-fixture!');
    writeText.mockRejectedValue(new Error('Clipboard denied'));
    await page.copyPassword();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith('ADMIN.USERS.PASSWORD_COPY_FAILED');
    expect(page.isCopyingPassword()).toBe(false);
  });
});
