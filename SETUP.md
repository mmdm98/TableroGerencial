# Guía de Setup — Tablero Gerencial EVA/LUZ

Todo lo necesario para retomar el desarrollo en una PC nueva tras clonar el repositorio.

---

## 1. Prerequisitos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | cualquiera | `git -v` |
| Cuenta GitHub | — | acceso a `mmdm98/TableroGerencial` |

---

## 2. Clonar e instalar

```bash
git clone https://github.com/mmdm98/TableroGerencial.git
cd TableroGerencial
npm install --legacy-peer-deps
```

> **`--legacy-peer-deps` es obligatorio** porque `@nivo/sankey` tiene conflicto de peer deps con React 18. Sin esa flag, `npm install` falla.

---

## 3. Variables de entorno (Supabase)

Crear el archivo `.env.local` en la raíz del proyecto (no está en el repo, nunca commitear):

```
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-del-proyecto>
```

Obtener estos valores en: **Supabase Dashboard → Settings → API**.

---

## 4. Esquema de la base de datos (Supabase)

La tabla se llama `interacciones`. Si la base está vacía o es nueva, ejecutar en el **SQL Editor de Supabase**:

```sql
CREATE TABLE IF NOT EXISTS interacciones (
  id_llamada                text PRIMARY KEY,
  fecha_llamada             date,
  agente                    text,
  duracion_minutos          numeric,
  necesidad                 text,
  motivo_necesidad          text,
  justificacion_motivo      text,
  sentimiento_cliente_score numeric,
  sentimiento_categoria     text,
  fase_inicio               text,
  fase_desarrollo           text,
  fase_cierre               text
);
```

Si la tabla ya existe pero le falta la columna `fase_desarrollo` (agregada en una versión intermedia):

```sql
ALTER TABLE interacciones
  ADD COLUMN IF NOT EXISTS fase_desarrollo text;
```

---

## 5. Autenticación

El uploader de datos está protegido por Supabase Auth (email/contraseña). El usuario debe existir en **Supabase Dashboard → Authentication → Users**. Crear usuario allí si no existe.

---

## 6. Levantar el servidor de desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173/TableroGerencial/` (el puerto puede variar si 5173 está ocupado, Vite lo indica en consola).

---

## 7. Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor local con hot-reload |
| `npm run build` | Compilación para producción en `dist/` |
| `npm run deploy` | Build + push a GitHub Pages (rama `gh-pages`) |

El sitio en producción vive en: `https://mmdm98.github.io/TableroGerencial/`

---

## 8. Cargar datos

1. Ir a la pestaña **Cargar Datos** (requiere login).
2. Subir un archivo CSV o Excel con las columnas:

| Columna en archivo | Campo en BD |
|---|---|
| `Id` | `id_llamada` (PK, deduplicación automática) |
| `Fecha llamada` | `fecha_llamada` (formato `DD-MM-YYYY`) |
| `Asesor` | `agente` |
| `Duración en seg` | `duracion_minutos` (se divide por 60) |
| `Necesidad` | `necesidad` |
| `Motivo necesidad` | `motivo_necesidad` |
| `Justificación motivo necesidad` | `justificacion_motivo` |
| `Sentimiento cliente` | `sentimiento_cliente_score` |
| `Inicio` | `fase_inicio` |
| `Desarrollo` | `fase_desarrollo` |
| `Cierre` | `fase_cierre` |

`sentimiento_categoria` se deriva automáticamente del score: `> 0` → Positivo, `= 0` → Neutro, `< 0` → Negativo, nulo → No Medido.

Las cargas son idempotentes: re-subir el mismo archivo no duplica filas (upsert por `id_llamada`).

---

## 9. Estructura del proyecto

```
src/
├── App.jsx                     # Raíz: estado global, filtros, pestañas
├── lib/
│   └── supabaseClient.js       # Cliente Supabase (lee .env.local)
├── hooks/
│   ├── useDarkMode.js          # Dark mode persistido en localStorage
│   ├── useInteracciones.js     # Fetch paginado de Supabase (PAGE_SIZE=1000)
│   └── useComparacion.js       # Fetch paralelo de dos rangos de fechas
├── utils/
│   ├── chartData.js            # Transformaciones → series para ApexCharts/Nivo
│   ├── comparacionData.js      # KPIs y series para la pestaña Comparar
│   ├── mapearFila.js           # Parser CSV/Excel → esquema BD
│   ├── palette.js              # PALETTE (8 colores) + SENTIMENT_COLORS
│   └── exportPdf.js            # Captura html2canvas → PDF A4
└── components/
    ├── FilterBar.jsx           # Barra de pestañas + filtros de fecha/agente
    ├── KpiCards.jsx            # Tarjetas KPI superiores
    ├── ChartCard.jsx           # Wrapper de tarjeta para gráficos
    ├── LoginForm.jsx           # Login con Supabase Auth
    ├── Uploader.jsx            # Carga de archivos CSV/Excel
    ├── ComparacionTab.jsx      # Pestaña "Comparar" (semanas/meses)
    └── charts/
        ├── NecesidadSection.jsx  # Línea diaria + donut por necesidad
        ├── MotivosSection.jsx    # Línea diaria + donut + barras + variación diaria
        └── SentimientoSection.jsx # Barra apilada + área % Positivo + Sankey 3 etapas
```

---

## 10. Decisiones de arquitectura relevantes

- **Paginación Supabase**: el cliente tiene límite implícito de 1000 filas por SELECT. Todos los fetches usan un loop `while` con `.range(from, from + 999)` hasta que la página devuelva menos de 1000 filas.
- **Cross-filter**: el estado `xFilter = { necesidad, motivo, justificacion }` vive en `App.jsx`. Los datos se filtran en cascada: `data` → `filteredByNecesidad` → `filteredByMotivo` → `fullyFiltered`.
- **Colores consistentes**: cada categoría recibe el color según su posición alfabética en `PALETTE`. Esto garantiza que línea y donut usen el mismo color para la misma categoría.
- **Dark mode**: Tailwind `darkMode: 'class'`. ApexCharts necesita `key={...-${dark}}` en cada `ReactApexChart` para forzar remount al cambiar tema.
- **Sankey 3 niveles**: usa `@nivo/sankey` con IDs únicos (`Inicio: Positivo`, `Desarrollo: Positivo`, `Cierre: Positivo`). Requiere que los CSV tengan columnas `Inicio`, `Desarrollo` y `Cierre`, y que la BD tenga `fase_desarrollo`.
