/**
 * ProfileComponent - Componente para gestión del perfil de usuario
 * MindVoice - Angular 21 standalone component
 * 
 * Funcionalidades:
 * - Muestra datos del usuario desde GET /users/me
 * - Permite editar nombre y email con ReactiveFormsModule
 * - Botón para eliminar cuenta con confirmación via Angular Material Dialog
 * - Avatar con iniciales del nombre
 */
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { 
  ChangeDetectionStrategy, 
  ChangeDetectorRef, 
  Component, 
  OnInit, 
  OnDestroy,
  PLATFORM_ID, 
  inject 
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil } from 'rxjs';
import { UserService, User } from '../../core/services/user.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { ConfirmDeleteDialogComponent } from './confirm-delete-dialog';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    MatIconModule, 
    MatDialogModule,
    MatButtonModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-8 max-w-[800px] mx-auto w-full space-y-6">
      
      <!-- Header con avatar -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 p-8 shadow-2xl">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <!-- Avatar con iniciales -->
          <div 
            class="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-3xl font-black text-primary">
            {{ getInitials() }}
          </div>
          
          <div class="text-center md:text-left flex-1">
            @if (userService.loading()) {
              <div class="animate-pulse">
                <div class="h-8 bg-gray-700 rounded w-48 mb-2"></div>
                <div class="h-4 bg-gray-700 rounded w-64"></div>
              </div>
            } @else if (userService.user()) {
              <h1 class="text-3xl font-black text-white tracking-tight">
                {{ userService.user()?.name || 'Usuario' }}
              </h1>
              <p class="text-gray-400 mt-1">{{ userService.user()?.email }}</p>
            } @else {
              <h1 class="text-3xl font-black text-white tracking-tight">Mi Perfil</h1>
              <p class="text-gray-400 mt-1">Carga tu información personal</p>
            }
          </div>
          
          <button
            type="button"
            (click)="loadProfile()"
            [disabled]="userService.loading()"
            class="h-10 px-4 rounded-lg border border-border-dark text-sm font-semibold text-gray-300 hover:bg-border-dark/70 transition-colors">
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg" [class.animate-spin]="userService.loading()">refresh</mat-icon>
              Recargar
            </span>
          </button>
        </div>
      </section>

      <!-- Formulario de edición -->
      <section class="rounded-2xl border border-white/10 bg-surface-dark/80 p-6 shadow-2xl">
        <h2 class="text-xl font-bold text-white mb-6">Editar Información</h2>
        
        @if (userService.loading() && !userService.user()) {
          <!-- Skeleton del formulario -->
          <div class="space-y-4 animate-pulse">
            <div class="h-10 bg-gray-700 rounded"></div>
            <div class="h-10 bg-gray-700 rounded"></div>
            <div class="h-10 bg-gray-700 rounded w-32"></div>
          </div>
        } @else {
          <form [formGroup]="profileForm" (ngSubmit)="updateProfile()" class="space-y-4">
            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</label>
              <input
                formControlName="name"
                type="text"
                class="mt-1 w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100 focus:border-primary focus:outline-none"
                placeholder="Tu nombre completo" />
              @if (profileForm.get('name')?.invalid && profileForm.get('name')?.touched) {
                <p class="text-xs text-rose-400 mt-1">El nombre es requerido (mínimo 2 caracteres)</p>
              }
            </div>

            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
              <input
                formControlName="email"
                type="email"
                class="mt-1 w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100 focus:border-primary focus:outline-none"
                placeholder="tu@email.com" />
              @if (profileForm.get('email')?.invalid && profileForm.get('email')?.touched) {
                <p class="text-xs text-rose-400 mt-1">Ingresa un email válido</p>
              }
            </div>

            <div>
              <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nueva Contraseña (opcional)</label>
              <input
                formControlName="password"
                type="password"
                class="mt-1 w-full h-10 rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-gray-100 focus:border-primary focus:outline-none"
                placeholder="Dejar vacío para mantener la actual" />
              @if (profileForm.get('password')?.invalid && profileForm.get('password')?.touched) {
                <p class="text-xs text-rose-400 mt-1">La contraseña debe tener al menos 6 caracteres</p>
              }
            </div>

            <!-- Mensajes -->
            @if (errorMessage) {
              <p class="text-sm text-rose-400">{{ errorMessage }}</p>
            }
            @if (successMessage) {
              <p class="text-sm text-emerald-400">{{ successMessage }}</p>
            }

            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                [disabled]="profileForm.invalid || saving"
                class="h-10 px-6 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-colors disabled:opacity-50">
                @if (saving) {
                  <span class="inline-flex items-center gap-2">
                    <mat-icon class="text-lg animate-spin">autorenew</mat-icon>
                    Guardando...
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-2">
                    <mat-icon class="text-lg">save</mat-icon>
                    Guardar Cambios
                  </span>
                }
              </button>

              <button
                type="button"
                (click)="resetForm()"
                class="h-10 px-4 rounded-lg border border-border-dark text-sm font-semibold text-gray-300 hover:bg-border-dark/70 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        }
      </section>

      <!-- Zona de peligro -->
      <section class="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6">
        <h2 class="text-xl font-bold text-rose-400 mb-2">Zona de Peligro</h2>
        <p class="text-sm text-gray-400 mb-4">
          Eliminar tu cuenta borrará permanentemente todos tus datos, incluyendo notas, etiquetas y mapas mentales.
          Esta acción no se puede deshacer.
        </p>
        
        <button
          type="button"
          (click)="confirmDeleteAccount()"
          [disabled]="deleting"
          class="h-10 px-4 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors disabled:opacity-50">
          @if (deleting) {
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg animate-spin">autorenew</mat-icon>
              Eliminando...
            </span>
          } @else {
            <span class="inline-flex items-center gap-2">
              <mat-icon class="text-lg">delete_forever</mat-icon>
              Eliminar mi Cuenta
            </span>
          }
        </button>
      </section>
    </div>
  `
})
export class ProfileComponent implements OnInit, OnDestroy {
  readonly userService = inject(UserService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly destroy$ = new Subject<void>();

  profileForm: FormGroup;
  saving = false;
  deleting = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.userService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.populateForm(user);
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = this.userService.error() || 'No se pudo cargar el perfil.';
          this.cdr.markForCheck();
        }
      });
  }

  private populateForm(user: User): void {
    this.profileForm.patchValue({
      name: user.name || '',
      email: user.email || '',
      password: ''
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValue = this.profileForm.value;
    const payload: { name?: string; email?: string; password?: string } = {};

    // Solo enviar campos que han cambiado
    const currentUser = this.userService.user();
    if (formValue.name && formValue.name !== currentUser?.name) {
      payload.name = formValue.name;
    }
    if (formValue.email && formValue.email !== currentUser?.email) {
      payload.email = formValue.email;
    }
    if (formValue.password) {
      payload.password = formValue.password;
    }

    if (Object.keys(payload).length === 0) {
      this.saving = false;
      this.successMessage = 'No hay cambios que guardar.';
      return;
    }

    this.userService.updateProfile(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Perfil actualizado correctamente.';
          this.profileForm.patchValue({ password: '' });
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.errorMessage = this.userService.error() || 'No se pudo actualizar el perfil.';
          this.cdr.markForCheck();
        }
      });
  }

  resetForm(): void {
    const user = this.userService.user();
    if (user) {
      this.populateForm(user);
    }
    this.errorMessage = '';
    this.successMessage = '';
  }

  confirmDeleteAccount(): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      panelClass: 'dark-dialog'
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(confirmed => {
        if (confirmed) {
          this.deleteAccount();
        }
      });
  }

  private deleteAccount(): void {
    this.deleting = true;
    this.errorMessage = '';

    this.userService.deleteAccount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting = false;
          // Limpiar tokens y redirigir
          this.tokenStorage.clearToken();
          this.tokenStorage.clearRefreshToken();
          this.tokenStorage.clearUsername();
          this.router.navigate(['/auth'], {
            queryParams: { deleted: 'true' }
          });
        },
        error: () => {
          this.deleting = false;
          this.errorMessage = this.userService.error() || 'No se pudo eliminar la cuenta.';
          this.cdr.markForCheck();
        }
      });
  }

  getInitials(): string {
    const user = this.userService.user();
    if (!user?.name) return '??';
    
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
