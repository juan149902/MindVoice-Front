import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { mindmapAccessGuard } from './core/guards/mindmap-access.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'landing',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.LandingComponent),
  },
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth').then((m) => m.AuthComponent),
  },
  // Shared mind-map route — NO layout wrapper (clean canvas-only view for guests)
  {
    path: 'mind-maps/shared',
    loadComponent: () => import('./pages/mind-maps/mind-maps').then((m) => m.MindMapsComponent),
    canActivate: [mindmapAccessGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
        canActivate: [authGuard],
      },
      {
        path: 'ai-analysis',
        loadComponent: () => import('./pages/ai-analysis/ai-analysis').then((m) => m.AiAnalysisComponent),
        canActivate: [authGuard],
      },
      {
        path: 'recordings',
        loadComponent: () => import('./pages/recordings/recordings').then((m) => m.RecordingsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'library',
        pathMatch: 'full',
        redirectTo: 'recordings',
      },
      {
        path: 'summaries',
        redirectTo: 'recordings',
        pathMatch: 'full',
      },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/tasks/tasks').then((m) => m.TasksComponent),
        canActivate: [authGuard],
      },
      {
        path: 'mind-maps',
        loadComponent: () => import('./pages/mind-maps/mind-maps').then((m) => m.MindMapsComponent),
        canActivate: [mindmapAccessGuard],
      },
      {
        path: 'tags',
        loadComponent: () => import('./pages/tags/tags').then((m) => m.TagsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfileComponent),
        canActivate: [authGuard],
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
        canActivate: [authGuard],
      },
      {
        path: 'api-test',
        loadComponent: () => import('./pages/api-test/api-test').then((m) => m.ApiTestComponent),
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
