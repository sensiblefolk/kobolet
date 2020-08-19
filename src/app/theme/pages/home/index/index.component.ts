import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../_services/auth.service';
import { ChartService } from '../../../../_services/chart.service';
import * as moment from 'moment';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

// declare const window: any;

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class IndexComponent implements OnInit, AfterViewInit, OnDestroy {
  countDoc: any;
  exchangeRate: any;
  userCurrency = 'NGN';
  unpaidTotal = 0;
  totalLoanAmountPaid = 0;
  totalLoanBorrowed = 0;
  loading = true;
  transactionLength = 0;
  todayDate = moment().valueOf();
  walletCollection: Array<any> = [];
  rates: number;
  walletSum: number;
  assetArray: Array<any> = [
    {
      name: 'bitcoin',
      symbol: 'tBTCUSD',
    },
    {
      name: 'ethereum',
      symbol: 'tETHUSD',
    },
  ];

  /* Beginning angular material table logic */
  displayedColumns: string[] = ['amount', 'time', 'type'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  /* End of angular material table logic */

  // Observable params
  counterObservable: Subscription;
  transObservable: Subscription;
  xrateObservable: Subscription;
  btcunpaidObservable: Subscription;
  ethunpaidObservable: Subscription;
  userObservable: Subscription;

  constructor(
    private chartService: ChartService,
    private authService: AuthService,
    private afs: AngularFirestore
  ) {}
  ngOnInit(): void {
    this.userObservable = this.authService
      .currentUserDisplayName()
      .subscribe((userData) => {
        if (userData && userData.currency) {
          this.userCurrency = userData.currency;
        } else {
          this.userCurrency = 'NGN';
        }
      });
    this.getExchangeRates();
    this.getLoanDetails();
    this.getCountRef();
    this.authService.setTitle('Dashboard');
  }

  ngAfterViewInit(): void {
    this.chartService.getChartJs();
  }

  getExchangeRates(): void {
    this.xrateObservable = this.afs
      .doc('rates/usd')
      .valueChanges()
      .subscribe((data) => {
        this.exchangeRate = data;
        this.rates = this.exchangeRate[this.userCurrency];
        this.getWallet();
      });
  }

  getWallet(): void {
    let count = 0;
    this.walletSum = 0;
    const walletArray = [];

    for (const data of this.assetArray) {
      const rate = this.exchangeRate[data.symbol];
      count++;
      const walletRef = this.afs.doc(
        `wallet/${this.authService.currentUserId}/${data.name}/holding`
      );
      walletRef.valueChanges().subscribe((walletData: any) => {
        if (walletData && walletData.balance > 0) {
          walletArray.push({
            type: data.name,
            balance: walletData.balance || 0,
            heldBalance: walletData.heldBalance,
            marketRate: walletData.balance * rate,
          });
          this.walletSum = this.walletSum + walletData.balance * rate;
        } else {
          walletArray.push({
            type: data.name,
            balance: 0,
            heldBalance: 0,
            marketRate: 0,
          });
        }

        this.walletCollection = walletArray;
        if (count === this.assetArray.length) {
          if (walletArray.length === count) {
            // console.log('wallet data', walletArray);
            // console.log('sum', this.walletSum);
            this.chartService.getUnpaidChartist(
              walletArray[0].marketRate,
              walletArray[1].marketRate
            );
            this.loading = false;
          }
        }
      });
    }
  }

  getLoanDetails(): void {
    let counter = 0;
    // pull btc data
    // tslint:disable-next-line:max-line-length
    const unpaidBtcloanDoc: AngularFirestoreCollection<any> = this.afs.collection(
      `loan/${this.authService.currentUserId}/asset`,
      (ref) => ref.where('paid', '==', false).orderBy('expires_at', 'desc')
    );
    this.btcunpaidObservable = unpaidBtcloanDoc
      .valueChanges()
      .subscribe((value: any) => {
        if (value && value.length > 0) {
          for (const data of value) {
            const currentDateDiff = moment(Date.now()).diff(
              data.created_at,
              'months',
              true
            );
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
            this.unpaidTotal += this.authService.round(roundBalance, 0);
            this.totalLoanAmountPaid += data.paidBack;
            this.totalLoanBorrowed += data.amount;
            counter++;
          }

          if (value.length === counter) {
            /*this.chartService.getUnpaidChartist(this.unpaidBtcSum, this.unpaidEthSum); */
            // console.log(this.unpaidBtcSum, this.unpaidEthSum);
            this.loading = false;
          }
        } else {
          // this.chartService.getUnpaidChartist(this.unpaidBtcSum, this.unpaidEthSum);
          this.loading = false;
        }
      });
  }

  getCountRef(): void {
    const countRef: AngularFirestoreDocument<any> = this.afs.doc(
      `/count/${this.authService.currentUserId}`
    );
    this.counterObservable = countRef.valueChanges().subscribe((countValue) => {
      const rates = this.exchangeRate[this.userCurrency];
      if (countValue && countValue.amount) {
        this.countDoc = {
          amount: countValue.amount * rates,
          loanPaid: countValue.loanPaid * rates,
          currency: this.userCurrency,
        };
      } else {
        this.countDoc = {
          amount: 0,
          loanPaid: 0,
          currency: this.userCurrency,
        };
      }
    });
  }

  fancyFormatter(value: number): string {
    const localAmount = this.authService.digitFancyFormatter(value);
    return localAmount;
  }

  ngOnDestroy(): void {
    if (this.xrateObservable) {
      this.xrateObservable.unsubscribe();
    }
    if (this.counterObservable) {
      this.counterObservable.unsubscribe();
    }
    if (this.transObservable) {
      this.transObservable.unsubscribe();
    }
    if (this.btcunpaidObservable) {
      this.btcunpaidObservable.unsubscribe();
    }
    if (this.ethunpaidObservable) {
      this.ethunpaidObservable.unsubscribe();
    }
    if (this.userObservable) {
      this.userObservable.unsubscribe();
    }
  }
}
