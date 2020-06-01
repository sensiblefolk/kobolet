import { Injectable, ErrorHandler } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor() {}

  handleError(_error: any): void {}
}
