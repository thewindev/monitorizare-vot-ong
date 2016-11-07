import { publishLast } from 'rxjs/operator/publishLast';
import { TokenizeResult } from '@angular/compiler/src/ml_parser/lexer';
import { getHeapStatistics } from 'v8';
import { AuthHttp, JwtHelper } from 'angular2-jwt';
import { TokenService } from '../token/token.service';
import { RequestOptionsArgs } from '@angular/http/src/interfaces';
import { Observable, Observer } from 'rxjs/Rx';
import {
  ConnectionBackend,
  Headers,
  Http,
  Request,
  RequestMethod,
  RequestOptions,
  Response,
  ResponseOptions
} from '@angular/http';
import { Injectable } from '@angular/core';

@Injectable()
export class AuthHttpService extends Http {

  private delegation: Observable<any>;

  private token: string;

  constructor(_backend: ConnectionBackend, _defaultOptions: RequestOptions) {
    super(_backend, _defaultOptions);
  }


  request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    let jwtValid = false;

    //if there's a delegation pending, we need to wait for it

    if (this.delegation) {
      return this.delegation.flatMap(() => {
        return this.doRequest(url, options);
      })
    }
    // if the jwt isn't valid, we start the delegation and call request again
    if (!jwtValid) {
      this.setDelegationObservable();
      return this.request(url, options);
    }

    return this.doRequest(url, options);
  }

  private doRequest(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    this.setTokenHeader(options);
    return super.request(url, options).catch((err) => this.onRequestError(err, url, options));
  }

  private onRequestError(err: Response, url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    if (err.status !== 401) {
      return Observable.throw(err);
    }

    let tokenInvalid = false,
      tokenExpired = true;

    if (tokenInvalid) {
      // TODO LOG OUT OF APPLICATION
    }
    if (tokenExpired) {
      this.setDelegationObservable();
      return this.request(url, options);
    }
    return this.request(url, options);
  }

  private setTokenHeader(options: RequestOptionsArgs) {
    options = options || new RequestOptions({
      headers: new Headers()
    });
    options.headers = options.headers || new Headers();
    options.headers.append('Authorization', 'Bearer: ' + this.token);
    return options;
  }
  private setDelegationObservable() {
    if (this.delegation) {
      return;
    }
    // the delegation that will refresh the token
    this.delegation = Observable.create((obs: Observer<any>) => {
      // simulate a real request
      super.request('https://api.github.com/repos/vmg/redcarpet/issues?state=closed',{
        method: RequestMethod.Get
      })
        .subscribe(resp => {
          obs.next(resp);
          obs.complete();
        });
    }).cache();

    this.delegation.subscribe((token) => {
      this.delegation = undefined;
      this.token = token;
    }, err => {
      // TODO : WHEN DELEGATION FAILS, LOGOUT
    });
  }
}