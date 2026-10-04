export const pages = [
  {
    path: '/',
    file: 'index.html',
    title: 'La Homa · Tu vida familiar, organizada',
    description: 'Organización familiar: tareas, paga, ahorro, calendario y cocina. Los niños no necesitan correo. Las mascotas están en la familia y no suman puntos.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'La Homa',
      url: 'https://lahoma.app',
      description: 'Tu vida familiar, organizada.',
      inLanguage: 'es'
    },
    body: `
<section class="hero">
  <div>
    <p class="eyebrow">Organización familiar</p>
    <h1>Tu vida familiar, organizada.</h1>
    <p class="lede">Tareas, paga, ahorro, calendario y cocina, en un sitio para la casa. Los niños tienen su lugar sin correo. Las mascotas también, y no suman puntos.</p>
    <div class="actions">
      <a class="button" href="https://app.lahoma.app">Empezar</a>
      <a class="button quiet" href="/como-funciona">Cómo funciona</a>
    </div>
  </div>
  <aside class="sample" aria-label="Ejemplo de una semana">
    <p class="sample-label">Ejemplo · esta semana</p>
    <h2>La casa, de un vistazo</h2>
    <ul>
      <li><span>Poner la mesa</span><small>Lunes</small></li>
      <li><span>Paga del viernes</span><small>Se prepara al cerrar la semana</small></li>
      <li><span>Lentejas</span><small>Comida del miércoles</small></li>
    </ul>
  </aside>
</section>
<section class="band">
  <h2>Qué guarda la casa</h2>
  <div class="cards">
    <article><h3>La semana</h3><p>Tareas, rutinas y un objetivo que se mantiene aunque alguien esté fuera unos días.</p></article>
    <article><h3>El dinero</h3><p>Paga, ahorro e interés. Los puntos de la semana no se convierten en euros.</p></article>
    <article><h3>La cocina</h3><p>Del menú a la receta, a la despensa y a la lista de la compra.</p></article>
    <article><h3>El calendario</h3><p>Planes, preparación y la convivencia cuando la custodia es compartida.</p></article>
  </div>
</section>
<section class="split">
  <div>
    <p class="eyebrow">Empieza así</p>
    <h2>Tres pasos y la casa ya tiene sitio</h2>
    <ol class="steps">
      <li><strong>La cuenta.</strong> Correo o Google. Hace falta una cuenta adulta para abrir la casa.</li>
      <li><strong>La familia.</strong> Nombre de la casa, personas y, si viven con vosotros, las mascotas.</li>
      <li><strong>La nube.</strong> La semana queda guardada y se abre en el móvil y en el ordenador.</li>
    </ol>
  </div>
  <div class="note-card">
    <h2>Quién entra y quién no</h2>
    <p>Los adultos entran con su cuenta. Los niños y las mascotas viven en la familia: no tienen correo, ni contraseña, ni puntos en el caso de las mascotas.</p>
    <a href="/familias">Ver para quién es</a>
  </div>
</section>
<section class="close">
  <h2>Cuando queráis empezar</h2>
  <p>La app es el lugar de la casa. Esta web explica qué es.</p>
  <a class="button" href="https://app.lahoma.app">Abrir la app</a>
</section>`
  },
  {
    path: '/como-funciona',
    file: 'como-funciona/index.html',
    title: 'Cómo funciona',
    description: 'Creas la cuenta, armas la familia y la semana, la paga y la cocina se guardan en la nube.',
    body: `
<article class="page">
  <p class="eyebrow">Cómo funciona</p>
  <h1>Una casa, con cuenta.</h1>
  <p class="lede">La Homa no se abre en un archivo suelto del ordenador. Entras con correo o con Google y la familia se guarda en la nube.</p>
  <section>
    <h2>1. Entráis los adultos</h2>
    <p>El alta pide un correo y una contraseña, o continúa con Google. Si otro adulto ya creó la casa, puede invitarte para que entres con tu propia cuenta.</p>
  </section>
  <section>
    <h2>2. Armáis la familia</h2>
    <p>La primera vez, una guía pide el nombre de la casa, tu nombre, las demás personas y las mascotas. Una mascota es de la familia: se ve en la ficha, no inicia sesión y no suma puntos.</p>
  </section>
  <section>
    <h2>3. Organizáis la semana</h2>
    <p>Las tareas y las rutinas viven en la semana. El objetivo no se encoge solo porque alguien pase fuera unos días. Lo ya pagado o ya anotado no se reescribe al cambiar un ajuste.</p>
  </section>
  <section>
    <h2>4. El dinero va aparte de los puntos</h2>
    <p>La paga, el ahorro y el interés tienen su propio movimiento. Cerrar la semana no convierte los puntos en euros. Un niño no mueve el dinero de otro.</p>
  </section>
  <section>
    <h2>5. La cocina y el calendario</h2>
    <p>El menú puede pasar a la lista de la compra. El calendario guarda planes y, si la custodia es compartida, la convivencia dice quién está en la casa.</p>
  </section>
  <p><a class="button" href="https://app.lahoma.app">Crear la casa</a></p>
</article>`
  },
  {
    path: '/familias',
    file: 'familias/index.html',
    title: 'Para quién es',
    description: 'Dos adultos, niños sin correo, mascotas sin puntos y custodia compartida.',
    body: `
<article class="page">
  <p class="eyebrow">Familias</p>
  <h1>Hecha para una casa real.</h1>
  <p class="lede">No es un juego ni un ranking entre hermanos. Es el sitio donde la casa se pone de acuerdo.</p>
  <div class="cards tight">
    <article><h2>Dos adultos</h2><p>Cada uno entra con su cuenta. Nadie comparte la contraseña para ver la casa.</p></article>
    <article><h2>Niños sin correo</h2><p>Están en la familia, con sus tareas y su paga. No hace falta crearles un email.</p></article>
    <article><h2>Mascotas</h2><p>Se añaden como parte de la casa. No cobran paga, no usan la tablet y no suman puntos. Los cuidados los anota una persona.</p></article>
    <article><h2>Custodia compartida</h2><p>El calendario de convivencia marca los días en casa. Esos días ordenan la presencia, no un nombre suelto en un evento.</p></article>
  </div>
</article>`
  },
  {
    path: '/privacidad',
    file: 'privacidad/index.html',
    title: 'Privacidad',
    description: 'Qué guarda La Homa y qué puede ver el panel de la casa.',
    body: `
<article class="page narrow">
  <p class="eyebrow">Privacidad</p>
  <h1>La casa la ven sus adultos.</h1>
  <p class="lede">Esto describe cómo está hecha La Homa hoy. No es un texto legal cerrado.</p>
  <h2>La cuenta</h2>
  <p>Un adulto entra con correo y contraseña, o con Google. Los niños y las mascotas no tienen sesión.</p>
  <h2>Los datos de la casa</h2>
  <p>Tareas, dinero, calendario, cocina y fichas de la familia se guardan en el proyecto de Supabase asociado a La Homa. Cada casa la leen las cuentas adultas que pertenecen a ella.</p>
  <h2>El panel de La Homa</h2>
  <p>Quien administra el servicio ve el nombre de la casa, cuántos adultos, niños y mascotas hay, cuántas cuentas están unidas y la última actividad. También ve las altas recientes de cuentas adultas. No abre nombres de las personas, paga, ahorros, custodia ni fotos.</p>
  <h2>El blog</h2>
  <p>Los artículos publicados en esta web son públicos. Un borrador no se muestra y no entra en el mapa del sitio.</p>
  <h2>Fotos</h2>
  <p>Las fotos de la familia no se publican en esta web ni en el panel.</p>
</article>`
  }
];
