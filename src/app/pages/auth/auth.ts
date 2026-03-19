import { Component, signal, OnInit, AfterViewInit, Inject, PLATFORM_ID, inject } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, FormsModule],
  template: `
    <div class="auth-shell">

      <div class="particles-bg" aria-hidden="true">
        <span *ngFor="let p of particles" class="particle" [style]="p"></span>
      </div>
      <div class="bg-orb orb-a"></div>
      <div class="bg-orb orb-b"></div>
      <div class="bg-orb orb-c"></div>
      <div class="grid-lines" aria-hidden="true"></div>

      <div class="auth-wrapper">
        <div class="auth-card" [class.is-register]="isRegister()">

          <!-- ══ PANEL IZQUIERDO ══ -->
          <aside class="brand-panel">
            <div class="brand-text" [class.mode-out]="animating">
              <h1 class="brand-heading">
                <ng-container *ngIf="!isRegister()">
                  Bienvenido<br><span class="gradient-text">de nuevo</span>
                </ng-container>
                <ng-container *ngIf="isRegister()">
                  Crea tu<br><span class="gradient-text">espacio</span>
                </ng-container>
              </h1>
              <p class="brand-sub">
                <ng-container *ngIf="!isRegister()">
                  Tu segundo cerebro te espera. Retoma ideas, tareas y resúmenes justo donde los dejaste.
                </ng-container>
                <ng-container *ngIf="isRegister()">
                  Transforma tu voz en conocimiento real. Comienza gratis, sin tarjeta de crédito.
                </ng-container>
              </p>
            </div>
          </aside>

          <!-- ══ PANEL DERECHO: FORM ══ -->
          <div class="form-panel">
            <div class="form-inner">

              <div class="mode-badge">
                <span class="mode-dot"></span>
                <span>{{ isRegister() ? 'Crear cuenta' : 'Iniciar sesión' }}</span>
              </div>

              <div class="form-head">
                <h2 class="form-title">
                  {{ isRegister() ? '¡Únete a MindVoice!' : 'Accede a tu cuenta' }}
                </h2>
                <p class="form-sub">
                  {{ isRegister() ? 'Gratis para siempre en el plan básico' : 'Retoma donde lo dejaste' }}
                </p>
                <p class="feedback error" *ngIf="errorMessage">{{ errorMessage }}</p>
                <p class="feedback success" *ngIf="successMessage">{{ successMessage }}</p>
              </div>

              <form class="auth-form" (submit)="$event.preventDefault()">

                <div class="field" *ngIf="isRegister()" style="animation: slideField 0.35s ease both">
                  <label class="flabel">Nombre completo</label>
                  <div class="finput-wrap" [class.focused]="focusedField === 'name'">
                    <svg class="ficon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    <input class="finput" type="text" placeholder="Tu nombre completo"
                      name="fullName"
                      [(ngModel)]="fullName"
                      (focus)="focusedField='name'" (blur)="focusedField=''" />
                  </div>
                </div>

                <div class="field">
                  <label class="flabel">Usuario</label>
                  <div class="finput-wrap" [class.focused]="focusedField === 'username'">
                    <svg class="ficon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
                    <input class="finput" type="text" placeholder="tu_usuario"
                      name="username"
                      [(ngModel)]="username"
                      (focus)="focusedField='username'" (blur)="focusedField=''" />
                  </div>
                </div>

                <div class="field" *ngIf="isRegister()">
                  <label class="flabel">Correo electrónico</label>
                  <div class="finput-wrap" [class.focused]="focusedField === 'email'">
                    <svg class="ficon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>
                    <input class="finput" type="email" placeholder="nombre@correo.com"
                      name="email"
                      [(ngModel)]="email"
                      (focus)="focusedField='email'" (blur)="focusedField=''" />
                  </div>
                </div>

                <div class="field">
                  <div class="flabel-row">
                    <label class="flabel">Contraseña</label>
                    <a *ngIf="!isRegister()" href="#" class="forgot-link">¿La olvidaste?</a>
                  </div>
                  <div class="finput-wrap" [class.focused]="focusedField === 'pass'">
                    <svg class="ficon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input class="finput" [type]="showPass ? 'text' : 'password'"
                      name="password"
                      [(ngModel)]="password"
                      placeholder="••••••••"
                      (focus)="focusedField='pass'" (blur)="focusedField=''"
                      (input)="onPassInput($event)" />
                    <button type="button" class="eye-btn" (click)="showPass = !showPass" tabindex="-1">
                      <svg *ngIf="!showPass" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                      <svg *ngIf="showPass" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-10-8-10-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    </button>
                  </div>
                  <div class="pass-strength" *ngIf="isRegister() && passStrength > 0">
                    <div class="strength-bars">
                      <div class="sbar" [class.active]="passStrength >= 1" [class.weak]="passStrength === 1" [class.medium]="passStrength === 2" [class.strong]="passStrength >= 3"></div>
                      <div class="sbar" [class.active]="passStrength >= 2" [class.medium]="passStrength === 2" [class.strong]="passStrength >= 3"></div>
                      <div class="sbar" [class.active]="passStrength >= 3" [class.strong]="passStrength >= 3"></div>
                      <div class="sbar" [class.active]="passStrength >= 4" [class.strong]="passStrength >= 4"></div>
                    </div>
                    <span class="strength-label" [class.weak]="passStrength===1" [class.medium]="passStrength===2" [class.strong]="passStrength>=3">
                      {{ passStrength === 1 ? 'Débil' : passStrength === 2 ? 'Regular' : passStrength === 3 ? 'Buena' : 'Fuerte' }}
                    </span>
                  </div>
                </div>

                <div class="terms-row" *ngIf="isRegister()">
                  <label class="terms-label">
                    <input type="checkbox" class="terms-check" [(ngModel)]="termsAccepted" name="termsAccepted" />
                    <span class="custom-check" [class.checked]="termsAccepted">
                      <svg *ngIf="termsAccepted" width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span>Acepto los <a href="#" class="terms-link">Términos</a> y <a href="#" class="terms-link">Privacidad</a></span>
                  </label>
                </div>

                <button type="submit" class="submit-btn"
                  [class.loading]="loading"
                  [disabled]="loading"
                  (click)="handleSubmit()">
                  <span class="btn-content" *ngIf="!loading">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <ng-container *ngIf="!isRegister()"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></ng-container>
                      <ng-container *ngIf="isRegister()"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></ng-container>
                    </svg>
                    {{ isRegister() ? 'Crear cuenta gratis' : 'Entrar ahora' }}
                  </span>
                  <span class="btn-loading" *ngIf="loading">
                    <span class="spinner"></span>
                    Verificando...
                  </span>
                  <div class="btn-shine"></div>
                </button>

                <div class="divider">
                  <span class="dline"></span>
                  <span class="dtext">o continúa con</span>
                  <span class="dline"></span>
                </div>

                <div class="social-row">
                  <button type="button" class="social-btn">
                    <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Google
                  </button>
                  <button type="button" class="social-btn">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="#e2e8f0"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                    GitHub
                  </button>
                </div>

              </form>

              <div class="form-footer">
                <button class="switch-link" (click)="toggleMode()">
                  <ng-container *ngIf="!isRegister()">¿No tienes cuenta? <strong>Regístrate gratis →</strong></ng-container>
                  <ng-container *ngIf="isRegister()">¿Ya tienes cuenta? <strong>Inicia sesión →</strong></ng-container>
                </button>
                <a routerLink="/" class="back-link">← Volver al inicio</a>
              </div>

            </div>
          </div>

        </div>

        <p class="legal">
          Al continuar aceptas los <a href="#" class="legal-a">Términos de servicio</a> y la <a href="#" class="legal-a">Política de privacidad</a> de MindVoice.
        </p>
      </div>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ══ SHELL ══ */
    .auth-shell {
      font-family: 'Sora', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
      background:
        radial-gradient(circle at 15% 15%, rgba(124,58,237,0.30), transparent 38%),
        radial-gradient(circle at 88% 85%, rgba(168,85,247,0.22), transparent 35%),
        radial-gradient(circle at 55% 50%, rgba(6,182,212,0.07), transparent 32%),
        linear-gradient(140deg, #0b0514 0%, #161121 45%, #221932 100%);
      position: relative;
      overflow: hidden;
      color: #e2e8f0;
    }

    .bg-orb { position:fixed; border-radius:9999px; filter:blur(70px); pointer-events:none; z-index:0; animation:drift 12s ease-in-out infinite; }
    .orb-a { width:24rem; height:24rem; background:rgba(124,58,237,0.22); top:2%; left:-7rem; }
    .orb-b { width:22rem; height:22rem; background:rgba(168,85,247,0.18); bottom:-6rem; right:-6rem; animation-delay:-4s; }
    .orb-c { width:14rem; height:14rem; background:rgba(6,182,212,0.14); top:50%; left:42%; animation-delay:-8s; }

    .particles-bg { position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
    .particle { position:absolute; border-radius:9999px; background:rgba(167,139,250,0.28); animation:float-up linear infinite; }

    .grid-lines {
      position:fixed; inset:0; pointer-events:none; z-index:0;
      background-image:
        linear-gradient(rgba(124,58,237,0.035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124,58,237,0.035) 1px, transparent 1px);
      background-size: 52px 52px;
    }

    /* ══ WRAPPER ══ */
    .auth-wrapper {
      position: relative; z-index: 10;
      width: 100%; max-width: 60rem;
      display: flex; flex-direction: column; align-items: center;
      gap: 1.25rem;
      animation: wrapperIn 0.6s cubic-bezier(0.22,1,0.36,1) both;
    }

    /* ══ CARD ══ */
    .auth-card {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr;
      border-radius: 2rem;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.09);
      background: linear-gradient(145deg, rgba(18,13,28,0.98), rgba(10,5,18,0.98));
      backdrop-filter: blur(24px);
      box-shadow:
        0 0 0 1px rgba(124,58,237,0.10),
        0 40px 80px rgba(0,0,0,0.55),
        0 0 120px rgba(124,58,237,0.07);
      transition: box-shadow 0.5s ease;
    }
    @media(min-width: 768px) {
      .auth-card { grid-template-columns: 1fr 1fr; }
    }
    .auth-card.is-register {
      box-shadow:
        0 0 0 1px rgba(167,139,250,0.14),
        0 40px 80px rgba(0,0,0,0.55),
        0 0 120px rgba(167,139,250,0.09);
    }

    /* ══ BRAND PANEL — solo centra el texto, sin padding extra ══ */
    .brand-panel {
      background:
        linear-gradient(155deg, rgba(124,58,237,0.20), rgba(91,33,182,0.22)),
        rgba(18,13,28,0.70);
      border-bottom: 1px solid rgba(255,255,255,0.07);
      position: relative; overflow: hidden;
      /* Centrado perfecto vertical y horizontal */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 2rem;
    }
    @media(min-width:768px) {
      .brand-panel { border-bottom: none; border-right: 1px solid rgba(255,255,255,0.07); }
    }
    .brand-panel::before {
      content:''; position:absolute; top:-5rem; right:-5rem;
      width:20rem; height:20rem;
      background:radial-gradient(circle, rgba(167,139,250,0.12), transparent 65%);
      pointer-events:none;
    }
    .brand-panel::after {
      content:''; position:absolute; bottom:-4rem; left:-4rem;
      width:16rem; height:16rem;
      background:radial-gradient(circle, rgba(6,182,212,0.09), transparent 65%);
      pointer-events:none;
    }

    .brand-text {
      transition: opacity 0.25s ease, transform 0.25s ease;
      position: relative; z-index: 1;
    }
    .brand-text.mode-out { opacity: 0; transform: translateY(8px); }

    .brand-heading {
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 900; line-height: 1.15; color: #fff;
      margin-bottom: 1rem;
    }
    .brand-sub {
      font-size: 0.95rem; color: #94a3b8; line-height: 1.7;
    }
    .gradient-text {
      background: linear-gradient(135deg, #a78bfa, #38bdf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }

    /* ══ FORM PANEL ══ */
    .form-panel {
      background: rgba(10,5,18,0.50);
      display: flex;
      flex-direction: column;
    }
    .form-inner {
      padding: 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      /* El form se centra verticalmente dentro del panel */
      flex: 1;
      justify-content: center;
    }

    .mode-badge {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.3rem 0.875rem; border-radius: 9999px;
      border: 1px solid rgba(139,92,246,0.30);
      background: rgba(139,92,246,0.10);
      color: #ddd6fe; font-size: 0.65rem;
      letter-spacing: 0.15em; text-transform: uppercase;
      width: fit-content;
    }
    .mode-dot {
      width: 0.38rem; height: 0.38rem; border-radius: 9999px;
      background: #a78bfa; animation: pulse 2s ease-in-out infinite;
    }

    .form-title {
      font-size: clamp(1.3rem, 2.5vw, 1.75rem);
      font-weight: 900; color: #fff; margin-bottom: 0.25rem;
    }
    .form-sub { font-size: 0.8rem; color: #64748b; }
    .feedback {
      margin-top: 0.6rem;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .feedback.error { color: #fda4af; }
    .feedback.success { color: #86efac; }

    .auth-form { display: flex; flex-direction: column; gap: 0.875rem; }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .flabel { font-size: 0.78rem; font-weight: 600; color: #94a3b8; }
    .flabel-row { display: flex; align-items: center; justify-content: space-between; }
    .forgot-link { font-size: 0.72rem; color: #7c3aed; text-decoration: none; transition: color 0.2s; }
    .forgot-link:hover { color: #a78bfa; }

    .finput-wrap {
      position: relative; display: flex; align-items: center;
      border-radius: 0.875rem;
      border: 1px solid rgba(148,163,184,0.18);
      background: rgba(15,23,42,0.55);
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    }
    .finput-wrap.focused {
      border-color: rgba(124,58,237,0.70);
      box-shadow: 0 0 0 3px rgba(124,58,237,0.15), 0 0 20px rgba(124,58,237,0.08);
      background: rgba(15,23,42,0.80);
    }
    .ficon {
      position: absolute; left: 0.875rem;
      color: #475569; pointer-events: none; transition: color 0.2s;
    }
    .finput-wrap.focused .ficon { color: #a78bfa; }
    .finput {
      width: 100%; padding: 0.82rem 2.75rem 0.82rem 2.5rem;
      background: transparent; border: none; outline: none;
      color: #f1f5f9; font-family: 'Sora', sans-serif; font-size: 0.875rem;
    }
    .finput::placeholder { color: #334155; }
    .eye-btn {
      position: absolute; right: 0.875rem;
      background: none; border: none; cursor: pointer;
      color: #475569; display: flex; align-items: center; padding: 0;
      transition: color 0.2s;
    }
    .eye-btn:hover { color: #a78bfa; }

    .pass-strength { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
    .strength-bars { display: flex; gap: 3px; flex: 1; }
    .sbar {
      height: 3px; border-radius: 9999px; flex: 1;
      background: rgba(255,255,255,0.08); transition: background 0.3s ease;
    }
    .sbar.active.weak   { background: #ef4444; }
    .sbar.active.medium { background: #f59e0b; }
    .sbar.active.strong { background: #22c55e; }
    .strength-label { font-size: 0.68rem; font-weight: 600; transition: color 0.3s; }
    .strength-label.weak   { color: #ef4444; }
    .strength-label.medium { color: #f59e0b; }
    .strength-label.strong { color: #22c55e; }

    .terms-row { animation: slideField 0.3s ease both; }
    .terms-label {
      display: flex; align-items: center; gap: 0.6rem;
      font-size: 0.78rem; color: #64748b; cursor: pointer;
    }
    .terms-check { display: none; }
    .custom-check {
      width: 1.1rem; height: 1.1rem; border-radius: 0.3rem; flex-shrink: 0;
      border: 1px solid rgba(148,163,184,0.25);
      background: rgba(15,23,42,0.55);
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .custom-check.checked {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      border-color: #7c3aed;
      box-shadow: 0 0 10px rgba(124,58,237,0.4);
    }
    .terms-link { color: #7c3aed; text-decoration: none; transition: color 0.2s; }
    .terms-link:hover { color: #a78bfa; }

    .submit-btn {
      position: relative; overflow: hidden;
      width: 100%; padding: 0.9rem 1rem;
      border-radius: 0.875rem; border: none;
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%);
      color: #fff; font-weight: 800; font-size: 0.95rem;
      font-family: 'Sora', sans-serif; cursor: pointer;
      box-shadow: 0 0 30px rgba(124,58,237,0.35);
      transition: all 0.3s ease;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    }
    .submit-btn:hover:not(:disabled) {
      box-shadow: 0 0 50px rgba(124,58,237,0.55);
      transform: translateY(-2px);
    }
    .submit-btn:active:not(:disabled) { transform: translateY(0); }
    .submit-btn:disabled { opacity: 0.75; cursor: not-allowed; }
    .submit-btn.loading { background: linear-gradient(135deg, #5b21b6, #4c1d95); }
    .btn-shine {
      position: absolute; top: 0; left: -100%;
      width: 60%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
      transform: skewX(-20deg); transition: left 0.6s ease; pointer-events: none;
    }
    .submit-btn:hover .btn-shine { left: 150%; }
    .btn-content { display: flex; align-items: center; gap: 0.5rem; }
    .btn-loading { display: flex; align-items: center; gap: 0.6rem; }

    .spinner {
      width: 1rem; height: 1rem;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: #fff; border-radius: 9999px;
      animation: spin 0.7s linear infinite;
    }

    .divider { display:flex; align-items:center; gap:0.75rem; }
    .dline { flex:1; height:1px; background:rgba(255,255,255,0.07); }
    .dtext { font-size:0.68rem; color:#334155; white-space:nowrap; }

    .social-row { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
    .social-btn {
      display:flex; align-items:center; justify-content:center; gap:0.5rem;
      padding:0.72rem; border-radius:0.875rem;
      border:1px solid rgba(255,255,255,0.09);
      background:rgba(255,255,255,0.04);
      color:#94a3b8; font-size:0.8rem; font-family:'Sora',sans-serif; font-weight:600;
      cursor:pointer; transition:all 0.25s ease;
    }
    .social-btn:hover {
      border-color:rgba(167,139,250,0.35); background:rgba(124,58,237,0.10);
      color:#fff; transform:translateY(-2px);
      box-shadow: 0 4px 16px rgba(124,58,237,0.15);
    }

    .form-footer {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 0.5rem;
    }
    .switch-link {
      background: none; border: none; cursor: pointer;
      font-size: 0.78rem; color: #64748b; font-family: 'Sora', sans-serif;
      transition: color 0.2s; padding: 0; text-align: left;
    }
    .switch-link:hover { color: #a78bfa; }
    .switch-link strong { color: #7c3aed; transition: color 0.2s; }
    .switch-link:hover strong { color: #a78bfa; }
    .back-link { font-size: 0.75rem; color: #334155; text-decoration: none; transition: color 0.2s; }
    .back-link:hover { color: #a78bfa; }

    .legal { font-size: 0.7rem; color: #1e293b; text-align: center; line-height: 1.6; }
    .legal-a { color: #334155; text-decoration: none; transition: color 0.2s; }
    .legal-a:hover { color: #a78bfa; }

    @keyframes drift {
      0%,100%{ transform:translateY(0) scale(1); }
      50%{ transform:translateY(-18px) scale(1.05); }
    }
    @keyframes float-up {
      0%{ transform:translateY(100vh) scale(0); opacity:0; }
      10%{ opacity:1; } 90%{ opacity:0.45; }
      100%{ transform:translateY(-10vh) scale(1); opacity:0; }
    }
    @keyframes wrapperIn {
      from{ opacity:0; transform:translateY(28px) scale(0.98); }
      to{ opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes slideField {
      from{ opacity:0; transform:translateY(-8px); }
      to{ opacity:1; transform:translateY(0); }
    }
    @keyframes spin {
      from{ transform:rotate(0deg); }
      to{ transform:rotate(360deg); }
    }
    @keyframes pulse {
      0%,100%{ opacity:1; transform:scale(1); }
      50%{ opacity:0.55; transform:scale(0.82); }
    }
  `]
})
export class AuthComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isRegister = signal(false);
  showPass     = false;
  loading      = false;
  animating    = false;
  focusedField = '';
  passStrength  = 0;
  termsAccepted = false;
  username = '';
  fullName = '';
  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';
  particles: string[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  toggleMode(): void {
    this.animating = true;
    this.errorMessage = '';
    this.successMessage = '';
    setTimeout(() => {
      this.isRegister.update(v => !v);
      this.animating = false;
      this.passStrength = 0;
      this.showPass = false;
    }, 220);
  }

  handleSubmit(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const username = this.username.trim();
    if (!username || !this.password.trim()) {
      this.errorMessage = 'Completa usuario y contraseña para continuar.';
      return;
    }

    if (this.isRegister() && !this.fullName.trim()) {
      this.errorMessage = 'Ingresa tu nombre completo para crear la cuenta.';
      return;
    }

    if (this.isRegister() && !this.email.trim()) {
      this.errorMessage = 'Ingresa tu correo para crear la cuenta.';
      return;
    }

    if (this.isRegister() && !this.termsAccepted) {
      this.errorMessage = 'Debes aceptar los términos y privacidad para registrarte.';
      return;
    }

    this.loading = true;

    if (this.isRegister()) {
      this.authService.register({
        username,
        email: this.email.trim().toLowerCase(),
        password: this.password,
        name: this.fullName.trim(),
      }).subscribe({
        next: () => {
          this.successMessage = 'Cuenta creada. Iniciando sesión...';
          this.loginWithCredentials(username, this.password);
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          this.errorMessage = this.mapError(error, 'No se pudo crear la cuenta.');
        },
      });
      return;
    }

    this.loginWithCredentials(username, this.password);
  }

  onPassInput(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    let s = 0;
    if (val.length >= 8) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    this.passStrength = val.length === 0 ? 0 : Math.max(1, s);
  }

  ngOnInit() {
    this.particles = Array.from({ length: 18 }, () => {
      const size = Math.random() * 4 + 2;
      const left = Math.random() * 100;
      const dur  = Math.random() * 20 + 15;
      const del  = Math.random() * 15;
      return `left:${left}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:-${del}s`;
    });
  }

  ngAfterViewInit() {}

  private loginWithCredentials(username: string, password: string): void {
    this.authService.login({ username, password }).pipe(
      finalize(() => {
        this.loading = false;
      }),
    ).subscribe({
      next: () => {
        this.successMessage = 'Sesión iniciada correctamente.';
        void this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        console.error('[AUTH] Login failed:', error.status, error.error);
        if (error.status === 401) {
          this.errorMessage = 'Usuario o contraseña incorrectos. Intenta de nuevo.';
        } else if (error.status === 0) {
          this.errorMessage = 'No hay conexión con el servidor. Verifica la conexión.';
        } else {
          this.errorMessage = this.mapError(error, 'No se pudo iniciar sesión.');
        }
      },
    });
  }

  private mapError(error: HttpErrorResponse, fallback: string): string {
    const backendMessage = error.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      return backendMessage;
    }

    return fallback;
  }
}