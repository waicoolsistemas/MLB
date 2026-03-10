# Softball League Manager - Backend API

API REST para el sistema de administracion de ligas de softball/beisbol. Gestiona autenticacion, ligas, temporadas, categorias, equipos, jugadores, juegos, estadisticas, pagos y playoffs.

> La documentacion del frontend se encuentra en `../CLAUDE.md`.

## Stack Tecnologico

- **Runtime:** Node.js (ES2022 modules)
- **Framework:** Express.js
- **Lenguaje:** TypeScript (estricto, ESM)
- **Base de Datos:** Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Autenticacion:** JWT (custom, no Supabase Auth)
- **Validacion:** Zod
- **Hashing:** bcryptjs (12 rounds)
- **HTTP Client (Supabase):** undici (pool: 20 conexiones, retry con backoff exponencial)

## Comandos

```bash
npm run dev      # tsx watch src/index.ts (development con hot reload)
npm run build    # tsc (compila a dist/)
npm run start    # node dist/index.js (produccion)
```

## Estructura de Directorios

```
server/
├── package.json           # Dependencias y scripts
├── tsconfig.json          # Config TypeScript (ES2022, ESM, outDir: dist)
└── src/
    ├── index.ts           # Entry point: Express app setup, routes registration, server start
    ├── db.ts              # Cliente Supabase singleton (service_role_key, undici pooling)
    ├── jwt.ts             # Generacion/verificacion de JWT (access: 15min, refresh: 7d)
    ├── middleware.ts       # authenticateToken, requireRole middlewares
    ├── types.ts           # Tipos compartidos (UserPayload)
    └── routes/
        ├── auth.ts        # Registro, login, refresh, logout, me
        ├── leagues.ts     # CRUD ligas, logo upload/delete, admin assign/remove, my-league
        ├── seasons.ts     # CRUD temporadas
        ├── categories.ts  # CRUD categorias
        ├── teams.ts       # CRUD equipos, reset manager password
        ├── players.ts     # CRUD jugadores, foto upload, parents CRUD
        ├── games.ts       # CRUD juegos, generate fixture (round-robin), delete all
        ├── matchdays.ts   # CRUD jornadas
        ├── standings.ts   # Tabla de posiciones (calculada en runtime)
        ├── stats.ts       # Estadisticas de jugadores, save stats (RPC), forfeit (RPC)
        ├── playoffs.ts    # Config, generate bracket, bracket view, advance series, standings, player stats
        ├── payments.ts    # CRUD pagos, team fees
        └── manager.ts     # Portal de manager: my-teams, roster, games, standings, stats
```

## Variables de Entorno

| Variable | Requerida | Default | Descripcion |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Si | - | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Si* | - | Service role key (prioridad) |
| `VITE_SUPABASE_ANON_KEY` | Si* | - | Anon key (fallback si no hay service_role_key) |
| `JWT_ACCESS_SECRET` | Si | - | Secreto para firmar access tokens |
| `JWT_REFRESH_SECRET` | Si | - | Secreto para firmar refresh tokens (usado en RPC) |
| `PORT` | No | `3001` | Puerto del servidor |
| `NODE_ENV` | No | - | Entorno (development/production) |

(*) Se necesita al menos uno de los dos. `SUPABASE_SERVICE_ROLE_KEY` tiene prioridad.

Las variables se cargan desde `../.env` (raiz del proyecto) usando `dotenv` con `path: '../.env'`.

## Configuracion del Servidor

```
Puerto:        PORT || 3001
CORS:          Origin reflection, credentials: true
Body limit:    5 MB JSON
Health check:  GET /api/health -> { status: 'ok', timestamp }
```

## Sistema de Autenticacion JWT

### Tokens

| Token | Duracion | Almacenamiento | Contenido |
|---|---|---|---|
| Access Token | 15 minutos | Header `Authorization: Bearer <token>` | `{ sub: userId, email, role, full_name }` |
| Refresh Token | 7 dias | Tabla `refresh_tokens` | 64 bytes hex aleatorio |

### Flujo

1. **Login/Register:** Valida credenciales -> genera access_token + refresh_token -> almacena refresh en DB
2. **Request autenticado:** Middleware `authenticateToken` extrae Bearer token, verifica con `JWT_ACCESS_SECRET`, adjunta `req.user`
3. **Token expirado:** Frontend recibe 401 -> llama `POST /api/auth/refresh` con refresh_token
4. **Refresh:** RPC `refresh_user_token` rota el refresh token atomicamente, genera nuevo access_token
5. **Logout:** Elimina refresh token de la DB

### Middleware

- `authenticateToken` - Extrae y verifica JWT del header Authorization. Adjunta `req.user: UserPayload`
- `requireRole(...roles)` - Verifica que `req.user.role` este en la lista de roles permitidos

## Patron de Autorizacion

### Jerarquia de Permisos

```
super_admin > admin > manager > (sin auth)
```

### Funciones Helper de Verificacion

Cada archivo de rutas implementa su propia funcion de verificacion segun el recurso:

| Funcion | Archivo | Verifica |
|---|---|---|
| `canManageLeague(userId, role, leagueId)` | seasons.ts | super_admin O admin de esa liga |
| `canManageSeason(userId, role, seasonId)` | categories.ts | super_admin O admin de la liga del season |
| `canManageCategory(userId, role, categoryId)` | teams, games, matchdays, standings, playoffs, payments | super_admin O admin de la liga via season -> category chain |
| `canManageTeam(userId, role, teamId)` | players.ts | super_admin O admin via team -> category -> season -> league chain, O manager dueno del equipo |
| `verifyTeamOwnership(userId, teamId)` | manager.ts | manager que es dueno del equipo (manager_user_id) |

### Cadena de Propiedad

Para verificar que un admin tiene acceso a un recurso, se sigue la cadena:
```
recurso -> team/category -> season -> league -> league_admins (user_id, is_active)
```

## Catalogo de Endpoints API

Todos los endpoints estan prefijados con `/api`.

### Auth (`/api/auth`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| POST | `/register` | No | - | Registrar usuario |
| POST | `/login` | No | - | Login con email/password |
| POST | `/refresh` | No | - | Refrescar access token con refresh_token |
| POST | `/logout` | Si | Cualquiera | Cerrar sesion (elimina refresh token) |
| GET | `/me` | Si | Cualquiera | Obtener usuario actual |

### Leagues (`/api/leagues`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/my-league` | Si | admin, super_admin | Liga del admin autenticado (RPC get_my_league) |
| GET | `/` | Si | super_admin | Listar todas las ligas |
| GET | `/:id` | Si | super_admin | Detalle de liga con seasons/categories/teams |
| POST | `/` | Si | super_admin | Crear liga |
| PUT | `/:id` | Si | super_admin | Actualizar liga |
| POST | `/:id/logo` | Si | super_admin | Subir logo (base64: JPEG/PNG/WebP, max 2MB) |
| DELETE | `/:id/logo` | Si | super_admin | Eliminar logo |
| POST | `/:leagueId/admin` | Si | super_admin | Asignar admin (crea usuario con rol admin) |
| GET | `/:leagueId/admin` | Si | super_admin | Obtener admin de liga |
| DELETE | `/:leagueId/admin` | Si | super_admin | Remover admin (soft: is_active=false) |

### Seasons (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/leagues/:leagueId/seasons` | Si | admin+ | Listar temporadas de una liga |
| POST | `/leagues/:leagueId/seasons` | Si | admin+ | Crear temporada |
| PUT | `/seasons/:id` | Si | admin+ | Actualizar temporada |

### Categories (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/seasons/:seasonId/categories` | Si | admin+ | Listar categorias de una temporada |
| POST | `/seasons/:seasonId/categories` | Si | admin+ | Crear categoria |
| PUT | `/categories/:id` | Si | admin+ | Actualizar categoria |

### Teams (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/categories/:categoryId/teams` | Si | admin+ | Listar equipos (incluye players_count, manager_email) |
| POST | `/categories/:categoryId/teams` | Si | admin+ | Crear equipo (auto-crea usuario manager si manager_email) |
| PUT | `/teams/:id` | Si | admin+ | Actualizar equipo |
| POST | `/teams/:teamId/reset-manager-password` | Si | admin, super_admin | Reset password del manager (RPC) |

### Players (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/teams/:teamId/players` | Si | admin+, manager | Listar jugadores de un equipo |
| POST | `/teams/:teamId/players` | Si | admin+, manager | Crear jugador |
| PUT | `/players/:id` | Si | admin+, manager | Actualizar jugador |
| DELETE | `/players/:id` | Si | admin+, manager | Desactivar jugador (soft: is_active=false) |
| POST | `/players/:id/photo` | Si | admin+, manager | Subir foto (base64: JPEG/PNG/WebP, max 2MB) |

### Player Parents (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/players/:playerId/parents` | Si | admin+, manager | Listar padres/tutores |
| POST | `/players/:playerId/parents` | Si | admin+, manager | Crear padre/tutor |
| PUT | `/parents/:parentId` | Si | admin+, manager | Actualizar padre/tutor |
| DELETE | `/parents/:parentId` | Si | admin+, manager | Eliminar padre/tutor |

### Matchdays (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/categories/:categoryId/matchdays` | Si | admin+ | Listar jornadas (con games_count) |
| POST | `/categories/:categoryId/matchdays` | Si | admin+ | Crear jornada (opcionalmente con juegos) |
| PUT | `/matchdays/:id` | Si | admin+ | Actualizar jornada |
| DELETE | `/matchdays/:id` | Si | admin+ | Eliminar jornada (RPC soft_delete_matchday) |

### Games (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/categories/:categoryId/games` | Si | admin+ | Listar juegos (excluye playoffs y soft-deleted) |
| POST | `/categories/:categoryId/games` | Si | admin+ | Crear juego |
| POST | `/categories/:categoryId/games/generate` | Si | admin+ | Generar fixture round-robin (opcion: ida y vuelta) |
| PUT | `/games/:id` | Si | admin+ | Actualizar juego (si se completa y es playoff, auto-advance) |
| DELETE | `/games/:id` | Si | admin+ | Eliminar juego (soft delete) |
| DELETE | `/categories/:categoryId/games?confirm=true` | Si | admin+ | Eliminar todos los juegos de la categoria |

### Standings (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/categories/:categoryId/standings` | Si | admin+ | Tabla de posiciones (calculada en runtime desde juegos completed/forfeit) |

### Stats (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/categories/:categoryId/teams/:teamId/player-stats` | Si | Cualquiera auth | Stats agregadas por jugador (RPC get_player_stats_by_team) |
| GET | `/categories/:categoryId/stats/summary` | Si | Cualquiera auth | IDs de juegos que tienen stats capturadas |
| GET | `/games/:gameId/stats` | Si | Cualquiera auth | Stats individuales de un juego |
| POST | `/games/:gameId/stats` | Si | Cualquiera auth | Guardar stats de un juego (RPC save_game_stats) |
| POST | `/games/:gameId/forfeit` | Si | Cualquiera auth | Procesar forfeit (RPC process_forfeit) |

### Playoffs (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/categories/:categoryId/playoffs/config` | Si | admin+ | Obtener config de playoffs |
| POST | `/categories/:categoryId/playoffs/config` | Si | admin+ | Crear/actualizar config (teams_count, series_format) |
| POST | `/categories/:categoryId/playoffs/generate` | Si | admin+ | Generar bracket con team_ids seeded |
| DELETE | `/categories/:categoryId/playoffs` | Si | admin+ | Eliminar bracket completo (soft delete) |
| GET | `/categories/:categoryId/playoffs/bracket` | Si | admin+ | Bracket completo con series, equipos y juegos |
| PUT | `/playoff-series/:seriesId/advance` | Si | admin+ | Recalcular avance de serie |
| GET | `/categories/:categoryId/playoffs/standings` | Si | admin+ | Tabla de posiciones de playoffs |
| GET | `/categories/:categoryId/playoffs/player-stats/:teamId` | Si | admin+ | Stats de jugadores en playoffs |

### Payments (`/api`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/categories/:categoryId/payments` | Si | admin+ | Resumen de pagos por equipo |
| POST | `/categories/:categoryId/payments` | Si | admin+ | Registrar pago |
| PUT | `/payments/:id` | Si | admin+ | Actualizar pago |
| DELETE | `/payments/:id` | Si | admin+ | Eliminar pago |
| PUT | `/teams/:teamId/fee` | Si | admin+ | Establecer cuota personalizada |
| DELETE | `/teams/:teamId/fee` | Si | admin+ | Eliminar cuota personalizada |

### Manager (`/api/manager`)

| Metodo | Ruta | Auth | Rol | Descripcion |
|---|---|---|---|---|
| GET | `/my-teams` | Si | manager | Listar equipos del manager |
| GET | `/my-teams/:teamId` | Si | manager | Detalle del equipo |
| GET | `/my-teams/:teamId/roster` | Si | manager | Roster del equipo |
| GET | `/my-teams/:teamId/games` | Si | manager | Juegos del equipo |
| GET | `/my-teams/:teamId/standings` | Si | manager | Posiciones de la categoria del equipo |
| GET | `/my-teams/:teamId/stats` | Si | manager | Stats de jugadores del equipo |

## Funciones RPC de Supabase

| Funcion | Parametros | Retorna | Descripcion |
|---|---|---|---|
| `refresh_user_token` | `p_old_token, p_new_token, p_new_expires_at` | void | Rota refresh token atomicamente |
| `reset_manager_password` | `p_team_id` | `{ email, password }` | Genera contrasena aleatoria para el manager |
| `save_game_stats` | `p_game_id, p_stats[]` | `game_player_stats[]` | Upsert de estadisticas (delete existing + insert new) |
| `process_forfeit` | `p_game_id, p_forfeit_team_id, p_winner_runs, p_winner_player_ids` | game data | Marca juego como forfeit y crea stats para ganadores |
| `get_player_stats_by_team` | `p_category_id, p_team_id` | aggregated stats[] | Estadisticas acumuladas por jugador (avg, totals) |
| `get_playoff_player_stats_by_team` | `p_category_id, p_team_id` | aggregated stats[] | Lo mismo pero solo juegos de playoffs |
| `soft_delete_matchday` | `p_matchday_id` | integer (deleted games count) | Soft delete de jornada + juegos + stats asociados |
| `get_my_league` | `p_user_id` | league JSON | Liga completa del admin con seasons, categories, teams_count |

## Esquema de Base de Datos

### users
```
id            uuid PK DEFAULT gen_random_uuid()
email         text UNIQUE NOT NULL
password_hash text NOT NULL
full_name     text NOT NULL DEFAULT ''
role          text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'manager', 'player'))
is_active     boolean DEFAULT true
created_at    timestamptz DEFAULT now()
```

### refresh_tokens
```
id            uuid PK DEFAULT gen_random_uuid()
user_id       uuid FK -> users(id)
token         text UNIQUE NOT NULL
expires_at    timestamptz NOT NULL
created_at    timestamptz DEFAULT now()
```

### leagues
```
id            uuid PK DEFAULT gen_random_uuid()
name          text UNIQUE NOT NULL
description   text DEFAULT ''
logo_url      text DEFAULT ''
is_active     boolean DEFAULT true
created_by    uuid FK -> users(id)
sport_type    text NOT NULL DEFAULT 'baseball' CHECK (sport_type IN ('baseball', 'softball'))
slug          text UNIQUE
created_at    timestamptz DEFAULT now()
```

### league_admins
```
id            uuid PK DEFAULT gen_random_uuid()
league_id     uuid FK -> leagues(id)
user_id       uuid FK -> users(id)
is_active     boolean DEFAULT true
assigned_by   uuid FK -> users(id)
created_at    timestamptz DEFAULT now()
```

### seasons
```
id            uuid PK DEFAULT gen_random_uuid()
league_id     uuid FK -> leagues(id)
name          text NOT NULL
start_date    date
end_date      date
is_active     boolean DEFAULT true
created_by    uuid FK -> users(id)
created_at    timestamptz DEFAULT now()
```

### categories
```
id                uuid PK DEFAULT gen_random_uuid()
season_id         uuid FK -> seasons(id)
name              text NOT NULL
description       text DEFAULT ''
registration_fee  numeric(10,2) DEFAULT 0
fixture_generated boolean DEFAULT false
is_active         boolean DEFAULT true
created_at        timestamptz DEFAULT now()
```

### teams
```
id                uuid PK DEFAULT gen_random_uuid()
category_id       uuid FK -> categories(id)
name              text NOT NULL
logo_url          text DEFAULT ''
manager_name      text DEFAULT ''
manager_phone     text DEFAULT ''
manager_user_id   uuid FK -> users(id) NULLABLE
is_active         boolean DEFAULT true
created_at        timestamptz DEFAULT now()
```

### players
```
id            uuid PK DEFAULT gen_random_uuid()
team_id       uuid FK -> teams(id)
full_name     text NOT NULL
curp          text DEFAULT ''
birth_date    date
phone         text DEFAULT ''
photo_url     text DEFAULT ''
is_active     boolean DEFAULT true
created_at    timestamptz DEFAULT now()
```

### player_parents
```
id            uuid PK DEFAULT gen_random_uuid()
player_id     uuid FK -> players(id)
full_name     text NOT NULL
phone         text DEFAULT ''
address       text DEFAULT ''
created_at    timestamptz DEFAULT now()
```

### games
```
id                uuid PK DEFAULT gen_random_uuid()
category_id       uuid FK -> categories(id)
home_team_id      uuid FK -> teams(id)
away_team_id      uuid FK -> teams(id)
matchday          integer NOT NULL DEFAULT 1
matchday_id       uuid FK -> matchdays(id) NULLABLE
game_date         date
game_time         time
location          text DEFAULT ''
home_score        integer
away_score        integer
status            text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'forfeit'))
notes             text DEFAULT ''
forfeit_team_id   uuid FK -> teams(id) NULLABLE
umpire_1          text
umpire_2          text
umpire_3          text
scorer            text
playoff_series_id uuid FK -> playoff_series(id) NULLABLE
deleted_at        timestamptz NULLABLE
created_at        timestamptz DEFAULT now()
```

### game_player_stats
```
id            uuid PK DEFAULT gen_random_uuid()
game_id       uuid FK -> games(id)
player_id     uuid FK -> players(id)
team_id       uuid FK -> teams(id)
at_bats       integer DEFAULT 0
hits          integer DEFAULT 0
doubles       integer DEFAULT 0
triples       integer DEFAULT 0
home_runs     integer DEFAULT 0
walks         integer DEFAULT 0
strikeouts    integer DEFAULT 0
runs          integer DEFAULT 0
rbi           integer DEFAULT 0
deleted_at    timestamptz NULLABLE
created_at    timestamptz DEFAULT now()
```

### matchdays
```
id            uuid PK DEFAULT gen_random_uuid()
category_id   uuid FK -> categories(id)
number        integer NOT NULL
name          text
game_date     date
game_time     time
location      text DEFAULT ''
deleted_at    timestamptz NULLABLE
created_at    timestamptz DEFAULT now()
```

### team_fees
```
id            uuid PK DEFAULT gen_random_uuid()
team_id       uuid FK -> teams(id) UNIQUE
amount        numeric(10,2) NOT NULL DEFAULT 0
created_at    timestamptz DEFAULT now()
```

### payments
```
id              uuid PK DEFAULT gen_random_uuid()
team_id         uuid FK -> teams(id)
category_id     uuid FK -> categories(id)
amount          numeric(10,2) NOT NULL
payment_date    date DEFAULT CURRENT_DATE
payment_method  text DEFAULT ''
notes           text DEFAULT ''
created_by      uuid FK -> users(id)
created_at      timestamptz DEFAULT now()
```

### playoff_configs
```
id              uuid PK DEFAULT gen_random_uuid()
category_id     uuid FK -> categories(id) UNIQUE
teams_count     integer NOT NULL
series_format   text NOT NULL CHECK (series_format IN ('single_game', 'best_of_3', 'best_of_5'))
status          text DEFAULT 'setup' CHECK (status IN ('setup', 'in_progress', 'completed'))
created_at      timestamptz DEFAULT now()
```

### playoff_series
```
id                uuid PK DEFAULT gen_random_uuid()
playoff_config_id uuid FK -> playoff_configs(id)
round             integer NOT NULL
round_name        text NOT NULL
series_order      integer NOT NULL
seed_home         integer
seed_away         integer
home_team_id      uuid FK -> teams(id) NULLABLE
away_team_id      uuid FK -> teams(id) NULLABLE
home_wins         integer DEFAULT 0
away_wins         integer DEFAULT 0
winner_team_id    uuid FK -> teams(id) NULLABLE
status            text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed'))
next_series_id    uuid FK -> playoff_series(id) NULLABLE
next_series_slot  text CHECK (next_series_slot IN ('home', 'away'))
deleted_at        timestamptz NULLABLE
created_at        timestamptz DEFAULT now()
```

### news
```
id            uuid PK DEFAULT gen_random_uuid()
league_id     uuid FK -> leagues(id)
title         text NOT NULL
content       text DEFAULT ''
image_url     text DEFAULT ''
is_published  boolean DEFAULT false
created_at    timestamptz DEFAULT now()
```

### sponsors
```
id            uuid PK DEFAULT gen_random_uuid()
league_id     uuid FK -> leagues(id)
name          text NOT NULL
logo_url      text DEFAULT ''
website_url   text DEFAULT ''
is_active     boolean DEFAULT true
created_at    timestamptz DEFAULT now()
```

## Logica de Negocio Clave

### Generacion de Fixture (Round-Robin)

En `games.ts`, endpoint `POST /categories/:categoryId/games/generate`:

1. Obtiene equipos activos de la categoria
2. Si numero impar, agrega "BYE" virtual
3. Genera fixture round-robin (circulo: equipo 0 fijo, rotan los demas)
4. Si `include_return=true`, duplica jornadas invirtiendo local/visitante
5. Soft-deletes juegos y jornadas existentes antes de generar
6. Crea matchdays y juegos en batch
7. Marca `fixture_generated=true` en la categoria

### Sistema de Playoffs

1. **Config:** Se define `teams_count` (potencia de 2) y `series_format` (single_game/best_of_3/best_of_5)
2. **Generate:** Recibe team_ids ordenados por seed. Crea bracket con BYEs automaticos si `teams_count > team_ids.length`
3. **Auto-advance:** Cuando un juego de playoff se completa (`PUT /games/:id`), se llama `tryAdvanceSeries()`:
   - Cuenta wins por equipo en la serie
   - Si un equipo alcanza `winsNeeded`, marca serie como `completed` con winner
   - Propaga winner a `next_series_id` (slot home o away)
   - Si la siguiente serie tiene ambos equipos, auto-genera los juegos
   - Si todas las series del bracket estan completadas, marca config como `completed`

### Standings (Calculadas en Runtime)

No se almacenan en DB. Se calculan al momento de la request:
1. Obtiene equipos activos de la categoria
2. Obtiene juegos `completed` y `forfeit` (excluye playoffs y deleted)
3. Calcula: GP, W, L, D, RF, RA, RD por equipo
4. Ordena por W desc, luego RD desc

### Pagos

- Cada categoria tiene `registration_fee` (cuota base)
- Cada equipo puede tener `team_fees` custom (override)
- `effective_fee = custom_fee ?? registration_fee`
- `balance = effective_fee - total_paid`
- `is_settled = total_paid >= effective_fee && effective_fee > 0`

### Upload de Imagenes

Patron comun en leagues.ts y players.ts:
1. Recibe `{ base64, content_type }` en el body
2. Valida tipo (JPEG/PNG/WebP) y tamano (max 2MB)
3. Elimina imagen anterior si existe
4. Sube a Supabase Storage con upsert
5. Obtiene URL publica + cache-bust timestamp
6. Actualiza la URL en la tabla correspondiente

### Creacion de Equipos con Manager

En `teams.ts`, al crear un equipo con `manager_email`:
1. Si el usuario ya existe con rol `manager`: lo asigna directamente
2. Si el usuario ya existe con otro rol: retorna error
3. Si no existe: crea usuario con rol `manager`, genera contrasena aleatoria
4. Retorna `manager_credentials` con email/password para que el admin las comparta

## Convenciones de Codigo

- TypeScript estricto (ES2022 target, ESM modules)
- Imports con extension `.js` (requerido por ESM aunque los archivos sean .ts)
- Zod schemas para validacion de request body en cada endpoint
- Respuestas consistentes: `{ resource: data }` para exito, `{ error: string }` para errores
- Status codes HTTP estandar: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 500 (Internal Server Error)
- Soft deletes con `deleted_at` para games, game_player_stats, matchdays, playoff_series
- Queries siempre filtran `.is('deleted_at', null)` en tablas con soft delete
- Mensajes de error de usuario en espanol
- `maybeSingle()` en lugar de `single()` para queries que pueden retornar 0 rows

## Historial de Migraciones

1. `create_custom_auth_tables` - Esquema auth custom
2. `create_users_and_refresh_tokens` - Tablas users y refresh_tokens
3. `insert_default_admin_user` - Admin por defecto
4. `add_rls_policies_for_auth` - Politicas RLS para auth
5. `add_super_admin_role` - Rol super_admin
6. `create_leagues_table` - Tabla leagues
7. `create_league_admins_table` - Tabla league_admins
8. `create_seasons_table` - Tabla seasons
9. `create_categories_table` - Tabla categories
10. `create_teams_table` - Tabla teams
11. `add_registration_fee_to_categories` - Campo registration_fee
12. `create_team_fees_table` - Tabla team_fees
13. `create_payments_table` - Tabla payments
14. `add_manager_phone_to_teams` - Campo manager_phone
15. `create_players_table` - Tabla players
16. `create_games_table` - Tabla games
17. `create_game_player_stats_table` - Tabla game_player_stats
18. `add_forfeit_support_to_games` - Soporte de forfeit
19. `create_rpc_process_forfeit_and_save_game_stats` - RPCs de forfeit y stats
20. `create_rpc_get_player_stats_by_team` - RPC de stats agregadas
21. `create_playoff_tables` - Tablas playoff_configs y playoff_series
22. `add_manager_user_id_to_teams` - FK manager_user_id en teams
23. `add_deleted_at_for_soft_delete` - Columnas deleted_at
24. `update_stats_functions_for_soft_delete` - RPCs actualizadas para soft delete
25. `update_rpc_functions_for_soft_delete` - Mas RPCs actualizadas
26. `add_umpires_and_scorer_to_games` - Campos umpire_1/2/3 y scorer
27. `create_matchdays_table` - Tabla matchdays
28. `fix_matchdays_rls_policies` - Fix RLS matchdays
29. `add_fixture_generated_to_categories` - Campo fixture_generated
30. `fix_matchdays_select_policy_for_soft_delete` - Fix RLS soft delete
31. `create_rpc_soft_delete_matchday` - RPC soft_delete_matchday
32. `create_rpc_refresh_user_token` - RPC refresh_user_token
33. `create_rpc_get_my_league` - RPC get_my_league
34. `add_player_phone_photo_and_storage_bucket` - Campos phone/photo, bucket player-photos
35. `fix_storage_policies_for_anon_role` - Fix policies de storage
36. `create_rpc_reset_manager_password` - RPC reset_manager_password
37. `add_sport_type_to_leagues` - Campo sport_type
38. `update_get_my_league_rpc_add_sport_type` - RPC actualizada
39. `create_player_parents_table` - Tabla player_parents
40. `create_league_logos_storage_bucket` - Bucket league-logos
41. `fix_league_logos_storage_policies_for_anon` - Fix policies
42. `add_slug_to_leagues` - Campo slug en leagues
43. `create_news_table` - Tabla news
44. `create_sponsors_table` - Tabla sponsors
45. `create_news_and_sponsor_storage_buckets` - Buckets news-images y sponsor-images

## Storage Buckets de Supabase

| Bucket | Acceso | Contenido |
|---|---|---|
| `player-photos` | Publico (anon read) | Fotos de jugadores |
| `league-logos` | Publico (anon read) | Logos de ligas |
| `news-images` | Publico (anon read) | Imagenes de noticias |
| `sponsor-images` | Publico (anon read) | Logos de patrocinadores |
