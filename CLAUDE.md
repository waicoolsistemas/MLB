# Softball League Manager - Frontend

Sistema de administracion de ligas de softball/beisbol. Panel multi-rol (super_admin, admin, manager) para gestionar ligas, temporadas, categorias, equipos, jugadores, juegos, estadisticas, pagos y playoffs.

> La documentacion del backend se encuentra en `server/CLAUDE.md`.

## Stack Tecnologico

- **Framework:** Vue 3 (Composition API, `<script setup lang="ts">`)
- **Lenguaje:** TypeScript (estricto)
- **Build Tool:** Vite 5
- **State Management:** Pinia (Composition API stores)
- **Router:** Vue Router 4 (history mode)
- **HTTP Client:** Axios (con interceptores de refresh token)
- **CSS:** TailwindCSS 3 (utility-first, tema oscuro)
- **Base de Datos (directa):** Supabase JS Client (solo para acceso directo a storage)
- **Fuente:** Inter (Google Fonts, pesos: 400, 600, 700, 800)

## Comandos

```bash
npm run dev      # Servidor de desarrollo Vite (proxy /api -> localhost:3001)
npm run build    # vue-tsc -b && vite build
npm run preview  # Preview del build de produccion
```

## Estructura de Directorios

```
src/
├── main.ts                    # Entry point: crea app, pinia, router, inicializa token
├── App.vue                    # Root component: solo <RouterView />
├── style.css                  # Estilos globales y clases utilitarias (Tailwind layers)
├── vite-env.d.ts              # Tipos de Vite
├── assets/                    # Assets estaticos (vue.svg)
├── components/                # Componentes reutilizables y modales por dominio
│   ├── BaseButton.vue         # Boton con variantes: primary, secondary, ghost + loading state
│   ├── BaseInput.vue          # Input con label, error, v-model
│   ├── HelloWorld.vue         # (sin uso activo)
│   ├── categories/            # CategoryFormModal.vue
│   ├── games/                 # BoxScoreView, CalendarGameDetail, GameFormModal, GenerateFixtureModal, MatchdayFormModal, ScoreModal
│   ├── leagues/               # AssignAdminModal, LeagueFormModal
│   ├── payments/              # PaymentFormModal, TeamFeeModal
│   ├── players/               # PlayerFormModal, PlayerViewModal
│   ├── playoffs/              # BracketSeriesCard, PlayoffConfigModal, TeamSelectorModal
│   ├── seasons/               # SeasonFormModal
│   └── teams/                 # ManagerCredentialsModal, TeamFormModal
├── layouts/
│   ├── AuthLayout.vue         # Layout de login/register (fondo oscuro, card centrada)
│   └── DashboardLayout.vue    # Layout principal con sidebar + content area (responsive)
├── router/
│   └── index.ts               # Definicion de rutas + navigation guards
├── services/
│   ├── api.ts                 # Instancia Axios, interceptor de refresh token, setAuthToken()
│   ├── authService.ts         # Login, register, logout, getMe (tipos: AuthUser, AuthResponse)
│   ├── leagueService.ts       # CRUD completo: ligas, temporadas, categorias, equipos, jugadores, juegos, matchdays, pagos, standings, stats, playoffs, parents
│   ├── managerService.ts      # API del manager: my-teams, roster, games, standings, stats
│   └── supabase.ts            # Cliente Supabase (solo para acceso directo a storage/queries)
├── stores/
│   ├── auth.ts                # Autenticacion: user, tokens, login, logout, role helpers
│   ├── categoryContext.ts     # Contexto de categoria activa en sidebar (seasonId, categoryId, etc.)
│   ├── leagues.ts             # Lista de ligas para super_admin
│   ├── manager.ts             # Store del manager: equipos, roster, juegos, standings, stats (cache por teamId)
│   └── myLeague.ts            # Store principal del admin: liga, equipos, jugadores, juegos, matchdays, standings, pagos, stats, playoffs (cache inteligente por categoryId/teamId)
└── views/
    ├── DashboardView.vue      # Panel de control (redirect segun rol)
    ├── LoginView.vue          # Formulario de login
    ├── RegisterView.vue       # Formulario de registro
    ├── admin/                 # Vistas del admin de liga
    │   ├── MyLeagueView.vue               # Vista principal de "Mi Liga"
    │   ├── SeasonDetailView.vue           # Detalle de temporada con categorias
    │   ├── CategoryDetailView.vue         # Layout wrapper para tabs de categoria
    │   ├── CategoryOverviewView.vue       # Resumen de la categoria
    │   ├── CategoryTeamsView.vue          # Gestion de equipos
    │   ├── CategoryGamesView.vue          # Gestion de juegos por jornada
    │   ├── CategoryCalendarView.vue       # Vista calendario de juegos
    │   ├── CategoryStandingsView.vue      # Tabla de posiciones
    │   ├── CategoryStatsView.vue          # Captura de metricas por juego
    │   ├── CategoryPlayerStatsView.vue    # Estadisticas de jugadores por equipo
    │   ├── CategoryLeadersView.vue        # Lideres estadisticos
    │   ├── CategoryPaymentsView.vue       # Gestion de pagos y cuotas
    │   ├── TeamPlayersView.vue            # Jugadores de un equipo especifico
    │   ├── PlayoffsView.vue               # Wrapper de tabs para playoffs
    │   ├── PlayoffSetupView.vue           # Configuracion de playoffs
    │   ├── PlayoffBracketView.vue         # Visualizacion del bracket
    │   ├── PlayoffGamesView.vue           # Juegos de playoffs
    │   ├── PlayoffStandingsView.vue       # Posiciones de playoffs
    │   ├── PlayoffStatsView.vue           # Estadisticas de playoffs
    │   └── PlayoffLeadersView.vue         # Lideres de playoffs
    ├── manager/               # Vistas del manager
    │   ├── ManagerTeamsView.vue           # Lista de equipos asignados
    │   ├── ManagerTeamDashboard.vue       # Dashboard del equipo
    │   ├── ManagerRosterView.vue          # Roster del equipo
    │   ├── ManagerGamesView.vue           # Juegos del equipo
    │   ├── ManagerStandingsView.vue       # Posiciones de la categoria
    │   └── ManagerStatsView.vue           # Estadisticas de jugadores
    └── superadmin/            # Vistas del super admin
        ├── LeaguesView.vue                # Lista de todas las ligas
        └── LeagueDetailView.vue           # Detalle de liga con temporadas y categorias
```

## Variables de Entorno

Archivo `.env` en la raiz del proyecto. Se inyectan en build time via `import.meta.env`.

| Variable | Descripcion |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anonima de Supabase |
| `VITE_API_URL` | URL base de la API (solo si el backend esta en un dominio distinto; en dev se usa el proxy de Vite) |

## Configuracion de Vite

- **Proxy:** `/api` -> `VITE_API_URL` o `http://localhost:3001` (solo en desarrollo)
- **Alias:** `@` -> `./src`
- **Plugin:** `@vitejs/plugin-vue`

## Sistema de Roles y Rutas

### super_admin
- `/leagues` - Lista y gestion de ligas
- `/leagues/:id` - Detalle de liga, temporadas, categorias, asignacion de admin

### admin
- `/my-league` - Vista de la liga asignada
- `/my-league/seasons/:seasonId` - Detalle de temporada
- `/my-league/seasons/:seasonId/categories/:categoryId/*` - Todas las vistas de categoria:
  - `overview`, `teams`, `games`, `calendar`, `standings`, `stats`, `player-stats`, `leaders`, `payments`
  - `teams/:teamId/players` - Jugadores de un equipo
  - `playoffs/*` - `setup`, `bracket`, `games`, `standings`, `stats`, `leaders`

### manager
- `/my-teams` - Lista de equipos asignados
- `/my-teams/:teamId` - Dashboard del equipo
- `/my-teams/:teamId/games` - Juegos del equipo
- `/my-teams/:teamId/standings` - Posiciones
- `/my-teams/:teamId/stats` - Estadisticas de jugadores
- `/my-teams/:teamId/roster` - Roster del equipo

### Navigation Guards

Definidos en `router/index.ts`:
- `meta.requiresAuth` - Redirige a `/login` si no esta autenticado
- `meta.requiresGuest` - Redirige a `/` si esta autenticado
- `meta.requiresRole` - Redirige a `/` si el rol no coincide

## Flujo de Autenticacion

1. Login/Register -> API retorna `{ user, access_token, refresh_token }`
2. Tokens se almacenan en `localStorage`: `access_token`, `refresh_token`, `user` (JSON)
3. `setAuthToken()` configura el header `Authorization: Bearer <token>` en Axios
4. Interceptor de Axios: en respuesta 401 (excepto endpoints de auth), intenta refresh automatico con `POST /api/auth/refresh`
5. Si el refresh falla: limpia localStorage y redirige a `/login`
6. Logout: llama a `POST /api/auth/logout`, limpia stores (myLeague, manager) y localStorage

## Patron de Stores (Pinia)

Todos los stores usan Composition API (`defineStore('name', () => { ... })`).

### Cache Inteligente (myLeague store)

El store `myLeague` es el mas complejo. Implementa cache por contexto (categoryId/teamId):

```
fetchXIfNeeded(contextId) -> si cache valido y mismo contextId, retorna cache; sino, refreshX(contextId)
refreshX(contextId) -> llama al servicio, actualiza cache y marca como loaded
invalidateX() -> marca cache como stale (teamsLoaded = false)
invalidateCategoryData() -> invalida todos los caches de la categoria activa
clear() -> limpia todo el store (usado en logout)
```

Recursos cacheados: league, teams, players, matchdays, games, standings, payments, statsSummary, playoffConfig, playoffBracket, playoffStandings.

### Store `manager`

Similar al patron de myLeague pero orientado a las operaciones del manager. Cache por teamId para: roster, games, standings, stats.

### Store `categoryContext`

Almacena el contexto de la categoria activa en el sidebar (seasonId, seasonName, categoryId, categoryName, categoryIsActive). Se usa para mostrar los links de navegacion de la categoria.

## Sistema de Diseno

### Colores (Tailwind custom)

```
navy:     #0A0E1A (950) -> #3D4A5A (500)  // Fondos oscuros
cardinal: #F5253C (400) -> #7F0A1D (800)  // Rojo primario (acciones, CTA)
gold:     #FADA6A (300) -> #C99E20 (600)  // Dorado secundario (acciones secundarias, bordes)
```

### Clases Utilitarias CSS

```css
.btn-primary    // bg-cardinal-600, hover/active/focus states
.btn-secondary  // border-gold-400, hover rellena dorado
.btn-ghost      // transparente, hover bg-navy-700
.input-field    // bg-navy-700, border-navy-600, focus border-cardinal-600
.card           // bg-navy-800, border-navy-600, rounded-xl
```

### Tema

- **Color scheme:** Dark por defecto (`color-scheme: dark`)
- **Fondo base:** `bg-navy-950` (`#0A0E1A`)
- **Texto base:** `text-white`
- **Fuente:** Inter, system-ui fallback

### Componentes Base

- `BaseButton` - Props: `variant` (primary/secondary/ghost), `type`, `loading`, `disabled`, `fullWidth`
- `BaseInput` - Props: `label`, `type`, `placeholder`, `error`, `modelValue` (v-model)

## Patron de Servicios

Todos los servicios usan la instancia de Axios configurada en `api.ts`.

```typescript
// Patron tipico
async function list(): Promise<Entity[]> {
  const { data } = await api.get<{ entities: Entity[] }>('/api/resource')
  return data.entities
}
```

- `authService` - Login, register, logout, getMe
- `leagueService` - CRUD completo de todos los recursos (el servicio mas grande)
- `managerService` - Endpoints del portal de manager

### Upload de Imagenes

Las imagenes (logos de liga, fotos de jugadores) se suben como base64:
1. Frontend convierte File a base64 con FileReader
2. Envia `{ base64, content_type }` al backend
3. Backend sube a Supabase Storage (buckets: `player-photos`, `league-logos`)
4. Retorna la URL publica con cache-bust (`?t=timestamp`)

## Convenciones de Codigo

- TypeScript estricto habilitado
- Path alias `@/` para todos los imports desde `src/`
- Componentes Vue SFC con `<script setup lang="ts">`
- Los servicios retornan promesas tipadas
- Stores usan Composition API de Pinia (`defineStore('name', () => { ... })`)
- Mensajes de error de UI en espanol
- Los tipos/interfaces de datos se definen en los archivos de servicio (`leagueService.ts`, `managerService.ts`, `authService.ts`)
- No hay carpeta separada de `types/` en el frontend; los tipos viven junto a los servicios que los usan

## Base de Datos (Supabase)

### Tablas Principales

| Tabla | Descripcion |
|---|---|
| `users` | Usuarios del sistema (custom auth, no Supabase Auth) |
| `refresh_tokens` | Tokens de refresh JWT |
| `leagues` | Ligas (nombre, logo, sport_type: baseball/softball, slug) |
| `league_admins` | Relacion liga-admin (1 admin activo por liga) |
| `seasons` | Temporadas dentro de una liga |
| `categories` | Categorias dentro de una temporada (ej: "Primera Fuerza", "Veteranos") |
| `teams` | Equipos dentro de una categoria |
| `team_fees` | Cuota personalizada por equipo (override de registration_fee) |
| `payments` | Pagos registrados por equipo en una categoria |
| `players` | Jugadores de un equipo (con CURP, foto, telefono) |
| `player_parents` | Padres/tutores de un jugador |
| `games` | Juegos (temporada regular y playoffs) |
| `game_player_stats` | Estadisticas individuales por juego (batting stats) |
| `matchdays` | Jornadas (agrupacion de juegos) |
| `playoff_configs` | Configuracion de playoffs (teams_count, series_format) |
| `playoff_series` | Series del bracket (con next_series_id para avance) |
| `news` | Noticias de la liga |
| `sponsors` | Patrocinadores de la liga |

### Relaciones Clave

```
league -> seasons -> categories -> teams -> players -> player_parents
                                        -> game_player_stats
                                -> games (regular season, matchday_id)
                                -> matchdays
                                -> playoff_configs -> playoff_series -> games (playoffs)
                                -> payments
                                -> team_fees
league -> league_admins -> users
teams -> users (manager_user_id)
```

### Soft Deletes

Las tablas `games`, `game_player_stats`, `matchdays`, y `playoff_series` usan soft delete con columna `deleted_at`. Todos los queries filtran con `.is('deleted_at', null)`.

### Funciones RPC

| Funcion | Proposito |
|---|---|
| `refresh_user_token` | Rota refresh token atomicamente |
| `reset_manager_password` | Genera nueva contrasena para manager |
| `save_game_stats` | Upsert de estadisticas de jugadores en un juego |
| `process_forfeit` | Procesa un forfeit con stats para los ganadores |
| `get_player_stats_by_team` | Estadisticas agregadas de jugadores de un equipo |
| `get_playoff_player_stats_by_team` | Stats de playoffs por equipo |
| `soft_delete_matchday` | Elimina jornada y sus juegos/stats (soft) |
| `get_my_league` | Retorna la liga completa del admin con temporadas y categorias |

### Storage Buckets

| Bucket | Contenido |
|---|---|
| `player-photos` | Fotos de jugadores |
| `league-logos` | Logos de ligas |
| `news-images` | Imagenes de noticias |
| `sponsor-images` | Logos de patrocinadores |
