export interface Document {
  id: number;
  title: string;
  topicId: number;
  format: string;
  originalFileName: string;
  status?: 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
  createdAt?: string;
  topicName?: string;
}
