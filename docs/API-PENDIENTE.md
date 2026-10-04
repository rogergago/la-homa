# Contrato pendiente de la API por hogares

Este documento es una especificación de la siguiente implementación. No hay endpoints desplegados.

- Identidad: tokens Auth verificados para adultos; tokens restringidos y revocables para dispositivos. No aceptar el rol del cuerpo de la petición.
- Alta/listado de hogares: id UUID y membresía inicial de propietario en transacción; perfiles infantiles sin correo.
- Invitaciones: token aleatorio almacenado como hash, destinatario, caducidad, aceptación autenticada y revocación.
- Lectura: entidades filtradas por hogar y permisos; dispositivo infantil recibe una proyección que no incluye datos administrativos o credenciales.
- Escritura: comando con identificador único, tipo y payload validado. El reductor `server/operations.cjs` cubre parte de los comandos, no todos los CRUD. Completar el catálogo antes de conectar la UI.
- Transacción: verificar recibo de operación, revisar versión, aplicar reglas, persistir entidades/cambios/auditoría/recibo de forma atómica. Rechazar duplicado con contenido distinto; no devolver información de otro actor solo por conocer el id de operación.
- Archivos: preparar ruta privada de hogar, limitar tipo/tamaño, autorizar descarga temporal, enlazar referencia, borrar y limpiar huérfanos. No aceptar rutas arbitrarias del cliente.
- Cron: zona horaria de cada hogar, cierres y preparación semanal, paga pausada/intereses, avisos deduplicados. Las funciones deben ser idempotentes y tener límites de trabajo.
- Offline: cola persistente por cuenta/dispositivo con claves de idempotencia; dinero solo confirmado por servidor, no por resultado optimista.
- Integraciones: Google Calendar con autorización separada y tokens protegidos; avisos Web Push con permisos/retención; importador de recetas remotas con protección SSRF, tiempos/tamaños limitados y redirects seguros.
- Borrado: diferenciar salir del hogar, borrar perfil y eliminar cuenta. No borrar el hogar de otros adultos al cerrar una cuenta.

Pruebas obligatorias: acceso cruzado, modificación de roles, revocación de tablet, doble pago simultáneo, fallo antes/después del commit, invitación repetida/caducada, cambio de zona y DST, Storage ajeno, recuperación de copia completa, reversión de una versión desplegada. No dar por satisfechos estos casos mediante el repositorio simulado existente.
