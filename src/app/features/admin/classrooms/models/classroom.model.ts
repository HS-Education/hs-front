export interface SectionResource {
  id: number;
  name: string;
  educationLevel: 'PRIMARY' | 'SECONDARY';
  gradeLevel: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH';
}

export interface Classroom {
  id: number;
  courseId: number;
  courseName: string;
  section: SectionResource;
  academicYearId: number;
  academicYearName: number;
  academicYearStatus: 'PLANNED' | 'ACTIVE' | 'CLOSED';
  status: 'ACTIVE' | 'INACTIVE';
}
