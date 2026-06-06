export const EDUCATION_LEVEL_OPTIONS = ['SECONDARY'] as const;
export type EducationLevel = (typeof EDUCATION_LEVEL_OPTIONS)[number];

export const GRADE_LEVEL_OPTIONS = ['SECOND'] as const;
export type GradeLevel = (typeof GRADE_LEVEL_OPTIONS)[number];

export const BIMESTER_OPTIONS = [
  { value: 'BIMESTER_1', label: 'Bimestre 1' },
  { value: 'BIMESTER_2', label: 'Bimestre 2' },
  { value: 'BIMESTER_3', label: 'Bimestre 3' },
  { value: 'BIMESTER_4', label: 'Bimestre 4' }
] as const;
