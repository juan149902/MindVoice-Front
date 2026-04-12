import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WorkflowEventsService {
  private readonly changedSubject = new Subject<void>();

  readonly changed$ = this.changedSubject.asObservable();

  notifyChanged(): void {
    this.changedSubject.next();
  }
}

