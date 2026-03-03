import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="max-w-[1000px] mx-auto w-full px-6 py-8">
      <div class="flex items-center gap-4 text-primary mb-8">
        <div class="size-10 flex items-center justify-center bg-primary/10 rounded-lg">
          <mat-icon>settings</mat-icon>
        </div>
        <h2 class="text-white text-2xl font-bold leading-tight">Configuración</h2>
      </div>

      <div class="bg-surface-dark rounded-xl border border-border-dark overflow-hidden shadow-xl">
        <div class="px-6 py-4 border-b border-border-dark flex items-center gap-2">
          <mat-icon class="text-primary">tune</mat-icon>
          <h3 class="text-lg font-bold text-white">Configuración General</h3>
        </div>
        
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
          <div class="space-y-2">
            <label for="language-select" class="text-sm font-semibold text-white">Preferencias de idioma</label>
            <select id="language-select" class="w-full bg-white/5 border border-border-dark rounded-lg text-sm text-gray-300 focus:ring-primary focus:border-primary p-2.5 outline-none">
              <option>Español (ES)</option>
              <option>Inglés (US)</option>
            </select>
            <p class="text-xs text-gray-500">Idioma principal para el procesamiento de voz a texto.</p>
          </div>
          
          <div class="space-y-2">
            <span class="text-sm font-semibold text-white block">Formato de exportación por defecto</span>
            <div class="flex gap-2">
              <button class="flex-1 py-2 px-3 border border-primary bg-primary/10 text-primary rounded-lg text-xs font-bold">PDF</button>
              <button class="flex-1 py-2 px-3 border border-border-dark text-gray-500 rounded-lg text-xs font-bold hover:bg-white/5 transition-colors">Notion</button>
              <button class="flex-1 py-2 px-3 border border-border-dark text-gray-500 rounded-lg text-xs font-bold hover:bg-white/5 transition-colors">Obsidian</button>
            </div>
            <p class="text-xs text-gray-500">Tus grabaciones se sincronizarán automáticamente en este formato.</p>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
            <div>
              <p class="text-sm font-semibold text-white">Notificaciones</p>
              <p class="text-[11px] text-gray-500">Resumen semanal por correo de tus notas de voz.</p>
            </div>
            <div class="w-10 h-5 bg-primary rounded-full relative cursor-pointer">
              <div class="absolute right-0.5 top-0.5 bg-white size-4 rounded-full shadow-sm"></div>
            </div>
          </div>
          
          <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
            <div>
              <p class="text-sm font-semibold text-white">Privacidad</p>
              <p class="text-[11px] text-gray-500">Desactivar el entrenamiento de la IA con tus datos.</p>
            </div>
            <div class="w-10 h-5 bg-gray-600 rounded-full relative cursor-pointer">
              <div class="absolute left-0.5 top-0.5 bg-white size-4 rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
        
        <div class="bg-white/5 px-6 py-4 flex justify-end gap-3 border-t border-border-dark">
          <button class="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancelar</button>
          <button class="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all">Guardar Cambios</button>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {}
