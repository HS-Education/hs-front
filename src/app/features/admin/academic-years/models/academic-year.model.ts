export type AcademicYearStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';
export type GradingPeriodStatus = 'PLANNED' | 'ACTIVE' | 'FINISHED';
export type Bimester = 'BIMESTER_1' | 'BIMESTER_2' | 'BIMESTER_3' | 'BIMESTER_4';

export interface AcademicYear {
  id: number;
  year: number;
  status: AcademicYearStatus;
}

export interface GradingPeriod {
  id: number;
  academicYearId: number;
  academicYearName: number;
  bimester: Bimester;
  startDate: string | null;
  endDate: string | null;
  status: GradingPeriodStatus;
}

export interface UpdateGradingPeriodRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}
