import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import * as firebase from 'firebase/app';
import * as filestack from 'filestack-js';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import * as numeral from 'numeral';
import { environment as dev } from '../../environments/environment';
import { environment as prod } from '../../environments/environment.prod';

declare const $: any;
declare const mApp: any;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  authState: any = null;
  error: any;
  state: any;
  redirect: string;
  userInfo: any;
  uid: string;
  name: string;
  email: string;
  phone: string;
  apikey = dev.production ? dev.fileStackApi : prod.fileStackApi;
  client: any = filestack.init(this.apikey);
  modalReference: NgbModalRef;

  constructor(
    private router: Router,
    private modalService: NgbModal,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth
  ) {
    this.authState = (async () => {
      const auth = await this.afAuth.currentUser;
      this.authState = auth;
    })();
  }
  // Returns true if user is logged in
  get authenticated(): boolean {
    return this.authState !== null;
  }

  // Returns current user data
  get currentUser(): any {
    return this.authenticated ? this.authState : null;
  }

  // Returns
  get currentUserObservable(): any {
    return this.afAuth.authState;
  }

  // Returns current user UID
  get currentUserId(): string {
    return this.authenticated ? this.authState.uid : '';
  }

  // Anonymous User
  get currentUserAnonymous(): boolean {
    return this.authenticated ? this.authState.isAnonymous : false;
  }

  // Returns current user display name or Guest
  currentUserDisplayName(): any {
    const userDoc: AngularFirestoreDocument<any> = this.afs.doc(
      `/users/${this.currentUserId}`
    );
    return userDoc.valueChanges();
  }

  get currentUserPhoto(): string {
    const user = firebase.auth().currentUser;
    const displayName = user.displayName;
    const imageUrl = user.photoURL;
    const provider = localStorage.getItem('pp');

    if (imageUrl !== null) {
      if (provider && provider.indexOf('facebook.com') !== -1) {
        return './assets/app/media/img/users/user.png';
      } else {
        return imageUrl;
      }
    } else {
      return './assets/app/media/img/users/user.png';
    }
  }

  get currentUserEmail(): string {
    if (this.authState.email !== null) {
      return this.authState.email;
    }
  }

  logOut(): void {
    this.afAuth.signOut();
    localStorage.removeItem('ff');
    localStorage.removeItem('pp');
    this.router.navigate(['/login']);
  }
  // floating point value precision rounder
  round(value, precision): any {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }

  /* For blocking modal UI
   * params @id (html ID)
   */
  blockModalUI(id: any): void {
    mApp.block(`#${id} .modal-content`, {
      overlayColor: '#000000',
      type: 'loader',
      state: 'primary',
      message: 'Processing...',
    });
  }

  /* For blocking modal UI
   * params @id (html ID)
   */
  unblockModalUI(id: any): void {
    mApp.unblock(`#${id} .modal-content`);
  }

  // Notification screen pop up
  showNotification(from, align, message: string, color: string): void {
    const type = ['', 'info', 'success', 'warning', 'danger'];

    $.notify(
      {
        icon: 'notifications',
        message,
      },
      {
        type: color,
        allow_dismiss: true,
        newest_on_top: false,
        timer: 4000,
        animate: {
          enter: 'animated lightSpeedIn',
          exit: 'animated lightSpeedOut',
        },
        placement: {
          from,
          align,
        },
      }
    );
  }

  // call filestack upload REST api
  get fileStackOption(): object {
    const splice = this.currentUserId.slice(0, 6);
    // const stackRef = this.client.picker();
    return {
      fromSources: [
        'local_file_system',
        'url',
        'facebook',
        'googledrive',
        'dropbox',
        'webcam',
      ],
      accept: ['image/*'],
      maxSize: 1048576,
      minFiles: 1,
      maxFiles: 2,
      allowManualRetry: true,
      // tslint:disable-next-line: typedef
      onFileSelected(file) {
        if (file.size > 1000 * 1000) {
          throw new Error('File too big, select something smaller than 1MB');
        }
        const fileName = `kobolet-kyc-${splice}`;
        file.name = fileName;
        return file;
      },
    };
  }

  // sort array of values with key been major sort key
  sortValues(key, order = 'desc'): any {
    return (a: any, b: any): any => {
      if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        return 0;
      }
      const varA = typeof a[key] === 'string' ? a[key].toUpperCase() : a[key];
      const varB = typeof b[key] === 'string' ? b[key].toUpperCase() : b[key];

      let comparison = 0;
      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
      return order === 'desc' ? comparison * -1 : comparison;
    };
  }

  digitFormatter(digit: number): string {
    const digitFormat = numeral(digit).format('0,0');
    return digitFormat;
  }

  // formats digit i.e 10,000 to 10k
  digitFancyFormatter(digit: number): string {
    const fancyDigit = numeral(digit).format('0a');
    return fancyDigit;
  }

  digitFractionFormatter(digit: number): string {
    const fractionDigit = numeral(digit).format('0.0[0000]');
    return fractionDigit;
  }

  stringToNumberFormatter(digit: string): any {
    const numeralNumber = numeral(digit);
    return numeralNumber.value();
  }

  modalOpen(content): void {
    this.modalReference = this.modalService.open(content, { centered: true });
  }
  closeModal(): void {
    this.modalReference.close();
  }

  // Store new notification message
  newNotification(message: string): void {
    const notificationRef = this.afs.collection(
      `notifications/user/${this.currentUserId}`
    );
    notificationRef.add({
      message,
      read: false,
      time: Date.now(),
    });
  }

  get getRavePayEnv(): object {
    if (!dev.production) {
      return {
        url: dev.rave.url,
        id: dev.rave.key,
        secret: dev.rave.secret,
        bvnUrl: dev.rave.bvnUrl,
        functionsUrl: dev.functionsUrl,
      };
    }
    if (prod.production) {
      return {
        url: prod.rave.url,
        id: prod.rave.key,
        secret: prod.rave.secret,
        bvnUrl: dev.rave.bvnUrl,
        functionsUrl: prod.functionsUrl,
      };
    }
  }

  // Check mobileView
  isMobileDevice(): boolean {
    return (
      // tslint:disable-next-line: deprecation
      typeof window.orientation !== 'undefined' ||
      navigator.userAgent.indexOf('IEMobile') !== -1
    );
  }
}
