import { throwError as observableThrowError, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
// import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  error: any;
  base_url: any = 'https://live.moneywaveapi.co/v1';
  activeEnv: any = this.authService.getRavePayEnv;
  id: string = this.activeEnv.id;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getCryptoCurrencyTicker(ticker: string): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Access-Control-Allow-Origin': 'http://localhost:4200',
      }),
    };
    return this.http.get(`https://api.coinbase.com/v2/prices/${ticker}/spot`);
  }

  qrCodeGenerator(
    amount: number,
    address: string,
    type: string
  ): Observable<any> {
    return this.http.get(
      `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${type}:${address}?amount=${amount}`
    );
  }

  // POST withdrawal data to gateway provider
  postBankList$(country): Observable<any> {
    const query = `?country=${country}`;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };

    return this.http.post(`${this.base_url}/banks/${query}`, {}, httpOptions);
  }

  // POST withdrawal data to gateway provider
  postWithdrawal$(balance): Observable<any> {
    return this.http.post(
      `${this.activeEnv.functionsUrl}/api/withdrawal`,
      balance,
      {
        params: new HttpParams().set('id', this.authService.currentUserId),
      }
    );
  }

  postFiatTransfer(postData): Observable<any> {
    return this.http.post(
      `${this.activeEnv.functionsUrl}/api/fiat/transfer`,
      postData,
      {
        params: new HttpParams().set('id', this.authService.currentUserId),
      }
    );
  }

  // POST withdrawal data to gateway provider
  postLocalFiatTransfer$(balance): Observable<any> {
    return this.http.post(
      `${this.activeEnv.functionsUrl}/api/withdrawal/fiat`,
      balance,
      {
        params: new HttpParams().set('id', this.authService.currentUserId),
      }
    );
  }

  postWalletFunding(postData): Observable<any> {
    return this.http.post(
      `${this.activeEnv.functionsUrl}/api/crypto/payment/new`,
      postData,
      {
        params: new HttpParams().set('id', this.authService.currentUserId),
      }
    );
  }

  postBankDetails(): Observable<any> {
    return this.http.post(
      'http://staging1flutterwave.co:8080/pwc/rest/fw/banks/',
      {}
    );
  }

  postBvnCheck(bvn): Observable<any> {
    return this.http.post(`${this.activeEnv.functionsUrl}/api/bvn`, bvn);
  }

  getBVNDetail(bvn): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };
    return this.http.get(
      `${environment.rave.bvnUrl}/${bvn}?seckey=${environment.rave.secret}`,
      httpOptions
    );
  }

  /* Beginning moneywave inner handlers */
  // POST withdrawal data to gateway provider
  getAuthentication(): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };

    const query = {
      apiKey: environment.moneyWave.key,
      secret: environment.moneyWave.secret,
    };

    return this.http.post(
      `${this.base_url}/merchant/verify`,
      query,
      httpOptions
    );
  }

  // verify local bank account numbers NG & GH
  verifyAccountNumber(query, token): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: token,
      }),
    };

    return this.http.post(
      `${this.base_url}/resolve/account`,
      query,
      httpOptions
    );
  }
  /* End moneywave inner handlers */

  private _handleError(err: HttpErrorResponse | any) {
    const errorMsg = err.message || 'Error: Unable to complete request.';
    if (!err.ok) {
      this.error = 'error processing transaction, please try again';
      // console.log(this.error);
    }
    return observableThrowError(errorMsg);
  }
}
