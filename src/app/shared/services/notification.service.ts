import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environment/environment';
import {Notification} from '../models/notification.model';
import {MessageResource} from '../models/message-resource.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getUnreadNotifications() {
    return this.http.get<Notification[]>(
      `${this.baseUrl}/notifications/unread`,
      { withCredentials: true }
    );
  }

  markAsRead(id: number) {
    return this.http.post<MessageResource>(
      `${this.baseUrl}/notifications/${id}/read`,
      {},
      { withCredentials: true }
    );
  }
}
