import {Routes} from '@angular/router';
import { LayoutComponent } from './layout/layout';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent) 
      },
      { 
        path: 'library', 
        loadComponent: () => import('./pages/library/library').then(m => m.LibraryComponent) 
      },
      { 
        path: 'tasks', 
        loadComponent: () => import('./pages/tasks/tasks').then(m => m.TasksComponent) 
      },
      { 
        path: 'summaries', 
        loadComponent: () => import('./pages/summaries/summaries').then(m => m.SummariesComponent) 
      },
      {
        path: 'mind-maps',
        loadComponent: () => import('./pages/mind-maps/mind-maps').then(m => m.MindMapsComponent)
      },
      { 
        path: 'settings', 
        loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent) 
      }
    ]
  }
];
