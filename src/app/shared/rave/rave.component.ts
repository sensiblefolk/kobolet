import { Component, Input, OnInit, EventEmitter, Output } from '@angular/core';

interface IRaveOptions {
  PBFPubKey: string;
  txref: string;
  amount: number;
  currency: string;
  country: string;
  customer_email: string;
  customerFirstname: string;
  customerLastname: string;
  customTitle: string;
  customDescription: string;
  customLogo: string;
  meta?: any;
  callback: (response: object) => void;
  onclose: () => void;
}

interface MyWindow extends Window {
  getpaidSetup: (options: IRaveOptions) => void;
}
declare let window: MyWindow;

@Component({
  selector: 'app-rave-pay',
  templateUrl: './rave.component.html',
  styleUrls: ['./rave.component.css'],
})
export class RaveComponent implements OnInit {
  @Input() text: string;
  @Input() style: object;
  @Input() className: string;
  @Output() callback = new EventEmitter<object>();
  @Output() closeModal = new EventEmitter<boolean>();
  @Input() key: string;
  @Input() email: string;
  @Input() amount: number;
  @Input() reference: string;
  @Input() meta: any;
  @Input() currency: string;
  @Input() country: string;
  @Input() customerFirstname: string;
  @Input() customerLastname: string;
  @Input() customTitle: string;
  @Input() customDescription: string;
  @Input() customLogo: string;
  @Input() lock: boolean;

  private raveOptions: IRaveOptions;

  constructor() {}
  ngOnInit(): void {}

  madePayment(): any {
    this.prepRaveOptions();
    window.getpaidSetup(this.raveOptions);
  }

  prepRaveOptions(): void {
    this.raveOptions = {
      PBFPubKey: this.key,
      txref: this.reference,
      amount: this.amount,
      customer_email: this.email,
      onclose: () => this.closeModal.emit(),
      callback: (response: object) => this.callback.emit(response),
      currency: this.currency || 'NGN',
      country: this.country || 'NG',
      customerFirstname: this.customerFirstname || '',
      customerLastname: this.customerLastname || '',
      customTitle: this.customTitle || '',
      customDescription: this.customDescription || '',
      customLogo: this.customLogo || '',
      meta: this.meta || {},
    };
  }
}
