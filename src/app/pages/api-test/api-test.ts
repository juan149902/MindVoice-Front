/**
 * ApiTestComponent - Página de prueba de conexión con el backend
 * MindVoice - Verificación de endpoints
 */
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiHttpService } from '../../core/services/api-http.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AuthService } from '../../core/services/auth.service';
import { TagsService, Tag } from '../../core/services/tags.service';
import { UserService, User } from '../../core/services/user.service';
import { AudioWorkflowService, AudioEntity, TranscriptionEntity, AiAnalysisEntity } from '../../core/services/audio-workflow.service';

interface EndpointTest {
  name: string;
  endpoint: string;
  method: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  message?: string;
  data?: unknown;
}

@Component({
  selector: 'app-api-test',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-900/20 via-slate-900 to-indigo-900/20 p-8">
      <div class="max-w-4xl mx-auto">

        <!-- Header -->
        <header class="mb-8">
          <h1 class="text-3xl font-black text-white mb-2">
            🔌 Prueba de Conexión API
          </h1>
          <p class="text-gray-400">
            Verificación de endpoints del backend Flask
          </p>
        </header>

        <!-- Estado de Autenticación -->
        <section class="rounded-xl border border-white/10 bg-surface-dark p-6 mb-6">
          <h2 class="text-xl font-bold text-white mb-4">Estado de Autenticación</h2>

          @if (!isAuthenticated) {
            <div class="space-y-4">
              <div class="flex items-center gap-3 text-amber-400">
                <mat-icon>warning</mat-icon>
                <span>No hay sesión activa. Inicia sesión para probar todos los endpoints.</span>
              </div>

              <form (submit)="$event.preventDefault()" class="flex flex-wrap gap-3">
                <div class="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    [(ngModel)]="loginUsername"
                    name="username"
                    placeholder="Usuario"
                    class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-white"
                  />
                </div>
                <div class="flex-1 min-w-[200px]">
                  <input
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="loginPassword"
                    name="password"
                    placeholder="Contraseña"
                    class="w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-white"
                  />
                </div>
                <button
                  type="submit"
                  (click)="doLogin()"
                  [disabled]="loginLoading"
                  class="h-10 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {{ loginLoading ? 'Entrando...' : 'Iniciar Sesión' }}
                </button>
              </form>
            </div>
          } @else {
            <div class="flex items-center gap-3 text-emerald-400">
              <mat-icon>check_circle</mat-icon>
              <span>Autenticado como: <strong class="text-white">{{ currentUsername }}</strong></span>
              <button
                (click)="doLogout()"
                class="ml-auto h-8 px-3 rounded-lg border border-rose-500/40 text-rose-300 text-sm hover:bg-rose-500/10 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          }
        </section>

        <!-- Resultados de Tests -->
        <section class="rounded-xl border border-white/10 bg-surface-dark p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Resultados de Tests</h2>
            <button
              (click)="runAllTests()"
              [disabled]="runningTests || !isAuthenticated"
              class="h-10 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <mat-icon [class.animate-spin]="runningTests">refresh</mat-icon>
              {{ runningTests ? 'Ejecutando...' : 'Ejecutar Todos' }}
            </button>
          </div>

          @if (!isAuthenticated) {
            <p class="text-gray-500 text-sm">Inicia sesión para ejecutar los tests de endpoints protegidos.</p>
          } @else {
            <div class="space-y-3">
              @for (test of tests; track test.name) {
                <div
                  class="rounded-lg border p-4 flex items-center gap-4"
                  [ngClass]="{
                    'border-gray-700 bg-gray-800/50': test.status === 'pending',
                    'border-blue-500/50 bg-blue-500/10': test.status === 'loading',
                    'border-emerald-500/50 bg-emerald-500/10': test.status === 'success',
                    'border-rose-500/50 bg-rose-500/10': test.status === 'error'
                  }"
                >
                  <!-- Status Icon -->
                  <div class="flex-shrink-0">
                    @if (test.status === 'pending') {
                      <mat-icon class="text-gray-500">circle</mat-icon>
                    } @else if (test.status === 'loading') {
                      <mat-spinner [diameter]="20" class="text-blue-400"></mat-spinner>
                    } @else if (test.status === 'success') {
                      <mat-icon class="text-emerald-400">check_circle</mat-icon>
                    } @else if (test.status === 'error') {
                      <mat-icon class="text-rose-400">error</mat-icon>
                    }
                  </div>

                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-white">{{ test.name }}</span>
                      <span
                        class="text-xs px-2 py-0.5 rounded font-mono"
                        [ngClass]="{
                          'bg-gray-700 text-gray-300': test.method === 'GET',
                          'bg-blue-700 text-blue-200': test.method === 'POST',
                          'bg-yellow-700 text-yellow-200': test.method === 'PUT',
                          'bg-rose-700 text-rose-200': test.method === 'DELETE'
                        }"
                      >
                        {{ test.method }}
                      </span>
                    </div>
                    <code class="text-xs text-gray-400">{{ test.endpoint }}</code>
                    @if (test.message) {
                      <p class="text-sm mt-1" [ngClass]="{
                        'text-emerald-300': test.status === 'success',
                        'text-rose-300': test.status === 'error'
                      }">{{ test.message }}</p>
                    }
                  </div>

                  <!-- Response Time -->
                  @if (test.status === 'success' && test.data) {
                    <span class="text-xs text-gray-500 font-mono">
                      {{ getDataCount(test.data) }} items
                    </span>
                  }
                </div>
              }
            </div>
          }
        </section>

        <!-- Datos de Demostración -->
        @if (showDemoData) {
          <section class="rounded-xl border border-white/10 bg-surface-dark p-6 mt-6">
            <h2 class="text-xl font-bold text-white mb-4">Datos Cargados</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- Tags -->
              <div class="rounded-lg border border-border-dark p-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-2">Tags</h3>
                <p class="text-2xl font-bold text-white">{{ tags.length }}</p>
                @if (tags.length > 0) {
                  <div class="flex flex-wrap gap-1 mt-2">
                    @for (tag of tags.slice(0, 5); track tag._id) {
                      <span class="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {{ tag.name }}
                      </span>
                    }
                  </div>
                }
              </div>

              <!-- Audios -->
              <div class="rounded-lg border border-border-dark p-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-2">Audios</h3>
                <p class="text-2xl font-bold text-white">{{ audios.length }}</p>
              </div>

              <!-- Transcripciones -->
              <div class="rounded-lg border border-border-dark p-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-2">Transcripciones</h3>
                <p class="text-2xl font-bold text-white">{{ transcriptions.length }}</p>
              </div>

              <!-- Análisis -->
              <div class="rounded-lg border border-border-dark p-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-2">Análisis IA</h3>
                <p class="text-2xl font-bold text-white">{{ analyses.length }}</p>
              </div>

              <!-- Usuario -->
              <div class="rounded-lg border border-border-dark p-4">
                <h3 class="text-sm font-semibold text-gray-400 mb-2">Usuario</h3>
                <p class="text-lg font-bold text-white truncate">{{ user?.name || user?.username || 'N/A' }}</p>
                <p class="text-xs text-gray-500">{{ user?.email || '' }}</p>
              </div>
            </div>
          </section>
        }

      </div>
    </div>
  `,
})
export class ApiTestComponent implements OnInit {
  private readonly api = inject(ApiHttpService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly authService = inject(AuthService);
  private readonly tagsService = inject(TagsService);
  private readonly userService = inject(UserService);
  private readonly audioWorkflow = inject(AudioWorkflowService);
  private readonly platformId = inject(PLATFORM_ID);

  loginUsername = '';
  loginPassword = '';
  showPassword = false;
  loginLoading = false;

  isAuthenticated = false;
  currentUsername: string | null = null;

  runningTests = false;
  showDemoData = false;

  tags: Tag[] = [];
  audios: AudioEntity[] = [];
  transcriptions: TranscriptionEntity[] = [];
  analyses: AiAnalysisEntity[] = [];
  user: User | null = null;

  tests: EndpointTest[] = [
    { name: 'Obtener Tags', endpoint: '/tags/', method: 'GET', status: 'pending' },
    { name: 'Obtener Audios', endpoint: '/audios/', method: 'GET', status: 'pending' },
    { name: 'Obtener Transcripciones', endpoint: '/transcriptions/', method: 'GET', status: 'pending' },
    { name: 'Obtener Análisis IA', endpoint: '/ai-analyses/', method: 'GET', status: 'pending' },
    { name: 'Obtener Carpetas', endpoint: '/folders/', method: 'GET', status: 'pending' },
    { name: 'Obtener Documentos', endpoint: '/documents/', method: 'GET', status: 'pending' },
    { name: 'Obtener Usuario', endpoint: '/users/:id', method: 'GET', status: 'pending' },
  ];

  ngOnInit(): void {
    this.isAuthenticated = !!this.tokenStorage.getToken();
    this.currentUsername = this.tokenStorage.getUsername();
  }

  doLogin(): void {
    if (!this.loginUsername || !this.loginPassword) {
      return;
    }

    this.loginLoading = true;

    this.authService.login({
      username: this.loginUsername,
      password: this.loginPassword
    }).subscribe({
      next: () => {
        this.loginLoading = false;
        this.isAuthenticated = true;
        this.currentUsername = this.loginUsername;
        this.runAllTests();
      },
      error: (error) => {
        this.loginLoading = false;
        alert('Login fallido: ' + (error.error?.message || 'Error desconocido'));
      }
    });
  }

  doLogout(): void {
    this.authService.logout();
    this.isAuthenticated = false;
    this.currentUsername = null;
    this.tests.forEach(t => t.status = 'pending');
    this.showDemoData = false;
  }

  runAllTests(): void {
    if (!this.isAuthenticated) return;

    this.runningTests = true;
    this.tests.forEach(t => t.status = 'pending');

    // Ejecutar tests en secuencia
    this.runTagsTest()
      .then(() => this.runAudiosTest())
      .then(() => this.runTranscriptionsTest())
      .then(() => this.runAnalysesTest())
      .then(() => this.runFoldersTest())
      .then(() => this.runDocumentsTest())
      .then(() => this.runUserTest())
      .finally(() => {
        this.runningTests = false;
        this.showDemoData = true;
      });
  }

  private updateTest(name: string, status: EndpointTest['status'], message?: string, data?: unknown) {
    const test = this.tests.find(t => t.name === name);
    if (test) {
      test.status = status;
      test.message = message;
      test.data = data;
    }
  }

  private runTagsTest(): Promise<void> {
    return new Promise((resolve) => {
      this.updateTest('Obtener Tags', 'loading');

      this.tagsService.loadTags().subscribe({
        next: (tags) => {
          this.tags = tags;
          this.updateTest('Obtener Tags', 'success', `OK - ${tags.length} tags`, tags);
          resolve();
        },
        error: (error) => {
          this.updateTest('Obtener Tags', 'error', error.message || 'Error', null);
          resolve();
        }
      });
    });
  }

  private runAudiosTest(): Promise<void> {
    return new Promise((resolve) => {
      this.updateTest('Obtener Audios', 'loading');

      this.audioWorkflow.listAudios().subscribe({
        next: (audios) => {
          this.audios = audios;
          this.updateTest('Obtener Audios', 'success', `OK - ${audios.length} audios`, audios);
          resolve();
        },
        error: (error) => {
          this.updateTest('Obtener Audios', 'error', error.message || 'Error', null);
          resolve();
        }
      });
    });
  }

  private runTranscriptionsTest(): Promise<void> {
    return new Promise((resolve) => {
      this.updateTest('Obtener Transcripciones', 'loading');

      this.audioWorkflow.listTranscriptions().subscribe({
        next: (transcriptions) => {
          this.transcriptions = transcriptions;
          this.updateTest('Obtener Transcripciones', 'success', `OK - ${transcriptions.length} transcripciones`, transcriptions);
          resolve();
        },
        error: (error) => {
          this.updateTest('Obtener Transcripciones', 'error', error.message || 'Error', null);
          resolve();
        }
      });
    });
  }

  private runAnalysesTest(): Promise<void> {
    return new Promise((resolve) => {
      this.updateTest('Obtener Análisis IA', 'loading');

      this.audioWorkflow.listAnalyses().subscribe({
        next: (analyses) => {
          this.analyses = analyses;
          this.updateTest('Obtener Análisis IA', 'success', `OK - ${analyses.length} análisis`, analyses);
          resolve();
        },
        error: (error) => {
          this.updateTest('Obtener Análisis IA', 'error', error.message || 'Error', null);
          resolve();
        }
      });
    });
  }

  private runFoldersTest(): Promise<void> {
    return new Promise((resolve) => {
      this.updateTest('Obtener Carpetas', 'loading');

      this.api.get<unknown[]>('folders/').subscribe({
        next: (folders) => {
          this.updateTest('Obtener Carpetas', 'success', `OK - ${folders.length} carpetas`, folders);
          resolve();
        },
        error: (error) => {
          this.updateTest('Obtener Carpetas', 'error', error.message || 'Error', null);
          resolve();
        }
      });
    });
  }

  private runDocumentsTest(): Promise<void> {
    return new Promise((resolve) => {
      this.updateTest('Obtener Documentos', 'loading');

      this.api.get<unknown[]>('documents/').subscribe({
        next: (documents) => {
          this.updateTest('Obtener Documentos', 'success', `OK - ${documents.length} documentos`, documents);
          resolve();
        },
        error: (error) => {
          this.updateTest('Obtener Documentos', 'error', error.message || 'Error', null);
          resolve();
        }
      });
    });
  }

  private runUserTest(): Promise<void> {
    return new Promise((resolve) => {
      this.updateTest('Obtener Usuario', 'loading');

      const userId = this.tokenStorage.getUserId();
      if (!userId) {
        this.updateTest('Obtener Usuario', 'error', 'No user ID in token', null);
        resolve();
        return;
      }

      this.api.get<User>(`users/${userId}`).subscribe({
        next: (user) => {
          this.user = user;
          this.updateTest('Obtener Usuario', 'success', `OK - ${user.username}`, user);
          resolve();
        },
        error: (error) => {
          this.updateTest('Obtener Usuario', 'error', error.message || 'Error', null);
          resolve();
        }
      });
    });
  }

  getDataCount(data: unknown): number {
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object' && data !== null) return Object.keys(data).length;
    return 0;
  }
}
