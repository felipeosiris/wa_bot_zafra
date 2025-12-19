# Deploy en Railway

## Configuración para Railway

Este proyecto está configurado para deployar en Railway con PostgreSQL.

### Variables de Entorno Requeridas

En Railway, configura las siguientes variables de entorno:

1. **DATABASE_URL** - URL de conexión a PostgreSQL (Railway la proporciona automáticamente si agregas un servicio PostgreSQL)
2. **PORT** - Puerto donde corre la aplicación (Railway lo asigna automáticamente, pero puedes configurarlo)
3. **TWILIO_ACCOUNT_SID** - (Opcional) Si necesitas configurar Twilio
4. **TWILIO_AUTH_TOKEN** - (Opcional) Si necesitas configurar Twilio

### Pasos para Deploy

1. **Conectar el repositorio a Railway**
   - Ve a Railway.app
   - Crea un nuevo proyecto
   - Conecta tu repositorio de GitHub/GitLab

2. **Agregar servicio PostgreSQL**
   - En Railway, agrega un nuevo servicio PostgreSQL
   - Railway automáticamente creará la variable `DATABASE_URL`

3. **Configurar el servicio web**
   - Railway detectará automáticamente el `Procfile`
   - El script `postinstall` ejecutará las migraciones de Prisma automáticamente

4. **Ejecutar seed (opcional)**
   - Puedes ejecutar `npm run seed` manualmente después del deploy
   - O agregar un script de inicialización

### Scripts Automáticos

- **postinstall**: Se ejecuta automáticamente después de `npm install`
  - Genera Prisma Client
  - Ejecuta migraciones de base de datos

- **start**: Inicia el servidor con tsx

### Migraciones

Las migraciones se ejecutan automáticamente en el `postinstall` usando `prisma migrate deploy` (modo producción).

### Health Check

Railway verificará automáticamente el endpoint `/health` para confirmar que la aplicación está funcionando.

### Notas

- Railway usa Nixpacks como builder por defecto
- El archivo `nixpacks.toml` configura el build process
- El archivo `railway.toml` configura el deploy
- El `Procfile` define el comando de inicio

