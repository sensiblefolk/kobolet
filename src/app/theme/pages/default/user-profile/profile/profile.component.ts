import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { AuthService } from '../../../../../_services/auth.service';
import { Observable, Subscription } from 'rxjs';

import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit, OnDestroy {
  userPhotoUrl: string;
  userName: string;
  userEmail: string;
  userOccupation: string;
  userPhone: string;
  userAddress: string;
  userState: string;
  userCity: string;
  userCurrency: string;
  userCountry: string;
  userPostCode: number;
  userBankAccountName = '';
  userBankAccountNumber = '';
  userBankName = '';
  bankBvn: number;
  verified: boolean;
  pending: boolean;
  loading: boolean;
  userDoc: AngularFirestoreDocument<any>;
  User: Observable<any>;
  countDoc: any = {};
  showKyc: boolean;
  kycpending = false;
  kycUrlObject: any = {};
  exchangeRate: any;
  passport = false;
  national = false;
  license = false;
  kycSelectState = true;
  disableToggle = false;
  onSubmitClick = false;
  options: object;

  xrateObservable: Subscription;
  userObservable: Subscription;
  counterObservable: Subscription;

  constructor(
    private authService: AuthService,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.getExchangeRates();
    this.getCountRef();
    this.getUserDetails();
    this.options = this.authService.fileStackOption;
  }

  getExchangeRates(): void {
    this.xrateObservable = this.afs
      .doc('rates/usd')
      .valueChanges()
      .subscribe(
        (data) => {
          this.exchangeRate = data;
        },
        (error) => {
          console.log('error', error);
        }
      );
  }

  getCountRef(): void {
    const countRef: AngularFirestoreDocument<any> = this.afs.doc(
      `/count/${this.authService.currentUserId}`
    );
    this.counterObservable = countRef.valueChanges().subscribe((countValue) => {
      if (countValue) {
        const rates = this.exchangeRate[countValue.currency];
        this.countDoc = {
          amount: countValue.amount * rates,
          loanPaid: countValue.loanPaid * rates,
          currency: countValue.currency,
        };
      } else {
        this.countDoc = {
          amount: 0,
          loanPaid: 0,
          currency: 'NGN',
        };
      }
    });
  }

  fancyFormatter(value: number): string {
    const localAmount = this.authService.digitFancyFormatter(value);
    return this.authService.digitFancyFormatter(value);
  }

  getUserDetails(): void {
    // this.loading = false;
    const authData = this.authService;
    this.userDoc = this.afs.doc(`users/${this.authService.currentUserId}`);
    const userDetails = this.userDoc.valueChanges();
    this.userObservable = userDetails.subscribe((data) => {
      if (data && data.phone) {
        this.userPhotoUrl = authData.currentUserPhoto;
        this.userName = data.name || '';
        this.userEmail = data.email || '';
        this.userOccupation = data.occupation || '';
        this.userPhone = data.phone || '';
        this.userAddress = data.address || '';
        this.userState = data.state || '';
        this.userCity = data.city || '';
        this.userPostCode = data.postal || '';
        this.userCountry = data.country || '';
        this.userBankAccountName = data.bank.accountName || '';
        this.userBankAccountNumber = data.bank.accountNumber || '';
        this.userCurrency = data.currency || '';
        this.userBankName = data.bank.bankName || '';
        this.bankBvn = data.bank.bvn || '';
        this.verified = data.kyc.verified;
        this.pending = data.kyc.pending;
        this.loading = true;
        this.showKyc = data.kyc.verified;
        this.disableToggle = data.kyc.verified ? true : false;
      } else {
        this.userPhotoUrl = this.authService.currentUserPhoto;
        this.userEmail = authData.authState.email;
        this.userName = authData.authState.displayName;
        this.loading = true;
        this.userCurrency = 'NGN';
      }
    });
  }

  onSubmitProfile(form: NgForm): void {
    const data = form.value;
    this.onSubmitClick = true;
    // console.log(form);
    const query = {
      name: data.fullName || this.userName,
      address: data.address || this.userAddress,
      city: data.city || this.userCity,
      country: data.country || this.userCountry,
      email: data.email || this.userEmail,
      occupation: data.occupation || '',
      phone: data.phone || this.userPhone,
      postal: data.postal || this.userPostCode,
      state: data.state || this.userState,
    };
    // console.log(query);
    this.userDoc = this.afs.doc(`/users/${this.authService.currentUserId}`);
    this.userDoc
      .update(query)
      .then((success) => {
        // console.log('updated successfully');
        this.onSubmitClick = false;
        this.authService.showNotification(
          'top',
          'right',
          'profile updated successfully',
          'success'
        );
      })
      .catch((err) => {
        // console.log('error updating data', err);
        this.onSubmitClick = false;
        this.authService.showNotification(
          'top',
          'right',
          'error updating profile',
          'warning'
        );
      });
  }

  inputStatus(): boolean {
    const p = this.passport;
    const n = this.national;
    const l = this.license;

    if (p) {
      this.national = false;
      this.license = false;
      this.kycSelectState = false;
      return false;
    } else if (n) {
      this.passport = false;
      this.license = false;
      this.kycSelectState = false;
      return false;
    } else if (l) {
      this.passport = false;
      this.national = false;
      this.kycSelectState = false;
      return false;
    } else {
      this.kycSelectState = true;
      return true;
    }
  }

  onUploadSuccess(res: any): void {
    this.authService.showNotification(
      'top',
      'center',
      'KYC details uploaded successfully',
      'success'
    );
    this.pending = true;
    const fileUpload = res.filesUploaded;
    // console.log(res.filesFailed)
    fileUpload.forEach((entry, index) => {
      this.kycUrlObject[index] = entry.url;
    });
    if (this.kycUrlObject) {
      this.userDoc.update({
        kyc: {
          url: this.kycUrlObject,
          verified: true,
        },
      });
    }
  }

  onUploadError(err: any): void {
    this.authService.showNotification(
      'top',
      'center',
      'failed uploading KYC detail',
      'danger'
    );
  }

  ngOnDestroy(): void {
    if (this.counterObservable) {
      this.counterObservable.unsubscribe();
    }
    if (this.xrateObservable) {
      this.xrateObservable.unsubscribe();
    }
    if (this.userObservable) {
      this.userObservable.unsubscribe();
    }
  }
}
