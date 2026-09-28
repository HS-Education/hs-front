import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environment/environment';
import {Notification} from '../models/notification.model';
import {MessageResource} from '../models/message-resource.model';
import {NotificationPreference, UpdateNotificationPreference} from '../models/notification-preference.model';

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

  getPreferences() {
    return this.http.get<NotificationPreference>(
      `${this.baseUrl}/notifications/preferences`,
      { withCredentials: true }
    );
  }

  updatePreferences(preferences: UpdateNotificationPreference) {
    return this.http.put<NotificationPreference>(
      `${this.baseUrl}/notifications/preferences`,
      preferences,
      { withCredentials: true }
    );
  }

  connectRealtime(
    onNotification: (notification: Notification) => void,
    onReconnected?: () => void,
  ): () => void {
    const streamUrl = `${this.baseUrl}/notifications/stream`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });
    let hasConnected = false;

    eventSource.onopen = () => {
      if (hasConnected) onReconnected?.();
      hasConnected = true;
    };

    eventSource.addEventListener('notification', (event) => {
      const data = (event as MessageEvent<string>).data;
      try {
        onNotification(JSON.parse(data) as Notification);
      } catch {
        // Ignore malformed events and keep the stream alive.
      }
    });

    return () => eventSource.close();
  }
}
