import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  ElementRef,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { AuthService } from '../../../../../_services/auth.service';
import { ApiService } from '../../../../../_services/api.service';
import { Subscription } from 'rxjs';

import { ScriptLoaderService } from '../../../../../_services/script-loader.service';
import { NgForm } from '@angular/forms';

import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-crypto',
  templateUrl: './crypto.component.html',
  styleUrls: ['./crypto.component.css'],
})
export class CryptoComponent implements OnInit, AfterViewInit, OnDestroy {
  loading = true;
  walletBalance: number;
  walletAddress: string;
  walletAmount: number;
  walletDoc: any = {};
  walletRef: AngularFirestoreDocument<any>;
  btcWalletBalance: number;
  btcHeldBalance: number;
  btcWalletDoc: any = {};
  btcWalletRef: AngularFirestoreDocument<any>;
  bitcoinPendingTransaction: Array<any> = [];
  bitcoinPendingTransactionLength = 0;
  bitcoinTransactionLength = 0;
  ethWalletBalance: number;
  ethHeldBalance: number;
  ethWalletDoc: any = {};
  ethWalletRef: AngularFirestoreDocument<any>;
  ethereumPendingTransaction: Array<any> = [];
  ethereumPendingTransactionLength = 0;
  ethTransactionLength = 0;
  cryptoSymbol = 'bitcoin';
  FEE = 0.0005;
  maxWithdraw = 0;
  maximum = true;
  validateButtonSpinner = false;
  uid: string = localStorage.getItem('ff');
  formValue: any;
  anchorToggleObject: any = {
    bitcoin: false,
    ethereum: false,
  };
  cryptoType: Array<any> = [
    {
      name: 'bitcoin',
      symbol: 'BTC',
      bfxSymbol: 'tBTCUSD',
      fee: 0.002,
      addressLength: 32,
    },
    {
      name: 'ethereum',
      symbol: 'ETH',
      bfxSymbol: 'tETHUSD',
      fee: 0.0025,
      addressLength: 40,
    },
  ];
  crypto: any;
  inputSummary = {
    confirm: false,
    back: false,
    show: false,
  };

  modalReference: NgbModalRef;

  /* Beginning angular material table logic */
  displayedColumns: string[] = ['amount', 'time', 'type'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('newWithdraw') private newWithdrawContent: ElementRef;
  /* End of angular material table logic */

  /* Observable params */
  btcWalletObservable: Subscription;
  ethWalletObservable: Subscription;
  transactionObservable: Subscription;
  pendingTransactionObservable: Subscription;

  constructor(
    private script: ScriptLoaderService,
    private authService: AuthService,
    private apiService: ApiService,
    private modalService: NgbModal,
    private afs: AngularFirestore
  ) {}

  ngOnInit(): void {
    // this.getTransactions();
    // this.getPendingTransactions();
    this.getWallet();
  }

  ngAfterViewInit(): void {
    this.script.loadScripts('app-crypto', [
      'assets/demo/demo6/default/component/portlets/tools.js',
    ]);
  }

  getWallet(): void {
    /* Begin bitcoin wallet */
    this.btcWalletRef = this.afs.doc(
      `wallet/${this.authService.currentUserId}/bitcoin/holding`
    );
    this.btcWalletObservable = this.btcWalletRef
      .valueChanges()
      .subscribe((walletValue) => {
        this.btcWalletDoc = walletValue;
        if (walletValue && walletValue.balance > 0) {
          this.btcWalletBalance = walletValue.balance;
          this.btcHeldBalance = walletValue.heldBalance;
          this.loading = false;
        } else {
          this.btcWalletBalance = 0;
          this.btcHeldBalance = 0;
          this.maxWithdraw = 0;
          this.loading = false;
        }
      });
    /* End bitcoin wallet */
    /* Begin ethereum wallet */
    this.ethWalletRef = this.afs.doc(
      `wallet/${this.authService.currentUserId}/ethereum/holding`
    );
    this.ethWalletObservable = this.ethWalletRef
      .valueChanges()
      .subscribe((walletValue) => {
        this.ethWalletDoc = walletValue;
        if (walletValue && walletValue.balance > 0) {
          this.ethWalletBalance = walletValue.balance;
          this.ethHeldBalance = walletValue.heldBalance;
        } else {
          this.ethWalletBalance = 0;
          this.ethHeldBalance = 0;
          this.maxWithdraw = 0;
        }
      });
    /* End ethereum wallet */
  }

  getTransactions(crypto: string): void {
    // tslint:disable-next-line:max-line-length
    const transRef = this.afs.collection(
      `transactions/${this.authService.currentUserId}/${crypto}`
    );
    this.transactionObservable = transRef.valueChanges().subscribe((value) => {
      if (value && value.length > 0) {
        const sortArray = this.sortData(value, 'timestamp', 'desc');
        this[`${crypto}TransactionLength`] = sortArray.length;
        this.dataSource = new MatTableDataSource(sortArray);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        // this.loading = false;
      } else {
        // this.loading = false;
        this[`${crypto}TransactionLength`] = 0;
      }
    });
  }

  getPendingTransactions(crypto: string): void {
    // tslint:disable-next-line:max-line-length
    const transRef = this.afs.collection(
      `transactions/${this.authService.currentUserId}/deposit`,
      (ref) =>
        ref
          .where('type', '==', crypto)
          .where('confirmDeposit', '==', false)
          .limit(4)
    );
    this.pendingTransactionObservable = transRef
      .valueChanges()
      .subscribe((value) => {
        if (value && value.length > 0) {
          const sortArray = this.sortData(value, 'timestamp', 'desc');
          this[`${crypto}PendingTransactionLength`] = sortArray.length;
          this[`${crypto}PendingTransaction`] = sortArray;
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

  toggleAnchorButton(type: string, status: boolean): void {
    if (type === 'bitcoin' && status) {
      this.anchorToggleObject[type] = status;
      this.anchorToggleObject.ethereum = !status;
      this.getTransactions('bitcoin');
      this.getPendingTransactions('bitcoin');
    } else if (type === 'ethereum' && status) {
      this.anchorToggleObject[type] = status;
      this.anchorToggleObject.bitcoin = !status;
      this.getTransactions('ethereum');
      this.getPendingTransactions('ethereum');
    } else {
      this.anchorToggleObject[type] = status;
    }
  }

  // opens withdral modal once first withdraw button is clicked
  onWithdrawModal(type: string): void {
    if (type === 'bitcoin') {
      this.crypto = this.cryptoType.find((data) => data.name === type);
      this.walletBalance = this.btcWalletBalance;
      this.walletRef = this.btcWalletRef;
      this.walletDoc = this.btcWalletDoc;
      const maxWithdraw =
        this.walletBalance > 0
          ? this.walletBalance - this.crypto.fee
          : this.walletBalance;
      this.maxWithdraw = this.authService.round(maxWithdraw, 5);
    } else if (type === 'ethereum') {
      this.crypto = this.cryptoType.find((data) => data.name === type);
      this.walletBalance = this.ethWalletBalance;
      this.walletRef = this.ethWalletRef;
      this.walletDoc = this.ethWalletDoc;
      const maxWithdraw =
        this.walletBalance > 0
          ? this.walletBalance - this.crypto.fee
          : this.walletBalance;
      this.maxWithdraw = this.authService.round(maxWithdraw, 5);
    }

    this.modalReference = this.modalService.open(this.newWithdrawContent, {
      centered: true,
    });
  }

  // changes withdraw summary state button
  withdrawSummary(confirm: boolean, back: boolean): void {
    this.inputSummary.confirm = confirm;
    this.inputSummary.back = back;
    this.inputSummary.show = false;
    if (back) {
      this.inputSummary.confirm = false;
      this.validateButtonSpinner = false;
    } else if (confirm) {
      this.processWithdrawal(this.formValue);
    }
  }

  maxCheck(amount: number): void {
    const payable = this.maxWithdraw;
    if (payable === 0) {
      this.maximum = false;
      return;
    }
    // console.log(payable)
    if (amount <= payable && amount > 0.001) {
      this.maximum = true;
    } else {
      this.maximum = false;
    }
  }

  onSubmit(form: NgForm): void {
    this.validateButtonSpinner = true;
    this.inputSummary.show = true;
    const formValue = form.value;
    this.formValue = form.value;

    if (this.inputSummary.confirm) {
      this.processWithdrawal(formValue);
    }
  }

  processWithdrawal(formValue: any): void {
    const amount = formValue.amount;

    if (
      this.walletAddress !== formValue.adderess &&
      this.walletAmount !== amount
    ) {
      this.inputSummary.confirm = false;
      return;
    }
    const query = {
      amount,
      currency: this.crypto.name,
      address: formValue.address,
    };
    this.apiService.postWithdrawal$(query).subscribe(
      (result) => {
        // console.log(result);
        this.authService.showNotification(
          'top',
          'center',
          'Withdrawal processed successfully',
          'success'
        );
        this.modalReference.close();
        this.inputSummary.show = false;
        const message = `${amount + this.crypto.fee}${
          this.crypto.symbol
        } withdrawn successfully`;
        this.authService.newNotification(message);
        this.validateButtonSpinner = false;
        if (this.walletDoc && this.walletDoc.balance >= 0) {
          const newBalance =
            this.walletDoc.balance - (amount + this.crypto.fee);
          this.walletRef.update({ balance: newBalance }).then(() => {
            const transRef: AngularFirestoreCollection<any> = this.afs.collection(
              `transactions/${this.authService.currentUserId}/${this.crypto.name}`
            );
            transRef.add({
              amount: amount + this.crypto.fee,
              address: formValue.address,
              type: 'withdrawal',
              crypto: true,
              time: Date.now(),
            });
          });
        }
      },
      (error) => {
        this.authService.showNotification(
          'top',
          'center',
          'Withdrawal failed, please try again',
          'danger'
        );
      }
    );
  }

  ngOnDestroy(): void {
    if (this.btcWalletObservable) {
      this.btcWalletObservable.unsubscribe();
    }
    if (this.ethWalletObservable) {
      this.ethWalletObservable.unsubscribe();
    }
    if (this.transactionObservable) {
      this.transactionObservable.unsubscribe();
    }
    if (this.pendingTransactionObservable) {
      this.pendingTransactionObservable.unsubscribe();
    }
  }
}
