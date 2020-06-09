import {
  Component,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
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
import { Subject, Subscription } from 'rxjs';
import { IonRangeSliderComponent } from 'ng2-ion-range-slider';
import * as moment from 'moment';

import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NgForm } from '@angular/forms';

import { Nigeria } from '../../../../../utility/banks';
import { country } from '../../../../../utility/country';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Options, ChangeContext } from 'ng5-slider';

@Component({
  selector: 'app-new-loan',
  templateUrl: './new-loan.component.html',
  styleUrls: ['./new-loan.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class NewLoanComponent implements OnInit, OnDestroy {
  @ViewChild('sliderElement') advancedSliderElement: IonRangeSliderComponent;
  @ViewChild('cryptoModal') private cryptoModal: ElementRef;
  @ViewChild('userBankUpdate') private userBankUpdate: ElementRef;

  currency = 'NGN';
  cryptoCurrency = 'BTC';
  cryptoCurrencyClass = 'fa fa-btc';
  cryptoSubject: Subject<number> = new Subject<number>();
  fiatSubject: Subject<number> = new Subject<number>();
  cryptoType = 'tBTCUSD';
  cryptoTypeName = 'bitcoin';
  cryptoAmount = 1;
  extraCryptoAmount: number;
  fiatAmount: any;
  fiatLocalCurrencyAmount: number;
  fiatUsdAmount: any;
  actualLoanValue: number;
  actualLoanLocalCurrencyValue: number;
  minSliderValue = 3;
  ionSliderValue = 3;
  exchangeRates: any = {};
  rates = 1;
  cryptoRate: any;
  $MIN = 13;
  $MAX = 28000;
  $MAX_WITHOUT_VERIFICATION = 800;
  monthlyInterestRates: number;
  someRange: any;
  bitcoin: number;
  ethereum: number;
  bitcoinObject: any;
  ethereumObject: any;
  btcAddress: string;
  postCryptoApiAmount: any;
  isCopied1 = false;
  isCopied2 = false;
  bitcoinWallet: AngularFirestoreDocument<any>;
  ethereumWallet: AngularFirestoreDocument<any>;
  validateButtonSpinner = false;
  coinbaseApiObject: any = {};
  expired = false;
  uid: string = localStorage.getItem('ff');
  loading = true;
  minCountryAccountNumberDigit = 10;
  acctNumbVerified = false;
  acctNumbSpinner = false;
  acctNumbError = false;
  supportedCountry = true;
  pendingCryptoDepositStatusn = false;
  showBankSaveNotification = false;
  showBankUpdateModal = false;
  showBankDetailsModal = false;
  submitButtonToggle = false;
  // showUserNextButton: boolean = true;
  apiTransCode: string;
  userBankAccountNumber: string;
  userBankCode: string;
  userBankName: string;
  userBankAccountName: string;
  countryCode: string;
  userCountry = 'Nigeria';
  banksArray: Array<any> = Nigeria;
  userDetails: any;
  countryLocation: Array<any> = country;
  selectedBank: String = this.banksArray['0'].name;
  modalReference: NgbModalRef;
  userModalReference: NgbModalRef;

  // ng5-slider options setup
  options: Options = {
    floor: 1,
    ceil: 12,
    step: 1,
    translate: (value: number): string => {
      return `${value} month`;
    },
    showSelectionBar: true,
    selectionBarGradient: {
      from: 'white',
      to: '#0db9f0',
    },
  };

  /* Observable params */
  xticker1Observable: Subscription;
  xticker2Observable: Subscription;
  xticker3Observable: Subscription;
  xticker4Observable: Subscription;
  btcWalletObservable: Subscription;
  ethWalletObservable: Subscription;
  xRateObservable: Subscription;
  countObservable: Subscription;
  userSubscriptionObservable: Subscription;
  depositObservable: Subscription;
  apiSubScriptionObservable: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private apiService: ApiService,
    private afs: AngularFirestore,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.getCryptoWalletDetails();
    this.getExchangeRate();
    this.getBankInCountry();
    this.userSubscriptionObservable = this.authService
      .currentUserDisplayName()
      .subscribe((userData: any) => {
        this.userDetails = userData;
        if (userData) {
          if (!userData.bank) {
            this.acctNumbVerified = false;
            this.userBankName = '';
            this.userBankAccountNumber = '';
            this.userBankCode = '';
          } else {
            this.acctNumbVerified = true;
            this.userBankName = userData.bank.bankName;
            this.userBankAccountNumber = userData.bank.accountNumber;
            this.userBankCode = userData.bank.bankCode;
          }
        }
      });
  }

  // get current exchang rates
  getExchangeRate() {
    const rateRef = this.afs.doc('rates/usd');
    rateRef.valueChanges().subscribe((data) => {
      this.exchangeRates = data;
      this.cryptoRate = data[this.cryptoType];
      this.rates = this.exchangeRates[this.currency];
      const amount = (parseFloat(this.cryptoRate) / 2) * this.cryptoAmount;
      this.fiatAmount = this.authService.digitFormatter(
        this.authService.round(amount, 0)
      );
      this.fiatLocalCurrencyAmount = this.authService.round(
        amount * this.rates,
        0
      );
      this.fiatUsdAmount = amount;
      this.actualLoanValue = this.interestValue(this.fiatUsdAmount);
      this.actualLoanLocalCurrencyValue =
        this.interestValue(this.fiatAmount) * this.rates;
      this.loading = false;
    });
  }

  // get list of country banks from datastore
  getBankInCountry() {
    const bankRef = this.afs.doc(`bank/${this.currency}`);
    bankRef.valueChanges().subscribe((bankData: any) => {
      this.banksArray = bankData.data;
      // console.log('bank', bankData.data);
      this.selectedBank = bankData.data[4].name;
    });
  }

  // ng-bootstrap modal open event
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
        this.updateWallet('update');
      }
    );
  }

  modalUserOpen(modalContent) {
    this.userModalReference = this.modalService.open(modalContent, {
      centered: true,
    });
    return this.userModalReference.result.then(
      (result) => {
        const resultReason = result;
      },
      (reason) => {
        this.validateButtonSpinner = false;
      }
    );
  }

  closeModal() {
    this.expired = false;
    this.validateButtonSpinner = false;
    return this.modalReference.close();
  }

  // event button toggler
  nextButtonToggle(event: boolean) {
    if (!event) {
      this.modalReference.close();
      this.showBankUpdateModal = true;
      this.getCountryCode('Nigeria');
      return this.modalUserOpen(this.userBankUpdate);
    }
    this.modalReference.close();
    this.showBankUpdateModal = false;
    this.getCountryCode('Nigeria');
    return this.modalUserOpen(this.userBankUpdate);
  }

  userNextButtonToggle(event: boolean) {
    if (!event) {
      this.userModalReference.close();
      return this.modalOpen(this.cryptoModal);
    }
    this.modalReference.close();
    return (this.showBankUpdateModal = false);
  }

  // event close back button toggler
  closeButtonToggle() {
    this.userModalReference.close();
    return this.modalOpen(this.cryptoModal);
  }

  getCryptoWalletDetails() {
    this.bitcoinWallet = this.afs.doc(
      `wallet/${this.authService.currentUserId}/bitcoin/holding`
    );
    this.ethereumWallet = this.afs.doc(
      `wallet/${this.authService.currentUserId}/ethereum/holding`
    );
    this.btcWalletObservable = this.bitcoinWallet
      .valueChanges()
      .subscribe((result) => {
        if (result && result.balance) {
          this.bitcoin = result.balance;
          this.bitcoinObject = result;
        } else {
          this.bitcoin = 0.0;
        }
      });

    this.ethWalletObservable = this.ethereumWallet
      .valueChanges()
      .subscribe((res) => {
        if (res && res.balance) {
          this.ethereum = res.balance;
          this.ethereumObject = res;
        } else {
          this.ethereum = 0.0;
        }
      });
  }

  updateWallet(type: string) {
    const walletRef = this[`${this.cryptoTypeName}Wallet`];
    const walletObject = this[`${this.cryptoTypeName}Object`];
    if (type === 'update' && walletObject.balance) {
      const newBalance = walletObject.balance + walletObject.temp_held;
      const newHeldBalance = walletObject.heldBalance - walletObject.temp_held;
      return walletRef.update({
        balance: newBalance,
        heldBalance: newHeldBalance,
        temp_held: 0,
      });
    } else {
      if (this.extraCryptoAmount > 0) {
        const newBalance = walletObject.balance - this.extraCryptoAmount;
        const newHeldBalance =
          walletObject.heldBalance + this.extraCryptoAmount;
        return walletRef.update({
          balance: newBalance,
          heldBalance: newHeldBalance,
          temp_held: this.extraCryptoAmount,
          code: this.apiTransCode,
        });
      }
    }
  }

  // change event handler for ng5-slider component
  sliderChangeEvent(changeContext: ChangeContext) {
    const data = changeContext.value;
    this.ionSliderValue = data;
    const roundedData = this.interestValue(this.fiatAmount);
    this.actualLoanValue = this.authService.round(roundedData, 0);
    const usdAmount = roundedData * this.rates;
    this.actualLoanLocalCurrencyValue = this.authService.round(usdAmount, 0);
  }

  // calculate loan interest on sliderToggle
  interestValue(value: any) {
    const data = this.authService.stringToNumberFormatter(value);
    // console.log(data);
    this.monthlyInterestRates = ((this.ionSliderValue / 12) * 36) / 100;
    const interest = this.monthlyInterestRates * data;
    const interestPercentage = data + interest;
    // console.log(roundedData);
    return this.authService.round(interestPercentage, 0);
  }

  toggleActualLoanValue(value: any): any {
    const data = this.authService.stringToNumberFormatter(value);
    const interest = (((this.ionSliderValue / 12) * 36) / 100) * data;
    const interestPercentage = data + interest;
    const roundedData = this.authService.round(interestPercentage, 0);
    // console.log(roundedData);
    return roundedData;
  }

  switchCurrency(currency: string) {
    switch (currency) {
      case 'USD':
        this.currency = 'USD';
        this.rates = 1;
        this.onCurrencyChange();
        this.supportedCountry = false;
        this.userCountry = 'united states';
        break;
      case 'NGN':
        this.currency = 'NGN';
        this.rates = this.exchangeRates[this.currency];
        // this.minimum = this.$MIN * this.rates;
        // this.maximum = this.$MAX * this.rates;
        this.getCountryCode('Nigeria');
        this.onCurrencyChange();
        break;
      case 'KES':
        this.currency = 'KES';
        this.rates = this.exchangeRates[this.currency];
        this.getCountryCode('Kenya');
        this.onCurrencyChange();
        break;
      case 'GHS':
        this.currency = 'GHS';
        this.rates = this.exchangeRates[this.currency];
        this.getCountryCode('Ghana');
        this.onCurrencyChange();
        break;
      default:
        this.currency = 'USD';
    }
  }

  switchCryptoCurrency(currency: string) {
    switch (currency) {
      case 'BTC':
        this.cryptoCurrency = 'BTC';
        this.cryptoCurrencyClass = 'fa fa-btc';
        this.cryptoType = 'tBTCUSD';
        this.cryptoRate = this.exchangeRates[this.cryptoType];
        this.cryptoTypeName = 'bitcoin';
        this.onCurrencyChange();
        break;
      case 'ETH':
        this.cryptoCurrency = 'ETH';
        this.cryptoCurrencyClass = 'fab fa-ethereum';
        this.cryptoType = 'tETHUSD';
        this.cryptoTypeName = 'ethereum';
        this.cryptoRate = this.exchangeRates[this.cryptoType];
        this.onCurrencyChange();
        break;
      default:
        this.cryptoCurrency = 'BTC';
    }
  }

  searchFiat(amount: any) {
    const value = this.authService.stringToNumberFormatter(amount);
    this.cryptoSubject.next(value);
    this.cryptoSubject.pipe(debounceTime(500), distinctUntilChanged());

    this.cryptoSubject.subscribe((data) => {
      const usdAmount = data;
      this.cryptoRate = this.exchangeRates[this.cryptoType];
      const cryptoValue = (usdAmount / this.cryptoRate) * 2;
      const cryptoStringValue = this.authService.digitFractionFormatter(
        this.authService.round(cryptoValue, 4)
      );
      this.cryptoAmount = cryptoStringValue;
      this.fiatAmount = this.authService.digitFormatter(usdAmount);
      this.fiatLocalCurrencyAmount = usdAmount * this.rates;
      this.fiatUsdAmount = usdAmount;
      this.actualLoanValue = this.interestValue(this.fiatUsdAmount);
      this.actualLoanLocalCurrencyValue = this.interestValue(
        this.fiatLocalCurrencyAmount
      );
    });
  }

  searchCrypto(amount: any) {
    const value = this.authService.stringToNumberFormatter(amount);
    this.fiatSubject.next(value);
    this.fiatSubject.pipe(debounceTime(500), distinctUntilChanged());

    this.fiatSubject.subscribe((data) => {
      this.cryptoRate = this.exchangeRates[this.cryptoType];
      const cryptoValue = (data * this.cryptoRate) / 2;
      const cryptoStringValue = this.authService.digitFormatter(
        this.authService.round(cryptoValue, 0)
      );
      this.fiatAmount = cryptoStringValue;
      this.fiatLocalCurrencyAmount = cryptoValue * this.rates;
      this.fiatUsdAmount = cryptoValue;
      this.actualLoanValue = this.interestValue(this.fiatUsdAmount);
      this.actualLoanLocalCurrencyValue = this.interestValue(
        this.fiatLocalCurrencyAmount
      );
    });
  }

  onCurrencyChange() {
    // const amount = (res.data.amount / 2) * this.rates;
    const amount = this.cryptoRate / 2;
    const localAmount = (this.cryptoRate / 2) * this.rates;
    this.fiatAmount = this.authService.digitFormatter(
      this.authService.round(amount, 0)
    );
    this.fiatLocalCurrencyAmount = this.authService.round(
      amount * this.rates,
      0
    );
    this.fiatUsdAmount = amount;
    this.cryptoAmount = 1;
    this.actualLoanValue = this.toggleActualLoanValue(this.fiatUsdAmount);
    this.actualLoanLocalCurrencyValue = this.toggleActualLoanValue(
      this.authService.round(localAmount, 0)
    );
  }

  DepositStatus(query: any, apiObject: any) {
    const depositDoc = this.afs.doc(
      `deposit/${this.authService.currentUserId}/${this.cryptoTypeName}/${query.code}`
    );
    const depositQuery = {
      verified: false,
      pending: false,
      expired: false,
      ...query,
      apiObject: apiObject,
    };
    return depositDoc.set(depositQuery);
  }

  // Transfer amount to local customer account
  transferFund(value: any, type: string) {
    this.submitButtonToggle = true;
    if (this.cryptoAmount > this[type]) {
      this.submitButtonToggle = false;
      return;
    }
    const heldCrypto = this.authService.stringToNumberFormatter(
      String(this.cryptoAmount)
    );
    const amount = this.authService.round(
      this.authService.stringToNumberFormatter(value),
      0
    );
    if (!this.acctNumbVerified) {
      this.submitButtonToggle = false;
      this.authService.showNotification(
        'top',
        'right',
        'Account details not found',
        'warning'
      );
      if (amount <= this.$MAX_WITHOUT_VERIFICATION * this.rates) {
        return (this.showBankDetailsModal = true);
      } else {
        return this.router.navigate(['/user/new']);
      }
    }
    this.validateButtonSpinner = true;
    const ref = `kobolet${Date.now()}`;
    const expiryDuration = this.ionSliderValue * 30;
    const currentTime = moment().valueOf();
    const expiryDate = moment(currentTime)
      .add(expiryDuration, 'days')
      .valueOf();
    const userDetails = this.userDetails;
    const name = userDetails.name;
    const query = {
      name: name,
      email: userDetails.email,
      amount: amount,
      bankCode: userDetails.bank.bankCode,
      bankName: userDetails.bank.bankName,
      accountNumber: userDetails.bank.accountNumber,
      loanInterest:
        this.actualLoanLocalCurrencyValue - this.fiatLocalCurrencyAmount,
      interestAmount: this.actualLoanLocalCurrencyValue,
      exchangeRate: this.rates,
      cryptoPrice: this.cryptoRate,
      duration: this.ionSliderValue,
      currency: this.currency,
      ref: ref,
      cryptoType: type,
      cryptoAmount: heldCrypto,
    };
    // call transfer api
    this.apiService.postFiatTransfer(query).subscribe(
      (res) => {
        this.submitButtonToggle = false;
        // console.log(res);
        // tslint:disable-next-line:max-line-length
        this.authService.showNotification(
          'top',
          'right',
          `${this.currency}${this.authService.digitFormatter(
            amount
          )} credited to bank account successfully`,
          'success'
        );
        this.validateButtonSpinner = false;
        const message = `${this.currency}${this.authService.digitFormatter(
          amount
        )} credited to bank account`;
        this.authService.newNotification(message);

        const countDoc: AngularFirestoreDocument<any> = this.afs.doc(
          `/count/${this.authService.currentUserId}`
        );
        this.countObservable = countDoc
          .valueChanges()
          .subscribe((countValue) => {
            if (countValue) {
              // save new loan to database
              //  console.log('new loan created');
              const newAmount = amount / this.rates;
              const countAmount = countValue.amount + newAmount;
              const roundedAmount = this.authService.round(countAmount, 1);
              countDoc
                .update({
                  loanCount: countValue.loanCount + 1,
                  total: countValue.total + 1,
                  amount: roundedAmount,
                  currency: this.currency,
                })
                .then(() => this.countObservable.unsubscribe());
            } else {
              countDoc.set({
                loanCount: 1,
                total: 1,
                amount: amount / this.rates,
              });
            }
          });
      },
      (event) => {
        // console.log('error event', event);
        this.submitButtonToggle = false;
        this.authService.showNotification(
          'top',
          'right',
          'transaction failed please try again later',
          'danger'
        );
        this.validateButtonSpinner = false;
      }
    );
  }

  // listen for bankStatus event emitted from child component <app-bank-details>
  bankUpdateStatus(event) {
    if (event) {
      return this.transferFund(
        this.fiatLocalCurrencyAmount,
        this.cryptoTypeName
      );
    } else {
      return (this.showBankDetailsModal = false);
    }
  }

  // Trigger call base API for new crypto transaction
  newCryptoTransaction(cryptoType: string, amount: any) {
    this.validateButtonSpinner = true;
    this.submitButtonToggle = true;
    let completed = false;
    const userDetails = this.userDetails;
    const name = userDetails.name;
    const query = {
      name: name,
      email: userDetails.email,
      amount: amount,
      type: cryptoType,
    };
    // this.modalOpen(this.cryptoModal);
    this.apiSubScriptionObservable = this.apiService
      .postWalletFunding(query)
      .subscribe(
        (response) => {
          // console.log(response);
          this.submitButtonToggle = false;
          const data = response.data;
          const code = data.code;
          this.apiTransCode = data.code;
          this.updateWallet('new');
          const ref = `kobolet${Date.now()}`;
          // tslint:disable-next-line:max-line-length
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${cryptoType}:${data.addresses[cryptoType]}?amount=${data.pricing[cryptoType].amount}`;
          const paymentExpired = moment(data.expires_at).valueOf();
          const paymentCreated = moment(data.created_at).valueOf();

          // this.validateButtonSpinner = false;

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
            ref: ref,
            accountNumber: this.userBankAccountNumber,
            bankCode: this.userBankCode,
            bankName: this.userBankName,
            name: userDetails.name,
            cryptoType: cryptoType,
            duration: this.ionSliderValue,
            cryptoAddress: data.addresses[cryptoType],
          };
          this.btcAddress = data.addresses[cryptoType];
          this.postCryptoApiAmount = data.pricing[cryptoType].amount;

          this.DepositStatus(this.coinbaseApiObject, data);

          // console.log(response);
          this.modalOpen(this.cryptoModal);
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
                this.validateButtonSpinner = false;
                completed = true;
                // console.log('verified')
                // check kyc verification status
                const currentFiatAmount = parseFloat(this.fiatAmount);
                if (
                  !userDetails.kyc.verified &&
                  currentFiatAmount <= this.$MAX_WITHOUT_VERIFICATION
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
                  // this.transferFund(this.fiatAmount, cryptoType);
                }
              } else if (
                depositValue &&
                !depositValue.verified &&
                code === depositValue.code &&
                depositValue.expired
              ) {
                this.expired = true;
                this.validateButtonSpinner = false;
                this.closeModal();
              }
            });
        },
        (eventError) => {
          this.validateButtonSpinner = false;
          this.authService.showNotification(
            'top',
            'center',
            'Error! please try again in 5 minutes',
            'danger'
          );
        }
      );
  }

  onSubmitLoan() {
    const loanAmount = this.authService.stringToNumberFormatter(
      this.fiatAmount
    );
    this.extraCryptoAmount = 0;
    if (loanAmount < this.$MIN) {
      // tslint:disable-next-line:max-line-length
      const errorMessage = `Loan amount less than minimum amount of ${
        this.currency
      }${this.authService.digitFormatter(this.$MIN * this.rates)}`;
      this.authService.showNotification(
        'top',
        'center',
        errorMessage,
        'danger'
      );
      return;
    } else if (loanAmount > this.$MAX) {
      // tslint:disable-next-line:max-line-length
      const errorMessage = `Loan amount greter than maximum amount of ${
        this.currency
      }${this.authService.digitFormatter(this.$MAX * this.rates)}`;
      this.authService.showNotification(
        'top',
        'center',
        errorMessage,
        'danger'
      );
      return;
    } else if (
      this.cryptoCurrency === 'BTC' &&
      this.cryptoAmount > this.bitcoin
    ) {
      this.extraCryptoAmount = this.bitcoin;
      const inputAmount =
        this.authService.stringToNumberFormatter(this.fiatAmount) * 2;
      const roundedAmount = inputAmount - this.bitcoin * this.cryptoRate;
      // console.log(roundedAmount)
      this.newCryptoTransaction('bitcoin', roundedAmount);
    } else if (
      this.cryptoCurrency === 'ETH' &&
      this.cryptoAmount > this.ethereum
    ) {
      this.extraCryptoAmount = this.ethereum;
      const inputAmount =
        this.authService.stringToNumberFormatter(this.fiatAmount) * 2;
      const roundedAmount = inputAmount - this.ethereum * this.cryptoRate;
      this.newCryptoTransaction('ethereum', roundedAmount);
    } else if (
      this.cryptoCurrency === 'BTC' &&
      this.cryptoAmount < this.bitcoin
    ) {
      this.transferFund(this.fiatLocalCurrencyAmount, 'bitcoin');
    } else if (
      this.cryptoCurrency === 'ETH' &&
      this.cryptoAmount < this.ethereum
    ) {
      this.transferFund(this.fiatLocalCurrencyAmount, 'ethereum');
    }
  }

  /* Helper functions for new user */
  getCountryCode(query: string) {
    const locationCode = this.countryLocation.find(
      (data) => data.name === query
    );
    // console.log('location', locationCode)
    this.countryCode = locationCode.dial_code;
    this.userCountry = locationCode.name;
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
    this.userBankCode = code.code;
    const query = {
      account_number: account,
      bank_code: code.code,
      currency: this.currency,
    };
    // console.log(query);
    const authApi = this.apiService.getAuthentication().subscribe(
      (res) => {
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

  onSubmitBank(form: NgForm) {
    const data = form.value;
    const userRef = this.afs.doc(`users/${this.authService.currentUserId}`);
    const depositDoc = this.afs.doc(
      `deposit/${this.authService.currentUserId}/${this.cryptoTypeName}/${this.coinbaseApiObject.code}`
    );

    const bankDetail = this.banksArray.find(
      (bankname) => bankname.name === data.bankName
    );
    const bankName = data.bankName;
    const accountNumber = data.accountNumber;

    // validate user name in firestore
    const re = /^(([^<>()\[\]\\.,;:\s@']+(\.[^<>()\[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    const userSub = userRef.valueChanges().subscribe((userData: any) => {
      if (!userData) {
        return userSub.unsubscribe();
      }
      const userName = re.test(userData.name)
        ? data.accountName
        : userData.name;
      const query = {
        bank: {
          bankName: bankName.trim(),
          accountName: data.accountName,
          accountNumber: accountNumber.trim(),
          bankCode: this.userBankCode,
        },
        name: userName,
        currency: this.currency,
        country: this.userCountry,
      };
      return userRef.update(query).then(() => {
        depositDoc.update({
          bankCode: this.userBankCode,
          accountNumber: data.accountNumber,
          name: userName,
          bankName: data.bankName,
        });
        userSub.unsubscribe();
        this.showBankSaveNotification = true;
      });
    });
  }
  /* Helper functions for new user */

  ngOnDestroy() {
    if (this.btcWalletObservable) {
      this.btcWalletObservable.unsubscribe();
    }
    if (this.ethWalletObservable) {
      this.ethWalletObservable.unsubscribe();
    }
    if (this.xRateObservable) {
      this.xRateObservable.unsubscribe();
    }
    if (this.depositObservable) {
      this.depositObservable.unsubscribe();
    }
    if (this.userSubscriptionObservable) {
      this.userSubscriptionObservable.unsubscribe();
    }
  }
}
