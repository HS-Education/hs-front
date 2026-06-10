export interface Section {
  id: number;
  name: string;
  educationLevel: string;
  gradeLevel: string;
}

export interface CreateSectionRequest {
  name: string;
  educationLevel: string;
  gradeLevel: string;
}
