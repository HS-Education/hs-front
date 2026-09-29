export interface Document {
  id: number;
  title: string;
  topicId: number;
  format: string;
  originalFileName: string;
  createdAt?: string;
  topicName?: string;
}
