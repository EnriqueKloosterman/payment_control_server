# Análisis de Errores - Payment Control API

> Generado el 27/05/2026

---

## CRÍTICOS 🚨

### 1. [SEGURIDAD] Fuga de datos por inyección de query params en `ApiFeatures`

**Archivo:** `src/utils/apiFeatures.js:14-16`

El método `filter()` copia **todas** las query params restantes al WHERE de Sequelize sin sanitizar. Como `userId` se pasa primero en `initialWhere` y luego se sobreescribe:

```js
// getFacturas() en facturas.controller.js:73-76
const features = new ApiFeatures(Factura, otherQuery, initialWhere);
// initialWhere = { userId: req.user.id }
// otherQuery incluye TODO excepto year/month

// filter() en apiFeatures.js:14-16
for (const key in queryObj) {
    this.queryObj.where[key] = queryObj[key]; // Sobrescribe userId!
}
```

**Impacto:** `GET /api/facturas?userId=otro-usuario-id` permite ver facturas de cualquier usuario.

**Solución:** Filtrar claves peligrosas o usar `Object.assign` respetando `initialWhere`.

---

### 2. [CONTROL DE FLUJO] Falta `return` tras `next()` en `auth.middleware`

**Archivo:** `src/middlewares/auth.middleware.js:31`

```js
req.user = user;
next(); // ← Sin return, la ejecución continúa
```

Aunque actualmente no causa error porque `if (!token)` es false, es frágil. Si alguien agrega código después, podría ejecutarse inesperadamente o causar doble respuesta.

**Solución:** `return next();`

---

### 3. [VALIDACIÓN AUSENTE] Ruta `POST /api/auth/forgotpassword` sin validación

**Archivo:** `src/routes/auth.routes.js:146`

```js
router.post('/forgotpassword', authController.forgotPassword);
```

No hay middleware `express-validator`. Si no se envía `email`, el controlador busca `req.body.email = undefined` y responde "not found" sin errores claros.

**Solución:** Agregar validación con `check('email').isEmail()`.

---

### 4. [VALIDACIÓN AUSENTE] Ruta `POST /api/auth/refresh` sin validación

**Archivo:** `src/routes/auth.routes.js:106`

```js
router.post('/refresh', authController.refresh);
```

El controlador valida manualmente, pero sin `express-validator` los errores no tienen formato consistente con el resto de la API.

**Solución:** Agregar validación con `check('refreshToken').notEmpty()`.

---

## ALTOS ⚠️

### 5. [RESPUESTA] PDF generation puede causar doble respuesta

**Archivo:** `src/controllers/facturas.controller.js:248-294`

```js
res.setHeader('Content-disposition', ...);
res.setHeader('Content-type', 'application/pdf');
doc.pipe(res);
// ... si algo falla aquí, ya se enviaron headers
```

`doc.pipe(res)` comienza a enviar la respuesta. Si ocurre un error después (ej: `factura.total` no es número en `toFixed`), el `catch` intenta enviar JSON 500 pero los headers ya fueron enviados → `ERR_STREAM_WRITE_AFTER_END`.

**Solución:** Validar datos antes de comenzar el pipe o capturar error del stream.

---

### 6. [REDUNDANCIA] Validación duplicada en controladores

**Archivo:** `src/controllers/auth.controller.js:5,38`

`validationResult` se importa y ejecuta en `register()` y `login()`, pero el middleware `validate` ya lo hace en `auth.validator.js`. El controlador repite el mismo chequeo.

**Solución:** Eliminar la validación redundante del controlador (el middleware ya la maneja). O al menos mantener consistencia entre todos los controladores.

---

### 7. [SEMÁNTICA] `PUT /:id` actúa como PATCH

**Archivo:** `src/controllers/facturas.controller.js:303-338`

```js
if (name !== undefined) factura.factura = name;
if (total !== undefined) factura.total = total;
// ... solo actualiza campos presentes
```

PUT debe reemplazar el recurso completo. Actualmente solo actualiza los campos enviados (comportamiento de PATCH). Si no se envía `total`, el valor anterior persiste.

**Solución:** Decidir si es PUT (requerir todos los campos) o renombrar a PATCH. Cambiar la ruta a PATCH para ser semánticamente correcto.

---

### 8. [MODELO] `user.controller.js` expone campo `avatar` inexistente

**Archivo:** `src/controllers/user.controller.js:25`

```js
avatar: user.avatar,
```

El modelo `User` en `src/models/user.model.js` **no define** un campo `avatar`. Siempre retornará `undefined`.

**Solución:** Eliminar `avatar` de la respuesta o agregar el campo al modelo.

---

### 9. [EMAIL DUPLICADO] Dos servicios de email, uno no funcional

- `src/services/email.service.js` — Usa `streamTransport: true` que **nunca envía** emails, solo los bufea en memoria.
- `src/utils/email.service.js` — Usa SMTP real y es usado por `auth.controller.forgotPassword`.

El cron job (`src/services/cron.service.js`) importa `emailService` de `src/services/email.service.js`, que usa `streamTransport`. Las notificaciones de facturas por vencer **nunca se envían realmente**.

**Solución:** Unificar en un solo servicio con SMTP real. Eliminar `streamTransport`.

---

### 10. [DB] `database.sql` desincronizado con los modelos

- **Nombre de tabla:** SQL crea `Users` (mayúscula), Sequelize usa `users` (minúscula, `tableName: 'users'`).
- **Columnas faltantes en SQL:** `refreshToken`, `resetPasswordToken`, `resetPasswordExpire` existen en el modelo pero no en el script SQL.

**Solución:** Actualizar `database.sql` para reflejar los modelos actuales.

---

### 11. [ERROR HANDLER] Spread operator sobre Error pierde propiedades

**Archivo:** `src/app.js:108-109`

```js
let error = { ...err };
error.message = err.message;
```

`message` y `stack` no son propiedades enumerables en objetos `Error`. El spread no las copia, por eso se asigna manualmente `message`. Pero es frágil ante cambios.

**Solución:** Usar `Object.create(err)` o instanciar directamente `new ErrorResponse(err.message, err.statusCode)`.

---

### 12. [SWAGGER] Tipo incorrecto para descarga PDF

**Archivo:** `src/routes/facturas.routes.js:136-139`

```yaml
content:
  text/plain:
```

Debe ser `application/pdf`.

**Solución:** Cambiar a `application/pdf`.

---

### 13. [CONFIG] `.env.example` falta `API_URL`

**Archivo:** `.env.example`

`src/config/swagger.js:18` usa `process.env.API_URL` pero no está documentado en `.env.example`.

**Solución:** Agregar `API_URL=http://localhost:3000` al ejemplo.

---

## MEDIOS 🔶

### 14. [CÓDIGO MUERTO] `src/cron/facturas.cron.js` sin uso

**Archivo:** `src/cron/facturas.cron.js`

Contiene una implementación legacy con `setInterval` para marcar facturas vencidas. Nunca es importado por `app.js` ni por `cron.service.js`. Es código muerto que puede confundir.

**Solución:** Eliminar el archivo si no se necesita o mover su lógica a `cron.service.js`.

---

### 15. [REPOSITORIO] Reportes de cobertura commiteados

`coverage/` no está en `.gitignore`. Los reportes de cobertura generados por Jest se están commiteando al repositorio.

**Solución:** Agregar `coverage/` al `.gitignore`.

---

### 16. [PRODUCCIÓN] Logger con transporte Console en producción

**Archivo:** `src/config/logger.js:16`

```js
new winston.transports.Console({ format: winston.format.simple() })
```

En producción se recomienda JSON estructurado o deshabilitar console logging.

**Solución:** Usar formato JSON condicionalmente según `NODE_ENV`.

---

### 17. [DIRECTORIO] `uploads/` no se crea automáticamente

**Archivo:** `src/app.js:91`

```js
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
```

Si el directorio `uploads/` no existe, Express no lanza error pero tampoco sirve archivos, lo que es confuso.

**Solución:** Agregar código que cree el directorio si no existe, o usar `fs.existsSync`.

---

### 18. [FORMATO] Array como mensaje de error en ValidationError

**Archivo:** `src/app.js:122`

```js
const message = Object.values(err.errors).map(val => val.message);
error = new ErrorResponse(message, 400);
```

`message` es un array. Se serializa como JSON correctamente pero es inconsistente con el resto de la API donde `message` es string.

**Solución:** Unir con `join(', ')` o mantener la estructura `errors` de express-validator.

---

### 19. [TESTS] IDs usan enteros, el modelo usa UUIDs

**Archivos:** Todos los tests en `tests/`

```js
// tests usan: req.user.id = 1, Factura.findOne({ where: { id: 1 } })
// modelo real usa: DataTypes.UUID, defaultValue: DataTypes.UUIDV4
```

Los tests no reflejan los tipos reales. Pasa porque todo está mockeado, pero no representan fielmente el comportamiento en producción.

**Solución:** Usar UUIDs en los mocks y datos de prueba.

---

### 20. [TESTS] No verifican `return` después de `next()` en middleware

Los tests del middleware `protect` verifican que `next()` fue llamado pero no verifican que la función retorne después (lo cual es correcto actualmente pero un bug potencial).

---

### 21. [SEGURIDAD] Refresh token enviado en body en vez de httpOnly cookie

**Archivo:** `src/controllers/auth.controller.js:88`

```js
refreshToken: refreshToken, // Enviado en body JSON
```

Un token de refresco en el body es vulnerable a XSS. Debería ser una httpOnly cookie.

**Solución:** Enviar refresh token como `res.cookie('refreshToken', token, { httpOnly: true, secure: true, sameSite: 'strict' })`.

---

## BAJOS ℹ️

### 22. [VALIDACIÓN] Mensaje de error impreciso sobre "symbol"

**Archivo:** `src/middlewares/auth.validator.js:4`

```js
'must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one symbol'
```

La regex `[\W_]` acepta underscore `_` que no es un símbolo tradicional. El mensaje dice "symbol" pero debería decir "special character".

---

### 23. [ESTILO] Sin punto y coma consistente

El código mezcla estilos con y sin punto y coma. Mayormente usa `;` pero hay omisiones.

---

### 24. [RENDIMIENTO] Sin compresión HTTP

No hay middleware `compression` para respuestas JSON. En producción con muchas facturas, las respuestas podrían ser lentas.

---

### 25. [SALUD] Sin endpoint de health check dedicado

`GET /` es un mensaje de bienvenida, no un health check estructurado (status DB conectada, uptime, etc).

---

## RESUMEN POR ARCHIVO

| Archivo | Errores |
|---|---|
| `src/utils/apiFeatures.js` | 🔴 1 (seguridad: inyección query params) |
| `src/middlewares/auth.middleware.js` | 🔴 1 (falta return next) |
| `src/routes/auth.routes.js` | 🔴 2 (falta validación en forgotpassword y refresh) |
| `src/controllers/facturas.controller.js` | ⚠️ 2 (PDF doble respuesta, PUT como PATCH) |
| `src/controllers/auth.controller.js` | ⚠️ 1 (validación redundante) |
| `src/controllers/user.controller.js` | ⚠️ 1 (avatar inexistente) |
| `src/services/email.service.js` | ⚠️ 1 (streamTransport no envía) |
| `src/utils/email.service.js` | — |
| `src/utils/errorResponse.js` | — |
| `src/app.js` | ⚠️ 1 (spread Error) |
| `src/config/swagger.js` | — |
| `src/config/logger.js` | 🔶 1 (console en producción) |
| `src/config/database.js` | — |
| `src/middlewares/auth.validator.js` | ℹ️ 1 (mensaje regex) |
| `src/middlewares/facturas.validator.js` | — |
| `src/middlewares/validate.middleware.js` | — |
| `src/models/user.model.js` | — |
| `src/models/factura.model.js` | — |
| `src/models/index.js` | — |
| `src/routes/facturas.routes.js` | ⚠️ 1 (Swagger PDF content-type) |
| `src/routes/user.routes.js` | — |
| `src/services/cron.service.js` | — |
| `src/cron/facturas.cron.js` | 🔶 1 (código muerto) |
| `database.sql` | ⚠️ 1 (desincronizado con modelos) |
| `.env.example` | ⚠️ 1 (falta API_URL) |
| `.gitignore` | 🔶 1 (falta coverage/) |
| `tests/*` | 🔶 2 (IDs enteros, sin return check) |
| `README.md` | ℹ️ 1 (menciona multer no instalado) |

> **Leyenda:** 🔴 Crítico | ⚠️ Alto | 🔶 Medio | ℹ️ Bajo

---

## Reporte de Fixes Aplicados

> Todos los issues identificados fueron corregidos. Tests: 31/31 pasando.

### 🔴 Críticos (4/4)

| # | Archivo | Fix |
|---|---|---|
| 1 | `src/utils/apiFeatures.js` | `filter()` ahora ignora keys que ya existen en `initialWhere` |
| 2 | `src/middlewares/auth.middleware.js` | `return next()` en vez de `next()` |
| 3 | `src/routes/auth.routes.js` | Agregado `validateForgotPassword` con `isEmail()` |
| 4 | `src/routes/auth.routes.js` | Agregado `validateRefreshToken` con `notEmpty()` |

### ⚠️ Altos (9/9)

| # | Archivo | Fix |
|---|---|---|
| 5 | `src/controllers/facturas.controller.js` | Captura de error del stream PDF + guard `res.headersSent` |
| 6 | `src/controllers/auth.controller.js` | Eliminado `validationResult` redundante (lo maneja middleware) |
| 7 | `src/routes/facturas.routes.js` | Ruta `PUT /:id` cambiada a `PATCH /:id` |
| 8 | `src/controllers/user.controller.js` | Eliminado `avatar` de la respuesta |
| 9 | `src/services/email.service.js` | `streamTransport` reemplazado por SMTP real |
| 10 | `database.sql` | Tabla `users` (minúscula) + columnas faltantes |
| 11 | `src/app.js` | `new ErrorResponse()` directo en vez de spread |
| 12 | `src/routes/facturas.routes.js` | Swagger PDF: `text/plain` → `application/pdf` |
| 13 | `.env.example` | Agregado `API_URL` |

### 🔶 Medios (8/8)

| # | Archivo | Fix |
|---|---|---|
| 14 | `src/cron/facturas.cron.js` | Archivo eliminado (dead code) |
| 15 | `.gitignore` | `tests/coverage` → `coverage/` |
| 16 | `src/config/logger.js` | Console transport solo si `NODE_ENV !== 'production'` |
| 17 | `src/app.js` | `fs.mkdirSync` automático para `uploads/` |
| 18 | `src/app.js` | Mensaje de error unido con `join(', ')` |
| 19 | `tests/` | Todos los IDs cambiados a UUID string |
| 20 | `tests/` | `cookie` + `clearCookie` agregados a mocks de `res` |
| 21 | `src/controllers/auth.controller.js` | Refresh token también como httpOnly cookie + `cookie-parser` instalado |

### ℹ️ Bajos (4/4)

| # | Archivo | Fix |
|---|---|---|
| 22 | `src/middlewares/auth.validator.js` | "symbol" → "special character" |
| 23 | `README.md` | "multer" → "Static file serving via /uploads" |
| 24 | `src/app.js` | Middleware `compression` instalado y agregado |
| 25 | `src/app.js` | Endpoint `GET /health` agregado |
