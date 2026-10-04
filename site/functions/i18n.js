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

const APP = 'https://app.lahoma.app';

const chrome = {
  es: {
    how: 'Cómo funciona', forWhom: 'Para quién es', blog: 'Blog', enter: 'Entrar', create: 'Crear mi casa',
    privacy: 'Privacidad', skip: 'Saltar al contenido', brandSub: 'Organización familiar',
    footerTag: 'Tareas, paga, calendario y cocina de toda la familia, en un mismo sitio.',
    footerApp: 'La app', footerInfo: 'Información', tagline: 'Tu vida familiar, organizada.',
    lang: 'Idioma', notFoundTitle: 'Página no encontrada', notFoundH1: 'Esta página no existe.',
    notFoundLede: 'Puede que la dirección esté mal escrita o que la página se haya movido.',
    homeLink: 'Ir al inicio', enterApp: 'Entrar en la app'
  },
  ca: {
    how: 'Com funciona', forWhom: 'Per a qui és', blog: 'Blog', enter: 'Entra', create: 'Crea la meva casa',
    privacy: 'Privadesa', skip: 'Salta al contingut', brandSub: 'Organització familiar',
    footerTag: 'Tasques, paga, calendari i cuina de tota la família, en un mateix lloc.',
    footerApp: 'L’app', footerInfo: 'Informació', tagline: 'La vostra vida familiar, organitzada.',
    lang: 'Idioma', notFoundTitle: 'Pàgina no trobada', notFoundH1: 'Aquesta pàgina no existeix.',
    notFoundLede: 'Pot ser que l’adreça estigui mal escrita o que la pàgina s’hagi mogut.',
    homeLink: 'Anar a l’inici', enterApp: 'Entrar a l’app'
  },
  va: {
    how: 'Com funciona', forWhom: 'Per a qui és', blog: 'Blog', enter: 'Entra', create: 'Crea la meua casa',
    privacy: 'Privacitat', skip: 'Salta al contingut', brandSub: 'Organització familiar',
    footerTag: 'Faenes, paga, calendari i cuina de tota la família, en un mateix lloc.',
    footerApp: 'L’app', footerInfo: 'Informació', tagline: 'La vostra vida familiar, organitzada.',
    lang: 'Idioma', notFoundTitle: 'Pàgina no trobada', notFoundH1: 'Esta pàgina no existeix.',
    notFoundLede: 'Pot ser que l’adreça estiga mal escrita o que la pàgina s’haja mogut.',
    homeLink: 'Anar a l’inici', enterApp: 'Entrar a l’app'
  },
  eu: {
    how: 'Nola funtzionatzen du', forWhom: 'Norentzat da', blog: 'Bloga', enter: 'Sartu', create: 'Sortu nire etxea',
    privacy: 'Pribatutasuna', skip: 'Joan edukira', brandSub: 'Familia antolaketa',
    footerTag: 'Familia osoaren lanak, dirua, egutegia eta sukaldea, leku bakarrean.',
    footerApp: 'Aplikazioa', footerInfo: 'Informazioa', tagline: 'Zuen familia bizitza, antolatuta.',
    lang: 'Hizkuntza', notFoundTitle: 'Orria ez da aurkitu', notFoundH1: 'Orri hau ez da existitzen.',
    notFoundLede: 'Helbidea gaizki idatzita egon daiteke edo orria mugitu da.',
    homeLink: 'Hasierara joan', enterApp: 'Aplikaziora sartu'
  },
  gl: {
    how: 'Como funciona', forWhom: 'Para quen é', blog: 'Blog', enter: 'Entrar', create: 'Crear a miña casa',
    privacy: 'Privacidade', skip: 'Saltar ao contido', brandSub: 'Organización familiar',
    footerTag: 'Tarefas, paga, calendario e cociña de toda a familia, nun mesmo sitio.',
    footerApp: 'A app', footerInfo: 'Información', tagline: 'A vosa vida familiar, organizada.',
    lang: 'Idioma', notFoundTitle: 'Páxina non atopada', notFoundH1: 'Esta páxina non existe.',
    notFoundLede: 'Pode que o enderezo estea mal escrito ou que a páxina se movese.',
    homeLink: 'Ir ao inicio', enterApp: 'Entrar na app'
  },
  en: {
    how: 'How it works', forWhom: 'Who it’s for', blog: 'Blog', enter: 'Sign in', create: 'Create my home',
    privacy: 'Privacy', skip: 'Skip to content', brandSub: 'Family organisation',
    footerTag: 'Tasks, pocket money, calendar and kitchen for the whole family, in one place.',
    footerApp: 'The app', footerInfo: 'Information', tagline: 'Your family life, organised.',
    lang: 'Language', notFoundTitle: 'Page not found', notFoundH1: 'This page doesn’t exist.',
    notFoundLede: 'The address may be wrong or the page may have moved.',
    homeLink: 'Go to home', enterApp: 'Open the app'
  },
  fr: {
    how: 'Comment ça marche', forWhom: 'Pour qui', blog: 'Blog', enter: 'Entrer', create: 'Créer ma maison',
    privacy: 'Confidentialité', skip: 'Aller au contenu', brandSub: 'Organisation familiale',
    footerTag: 'Tâches, argent de poche, calendrier et cuisine de toute la famille, au même endroit.',
    footerApp: 'L’app', footerInfo: 'Informations', tagline: 'Votre vie de famille, organisée.',
    lang: 'Langue', notFoundTitle: 'Page introuvable', notFoundH1: 'Cette page n’existe pas.',
    notFoundLede: 'L’adresse est peut-être incorrecte ou la page a déménagé.',
    homeLink: 'Retour à l’accueil', enterApp: 'Ouvrir l’app'
  },
  it: {
    how: 'Come funziona', forWhom: 'Per chi è', blog: 'Blog', enter: 'Entra', create: 'Crea la mia casa',
    privacy: 'Privacy', skip: 'Vai al contenuto', brandSub: 'Organizzazione familiare',
    footerTag: 'Compiti, paghetta, calendario e cucina di tutta la famiglia, in un unico posto.',
    footerApp: 'L’app', footerInfo: 'Informazioni', tagline: 'La vostra vita familiare, organizzata.',
    lang: 'Lingua', notFoundTitle: 'Pagina non trovata', notFoundH1: 'Questa pagina non esiste.',
    notFoundLede: 'L’indirizzo potrebbe essere sbagliato o la pagina potrebbe essere stata spostata.',
    homeLink: 'Vai all’inizio', enterApp: 'Apri l’app'
  },
  de: {
    how: 'So funktioniert’s', forWhom: 'Für wen', blog: 'Blog', enter: 'Anmelden', create: 'Zuhause erstellen',
    privacy: 'Datenschutz', skip: 'Zum Inhalt springen', brandSub: 'Familienorganisation',
    footerTag: 'Aufgaben, Taschengeld, Kalender und Küche der ganzen Familie, an einem Ort.',
    footerApp: 'Die App', footerInfo: 'Informationen', tagline: 'Euer Familienleben, organisiert.',
    lang: 'Sprache', notFoundTitle: 'Seite nicht gefunden', notFoundH1: 'Diese Seite gibt es nicht.',
    notFoundLede: 'Die Adresse ist vielleicht falsch oder die Seite wurde verschoben.',
    homeLink: 'Zur Startseite', enterApp: 'App öffnen'
  }
};

const pages = {
  es: {
    homeTitle: 'La Homa · Tu vida familiar, organizada',
    homeDesc: 'Tareas con puntos, paga y ahorro, calendario con listas de preparación y menú con lista de la compra. Toda la organización de tu casa en un mismo sitio.',
    homeH1: 'Tu vida familiar, organizada.',
    homeLede: 'La Homa es el sitio donde tu familia apunta lo que pasa en casa cada semana: quién hace cada tarea, cuánto lleva ahorrado cada hijo, qué planes vienen y qué hay para comer. Cada adulto lo lleva en su móvil y los niños ven su parte en la tablet de la cocina.',
    homeCta: 'Crear mi casa', homeSee: 'Ver cómo se usa', homeNote: 'Funciona en el navegador. Entras con tu correo o con tu cuenta de Google.',
    howTitle: 'Cómo funciona', howDesc: 'Una semana normal de una familia con La Homa.',
    familiesTitle: 'Para quién es', familiesDesc: 'La Homa para dos adultos o uno solo, niños, mascotas y, si hace falta, custodia compartida.',
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
    homeTitle: 'La Homa · Your family life, organised',
    homeDesc: 'Tasks with points, pocket money and saving, a calendar with prep lists, and a menu that builds the shopping list. Your whole home in one place.',
    homeH1: 'Your family life, organised.',
    homeLede: 'La Homa is where your family tracks what happens at home each week: who does each task, how much each child has saved, what’s coming up and what’s for dinner. Each adult uses their phone; children see their bit on the kitchen tablet.',
    homeCta: 'Create my home', homeSee: 'See how it works', homeNote: 'Works in the browser. Sign in with email or Google.',
    howTitle: 'How it works', howDesc: 'A normal week with a family using La Homa.',
    familiesTitle: 'Who it’s for', familiesDesc: 'La Homa for two adults or one, children, pets and, if needed, shared custody.',
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
  const links = LOCALES.map(l => {
    const href = localePath(l.code, path);
    const active = l.code === current ? ' aria-current="true"' : '';
    return `<a href="${href}" hreflang="${l.htmlLang}"${active}>${l.label}</a>`;
  }).join('');
  return `<nav class="lang-switch" aria-label="${c.lang}">${links}</nav>`;
}

export function homeBody(code, extras = {}) {
  const p = getPageCopy(code);
  const c = getChrome(code);
  const { heroMock = '' } = extras;
  return `
<section class="hero wrap">
  <div class="hero-copy">
    <p class="eyebrow">${c.brandSub}</p>
    <h1>${p.homeH1}</h1>
    <p class="lede">${p.homeLede}</p>
    <div class="actions">
      <a class="button" href="${APP}">${p.homeCta}</a>
      <a class="button quiet" href="${localePath(code, '/como-funciona')}">${p.homeSee}</a>
    </div>
    <p class="hero-note">${p.homeNote}</p>
  </div>
  ${heroMock}
</section>
<section class="wrap section">
  <div class="cta">
    <h2>${p.homeH1}</h2>
    <p>${p.homeLede}</p>
    <div class="actions"><a class="button light" href="${APP}">${p.homeCta}</a></div>
  </div>
</section>`;
}

export function simplePageBody(code, kind) {
  const p = getPageCopy(code);
  const c = getChrome(code);
  const titles = { how: p.howTitle, families: p.familiesTitle, privacy: p.privacyTitle };
  const descs = { how: p.howDesc, families: p.familiesDesc, privacy: p.privacyDesc };
  return `<article class="wrap page narrow"><p class="eyebrow">${titles[kind]}</p><h1>${titles[kind]}</h1><p class="lede">${descs[kind]}</p><div class="actions"><a class="button" href="${APP}">${c.create}</a><a class="button quiet" href="${localePath(code, '/')}">${c.homeLink}</a></div></article>`;
}
