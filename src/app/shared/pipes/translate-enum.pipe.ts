import { Pipe, PipeTransform } from '@angular/core';

const DICTIONARY: Record<string, string> = {
  // Levels
  'PRIMARY': 'Primaria',
  'SECONDARY': 'Secundaria',

  // Grades & Bimesters
  'FIRST': 'Primero',
  'SECOND': 'Segundo',
  'THIRD': 'Tercero',
  'FOURTH': 'Cuarto',
  'FIFTH': 'Quinto',
  'SIXTH': 'Sexto',
  'BIMESTER_1': '1er Bimestre',
  'BIMESTER_2': '2do Bimestre',
  'BIMESTER_3': '3er Bimestre',
  'BIMESTER_4': '4to Bimestre',
  
  // Statuses
  'ACTIVE': 'Activo',
  'PLANNED': 'Planificado',
  'CLOSED': 'Cerrado',
  'FINISHED': 'Finalizado',
  'COMPLETED': 'Completado',
  'STARTED': 'Iniciado',
  'PENDING': 'Pendiente',

  // Common Roles
  'ADMIN': 'Administrador',
  'ROLE_ADMIN': 'Administrador',
  'COORDINATOR': 'Coordinador',
  'ROLE_COORDINATOR': 'Coordinador',
  'TEACHER': 'Docente',
  'ROLE_TEACHER': 'Docente',
  'STUDENT': 'Estudiante',
  'ROLE_STUDENT': 'Estudiante',
};

@Pipe({
  name: 'translateEnum',
  standalone: true
})
export class TranslateEnumPipe implements PipeTransform {
  transform(value: string | undefined | null, context?: string): string {
    if (!value) return '';
    
    const upperValue = value.toUpperCase();

    if (context === 'bimester') {
      const bimesterMap: Record<string, string> = {
        'FIRST': '1er Bimestre',
        'SECOND': '2do Bimestre',
        'THIRD': '3er Bimestre',
        'FOURTH': '4to Bimestre',
        'FIFTH': '5to Bimestre',
        'SIXTH': '6to Bimestre',
        'BIMESTER_1': '1er Bimestre',
        'BIMESTER_2': '2do Bimestre',
        'BIMESTER_3': '3er Bimestre',
        'BIMESTER_4': '4to Bimestre',
      };
      if (bimesterMap[upperValue]) {
        return bimesterMap[upperValue];
      }
    }

    // Check direct match
    if (DICTIONARY[value]) {
      return DICTIONARY[value];
    }

    // Try uppercase match
    if (DICTIONARY[upperValue]) {
      return DICTIONARY[upperValue];
    }

    // Return original if no translation found, perhaps capitalized
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}
