import {
  Component,
  OnInit,
  Input,
  Output,
  ViewChild,
  ElementRef,
  EventEmitter,
  ViewEncapsulation,
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
  encapsulation: ViewEncapsulation.None,
})
export class BankDetailsComponent implements OnInit {
  @Input() currency: string;
  @Input() country: string;
  @Input() name: string;
  @Output() bankStatus = new EventEmitter<boolean>();
  @ViewChild('bankUpdate') private bankUpdate: ElementRef;

  acctNumbVerified = false;
  acctNumbSpinner = false;
  acctNumbError = false;
  validateButtonSpinner = false;
  showBankSaveNotification: boolean;
  banksArray: Array<any> = Nigeria;
  countryLocation: Array<any> = country;
  selectedBank: string;
  userBankAccountNumber: string;
  userBankCode: string;
  userBankName: string;
  userBankAccountName: string;
  countryCode: string;
  userCountry: string;
  modalReference: NgbModalRef;
  minCountryAccountNumberDigit: object = {
    NGN: 10,
    KES: 11,
    GHS: 9,
  };

  apiServiceSubscription: Subscription;

  constructor(
    private afs: AngularFirestore,
    private apiService: ApiService,
    private authService: AuthService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.selectedBank = this.banksArray['0'].name;
    this.getBankList();
    // this.modalOpen(this.bankUpdate)
  }

  modalOpen(): void {
    this.modalReference = this.modalService.open(this.bankUpdate, {
      centered: true,
    });
    this.modalReference.result.then(
      (result) => {
        const resultReason = result;
      },
      (reason) => {
        this.bankStatus.emit(false);
      }
    );
  }

  closeModal(): void {
    this.modalReference.close();
  }

  getBankList(): void {
    const codeCurrency = this.currency.slice(0, -1);
    this.apiServiceSubscription = this.apiService
      .postBankList$(codeCurrency)
      .subscribe((message) => {
        const newData = message.data;

        const data = Object.keys(newData).map((k) => {
          return { code: k, name: newData[k] };
        });
        // console.log(data);
        this.banksArray = data;
        this.selectedBank = data[4].name;
        this.apiServiceSubscription.unsubscribe();
      });
  }

  verifyAccountNumber(account: string): void {
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

  onSubmitNewBank(form: NgForm): void {
    const data = form.value;
    const bankDetail = this.banksArray.find(
      (bankname) => bankname.name === data.bankName
    );
    const bankName = data.bankName;
    const accountNumber = data.accountNumber;
    this.validateButtonSpinner = true;

    // validate user name in firestore
    const re = /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    const userRef = this.afs.doc(`/users/${this.authService.currentUserId}`);

    const userName = re.test(this.name) ? data.accountName : this.name;

    const query = {
      bank: {
        bankName: bankName.trim(),
        accountName: data.accountName,
        accountNumber: accountNumber.trim(),
        bankCode: bankDetail.code,
      },
      currency: this.currency,
      country: this.country || 'Nigeria',
      name: userName,
    };

    userRef
      .update(query)
      .then(() => {
        this.authService.showNotification(
          'top',
          'right',
          'bank details added successfully',
          'success'
        );
        this.bankStatus.emit(true);

        this.closeModal();
      })
      // tslint:disable-next-line: variable-name
      .catch((_err) => (this.validateButtonSpinner = false));
  }
}
