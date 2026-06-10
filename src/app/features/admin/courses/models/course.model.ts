export interface Course {
  id: number;
  name: string;
  areaId: number;
  areaName: string;
}

export interface CreateCourseRequest {
  name: string;
  areaId: number;
}

export interface UpdateCourseRequest {
  name?: string;
  areaId?: number;
}
