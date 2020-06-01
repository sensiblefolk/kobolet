import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../_services/auth.service';
import { ApiService } from '../../../../../_services/api.service';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { ScriptLoaderService } from '../../../../../_services/script-loader.service';
import * as moment from 'moment';

import { MatPaginator, MatSort, MatTableDataSource } from '@angular/material';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-asset',
  templateUrl: './asset.component.html',
  styleUrls: ['./asset.component.scss'],
})
export class AssetComponent implements OnInit, AfterViewInit, OnDestroy {
  unpaidloanData: Observable<any[]>;
  paidloanData: Observable<any[]>;
  unpaidLoan: Array<any> = [];
  fiatTransaction: Array<any> = [];
  transactions: Array<any> = [];
  loading = true;
  userDetails: any = {};
  txRef = `kobolet-${Date.now()}`;
  metaData: any;
  metaObject: any = {};
  payBackAmount: string;
  userCountry: string;
  amountWithoutFee: number;
  paymentStatus = false;
  loanDataObject: any = {};
  walletObject: any = {};
  walletRef: any;
  countObject: any = {};
  countRef: any;
  exchangeRate: any = {};
  rates: number;
  cryptoSelect = 'bitcoin';
  cryptoPrice: any;
  cryptoType = 'tBTCUSD';
  loanCurrency: string;
  paymentEnv: any = this.authService.getRavePayEnv;
  id: string = this.paymentEnv.id;
  raveButtonStatus = true;
  transactionObject: any = {};

  /* Beginning angular material table logic */
  displayedColumns: string[] = ['amount', 'time', 'type'];
  dataSource: MatTableDataSource<any>;
  newDepositModalReference: NgbModalRef;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('newDeposit') private newDepositContent: ElementRef;
  @ViewChild('content') private content: ElementRef;

  /* End of angular material table logic */

  /* Observable parameters */
  paidObservable: Subscription;
  unpaidObservable: Subscription;
  xrateObservable: Subscription;
  walletObservable: Subscription;
  counterObservable: Subscription;
  fiatObservable: Subscription;
  userObservable: Subscription;

  constructor(
    private _script: ScriptLoaderService,
    private router: Router,
    private authService: AuthService,
    private apiService: ApiService,
    private modalService: NgbModal,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    this.getExchangeRates();
    this.getWallet();
    this.getLoans();
    this.getCountRef();
    this.getUserDetails();
    this.getTransaction();
  }

  ngAfterViewInit() {
    this._script.loadScripts('app-asset', [
      'assets/demo/demo6/default/component/portlets/tools.js',
      this.paymentEnv.url,
    ]);
    // this.createLoan();
  }

  createLoan() {
    const loanRef = this.afs.doc(
      `loan/${this.authService.currentUserId}/asset/kobolet${Date.now()}`
    );
    loanRef
      .set({
        amount: 45,
        interestAmount: 53,
        paidBack: 0,
        price: 9990,
        liquidationPrice: 4952,
        liquidationDateTracker: Date.now(),
        heldCrypto: 0.0042,
        monthlyInterest: 45 * 0.03,
        currency: 'NGN',
        duration: 7,
        totalDuration: 7,
        created_at: Date.now(),
        expires_at: moment().add(180, 'days').valueOf(),
        paid: false,
        type: 'bitcoin',
      })
      .then(() => console.log('loan added'))
      .catch((err) => console.log(err));
  }

  getTransaction() {
    // tslint:disable-next-line:max-line-length
    const fiatRef = this.afs.collection(
      `transactions/${this.authService.currentUserId}/fiat`
    );
    this.fiatObservable = fiatRef.valueChanges().subscribe((fiatData) => {
      if (fiatData && fiatData.length > 0) {
        // console.log('refData', fiatData);
        const sortArray = [...fiatData];
        sortArray.sort(this.authService.sortValues('timestamp', 'desc'));
        this.fiatTransaction = sortArray;
      }
    });
  }

  sortTransaction(loanId, index) {
    const transFilter = this.fiatTransaction.filter(
      (data) => loanId === data.loanId
    );
    const sortArray = transFilter.sort(
      this.authService.sortValues('timestamp', 'desc')
    );
    this.transactionObject[loanId] = sortArray;
    this.unpaidLoan[index].transactionLength = sortArray.length;
    this.dataSource = new MatTableDataSource(this.transactionObject[loanId]);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    // console.log('filter', this.transactionObject);
  }

  // Toggle active anchor button transaction display status
  toggleAnchorButton(loanObject: any, status: boolean, index: number) {
    if (status) {
      for (let i = 0; i < this.unpaidLoan.length; i++) {
        if (i === index) {
          this.unpaidLoan[i].anchorButtonStatus = true;
        } else {
          this.unpaidLoan[i].anchorButtonStatus = false;
        }
      }
      this.sortTransaction(loanObject.id, index);
    } else {
      this.unpaidLoan[index].anchorButtonStatus = false;
    }
  }

  getExchangeRates() {
    this.xrateObservable = this.afs
      .doc('rates/usd')
      .valueChanges()
      .subscribe((data) => {
        this.exchangeRate = data;
        // this.cryptoPrice = data['tBTCUSD'];
      });
  }

  getWallet() {
    this.walletRef = this.afs.doc(
      `wallet/${this.authService.currentUserId}/${this.cryptoSelect}/holding`
    );
    this.walletObservable = this.walletRef
      .valueChanges()
      .subscribe((walletValue) => {
        this.walletObject = walletValue;
      });
  }

  getCountRef() {
    this.countRef = this.afs.doc(`count/${this.authService.currentUserId}`);
    this.counterObservable = this.countRef
      .valueChanges()
      .subscribe((countValue) => {
        this.countObject = countValue;
      });
  }

  // get crypto price based on crypto symbol
  cryptoPriceToggle(symbol: string): number {
    switch (symbol) {
      case 'bitcoin':
        this.cryptoPrice = this.exchangeRate['tBTCUSD'];
        break;
      case 'ethereum':
        this.cryptoPrice = this.exchangeRate['tETHUSD'];
        break;
      default:
        this.cryptoPrice = this.exchangeRate['tBTCUSD'];
    }
    return this.cryptoPrice;
  }

  getLoans() {
    this.loading = true;
    // tslint:disable-next-line:max-line-length
    const unpaidloanDoc = this.afs.collection(
      `loan/${this.authService.currentUserId}/asset`,
      (ref) => ref.where('paid', '==', false).limit(8)
    );
    this.unpaidloanData = unpaidloanDoc.snapshotChanges().pipe(
      map((actions) => {
        return actions.map((a: any) => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          const cryptoPrice = this.cryptoPriceToggle(data.type);
          const percent =
            ((cryptoPrice - data.liquidationPrice) / cryptoPrice) * 100;
          const limit = Math.abs(Math.floor(100 - percent));
          const color = limit > 50 ? 'warn' : 'primary';
          const currency = data.currency;
          const currentPrice = Math.floor(cryptoPrice);
          this.rates = this.exchangeRate[currency];
          const roundedPrice = cryptoPrice * data.heldCrypto * this.rates;
          const marketPrice = Math.floor(roundedPrice);
          const anchorButtonStatus = false;
          const transactionLength = 0;

          const currentDateDiff = moment(Date.now()).diff(
            data.created_at,
            'months',
            true
          );
          // tslint:disable-next-line:max-line-length
          const loanAmountAndInterest =
            currentDateDiff <= data.duration
              ? data.amount + data.monthlyInterest * currentDateDiff
              : data.amount + data.monthlyInterest * data.duration;
          const currentLoanAmountAndInterest = this.authService.round(
            loanAmountAndInterest,
            0
          );
          const roundBalance =
            (currentLoanAmountAndInterest - data.paidBack) * this.rates;
          const balance = this.authService.round(roundBalance, 0);
          return {
            id,
            currency,
            limit,
            currentLoanAmountAndInterest,
            balance,
            color,
            anchorButtonStatus,
            transactionLength,
            marketPrice,
            ...data,
          };
        });
      })
    );

    this.unpaidObservable = this.unpaidloanData.subscribe((unpaidValue) => {
      if (unpaidValue && unpaidValue.length > 0) {
        this.unpaidLoan = this.sortData(unpaidValue, 'expires_at', 'asc');
        this.loading = false;
      } else {
        this.unpaidLoan = unpaidValue;
        this.loading = false;
      }
    });
  }

  sortData(
    arrayData: Array<any>,
    sortBy: string,
    order: string = 'desc'
  ): Array<any> {
    const sortArray = [...arrayData];
    sortArray.sort(this.authService.sortValues(sortBy, order));
    return sortArray;
  }

  getUserDetails() {
    this.userObservable = this.authService
      .currentUserDisplayName()
      .subscribe((userData) => {
        if (!userData) {
          this.userCountry = 'NG';
          return;
        }
        this.userDetails = userData;
        const country = userData.country ? userData.country : 'Nigeria';
        switch (country) {
          case 'Nigeria':
            this.userCountry = 'NG';
            break;
          case 'Ghana':
            this.userCountry = 'GH';
            break;
          case 'Kenya':
            this.userCountry = 'KE';
            break;
          default:
            this.userCountry = 'GH';
            break;
        }
      });
  }

  convertDate(date: any) {
    return moment().to(date);
  }

  metaDetail(value: any) {
    const amount = parseFloat(value);
    const loan = this.loanDataObject;
    this.amountWithoutFee = amount;
    if (loan.currency === 'NGN') {
      const fee = Math.round(amount * 1);
      this.payBackAmount = fee.toString();
    } else {
      const fee = Math.round(amount * 3.5);
      this.payBackAmount = fee.toString();
    }
    this.metaData = {
      userId: this.authService.currentUserId,
      currency: loan.currency,
      type: 'loan',
    };
  }

  maxAmount(value: any) {
    const amount = parseFloat(value);
    const loan = this.loanDataObject;
    if (amount <= loan.balance) {
      this.raveButtonStatus = false;
    } else {
      this.raveButtonStatus = true;
    }
  }

  // new payment modal toggle
  newDepositModal(loan: any) {
    this.loanDataObject = loan;
    this.newDepositModalReference = this.modalService.open(
      this.newDepositContent,
      { centered: true, size: 'sm' }
    );
  }

  confirmPayment(response: any): void {
    const loanId = this.loanDataObject.id;
    this.newDepositModalReference.close();
    const txAmount = response.tx.amount;
    /*
     * Update loan transaction details */
    if (
      (response.tx.chargeResponseCode === '00' ||
        response.tx.chargeResponseCode === '0') &&
      response.tx.status === 'successful'
    ) {
      //  console.log(response);
      this.authService.showNotification(
        'top',
        'right',
        'payment successful',
        'success'
      );
      this.paymentStatus = true;
      const message = `${response.tx.currency}${this.amountWithoutFee} deposited successfully`;
      this.authService.newNotification(message);
      const usdAmount = this.amountWithoutFee / this.rates;

      // tslint:disable-next-line:max-line-length
      const fiatDoc: AngularFirestoreCollection<any> = this.afs.collection(
        `transactions/${this.authService.currentUserId}/fiat`
      );
      fiatDoc
        .add({
          amount: this.amountWithoutFee,
          ref: response.tx.txRef,
          type: 'deposit',
          cryptoCurrency: 'bitcoin',
          crypto: true,
          loanId: loanId,
          currency: response.tx.currency,
          provider: 'rave',
          timestamp: Date.now(),
          response,
        })
        .then(() => {
          const countValue = this.countObject;
          const paidAmount = this.amountWithoutFee / this.rates;
          const totalAmount = paidAmount + countValue.loanPaid;
          this.countRef.update({
            loanPaid: totalAmount,
            paidCount: countValue.paidCount + 1,
            loanCount:
              countValue.loanCount > 0
                ? countValue.loanCount - 1
                : countValue.loanCount,
          });
        });

      /* end update loan transaction details */

      /*
       * Update loan payment and wallet balance status and values */
      const loanDoc: AngularFirestoreDocument<any> = this.afs.doc(
        `loan/${this.authService.currentUserId}/asset/${loanId}`
      );

      // tslint:disable-next-line:max-line-length
      if (
        this.loanDataObject &&
        this.loanDataObject.paidBack >= 0 &&
        this.loanDataObject.paidBack <
          this.loanDataObject.currentLoanAmountAndInterest
      ) {
        const paidBalance = this.loanDataObject.paidBack;
        const newBalance =
          paidBalance +
          this.authService.round(this.amountWithoutFee / this.rates, 0);

        const paidStatus =
          newBalance >= this.loanDataObject.currentLoanAmountAndInterest
            ? true
            : false;
        const completed_at =
          newBalance >= this.loanDataObject.currentLoanAmountAndInterest
            ? Date.now()
            : '';
        loanDoc.update({
          paidBack: this.authService.round(newBalance, 3),
          paid: paidStatus,
          completed_at: completed_at,
        });
        return;
      }
      /* end payment status and values */
    } else {
      return;
    }
  }

  cancelledPayment(): void {
    if (!this.paymentStatus) {
      this.newDepositModalReference.close();
      this.authService.showNotification(
        'bottom',
        'right',
        'Payment failed',
        'danger'
      );
    }
  }

  ngOnDestroy() {
    if (this.paidObservable) {
      this.paidObservable.unsubscribe();
    }
    if (this.unpaidObservable) {
      this.unpaidObservable.unsubscribe();
    }
    if (this.xrateObservable) {
      this.xrateObservable.unsubscribe();
    }
    if (this.walletObservable) {
      this.walletObservable.unsubscribe();
    }
    if (this.counterObservable) {
      this.counterObservable.unsubscribe();
    }
    if (this.userObservable) {
      this.userObservable.unsubscribe();
    }
    if (this.fiatObservable) {
      this.fiatObservable.unsubscribe();
    }
  }
}
