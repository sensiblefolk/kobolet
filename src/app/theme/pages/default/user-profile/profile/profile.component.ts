import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { AuthService } from '../../../../../_services/auth.service';
import { Observable, Subscription } from 'rxjs';

import { NgForm } from '@angular/forms';
import { BankDetailsComponent } from '../../../../../shared/bank-details/bank-details.component';
import { country } from '../../../../../utility/country';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit, OnDestroy {
  @ViewChild(BankDetailsComponent) bankComponent: BankDetailsComponent;

  userPhotoUrl: string;
  userName: string;
  userEmail: string;
  userOccupation: string;
  userPhone: string;
  userAddress: string;
  userState: string;
  userCity: string;
  userCurrency: string;
  countryLocation: Array<any> = country;
  userCountry: string;
  userPostCode: number;
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
  userBankDetail: any = null;
  exchangeRate: any;
  passport = false;
  national = false;
  license = false;
  kycSelectState = true;
  disableToggle = false;
  onSubmitClick = false;
  options: object;
  minCountryAccountNumberDigit = 10;
  countryCode: any;

  xrateObservable: Subscription;
  userObservable: Subscription;
  counterObservable: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.getExchangeRates();
    this.getCountRef();
    this.getUserDetails();
    this.options = this.authService.fileStackOption;
    this.authService.setTitle('User Profile');
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
        this.userName = data?.name || '';
        this.userEmail = data?.email || '';
        this.userOccupation = data?.occupation || '';
        this.userPhone = data?.phone || '';
        this.userAddress = data?.address || '';
        this.userState = data?.state || '';
        this.userCity = data?.city || '';
        this.userPostCode = data?.postal || '';
        this.userCountry = data?.country || '';
        this.userBankDetail = data?.bank ?? null;
        this.userCurrency = data?.currency || '';
        this.bankBvn = data?.bank?.bvn || '';
        this.verified = data?.kyc?.verified;
        this.pending = data?.kyc?.pending;
        this.loading = true;
        this.showKyc = data?.kyc?.verified;
        this.disableToggle = data?.kyc?.verified ? true : false;
      } else {
        this.userPhotoUrl = this.authService.currentUserPhoto;
        this.userEmail = authData.authState.email;
        this.userName = authData.authState.displayName;
        this.userBankDetail = data?.bank ?? null;
        this.loading = true;
        this.userCurrency = data?.currency || 'NGN';
      }
    });
  }

  // bank addition update handler
  onBankUpdated(event: boolean): void {
    if (event) {
      this.bankComponent.closeModal();
    }
  }

  getCountryCode(query: string): void {
    const locationCode = this.countryLocation.find(
      (data) => data.name === query
    );
    this.countryCode = locationCode.dial_code;
  }

  getCurrency(location: string): void {
    switch (location) {
      case 'Nigeria':
        this.userCurrency = 'NGN';
        this.minCountryAccountNumberDigit = 10;
        break;
      case 'Kenya':
        this.userCurrency = 'KES';
        this.minCountryAccountNumberDigit = 11;
        break;
      case 'Ghana':
        this.userCurrency = 'GHS';
        this.minCountryAccountNumberDigit = 12;
        break;
      default:
        this.userCurrency = 'USD';
        this.minCountryAccountNumberDigit = 6;
      // console.log('Country not supported');
    }
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
      postal: data.postal || this.userPostCode || '',
      state: data.state || this.userState,
    };
    // console.log(query);
    this.userDoc = this.afs.doc(`/users/${this.authService.currentUserId}`);
    this.userDoc
      .update(query)
      .then(() => {
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

  inputStatus(event: boolean, kycType: string): void {
    if (event) {
      if (kycType === 'passport') {
        this.passport = event;
        this.national = !event;
        this.license = !event;
      } else if (kycType === 'national') {
        this.national = event;
        this.passport = !event;
        this.license = !event;
      } else {
        this.license = event;
        this.passport = !event;
        this.national = !event;
      }
    }
  }

  canVerify(): boolean {
    if (this.passport || this.national || this.license) {
      return false;
    }
    return true;
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
          pending: false,
          license: this.license,
          national: this.national,
          passport: this.passport,
        },
      });
      this.router.navigate(['/']);
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
