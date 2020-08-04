import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ViewEncapsulation,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';

import { AuthService } from '../../../../../_services/auth.service';
import { ApiService } from '../../../../../_services/api.service';
import { Subject, Subscription } from 'rxjs';
import * as moment from 'moment';

import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Nigeria } from '../../../../../utility/banks';
import { country } from '../../../../../utility/country';
import { Options, ChangeContext } from '@m0t0r/ngx-slider';
import { BankDetailsComponent } from '../../../../../shared/bank-details/bank-details.component';
import { CryptoDepositComponent } from '../../../../../shared/crypto-deposit/crypto-deposit.component';

@Component({
  selector: 'app-new-loan',
  templateUrl: './new-loan.component.html',
  styleUrls: ['./new-loan.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class NewLoanComponent implements OnInit, OnDestroy {
  @ViewChild('cryptoModal') private cryptoModal: ElementRef;
  @ViewChild(BankDetailsComponent) bankComponent: BankDetailsComponent;
  @ViewChild(CryptoDepositComponent) cryptoComponent: CryptoDepositComponent;

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
  $MIN = 10;
  $MAX = 10000;
  $MAX_WITHOUT_VERIFICATION = 800;
  monthlyInterestRates: number;
  cryptoBalance: number;
  walletObject: any;
  cryptoWallet: AngularFirestoreDocument<any>;
  validateButtonSpinner = false;
  coinbaseApiObject: any = {};
  expired = false;
  loading = true;
  acctNumbVerified = false;
  supportedCountry = true;
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
  selectedBank: string = this.banksArray['0'].name;

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
  cryptoWalletObservable: Subscription;
  xRateObservable: Subscription;
  countObservable: Subscription;
  userSubscriptionObservable: Subscription;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.authService.setTitle('New Loan Request');
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
  getExchangeRate(): void {
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
  getBankInCountry(): void {
    const bankRef = this.afs.doc(`bank/${this.currency}`);
    bankRef.valueChanges().subscribe((bankData: any) => {
      this.banksArray = bankData.data;
      // console.log('bank', bankData.data);
      this.selectedBank = bankData.data[4].name;
    });
  }

  getCryptoWalletDetails(cryptoType: string = 'bitcoin'): void {
    this.cryptoWallet = this.afs.doc(
      `wallet/${this.authService.currentUserId}/${cryptoType}/holding`
    );
    this.cryptoWalletObservable = this.cryptoWallet
      .valueChanges()
      .subscribe((result) => {
        if (result && result.balance) {
          this.cryptoBalance = result.balance;
          this.walletObject = result;
        } else {
          this.cryptoBalance = 0.0;
        }
      });
  }

  // change event handler for ng5-slider component
  sliderChangeEvent(changeContext: ChangeContext): void {
    const data = changeContext.value;
    this.ionSliderValue = data;
    const roundedData = this.interestValue(this.fiatAmount);
    this.actualLoanValue = this.authService.round(roundedData, 2);
    const usdAmount = roundedData * this.rates;
    this.actualLoanLocalCurrencyValue = this.authService.round(usdAmount, 4);
  }

  // calculate loan interest on sliderToggle
  interestValue(value: any): number {
    const data = this.authService.stringToNumberFormatter(value);
    // console.log(data);
    this.monthlyInterestRates = ((this.ionSliderValue / 12) * 36) / 100;
    const interest = this.monthlyInterestRates * data;
    const interestPercentage = data + interest;
    // console.log(roundedData);
    return this.authService.round(interestPercentage, 2);
  }

  toggleActualLoanValue(value: any): number {
    const data = this.authService.stringToNumberFormatter(value);
    const interest = (((this.ionSliderValue / 12) * 36) / 100) * data;
    const interestPercentage = data + interest;
    const roundedData = this.authService.round(interestPercentage, 2);
    // console.log(roundedData);
    return roundedData;
  }

  switchCurrency(currency: string): void {
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

  switchCryptoCurrency(currency: string): void {
    switch (currency) {
      case 'BTC':
        this.cryptoCurrency = 'BTC';
        this.cryptoCurrencyClass = 'fa fa-btc';
        this.cryptoType = 'tBTCUSD';
        this.cryptoRate = this.exchangeRates[this.cryptoType];
        this.cryptoTypeName = 'bitcoin';
        this.getCryptoWalletDetails('bitcoin');
        this.onCurrencyChange();
        break;
      case 'ETH':
        this.cryptoCurrency = 'ETH';
        this.cryptoCurrencyClass = 'fab fa-ethereum';
        this.cryptoType = 'tETHUSD';
        this.cryptoTypeName = 'ethereum';
        this.cryptoRate = this.exchangeRates[this.cryptoType];
        this.getCryptoWalletDetails('ethereum');
        this.onCurrencyChange();
        break;
      default:
        this.cryptoCurrency = 'BTC';
    }
  }

  // convert cyrpto loan amount into equivalent price and crypto collateral amount
  getFiatPrice(amount: any): void {
    const value = this.authService.stringToNumberFormatter(amount);
    this.cryptoSubject.next(value);
    this.cryptoSubject.pipe(debounceTime(1000), distinctUntilChanged());

    this.cryptoSubject.subscribe((price) => {
      const usdAmount = price;
      this.cryptoRate = this.exchangeRates[this.cryptoType];
      const cryptoValue = (usdAmount / this.cryptoRate) * 2;
      const cryptoStringValue = this.authService.digitFractionFormatter(
        this.authService.round(cryptoValue, 4)
      );
      this.cryptoAmount = parseFloat(cryptoStringValue);
      this.fiatAmount = this.authService.digitFormatter(usdAmount);
      this.fiatLocalCurrencyAmount = usdAmount * this.rates;
      this.fiatUsdAmount = usdAmount;
      this.actualLoanValue = this.interestValue(this.fiatUsdAmount);
      this.actualLoanLocalCurrencyValue = this.interestValue(
        this.fiatLocalCurrencyAmount
      );
    });
  }

  getCryptoPrice(amount: any): void {
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

  onCurrencyChange(): void {
    const amount = (this.cryptoRate / 2) * this.cryptoAmount;
    const localAmount = amount * this.rates;
    this.fiatAmount = this.authService.digitFormatter(
      this.authService.round(amount, 0)
    );
    this.fiatLocalCurrencyAmount = this.authService.round(
      amount * this.rates,
      0
    );
    this.fiatUsdAmount = amount;
    this.actualLoanValue = this.toggleActualLoanValue(this.fiatUsdAmount);
    this.actualLoanLocalCurrencyValue = this.toggleActualLoanValue(
      this.authService.round(localAmount, 0)
    );
  }

  // Transfer amount to local customer account
  transferFund(value: any, type: string): void {
    if (this.cryptoAmount > this[type] || !this.acctNumbVerified) {
      this.bankComponent.modalOpen();
      this.validateButtonSpinner = false;
      return;
    }
    const heldCrypto = this.authService.stringToNumberFormatter(
      String(this.cryptoAmount)
    );
    const amount = this.authService.round(
      this.authService.stringToNumberFormatter(value),
      0
    );
    this.validateButtonSpinner = true;
    const ref = `kobolet${Date.now()}`;
    const userDetails = this.userDetails;
    const name = userDetails.name;
    const query = {
      name,
      email: userDetails.email,
      amount,
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
      ref,
      cryptoType: type,
      cryptoAmount: heldCrypto,
    };
    // call transfer api
    this.apiService.postFiatTransfer(query).subscribe(
      (res) => {
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
      // tslint:disable-next-line: variable-name
      (_event) => {
        // console.log('error event', event);
        this.authService.showNotification(
          'top',
          'center',
          'Fiat capital exhausted, your loan request has been logged and will be added to the waitlist. You will be notified immediately there is sufficient capital to process your loan request.',
          'info'
        );
        this.validateButtonSpinner = false;
      }
    );
  }

  // listen for bank update Status event emitted from child component <app-bank-details>
  bankUpdateStatus(event): void {
    if (event && this.cryptoAmount > this.cryptoBalance) {
      this.newCryptoTransaction(this.cryptoBalance, this.cryptoTypeName);
    }
  }

  setSubmitButtonSpinner(event): void {
    this.validateButtonSpinner = event;
  }

  onSubmitLoan(): void {
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
    } else if (this.cryptoAmount > this.cryptoBalance) {
      this.newCryptoTransaction(this.cryptoBalance, this.cryptoTypeName);
    } else if (this.cryptoAmount < this.cryptoBalance) {
      this.transferFund(this.fiatLocalCurrencyAmount, this.cryptoTypeName);
    }
  }

  newCryptoTransaction(amount: number, cryptoType: string): void {
    this.extraCryptoAmount = amount;
    const inputAmount =
      this.authService.stringToNumberFormatter(this.fiatAmount) * 2;
    const roundedAmount = inputAmount - amount * this.cryptoRate;
    // console.log(roundedAmount)
    if (!this.acctNumbVerified) {
      // this.showBankDetailsModal = true;
      this.bankComponent.modalOpen();
    } else {
      this.cryptoComponent.callCryptoApi(cryptoType, roundedAmount);
    }
  }

  /* Helper functions for new user */
  getCountryCode(query: string): void {
    const locationCode = this.countryLocation.find(
      (data) => data.name === query
    );
    // console.log('location', locationCode)
    this.countryCode = locationCode.dial_code;
    this.userCountry = locationCode.name;
  }

  ngOnDestroy(): void {
    if (this.cryptoWalletObservable) {
      this.cryptoWalletObservable.unsubscribe();
    }
    if (this.xRateObservable) {
      this.xRateObservable.unsubscribe();
    }
    if (this.userSubscriptionObservable) {
      this.userSubscriptionObservable.unsubscribe();
    }
  }
}
