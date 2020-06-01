import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Helpers} from '../helpers';

import { AngularFireAuth } from '@angular/fire/auth';
import {FirebaseUISignInSuccessWithAuthResult, FirebaseuiAngularLibraryService} from 'firebaseui-angular';
import * as moment from 'moment';

@Component({
  // tslint:disable-next-line:component-selector
  selector: '.m-grid.m-grid--hor.m-grid--root.m-page',
  templateUrl: './templates/login-1.component.html',
  encapsulation: ViewEncapsulation.None,
})

export class AuthComponent implements OnInit {
  model: any = {};
  loading = false;
  returnUrl: string;
  today = moment().valueOf();

  constructor(
      private _router: Router,
      public afAuth: AngularFireAuth,
      private _route: ActivatedRoute,
      private firebaseuiAngularLibraryService: FirebaseuiAngularLibraryService
      ) {
        firebaseuiAngularLibraryService.firebaseUiInstance.disableAutoSignIn();
  }

  ngOnInit() {
    // get return url from route parameters or default to '/'
    this.returnUrl = this._route.snapshot.queryParams['returnUrl'] || '/';
    this._router.navigate([this.returnUrl]);
    Helpers.setLoading(false);
    this.afAuth.authState.subscribe(d => {
      // console.log('authlog', d)
    });
    // this.afAuth.auth.signOut();
  }

  logOut() {
    this.afAuth.auth.signOut();
  }

 successCallback(data: FirebaseUISignInSuccessWithAuthResult) {
   const user = data.authResult.user;
  //  console.log('signinsuccess log', data);
    if (data.authResult.credential) {
      localStorage.setItem('pp', data.authResult.credential.signInMethod);
    }
    localStorage.setItem('ff', user.uid);
    const meta: any = user.metadata;
    const createDate = meta.a;
    const lastSignedIn = meta.b;
    if ( createDate >= this.today ) {
      this._router.navigate(['/loans/new']);
    } else {
      this._router.navigate(['/dashboard']);
    }
 }
}
