export interface Classroom {
  id: number;
  courseId: number;
  courseName: string;
  section: Section;
  academicYearId: number;
  academicYearName: number;
  academicYearStatus: string;
  status: string;
}

interface Section {
  id: number;
  name: string;
  educationLevel: string;
  gradeLevel: string;
}
