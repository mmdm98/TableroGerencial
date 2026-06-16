# PLAN DE DESARROLLO: Dashboard Gerencial EVA/LUZ

## Objetivo del Proyecto
Aplicación web estática (GitHub Pages) conectada a Supabase (PostgreSQL). Permite la carga de lotes Excel/CSV mensuales y visualiza un dashboard gerencial enfocado en segmentación de necesidades, análisis de motivos y evolución del sentimiento del cliente.

## Stack Tecnológico
- **Frontend:** React 18 + Vite 6, Tailwind CSS 3
- **Backend/DB:** Supabase (PostgreSQL + PostgREST)
- **Gráficos:** ApexCharts (react-apexcharts)
- **Parseo:** PapaParse (CSV) + SheetJS (Excel)
- **Export:** html2canvas + jsPDF
- **Deploy:** gh-pages → GitHub Pages

---

## ✅ Fase 1 — Configuración y Base de Datos
- Proyecto Vite + React + Tailwind inicializado
- Cliente Supabase configurado con variables de entorno
- Tabla `interacciones` creada en Supabase con RLS desactivado
- Columnas: `id_llamada` (PK), `fecha_llamada`, `agente`, `duracion_minutos`, `necesidad`, `motivo_necesidad`, `justificacion_motivo`, `sentimiento_cliente_score`, `sentimiento_categoria`, `fase_inicio`, `fase_cierre`

## ✅ Fase 2 — Layout y Filtros Globales
- `FilterBar.jsx`: header sticky con filtros de fecha (desde/hasta), agente y necesidad
- `MultiSelectDropdown.jsx`: dropdown multi-selección con opción "Todos"
- `useFilters.js`: hook de estado de filtros globales
- `useInteracciones.js`: hook de fetch paginado a Supabase (loop `.range()`)
- **Bug corregido:** `fetchDistinct` paginado para cargar opciones de dropdowns (evita truncar en 1000 filas)
- Filtro de agente con `defaultAllSelected=true` (vacío = todos seleccionados)

## ✅ Fase 3 — Tarjetas de KPI
- `KpiCards.jsx`: Volumen de interacciones, Duración promedio (mm:ss), % Sentimiento Positivo+Neutro
- Colores dinámicos: verde si ≥50%, rojo si <50%, gris si sin datos

## ✅ Fase 4 — Gráficos Principales
- **NecesidadSection:** línea de evolución diaria (%) + donut distribución acumulada
- **MotivosSection:** línea evolución diaria + donut distribución + barras horizontales Top 5 Justificaciones
- **SentimientoSection:** barra apilada 100% + área evolución % Positivo diario + heatmap de mutación de sentimiento

## ✅ Fase 5 — Ingesta de Datos (Uploader)
- `Uploader.jsx`: drag & drop + selección de archivo (CSV, XLSX, XLS)
- `mapearFila.js`: mapeo de columnas crudas → esquema Supabase
  - Fecha: DD-MM-YYYY → YYYY-MM-DD
  - Duración: segundos → minutos (2 decimales)
  - Sentimiento: score numérico → categoría (>0=Positivo, =0=Neutro, <0=Negativo, null=No Medido)
- Upsert con `onConflict: 'id_llamada'` para deduplicación
- Carga en lotes de 500 filas con reintentos fila por fila ante errores
- Descarga de `errores_carga.json` para diagnóstico

## ✅ Fase 6 — Modo Oscuro (Dark Mode)
- `useDarkMode.js`: toggle persistido en localStorage, respeta preferencia del sistema
- Tailwind `darkMode: 'class'` en `tailwind.config.js`
- Todos los componentes actualizados con variantes `dark:*`
- ApexCharts: `theme.mode`, `chart.background: 'transparent'`, `grid.borderColor` adaptados
- Botón sol/luna en el header (FilterBar)

## ✅ Fase 7 — Paleta Unificada y Consistencia de Colores
- `src/utils/palette.js`: paleta de 8 colores compartida por todos los gráficos
- `SENTIMENT_COLORS`: colores semánticos para las 4 categorías de sentimiento
- Labels de donut/pie ordenados alfabéticamente para coincidir con el orden de las series de línea
- La misma categoría tiene siempre el mismo color entre el gráfico de línea y el donut de la misma sección

## ✅ Fase 8 — Cross-Filter Interactivo
- Estado `xFilter = { necesidad, motivo, justificacion }` en `App.jsx`
- Clic en leyenda o sector de donut en NecesidadSection → filtra MotivosSection + SentimientoSection + KPIs
- Clic en leyenda o sector de donut en MotivosSection → filtra SentimientoSection + KPIs
- Clic en barra de Justificaciones → filtra SentimientoSection + KPIs
- Barra de filtros activos con chips removibles por nivel + contador de interacciones filtradas
- Limpiar un nivel resetea todos los niveles inferiores en cascada

## ✅ Fase 9 — Export PDF
- `src/utils/exportPdf.js`: captura `#dashboard-content` con html2canvas (2×), pagina en A4
- Botón "PDF" en el header, visible solo en el tab Dashboard
- Spinner durante la generación, botón deshabilitado para evitar doble click
- Nombre del archivo incluye fecha: `dashboard-eva-luz-DD-MM-YYYY.pdf`

## ✅ Fase 10 — Deploy en GitHub Pages
- `gh-pages` instalado como devDependency
- Scripts `predeploy` y `deploy` en `package.json`
- `homepage` configurado en `package.json`
- `vite.config.js` con `base` para ruta correcta en GitHub Pages

---

## 🔜 Próximos Pasos Sugeridos

### Mejoras de UX
- [ ] Tabla de detalle de interacciones con paginación (drill-down desde los gráficos)
- [ ] Selector de granularidad en los gráficos de línea (diario / semanal / mensual)
- [ ] Tooltips más ricos con contexto comparativo (vs. período anterior)

### Funcionalidades
- [ ] Comparación entre períodos (mes actual vs. mes anterior)
- [ ] Filtro por agente individual en el cross-filter (tercer nivel de NecesidadSection)
- [ ] Ranking de agentes por volumen y sentimiento
- [ ] Exportar datos filtrados a CSV desde el dashboard

### Infraestructura
- [ ] Variables de entorno de producción en GitHub Actions
- [ ] CI/CD automático al hacer push a `main`
- [ ] Row Level Security (RLS) con roles de solo lectura para el dashboard
