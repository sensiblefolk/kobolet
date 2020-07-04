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
import { Router } from '@angular/router';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { AuthService } from '../../_services/auth.service';
import { ApiService } from '../../_services/api.service';

import { Subscription } from 'rxjs';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-crypto-deposit',
  templateUrl: './crypto-deposit.component.html',
  styleUrls: ['./crypto-deposit.component.css'],
})
export class CryptoDepositComponent implements OnInit, OnDestroy {
  @Input() cryptoCurrency: string;
  @Input() currency: string;
  @Input() extraCryptoAmount: number;
  @Input() fiatLocalCurrencyAmount: number;
  @Input() fiatAmount: string;
  @Input() actualLoanLocalCurrencyValue: number;
  @Input() cryptoRate: number;
  @Input() userDetails: any;
  @Input() wallet: any;
  @Input() rates: number;
  @Input() duration: number;
  @Input() cryptoTypeName: string;
  @Input() $MAX_WITHOUT_VERIFICATION: number;
  @Output() validateButtonSpinner = new EventEmitter<boolean>();
  @ViewChild('cryptoModal') private cryptoModal: ElementRef;

  apiTransCode: string;
  coinbaseApiObject: any;
  cryptoAddress: string;
  postCryptoApiAmount: any;
  isCopied1 = false;
  isCopied2 = false;
  expired = false;
  pendingStatus = false;
  transactionHash: string;
  modalReference: NgbModalRef;
  expiryDate: number;

  depositObservable: Subscription;
  apiSubScriptionObservable: Subscription;

  constructor(
    private afs: AngularFirestore,
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private modalService: NgbModal,
    private clipBoard: Clipboard
  ) {}

  ngOnInit(): void {}

  // ng-bootstrap modal open event
  modalOpen(): any {
    this.modalReference = this.modalService.open(this.cryptoModal, {
      centered: true,
    });
    return this.modalReference.result.then(
      (result) => {
        const resultReason = result;
      },
      (reason) => {
        this.validateButtonSpinner.emit(false);
        this.updateWallet('update');
      }
    );
  }

  closeModal(): void {
    this.expired = false;
    this.validateButtonSpinner.emit(false);
    return this.modalReference.close();
  }

  // copy item on click to clipboard
  copyToClipboard(item: string): void {
    this.clipBoard.copy(item);
    this.authService.showNotification(
      'top',
      'rigt',
      'copied successfully',
      'success'
    );
  }

  DepositStatus(query: any, apiObject: any): void {
    const depositDoc = this.afs.doc(
      `deposit/${this.authService.currentUserId}/${this.cryptoTypeName}/${query.code}`
    );
    const depositQuery = {
      verified: false,
      pending: false,
      expired: false,
      ...query,
      apiObject,
    };
    depositDoc.set(depositQuery);
  }

  updateWallet(type: string): void {
    const walletRef = this.afs.doc(
      `wallet/${this.authService.currentUserId}/${this.cryptoTypeName}/holding`
    );
    const walletObject = this.wallet;
    if (type === 'update' && walletObject && walletObject.balance) {
      const newBalance = walletObject.balance + walletObject.temp_held;
      const newHeldBalance = walletObject.heldBalance - walletObject.temp_held;
      walletRef.update({
        balance: newBalance,
        heldBalance: newHeldBalance,
        temp_held: 0,
      });
    } else {
      if (this.extraCryptoAmount > 0) {
        const newBalance = walletObject.balance - this.extraCryptoAmount;
        const newHeldBalance =
          walletObject.heldBalance + this.extraCryptoAmount;
        walletRef.update({
          balance: newBalance,
          heldBalance: newHeldBalance,
          temp_held: this.extraCryptoAmount,
          code: this.apiTransCode,
        });
      }
    }
  }

  // Trigger call base API for new crypto transaction
  callCryptoApi(cryptoType: string, amount: any): void {
    this.validateButtonSpinner.emit(true);
    let completed = false;
    const userDetails = this.userDetails;
    const name = userDetails.name;
    const query = {
      name,
      email: userDetails.email,
      amount,
      type: cryptoType,
    };
    // this.modalOpen(this.cryptoModal);
    if (this.expiryDate && this.expiryDate >= Date.now()) {
      this.modalOpen();
      return;
    } else {
      this.apiSubScriptionObservable = this.apiService
        .postWalletFunding(query)
        .subscribe(
          (response) => {
            const data = response.data;
            const code = data.code;
            this.apiTransCode = data.code;
            this.updateWallet('new');
            const ref = `kobolet${Date.now()}`;
            // tslint:disable-next-line:max-line-length
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cryptoType}:${data.addresses[cryptoType]}?amount=${data.pricing[cryptoType].amount}`;
            const paymentExpired = moment(data.expires_at).valueOf();
            const paymentCreated = moment(data.created_at).valueOf();

            this.coinbaseApiObject = {
              image_url: qrCodeUrl,
              transaction_code: data.code,
              amount: data.pricing[cryptoType].amount + this.extraCryptoAmount,
              hosted_url: data.hosted_url,
              created_at: paymentCreated,
              expires_at: paymentExpired,
              code: data.code,
              fiatAmount: this.fiatLocalCurrencyAmount,
              email: userDetails.email,
              fiatInterestAmount: this.actualLoanLocalCurrencyValue,
              cryptoPrice: this.cryptoRate,
              currency: this.currency,
              exchangeRate: this.rates,
              ref,
              accountNumber: userDetails.bank.accountNumber,
              bankCode: userDetails.bank.bankCode,
              bankName: userDetails.bank.bankName,
              name: userDetails.name,
              cryptoType,
              duration: this.duration,
              cryptoAddress: data.addresses[cryptoType],
            };
            this.expiryDate = moment(paymentExpired).valueOf();
            this.cryptoAddress = data.addresses[cryptoType];
            this.postCryptoApiAmount = data.pricing[cryptoType].amount;

            this.DepositStatus(this.coinbaseApiObject, data);

            this.modalOpen();
            this.apiSubScriptionObservable.unsubscribe();
            const depositDoc: AngularFirestoreDocument<any> = this.afs.doc(
              `deposit/${this.authService.currentUserId}/${cryptoType}/${data.code}`
            );
            this.depositObservable = depositDoc
              .valueChanges()
              .subscribe((depositValue) => {
                if (
                  depositValue &&
                  depositValue.verified &&
                  code === depositValue.code
                ) {
                  this.authService.showNotification(
                    'top',
                    'right',
                    `Wallet funded successfully`,
                    'success'
                  );
                  const message = `${this.coinbaseApiObject.amount} deposited to ${cryptoType} successfully`;
                  this.authService.newNotification(message);
                  // tslint:disable-next-line:no-unused-expression
                  this.authService.closeModal;
                  this.validateButtonSpinner.emit(false);
                  completed = true;
                  // console.log('verified')
                  // check kyc verification status
                  const currentFiatAmount = parseFloat(this.fiatAmount);
                  if (
                    !userDetails.kyc.verified &&
                    currentFiatAmount >= this.$MAX_WITHOUT_VERIFICATION
                  ) {
                    this.modalReference.close();
                    this.router.navigate(['/user/new']);
                  } else {
                    // console.log('payment successful');
                    this.authService.showNotification(
                      'top',
                      'right',
                      'Your accoun will be credited within the hour',
                      'success'
                    );
                    this.modalReference.close();
                  }
                } else if (
                  depositValue &&
                  depositValue.pending &&
                  code === depositValue.code
                ) {
                  this.pendingStatus = depositValue.pending;
                  this.transactionHash = depositValue.transactionHash;
                }
                // else if (
                //   depositValue &&
                //   !depositValue.verified &&
                //   code === depositValue.code &&
                //   depositValue.expired
                // ) {
                //   this.expired = true;
                //   this.validateButtonSpinner.emit(false);
                //   this.closeModal();
                // }
              });
          },
          (eventError) => {
            this.validateButtonSpinner.emit(false);
            this.authService.showNotification(
              'top',
              'center',
              'Error! please try again in 5 minutes',
              'danger'
            );
          }
        );
    }
  }

  // handle transaction expired
  handleDepositExpiredEvent(event): void {
    if (event && event.action === 'done' && event.left === 0) {
      this.expired = true;
      this.validateButtonSpinner.emit(false);
      this.closeModal();
    }
  }

  ngOnDestroy(): void {
    if (this.depositObservable) {
      this.depositObservable.unsubscribe();
    }
    if (this.apiSubScriptionObservable) {
      this.apiSubScriptionObservable.unsubscribe();
    }
  }
}
