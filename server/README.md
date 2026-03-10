# Softball API - Deploy en Render

## Prerequisitos

- Cuenta en [Render](https://render.com)
- Proyecto de Supabase ya configurado con las migraciones aplicadas

## Pasos para deployar

### 1. Crear un nuevo Web Service en Render

1. Entra a [Render Dashboard](https://dashboard.render.com)
2. Click en **New** > **Web Service**
3. Conecta tu repositorio de GitHub/GitLab
4. Configura lo siguiente:

| Campo | Valor |
|---|---|
| **Name** | `softball-api` (o el nombre que quieras) |
| **Region** | El mas cercano a tus usuarios |
| **Root Directory** | `server` |
| **Runtime** | `Node` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm run start` |
| **Instance Type** | Free (o el que necesites) |

### 2. Configurar variables de entorno

En la seccion **Environment** del servicio en Render, agrega las siguientes variables:

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecucion | `production` |
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon key de Supabase | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase (opcional, si no se pone usa la anon key) | `eyJhbGci...` |
| `JWT_ACCESS_SECRET` | Secreto para tokens de acceso (string aleatorio largo) | `mi-secreto-super-seguro-123` |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (string diferente al anterior) | `otro-secreto-diferente-456` |

> Las keys de Supabase las encuentras en: Supabase Dashboard > Settings > API

### 3. Deploy

1. Click en **Create Web Service**
2. Render va a instalar dependencias, compilar TypeScript y arrancar el servidor
3. Una vez que el deploy termine, Render te dara una URL como: `https://softball-api-xxxx.onrender.com`

### 4. Verificar

Visita `https://tu-url.onrender.com/api/health` en el navegador. Deberias ver:

```json
{ "status": "ok", "timestamp": "2026-02-25T..." }
```

### 5. Guardar la URL

Copia la URL que Render te asigno (ej: `https://softball-api-xxxx.onrender.com`). La vas a necesitar para configurar el frontend.

---

## Notas importantes

- Render asigna el puerto automaticamente via la variable `PORT`. No necesitas configurarla manualmente.
- En el plan Free, el servicio se "duerme" despues de 15 minutos de inactividad. La primera request despues tardara unos 30-50 segundos.
- Si usas `SUPABASE_SERVICE_ROLE_KEY`, este tiene permisos completos sobre la base de datos. Nunca lo expongas en el frontend.
