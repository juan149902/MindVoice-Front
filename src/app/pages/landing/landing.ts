import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div class="landing-shell" style="overflow-x:clip">

      <!-- Partículas de fondo -->
      <div class="particles-bg" aria-hidden="true">
        <span *ngFor="let p of particles" class="particle" [style]="p"></span>
      </div>

      <div class="bg-orb orb-a"></div>
      <div class="bg-orb orb-b"></div>
      <div class="bg-orb orb-c"></div>

      <!-- HEADER STICKY -->
      <header class="site-header header-anim" [class.scrolled]="isScrolled">
        <div class="header-inner">
          <div class="flex items-center gap-3">
            <img src="icons/Logo1.png" alt="MindVoice Logo" class="w-10 h-10 md:w-14 md:h-14 object-cover logo-float" />
            <div>
              <p class="text-xs tracking-[0.24em] uppercase text-violet-200/85">MindVoice</p>
              <p class="font-semibold text-white text-sm md:text-base">Segundo Cerebro Digital</p>
            </div>
          </div>

          <!-- Nav desktop -->
          <nav class="desktop-nav">
            <a href="#hero" class="nav-link">Inicio</a>
            <a href="#features" class="nav-link">Funciones</a>
            <a href="#stats" class="nav-link">Estadísticas</a>
            <a href="#pricing" class="nav-link">Planes</a>
          </nav>

          <!-- Hamburger — solo visible en móvil via CSS -->
          <button class="menu-btn" (click)="toggleMenu()" aria-label="Menú">
            <span [class.open]="menuOpen"></span>
            <span [class.open]="menuOpen"></span>
            <span [class.open]="menuOpen"></span>
          </button>

          <!-- Botón login — solo visible en desktop via CSS -->
          <a routerLink="/auth" class="btn-login-hdr btn-login btn-glow">
            Iniciar sesión
          </a>
        </div>

        <!-- Mobile menu -->
        <div class="mobile-menu" [class.open]="menuOpen">
          <a href="#hero"      class="mobile-link" (click)="toggleMenu()">Inicio</a>
          <a href="#features"  class="mobile-link" (click)="toggleMenu()">Funciones</a>
          <a href="#stats"     class="mobile-link" (click)="toggleMenu()">Estadísticas</a>
          <a href="#pricing"   class="mobile-link" (click)="toggleMenu()">Planes</a>
          <a routerLink="/auth" class="mobile-link mobile-cta" (click)="toggleMenu()">Iniciar sesión →</a>
        </div>
      </header>

      <!-- SCROLL CONTAINER -->
      <div class="scroll-container">

        <!-- ── SECCIÓN 1: HERO ── -->
        <section id="hero" class="snap-section">
          <div class="section-inner hero-grid">
            <div class="hero-text">
              <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-200 text-xs uppercase tracking-widest mb-5 badge-pulse">
                <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                Productividad con personalidad
              </div>
              <h1 class="hero-title">
                Convierte cada idea hablada
                <span class="gradient-text"> en acción real</span>
              </h1>
              <p class="hero-desc">
                Captura notas de voz, obtén resúmenes inteligentes y organiza tareas en un solo flujo.
                Menos fricción, más avance diario.
              </p>
              <div class="hero-actions">
                <a routerLink="/auth" class="cta-primary rounded-2xl px-7 py-3.5 text-white font-extrabold hover:scale-[1.03] transition-all">
                   Probar ahora
                </a>
                <a routerLink="/dashboard" class="cta-secondary rounded-2xl px-7 py-3.5 font-semibold transition-all">
                  Ver demo interna →
                </a>
              </div>
              <div class="trust-row">
                <div class="flex -space-x-2">
                  <div *ngFor="let s of seeds"
                    class="w-8 h-8 rounded-full ring-2 ring-background bg-cover"
                    [style]="'background-image:url(https://api.dicebear.com/7.x/avataaars/svg?seed=' + s + ')'">
                  </div>
                </div>
                <p class="text-sm text-slate-400"><span class="text-white font-bold">+2,400</span> usuarios activos</p>
              </div>
            </div>

            <!-- HERO CARD -->
            <div class="relative hero-card-wrap">
              <div class="hero-card rounded-3xl p-5 md:p-8 border border-white/10 shadow-2xl">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-red-400"></div>
                    <div class="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  </div>
                  <p class="font-semibold text-slate-200 text-sm">Sesión activa</p>
                  <span class="text-xs px-3 py-1 rounded-full bg-violet-500/25 text-violet-100 recording-badge">● Grabando</span>
                </div>
                <div class="wave mb-4" aria-hidden="true">
                  <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                </div>
                <div class="mb-4 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <p class="text-xs text-slate-400 mb-2 uppercase tracking-widest">Transcripción en vivo</p>
                  <p class="text-sm text-slate-200 typing-text">Graba tu voz y transforma pensamientos en conocimiento.</p>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="stat-box rounded-2xl p-3 cursor-default">
                    <p class="text-xs uppercase tracking-widest text-slate-300/70">Ideas guardadas</p>
                    <p class="text-xl font-extrabold text-white mt-1 counter" data-target="128">0</p>
                  </div>
                  <div class="stat-box rounded-2xl p-3 cursor-default">
                    <p class="text-xs uppercase tracking-widest text-slate-300/70">Tareas creadas</p>
                    <p class="text-xl font-extrabold text-white mt-1 counter" data-target="54">0</p>
                  </div>
                  <div class="stat-box rounded-2xl p-3 cursor-default">
                    <p class="text-xs uppercase tracking-widest text-slate-300/70">Resúmenes IA</p>
                    <p class="text-xl font-extrabold text-white mt-1 counter" data-target="37">0</p>
                  </div>
                  <div class="stat-box rounded-2xl p-3 cursor-default">
                    <p class="text-xs uppercase tracking-widest text-slate-300/70">Mapas mentales</p>
                    <p class="text-xl font-extrabold text-white mt-1 counter" data-target="19">0</p>
                  </div>
                </div>
              </div>
              <div class="float-badge float-badge-1 rounded-2xl px-4 py-3 text-sm font-bold"> IA Analizada</div>
              <div class="float-badge float-badge-2 rounded-2xl px-4 py-3 text-sm font-bold"> 3 tareas nuevas</div>
            </div>
          </div>
          <!-- Scroll hint -->
          <div class="scroll-hint" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
        </section>

        <!-- ── SECCIÓN 2: FEATURES ── -->
        <section id="features" class="snap-section">
          <div class="section-inner">
            <div class="text-center mb-10 reveal">
              <p class="text-xs uppercase tracking-[0.3em] text-violet-300/70 mb-3">¿Qué hace MindVoice?</p>
              <h2 class="text-3xl md:text-4xl font-black text-white">Todo en un solo flujo</h2>
            </div>
            <div class="features-grid">
              <div *ngFor="let f of features; let i = index"
                class="feature-card reveal rounded-3xl p-6 border border-white/10 hover:border-violet-500/40 transition-all hover:-translate-y-1 cursor-default"
                [style.animation-delay]="(i * 0.1) + 's'">
                <div class="feature-icon w-12 h-12 rounded-2xl flex items-center justify-center mb-4" aria-hidden="true">
                  <span class="material-symbols-outlined feature-icon-symbol">{{f.icon}}</span>
                </div>
                <h3 class="font-bold text-white text-base mb-2">{{f.title}}</h3>
                <p class="text-slate-400 text-sm leading-relaxed">{{f.desc}}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ── SECCIÓN 3: STATS ── -->
        <section id="stats" class="snap-section">
          <div class="section-inner">
            <div class="text-center mb-10 reveal">
              <p class="text-xs uppercase tracking-[0.3em] text-violet-300/70 mb-3">Números reales</p>
              <h2 class="text-3xl md:text-4xl font-black text-white">El impacto habla por sí solo</h2>
            </div>
            <div class="stats-banner reveal rounded-3xl p-8 md:p-10 border border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
              <div *ngFor="let s of stats">
                <p class="text-3xl md:text-4xl font-black gradient-text mb-1">{{s.value}}</p>
                <p class="text-slate-400 text-sm">{{s.label}}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ── SECCIÓN 4: PRICING ── -->
        <section id="pricing" class="snap-section">
          <div class="section-inner">
            <div class="text-center mb-10 reveal">
              <p class="text-xs uppercase tracking-[0.3em] text-violet-300/70 mb-3">Planes</p>
              <h2 class="text-3xl md:text-4xl font-black text-white">Empieza gratis, escala cuando quieras</h2>
            </div>
            <div class="pricing-grid">
              <div *ngFor="let p of plans; let i = index"
                class="pricing-card reveal rounded-3xl p-6 md:p-8 border transition-all hover:-translate-y-1"
                [class.pricing-featured]="p.featured"
                [style.animation-delay]="(i * 0.1) + 's'">
                <div *ngIf="p.featured" class="featured-badge text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block">
                   Más popular
                </div>
                <h3 class="text-xl font-black text-white mb-1">{{p.name}}</h3>
                <p class="text-slate-400 text-sm mb-4">{{p.desc}}</p>
                <div class="mb-5">
                  <span class="text-4xl font-black text-white">{{p.price}}</span>
                  <span class="text-slate-400 text-sm">/mes</span>
                </div>
                <ul class="space-y-2 mb-6">
                  <li *ngFor="let feat of p.features" class="flex items-center gap-2 text-sm text-slate-300">
                    <span class="text-violet-400">✓</span> {{feat}}
                  </li>
                </ul>
                <a routerLink="/auth"
                  class="block text-center rounded-2xl px-6 py-3 font-bold transition-all hover:scale-[1.02]"
                  [class.cta-primary]="p.featured"
                  [class.cta-secondary]="!p.featured">
                  {{p.cta}}
                </a>
              </div>
            </div>
          </div>
        </section>

        <!-- ── SECCIÓN 5: CTA FINAL + FOOTER ── -->
        <section id="cta" class="snap-section">
          <div class="section-inner flex flex-col justify-center gap-8">
            <div class="cta-final reveal rounded-3xl p-8 md:p-12 text-center border border-violet-500/20">
              <h2 class="text-3xl md:text-5xl font-black text-white mb-4">¿Listo para pensar más rápido?</h2>
              <p class="text-slate-300 text-base md:text-lg mb-8 max-w-xl mx-auto">Únete a miles de profesionales que ya convierten su voz en productividad real.</p>
              <a routerLink="/auth" class="cta-primary inline-block rounded-2xl px-8 md:px-10 py-4 text-white font-extrabold text-base md:text-lg hover:scale-[1.03] transition-all">
                Comenzar gratis →
              </a>
            </div>

            <!-- FOOTER dentro de la última sección -->
            <footer class="footer-soft reveal border-t border-white/10 pt-6">
              <div class="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
                <div class="flex items-center gap-2">
                  <img src="icons/Logo1-96.png" alt="MindVoice" class="w-7 h-7 object-cover" />
                  <span>MindVoice © 2026</span>
                </div>
                <p>Segundo Cerebro Digital — Hecho con 💜 en Tijuana</p>
              </div>
            </footer>
          </div>
        </section>

      </div><!-- /scroll-container -->
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,500,0,0');

    /* ─── BASE ──────────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; }

    .landing-shell {
      font-family: 'Sora', sans-serif;
      background:
        radial-gradient(circle at 18% 16%, rgba(124,58,237,0.34), transparent 38%),
        radial-gradient(circle at 84% 20%, rgba(168,85,247,0.2), transparent 35%),
        linear-gradient(140deg, #0b0514 0%, #161121 45%, #221932 100%);
      position: relative;
      color: #e2e8f0;
    }

    /* ─── ORBs ──────────────────────────────────────────────────── */
    .bg-orb { position:fixed; border-radius:9999px; filter:blur(60px); opacity:0.35; animation:drift 12s ease-in-out infinite; pointer-events:none; z-index:0; }
    .orb-a { width:20rem; height:20rem; background:#7c3aed; top:18%; left:-3rem; }
    .orb-b { width:22rem; height:22rem; background:#a855f7; bottom:-4rem; right:-5rem; animation-delay:-4s; }
    .orb-c { width:10rem; height:10rem; background:#06b6d4; top:60%; left:40%; animation-delay:-8s; opacity:0.2; }

    /* ─── PARTICLES ─────────────────────────────────────────────── */
    .particles-bg { position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
    .particle { position:absolute; border-radius:9999px; background:rgba(167,139,250,0.35); animation:float-up linear infinite; }

    /* ─── STICKY HEADER ─────────────────────────────────────────── */
    .site-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      transition: background 0.4s ease, backdrop-filter 0.4s ease, box-shadow 0.4s ease;
    }
    .site-header.scrolled {
      background: rgba(11,5,20,0.88);
      backdrop-filter: blur(16px);
      box-shadow: 0 1px 0 rgba(255,255,255,0.06);
    }
    .header-inner {
      max-width: 72rem;
      margin: 0 auto;
      padding: 0.875rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .header-anim { animation: slideDown 0.7s ease both; }

    /* ─── BOTÓN LOGIN HEADER ────────────────────────────────────── */
    .btn-login {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
    }
    .btn-login-hdr {
      display: none; /* oculto en móvil por defecto */
      border-radius: 9999px;
      padding: 0.6rem 1.25rem;
      color: #fff;
      font-weight: 700;
      font-size: 0.875rem;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.3s ease;
    }
    .btn-login-hdr:hover { transform: scale(1.05); }
    .btn-glow { box-shadow: 0 0 20px rgba(124,58,237,0.3); }

    /* ─── NAV DESKTOP ───────────────────────────────────────────── */
    .desktop-nav {
      display: none; /* oculto en móvil por defecto */
      align-items: center;
      gap: 1.5rem;
      font-size: 0.875rem;
      color: #cbd5e1;
    }

    /* ─── MOSTRAR desktop-nav y btn-login-hdr en pantallas >= 768px ── */
    @media (min-width: 768px) {
      .desktop-nav    { display: flex; }
      .btn-login-hdr  { display: inline-flex; align-items: center; }
      .menu-btn       { display: none !important; } /* ocultar hamburger en desktop */
    }

    /* NAV LINKS */
    .nav-link { position:relative; text-decoration:none; color: #cbd5e1; transition: color 0.2s; }
    .nav-link:hover { color: #fff; }
    .nav-link::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:1px; background:#a78bfa; transition:width 0.3s ease; }
    .nav-link:hover::after { width:100%; }

    /* ─── HAMBURGER ─────────────────────────────────────────────── */
    .menu-btn {
      display: flex; flex-direction: column; justify-content: center; gap: 5px;
      width: 2.25rem; height: 2.25rem;
      background: none; border: none; cursor: pointer; padding: 0.25rem;
    }
    .menu-btn span {
      display: block; height: 2px; border-radius: 2px;
      background: #e2e8f0; transition: all 0.3s ease;
    }
    .menu-btn span.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    .menu-btn span.open:nth-child(2) { opacity: 0; }
    .menu-btn span.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    /* ─── MOBILE MENU ───────────────────────────────────────────── */
    .mobile-menu {
      max-height: 0; overflow: hidden;
      transition: max-height 0.4s ease, padding 0.3s ease;
      background: rgba(11,5,20,0.97);
      backdrop-filter: blur(16px);
    }
    .mobile-menu.open { max-height: 22rem; padding: 0.75rem 0 1rem; }
    .mobile-link {
      display: block; padding: 0.75rem 1.5rem;
      color: #cbd5e1; text-decoration: none; font-size: 0.9rem;
      transition: color 0.2s, background 0.2s;
    }
    .mobile-link:hover { color: #fff; background: rgba(124,58,237,0.1); }
    .mobile-cta {
      margin: 0.5rem 1.25rem 0;
      border-radius: 0.875rem;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: #fff !important; font-weight: 700;
      text-align: center;
    }

    /* ─── SCROLL SNAP CONTAINER ─────────────────────────────────── */
    .scroll-container {
      height: 100vh;
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      scroll-behavior: smooth;
      /* Compensar header fijo */
      padding-top: 0;
    }

    /* ─── SNAP SECTION ──────────────────────────────────────────── */
    .snap-section {
      scroll-snap-align: start;
      scroll-snap-stop: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      z-index: 10;
      /* Compensar header */
      padding-top: 5rem;
      padding-bottom: 1.5rem;
    }

    /* ─── SECTION INNER ─────────────────────────────────────────── */
    .section-inner {
      max-width: 72rem;
      margin: 0 auto;
      padding: 0 1.25rem;
      width: 100%;
    }

    /* ─── SCROLL HINT (flechita abajo en hero) ──────────────────── */
    .scroll-hint {
      position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .scroll-hint span {
      display: block; width: 8px; height: 8px; border-right: 2px solid #a78bfa; border-bottom: 2px solid #a78bfa;
      transform: rotate(45deg); animation: scrollHint 1.4s ease-in-out infinite;
    }
    .scroll-hint span:nth-child(2){ animation-delay: 0.15s; opacity: 0.6; }
    .scroll-hint span:nth-child(3){ animation-delay: 0.3s; opacity: 0.3; }

    /* ─── HERO ──────────────────────────────────────────────────── */
    .hero-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2.5rem;
      align-items: center;
    }
    @media(min-width: 1024px){ .hero-grid { grid-template-columns: 1fr 1fr; } }

    .hero-text { animation: fadeInLeft 0.8s ease both 0.2s; }
    .hero-card-wrap { animation: fadeInRight 0.8s ease both 0.4s; }

    .hero-title {
      font-size: clamp(1.9rem, 5vw, 3.5rem);
      font-weight: 900; line-height: 1.15; color: #fff;
      margin-bottom: 1rem;
    }
    .hero-desc {
      color: #94a3b8; font-size: clamp(0.9rem, 2vw, 1.1rem);
      max-width: 38rem; margin-bottom: 1.5rem; line-height: 1.7;
    }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .trust-row { display: flex; align-items: center; gap: 1rem; margin-top: 1.75rem; }

    /* ─── BADGE ─────────────────────────────────────────────────── */
    .badge-pulse { animation: fadeInUp 0.6s ease both 0.1s; }

    /* ─── LOGO FLOAT ────────────────────────────────────────────── */
    .logo-float { animation: logoFloat 4s ease-in-out infinite; }

    /* ─── GRADIENT TEXT ─────────────────────────────────────────── */
    .gradient-text {
      background: linear-gradient(135deg, #a78bfa, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ─── CTA BUTTONS ───────────────────────────────────────────── */
    .cta-primary {
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      box-shadow: 0 0 30px rgba(124,58,237,0.4);
      transition: all 0.3s ease; text-decoration: none;
    }
    .cta-primary:hover { box-shadow: 0 0 50px rgba(124,58,237,0.6); }
    .cta-secondary {
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.04);
      text-decoration: none; color: #e2e8f0;
    }
    .cta-secondary:hover { border-color: rgba(139,92,246,0.5); background: rgba(139,92,246,0.08); }

    /* ─── HERO CARD ─────────────────────────────────────────────── */
    .hero-card {
      background: linear-gradient(155deg, rgba(22,17,33,0.95), rgba(11,5,20,0.95));
      backdrop-filter: blur(12px);
    }

    /* ─── WAVE ──────────────────────────────────────────────────── */
    .wave { display:flex; align-items:flex-end; gap:0.35rem; height:3.3rem; }
    .wave span { width:0.42rem; border-radius:9999px; background:linear-gradient(to top,#7c3aed,#a855f7); animation:waveBounce 1.1s ease-in-out infinite; }
    .wave span:nth-child(2){animation-delay:0.1s} .wave span:nth-child(3){animation-delay:0.2s}
    .wave span:nth-child(4){animation-delay:0.3s} .wave span:nth-child(5){animation-delay:0.4s}
    .wave span:nth-child(6){animation-delay:0.5s} .wave span:nth-child(7){animation-delay:0.6s}
    .wave span:nth-child(8){animation-delay:0.7s} .wave span:nth-child(9){animation-delay:0.8s}

    /* ─── TYPING TEXT ───────────────────────────────────────────── */
    .typing-text {
      overflow:hidden; white-space:nowrap; border-right:2px solid #a78bfa;
      animation: typing 4s steps(60) infinite, blink 0.7s step-end infinite;
      max-width:100%;
    }

    /* ─── RECORDING BADGE ───────────────────────────────────────── */
    .recording-badge { animation: pulse-badge 2s ease-in-out infinite; }

    /* ─── STAT BOX ──────────────────────────────────────────────── */
    .stat-box { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); transition: all 0.3s ease; }
    .stat-box:hover { background:rgba(124,58,237,0.08); border-color:rgba(124,58,237,0.3); transform:translateY(-2px); }

    /* ─── FLOAT BADGES ──────────────────────────────────────────── */
    .float-badge {
      position:absolute; background:rgba(17,14,30,0.92);
      border:1px solid rgba(167,139,250,0.25); backdrop-filter:blur(8px);
      color:#e2d9f3; box-shadow:0 8px 32px rgba(0,0,0,0.4);
    }
    .float-badge-1 { bottom:-1.5rem; left:-1rem; animation: floatBadge1 3s ease-in-out infinite; }
    .float-badge-2 { top:-1rem; right:-1rem; animation: floatBadge2 3.5s ease-in-out infinite; }
    @media(max-width:640px){
      .float-badge-1 { bottom:-1rem; left:0; }
      .float-badge-2 { top:-0.75rem; right:0; }
    }

    /* ─── FEATURES GRID ─────────────────────────────────────────── */
    .features-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    @media(min-width:640px) { .features-grid { grid-template-columns: repeat(2,1fr); } }
    @media(min-width:1024px){ .features-grid { grid-template-columns: repeat(3,1fr); } }

    .feature-card {
      background:linear-gradient(145deg, rgba(22,17,33,0.9), rgba(15,10,25,0.9));
      position: relative;
      overflow: hidden;
      transition: transform 0.32s ease, border-color 0.32s ease, box-shadow 0.32s ease;
      box-shadow: 0 8px 20px rgba(2,6,23,0.22);
    }
    .feature-card::before {
      content: '';
      position: absolute;
      top: -40%;
      left: -130%;
      width: 55%;
      height: 180%;
      background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.12) 45%, transparent 100%);
      transform: rotate(10deg);
      transition: left 0.55s ease;
      pointer-events: none;
    }
    .feature-card:hover {
      transform: translateY(-8px) scale(1.01);
      border-color: rgba(167,139,250,0.55) !important;
      box-shadow: 0 16px 34px rgba(2,6,23,0.4), 0 0 24px rgba(124,58,237,0.2);
    }
    .feature-card:hover::before { left: 140%; }

    .feature-icon {
      background:linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2));
      border:1px solid rgba(124,58,237,0.2);
      transition: transform 0.32s ease, box-shadow 0.32s ease, border-color 0.32s ease, background 0.32s ease;
    }
    .feature-card:hover .feature-icon {
      transform: translateY(-2px) rotate(-5deg) scale(1.08);
      border-color: rgba(167,139,250,0.48);
      background: linear-gradient(135deg, rgba(124,58,237,0.34), rgba(6,182,212,0.28));
      box-shadow: 0 8px 18px rgba(124,58,237,0.24);
    }
    .material-symbols-outlined {
      font-family: 'Material Symbols Outlined';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }
    .feature-icon-symbol {
      font-size: 1.6rem;
      line-height: 1;
      font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
      color: #ddd6fe;
      transition: transform 0.3s ease, color 0.3s ease;
    }
    .feature-card:hover .feature-icon-symbol { transform: scale(1.08); color: #ffffff; }
    .feature-card h3,
    .feature-card p { transition: color 0.28s ease, transform 0.28s ease; }
    .feature-card:hover h3 { color: #c4b5fd; transform: translateX(2px); }
    .feature-card:hover p { color: #cbd5e1; transform: translateX(2px); }

    /* ─── STATS BANNER ──────────────────────────────────────────── */
    .stats-banner {
      background:linear-gradient(135deg, rgba(124,58,237,0.1), rgba(6,182,212,0.05));
      backdrop-filter:blur(8px);
      box-shadow: 0 16px 40px rgba(2,6,23,0.28);
    }
    .stats-banner > div {
      padding: 0.85rem 0.65rem;
      border-radius: 1rem;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(15,23,42,0.16);
      transition: transform 0.3s ease, border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
      animation: statFloat 4.5s ease-in-out infinite;
    }
    .stats-banner > div:nth-child(2) { animation-delay: 0.2s; }
    .stats-banner > div:nth-child(3) { animation-delay: 0.4s; }
    .stats-banner > div:nth-child(4) { animation-delay: 0.6s; }
    .stats-banner > div:hover {
      transform: translateY(-6px) scale(1.02);
      border-color: rgba(167,139,250,0.45);
      background: rgba(76,29,149,0.2);
      box-shadow: 0 12px 24px rgba(15,23,42,0.35);
    }
    .stats-banner > div p:first-child,
    .stats-banner > div p:last-child { transition: transform 0.28s ease, color 0.28s ease; }
    .stats-banner > div:hover p:first-child { transform: scale(1.04); }
    .stats-banner > div:hover p:last-child { color: #d1d5db; }

    /* ─── PRICING GRID ──────────────────────────────────────────── */
    .pricing-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
    @media(min-width:768px){ .pricing-grid { grid-template-columns: repeat(3,1fr); } }

    .pricing-card {
      background:linear-gradient(145deg, rgba(22,17,33,0.9), rgba(15,10,25,0.9));
      border-color:rgba(255,255,255,0.08);
      position: relative;
      overflow: hidden;
      transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
    }
    .pricing-card::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      background: linear-gradient(130deg, rgba(167,139,250,0), rgba(167,139,250,0.2), rgba(56,189,248,0));
      opacity: 0;
      transition: opacity 0.35s ease;
      pointer-events: none;
    }
    .pricing-card:hover {
      transform: translateY(-8px);
      border-color: rgba(167,139,250,0.4);
      box-shadow: 0 18px 36px rgba(2,6,23,0.42);
    }
    .pricing-card:hover::before { opacity: 1; }
    .pricing-card li { transition: transform 0.25s ease, color 0.25s ease; }
    .pricing-card:hover li { color: #e2e8f0; }
    .pricing-card:hover li:hover { transform: translateX(4px); }

    .pricing-featured {
      border-color:rgba(124,58,237,0.5) !important;
      box-shadow:0 0 40px rgba(124,58,237,0.15);
      animation: featuredPulse 3.2s ease-in-out infinite;
    }
    .featured-badge { background:linear-gradient(135deg,#7c3aed,#6d28d9); color:white; }

    /* ─── CTA FINAL ─────────────────────────────────────────────── */
    .cta-final {
      background:linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,210,0.06));
      backdrop-filter:blur(8px);
      position: relative;
      overflow: hidden;
      transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
    }
    .cta-final::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 20% 20%, rgba(167,139,250,0.2), transparent 45%);
      opacity: 0.75;
      pointer-events: none;
      animation: ctaGlow 6s ease-in-out infinite;
    }
    .cta-final:hover {
      transform: translateY(-4px);
      border-color: rgba(167,139,250,0.4);
      box-shadow: 0 18px 38px rgba(2,6,23,0.35);
    }

    .footer-soft {
      opacity: 0.9;
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .footer-soft:hover {
      opacity: 1;
      transform: translateY(-2px);
    }

    /* ─── REVEAL ────────────────────────────────────────────────── */
    .reveal { opacity:0; transform:translateY(30px); transition:opacity 0.7s ease, transform 0.7s ease; }
    .reveal.visible { opacity:1; transform:translateY(0); }

    /* ─── KEYFRAMES ─────────────────────────────────────────────── */
    @keyframes drift {
      0%,100%{ transform:translateY(0) scale(1); }
      50%{ transform:translateY(-16px) scale(1.08); }
    }
    @keyframes waveBounce {
      0%,100%{ height:0.7rem; opacity:0.6; }
      50%{ height:3.1rem; opacity:1; }
    }
    @keyframes float-up {
      0%{ transform:translateY(100vh) scale(0); opacity:0; }
      10%{ opacity:1; } 90%{ opacity:0.5; }
      100%{ transform:translateY(-10vh) scale(1); opacity:0; }
    }
    @keyframes slideDown {
      from{ opacity:0; transform:translateY(-20px); }
      to{ opacity:1; transform:translateY(0); }
    }
    @keyframes fadeInLeft {
      from{ opacity:0; transform:translateX(-40px); }
      to{ opacity:1; transform:translateX(0); }
    }
    @keyframes fadeInRight {
      from{ opacity:0; transform:translateX(40px); }
      to{ opacity:1; transform:translateX(0); }
    }
    @keyframes fadeInUp {
      from{ opacity:0; transform:translateY(20px); }
      to{ opacity:1; transform:translateY(0); }
    }
    @keyframes logoFloat {
      0%,100%{ transform:translateY(0); }
      50%{ transform:translateY(-5px); }
    }
    @keyframes typing {
      0%,100%{ width:0; }
      20%,80%{ width:100%; }
    }
    @keyframes blink {
      0%,100%{ border-color:transparent; }
      50%{ border-color:#a78bfa; }
    }
    @keyframes pulse-badge {
      0%,100%{ opacity:1; }
      50%{ opacity:0.6; }
    }
    @keyframes floatBadge1 {
      0%,100%{ transform:translateY(0) rotate(-2deg); }
      50%{ transform:translateY(-8px) rotate(1deg); }
    }
    @keyframes floatBadge2 {
      0%,100%{ transform:translateY(0) rotate(2deg); }
      50%{ transform:translateY(-10px) rotate(-1deg); }
    }
    @keyframes scrollHint {
      0%{ opacity:0; transform:rotate(45deg) translateY(-4px); }
      50%{ opacity:1; }
      100%{ opacity:0; transform:rotate(45deg) translateY(4px); }
    }
    @keyframes statFloat {
      0%,100%{ transform: translateY(0); }
      50%{ transform: translateY(-4px); }
    }
    @keyframes featuredPulse {
      0%,100%{ box-shadow: 0 0 40px rgba(124,58,237,0.15); }
      50%{ box-shadow: 0 0 55px rgba(124,58,237,0.32); }
    }
    @keyframes ctaGlow {
      0%,100%{ transform: translateX(0) translateY(0); opacity: 0.55; }
      50%{ transform: translateX(8px) translateY(-6px); opacity: 0.95; }
    }

    @media (prefers-reduced-motion: reduce) {
      .stats-banner > div,
      .pricing-featured,
      .cta-final::after {
        animation: none !important;
      }
    }
  `]
})
export class LandingComponent implements OnInit, AfterViewInit {

  particles: string[] = [];
  seeds = ['Alex', 'Maria', 'Juan', 'Sofia', 'Pedro'];
  isScrolled = false;
  menuOpen = false;

  features = [
    { icon: 'mic', title: 'Captura de Voz', desc: 'Graba ideas al instante desde cualquier dispositivo. MP3 optimizado con subida automática a la nube.' },
    { icon: 'psychology', title: 'Análisis con IA', desc: 'Transcripción automática y generación de resúmenes ejecutivos, tareas y mapas mentales con un clic.' },
    { icon: 'folder_managed', title: 'Organización Inteligente', desc: 'Carpetas, etiquetas y búsqueda semántica. Encuentra cualquier idea en segundos.' },
    { icon: 'account_tree', title: 'Mapas Mentales', desc: 'Convierte automáticamente tus ideas habladas en diagramas visuales interactivos con Mermaid.js.' },
    { icon: 'monitoring', title: 'Dashboard Completo', desc: 'Panel web responsive con métricas, historial y acceso a todos tus materiales organizados.' },
    { icon: 'verified_user', title: 'Seguridad Total', desc: 'Autenticación JWT, cifrado AES-256 y cumplimiento GDPR/HIPAA para proteger tus datos.' },
  ];

  stats = [
    { value: '+2,400', label: 'Usuarios activos' },
    { value: '98%',    label: 'Precisión de transcripción' },
    { value: '<60s',   label: 'Procesamiento de audio' },
    { value: '10k+',   label: 'Usuarios simultáneos' },
  ];

  plans = [
    {
      name: 'Free', desc: 'Para empezar sin compromiso', price: '$0', featured: false, cta: 'Empezar gratis',
      features: ['5 grabaciones/mes', 'Transcripción básica', '500MB almacenamiento', 'Dashboard web']
    },
    {
      name: 'Pro', desc: 'Para profesionales exigentes', price: '$12', featured: true, cta: 'Comenzar Pro',
      features: ['Grabaciones ilimitadas', 'IA completa + mapas mentales', '10GB almacenamiento', 'Exportar PDF/TXT', 'Soporte prioritario']
    },
    {
      name: 'Business', desc: 'Para equipos y empresas', price: '$39', featured: false, cta: 'Contactar ventas',
      features: ['Todo lo de Pro', 'Usuarios ilimitados', 'SSO + roles avanzados', 'API access', 'SLA garantizado']
    },
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  toggleMenu() { this.menuOpen = !this.menuOpen; }

  ngOnInit() {
    this.particles = Array.from({ length: 18 }, () => {
      const size = Math.random() * 4 + 2;
      const left = Math.random() * 100;
      const duration = Math.random() * 20 + 15;
      const delay = Math.random() * 15;
      return `left:${left}%;width:${size}px;height:${size}px;animation-duration:${duration}s;animation-delay:-${delay}s`;
    });
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    // ── Header se oscurece al hacer scroll ──
    const scrollEl = document.querySelector('.scroll-container');
    if (scrollEl) {
      scrollEl.addEventListener('scroll', () => {
        this.isScrolled = scrollEl.scrollTop > 40;
      });
    }

    // ── Scroll reveal ──
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
      }, { root: scrollEl as Element, threshold: 0.15 });
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    // ── Counters ──
    document.querySelectorAll<HTMLElement>('.counter').forEach(el => {
      const target = parseInt(el.getAttribute('data-target') ?? '0', 10);
      let current = 0;
      const step = Math.ceil(target / 40);
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current.toString();
        if (current >= target) clearInterval(interval);
      }, 40);
    });

    // ── Smooth scroll para links del nav hacia snap sections ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        e.preventDefault();
        const id = (anchor as HTMLAnchorElement).getAttribute('href')!.slice(1);
        const target = document.getElementById(id);
        if (target && scrollEl) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
}