import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../../_services/auth.service';
import { AngularFireAuth } from '@angular/fire/auth';
import * as firebase from 'firebase/app';
import { Observable, from } from 'rxjs';
import { take, map, tap } from 'rxjs/operators';
import * as moment from 'moment';

@Injectable()
export class AuthGuard implements CanActivate {
  user: Observable<firebase.User>;
  authState: any;

  constructor(private router: Router, private auth: AngularFireAuth) {
    this.user = auth.authState;
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    const currentTime = Date.now();
    this.authState = (async () => {
      this.authState = await this.auth.currentUser;
    })();

    return from(this.user).pipe(
      take(1),
      map((currentState) => !!currentState),
      tap((authenticated) => {
        if (!authenticated) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url },
          });
        } else {
          if (this?.authState?.metadata?.b) {
            const plusoneHour = moment(parseFloat(this?.authState?.metadata?.b))
              .add(2, 'hour')
              .valueOf();
            if (currentTime > plusoneHour) {
              this.auth.signOut();
              this.router.navigate(['/login'], {
                queryParams: { returnUrl: state.url },
              });
            }
          }
        }
      })
    );
  }
}
