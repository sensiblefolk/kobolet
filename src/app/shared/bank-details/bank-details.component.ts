import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  ViewChild,
  ElementRef,
  EventEmitter,
} from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthService } from '../../_services/auth.service';
import { ApiService } from '../../_services/api.service';

import { Subscription } from 'rxjs';
import { NgForm } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Nigeria } from '../../utility/banks';
import { country } from '../../utility/country';

@Component({
  selector: 'app-bank-details',
  templateUrl: './bank-details.component.html',
  styles: [],
})
export class BankDetailsComponent implements OnInit, OnDestroy {
  @Input() currency: string;
  @Input() country: string;
  @Output() bankStatus = new EventEmitter<boolean>();
  @ViewChild('bankUpdate') private bankUpdate: ElementRef;

  acctNumbVerified = false;
  acctNumbSpinner = false;
  acctNumbError = false;
  validateButtonSpinner = false;
  showBankSaveNotification: boolean;
  banksArray: Array<any> = Nigeria;
  countryLocation: Array<any> = country;
  selectedBank: String = this.banksArray['0'].name;
  apiTransCode: string;
  userBankAccountNumber: string;
  userBankCode: string;
  userBankName: string;
  userBankAccountName: string;
  countryCode: string;
  userCountry: string;
  modalReferenceRef: NgbModalRef;
  modalReference: NgbModalRef;
  minCountryAccountNumberDigit: Object = {
    NGN: 10,
    KES: 11,
    GHS: 9,
  };

  userObservable: Subscription;

  constructor(
    private afs: AngularFirestore,
    private apiService: ApiService,
    private authService: AuthService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.getBankList();
    this.modalOpen(this.bankUpdate);
  }

  modalOpen(modalContent) {
    this.modalReference = this.modalService.open(modalContent, {
      centered: true,
    });
    return this.modalReference.result.then(
      (result) => {
        const resultReason = result;
      },
      (reason) => {
        this.validateButtonSpinner = false;
        this.bankStatus.emit(false);
      }
    );
  }

  closeModal() {
    return this.modalReference.close();
  }

  getBankList() {
    const codeCurrency = this.currency.slice(0, -1);
    this.apiService.postBankList$(codeCurrency).subscribe((message) => {
      const newData = message.data;

      const data = Object.keys(newData).map((k) => {
        return { code: k, name: newData[k] };
      });
      // console.log(data);
      this.banksArray = data;
      this.selectedBank = data[4].name;
    });
  }

  verifyAccountNumber(account: string) {
    const acctNumb = account != null ? account : '';
    if (
      acctNumb.length < this.minCountryAccountNumberDigit[this.currency] ||
      this.acctNumbVerified
    ) {
      this.acctNumbSpinner = false;
      // console.log(acctNumb);
      return;
    }
    if (this.currency === 'kES' || this.currency === 'GHS') {
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
      currency: this.currency,
    };
    // console.log(query);
    const authApi = this.apiService.getAuthentication().subscribe(
      (res) => {
        // console.log(res);
        if (res.status === 'success') {
          const verifyApi = this.apiService
            .verifyAccountNumber(query, res.token)
            .subscribe(
              (resp) => {
                // console.log('response', resp);
                if (resp.status === 'success') {
                  // this.acctNumbVerified = true;
                  this.acctNumbSpinner = false;
                  this.acctNumbError = false;
                  this.userBankAccountName = resp.data.account_name;
                  authApi.unsubscribe();
                  verifyApi.unsubscribe();
                  return;
                } else {
                  // this.acctNumbVerified = false;
                  this.acctNumbSpinner = false;
                  this.acctNumbError = true;
                  authApi.unsubscribe();
                  verifyApi.unsubscribe();
                  return;
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
        // this.moneyWaveError = true;
        this.acctNumbSpinner = false;
      }
    );
  }

  onSubmitNewBank(form: NgForm) {
    const data = form.value;
    const bankDetail = this.banksArray.find(
      (bankname) => bankname.name === data.bankName
    );
    const bankName = data.bankName;
    const accountNumber = data.accountNumber;

    // validate user name in firestore
    const re = /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    const userRef = this.afs.doc(`/users/${this.authService.currentUserId}`);
    this.userObservable = userRef.valueChanges().subscribe((userData: any) => {
      if (!userData) {
        return;
      }
      const userName = re.test(userData.name)
        ? data.accountName
        : userData.name;

      const query = {
        bank: {
          bankName: bankName.trim(),
          accountName: data.accountName,
          accountNumber: accountNumber.trim(),
          bankCode: bankDetail.code,
        },
        currency: this.currency,
        country: this.country,
        name: userName,
      };

      userRef.update(query).then(() => {
        this.authService.showNotification(
          'top',
          'right',
          'bank details added successfully',
          'success'
        );
        this.bankStatus.emit(true);
        this.closeModal();
      });
    });
  }

  ngOnDestroy() {
    if (this.userObservable) {
      this.userObservable.unsubscribe();
    }
  }
}
