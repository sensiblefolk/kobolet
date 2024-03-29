import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../_services/auth.service';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import * as moment from 'moment';

export interface Item {
  name: string;
  email: string;
  photoUrl: string;
}

declare let mLayout: any;
@Component({
  selector: 'app-header-nav',
  templateUrl: './header-nav.component.html',
  styleUrls: ['./header-nav.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderNavComponent implements OnInit, AfterViewInit, OnDestroy {
  profilePhotoUrl: string;
  profileName: any;
  profileEmail: string;
  bitcoin: number;
  bitcoinHeld: number;
  ethereumHeld: number;
  ethereum: number;
  bitcoinWallet: AngularFirestoreDocument<any>;
  ethereumWallet: AngularFirestoreDocument<any>;
  userDoc: AngularFirestoreDocument<any>;
  userDetailSubscribeHandler: Observable<any>;
  loading = true;
  uid: string = this.authService.currentUserId || localStorage.getItem('ff');
  notificationArray: Array<any> = [];
  NotificationObservable: Observable<any>;

  isMobileView: boolean;

  /* Observalbe params */
  userObservable: Subscription;
  ethwalletObservable: Subscription;
  btcwalletObservable: Subscription;
  notificationSubscription: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.getNotification();
    this.getProfileDetails();
    // this.getCryptoWalletDetails();
    this.isMobileView = this.authService.isMobileDevice();
  }

  ngAfterViewInit(): void {
    mLayout.initHeader();
  }

  getNotification(): any {
    // tslint:disable-next-line:max-line-length
    const notiRef = this.afs.collection(
      `notifications/user/${this.authService.currentUserId}`,
      (ref) => ref.where('read', '==', false).limit(6)
    );
    this.NotificationObservable = notiRef.snapshotChanges().pipe(
      map((actions) => {
        return actions.map((a) => {
          const id = a.payload.doc.id;
          const data: any = a.payload.doc.data();
          const time = moment(data.time).fromNow();
          const message = data.message;
          return { id, time, message };
        });
      })
    );
    this.notificationSubscription = this.NotificationObservable.subscribe(
      (value) => {
        const sortArray = [...value];
        sortArray.sort(this.authService.sortValues('time', 'asc'));

        this.notificationArray = sortArray;
      }
    );
  }

  toggleReadStatus(id: any): void {
    const notiRef = this.afs.doc(`notifications/user/${this.uid}/${id}`);
    notiRef.update({ read: true });
  }

  navigateToWallet(type: string): void {
    this.router.navigate([`wallet/${type}`]);
  }

  getProfileDetails(): void {
    const data = this.authService;
    // console.log('header data', data);

    this.userDoc = this.afs.doc(`users/${this.uid}`);
    this.userObservable = this.userDoc.valueChanges().subscribe((info: any) => {
      if (info && info.name) {
        // validate user name in firestore
        const re = /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        this.profilePhotoUrl = data.currentUserPhoto;
        this.profileName = re.test(info.name) ? ' ' : info.name;
        this.profileEmail = info.email || data.currentUserEmail;
        this.loading = false;
      } else {
        this.profilePhotoUrl = this.authService.currentUserPhoto;
        this.profileName = data.authState.displayName || '';
        this.profileEmail = this.authService.currentUserEmail;
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logOut();
  }

  getCryptoWalletDetails(): void {
    this.bitcoinWallet = this.afs.doc(`wallet/${this.uid}/bitcoin/holding`);
    this.ethereumWallet = this.afs.doc(`wallet/${this.uid}/ethereum/holding`);
    this.btcwalletObservable = this.bitcoinWallet
      .valueChanges()
      .subscribe((result) => {
        if (result && result.balance >= 0) {
          this.bitcoin = result.balance;
          this.bitcoinHeld = result.heldBalance;
        } else {
          this.bitcoin = 0.0;
          this.bitcoinHeld = 0.0;
        }
      });

    this.ethwalletObservable = this.ethereumWallet
      .valueChanges()
      .subscribe((res) => {
        if (res && res.balance >= 0) {
          this.ethereum = res.balance;
          this.ethereumHeld = res.heldBalance;
        } else {
          this.ethereum = 0.0;
          this.ethereumHeld = 0.0;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.userObservable) {
      this.userObservable.unsubscribe();
    }
    if (this.btcwalletObservable) {
      this.btcwalletObservable.unsubscribe();
    }
    if (this.ethwalletObservable) {
      this.ethwalletObservable.unsubscribe();
    }
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
  }
}
