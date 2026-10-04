# La Homa 5 · web beta

**Entrega: 3 de octubre de 2026.** Web local mejorada y base de trabajo para la integración de servidor. No es un servicio multidispositivo terminado ni desplegado.

## Abrir y probar

Para una vista rápida, abre `La-Homa-web-v5.html`. Para desarrollar y probar desde una dirección estable, instala Node.js 22 y ejecuta desde la carpeta del proyecto:

```sh
npm ci --ignore-scripts
npm run check
npm run dev
```

Abre `http://127.0.0.1:4173`. El servidor de desarrollo solo escucha en tu propio ordenador. `Ctrl+C` lo detiene. Cambiar una fuente requiere volver a construir; no se incluye recarga automática.

**No publiques toda esta carpeta.** El resultado publicable está en `web/`, generado con `npm run build`. El HTML individual es una vista previa local y no el formato recomendado para desplegar.

## Antes de trasladar datos

Exporta una copia JSON desde la versión anterior. Conserva el original. Importa en la cuenta local de destino y revisa personas, saldos, semanas y fotografías. Una cuenta local no se convierte en cuenta en la nube por publicarse la página. Otro dominio, otro navegador o un archivo HTML distinto pueden tener almacenamiento separado.

Los adjuntos nuevos de eventos se guardan por cuenta en IndexedDB. La exportación completa intenta incluirlos; si falta uno, no presenta una copia incompleta como correcta. La persistencia y restauración nativas de esos archivos no han podido verificarse en este entorno. El PIN y los perfiles locales no sustituyen los permisos de servidor ni protegen ante alguien con acceso técnico al navegador.

## Estado real

- Correcciones locales de permisos de tareas, convivencia futura, rutas y formularios; navegación agrupada; cuotas flexibles/mensuales; series de eventos; varias listas; menús reutilizables; bandeja de revisiones.
- Avisos dentro de la web y preferencias guardadas. **No hay envío push o correo en segundo plano.**
- Importación de recetas pegando JSON-LD/HTML estructurado con revisión del borrador. **El importador remoto por URL no está implementado.**
- Motor puro de comandos de servidor y esquema candidato por hogares incluidos. **Faltan API HTTP, repositorio transaccional real, adaptador del navegador, invitaciones operativas, dispositivos restringidos y servicios programados.**
- **El acceso de nube está desactivado deliberadamente. Añadir claves a `config.js` no lo termina.** No se deben reactivar el antiguo guardado de una familia por cuenta ni sus escrituras de instantáneas.

Lee `docs/ESTADO.md` para cada identificador del informe previo y `docs/GUIA-WEB.md` para infraestructura y despliegue.

## Estructura

| Ruta | Uso |
|---|---|
| `src/core.js`, `src/web5-core.js` | Reglas base y ampliaciones de esta versión. |
| `src/app.js`, `src/web5-ui.js` | Interfaz base y ampliaciones, ensambladas por el constructor. |
| `src/styles.css`, `src/web5.css` | Estilo y capa responsive. |
| `src/entity-sync.js` | Fusión de cambios y proyección por entidades; sin transporte de red. |
| `src/asset-store.js` | Adjuntos locales por cuenta en IndexedDB. |
| `src/recipe-import.js` | Lectura de recetas estructuradas pegadas. |
| `server/operations.cjs` | Reductor de comandos; requiere una identidad ya verificada y repositorio atómico. |
| `supabase/migrations/` | Esquema candidato para revisión en proyecto de pruebas. No API completa. |
| `scripts/` | Construcción, servidor local, comprobación del paquete. |
| `tests/` | Pruebas de reglas, acceso local, servidor simulado e interfaz. |
| `web/` | Salida estática; no editar directamente. |
| `.github/workflows/check.yml` | Configuración de CI. No se ha ejecutado en GitHub. |
| `core-base.js`, `core-v21.js`, `src-v3/` | Referencias anteriores necesarias para comprobar migraciones. No publicar. |

La modularización es incremental: sigue existiendo código de versiones previas. No se ha migrado a React ni se ha reescrito toda la interfaz. No hay dependencias npm de ejecución para la web local. La ruta antigua de nube conserva carga diferida del cliente de Supabase, inactiva en esta entrega.

## Comprobaciones

`npm run check`: **220 pruebas aprobadas**. Incluye el motor de operaciones con repositorio simulado, no una base Postgres real. `python3 tests/web5-browser.py`: **40 comprobaciones**. `python3 tests/legacy-regression-browser.py`: **31 comprobaciones**. Total interfaz: **71**.

La geometría principal cubre 16 pantallas a 320, 360, 390, 768, 1.024, 1.440 y 1.920 píxeles, sin desbordamiento horizontal en esas muestras. No es una certificación de accesibilidad ni un benchmark de velocidad.

Las pruebas usan Python Playwright y Chromium. `requirements-test.txt` fija las versiones usadas; `CHROMIUM_PATH` permite indicar otro ejecutable. Si no se encuentra Chromium del sistema, Playwright usa su navegador instalado. El entorno bloquea navegación local/HTTP del navegador: se carga el documento en `about:blank` y se inyecta almacenamiento en memoria. **No se han probado almacenamiento persistente nativo, IndexedDB real, cámara, OAuth, SMTP, PWA/offline ni sincronización real.** El servidor de desarrollo se comprueba por HTTP con Node por separado.

## Límites de esta beta

Mantener copias privadas. No usarla como único registro del dinero de la familia. No publicar altas reales ni prometer que todos los datos ya están en la nube. No incluir fotos, copias JSON, datos de menores, contraseñas o claves de servicio en GitHub. El repositorio y el dominio deben pertenecer al titular del proyecto.
