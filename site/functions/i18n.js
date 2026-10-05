export const LOCALES = [
  { code: 'es', label: 'Español', htmlLang: 'es', og: 'es_ES', prefix: '' },
  { code: 'ca', label: 'Català', htmlLang: 'ca', og: 'ca_ES', prefix: '/ca' },
  { code: 'va', label: 'Valencià', htmlLang: 'ca', og: 'ca_ES', prefix: '/va' },
  { code: 'eu', label: 'Euskara', htmlLang: 'eu', og: 'eu_ES', prefix: '/eu' },
  { code: 'gl', label: 'Galego', htmlLang: 'gl', og: 'gl_ES', prefix: '/gl' },
  { code: 'en', label: 'English', htmlLang: 'en', og: 'en_GB', prefix: '/en' },
  { code: 'fr', label: 'Français', htmlLang: 'fr', og: 'fr_FR', prefix: '/fr' },
  { code: 'it', label: 'Italiano', htmlLang: 'it', og: 'it_IT', prefix: '/it' },
  { code: 'de', label: 'Deutsch', htmlLang: 'de', og: 'de_DE', prefix: '/de' }
];

const chrome = {
  es: {
    how: 'Cómo funciona', forWhom: 'Para quién es', blog: 'Blog', enter: 'Entrar', create: 'Crear mi casa',
    privacy: 'Privacidad', skip: 'Saltar al contenido', brandSub: 'Una familia. Un equipo.',
    footerTag: 'Organización compartida, menos carga mental y un hogar donde todos participan.',
    footerApp: 'La app', footerInfo: 'Información', tagline: 'Una forma más fácil de vivir en familia.',
    lang: 'Idioma', notFoundTitle: 'Página no encontrada', notFoundH1: 'Esta página no existe.',
    notFoundLede: 'Puede que la dirección esté mal escrita o que la página se haya movido.',
    homeLink: 'Ir al inicio', enterApp: 'Entrar en la app'
  },
  ca: {
    how: 'Com funciona', forWhom: 'Per a qui és', blog: 'Blog', enter: 'Entra', create: 'Crea la meva casa',
    privacy: 'Privadesa', skip: 'Salta al contingut', brandSub: 'Una família. Un equip.',
    footerTag: 'Organització compartida, menys càrrega mental i una llar on tothom participa.',
    footerApp: 'L’app', footerInfo: 'Informació', tagline: 'Una manera més fàcil de viure en família.',
    lang: 'Idioma', notFoundTitle: 'Pàgina no trobada', notFoundH1: 'Aquesta pàgina no existeix.',
    notFoundLede: 'Pot ser que l’adreça estigui mal escrita o que la pàgina s’hagi mogut.',
    homeLink: 'Anar a l’inici', enterApp: 'Entrar a l’app'
  },
  va: {
    how: 'Com funciona', forWhom: 'Per a qui és', blog: 'Blog', enter: 'Entra', create: 'Crea la meua casa',
    privacy: 'Privacitat', skip: 'Salta al contingut', brandSub: 'Una família. Un equip.',
    footerTag: 'Organització compartida, menys càrrega mental i una llar on tothom participa.',
    footerApp: 'L’app', footerInfo: 'Informació', tagline: 'Una manera més fàcil de viure en família.',
    lang: 'Idioma', notFoundTitle: 'Pàgina no trobada', notFoundH1: 'Esta pàgina no existeix.',
    notFoundLede: 'Pot ser que l’adreça estiga mal escrita o que la pàgina s’haja mogut.',
    homeLink: 'Anar a l’inici', enterApp: 'Entrar a l’app'
  },
  eu: {
    how: 'Nola funtzionatzen du', forWhom: 'Norentzat da', blog: 'Bloga', enter: 'Sartu', create: 'Sortu nire etxea',
    privacy: 'Pribatutasuna', skip: 'Joan edukira', brandSub: 'Familia bat. Talde bat.',
    footerTag: 'Antolaketa partekatua, karga mental gutxiago eta denek parte hartzen duten etxe bat.',
    footerApp: 'Aplikazioa', footerInfo: 'Informazioa', tagline: 'Familian bizitzeko modu errazagoa.',
    lang: 'Hizkuntza', notFoundTitle: 'Orria ez da aurkitu', notFoundH1: 'Orri hau ez da existitzen.',
    notFoundLede: 'Helbidea gaizki idatzita egon daiteke edo orria mugitu da.',
    homeLink: 'Hasierara joan', enterApp: 'Aplikaziora sartu'
  },
  gl: {
    how: 'Como funciona', forWhom: 'Para quen é', blog: 'Blog', enter: 'Entrar', create: 'Crear a miña casa',
    privacy: 'Privacidade', skip: 'Saltar ao contido', brandSub: 'Unha familia. Un equipo.',
    footerTag: 'Organización compartida, menos carga mental e un fogar onde todos participan.',
    footerApp: 'A app', footerInfo: 'Información', tagline: 'Unha forma máis doada de vivir en familia.',
    lang: 'Idioma', notFoundTitle: 'Páxina non atopada', notFoundH1: 'Esta páxina non existe.',
    notFoundLede: 'Pode que o enderezo estea mal escrito ou que a páxina se movese.',
    homeLink: 'Ir ao inicio', enterApp: 'Entrar na app'
  },
  en: {
    how: 'How it works', forWhom: 'Who it’s for', blog: 'Blog', enter: 'Sign in', create: 'Create my home',
    privacy: 'Privacy', skip: 'Skip to content', brandSub: 'One family. One team.',
    footerTag: 'Shared organisation, less mental load, a home where everyone takes part.',
    footerApp: 'The app', footerInfo: 'Information', tagline: 'An easier way to live as a family.',
    lang: 'Language', notFoundTitle: 'Page not found', notFoundH1: 'This page doesn’t exist.',
    notFoundLede: 'The address may be wrong or the page may have moved.',
    homeLink: 'Go to home', enterApp: 'Open the app'
  },
  fr: {
    how: 'Comment ça marche', forWhom: 'Pour qui', blog: 'Blog', enter: 'Entrer', create: 'Créer ma maison',
    privacy: 'Confidentialité', skip: 'Aller au contenu', brandSub: 'Une famille. Une équipe.',
    footerTag: 'Organisation partagée, moins de charge mentale et une maison où tout le monde participe.',
    footerApp: 'L’app', footerInfo: 'Informations', tagline: 'Une façon plus simple de vivre en famille.',
    lang: 'Langue', notFoundTitle: 'Page introuvable', notFoundH1: 'Cette page n’existe pas.',
    notFoundLede: 'L’adresse est peut-être incorrecte ou la page a déménagé.',
    homeLink: 'Retour à l’accueil', enterApp: 'Ouvrir l’app'
  },
  it: {
    how: 'Come funziona', forWhom: 'Per chi è', blog: 'Blog', enter: 'Entra', create: 'Crea la mia casa',
    privacy: 'Privacy', skip: 'Vai al contenuto', brandSub: 'Una famiglia. Una squadra.',
    footerTag: 'Organizzazione condivisa, meno carico mentale e una casa dove tutti partecipano.',
    footerApp: 'L’app', footerInfo: 'Informazioni', tagline: 'Un modo più semplice di vivere in famiglia.',
    lang: 'Lingua', notFoundTitle: 'Pagina non trovata', notFoundH1: 'Questa pagina non esiste.',
    notFoundLede: 'L’indirizzo potrebbe essere sbagliato o la pagina potrebbe essere stata spostata.',
    homeLink: 'Vai all’inizio', enterApp: 'Apri l’app'
  },
  de: {
    how: 'So funktioniert’s', forWhom: 'Für wen', blog: 'Blog', enter: 'Anmelden', create: 'Zuhause erstellen',
    privacy: 'Datenschutz', skip: 'Zum Inhalt springen', brandSub: 'Eine Familie. Ein Team.',
    footerTag: 'Geteilte Organisation, weniger mentale Last und ein Zuhause, in dem alle mitmachen.',
    footerApp: 'Die App', footerInfo: 'Informationen', tagline: 'Eine einfachere Art, als Familie zu leben.',
    lang: 'Sprache', notFoundTitle: 'Seite nicht gefunden', notFoundH1: 'Diese Seite gibt es nicht.',
    notFoundLede: 'Die Adresse ist vielleicht falsch oder die Seite wurde verschoben.',
    homeLink: 'Zur Startseite', enterApp: 'App öffnen'
  }
};

const pages = {
  es: {
    homeTitle: 'La Homa · Una forma más fácil de vivir en familia',
    homeDesc: 'Menos carga mental, más responsabilidad compartida. Organizaos como un equipo y ayudad a los niños a aprender autonomía y el valor del esfuerzo.',
    homeH1: 'Una forma más fácil de vivir en familia.',
    homeLede: 'Menos cosas en la cabeza. Más responsabilidad compartida. Más tiempo para vivir juntos. La Homa hace visible la organización del hogar para que cada persona sepa qué depende de ella.',
    homeCta: 'Crear mi casa', homeSee: 'Ver cómo se usa', homeNote: 'Funciona en el navegador. Entras con tu correo o con tu cuenta de Google.',
    howTitle: 'Cómo funciona', howDesc: 'De la carga mental a la responsabilidad compartida: una semana en equipo con La Homa.',
    familiesTitle: 'Para quién es', familiesDesc: 'Para hogares que quieren compartir organización y responsabilidad, y que los niños aprendan participando.',
    privacyTitle: 'Privacidad', privacyDesc: 'Qué guarda La Homa, quién puede ver los datos de tu casa y qué ve el panel de administración.'
  },
  ca: {
    homeTitle: 'La Homa · La vostra vida familiar, organitzada',
    homeDesc: 'Tasques amb punts, paga i estalvi, calendari amb llistes de preparació i menú amb llista de la compra. Tota l’organització de casa vostra en un sol lloc.',
    homeH1: 'La vostra vida familiar, organitzada.',
    homeLede: 'La Homa és el lloc on la família anota el que passa a casa cada setmana: a qui toca cada tasca, quant porta estalviat cada fill, quins plans venen i què hi ha per menjar. Cada adult ho porta al mòbil i els infants veuen la seva part a la tauleta de la cuina.',
    homeCta: 'Crea la meva casa', homeSee: 'Com es fa servir', homeNote: 'Funciona al navegador. Entrau amb el correu o amb Google.',
    howTitle: 'Com funciona', howDesc: 'Una setmana normal d’una família amb La Homa.',
    familiesTitle: 'Per a qui és', familiesDesc: 'La Homa per a dos adults o un de sol, infants, mascotes i, si cal, custòdia compartida.',
    privacyTitle: 'Privadesa', privacyDesc: 'Què desa La Homa, qui pot veure les dades de casa vostra i què veu el panell d’administració.'
  },
  va: {
    homeTitle: 'La Homa · La vostra vida familiar, organitzada',
    homeDesc: 'Faenes amb punts, paga i estalvi, calendari amb llistes de preparació i menú amb llista de la compra. Tota l’organització de casa vostra en un mateix lloc.',
    homeH1: 'La vostra vida familiar, organitzada.',
    homeLede: 'La Homa és el lloc on la família anota el que passa a casa cada setmana: a qui toca cada faena, quant porta estalviat cada fill, quins plans venen i què hi ha per a menjar. Cada adult ho porta al mòbil i els xiquets veuen la seua part a la tauleta de la cuina.',
    homeCta: 'Crea la meua casa', homeSee: 'Com es fa servir', homeNote: 'Funciona al navegador. Entreu amb el correu o amb Google.',
    howTitle: 'Com funciona', howDesc: 'Una setmana normal d’una família amb La Homa.',
    familiesTitle: 'Per a qui és', familiesDesc: 'La Homa per a dos adults o un de sol, xiquets, mascotes i, si cal, custòdia compartida.',
    privacyTitle: 'Privacitat', privacyDesc: 'Què guarda La Homa, qui pot veure les dades de casa vostra i què veu el panell d’administració.'
  },
  eu: {
    homeTitle: 'La Homa · Zuen familia bizitza, antolatuta',
    homeDesc: 'Puntudun lanak, dirua eta aurrezpena, egutegia eta erosketa zerrenda. Etxeko antolaketa osoa leku bakarrean.',
    homeH1: 'Zuen familia bizitza, antolatuta.',
    homeLede: 'La Homa da familiak astean etxean gertatzen dena idazten duen lekua: nori dagokion lan bakoitza, zenbat aurreztu duen seme-alabak, zer plan dauden eta zer dagoen jateko. Heldu bakoitzak mugikorrean darama eta haurrek sukaldeko tabletan ikusten dute beren zatia.',
    homeCta: 'Sortu nire etxea', homeSee: 'Nola erabiltzen den', homeNote: 'Nabigatzailean funtzionatzen du. Postaz edo Google-rekin sartzen zara.',
    howTitle: 'Nola funtzionatzen du', howDesc: 'La Homarekin familiaren aste arrunt bat.',
    familiesTitle: 'Norentzat da', familiesDesc: 'Bi heldurentzat edo bakarrarentzat, haurrentzat, animalientzat eta, behar bada, zaintza partekaturako.',
    privacyTitle: 'Pribatutasuna', privacyDesc: 'Zer gordetzen duen La Homak, nork ikus dezakeen etxeko datuak eta zer ikusten duen administrazio panelek.'
  },
  gl: {
    homeTitle: 'La Homa · A vosa vida familiar, organizada',
    homeDesc: 'Tarefas con puntos, paga e aforro, calendario con listas de preparación e menú coa lista da compra. Toda a organización da casa nun mesmo sitio.',
    homeH1: 'A vosa vida familiar, organizada.',
    homeLede: 'La Homa é o sitio onde a familia anota o que pasa na casa cada semana: a quen lle toca cada tarefa, canto leva aforrado cada fillo, que plans veñen e que hai para comer. Cada adulto lévao no móbil e os nenos ven a súa parte na tableta da cociña.',
    homeCta: 'Crear a miña casa', homeSee: 'Ver como se usa', homeNote: 'Funciona no navegador. Entras co correo ou coa conta de Google.',
    howTitle: 'Como funciona', howDesc: 'Unha semana normal dunha familia con La Homa.',
    familiesTitle: 'Para quen é', familiesDesc: 'La Homa para dous adultos ou un só, nenos, mascotas e, se fai falta, custodia compartida.',
    privacyTitle: 'Privacidade', privacyDesc: 'Que garda La Homa, quen pode ver os datos da casa e que ve o panel de administración.'
  },
  en: {
    homeTitle: 'La Homa · An easier way to live as a family',
    homeDesc: 'Less mental load, more shared responsibility. Organise as a team and help children learn autonomy and the value of effort.',
    homeH1: 'An easier way to live as a family.',
    homeLede: 'Less on your mind. More shared responsibility. More time together. La Homa makes home organisation visible so everyone knows what depends on them.',
    homeCta: 'Create my home', homeSee: 'See how it works', homeNote: 'Works in the browser. Sign in with email or Google.',
    howTitle: 'How it works', howDesc: 'From mental load to shared responsibility: a week as a team with La Homa.',
    familiesTitle: 'Who it’s for', familiesDesc: 'For homes that want to share organisation and responsibility — and help children learn by taking part.',
    privacyTitle: 'Privacy', privacyDesc: 'What La Homa stores, who can see your home’s data and what the admin panel sees.'
  },
  fr: {
    homeTitle: 'La Homa · Votre vie de famille, organisée',
    homeDesc: 'Tâches avec points, argent de poche et épargne, calendrier avec listes de préparation et menu qui crée la liste de courses. Toute la maison au même endroit.',
    homeH1: 'Votre vie de famille, organisée.',
    homeLede: 'La Homa est l’endroit où votre famille note ce qui se passe à la maison chaque semaine : qui fait chaque tâche, combien chaque enfant a économisé, quels projets arrivent et ce qu’il y a à manger. Chaque adulte l’a sur son téléphone ; les enfants voient leur part sur la tablette de la cuisine.',
    homeCta: 'Créer ma maison', homeSee: 'Voir comment ça marche', homeNote: 'Fonctionne dans le navigateur. Connexion par e-mail ou Google.',
    howTitle: 'Comment ça marche', howDesc: 'Une semaine normale d’une famille avec La Homa.',
    familiesTitle: 'Pour qui', familiesDesc: 'La Homa pour deux adultes ou un seul, enfants, animaux et, si besoin, garde partagée.',
    privacyTitle: 'Confidentialité', privacyDesc: 'Ce que La Homa enregistre, qui peut voir les données de votre maison et ce que voit le panneau d’administration.'
  },
  it: {
    homeTitle: 'La Homa · La vostra vita familiare, organizzata',
    homeDesc: 'Compiti con punti, paghetta e risparmio, calendario con liste di preparazione e menu che crea la lista della spesa. Tutta la casa in un unico posto.',
    homeH1: 'La vostra vita familiare, organizzata.',
    homeLede: 'La Homa è il posto dove la famiglia annota cosa succede in casa ogni settimana: a chi tocca ogni compito, quanto ha risparmiato ogni figlio, quali piani arrivano e cosa c’è da mangiare. Ogni adulto lo usa sul telefono; i bambini vedono la loro parte sul tablet in cucina.',
    homeCta: 'Crea la mia casa', homeSee: 'Vedi come si usa', homeNote: 'Funziona nel browser. Accedi con email o Google.',
    howTitle: 'Come funziona', howDesc: 'Una settimana normale di una famiglia con La Homa.',
    familiesTitle: 'Per chi è', familiesDesc: 'La Homa per due adulti o uno solo, bambini, animali e, se serve, affidamento condiviso.',
    privacyTitle: 'Privacy', privacyDesc: 'Cosa salva La Homa, chi può vedere i dati di casa vostra e cosa vede il pannello di amministrazione.'
  },
  de: {
    homeTitle: 'La Homa · Euer Familienleben, organisiert',
    homeDesc: 'Aufgaben mit Punkten, Taschengeld und Sparen, Kalender mit Vorbereitungslisten und Menü mit Einkaufsliste. Das ganze Zuhause an einem Ort.',
    homeH1: 'Euer Familienleben, organisiert.',
    homeLede: 'La Homa ist der Ort, an dem eure Familie festhält, was zu Hause jede Woche passiert: wer welche Aufgabe hat, wie viel jedes Kind gespart hat, welche Pläne kommen und was es zu essen gibt. Jeder Erwachsene nutzt das Handy; Kinder sehen ihren Teil auf dem Küchen-Tablet.',
    homeCta: 'Zuhause erstellen', homeSee: 'So funktioniert’s', homeNote: 'Funktioniert im Browser. Anmeldung mit E-Mail oder Google.',
    howTitle: 'So funktioniert’s', howDesc: 'Eine normale Woche einer Familie mit La Homa.',
    familiesTitle: 'Für wen', familiesDesc: 'La Homa für zwei Erwachsene oder einen, Kinder, Haustiere und bei Bedarf Wechselmodell.',
    privacyTitle: 'Datenschutz', privacyDesc: 'Was La Homa speichert, wer eure Hausdaten sehen kann und was das Admin-Panel sieht.'
  }
};

export function getChrome(code) {
  return chrome[code] || chrome.es;
}

export function getPageCopy(code) {
  return pages[code] || pages.es;
}

export function localePath(code, path = '/') {
  const loc = LOCALES.find(l => l.code === code) || LOCALES[0];
  if (path === '/') return loc.prefix || '/';
  return `${loc.prefix}${path}`;
}

export function langSwitcher(current, path = '/') {
  const c = getChrome(current);
  const active = LOCALES.find(l => l.code === current) || LOCALES[0];
  const links = LOCALES.map(l => {
    const href = localePath(l.code, path);
    const selected = l.code === current ? ' aria-current="true"' : '';
    return `<a href="${href}" hreflang="${l.htmlLang}"${selected}>${l.label}</a>`;
  }).join('');
  return `<details class="lang-switch">
  <summary aria-label="${c.lang}: ${active.label}"><span>${active.label}</span></summary>
  <div class="lang-menu" role="list">${links}</div>
</details>`;
}
