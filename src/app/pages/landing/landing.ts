import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="landing-shell min-h-screen text-slate-100">
      <div class="bg-orb orb-a"></div>
      <div class="bg-orb orb-b"></div>

      <header class="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div class="flex items-center gap-3">
          <img src="icons/Logo1-96.png" alt="MindVoice Logo" class="w-14 h-14 rounded-2xl shadow-lg shadow-primary/40" />
          <div>
            <p class="text-xs tracking-[0.24em] uppercase text-violet-200/85">MindVoice</p>
            <p class="font-semibold text-white">Segundo Cerebro Digital</p>
          </div>
        </div>

        <a
          routerLink="/auth"
          class="rounded-full px-5 py-2.5 bg-primary text-white font-bold hover:bg-primary-hover transition-colors"
        >
          Iniciar sesión
        </a>
      </header>

      <main class="max-w-6xl mx-auto px-6 pb-16 pt-8 md:pt-14 relative z-10">
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p class="text-sm uppercase tracking-[0.3em] text-violet-200/80 mb-4">Productividad con personalidad</p>
            <h1 class="text-4xl md:text-6xl font-black leading-tight text-balance">
              Convierte cada idea hablada
              <span class="text-primary">en accion real</span>
            </h1>
            <p class="mt-5 text-slate-300 text-lg max-w-xl">
              Captura notas de voz, obten resumentes inteligentes y organiza tareas en un solo flujo.
              Menos friccion, mas avance diario.
            </p>

            <div class="mt-8 flex flex-wrap gap-4">
              <a
                routerLink="/auth"
                class="rounded-2xl px-6 py-3 bg-gradient-to-r from-primary to-violet-500 text-white font-extrabold hover:scale-[1.02] transition-transform"
              >
                Probar ahora
              </a>
              <a
                routerLink="/dashboard"
                class="rounded-2xl px-6 py-3 border border-slate-400/30 bg-slate-900/40 backdrop-blur hover:border-cyan-300/60 transition-colors"
              >
                Ver demo interna
              </a>
            </div>
          </div>

          <div class="relative">
            <div class="hero-card rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl">
              <div class="flex items-center justify-between mb-6">
                <p class="font-semibold text-slate-200">Sesion activa</p>
                <span class="text-xs px-3 py-1 rounded-full bg-primary/25 text-violet-100">Grabando</span>
              </div>

              <div class="wave mb-6" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="stat-box rounded-2xl p-4">
                  <p class="text-xs uppercase tracking-widest text-slate-300/70">Ideas guardadas</p>
                  <p class="text-2xl font-extrabold text-white mt-1">128</p>
                </div>
                <div class="stat-box rounded-2xl p-4">
                  <p class="text-xs uppercase tracking-widest text-slate-300/70">Tareas creadas</p>
                  <p class="text-2xl font-extrabold text-white mt-1">54</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');

      .landing-shell {
        font-family: 'Sora', sans-serif;
        background:
          radial-gradient(circle at 18% 16%, rgba(124, 58, 237, 0.34), transparent 38%),
          radial-gradient(circle at 84% 20%, rgba(168, 85, 247, 0.2), transparent 35%),
          linear-gradient(140deg, #0b0514 0%, #161121 45%, #221932 100%);
        overflow: hidden;
        position: relative;
      }

      .bg-orb {
        position: absolute;
        border-radius: 9999px;
        filter: blur(30px);
        opacity: 0.45;
        animation: drift 12s ease-in-out infinite;
      }

      .orb-a {
        width: 15rem;
        height: 15rem;
        background: #7c3aed;
        top: 18%;
        left: -3rem;
      }

      .orb-b {
        width: 18rem;
        height: 18rem;
        background: #a855f7;
        bottom: -4rem;
        right: -5rem;
        animation-delay: -4s;
      }

      .hero-card {
        background: linear-gradient(155deg, rgba(22, 17, 33, 0.94), rgba(11, 5, 20, 0.94));
        backdrop-filter: blur(8px);
      }

      .wave {
        display: flex;
        align-items: end;
        gap: 0.35rem;
        height: 3.3rem;
      }

      .wave span {
        width: 0.42rem;
        border-radius: 9999px;
        background: linear-gradient(to top, #7c3aed, #a855f7);
        animation: bounce 1.1s ease-in-out infinite;
      }

      .wave span:nth-child(2) { animation-delay: 0.1s; }
      .wave span:nth-child(3) { animation-delay: 0.2s; }
      .wave span:nth-child(4) { animation-delay: 0.3s; }
      .wave span:nth-child(5) { animation-delay: 0.4s; }
      .wave span:nth-child(6) { animation-delay: 0.5s; }
      .wave span:nth-child(7) { animation-delay: 0.6s; }

      .stat-box {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      @keyframes bounce {
        0%,
        100% {
          height: 0.7rem;
          opacity: 0.65;
        }
        50% {
          height: 3.1rem;
          opacity: 1;
        }
      }

      @keyframes drift {
        0%,
        100% {
          transform: translateY(0px) scale(1);
        }
        50% {
          transform: translateY(-16px) scale(1.08);
        }
      }
    `
  ]
})
export class LandingComponent {}
