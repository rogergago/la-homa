/* La Homa locales. Spain languages first, then en/fr/it/de. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HomaI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE = 'lahoma-locale';
  const LOCALES = [
    { code: 'es', label: 'Español', native: 'Español', bcp: 'es-ES' },
    { code: 'ca', label: 'Català', native: 'Català', bcp: 'ca-ES' },
    { code: 'va', label: 'Valencià', native: 'Valencià', bcp: 'ca-ES-valencia' },
    { code: 'eu', label: 'Euskara', native: 'Euskara', bcp: 'eu-ES' },
    { code: 'gl', label: 'Galego', native: 'Galego', bcp: 'gl-ES' },
    { code: 'en', label: 'English', native: 'English', bcp: 'en-GB' },
    { code: 'fr', label: 'Français', native: 'Français', bcp: 'fr-FR' },
    { code: 'it', label: 'Italiano', native: 'Italiano', bcp: 'it-IT' },
    { code: 'de', label: 'Deutsch', native: 'Deutsch', bcp: 'de-DE' }
  ];
  const codes = new Set(LOCALES.map(l => l.code));

  const es = {
    lang: 'Idioma',
    chooseLang: 'Elige el idioma',
    brandSub: 'Una familia. Un equipo.',
    authEyebrow: 'Una familia. Un equipo.',
    authTitleLogin: 'Bienvenidos a casa.',
    authTitleRegister: 'Empezamos como un equipo.',
    authSub: 'Menos cosas en la cabeza. Más responsabilidad compartida. Correo o Google, y vuestra casa en la nube.',
    name: 'Tu nombre (adulto)',
    email: 'Correo electrónico',
    password: 'Contraseña',
    repeat: 'Repite la contraseña',
    invite: 'Código de invitación, si te han invitado',
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    haveAccount: 'Ya tengo cuenta.',
    noAccount: 'Todavía no tengo cuenta.',
    orContinue: 'O continúa con',
    kidsNote: 'Los niños pueden tener correo propio o usar la tablet. Solo ven lo suyo: la autonomía empieza cuando dejan de necesitar que se lo recuerden todo.',
    sessionNote: 'Hace falta iniciar sesión. La sesión se mantiene hasta que la cierres.',
    whatIs: 'Qué es La Homa',
    checking: 'Comprobando...',
    guideEyebrow: 'Vuestro equipo',
    guideStoryTitle: 'Un hogar donde todos participan.',
    guideStoryText: 'Primero quiénes sois. Después, qué depende de cada uno. Organizaros juntos. Crecer juntos.',
    guideStep: 'Paso {n} de 3',
    guideTitle0: 'Cómo se llama vuestra casa',
    guideTitle1: 'Quién vive aquí',
    guideTitle2: 'Las mascotas también',
    familyName: 'Nombre de la casa',
    adultName: 'Tu nombre',
    guideAdultHint: 'Tú eres la cuenta master: no el jefe de la casa, sino quien abre el espacio. Puedes invitar a otros o dejarlos sin cuenta.',
    guidePeopleHint: 'Niños y otros adultos del equipo. Si hoy estás solo, continúa: podrás añadirlos después.',
    guideEmailHint: 'El correo es opcional. Si lo pones, podrás invitarles a crear su propia cuenta. Si no, usarán la tablet o el móvil de un adulto.',
    optionalEmail: 'Correo (opcional)',
    guidePetsHint: 'Un perro, un gato o quien consideréis de la familia. No inician sesión ni cuentan como un plato en la mesa.',
    personName: 'Nombre',
    personIs: 'Es',
    child: 'Niño o niña',
    adult: 'Adulto',
    addPerson: 'Añadir otra persona',
    addPet: 'Añadir otra mascota',
    animal: 'Animal',
    dog: 'Perro',
    cat: 'Gato',
    other: 'Otro',
    remove: 'Quitar',
    back: 'Atrás',
    continue: 'Continuar',
    enterHome: 'Entrar en casa',
    guideNeedNames: 'Escribe el nombre de la casa y el tuyo.',
    familyReady: 'La familia está lista.',
    navHome: 'Hoy',
    navTasks: 'Tareas',
    navCalendar: 'Agenda',
    navKitchen: 'Cocina',
    navFamily: 'Familia',
    navShared: 'Espacio compartido',
    tabletView: 'Vista tablet',
    skipContent: 'Saltar al contenido',
    setupTitle: 'Que cada uno sepa qué depende de él',
    hideGuide: 'Ocultar guía',
    setupPeople: 'Personas',
    setupPresence: 'Convivencia (opcional)',
    setupTasks: 'Tareas',
    setupMoney: 'Paga (opcional)',
    setupNote: 'No se trata solo de repartir tareas: se trata de repartir responsabilidad. Los niños pueden tener correo o usar la tablet.',
    todayHome: 'Hoy en casa',
    noPresence: 'No hay convivencia prevista hoy.',
    tourTitle: 'Así funciona vuestro equipo',
    tourSkip: 'Saltar tutorial',
    tourNext: 'Siguiente',
    tourDone: 'Empezar a vivir en equipo',
    tour1Title: 'Ya no tiene que estar todo en una cabeza',
    tour1Text: 'La Homa hace visible la organización del hogar. En unos pasos ves dónde está cada cosa. Puedes saltarlo cuando quieras.',
    tour2Title: 'Quién forma parte del equipo',
    tour2Text: 'Añade personas, invita con correo si quieres, y deja claro el papel de cada uno en casa.',
    tour3Title: 'Lo que depende de cada uno',
    tour3Text: 'Define lo que hay que hacer. Cada persona lo ve, lo recuerda y lo marca. Sin perseguir a los demás.',
    tour4Title: 'Planes que se anticipan',
    tour4Text: 'Citas, excursiones y listas de preparación. Menos prisas de última hora.',
    tour5Title: 'Menú y compra, sin cargarlo todo tú',
    tour5Text: 'Recetas, menú de la semana y la lista que sale de él. La organización deja de vivir solo en una cabeza.',
    tour6Title: 'Esfuerzo, objetivos y valor',
    tour6Text: 'Opcional. Enseña a marcarse un objetivo, esforzarse y conseguirlo. Colaborar en casa no es cobrar por todo.',
    settingsLang: 'Idioma de la app',
    settingsLangHelp: 'Cambia los textos de La Homa en este dispositivo. Se guarda con tu cuenta en la nube.',
    saveLang: 'Guardar idioma'
  };

  function copy(base, patch) { return Object.assign({}, base, patch); }

  const dict = {
    es,
    ca: copy(es, {
      lang: 'Idioma', chooseLang: 'Tria l’idioma', brandSub: 'Una família. Un equip.',
      authEyebrow: 'El vostre espai familiar', authTitleLogin: 'Que bé veure-us.', authTitleRegister: 'Comencem en família.',
      authSub: 'Correu o Google. La família es desa al núvol i és als vostres dispositius.',
      name: 'El teu nom (adult)', email: 'Correu electrònic', password: 'Contrasenya', repeat: 'Repeteix la contrasenya',
      invite: 'Codi d’invitació, si t’han convidat', login: 'Inicia la sessió', register: 'Crea el compte',
      haveAccount: 'Ja tinc compte.', noAccount: 'Encara no tinc compte.', orContinue: 'O continua amb',
      kidsNote: 'Els infants i les mascotes viuen a la família. No necessiten el seu propi compte.',
      sessionNote: 'Cal iniciar la sessió. La sessió es manté fins que la tanquis.', whatIs: 'Què és La Homa', checking: 'Comprovant...',
      guideEyebrow: 'La vostra família', guideStoryTitle: 'La casa es construeix amb noms.',
      guideStoryText: 'Primer qui sou. Després, les tasques, la paga i la compra.',
      guideStep: 'Pas {n} de 3', guideTitle0: 'Com es diu la vostra casa', guideTitle1: 'Qui viu aquí', guideTitle2: 'Les mascotes també',
      familyName: 'Nom de la casa', adultName: 'El teu nom', guideAdultHint: 'Tu ets qui administra. La resta no necessiten correu.',
      guidePeopleHint: 'Infants i altres adults. Si avui ets sol, continua: els podràs afegir després.',
      guidePetsHint: 'Un gos, un gat o qui considereu de la família. No inicien sessió ni compten com un plat a taula.',
      personName: 'Nom', personIs: 'És', child: 'Nen o nena', adult: 'Adult', addPerson: 'Afegeix una altra persona',
      addPet: 'Afegeix una altra mascota', animal: 'Animal', dog: 'Gos', cat: 'Gat', other: 'Altre', remove: 'Treu',
      back: 'Enrere', continue: 'Continua', enterHome: 'Entra a casa', guideNeedNames: 'Escriu el nom de la casa i el teu.',
      familyReady: 'La família està a punt.',
      navHome: 'Avui', navTasks: 'Tasques', navCalendar: 'Agenda', navKitchen: 'Cuina', navFamily: 'Família',
      navShared: 'Espai compartit', tabletView: 'Vista tauleta', skipContent: 'Salta al contingut',
      setupTitle: 'Deixeu La Homa a la vostra mida', hideGuide: 'Amaga la guia',
      setupPeople: 'Persones', setupPresence: 'Convivència (opcional)', setupTasks: 'Tasques', setupMoney: 'Paga (opcional)',
      setupNote: 'Un compte és per a un adult. Els infants tenen perfils, sense correu propi.',
      todayHome: 'Avui a casa', noPresence: 'No hi ha convivència prevista avui.',
      tourTitle: 'Us ensenyem La Homa', tourSkip: 'Salta el tutorial', tourNext: 'Següent', tourDone: 'Comença a fer servir La Homa',
      tour1Title: 'La vostra casa ja està a punt', tour1Text: 'En uns passos us mostrem on és cada cosa. Podeu saltar-ho quan vulgueu.',
      tour2Title: 'Persones de la família', tour2Text: 'Aquí afegiu infants, altres adults i mascotes, i editeu les seves fitxes.',
      tour3Title: 'Tasques de la setmana', tour3Text: 'Creeu les tasques recurrents, assigneu-les i seguiu els punts de cadascú.',
      tour4Title: 'Agenda i plans', tour4Text: 'Cites, excursions i, si us cal, els dies de convivència.',
      tour5Title: 'Cuina', tour5Text: 'Receptes, menú de la setmana i la llista de la compra que en surt.',
      tour6Title: 'Paga i estalvi', tour6Text: 'La paga setmanal i les guardioles de cada infant. És opcional.',
      settingsLang: 'Idioma de l’app', settingsLangHelp: 'Canvia els textos de La Homa en aquest dispositiu. Es desa amb el compte al núvol.',
      saveLang: 'Desa l’idioma'
    }),
    va: copy(es, {
      lang: 'Idioma', chooseLang: 'Tria l’idioma', brandSub: 'Una família. Un equip.',
      authEyebrow: 'El vostre espai familiar', authTitleLogin: 'Que bé veure-vos.', authTitleRegister: 'Comencem en família.',
      authSub: 'Correu o Google. La família es guarda al núvol i està als vostres dispositius.',
      name: 'El teu nom (adult)', email: 'Correu electrònic', password: 'Contrasenya', repeat: 'Repeteix la contrasenya',
      invite: 'Codi d’invitació, si t’han convidat', login: 'Inicia la sessió', register: 'Crea el compte',
      haveAccount: 'Ja tinc compte.', noAccount: 'Encara no tinc compte.', orContinue: 'O continua amb',
      kidsNote: 'Els xiquets i les mascotes viuen a la família. No necessiten el seu propi compte.',
      sessionNote: 'Cal iniciar la sessió. La sessió es manté fins que la tanques.', whatIs: 'Què és La Homa', checking: 'Comprovant...',
      guideEyebrow: 'La vostra família', guideStoryTitle: 'La casa es construïx amb noms.',
      guideStoryText: 'Primer qui sou. Després, les faenes, la paga i la compra.',
      guideStep: 'Pas {n} de 3', guideTitle0: 'Com es diu la vostra casa', guideTitle1: 'Qui viu ací', guideTitle2: 'Les mascotes també',
      familyName: 'Nom de la casa', adultName: 'El teu nom', guideAdultHint: 'Tu eres qui administra. La resta no necessiten correu.',
      guidePeopleHint: 'Xiquets i altres adults. Si hui estàs sol, continua: els podràs afegir després.',
      guidePetsHint: 'Un gos, un gat o qui considereu de la família. No inicien sessió ni conten com un plat a taula.',
      personName: 'Nom', personIs: 'És', child: 'Xiquet o xiqueta', adult: 'Adult', addPerson: 'Afig una altra persona',
      addPet: 'Afig una altra mascota', animal: 'Animal', dog: 'Gos', cat: 'Gat', other: 'Un altre', remove: 'Treu',
      back: 'Arrere', continue: 'Continua', enterHome: 'Entra a casa', guideNeedNames: 'Escriu el nom de la casa i el teu.',
      familyReady: 'La família està llesta.',
      navHome: 'Hui', navTasks: 'Faenes', navCalendar: 'Agenda', navKitchen: 'Cuina', navFamily: 'Família',
      navShared: 'Espai compartit', tabletView: 'Vista tauleta', skipContent: 'Salta al contingut',
      setupTitle: 'Deixeu La Homa a la vostra mida', hideGuide: 'Amaga la guia',
      setupPeople: 'Persones', setupPresence: 'Convivència (opcional)', setupTasks: 'Faenes', setupMoney: 'Paga (opcional)',
      setupNote: 'Un compte és per a un adult. Els xiquets tenen perfils, sense correu propi.',
      todayHome: 'Hui a casa', noPresence: 'No hi ha convivència prevista hui.',
      tourTitle: 'Us ensenyem La Homa', tourSkip: 'Salta el tutorial', tourNext: 'Següent', tourDone: 'Comença a usar La Homa',
      tour1Title: 'La vostra casa ja està llesta', tour1Text: 'En uns passos us mostrem on és cada cosa. Podeu saltar-ho quan vulgueu.',
      tour2Title: 'Persones de la família', tour2Text: 'Ací afegiu xiquets, altres adults i mascotes, i editeu les seues fitxes.',
      tour3Title: 'Faenes de la setmana', tour3Text: 'Creeu les faenes recurrents, assigneu-les i seguiu els punts de cadascú.',
      tour4Title: 'Agenda i plans', tour4Text: 'Cites, excursions i, si us cal, els dies de convivència.',
      tour5Title: 'Cuina', tour5Text: 'Receptes, menú de la setmana i la llista de la compra que en ix.',
      tour6Title: 'Paga i estalvi', tour6Text: 'La paga setmanal i les guardioles de cada xiquet. És opcional.',
      settingsLang: 'Idioma de l’app', settingsLangHelp: 'Canvia els textos de La Homa en este dispositiu. Es guarda amb el compte al núvol.',
      saveLang: 'Guarda l’idioma'
    }),
    eu: copy(es, {
      lang: 'Hizkuntza', chooseLang: 'Aukeratu hizkuntza', brandSub: 'Familia bat. Talde bat.',
      authEyebrow: 'Zuen familia gunea', authTitleLogin: 'Pozik ikusten zaituztegu.', authTitleRegister: 'Familian hasiko gara.',
      authSub: 'Posta edo Google. Familia hodeian gordetzen da eta zuen gailuetan dago.',
      name: 'Zure izena (heldua)', email: 'Helbide elektronikoa', password: 'Pasahitza', repeat: 'Errepikatu pasahitza',
      invite: 'Gonbidapen kodea, gonbidatu bazaituzte', login: 'Hasi saioa', register: 'Sortu kontua',
      haveAccount: 'Badut kontua.', noAccount: 'Oraindik ez dut konturik.', orContinue: 'Edo jarraitu honekin',
      kidsNote: 'Haurrak eta animaliak familian bizi dira. Ez dute kontu propiorik behar.',
      sessionNote: 'Saioa hasi behar da. Saioa itxi arte mantentzen da.', whatIs: 'Zer da La Homa', checking: 'Egiaztatzen...',
      guideEyebrow: 'Zuen familia', guideStoryTitle: 'Etxea izenekin eraikitzen da.',
      guideStoryText: 'Lehenik nor zareten. Gero, lanak, dirua eta erosketak.',
      guideStep: '{n}/3 urratsa', guideTitle0: 'Nola deitzen da zuen etxea', guideTitle1: 'Nor bizi da hemen', guideTitle2: 'Animaliak ere',
      familyName: 'Etxearen izena', adultName: 'Zure izena', guideAdultHint: 'Zu zara kudeatzailea. Besteek ez dute postarik behar.',
      guidePeopleHint: 'Haurrak eta beste helduak. Gaur bakarrik bazaude, jarraitu: geroago gehi ditzakezu.',
      guidePetsHint: 'Txakurra, katua edo familiakotzat dituzuenak. Ez dute saiorik hasten.',
      personName: 'Izena', personIs: 'Da', child: 'Umea', adult: 'Heldua', addPerson: 'Gehitu beste pertsona bat',
      addPet: 'Gehitu beste animalia bat', animal: 'Animalia', dog: 'Txakurra', cat: 'Katua', other: 'Beste bat', remove: 'Kendu',
      back: 'Atzera', continue: 'Jarraitu', enterHome: 'Sartu etxean', guideNeedNames: 'Idatzi etxearen izena eta zurea.',
      familyReady: 'Familia prest dago.',
      navHome: 'Gaur', navTasks: 'Lana', navCalendar: 'Agenda', navKitchen: 'Sukaldea', navFamily: 'Familia',
      navShared: 'Espazio partekatua', tabletView: 'Tableta ikuspegia', skipContent: 'Joan edukira',
      setupTitle: 'Egokitu La Homa zuen neurrian', hideGuide: 'Ezkutatu gida',
      setupPeople: 'Pertsonak', setupPresence: 'Bizikidetza (aukerakoa)', setupTasks: 'Lana', setupMoney: 'Dirua (aukerakoa)',
      setupNote: 'Kontu bat heldu batentzat da. Haurrak profilekin daude, postarik gabe.',
      todayHome: 'Gaur etxean', noPresence: 'Gaur ez dago bizikidetzarik aurreikusita.',
      tourTitle: 'La Homa erakutsiko dizuegu', tourSkip: 'Saltatu tutoriala', tourNext: 'Hurrengoa', tourDone: 'Hasi La Homa erabiltzen',
      tour1Title: 'Zuen etxea prest dago', tour1Text: 'Urrats gutxitan non dagoen bakoitza erakutsiko dizuegu. Nahi duzuenean salto egin dezakezue.',
      tour2Title: 'Familia kideak', tour2Text: 'Hemen haurrak, beste helduak eta animaliak gehitzen dituzue.',
      tour3Title: 'Asteko lanak', tour3Text: 'Sortu lan errepikakorrak, esleitu eta jarraitu puntuak.',
      tour4Title: 'Agenda eta planak', tour4Text: 'Hitzorduak, irteerak eta, behar baduzue, bizikidetza egunak.',
      tour5Title: 'Sukaldea', tour5Text: 'Errezetak, asteko menua eta erosketa zerrenda.',
      tour6Title: 'Dirua eta aurrezpena', tour6Text: 'Asteko dirua eta haurren kutxak. Aukerakoa da.',
      settingsLang: 'Apparen hizkuntza', settingsLangHelp: 'Aldatu La Homaren testuak gailu honetan. Zure kontuarekin gordetzen da.',
      saveLang: 'Gorde hizkuntza'
    }),
    gl: copy(es, {
      lang: 'Idioma', chooseLang: 'Escolle o idioma', brandSub: 'Unha familia. Un equipo.',
      authEyebrow: 'O voso espazo familiar', authTitleLogin: 'Que ben vervos.', authTitleRegister: 'Comezamos en familia.',
      authSub: 'Correo ou Google. A familia gárdase na nube e está nos vosos dispositivos.',
      name: 'O teu nome (adulto)', email: 'Correo electrónico', password: 'Contrasinal', repeat: 'Repite o contrasinal',
      invite: 'Código de convite, se te convidaron', login: 'Iniciar sesión', register: 'Crear conta',
      haveAccount: 'Xa teño conta.', noAccount: 'Aínda non teño conta.', orContinue: 'Ou continúa con',
      kidsNote: 'Os nenos e as mascotas viven na familia. Non necesitan a súa propia conta.',
      sessionNote: 'Hai que iniciar sesión. A sesión mantense ata que a peches.', whatIs: 'Que é La Homa', checking: 'Comprobando...',
      guideEyebrow: 'A vosa familia', guideStoryTitle: 'A casa constrúese con nomes.',
      guideStoryText: 'Primeiro quen sodes. Despois, as tarefas, a paga e a compra.',
      guideStep: 'Paso {n} de 3', guideTitle0: 'Como se chama a vosa casa', guideTitle1: 'Quen vive aquí', guideTitle2: 'As mascotas tamén',
      familyName: 'Nome da casa', adultName: 'O teu nome', guideAdultHint: 'Ti es quen administra. Os demais non necesitan correo.',
      guidePeopleHint: 'Nenos e outros adultos. Se hoxe estás só, continúa: poderás engadilos despois.',
      guidePetsHint: 'Un can, un gato ou quen considereades da familia. Non inician sesión.',
      personName: 'Nome', personIs: 'É', child: 'Neno ou nena', adult: 'Adulto', addPerson: 'Engadir outra persoa',
      addPet: 'Engadir outra mascota', animal: 'Animal', dog: 'Can', cat: 'Gato', other: 'Outro', remove: 'Quitar',
      back: 'Atrás', continue: 'Continuar', enterHome: 'Entrar na casa', guideNeedNames: 'Escribe o nome da casa e o teu.',
      familyReady: 'A familia está lista.',
      navHome: 'Hoxe', navTasks: 'Tarefas', navCalendar: 'Axenda', navKitchen: 'Cociña', navFamily: 'Familia',
      navShared: 'Espazo compartido', tabletView: 'Vista tableta', skipContent: 'Saltar ao contido',
      setupTitle: 'Deixade La Homa á vosa medida', hideGuide: 'Agochar guía',
      setupPeople: 'Persoas', setupPresence: 'Convivencia (opcional)', setupTasks: 'Tarefas', setupMoney: 'Paga (opcional)',
      setupNote: 'Unha conta é para un adulto. Os nenos teñen perfís, sen correo propio.',
      todayHome: 'Hoxe na casa', noPresence: 'Non hai convivencia prevista hoxe.',
      tourTitle: 'Ensinámosvos La Homa', tourSkip: 'Saltar o tutorial', tourNext: 'Seguinte', tourDone: 'Comezar a usar La Homa',
      tour1Title: 'A vosa casa xa está lista', tour1Text: 'Nuns pasos mostrámosvos onde está cada cousa. Podedes saltalo cando queirades.',
      tour2Title: 'Persoas da familia', tour2Text: 'Aquí engadides nenos, outros adultos e mascotas.',
      tour3Title: 'Tarefas da semana', tour3Text: 'Creades as tarefas recorrentes, asígnadelas e seguide os puntos.',
      tour4Title: 'Axenda e plans', tour4Text: 'Citas, excursións e, se o necesitades, os días de convivencia.',
      tour5Title: 'Cociña', tour5Text: 'Receitas, menú da semana e a lista da compra.',
      tour6Title: 'Paga e aforro', tour6Text: 'A paga semanal e as huchas de cada neno. É opcional.',
      settingsLang: 'Idioma da app', settingsLangHelp: 'Cambia os textos de La Homa neste dispositivo. Gárdase coa conta na nube.',
      saveLang: 'Gardar idioma'
    }),
    en: copy(es, {
      lang: 'Language', chooseLang: 'Choose language', brandSub: 'One family. One team.',
      authEyebrow: 'One family. One team.', authTitleLogin: 'Welcome home.', authTitleRegister: 'Let’s start as a team.',
      authSub: 'Less on your mind. More shared responsibility. Email or Google — your home in the cloud.',
      name: 'Your name (adult)', email: 'Email', password: 'Password', repeat: 'Repeat password',
      invite: 'Invite code, if you were invited', login: 'Sign in', register: 'Create account',
      haveAccount: 'I already have an account.', noAccount: 'I don’t have an account yet.', orContinue: 'Or continue with',
      kidsNote: 'Children can have their own email or use the tablet. They only see their space — autonomy means needing fewer reminders.',
      sessionNote: 'You need to sign in. Your session stays until you sign out.', whatIs: 'What is La Homa', checking: 'Checking...',
      guideEyebrow: 'Your team', guideStoryTitle: 'A home where everyone takes part.',
      guideStoryText: 'First who you are. Then what depends on each of you. Organise together. Grow together.',
      guideStep: 'Step {n} of 3', guideTitle0: 'What is your home called', guideTitle1: 'Who lives here', guideTitle2: 'Pets too',
      familyName: 'Home name', adultName: 'Your name', guideAdultHint: 'You’re the master account — not the boss of the house. Invite others by email, or leave them without an account.',
      guidePeopleHint: 'Children and other adults. If you’re alone today, continue — you can add them later.',
      guidePetsHint: 'A dog, a cat, or anyone you count as family. They don’t sign in or count as a plate at the table.',
      personName: 'Name', personIs: 'Is', child: 'Child', adult: 'Adult', addPerson: 'Add another person',
      addPet: 'Add another pet', animal: 'Animal', dog: 'Dog', cat: 'Cat', other: 'Other', remove: 'Remove',
      back: 'Back', continue: 'Continue', enterHome: 'Enter home', guideNeedNames: 'Enter the home name and yours.',
      familyReady: 'Your family is ready.',
      navHome: 'Today', navTasks: 'Tasks', navCalendar: 'Calendar', navKitchen: 'Kitchen', navFamily: 'Family',
      navShared: 'Shared space', tabletView: 'Tablet view', skipContent: 'Skip to content',
      setupTitle: 'So everyone knows what depends on them', hideGuide: 'Hide guide',
      setupPeople: 'People', setupPresence: 'Custody days (optional)', setupTasks: 'Tasks', setupMoney: 'Pocket money (optional)',
      setupNote: 'It’s not just about sharing chores — it’s about sharing responsibility. Children can have email or use the tablet.',
      todayHome: 'Home today', noPresence: 'No one is expected home today.',
      tourTitle: 'How your team works', tourSkip: 'Skip tutorial', tourNext: 'Next', tourDone: 'Start living as a team',
      tour1Title: 'It doesn’t all have to live in one head', tour1Text: 'La Homa makes home organisation visible. We’ll show you where everything is. Skip anytime.',
      tour2Title: 'Who’s on the team', tour2Text: 'Add people, invite them by email if you want, and make each person’s role clear.',
      tour3Title: 'What depends on each person', tour3Text: 'Define what needs doing. Each person sees it, remembers it and ticks it off — without chasing anyone.',
      tour4Title: 'Plans that get ahead of the rush', tour4Text: 'Appointments, trips and, if needed, custody days.',
      tour5Title: 'Menu and shopping, without carrying it alone', tour5Text: 'Recipes, the weekly menu and the shopping list that comes from it.',
      tour6Title: 'Effort, goals and value', tour6Text: 'Optional. Teach goal-setting, effort and reward. Helping at home isn’t about being paid for everything.',
      settingsLang: 'App language', settingsLangHelp: 'Change La Homa’s texts on this device. Saved with your cloud account.',
      saveLang: 'Save language'
    }),
    fr: copy(es, {
      lang: 'Langue', chooseLang: 'Choisir la langue', brandSub: 'Organisation familiale',
      authEyebrow: 'Votre espace familial', authTitleLogin: 'Content de vous revoir.', authTitleRegister: 'On commence en famille.',
      authSub: 'E-mail ou Google. La famille est enregistrée dans le cloud et sur vos appareils.',
      name: 'Votre nom (adulte)', email: 'E-mail', password: 'Mot de passe', repeat: 'Répéter le mot de passe',
      invite: 'Code d’invitation, si on vous a invité', login: 'Se connecter', register: 'Créer un compte',
      haveAccount: 'J’ai déjà un compte.', noAccount: 'Je n’ai pas encore de compte.', orContinue: 'Ou continuer avec',
      kidsNote: 'Les enfants et les animaux vivent dans la famille. Ils n’ont pas besoin de compte.',
      sessionNote: 'Il faut se connecter. La session reste jusqu’à la déconnexion.', whatIs: 'Qu’est-ce que La Homa', checking: 'Vérification...',
      guideEyebrow: 'Votre famille', guideStoryTitle: 'La maison se construit avec des noms.',
      guideStoryText: 'D’abord qui vous êtes. Ensuite les tâches, l’argent de poche et les courses.',
      guideStep: 'Étape {n} sur 3', guideTitle0: 'Comment s’appelle votre maison', guideTitle1: 'Qui vit ici', guideTitle2: 'Les animaux aussi',
      familyName: 'Nom de la maison', adultName: 'Votre nom', guideAdultHint: 'C’est vous qui administrez. Les autres n’ont pas besoin d’e-mail.',
      guidePeopleHint: 'Enfants et autres adultes. Si vous êtes seul aujourd’hui, continuez — vous pourrez les ajouter plus tard.',
      guidePetsHint: 'Un chien, un chat ou qui vous considérez de la famille. Ils ne se connectent pas.',
      personName: 'Nom', personIs: 'Est', child: 'Enfant', adult: 'Adulte', addPerson: 'Ajouter une personne',
      addPet: 'Ajouter un animal', animal: 'Animal', dog: 'Chien', cat: 'Chat', other: 'Autre', remove: 'Retirer',
      back: 'Retour', continue: 'Continuer', enterHome: 'Entrer à la maison', guideNeedNames: 'Écrivez le nom de la maison et le vôtre.',
      familyReady: 'La famille est prête.',
      navHome: 'Aujourd’hui', navTasks: 'Tâches', navCalendar: 'Agenda', navKitchen: 'Cuisine', navFamily: 'Famille',
      navShared: 'Espace partagé', tabletView: 'Vue tablette', skipContent: 'Aller au contenu',
      setupTitle: 'Adaptez La Homa à votre maison', hideGuide: 'Masquer le guide',
      setupPeople: 'Personnes', setupPresence: 'Garde partagée (optionnel)', setupTasks: 'Tâches', setupMoney: 'Argent de poche (optionnel)',
      setupNote: 'Un compte est pour un adulte. Les enfants ont des profils, sans e-mail.',
      todayHome: 'À la maison aujourd’hui', noPresence: 'Personne n’est prévu à la maison aujourd’hui.',
      tourTitle: 'On vous montre La Homa', tourSkip: 'Passer le tutoriel', tourNext: 'Suivant', tourDone: 'Commencer à utiliser La Homa',
      tour1Title: 'Votre maison est prête', tour1Text: 'En quelques étapes, on vous montre où est chaque chose. Vous pouvez passer quand vous voulez.',
      tour2Title: 'Personnes de la famille', tour2Text: 'Ajoutez enfants, autres adultes et animaux, et modifiez leurs fiches.',
      tour3Title: 'Tâches de la semaine', tour3Text: 'Créez les tâches récurrentes, assignez-les et suivez les points.',
      tour4Title: 'Agenda et projets', tour4Text: 'Rendez-vous, sorties et, si besoin, les jours de garde.',
      tour5Title: 'Cuisine', tour5Text: 'Recettes, menu de la semaine et liste de courses.',
      tour6Title: 'Argent de poche et épargne', tour6Text: 'L’argent de la semaine et les tirelires. Optionnel.',
      settingsLang: 'Langue de l’app', settingsLangHelp: 'Change les textes de La Homa sur cet appareil. Enregistré avec votre compte cloud.',
      saveLang: 'Enregistrer la langue'
    }),
    it: copy(es, {
      lang: 'Lingua', chooseLang: 'Scegli la lingua', brandSub: 'Una famiglia. Una squadra.',
      authEyebrow: 'Il vostro spazio familiare', authTitleLogin: 'Che bello rivedervi.', authTitleRegister: 'Iniziamo in famiglia.',
      authSub: 'Email o Google. La famiglia si salva nel cloud e sui vostri dispositivi.',
      name: 'Il tuo nome (adulto)', email: 'Email', password: 'Password', repeat: 'Ripeti la password',
      invite: 'Codice di invito, se ti hanno invitato', login: 'Accedi', register: 'Crea account',
      haveAccount: 'Ho già un account.', noAccount: 'Non ho ancora un account.', orContinue: 'O continua con',
      kidsNote: 'I bambini e gli animali vivono nella famiglia. Non serve un loro account.',
      sessionNote: 'Serve accedere. La sessione resta finché non esci.', whatIs: 'Cos’è La Homa', checking: 'Controllo...',
      guideEyebrow: 'La vostra famiglia', guideStoryTitle: 'La casa si costruisce con i nomi.',
      guideStoryText: 'Prima chi siete. Poi i compiti, la paghetta e la spesa.',
      guideStep: 'Passo {n} di 3', guideTitle0: 'Come si chiama la vostra casa', guideTitle1: 'Chi vive qui', guideTitle2: 'Anche gli animali',
      familyName: 'Nome della casa', adultName: 'Il tuo nome', guideAdultHint: 'Tu amministri. Gli altri non hanno bisogno di email.',
      guidePeopleHint: 'Bambini e altri adulti. Se oggi sei solo, continua: potrai aggiungerli dopo.',
      guidePetsHint: 'Un cane, un gatto o chi considerate di famiglia. Non accedono e non contano come un posto a tavola.',
      personName: 'Nome', personIs: 'È', child: 'Bambino o bambina', adult: 'Adulto', addPerson: 'Aggiungi un’altra persona',
      addPet: 'Aggiungi un altro animale', animal: 'Animale', dog: 'Cane', cat: 'Gatto', other: 'Altro', remove: 'Rimuovi',
      back: 'Indietro', continue: 'Continua', enterHome: 'Entra in casa', guideNeedNames: 'Scrivi il nome della casa e il tuo.',
      familyReady: 'La famiglia è pronta.',
      navHome: 'Oggi', navTasks: 'Compiti', navCalendar: 'Agenda', navKitchen: 'Cucina', navFamily: 'Famiglia',
      navShared: 'Spazio condiviso', tabletView: 'Vista tablet', skipContent: 'Vai al contenuto',
      setupTitle: 'Adattate La Homa alla vostra casa', hideGuide: 'Nascondi guida',
      setupPeople: 'Persone', setupPresence: 'Affidamento (opzionale)', setupTasks: 'Compiti', setupMoney: 'Paghetta (opzionale)',
      setupNote: 'Un account è per un adulto. I bambini hanno profili, senza email propria.',
      todayHome: 'Oggi a casa', noPresence: 'Nessuna presenza prevista oggi.',
      tourTitle: 'Vi mostriamo La Homa', tourSkip: 'Salta il tutorial', tourNext: 'Avanti', tourDone: 'Inizia a usare La Homa',
      tour1Title: 'La vostra casa è pronta', tour1Text: 'In pochi passi vi mostriamo dove sta ogni cosa. Potete saltare quando volete.',
      tour2Title: 'Persone della famiglia', tour2Text: 'Qui aggiungete bambini, altri adulti e animali.',
      tour3Title: 'Compiti della settimana', tour3Text: 'Create i compiti ricorrenti, assegnateli e seguite i punti.',
      tour4Title: 'Agenda e piani', tour4Text: 'Appuntamenti, gite e, se serve, i giorni di affidamento.',
      tour5Title: 'Cucina', tour5Text: 'Ricette, menu della settimana e lista della spesa.',
      tour6Title: 'Paghetta e risparmio', tour6Text: 'La paghetta settimanale e i salvadanai. È opzionale.',
      settingsLang: 'Lingua dell’app', settingsLangHelp: 'Cambia i testi di La Homa su questo dispositivo. Si salva con l’account cloud.',
      saveLang: 'Salva lingua'
    }),
    de: copy(es, {
      lang: 'Sprache', chooseLang: 'Sprache wählen', brandSub: 'Eine Familie. Ein Team.',
      authEyebrow: 'Euer Familienraum', authTitleLogin: 'Schön, euch zu sehen.', authTitleRegister: 'Wir starten als Familie.',
      authSub: 'E-Mail oder Google. Die Familie wird in der Cloud und auf euren Geräten gespeichert.',
      name: 'Dein Name (Erwachsener)', email: 'E-Mail', password: 'Passwort', repeat: 'Passwort wiederholen',
      invite: 'Einladungscode, falls du eingeladen wurdest', login: 'Anmelden', register: 'Konto erstellen',
      haveAccount: 'Ich habe schon ein Konto.', noAccount: 'Ich habe noch kein Konto.', orContinue: 'Oder weiter mit',
      kidsNote: 'Kinder und Haustiere gehören zur Familie. Sie brauchen kein eigenes Konto.',
      sessionNote: 'Du musst dich anmelden. Die Sitzung bleibt, bis du dich abmeldest.', whatIs: 'Was ist La Homa', checking: 'Prüfen...',
      guideEyebrow: 'Eure Familie', guideStoryTitle: 'Das Zuhause entsteht mit Namen.',
      guideStoryText: 'Zuerst wer ihr seid. Dann Aufgaben, Taschengeld und Einkauf.',
      guideStep: 'Schritt {n} von 3', guideTitle0: 'Wie heißt euer Zuhause', guideTitle1: 'Wer wohnt hier', guideTitle2: 'Auch Haustiere',
      familyName: 'Name des Zuhauses', adultName: 'Dein Name', guideAdultHint: 'Du verwaltest. Die anderen brauchen keine E-Mail.',
      guidePeopleHint: 'Kinder und andere Erwachsene. Wenn du heute allein bist, mach weiter — du kannst sie später hinzufügen.',
      guidePetsHint: 'Hund, Katze oder wen ihr zur Familie zählt. Sie melden sich nicht an.',
      personName: 'Name', personIs: 'Ist', child: 'Kind', adult: 'Erwachsener', addPerson: 'Weitere Person hinzufügen',
      addPet: 'Weiteres Haustier hinzufügen', animal: 'Tier', dog: 'Hund', cat: 'Katze', other: 'Anderes', remove: 'Entfernen',
      back: 'Zurück', continue: 'Weiter', enterHome: 'Ins Zuhause', guideNeedNames: 'Gib den Namen des Zuhauses und deinen ein.',
      familyReady: 'Die Familie ist bereit.',
      navHome: 'Heute', navTasks: 'Aufgaben', navCalendar: 'Kalender', navKitchen: 'Küche', navFamily: 'Familie',
      navShared: 'Gemeinsamer Bereich', tabletView: 'Tablet-Ansicht', skipContent: 'Zum Inhalt springen',
      setupTitle: 'Passt La Homa an euer Zuhause an', hideGuide: 'Hilfe ausblenden',
      setupPeople: 'Personen', setupPresence: 'Wechselmodell (optional)', setupTasks: 'Aufgaben', setupMoney: 'Taschengeld (optional)',
      setupNote: 'Ein Konto ist für einen Erwachsenen. Kinder haben Profile ohne eigene E-Mail.',
      todayHome: 'Heute zu Hause', noPresence: 'Heute ist niemand zu Hause geplant.',
      tourTitle: 'Wir zeigen euch La Homa', tourSkip: 'Tutorial überspringen', tourNext: 'Weiter', tourDone: 'La Homa nutzen',
      tour1Title: 'Euer Zuhause ist bereit', tour1Text: 'In wenigen Schritten zeigen wir, wo alles ist. Ihr könnt jederzeit überspringen.',
      tour2Title: 'Familienmitglieder', tour2Text: 'Hier fügt ihr Kinder, andere Erwachsene und Haustiere hinzu.',
      tour3Title: 'Wochenaufgaben', tour3Text: 'Erstellt wiederkehrende Aufgaben, weist sie zu und verfolgt Punkte.',
      tour4Title: 'Kalender und Pläne', tour4Text: 'Termine, Ausflüge und bei Bedarf Wechselmodell-Tage.',
      tour5Title: 'Küche', tour5Text: 'Rezepte, Wochenmenü und die Einkaufsliste daraus.',
      tour6Title: 'Taschengeld und Sparen', tour6Text: 'Wöchentliches Taschengeld und die Sparschweine. Optional.',
      settingsLang: 'App-Sprache', settingsLangHelp: 'Ändert die Texte von La Homa auf diesem Gerät. Wird mit dem Cloud-Konto gespeichert.',
      saveLang: 'Sprache speichern'
    })
  };

  function normalize(code) {
    const c = String(code || '').toLowerCase();
    if (codes.has(c)) return c;
    if (c.startsWith('ca-valencia') || c === 'ca-valencia') return 'va';
    const short = c.split('-')[0];
    return codes.has(short) ? short : 'es';
  }

  function detect() {
    try {
      const stored = localStorage.getItem(STORAGE);
      if (stored) return normalize(stored);
    } catch (_) {}
    try {
      const nav = (navigator.languages || [navigator.language || 'es']).map(x => String(x).toLowerCase());
      for (const item of nav) {
        if (item.startsWith('ca') && (item.includes('valencia') || item.includes('vc'))) return 'va';
        const n = normalize(item);
        if (n !== 'es' || item.startsWith('es')) return n === 'es' && !item.startsWith('es') ? normalize(item) : n;
      }
      for (const item of nav) {
        const n = normalize(item);
        if (codes.has(n)) return n;
      }
    } catch (_) {}
    return 'es';
  }

  let current = 'es';
  try { current = detect(); } catch (_) { current = 'es'; }

  function setLocale(code, persist = true) {
    current = normalize(code);
    if (persist) {
      try { localStorage.setItem(STORAGE, current); } catch (_) {}
    }
    try { document.documentElement.lang = current === 'va' ? 'ca' : current; } catch (_) {}
    return current;
  }

  function t(key, vars) {
    const table = dict[current] || es;
    let text = table[key] ?? es[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) text = text.replace(new RegExp('\\{' + k + '\\}', 'g'), String(v));
    return text;
  }

  function bcp() {
    return (LOCALES.find(l => l.code === current) || LOCALES[0]).bcp;
  }

  function langOptions(selected) {
    const sel = normalize(selected || current);
    return LOCALES.map(l => `<option value="${l.code}" ${l.code === sel ? 'selected' : ''}>${l.native}</option>`).join('');
  }

  setLocale(current, false);

  return { LOCALES, STORAGE, normalize, detect, setLocale, getLocale: () => current, t, bcp, langOptions, dict };
});
