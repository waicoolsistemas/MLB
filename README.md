# Softball League Manager - Deploy Frontend en Netlify

## Prerequisitos

- Cuenta en [Netlify](https://netlify.com)
- El backend (API) ya deployado en Render (ver `server/README.md`)

## Pasos para deployar

### 1. Crear un nuevo sitio en Netlify

**Opcion A: Desde GitHub (recomendado)**

1. Entra a [Netlify Dashboard](https://app.netlify.com)
2. Click en **Add new site** > **Import an existing project**
3. Selecciona tu repositorio
4. Configura lo siguiente:

| Campo | Valor |
|---|---|
| **Base directory** | _(dejar vacio, es la raiz)_ |
| **Build command** | `npm run build` |
| **Publish directory** | `dist` |

**Opcion B: Deploy manual**

1. En tu maquina local, ejecuta:
   ```bash
   npm install
   npm run build
   ```
2. Arrastra la carpeta `dist/` al area de deploy en Netlify

### 2. Configurar variables de entorno

En Netlify ve a **Site configuration** > **Environment variables** y agrega:

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL completa del backend en Render | `https://softball-api-xxxx.onrender.com` |
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Anon key de Supabase | `eyJhbGci...` |

> Despues de agregar o cambiar variables, necesitas hacer un **re-deploy** para que tomen efecto.

### 3. Configurar redirects para Vue Router

La app usa `vue-router` con `history` mode, asi que necesitas un archivo de redirects para que Netlify maneje correctamente las rutas.

Crea un archivo `public/_redirects` con este contenido:

```
/*    /index.html   200
```

> Este archivo ya deberia existir. Si no, crealo antes del deploy.

### 4. Deploy

1. Si conectaste GitHub, el deploy es automatico con cada push
2. Si es manual, sube la carpeta `dist/`

### 5. Verificar

1. Abre la URL que Netlify te asigno (ej: `https://tu-sitio.netlify.app`)
2. Deberias ver la pantalla de login
3. Intenta iniciar sesion para confirmar que la conexion con el backend funciona

---

## Notas importantes

- Las variables `VITE_*` se inyectan en el build, no en runtime. Si las cambias, debes hacer un nuevo deploy.
- La `VITE_API_URL` debe ser la URL completa de Render **sin** slash al final (ej: `https://softball-api-xxxx.onrender.com`, NO `https://softball-api-xxxx.onrender.com/`).
- Si el backend en Render esta en plan Free y se "durmio", la primera carga puede tardar unos segundos mientras se despierta.

## Dominio personalizado (opcional)

1. En Netlify ve a **Domain management** > **Add a domain**
2. Sigue las instrucciones para apuntar tu dominio
3. Netlify provee HTTPS automaticamente via Let's Encrypt
