import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
// import { UserService } from '../_services/user.service';
import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase/app';
import { Observable, from } from 'rxjs';
import { take, map, tap } from 'rxjs/operators';

@Injectable()
export class AuthGuard implements CanActivate {
  user: Observable<firebase.User>;

  constructor(private router: Router, private auth: AngularFireAuth) {
    this.user = auth.authState;
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    return from(this.user).pipe(
      take(1),
      map((currentState) => !!currentState),
      tap((authenticated) => {
        if (!authenticated) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url },
          });
        }
      })
    );
  }
}
