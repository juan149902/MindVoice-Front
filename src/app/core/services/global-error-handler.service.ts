import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  handleError(error: unknown): void {
    const timestamp = new Date().toISOString();

    if (error instanceof Error) {
      console.error('[GlobalErrorHandler]', { message: error.message, stack: error.stack, timestamp });
    } else if (typeof error === 'object' && error !== null) {
      console.error('[GlobalErrorHandler]', { ...error as object, timestamp });
    } else {
      console.error('[GlobalErrorHandler]', { message: String(error), timestamp });
    }
  }
}

