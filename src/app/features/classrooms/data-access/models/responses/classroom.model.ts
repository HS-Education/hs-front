export interface Classroom {
  id: number;
  courseId: number;
  courseName: string;
  section: Section;
  academicYearName: number;
  status: string;
}

interface Section {
  id: number;
  name: string;
  educationLevel: string;
  gradeLevel: string;
}
