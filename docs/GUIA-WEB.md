# La Homa · web primero, coste controlado

**Guía preparada el 3 de octubre de 2026.** Los precios son referencias públicas en USD, sin conversión, impuestos, dominios premium ni sobreconsumos. La recomendación de arquitectura es una propuesta para este proyecto; no es un benchmark comparativo de proveedores.

## 1. La decisión

**Cloudflare Pages para servir la web; Supabase para cuentas, datos y archivos; GitHub para el código; Resend para correos.** Un dominio propio cuando vayamos a enviar correos a usuarios y fijar la dirección estable. No hace falta contratar hosting WordPress, un servidor VPS o las tiendas de apps para esta fase.

La web local puede publicarse como demostración estática. **El servicio multidispositivo todavía necesita desarrollo, no solo configuración.** Consulta `ESTADO.md`: API de hogares, transporte y sincronización, permisos de dispositivo, entrega de avisos y calendarios externos no están completos. La configuración actual evita activar por error el almacenamiento antiguo de una familia por cuenta.

## 2. Qué contratar, y cuándo

| Componente | Prueba inicial | Uso real recomendado | Observación |
|---|---|---|---|
| Cloudflare Pages | Free: 0 USD/mes | Mantener Free mientras alcance | 500 compilaciones/mes. Las peticiones estáticas no tienen coste; las funciones tienen sus propias cuotas. [Fuente](https://www.cloudflare.com/en-gb/developer-platform/products/pages/) |
| Supabase | Free: 0 USD/mes | Pro desde 25 USD/mes cuando sea el registro cotidiano | Free: 500 MB de base, 1 GB de archivos, pausa tras una semana inactivo, sin backups automáticos. Pro incluye el primer proyecto; extras/consumos pueden sumar. [Fuente](https://supabase.com/pricing) |
| GitHub | Free | Free al empezar | Repositorios privados incluidos; 2.000 minutos/mes de Actions en el plan publicado. [Fuente](https://github.com/pricing) |
| Resend | Free | Free mientras alcance | 3.000 correos/mes, límite de 100/día. No confundir correo transaccional con un buzón de soporte. [Fuente](https://resend.com/pricing) |
| Dominio .app | Opcional para ver la demo | Dirección y correo de marca | Porkbun publica 8,75 USD promocionales el primer año y 14,93 USD de renovación estándar; confirmar checkout y nombre concreto. [Fuente](https://porkbun.com/tld/app) |
| Copia externa de datos y archivos | Obligatoria antes de datos reales | Definir destino y retención | Coste según volumen. Una copia SQL no incluye las fotos. [Fuente](https://supabase.com/docs/guides/platform/backups) |

**Presupuesto de arranque:** los servicios pueden costar 0 USD/mes para desarrollo con sus límites, más el dominio al registrarlo. **Referencia para el primer uso cotidiano:** base de 25 USD/mes más dominio y posibles copias, excesos o correo. No es un precio cerrado ni incluye trabajo de desarrollo/mantenimiento. No pagar Pro mientras solo estemos probando pantallas.

Evitar gastos iniciales innecesarios: otro proyecto Pro sin necesidad, dominio personalizado del endpoint de Supabase, copias por segundo, log drains y planes de equipo grandes. Usar un entorno de pruebas separado, local o dentro de la asignación gratuita disponible, sin copiar datos familiares reales allí. Mantener avisos de cuota y revisar consumo; un aviso de presupuesto no siempre equivale a un bloqueo de gasto.

## 3. Por qué no elegir otra cosa ahora

| Opción | Comparación para este proyecto |
|---|---|
| Cloudflare + Supabase | Encaja con la base ya desarrollada, separa web/datos y permite empezar sin servidor propio. Es la opción propuesta, no una garantía de mejor latencia en todos los escenarios. |
| Firebase | Alternativa válida con servicios gestionados. Cloud Storage requiere el plan Blaze y una cuenta de facturación; aún puede haber uso sin coste dentro de asignaciones. Cambiar el modelo actual requiere trabajo, por lo que no lo elegiría solo para ahorrar al inicio. [Fuente](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024) |
| Vercel Hobby | Cómodo para demos personales, pero su uso gratuito está restringido a proyectos personales no comerciales. No lo tomaría como base gratuita de un producto que puede crecer comercialmente. [Fuente](https://vercel.com/docs/plans/hobby) |
| VPS autogestionado | Puede reducir la factura nominal, pero obliga a asumir actualizaciones, base, correo, copias y recuperación. Prefiero ahorrar primero en servicios que no hacen falta, no trasladar esa operación al usuario. Sin presupuesto comparativo actual de VPS. |

## 4. Dominio y titularidad

Mi candidato sigue siendo `lahoma.app`. Alternativa: `somoslahoma.com`. **No se ha confirmado la disponibilidad de ninguno ni realizado una revisión registral de marca.** La tarifa de una extensión no demuestra que un nombre concreto esté libre o cueste esa cantidad.

Comprar solo el dominio, sin paquetes de hosting añadidos. Registrar a nombre del titular, activar doble factor y renovación según la decisión del titular. Separar después web informativa y producto con `app.TU-DOMINIO`; mantener `staging.TU-DOMINIO` sin datos reales y con acceso restringido.

Antes de comprar es posible publicar la demo bajo el subdominio que ofrece Pages. No es necesario cambiar el nombre del producto ni crear una app de tienda para utilizar un dominio `.app`.

## 5. Preparar el repositorio

Crear una cuenta GitHub del titular y un repositorio **privado** llamado `la-homa`, inicialmente vacío. El ZIP incluye `.gitignore`, fuentes, pruebas y la definición de CI; todavía no hay repositorio remoto.

Desde la carpeta descomprimida, con Node 22 y Git instalados:

```sh
npm ci --ignore-scripts
npm run check
node scripts/check-package.cjs
git init -b main
git status --short
git add .
git status --short
git commit -m "La Homa web beta 5"
git remote add origin https://github.com/TU-USUARIO/la-homa.git
git push -u origin main
```

Sustituir solo `TU-USUARIO` por la cuenta correcta. Revisar antes del commit que no aparezcan copias familiares, fotos personales, secretos ni `.env` reales. No compartir contraseñas entre colaboradores; dar acceso a sus propias cuentas. El workflow ejecuta la construcción y pruebas de Node. **No contiene despliegue automático de backend y no se ha ejecutado remotamente.**

## 6. Publicar la web de pruebas en Cloudflare

Este paso publica **la web local/demo**, no activa almacenamiento multidispositivo.

Crear cuenta Cloudflare, abrir Workers & Pages, crear proyecto Pages y conectar solo el repositorio `la-homa`. Elegir rama `main`, sin framework específico, comando `npm run build` y carpeta de salida `web`. Usar Node 22. Pages admite integración Git con despliegues al subir commits. [Guía oficial](https://developers.cloudflare.com/pages/configuration/git-integration/).

No subir `supabase/`, `server/`, `tests/`, `.env`, copias ni toda la carpeta del ZIP como sitio. No añadir claves de servicio en variables públicas de compilación. `config.js` contiene solo valores públicos y debe mantenerse vacío mientras falte el adaptador seguro.

Abrir la URL de Pages en móvil y escritorio y verificar navegación/lectura. Añadir el dominio desde la configuración del proyecto siguiendo sus instrucciones DNS. No inventar un registro o una IP: usar los valores que indique el proveedor para ese proyecto.

## 7. Crear los servicios de datos, sin abrir altas todavía

Crear Supabase Free para integración, con un proyecto en una región europea disponible y contraseña de base generada y guardada en un gestor. La región cercana es una elección de rendimiento; no sustituye el análisis de privacidad del servicio.

El SQL incluido es **un candidato para un proyecto de pruebas vacío**. Sus tablas tienen lectura acotada y escrituras de cliente denegadas, deliberadamente: no hay un servicio de comandos desplegado que las gestione. **No pegar ese SQL y declarar que la nube ya funciona.** Completar primero API HTTP autenticada, transacciones y recibos, hogares/invitaciones, permisos de tablet, transporte por entidades, archivos privados, borrado y migración.

El adaptador debe comprobar la identidad desde tokens del servicio, nunca desde un campo `role` enviado por el navegador. Las operaciones de paga deben confirmarse una sola vez aunque se reintenten. Un dispositivo de niños no debe portar una sesión adulta con escritura ilimitada.

## 8. Correo, registro y acceso

Crear Resend Free y verificar un dominio controlado. Configurar los registros DNS exactos que indique Resend para autenticar el remitente. Usar sus credenciales SMTP en el panel de Auth de Supabase, no en el código público.

El correo predeterminado de Supabase no sirve para un alta pública: restringe destinatarios al equipo y actualmente limita a dos mensajes por hora. Se necesita SMTP propio para confirmaciones y recuperaciones reales. [Documentación](https://supabase.com/docs/guides/auth/auth-smtp).

Configurar la URL principal de la web y la lista exacta de retornos de prueba/producción. Probar confirmación, enlace caducado, reenvío, cambio/olvido de contraseña, renovación y cierre de sesión. No permitir redirecciones arbitrarias. [Retornos de Auth](https://supabase.com/docs/guides/auth/redirect-urls).

Para Google, crear/configurar el cliente web OAuth, consentimiento, orígenes y callback de Supabase, con los permisos mínimos. El acceso a Google Calendar requiere autorización y código adicionales; el botón de login no lo concede. [Acceso con Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

**Apple sigue en el alcance, pero es una configuración independiente de construir la app iOS.** Su acceso web requiere la cuenta e identificadores de Apple y mantenimiento del secreto OAuth cada seis meses. La membresía está publicada a 99 USD/año o importe local. No contratarla ahora para ver la web: puede activarse después de completar el acceso por correo y Google. [Configuración Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple) · [Membresía](https://developer.apple.com/programs/enroll/).

## 9. Guardar realmente todo

Separar datos de negocio, archivos privados y credenciales. Conservar perfiles, fotografías, ingredientes/unidades, listas, menús, convivencias, eventos/checklists/documentos, semanas históricas y movimientos de dinero. No incluir contraseñas, sesiones ni tokens de terceros en una exportación familiar.

El backup diario de una base Supabase de pago no copia los objetos de Storage. Hay que respaldar **base y archivos** a un destino separado y ensayar la restauración de ambos. Definir frecuencia, retención, cifrado y tiempo de recuperación antes de altas reales. La promesa “no perder nada” no se sustituye por un plan Pro. [Alcance de las copias](https://supabase.com/docs/guides/platform/backups).

El primer ensayo debe restaurar en un entorno vacío y comparar saldos, número de tareas/eventos/recetas y acceso a las fotos/adjuntos. Probar que importar dos veces no duplica monederos. Documentar la retirada de permisos y eliminación de archivos huérfanos.

## 10. Responsive y rendimiento

Esta versión se ha revisado entre 320 y 1.920 píxeles: cinco destinos principales, subnavegación desplazable, formularios de una columna en móvil, controles más grandes y textos secundarios reforzados. No hubo desbordamiento horizontal en 112 muestras de vistas y anchuras. Las tablas extensas usan su propio desplazamiento.

La salida actual suma aproximadamente **152 kB con gzip** para HTML/CSS/JS propios de arranque, sin iconos, fotografías, documentos ni el futuro cliente de nube. Es una medida de tamaño local, no tiempo de carga real ni puntuación Lighthouse. El detalle está en `test-output/bundle-sizes.json`.

Antes del lanzamiento, medir en la dirección HTTPS real con conexión móvil, caché fría, datos reales anonimizados de tamaño representativo y un dispositivo de gama media. Paginación de historial, fotos reducidas, peticiones pequeñas y carga diferida importan más que contratar un plan grande sin medir. No hay SLA de velocidad prometido por este documento.

## 11. Mantener abierta la futura app

Conservar reglas reutilizables, API documentada, credenciales fuera de la interfaz y una compilación web portable. Postgres evita atar el modelo de negocio a documentos propietarios, aunque migrar proveedor siempre tendría coste de adaptación.

Capacitor permite integrar una base web moderna en Android/iOS, pero más adelante habrá que adaptar permisos, cámara, almacenamiento seguro, login/retornos, firma y ciclo de vida. No se ha creado ni probado un paquete móvil en esta entrega. [Documentación](https://capacitorjs.com/docs).

## 12. Antes de llamar a esto producción

Dos cuentas adultas deben compartir un hogar sin compartir contraseña. Un tercero no puede acceder a datos o fotos; un niño no puede elevar permisos. Dos dispositivos conservan cambios simultáneos. Reintentar un pago no duplica euros. Semanas fuera no crean paga; semanas parciales conservan objetivo. Los cambios sobreviven a cierre y actualización. Registro, recuperación y revocación funcionan. Una copia completa se restaura realmente. Chrome Android y Safari se prueban en dispositivos reales, junto con teclado/zoom y un ciclo de convivencia.

**Situación actual: no se ha superado esta puerta de salida.** El siguiente paso técnico sigue siendo terminar el bloque de nube, sin nuevas decisiones de producto pendientes por tu parte. Las cuentas gratuitas pueden prepararse ahora; la contratación de pago puede esperar.
