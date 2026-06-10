export interface User {
  id: number;
  name: string;
  username: string;
  isActive: boolean;
  roles: string[];
}

export interface SignUpRequest {
  name: string;
  password?: string;
  roles: string[];
}

export interface SignUpResponse {
  username: string;
  message: string;
}

export const AVAILABLE_ROLES = [
  { id: 'COORDINATOR', label: 'Coordinador', dbId: 3 },
  { id: 'TEACHER', label: 'Docente', dbId: 2 },
  { id: 'STUDENT', label: 'Estudiante', dbId: 1 }
];
