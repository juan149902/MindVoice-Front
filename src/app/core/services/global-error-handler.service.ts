import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  handleError(error: unknown): void {
    const normalized = error instanceof Error ? error : new Error(String(error));

    console.error('[GlobalErrorHandler]', {
      message: normalized.message,
      stack: normalized.stack,
      timestamp: new Date().toISOString(),
    });
  }
}

