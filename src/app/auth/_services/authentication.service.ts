import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable()
export class AuthenticationService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http
      .post('/api/authenticate', JSON.stringify({ email, password }))
      .pipe(
        map((response: any) => {
          // login successful if there's a jwt token in the response
          const user = response.json();
          if (user && user.token) {
            // store user details and jwt token in local storage to keep user logged in between page refreshes
            localStorage.setItem('currentUser', JSON.stringify(user));
          }
        })
      );
  }

  logout(): void {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
  }
}
