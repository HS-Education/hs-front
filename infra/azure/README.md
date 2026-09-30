# Frontend: deployment preparado, sin publicar

Se conserva `ng serve`/entorno local. El build production carga `/runtime-config.json`, que solo permite el endpoint público de API, nunca keys. `pnpm build:azure` configura `/api/v1` por defecto para servir Angular con Java en la misma URL de App Service. El navegador sigue llamando la API directamente; Sery no pasa por un proxy SWA con timeout de 45 s.

Sin dominio propio, **App Service same-origin es el valor recomendado inicialmente**. Static Web Apps permanece opcional, pero cookies de terceros pueden bloquear login con sus dominios predeterminados. Para SWA resolver `app.dominio` y `api.dominio`, HTTPS/certificados, CORS/origin/cookies y pruebas de navegador antes de activarlo. No se ha validado cloud ni creado SWA.

El plan/costos/CLI/IaC/OIDC y checklist conjunto están en `hs-backend/infra/azure/README.md` y `COSTS.md` del backend.

Flujo de release coordinado:

1. PR de esta feature a develop, CI/revisión y release nuevo integrado a main en ambos repos. No modificar tags existentes.
2. GitHub Environment `azure-students` con aprobación/restricción de tags. Variable de repositorio `AZURE_CD_ENABLED=true` solo cuando se autorice habilitar CD.
3. Ejecutar **Frontend Azure release** con el nuevo tag y `app-service`: genera/publíca assets frontend con SHA256. No hace un ZIP deploy estático sobre la Web App Java, que podría eliminar el backend.
4. **Backend Azure CD** toma ese mismo tag de front, verifica su commit/main y checksum, incorpora el bundle al JAR y despliega ambos servicios.
5. Ejecutar **Azure browser smoke**: variables `AZURE_FRONTEND_URL` y `AZURE_API_BASE_URL` (HTTPS absoluta `/api/v1`), secrets `SMOKE_USERNAME`/`SMOKE_PASSWORD` de cuenta autorizada. Verifica login rechazado/aceptado, JWT HttpOnly/Secure/Strict, `/auth/me` y reload del deep link. Solo se guarda reporte JUnit; evitar subir traces que pudieran contener datos o cookies reales.

Ejecutar los workflows manuales seleccionando **el nuevo tag como ref**; `release_tag` debe coincidir con la ref. El environment requiere revisión de `sebaditas` y rechaza autoaprobación: el compañero inicia la ejecución y `sebaditas` aprueba. CD permanece deshabilitado hasta cumplir los requisitos de infraestructura/OIDC y la nueva release integrada. Playwright desactiva traces cuando el target es HTTPS para evitar capturar credenciales o documentos cloud.

SWA opcional: además `AZURE_SWA_LOGIN_VALIDATED=true`, `AZURE_API_BASE_URL`, OIDC federado al environment del repo front con lectura del target y permiso `Microsoft.Web/staticSites/listSecrets/action` solo en esa SWA, secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` y `AZURE_STATIC_WEB_APPS_API_TOKEN` del target correcto. El script compara el token con el del recurso verificado Students para evitar desplegar en otra suscripción. Las verificaciones no sustituyen el ensayo de login ni vinculan automáticamente un dominio/certificado.

Pruebas locales: `pnpm test`, `pnpm test:deployment`, `node scripts/check-i18n.cjs`, `pnpm build:azure`. Pruebas cloud no ejecutadas mientras no existan recursos/credenciales; no confundir CI verde con despliegue validado.

Seguridad del cliente: las escrituras al API obtienen un token CSRF enmascarado desde `/auth/csrf` y lo envían mediante `X-XSRF-TOKEN`, también para el streaming `fetch` de Sery. El bootstrap se comparte entre peticiones concurrentes y su caché vive solo en memoria; no se envían tokens a hosts externos. Se renueva después de acciones de autenticación y no se reintentan automáticamente escrituras rechazadas con 403. La cookie CSRF y las cookies de autenticación son HttpOnly; el token del JSON no es una credencial de login. Las pruebas API usan el mismo contrato sin omitir CSRF. Publicar esta versión junto con el backend que expone el bootstrap. Las contraseñas generadas usan Web Crypto (16 caracteres), sin fallback a `Math.random()`. Regresión local: 55 pruebas Vitest, 3 de deployment, tipado de tests, build e i18n aprobados.

El smoke contiene tres escenarios: rutas protegidas anónimas, `/auth/me` anónimo rechazado y login/cookies/recarga/logout. En cloud comprueba el hostname esperado y el mismo origen antes de enviar credenciales, usa hasta 90 s para cold start y no graba trazas. Su descubrimiento no equivale a ejecución: los escenarios cloud deben pasar sobre el nuevo despliegue.
