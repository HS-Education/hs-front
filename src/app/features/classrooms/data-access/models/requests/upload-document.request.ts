import {EducationLevel, GradeLevel} from '../../../../../shared/models/academic-levels.model';

export interface UploadDocumentRequest {
  title: string;
  topicId: number;
  educationLevel: EducationLevel;
  gradeLevels: GradeLevel[];
}
