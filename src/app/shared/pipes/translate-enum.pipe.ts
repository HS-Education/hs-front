import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

const ENUM_VALUES = new Set([
  'PRIMARY', 'SECONDARY',
  'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH',
  'ACTIVE', 'INACTIVE', 'PLANNED', 'CLOSED', 'FINISHED', 'COMPLETED', 'STARTED', 'PENDING',
  'ADMIN', 'ROLE_ADMIN', 'COORDINATOR', 'ROLE_COORDINATOR',
  'TEACHER', 'ROLE_TEACHER', 'STUDENT', 'ROLE_STUDENT',
]);

const BIMESTER_VALUES = new Set([
  'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH',
  'BIMESTER_1', 'BIMESTER_2', 'BIMESTER_3', 'BIMESTER_4',
]);

const VALUE_ALIASES: Record<string, string> = {
  'ADMINISTRADOR': 'ADMIN',
  'COORDINADOR': 'COORDINATOR',
  'DOCENTE': 'TEACHER',
  'PROFESOR': 'TEACHER',
  'ESTUDIANTE': 'STUDENT',
  'PRIMARIA': 'PRIMARY',
  'SECUNDARIA': 'SECONDARY',
  'PRIMERO': 'FIRST',
  'SEGUNDO': 'SECOND',
  'TERCERO': 'THIRD',
  'CUARTO': 'FOURTH',
  'QUINTO': 'FIFTH',
  'SEXTO': 'SIXTH',
  'ACTIVO': 'ACTIVE',
  'INACTIVO': 'INACTIVE',
  'PLANIFICADO': 'PLANNED',
  'CERRADO': 'CLOSED',
  'FINALIZADO': 'FINISHED',
  'COMPLETADO': 'COMPLETED',
  'INICIADO': 'STARTED',
  'PENDIENTE': 'PENDING',
};

@Pipe({
  name: 'translateEnum',
  standalone: true,
  pure: false,
})
export class TranslateEnumPipe implements PipeTransform {
  private readonly translocoService = inject(TranslocoService);

  transform(value: string | undefined | null, context?: 'bimester'): string {
    if (!value) return '';

    const normalizedValue = VALUE_ALIASES[value.toUpperCase()] ?? value.toUpperCase();

    if (context === 'bimester' && BIMESTER_VALUES.has(normalizedValue)) {
      return this.translocoService.translate(`BIMESTERS.${normalizedValue}`);
    }

    if (ENUM_VALUES.has(normalizedValue)) {
      return this.translocoService.translate(`ENUM.${normalizedValue}`);
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}
