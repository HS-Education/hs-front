export interface Classroom {
  id: number;
  courseId: number;
  courseName: string;
  areaName?: string | null;
  section: Section;
  academicYearId: number;
  academicYearName: number;
  academicYearStatus: string;
  status: string;
  teacherName?: string | null;
}

interface Section {
  id: number;
  name: string;
  educationLevel: string;
  gradeLevel: string;
}
