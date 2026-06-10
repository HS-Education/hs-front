export interface Area {
  id: number;
  name: string;
  coordinatorName: string;
}

export interface CreateAreaRequest {
  name: string;
  coordinatorId: number;
}

export interface UpdateAreaRequest {
  name?: string;
  coordinatorId?: number;
}
