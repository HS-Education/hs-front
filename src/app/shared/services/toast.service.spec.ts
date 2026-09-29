import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  const translations: Record<string, string> = {
    'AREA.SUMMARY': 'Area summary',
    'TOAST.MESSAGE_UNAVAILABLE': 'Message unavailable',
  };
  const translate = vi.fn((key: string) => translations[key] ?? key);

  beforeEach(() => {
    vi.useFakeTimers();
    translate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslocoService,
          useValue: { translate, getActiveLang: () => 'en' },
        },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('translates a dot-separated key', () => {
    const service = TestBed.inject(ToastService);

    service.show('AREA.SUMMARY');

    expect(service.toasts()[0].message).toBe('Area summary');
  });

  it('normalizes a legacy underscore key before using the fallback', () => {
    const service = TestBed.inject(ToastService);

    service.show('TOAST_MESSAGE_UNAVAILABLE');

    expect(service.toasts()[0].message).toBe('Message unavailable');
    expect(translate).toHaveBeenCalledWith('TOAST.MESSAGE_UNAVAILABLE');
  });

  it('leaves a long malformed uppercase message unchanged without translation lookup', () => {
    const service = TestBed.inject(ToastService);
    const message = `${'A.'.repeat(10_000)}A!`;

    service.show(message);

    expect(service.toasts()[0].message).toBe(message);
    expect(translate).not.toHaveBeenCalled();
  });

  it('leaves ordinary user-facing text unchanged', () => {
    const service = TestBed.inject(ToastService);

    service.show('Your changes were saved.');

    expect(service.toasts()[0].message).toBe('Your changes were saved.');
    expect(translate).not.toHaveBeenCalled();
  });
});
