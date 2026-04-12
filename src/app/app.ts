import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {RouterOutlet} from '@angular/router';
import { AppPreferencesService } from './core/services/app-preferences.service';

@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly preferences = inject(AppPreferencesService);

  constructor() {
    this.preferences.hydrate();
  }
}
