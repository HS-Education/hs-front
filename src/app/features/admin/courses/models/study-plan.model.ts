export interface StudyPlan {
  id: number;
  educationLevel: string;
  gradeLevel: string;
  courseId: number;
  courseName: string;
}

export interface AddCourseToStudyPlanRequest {
  educationLevel: string;
  gradeLevel: string;
  courseId: number;
}
