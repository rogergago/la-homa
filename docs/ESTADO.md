# Estado de la aprobación · La Homa 5

**Todas las propuestas siguen aprobadas; no todas están terminadas.** Esta entrega desarrolla la web local y partes aisladas del futuro servidor. No confundir “código incluido”, “probado con simulaciones”, “conectado” y “validado en producción”.

La conexión de nube permanece desactivada porque todavía no existe `HomaCloudTransport` ni una API por hogares. **No es una limitación que se resuelva solo contratando Supabase o copiando claves.**

## Matriz completa del informe aprobado

| ID | Estado | Incluido en esta entrega | Falta o límite |
|---|---|---|---|
| F01 | Implementado local | Rectificar una tarea no realizada exige adulto; el niño solicita revisión sin cambiar puntos. | La misma regla está en el reductor; falta verificarla a través de API real. |
| F02 | Implementado local | Tareas futuras bloqueadas al menor salvo permiso expreso; fecha de ventana para cuotas. | El navegador local no es reloj fiable para producción; conectar reloj del hogar en servidor. |
| F03 | Implementado y probado | Planes de convivencia con vigencias sucesivas; programar futuro no desactiva hoy; cancelar restaura la vigencia previa. | Ensayo con calendario familiar real. |
| F04 | Implementado y probado | Rutas de pantalla, atrás/adelante y vista recuperable mediante fragmentos. | Verificar también Safari y retorno real desde autenticación. |
| F05 | Implementado local | Cerrar o pulsar Escape pide confirmación cuando hay cambios. Errores conservan el formulario. | No hay borrador persistente después de cerrar el navegador. |
| F06 | Mejorado, no certificado | Texto secundario más legible, mayor contraste, foco, salto al contenido y controles táctiles. | Auditoría completa WCAG, lectores de pantalla, zoom y dispositivos reales. |
| F07 | Implementado | Cinco áreas adultas; herramientas infantiles reducidas y subnavegación. | Pruebas de uso con familias. |
| F08 | Implementado | Cuota semanal en días presentes y tareas mensuales. Máximo una realización de la cuota por día. | Mensual permite días 1–28 y mueve a siguiente estancia dentro del mes. No es un motor RRULE arbitrario. |
| F09 | Parcial | Guía inicial de personas, convivencia, tareas y paga; se explica cuenta frente a perfil. | Alta real de hogar compartido e invitación de otro adulto. |
| F10 | Implementado local | Bandeja adulta: tareas a revisar, rectificaciones, gastos y vales. | Identificar acciones por cuenta real cuando exista el backend. |
| M01 | Implementado local | Eventos diarios/semanales/mensuales, intervalo, fin, editar fecha o futuras fechas de la serie. | Se materializan hasta 366 ocurrencias y 730 días. Verificar intercambio externo de series. |
| M02 | Parcial | Bandeja interna y ajustes de aviso/silencio guardados. | Faltan suscripción push, programador y entrega de correo/notificaciones con la web cerrada. |
| M03 | Pendiente | Se conserva intercambio ICS. | Sincronización real Google Calendar e integración/suscripción Apple no implementadas. |
| M04 | Implementado local | Raciones sugeridas por presencia, copiar menú, guardar y volver a usar menús. | Confirmación adulta; no estima consumo individual ni necesidades dietéticas. |
| M05 | Implementado local | Listas separadas, habituales, marcado reversible y cantidades pendientes por lista. Solo supermercado pasa a despensa. | Sincronizar cambios entre dispositivos cuando esté la API. |
| M06 | Código local, validación nativa pendiente | Adjuntos PDF, imagen o texto por evento, hasta 5 MB; exportación con archivos. | IndexedDB no probado nativamente. Fecha de revisión no borra por sí sola. Almacenamiento privado en nube pendiente. |
| M07 | Parcial | Bandeja de aprobaciones y actividad local reciente. | Auditoría remota con identidad verificada, retención y permisos de lectura. |
| M08 | Implementado local | Plantillas, duplicación y cuotas flexibles compatibles con convivencia. | Ajustar las tareas a cada familia; no inferir obligaciones por edad. |
| M09 | Parcial | Importar JSON-LD/HTML pegado, revisar ingredientes antes de guardar, etiquetas alimentarias manuales. | La descarga desde URL no existe aún; no se verifica seguridad alimentaria ni disponibilidad del supermercado. |
| N01 | Esquema candidato | Tablas por hogar, membresías, invitaciones y dispositivos. | Implementar y probar creación, caducidad, aceptación y revocación. |
| N02 | Reductor probado en aislamiento | Permisos y tipos de operación controlados por identidad inyectada; escrituras directas de cliente denegadas en SQL. | API debe autenticar esa identidad; probar aislamiento real y credenciales restringidas de tablet. |
| N03 | Algoritmo probado, transporte pendiente | Fusión a tres bandas, diferencias por entidad, detección de conflicto. | Falta transporte, suscripciones, cola offline persistente y resolución remota visible. |
| N04 | Parcial | Adjuntos nuevos separados localmente del JSON. | Migrar fotos existentes y adjuntos a archivos privados; cuota y limpieza remotas. |
| N05 | Pendiente de integración | Cuenta local conservada y pantallas de integración bloqueadas. | Registro/recuperación real, verificación, Google/Apple, sesiones, invitaciones y borrado. |
| N06 | Motor candidato probado | Comandos de paga/ahorro y comprobación de idempotencia con repositorio simulado. | Implementar transacciones reales, recibos persistentes, programación y reloj del hogar en servidor. |
| N07 | Pendiente de nube | Exportación local ampliada y plan de restauración documentado. | Backup automático separado de datos y archivos, cifrado externo y ensayo real. |
| N08 | Parcial | Construcción reproducible, npm sin dependencias, salida web separada y CI definido. | Crear repositorio remoto y staging; pipeline remoto y despliegue no ejecutados. Refactor incremental pendiente. |
| N09 | Aplazado por el usuario | La web y las reglas siguen separadas de servicios; no se crea app móvil ahora. | Futuros adaptadores nativos y autenticación/almacenamiento móviles. |
| N10 | Pendiente de operación | Condiciones de salida y limitaciones documentadas. | Privacidad/borrado, soporte, registros seguros, alertas de gasto y respuesta a incidentes del servicio real. |

## Evidencia y limitaciones

- 220 pruebas Node aprobadas: reglas, cuentas locales y reductor de servidor con repositorio simulado.
- 40 comprobaciones nuevas de interfaz y 31 de regresión. Archivos JSON y capturas en `test-output/`.
- 16 vistas en siete anchuras: 112 combinaciones geométricas, sin desbordamiento horizontal en esas muestras.
- Navegador Chromium con almacenamiento inyectado sobre `about:blank`. Persistencia nativa, cámara, Safari, correo, OAuth y base de datos real NO probados.
- Ningún repo remoto, dominio, cuenta de servicio, despliegue ni compra se ha realizado.

## Orden recomendado del siguiente bloque técnico

1. Terminar API de hogares y permisos, transacciones y el adaptador web. No usar la instantánea antigua por usuario como sustituto.
2. Implementar alta compartida y dispositivo infantil restringido, correo y Google; completar Apple cuando esté su cuenta configurada.
3. Conectar archivos privados, operaciones por entidad, conflictos y cola offline.
4. Programar cierres/intereses/avisos; añadir Google Calendar e importador remoto de recetas con validación de URLs.
5. Validar migración y restauración completas, dos adultos más una tablet, Safari/Android y un ciclo de convivencia.

## Reglas que se conservan

Objetivo semanal constante aunque haya menos días presentes; ninguna acumulación de paga en semanas completas fuera. El calendario de convivencia gobierna la presencia, no el nombre de un evento. Puntos y dinero ya abonados no se convierten en fichas ni se mezclan. No se reintroducen reunión familiar, casa virtual o juegos financieros.
