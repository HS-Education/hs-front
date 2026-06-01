export const EDUCATION_LEVEL_OPTIONS = ['SECONDARY'] as const;
export type EducationLevel = (typeof EDUCATION_LEVEL_OPTIONS)[number];

export const GRADE_LEVEL_OPTIONS = ['SECOND'] as const;
export type GradeLevel = (typeof GRADE_LEVEL_OPTIONS)[number];
