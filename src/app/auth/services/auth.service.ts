import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environment/environment';
import {SignInRequest} from '../models/sign-in.model';
import {UserProfile} from '../../shared/models/user-profile.model';
import {MessageResource} from '../../shared/models/message-resource.model';
import {ChangePasswordRequest} from '../models/change-password.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  SignIn(payload: SignInRequest){
    return this.http.post<UserProfile>(
      `${this.baseUrl}/auth/sign-in`,
      payload,
      { withCredentials: true }
    );
  }

  refreshToken(){
    return this.http.post<MessageResource>(
      `${this.baseUrl}/auth/refresh-token`,
      {},
      { withCredentials: true }
    );
  }

  me(){
    return this.http.get<UserProfile>(
      `${this.baseUrl}/auth/me`,
      { withCredentials: true }
    );
  }

  logOut(){
    return this.http.post<MessageResource>(`${this.baseUrl}/auth/log-out`,
      {},
      { withCredentials: true }
    );
  }

  changePassword(payload: ChangePasswordRequest) {
    return this.http.post<MessageResource>(
      `${this.baseUrl}/auth/change-password`,
      payload,
      { withCredentials: true }
    );
  }
}
