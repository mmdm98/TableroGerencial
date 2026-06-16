# Guía de Desarrollo: Dashboard EVA/LUZ

## Contexto del Negocio
Dashboard gerencial para analizar el rendimiento, la evolución del sentimiento y la tipificación de motivos de contacto gestionados por agentes conversacionales (LUZ/EVA). Los datos base provienen de archivos de interacciones mensuales cargados vía CSV/Excel.

## Comandos del Proyecto
- Servidor de desarrollo local: `npm run dev`
- Instalación de dependencias: `npm install`
- Compilación: `npm run build`
- Deploy a GitHub Pages: `npm run deploy` (ejecuta build + gh-pages push automáticamente)

## Stack
- **Frontend:** React 18 + Vite 6, Tailwind CSS 3 (`darkMode: 'class'`)
- **Gráficos:** ApexCharts (`react-apexcharts`) — línea, donut, barras horizontales, area, heatmap
- **Base de datos:** Supabase (`@supabase/supabase-js`) — PostgreSQL via PostgREST
- **Parseo de archivos:** PapaParse (CSV), SheetJS/xlsx (Excel)
- **Export PDF:** html2canvas + jsPDF
- **Deploy:** gh-pages → GitHub Pages

## Reglas de Arquitectura y Código

### General
- Componentes funcionales React con Hooks. Nunca clases.
- Tailwind CSS para todo — sin CSS-in-JS ni módulos CSS separados.
- Nombres de componentes en PascalCase (`KpiCards.jsx`). Lógica de negocio en español.

### Supabase / Paginación (CRÍTICO)
- **Límite implícito de 1000 filas en SELECT.** Siempre usar paginación con `.range(from, from + PAGE_SIZE - 1)` en un loop `while`.
- `PAGE_SIZE = 1000`. Romper el loop cuando `page.length < PAGE_SIZE`.
- Upsert con `onConflict: 'id_llamada'` para deduplicación en cargas repetidas.
- Para cargar opciones de dropdowns: `fetchDistinct(column)` también paginado.

### Datos y Transformaciones
- `mapearFila.js`: convierte filas crudas del CSV/Excel al esquema de Supabase.
  - Fechas: `DD-MM-YYYY` → `YYYY-MM-DD`
  - `duracion_minutos`: segundos / 60, redondeado a 2 decimales
  - `sentimiento_categoria`: basado en `sentimiento_cliente_score` numérico
    - `> 0` → Positivo, `=== 0` → Neutro, `< 0` → Negativo, `null` → No Medido
- `filaValida(fila)`: descarta filas sin `id_llamada` o `fecha_llamada`.

### Paleta de Colores (`src/utils/palette.js`)
- `PALETTE`: array de 8 colores ordenados — siempre importar desde aquí, nunca hardcodear hexadecimales en componentes de gráficos.
- `SENTIMENT_COLORS`: colores semánticos para Positivo/Neutro/Negativo/No Medido.
- Las categorías reciben su color según su posición en orden alfabético dentro del array de labels. Esto garantiza que línea y donut/pie usen siempre el mismo color para la misma categoría.

### Dark Mode
- `useDarkMode` hook en `src/hooks/useDarkMode.js`: persiste en `localStorage`, detecta preferencia del sistema.
- Tailwind `darkMode: 'class'` — toggle en `document.documentElement.classList`.
- ApexCharts en modo oscuro: `theme: { mode: 'dark' }`, `chart.background: 'transparent'`, `grid.borderColor: '#374151'`.
- Usar `key={...-${dark}}` en ReactApexChart para forzar remount al cambiar modo.

### Cross-Filter (Interactividad)
- Estado `xFilter = { necesidad, motivo, justificacion }` en `App.jsx`.
- Datos derivados en cascada:
  1. `filteredByNecesidad` = `data` filtrado por `xFilter.necesidad`
  2. `filteredByMotivo` = filtrado además por `xFilter.motivo`
  3. `fullyFiltered` = filtrado además por `xFilter.justificacion`
- `NecesidadSection` recibe `data` completo (muestra contexto) + callbacks de selección.
- `MotivosSection` recibe `filteredByNecesidad` + callbacks de selección.
- `SentimientoSection` y `KpiCards` reciben `fullyFiltered`.
- Al limpiar un nivel superior, los niveles inferiores se resetean.
- Usar `key={...-${selectedX ?? 'all'}-${dark}}` en cada gráfico clickeable para evitar closures obsoletos en los event handlers de ApexCharts.
- `legend.onItemClick.toggleDataSeries: false` para desactivar el toggle nativo de leyendas.

### Export PDF
- `exportDashboardPdf()` en `src/utils/exportPdf.js`.
- Captura `<div id="dashboard-content">` con html2canvas (scale: 2).
- Pagina automáticamente en A4 portrait.
- Nombre del archivo: `dashboard-eva-luz-DD-MM-YYYY.pdf`.
