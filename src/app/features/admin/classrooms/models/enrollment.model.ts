export interface Enrollment {
  id: number;
  userId: number;
  userName: string;
  roleInClassroom: 'STUDENT' | 'TEACHER';
}

export interface AssignTeacherPayload {
  teacherId: number;
  classroomIds: number[];
}

export interface EnrollStudentsPayload {
  studentIds: number[];
  educationLevel: 'PRIMARY' | 'SECONDARY';
  gradeLevel: 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH';
  academicYearId: number;
}

export interface UnenrollStudentPayload {
  userId: number;
  classroomIds: number[];
}

export interface UnassignTeacherPayload {
  teacherId: number;
  classroomIds: number[];
}
