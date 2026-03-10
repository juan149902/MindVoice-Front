import { Component, signal } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [NgClass, NgIf, RouterLink],
  template: `
    <div class="auth-shell min-h-screen px-4 py-10 sm:px-6 flex items-center justify-center text-slate-100">
      <div class="w-full max-w-5xl relative">
        <div class="logo-box absolute left-1/2 -translate-x-1/2 -top-16 z-20">
          <img src="icons/Logo1-96.png" alt="Logo MindVoice" class="w-28 h-28 rounded-2xl shadow-xl shadow-primary/40" />
        </div>

        <section
          class="auth-card rounded-3xl p-4 sm:p-6 md:p-8 border border-white/10 shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-0 transition-all duration-500"
          [ngClass]="isRegister() ? 'lg:[&_.brand-panel]:order-2 lg:[&_.form-panel]:order-1' : 'lg:[&_.brand-panel]:order-1 lg:[&_.form-panel]:order-2'"
        >
          <aside class="brand-panel rounded-2xl p-7 md:p-10 flex flex-col justify-between min-h-[320px]">
            <div>
              <p class="text-xs uppercase tracking-[0.26em] text-violet-200/80">MindVoice account</p>
              <h1 class="mt-3 text-3xl font-black leading-tight text-white">
                {{ isRegister() ? 'Crea tu espacio' : 'Bienvenido de nuevo' }}
              </h1>
              <p class="mt-4 text-slate-300/90">
                {{ isRegister() ? 'Registra tu cuenta para transformar voz en conocimiento accionable.' : 'Inicia sesion y retoma tus ideas justo donde las dejaste.' }}
              </p>
            </div>

            <button
              type="button"
              class="mt-8 self-start rounded-xl border border-white/20 px-4 py-2 font-semibold hover:bg-white/10 transition-colors"
              (click)="toggleMode()"
            >
              {{ isRegister() ? 'Ya tengo cuenta' : 'Quiero registrarme' }}
            </button>
          </aside>

          <div class="form-panel rounded-2xl p-7 md:p-10">
            <p class="text-sm text-slate-300 mb-6">{{ isRegister() ? 'Registro' : 'Login' }}</p>

            <form class="space-y-4" (submit)="$event.preventDefault()">
              <div *ngIf="isRegister()">
                <label class="block text-sm text-slate-300 mb-2">Nombre</label>
                <input class="auth-input" type="text" placeholder="Tu nombre" />
              </div>

              <div>
                <label class="block text-sm text-slate-300 mb-2">Email</label>
                <input class="auth-input" type="email" placeholder="nombre@correo.com" />
              </div>

              <div>
                <label class="block text-sm text-slate-300 mb-2">Contrasena</label>
                <input class="auth-input" type="password" placeholder="••••••••" />
              </div>

              <button type="submit" class="submit-btn w-full mt-2">
                {{ isRegister() ? 'Crear cuenta' : 'Entrar' }}
              </button>
            </form>

            <div class="mt-6 text-sm text-slate-300 text-center">
              <a routerLink="/" class="hover:text-primary transition-colors">Volver a la landing</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');

      .auth-shell {
        font-family: 'Manrope', sans-serif;
        background:
          radial-gradient(circle at 8% 8%, rgba(124, 58, 237, 0.3), transparent 34%),
          radial-gradient(circle at 92% 86%, rgba(168, 85, 247, 0.22), transparent 34%),
          linear-gradient(145deg, #0b0514 0%, #161121 45%, #221932 100%);
      }

      .auth-card {
        background: linear-gradient(140deg, rgba(22, 17, 33, 0.95), rgba(11, 5, 20, 0.94));
        backdrop-filter: blur(8px);
      }

      .brand-panel {
        background:
          linear-gradient(170deg, rgba(124, 58, 237, 0.24), rgba(91, 33, 182, 0.28)),
          rgba(22, 17, 33, 0.76);
        border: 1px solid rgba(255, 255, 255, 0.14);
      }

      .form-panel {
        background: rgba(11, 5, 20, 0.52);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .auth-input {
        width: 100%;
        border-radius: 0.85rem;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(15, 23, 42, 0.75);
        padding: 0.78rem 0.95rem;
        color: #f8fafc;
        outline: none;
        transition: border-color 180ms ease, box-shadow 180ms ease;
      }

      .auth-input:focus {
        border-color: rgba(124, 58, 237, 0.92);
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.28);
      }

      .submit-btn {
        border-radius: 0.9rem;
        background: linear-gradient(to right, #7c3aed, #a855f7);
        color: #ffffff;
        font-weight: 800;
        padding: 0.82rem 1rem;
      }

      .submit-btn:hover {
        filter: brightness(1.06);
      }

      .logo-box {
        background: rgba(15, 23, 42, 0.85);
        border-radius: 1.2rem;
        padding: 0.45rem;
        border: 1px solid rgba(255, 255, 255, 0.16);
      }
    `
  ]
})
export class AuthComponent {
  readonly isRegister = signal(false);

  toggleMode(): void {
    this.isRegister.update((value) => !value);
  }
}
