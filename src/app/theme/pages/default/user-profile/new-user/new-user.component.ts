import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../_services/auth.service';
import { ApiService } from '../../../../../_services/api.service';
import { country } from '../../../../../utility/country';
import { Nigeria } from '../../../../../utility/banks';
import { Observable } from 'rxjs';
import { NgForm } from '@angular/forms';
import { ScriptLoaderService } from '../../../../../_services/script-loader.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { levenschteinDistance } from '../../../../../utility/levenschteinDistance';

@Component({
  selector: 'app-new-user',
  templateUrl: './new-user.component.html',
  styles: [],
})
export class NewUserComponent implements OnInit, AfterViewInit {
  userPhotoUrl: string;
  userName: string;
  userEmail: string;
  userOccupation: string;
  userPhone: number;
  userDateOfBirth = '';
  userAddress: string;
  userState: string;
  userCity: string;
  userCountry: string;
  userCurrency = 'NGN';
  userPostCode: number;
  userBankAccountName: string;
  userBankAccountNumber: number;
  userBankName: string;
  userBankSwiftCode: number;
  bankBvn: number;
  terms_cond: boolean;
  countryLocation: Array<any> = country;
  banksArray: Array<any> = [];
  selectedBank: String;
  loading: boolean;
  bvnSpinner: boolean;
  acctNumbSpinner: boolean;
  acctNumbError = false;
  moneyWaveError = false;
  resendOtpSpinner: boolean;
  validateButtonSpinner: boolean;
  bvnVerified = false;
  bvnUnverified = false;
  acctNumbVerified = false;
  userDoc: AngularFirestoreDocument<any>;
  User: Observable<any>;
  kycUrlObject: any = {};
  exchangeRates: any = {};
  pending = false;
  passport = false;
  national = false;
  license = false;
  kycSelectState = true;
  countryCode: any;
  modalClose: string;
  OtpValue: string;
  otpValidateReferenceObject: any = {};
  modalReference: NgbModalRef;
  supportedCountry = true;
  minCountryAccountNumberDigit = 10;
  isMatchError = false;

  @ViewChild('content') private content: ElementRef;
  constructor(
    private _script: ScriptLoaderService,
    private router: Router,
    private authService: AuthService,
    private apiService: ApiService,
    private afs: AngularFirestore,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.getCountryDetails();
  }

  ngAfterViewInit() {
    this._script.loadScripts('app-new-user', [
      'assets/demo/demo6/default/component/forms/wizard/wizard.js',
      'assets/demo/demo6/default/component/portlets/tools.js',
    ]);
    // this.modalOpen(this.content);
    this.getBankList('NG');
  }

  isMatching(str1, str2) {
    str2 = str2.toLowerCase();
    for (
      let i = 0, words = str1.toLowerCase().match(/\w+/g);
      i < words.length;
      i++
    ) {
      if (str2.search(words[i]) > -1) {
        // console.log('matched', words[i]);
        return true;
      }
    }
    // console.log('not matched');
    return false;
  }

  verifyAccountNumber(account: string) {
    const acctNumb = account != null ? account : '';
    if (
      acctNumb.length < this.minCountryAccountNumberDigit ||
      this.acctNumbVerified
    ) {
      this.acctNumbSpinner = false;
      // console.log(acctNumb);
      return;
    }
    if (this.userCurrency === 'kES' || this.userCurrency === 'GHS') {
      this.acctNumbSpinner = false;
      return;
    }
    this.acctNumbSpinner = true;
    // console.log(acctNumb);
    const code = this.banksArray.find(
      (result) => result.name === this.selectedBank
    );
    // console.log(code);
    const query = {
      account_number: account,
      bank_code: code.code,
      currency: this.userCurrency,
    };
    // console.log(query);
    this.apiService.getAuthentication().subscribe(
      (res) => {
        // console.log(res);
        if (res.status === 'success') {
          this.apiService.verifyAccountNumber(query, res.token).subscribe(
            (resp) => {
              // console.log('response', resp);
              if (resp.status === 'success') {
                this.acctNumbVerified = true;
                this.acctNumbSpinner = false;
                this.acctNumbError = false;
                this.userBankAccountName = resp.data.account_name;
                this.userName = this.userBankAccountName;
              } else {
                this.acctNumbVerified = false;
                this.acctNumbSpinner = false;
                this.acctNumbError = true;
              }
            },
            (error) => {
              this.acctNumbSpinner = false;
              this.acctNumbError = true;
            }
          );
        }
      },
      (error) => {
        this.moneyWaveError = true;
        this.acctNumbSpinner = false;
      }
    );
  }

  bvnCheck(input: number) {
    const bvn = input != null ? input.toString() : '';
    if (bvn.length < 11 || this.bvnVerified) {
      this.bvnSpinner = false;
      return;
    }
    this.bvnSpinner = true;
    this.apiService.getBVNDetail(bvn).subscribe(
      (res) => {
        // console.log(res);
        if (res.status === 'success') {
          this.otpValidateReferenceObject = res.data;
          const fullBvnName = `${res.data.first_name} ${res.data.middle_name} ${res.data.last_name}`;
          // console.log(fullBvnName);
          if (this.userBankAccountName !== '') {
            if (
              levenschteinDistance(this.userBankAccountName, fullBvnName).match
            ) {
              this.bvnVerified = true;
              this.isMatchError = false;
            } else {
              this.isMatchError = true;
            }
          }
          this.bvnSpinner = false;
        } else {
          this.bvnUnverified = true;
          this.bvnSpinner = false;
        }
      },
      (_error) => {
        this.bvnSpinner = false;
        this.authService.showNotification(
          'top',
          'right',
          'failed verifying bvn',
          'danger'
        );
      }
    );
  }

  modalOpen(content) {
    this.modalReference = this.modalService.open(content, { centered: true });
  }

  closeModal() {
    this.modalReference.close();
  }

  getCountryDetails() {
    const location = this.countryLocation.find(
      (data) => data.name === 'Nigeria'
    );
    this.userCountry = location.name;
    this.countryCode = location.dial_code;
  }

  getBankList(code: string) {
    this.apiService.postBankList$(code).subscribe((message) => {
      const newData = message.data;

      const data = Object.keys(newData).map((k) => {
        return { code: k, name: newData[k] };
      });
      // console.log(data);
      this.banksArray = data;
      this.selectedBank = data[4].name;
    });
  }

  getCountryCode(query: string) {
    const locationCode = this.countryLocation.find(
      (data) => data.name === query
    );
    this.countryCode = locationCode.dial_code;
  }

  getCurrency(location: string) {
    switch (location) {
      case 'Nigeria':
        this.userCurrency = 'NGN';
        this.supportedCountry = true;
        this.minCountryAccountNumberDigit = 10;
        this.getBankList('NG');
        break;
      case 'Kenya':
        this.userCurrency = 'KES';
        this.supportedCountry = true;
        this.minCountryAccountNumberDigit = 11;
        this.getBankList('KE');
        break;
      case 'Ghana':
        this.userCurrency = 'GHS';
        this.supportedCountry = true;
        this.minCountryAccountNumberDigit = 12;
        this.getBankList('GH');
        break;
      default:
        this.userCurrency = 'USD';
        this.minCountryAccountNumberDigit = 6;
        this.supportedCountry = false;
      // console.log('Country not supported');
    }
  }

  onSubmit(form: NgForm) {
    const data = form.value;
    // console.log(data);
    if (
      !this.bvnVerified &&
      this.userCountry === 'Nigeria' &&
      this.isMatchError
    ) {
      this.authService.showNotification(
        'top',
        'right',
        'BVN not verified, Please enter a valid BVN number',
        'danger'
      );
      return;
    }
    if (!this.pending) {
      this.authService.showNotification(
        'top',
        'right',
        'Please upload a valid verification detail',
        'danger'
      );
      return;
    }

    if (
      this.userCountry === 'Nigeria' ||
      this.userCountry === 'Ghana' ||
      this.userCountry === 'Kenya'
    ) {
      const bankCode = this.banksArray.find(
        (result) => result.name === data.bankName
      );
      this.submitFormData(form, bankCode.code);
    } else {
      this.submitFormData(form, '');
    }
  }

  submitFormData(form: any, code: any) {
    const data = form.value;
    // console.log(data);
    const phone = `${this.countryCode}${data.phone}`;
    const query = {
      name: this.userName,
      occupation: data.occupation,
      phone: phone,
      dateOfBirth: this.userDateOfBirth || '',
      email: data.email,
      city: data.city,
      country: data.country,
      currency: this.userCurrency,
      state: data.state,
      address: data.address,
      bank: {
        bankName: data.bankName,
        accountName: this.userBankAccountName,
        accountNumber: this.userBankAccountNumber,
        bankCode: code || '',
        swift: data.swift || '',
        bvn: this.otpValidateReferenceObject || {},
      },
      kyc: {
        verified: this.pending,
        url: this.kycUrlObject,
        pending: false,
        license: data.licenseId || false,
        passport: data.passportId || false,
        national: data.nationalId || false,
      },
      terms_cond: data.accept,
    };
    //  console.log(query)
    this.userDoc = this.afs.doc(`/users/${this.authService.currentUserId}`);
    this.userDoc
      .update(query)
      .then((success) => {
        // console.log("updated successfully");
        this.authService.showNotification(
          'top',
          'right',
          'profile created successfully',
          'success'
        );
        setTimeout(() => {
          this.router.navigate(['/loans/new']);
        }, 2000);
      })
      .catch((err) => {
        // console.log("error updating data")
        this.authService.showNotification(
          'top',
          'right',
          'error creating profile',
          'warning'
        );
      });
  }

  inputStatus() {
    const kycButtonState = true;
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

  getFileStack() {
    const urlObject = {};
    this.authService.getKycUpload().then((res) => {
      this.authService.showNotification(
        'top',
        'center',
        'KYC details uploaded successfully',
        'success'
      );
      this.pending = true;
      const data = res.filesUploaded;
      // console.log(res.filesFailed)
      data.forEach((entry, index) => {
        this.kycUrlObject[index] = entry.url;
      });
      // console.log(this.kycUrlObject);
    });
  }
}
