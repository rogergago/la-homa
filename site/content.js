const APP = 'https://app.lahoma.app';

const faq = [
  {
    q: '¿Hay que instalar algo?',
    a: 'No. La Homa funciona en el navegador del móvil, de la tablet o del ordenador. Si la usáis a menudo, podéis añadirla a la pantalla de inicio y se abre como cualquier otra app.'
  },
  {
    q: '¿Mis hijos necesitan correo electrónico?',
    a: 'No es obligatorio. Pueden usar la tablet o el móvil de un adulto con su perfil. Si ya tienen correo, puedes invitarles a su propia cuenta: solo verán lo suyo.'
  },
  {
    q: '¿Podemos usarla los dos adultos de la casa?',
    a: 'Sí. Quien crea la casa invita al otro adulto, que entra con su propia cuenta y ve la misma casa. Nadie tiene que compartir su contraseña.'
  },
  {
    q: '¿Los puntos se convierten en dinero?',
    a: 'No. Los puntos ayudan a ver el esfuerzo y llegar a un objetivo. Las recompensas son retos especiales, no un cobro por cada tarea. La paga se apunta aparte y los puntos nunca se cambian por euros.'
  },
  {
    q: '¿Quién puede ver los datos de mi familia?',
    a: 'Solo los adultos que pertenecen a tu casa. Quien administra La Homa ve los datos de contacto de las cuentas adultas para poder ayudaros, pero no los nombres de tus hijos, el dinero ni las fotos.'
  },
  {
    q: '¿Sirve si los niños viven en dos casas?',
    a: 'Sí, aunque no hace falta para usar La Homa. Si tenéis custodia compartida, el calendario de convivencia marca qué días está cada niño en la vuestra, y las tareas, el menú y la paga se ajustan a esos días. Si no lo necesitáis, no tenéis que configurarlo.'
  }
];

const faqHtml = faq.map(item => `
    <details>
      <summary>${item.q}</summary>
      <p>${item.a}</p>
    </details>`).join('');

const check = text => `<li>${text}</li>`;

const heroMock = `
<div class="hero-visual">
  <div class="mock-window" role="img" aria-label="Pantalla de inicio de La Homa con el reto familiar de la semana y las tarjetas de Lucía, Pablo y Kira, la perra.">
    <div class="mock-bar"><i></i><i></i><i></i><span>app.lahoma.app</span></div>
    <div class="mock-body">
      <div class="m-banner">
        <div>
          <small>SEMANA DEL 5 AL 11 DE OCTUBRE</small>
          <b>Hola, equipo.</b>
          <span>Quedan tres días para cerrar la semana.</span>
        </div>
        <div class="m-team">
          <small>RETO FAMILIAR</small>
          <b>146 <em>/ 200</em></b>
          <div class="m-bar light"><span class="w-73"></span></div>
          <span>Tarde de cine en casa</span>
        </div>
      </div>
      <div class="m-members">
        <div class="m-member">
          <div class="m-who"><span class="m-avatar lilac">🦊</span><div><b>Lucía</b><small>9 años</small></div></div>
          <p class="m-score">42 <em>/ 60 pts</em></p>
          <div class="m-bar"><span class="w-70"></span></div>
          <small class="m-foot">🎟️ Tarde de piscina</small>
        </div>
        <div class="m-member">
          <div class="m-who"><span class="m-avatar sand">🐻</span><div><b>Pablo</b><small>6 años</small></div></div>
          <p class="m-score">38 <em>/ 50 pts</em></p>
          <div class="m-bar coral"><span class="w-76"></span></div>
          <small class="m-foot">🍕 Elige la cena</small>
        </div>
        <div class="m-member pet">
          <div class="m-who"><span class="m-avatar sage">🐶</span><div><b>Kira</b><small>Perra</small></div></div>
          <p class="m-pet">Paseo de la tarde</p>
          <small class="m-foot">Lo anota Marta · sin puntos</small>
        </div>
      </div>
    </div>
  </div>
  <div class="mock-phone" role="img" aria-label="La lista de tareas de Lucía para hoy en el móvil: una hecha y dos pendientes.">
    <div class="phone-screen">
      <small class="m-eyebrow">HOY · JUEVES</small>
      <b class="m-title">Hola, Lucía 🦊</b>
      <ul class="m-tasks">
        <li class="done"><i></i><span>Hacer la cama</span><em>+5</em></li>
        <li><i></i><span>Poner la mesa</span><em>+10</em></li>
        <li><i></i><span>Leer 20 minutos</span><em>+10</em></li>
      </ul>
      <div class="m-progress">
        <div><b>42</b> de 60 puntos</div>
        <div class="m-bar"><span class="w-70"></span></div>
        <small>Te faltan 18 para la tarde de piscina.</small>
      </div>
    </div>
  </div>
</div>`;

const weekMock = `
<div class="mock-card" role="img" aria-label="Lista de tareas de la casa con los días de la semana marcados, un turno que rota y una propuesta de cambio entre hermanos.">
  <div class="mc-head"><b>Tareas de la casa</b><span class="m-pill">Esta semana</span></div>
  <div class="mc-row">
    <span class="mc-icon">🛏️</span>
    <div class="grow"><b>Hacer la cama</b><small>Lucía y Pablo · 5 puntos</small><div class="m-days"><i class="on">L</i><i class="on">M</i><i class="on">X</i><i class="on">J</i><i class="on">V</i><i class="on">S</i><i class="on">D</i></div></div>
  </div>
  <div class="mc-row">
    <span class="mc-icon">🍽️</span>
    <div class="grow"><b>Poner la mesa</b><small>Lucía · 10 puntos</small><div class="m-days"><i class="on">L</i><i class="on">M</i><i class="on">X</i><i class="on">J</i><i class="on">V</i><i>S</i><i>D</i></div></div>
  </div>
  <div class="mc-row">
    <span class="mc-icon">🗑️</span>
    <div class="grow"><b>Sacar la basura</b><small>Turno semanal · esta semana Pablo, la próxima Lucía</small></div>
    <span class="m-pill sage">Rota</span>
  </div>
  <div class="mc-swap">
    <b>Pablo ↔ Lucía</b>
    <p>«Te cambio poner la mesa del martes por sacar la basura del jueves.»</p>
    <div><span class="m-btn">Aceptar</span><span class="m-btn quiet">Ahora no</span></div>
  </div>
</div>`;

const moneyMock = `
<div class="mock-card money" role="img" aria-label="Hucha de Lucía con 48,50 euros repartidos entre gastar, ahorro con intereses y un objetivo de una bici.">
  <div class="mm-hero">
    <small>HUCHA DE LUCÍA</small>
    <b>48,50 €</b>
    <span>Paga de esta semana: 5,00 € por llegar a 60 puntos</span>
  </div>
  <div class="mm-pockets">
    <div><small>Para gastar</small><b>12,50 €</b><em>Lo decide ella</em></div>
    <div><small>Ahorro</small><b>36,00 €</b><em class="up">+0,42 € de intereses este mes</em></div>
  </div>
  <div class="mm-goal">
    <span>🚲</span>
    <div class="grow"><b>Estoy ahorrando para una bici</b><small>36 € de 120 €</small><div class="m-bar sage"><span class="w-30"></span></div></div>
  </div>
</div>`;

const calendarMock = `
<div class="mock-card" role="img" aria-label="Calendario de la semana de la familia, con los planes de cada día y una excursión con su lista de preparación.">
  <div class="mc-head"><b>Calendario de la familia</b><span class="m-pill rose">Esta semana</span></div>
  <div class="m-presence">
    <div class="away"><small>L</small><b>5</b><span>—</span></div>
    <div class="home"><small>M</small><b>6</b><span>Inglés</span></div>
    <div class="home"><small>X</small><b>7</b><span>Excursión</span></div>
    <div class="home"><small>J</small><b>8</b><span>Inglés</span></div>
    <div class="home"><small>V</small><b>9</b><span>Dentista</span></div>
    <div class="home"><small>S</small><b>10</b><span>Cumple</span></div>
    <div class="away"><small>D</small><b>11</b><span>—</span></div>
  </div>
  <div class="mc-event">
    <span class="mc-icon rose">🚌</span>
    <div class="grow"><b>Excursión a la granja</b><small>Miércoles 7 · 9:00 · Pablo</small></div>
    <span class="m-pill">2 de 3</span>
  </div>
  <ul class="m-checklist">
    <li class="done"><span>Autorización firmada</span><em>Marta</em></li>
    <li class="done"><span>Mochila con almuerzo</span><em>Pablo</em></li>
    <li><span>Ropa de cambio</span><em>Jorge</em></li>
  </ul>
</div>`;

const kitchenMock = `
<div class="mock-card" role="img" aria-label="Menú de cuatro días y la lista de la compra que sale de él, con lo que ya hay en la despensa.">
  <div class="mc-head"><b>Menú de la semana</b><span class="m-pill sand">4 personas</span></div>
  <div class="m-menu">
    <div><small>LUN</small><span>🥘</span><b>Lentejas</b></div>
    <div><small>MAR</small><span>🍝</span><b>Macarrones</b></div>
    <div><small>MIÉ</small><span>🐟</span><b>Merluza al horno</b></div>
    <div><small>JUE</small><span>🥗</span><b>Ensalada de garbanzos</b></div>
  </div>
  <div class="m-shop">
    <div class="mc-head"><b>Lista del súper</b><span class="m-muted">Sale del menú</span></div>
    <ul>
      <li class="done"><span>Merluza</span><em>600 g</em></li>
      <li><span>Garbanzos cocidos</span><em>2 botes</em></li>
      <li><span>Tomates</span><em>1 kg</em></li>
      <li><span>Huevos</span><em>6</em></li>
    </ul>
    <p class="m-pantry">Ya en la despensa: lentejas, macarrones, aceite.</p>
  </div>
</div>`;

const home = `
<section class="hero wrap">
  <div class="hero-copy">
    <p class="eyebrow">Una familia. Un equipo.</p>
    <h1>Una forma más fácil de vivir en familia.</h1>
    <p class="lede">Menos cosas en la cabeza. Más responsabilidad compartida. Más tiempo para vivir juntos. La Homa hace visible la organización del hogar para que cada persona sepa qué depende de ella.</p>
    <div class="actions">
      <a class="button" href="${APP}">Crear mi casa</a>
      <a class="button quiet" href="#como-se-usa">Ver cómo se usa</a>
    </div>
    <p class="hero-note">Funciona en el navegador. Entras con tu correo o con tu cuenta de Google.</p>
  </div>
  ${heroMock}
</section>

<section class="wrap section why">
  <div class="section-head">
    <p class="eyebrow">La carga mental</p>
    <h2>¿Por qué tiene que acordarse siempre la misma persona de todo?</h2>
    <p class="lede">Cuando todo depende de una persona, el hogar pesa demasiado. No se trata solo de repartir tareas: se trata de repartir responsabilidad. La Homa convierte la organización invisible en algo visible, compartido y accesible para todos.</p>
  </div>
  <div class="questions">
    <article>
      <p class="q">«Te lo he dicho mil veces.»</p>
      <p class="a">Pasa a: «Sabes que esto depende de ti.»</p>
    </article>
    <article>
      <p class="q">«Todo depende de mí.»</p>
      <p class="a">Pasa a: «Ya no depende todo de mí.»</p>
    </article>
    <article>
      <p class="q">«¿Qué tenemos que hacer hoy?»</p>
      <p class="a">Pasa a: «Todos sabemos lo que tenemos que hacer.»</p>
    </article>
  </div>
</section>

<section class="wrap section">
  <div class="section-head center">
    <p class="eyebrow">Participar · Responsabilizarse · Aprender</p>
    <h2>Un hogar donde todos forman parte.</h2>
    <p class="lede">A los adultos les quita peso de la cabeza. A los niños les da responsabilidades que les ayudan a crecer. A toda la familia, una forma de organizarse juntos y vivir mejor.</p>
  </div>
</section>

<section class="wrap section" id="como-se-usa">
  <div class="section-head center">
    <p class="eyebrow">En el día a día</p>
    <h2>Cuatro sitios donde la responsabilidad deja de ser invisible.</h2>
  </div>

  <article class="feature tint-lilac">
    <div class="feature-copy">
      <p class="eyebrow">Tareas y puntos</p>
      <h3>Cada uno sabe qué depende de él, y lo marca él mismo.</h3>
      <p>Defines las responsabilidades de la casa una vez. La Homa las reparte en los días en que cada persona está en casa. El cambio no es «te lo asigno»: es «esto depende de ti».</p>
      <p>Los puntos ayudan a ver el esfuerzo. Al llegar al objetivo de la semana se desbloquea una recompensa acordada — no un premio por todo, sino un reto especial que enseña constancia y valor.</p>
      <ul class="checks">
        ${check('Los turnos pasan de un hermano a otro cada semana sin que nadie lo recuerde.')}
        ${check('Un niño puede proponer a su hermano cambiar una tarea, y el otro decide si acepta.')}
        ${check('Si una tarea se queda sin hacer, un adulto puede proponer otra para recuperar los puntos esa misma semana.')}
      </ul>
    </div>
    ${weekMock}
  </article>

  <article class="feature tint-sage flip">
    <div class="feature-copy">
      <p class="eyebrow">Paga y ahorro</p>
      <h3>Aprender que las cosas tienen un valor.</h3>
      <p>La paga se prepara al cerrar la semana. Cada niño reparte en su hucha lo que gasta, lo que ahorra y lo que guarda para un objetivo. Marcarse algo, esforzarse y conseguirlo.</p>
      <p>Si quieres, el ahorro genera intereses con el porcentaje que tú decidas. Colaborar en casa no es cobrar por todo: las recompensas son para retos especiales.</p>
      <ul class="checks">
        ${check('Los puntos y los euros van por separado: los puntos nunca se cambian por dinero.')}
        ${check('Cada movimiento queda apuntado. Un error se corrige con un apunte nuevo, sin borrar el anterior.')}
        ${check('Un niño no puede mover el dinero de nadie, ni siquiera el suyo sin un adulto.')}
      </ul>
    </div>
    ${moneyMock}
  </article>

  <article class="feature tint-rose">
    <div class="feature-copy">
      <p class="eyebrow">Calendario</p>
      <h3>Los planes llegan preparados, no a última hora.</h3>
      <p>Apunta las citas, las excursiones y los cumpleaños con su fecha y quién va. Lo que se repite, como la extraescolar de los martes, se crea una vez.</p>
      <p>Un plan especial puede llevar su lista de preparación: la autorización firmada, la mochila con el almuerzo, el regalo. Cada cosa tiene un responsable y se tacha cuando está lista.</p>
      <ul class="checks">
        ${check('Puedes pasar los planes a Google Calendar o al Calendario de Apple con un archivo .ics.')}
        ${check('Si los niños viven en dos casas, puedes marcar qué días está cada uno en la vuestra, y las tareas y el menú se ajustan a esos días.')}
      </ul>
    </div>
    ${calendarMock}
  </article>

  <article class="feature tint-sand flip">
    <div class="feature-copy">
      <p class="eyebrow">Menú, recetas y compra</p>
      <h3>Del menú de la semana a la lista de la compra, sin copiar nada.</h3>
      <p>Guarda las recetas que hacéis en casa con sus ingredientes. Al preparar el menú de la semana, La Homa propone las raciones según quién come en casa cada día y lleva a la lista de la compra lo que falta.</p>
      <p>La despensa lleva la cuenta de lo que ya tenéis. Lo que marcas como comprado en la lista del súper entra en la despensa, y el apartado «Ideas con lo que hay» te enseña qué recetas puedes hacer con lo que queda.</p>
      <ul class="checks">
        ${check('Listas separadas para el súper, la frutería o la farmacia.')}
        ${check('Los productos de siempre se añaden con un toque.')}
      </ul>
    </div>
    ${kitchenMock}
  </article>
</section>

<section class="wrap section">
  <div class="section-head">
    <p class="eyebrow">El equipo</p>
    <h2>Cada uno tiene su papel, y ve lo que depende de él.</h2>
  </div>
  <div class="roles">
    <article>
      <span class="role-icon lilac">🧑</span>
      <h3>Los adultos</h3>
      <p>Cada adulto entra con su propia cuenta, desde el móvil o el ordenador. Crea las tareas, prepara la paga, aprueba lo que hay que revisar y ve toda la casa. Si sois dos, el segundo se une con una invitación.</p>
    </article>
    <article>
      <span class="role-icon sand">🧒</span>
      <h3>Los niños</h3>
      <p>Ven solo lo suyo: tareas, puntos, recompensas y hucha. Pueden usar la tablet sin cuenta, o tener correo propio si ya lo tienen. El objetivo no es controlarlos mejor: es que necesiten cada vez menos control.</p>
    </article>
    <article>
      <span class="role-icon sage">🐶</span>
      <h3>Las mascotas</h3>
      <p>Para mucha gente también son familia, así que aparecen en la casa con su nombre y su foto. Su paseo o su comida son tareas de las personas. Ellas no suman puntos ni tienen paga.</p>
    </article>
    <article>
      <span class="role-icon rose">📱</span>
      <h3>La tablet de la cocina</h3>
      <p>Una vista grande y sencilla para dejarla en un sitio de paso. Cada niño toca su cara, ve lo que le toca hoy y lo marca cuando lo ha hecho. Las rutinas se siguen paso a paso, con un dibujo grande en cada uno.</p>
    </article>
  </div>
</section>

<section class="wrap section">
  <div class="not-list">
    <div>
      <p class="eyebrow">Lo que hemos dejado fuera</p>
      <h2>No es un juego ni un mando a distancia para padres.</h2>
      <p class="lede">La Homa ayuda a que la casa funcione como un equipo. Por eso hay cosas que no tiene, y no las va a tener.</p>
    </div>
    <ul>
      <li><b>Sin jefe de la casa.</b> No sirve para controlar a los demás: sirve para que cada uno sepa qué depende de él.</li>
      <li><b>Sin clasificaciones entre hermanos.</b> Cada niño se compara solo con su propio objetivo.</li>
      <li><b>Sin premios por todo.</b> Colaborar forma parte de vivir juntos; las recompensas son para objetivos especiales.</li>
      <li><b>Sin chat ni localización.</b> Para hablar está la mesa; La Homa no pregunta dónde está nadie.</li>
    </ul>
  </div>
</section>

<section class="wrap section">
  <div class="section-head center">
    <p class="eyebrow">Cómo empezar</p>
    <h2>Tu casa queda lista en unos minutos.</h2>
  </div>
  <ol class="steps">
    <li>
      <span>1</span>
      <h3>Crea tu cuenta</h3>
      <p>Con tu correo y una contraseña, o con tu cuenta de Google. Solo hace falta la de un adulto para empezar.</p>
    </li>
    <li>
      <span>2</span>
      <h3>Presenta a tu familia</h3>
      <p>Una guía te pide el nombre de la casa, quién vive en ella y, si las hay, las mascotas. Lo que no sepas ahora lo puedes añadir después.</p>
    </li>
    <li>
      <span>3</span>
      <h3>Prueba una semana</h3>
      <p>Empieza con tres o cuatro tareas y una recompensa. Cuando la casa se acostumbre, añade la paga, el menú o el calendario.</p>
    </li>
  </ol>
</section>

<section class="wrap section faq-section">
  <div class="section-head">
    <p class="eyebrow">Preguntas frecuentes</p>
    <h2>Lo que suele preguntar una familia antes de empezar.</h2>
  </div>
  <div class="faq">${faqHtml}
  </div>
</section>

<section class="wrap section">
  <div class="cta">
    <h2>Menos cosas en la cabeza. Más tiempo juntos.</h2>
    <p>Crea la casa, dad a cada uno un papel claro y empezad esta semana. Organizaros juntos. Crecer juntos.</p>
    <div class="actions">
      <a class="button light" href="${APP}">Crear mi casa</a>
      <a class="button ghost" href="/como-funciona">Ver una semana de ejemplo</a>
    </div>
  </div>
</section>`;

const timeline = [
  {
    when: 'Antes de empezar',
    title: 'Preparas la casa una vez',
    text: 'Marta crea su cuenta y la guía le pide el nombre de la casa, a Jorge, a Lucía, a Pablo y a Kira. Después elige unas pocas tareas con sus días y sus puntos, el objetivo de cada niño, su recompensa y la paga. Jorge recibe una invitación y entra con su propia cuenta.'
  },
  {
    when: 'Lunes por la mañana',
    title: 'Cada niño ve lo que le toca',
    text: 'Antes del colegio, Lucía toca su cara en la tablet de la cocina. Ve que hoy le toca hacer la cama y preparar la mochila, y las marca al terminar. Sus puntos suben en ese momento y Marta lo ve desde el móvil.'
  },
  {
    when: 'Martes',
    title: 'Un cambio pedido, no impuesto',
    text: 'Pablo tiene fútbol a la hora de cenar y propone a Lucía cambiarle poner la mesa por sacar la basura del jueves. Lucía acepta y cada tarea pasa a su nueva dueña sin que un adulto tenga que rehacer nada.'
  },
  {
    when: 'Miércoles',
    title: 'La excursión llega preparada',
    text: 'La excursión de Pablo lleva su lista: la autorización firmada, la mochila con el almuerzo y la ropa de cambio. Cada cosa tiene un responsable. La noche antes solo falta tachar la última.'
  },
  {
    when: 'Jueves',
    title: 'La cena ya está decidida',
    text: 'El menú dice ensalada de garbanzos, y nadie tiene que preguntar a las siete qué se cena. Los garbanzos ya estaban en la lista desde el domingo. Al marcarlos como comprados, pasan a la despensa.'
  },
  {
    when: 'Viernes',
    title: 'Una tarea que se quedó sin hacer',
    text: 'Lucía no ordenó su cuarto. Jorge la marca como no realizada y, en lugar de quitarle la semana, le propone una tarea de recuperación para el sábado. Si la hace, recupera los puntos de esa semana.'
  },
  {
    when: 'Domingo por la noche',
    title: 'Se cierra la semana',
    text: 'Marta cierra la semana. Lucía ha llegado a 60 puntos: su tarde de piscina se convierte en un vale y la paga entra en su hucha. La semana queda guardada en el historial, sin comparar a un hermano con otro, y empieza la siguiente.'
  }
];

const howBody = `
<section class="wrap page-hero">
  <p class="eyebrow">Cómo funciona</p>
  <h1>De «todo depende de mí» a «lo tenemos controlado».</h1>
  <p class="lede">Así se ve una semana normal cuando la organización deja de vivir en una sola cabeza. El ejemplo: Marta y Jorge, Lucía y Pablo, y Kira, la perra. Una familia. Un equipo.</p>
</section>

<section class="wrap timeline">
  ${timeline.map(item => `
  <article>
    <p class="when">${item.when}</p>
    <div>
      <h2>${item.title}</h2>
      <p>${item.text}</p>
    </div>
  </article>`).join('')}
</section>

<section class="wrap section">
  <div class="section-head">
    <p class="eyebrow">La filosofía</p>
    <h2>Participar. Responsabilizarse. Aprender.</h2>
  </div>
  <div class="rules">
    <article>
      <h3>Visible para todos</h3>
      <p>La Homa convierte la organización invisible en una responsabilidad compartida. Cada persona sabe qué tiene que hacer, cuándo hacerlo y qué depende de ella.</p>
    </article>
    <article>
      <h3>Sin jefe de la casa</h3>
      <p>Los adultos configuran el hogar; no persiguen a los demás. Los niños marcan lo suyo y piden revisiones. El objetivo es que necesiten cada vez menos control.</p>
    </article>
    <article>
      <h3>Esfuerzo con valor</h3>
      <p>Colaborar forma parte de vivir juntos: no todo se cobra. Los puntos y recompensas sirven para objetivos especiales: marcarse algo, esforzarse y conseguirlo.</p>
    </article>
    <article>
      <h3>Empiezas por lo que necesitáis</h3>
      <p>Puedes usar solo las tareas y añadir la paga, el menú o el calendario cuando os venga bien. Lo que no uséis no hace falta configurarlo.</p>
    </article>
  </div>
</section>

<section class="wrap section">
  <div class="cta">
    <h2>Organizaros juntos. Crecer juntos.</h2>
    <p>No hace falta prepararlo todo. Con unas pocas responsabilidades claras ya empezáis a quitar peso de una sola cabeza.</p>
    <div class="actions"><a class="button light" href="${APP}">Crear mi casa</a></div>
  </div>
</section>`;

const familiesBody = `
<section class="wrap page-hero">
  <p class="eyebrow">Para quién es</p>
  <h1>Para hogares que quieren funcionar como un equipo.</h1>
  <p class="lede">Dos adultos o uno, niños pequeños o que ya manejan dinero, mascotas, una o dos casas. La Homa se adapta a cómo es tu hogar — y ayuda a que todos participen, se responsabilicen y aprendan.</p>
</section>

<section class="wrap families">
  <article class="tint-lilac">
    <span class="role-icon">👫</span>
    <h2>Dos adultos que comparten la responsabilidad</h2>
    <p>Cada uno entra con su cuenta y ve lo mismo. Ya no hace falta que una sola persona cargue con acordarse de todo, preguntar y perseguir. La organización es compartida.</p>
  </article>
  <article class="tint-sand">
    <span class="role-icon">🧸</span>
    <h2>Niños pequeños</h2>
    <p>Las rutinas se siguen paso a paso en la tablet. Empiezan a saber qué depende de ellos sin que nadie se lo recuerde mil veces. Participar en casa también es aprender para la vida.</p>
  </article>
  <article class="tint-sage">
    <span class="role-icon">🚲</span>
    <h2>Niños que empiezan a manejar dinero</h2>
    <p>Aprenden que las cosas tienen un valor: marcarse un objetivo, esforzarse y conseguirlo. La hucha separa gasto, ahorro y meta. Colaborar en casa no es cobrar por todo; las recompensas son para retos especiales.</p>
  </article>
  <article class="tint-rose">
    <span class="role-icon">🐶</span>
    <h2>Casas con mascotas</h2>
    <p>La mascota aparece en la familia con su nombre y su foto. Sus cuidados son tareas de las personas: quien saca a Kira de paseo es quien suma los puntos. Las mascotas no suman puntos, no tienen paga y no cuentan en las raciones del menú.</p>
  </article>
  <article class="tint-lilac">
    <span class="role-icon">🏠</span>
    <h2>Un solo adulto</h2>
    <p>Cuando todo depende de una persona, el hogar pesa demasiado. Tenerlo visible y compartido con los niños ya quita carga mental, aunque solo haya una cuenta adulta.</p>
  </article>
  <article class="tint-sand">
    <span class="role-icon">🗓️</span>
    <h2>Custodia compartida</h2>
    <p>Si los niños viven en dos casas, el calendario de convivencia marca qué días está cada uno en la vuestra. Las tareas, el menú y la paga se ajustan a esos días. Es una opción: si no la necesitáis, no tenéis que configurarla.</p>
  </article>
</section>

<section class="wrap section">
  <div class="cta">
    <h2>Un hogar donde todos tienen su papel.</h2>
    <p>Crea la casa con quienes viven en ella hoy. Invita a quien tenga correo, o dejad que usen la tablet. Si algo cambia, se cambia en la familia.</p>
    <div class="actions"><a class="button light" href="${APP}">Crear mi casa</a></div>
  </div>
</section>`;

const privacyBody = `
<article class="wrap page narrow">
  <p class="eyebrow">Privacidad</p>
  <h1>Lo que pasa en tu casa lo ven los adultos de tu casa.</h1>
  <p class="lede">Aquí explicamos qué guarda La Homa, quién puede verlo y qué no hacemos con ello. Describe cómo funciona hoy el servicio; no sustituye a un texto legal.</p>
  <div class="prose">
    <h2>Las cuentas</h2>
    <p>Solo los adultos tienen cuenta. Entran con su correo y una contraseña, o con su cuenta de Google. Los niños y las mascotas forman parte de la familia, pero no tienen cuenta, correo ni contraseña.</p>
    <h2>Los datos de la casa</h2>
    <p>Las tareas, los puntos, el dinero, el calendario, la cocina y las fichas de la familia se guardan en la nube, en servidores de Supabase en la Unión Europea. Cada casa solo la pueden leer las cuentas adultas que pertenecen a ella.</p>
    <h2>Lo que ve quien administra La Homa</h2>
    <p>Para dar soporte y saber si el servicio funciona, quien administra La Homa ve el nombre de cada casa y los datos de contacto de las cuentas adultas: nombre, apellidos, correo y teléfono, si lo hay. También ve cuántos adultos, niños y mascotas tiene la casa, cuántas cosas usa (por ejemplo, cuántas tareas o recetas hay) y cuándo se usó por última vez.</p>
    <p>El panel de administración no abre los nombres de los niños, el contenido de las tareas, la paga, los ahorros, la convivencia ni las fotos. Tampoco permite entrar en una casa haciéndose pasar por un adulto. Sí permite corregir los datos de contacto, quitar el acceso a una cuenta y borrar una casa entera con todo lo que contiene, por ejemplo cuando la familia lo pide.</p>
    <h2>Las fotos</h2>
    <p>Las fotos de la familia solo se ven dentro de la casa. No aparecen en esta web, ni en el blog, ni en el panel de administración.</p>
    <h2>Esta web</h2>
    <p>Esta web no usa cookies de seguimiento ni carga programas de terceros. Los artículos del blog son públicos; los borradores no se muestran a nadie.</p>
  </div>
</article>`;

export const pages = [
  {
    path: '/',
    file: 'index.html',
    title: 'La Homa · Una forma más fácil de vivir en familia',
    description: 'Menos carga mental, más responsabilidad compartida. La Homa ayuda a las familias a organizarse como un equipo y a que los niños aprendan autonomía y el valor del esfuerzo.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: 'La Homa',
          url: 'https://lahoma.app/',
          description: 'Una familia. Un equipo. Una forma más fácil de vivir en familia.',
          inLanguage: 'es'
        },
        {
          '@type': 'WebApplication',
          name: 'La Homa',
          url: 'https://app.lahoma.app/',
          applicationCategory: 'LifestyleApplication',
          operatingSystem: 'Web',
          inLanguage: 'es'
        },
        {
          '@type': 'FAQPage',
          mainEntity: faq.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a }
          }))
        }
      ]
    },
    body: home
  },
  {
    path: '/como-funciona',
    file: 'como-funciona/index.html',
    title: 'Cómo funciona',
    description: 'De la carga mental a la responsabilidad compartida: cómo una familia vive una semana con La Homa y aprende a funcionar como un equipo.',
    body: howBody
  },
  {
    path: '/familias',
    file: 'familias/index.html',
    title: 'Para quién es',
    description: 'Para hogares que quieren compartir la organización y la responsabilidad: dos adultos o uno, niños, mascotas y, si hace falta, custodia compartida.',
    body: familiesBody
  },
  {
    path: '/privacidad',
    file: 'privacidad/index.html',
    title: 'Privacidad',
    description: 'Qué guarda La Homa, quién puede ver los datos de tu casa y qué ve el panel de administración.',
    body: privacyBody
  }
];
