import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Helpers } from '../helpers';

import { AngularFireAuth } from '@angular/fire/auth';
import { FirebaseUISignInSuccessWithAuthResult } from 'firebaseui-angular';
import { AuthService } from '../_services/auth.service';
import * as moment from 'moment';

@Component({
  // tslint:disable-next-line:component-selector
  selector: '.m-grid.m-grid--hor.m-grid--root.m-page',
  templateUrl: './templates/login-1.component.html',
})
export class AuthComponent implements OnInit {
  model: any = {};
  loading = false;
  returnUrl: string;
  today = moment().valueOf();

  constructor(
    private router: Router,
    public afAuth: AngularFireAuth,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  // tslint:disable-next-line: typedef
  ngOnInit() {
    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams.returnUrl || '/';
    this.router.navigate([this.returnUrl]);
    Helpers.setLoading(false);
    // this.afAuth.authState.subscribe((d) => {
    //   console.log('authlog', d);
    // });
    this.authService.setTitle('Login');
  }

  // tslint:disable-next-line: typedef
  logOut() {
    this.afAuth.signOut();
  }

  // tslint:disable-next-line: typedef
  successCallback(data: FirebaseUISignInSuccessWithAuthResult) {
    const user = data.authResult.user;
    // console.log('signinsuccess log', data);
    if (data.authResult.credential) {
      localStorage.setItem('pp', data.authResult.credential.signInMethod);
    }
    localStorage.setItem('ff', user.uid);
    const meta: any = user.metadata;
    const createDate = meta.a;
    const lastSignedIn = meta.b;
    if (createDate >= this.today) {
      this.router.navigate(['/loans/new']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
