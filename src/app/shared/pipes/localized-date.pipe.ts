import {DatePipe, registerLocaleData} from '@angular/common';
import spanishLocale from '@angular/common/locales/es';
import {inject, Pipe, PipeTransform} from '@angular/core';
import {LanguageService} from '../../core/i18n/language.service';

registerLocaleData(spanishLocale);

@Pipe({name: 'localizedDate', standalone: true, pure: false})
export class LocalizedDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: Date | string | number | null | undefined, format = 'mediumDate', timezone?: string): string | null {
    return new DatePipe(this.language.activeLanguage()).transform(value, format, timezone);
  }
}
