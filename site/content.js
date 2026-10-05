import { getSiteCopy } from './functions/site-copy.js';
import { localePath } from './functions/i18n.js';

const APP = 'https://app.lahoma.app';

const FAMILY_CARD_META = [
  { icon: '👫', tint: 'tint-lilac' },
  { icon: '🧸', tint: 'tint-sand' },
  { icon: '🚲', tint: 'tint-sage' },
  { icon: '🐶', tint: 'tint-rose' },
  { icon: '🏠', tint: 'tint-lilac' },
  { icon: '🗓️', tint: 'tint-sand' }
];

const check = text => `<li>${text}</li>`;

function heroMock(m) {
  return `
<div class="hero-visual">
  <div class="mock-window" role="img" aria-label="${m.heroAria}">
    <div class="mock-bar"><i></i><i></i><i></i><span>app.lahoma.app</span></div>
    <div class="mock-body">
      <div class="m-banner">
        <div>
          <small>${m.weekRange}</small>
          <b>${m.helloTeam}</b>
          <span>${m.daysLeft}</span>
        </div>
        <div class="m-team">
          <small>${m.familyChallenge}</small>
          <b>146 <em>/ 200</em></b>
          <div class="m-bar light"><span class="w-73"></span></div>
          <span>${m.cinemaAfternoon}</span>
        </div>
      </div>
      <div class="m-members">
        <div class="m-member">
          <div class="m-who"><span class="m-avatar lilac">🦊</span><div><b>Lucía</b><small>${m.luciaAge}</small></div></div>
          <p class="m-score">42 <em>/ 60 pts</em></p>
          <div class="m-bar"><span class="w-70"></span></div>
          <small class="m-foot">🎟️ ${m.poolAfternoon}</small>
        </div>
        <div class="m-member">
          <div class="m-who"><span class="m-avatar sand">🐻</span><div><b>Pablo</b><small>${m.pabloAge}</small></div></div>
          <p class="m-score">38 <em>/ 50 pts</em></p>
          <div class="m-bar coral"><span class="w-76"></span></div>
          <small class="m-foot">🍕 ${m.chooseDinner}</small>
        </div>
        <div class="m-member pet">
          <div class="m-who"><span class="m-avatar sage">🐶</span><div><b>Kira</b><small>${m.kiraRole}</small></div></div>
          <p class="m-pet">${m.eveningWalk}</p>
          <small class="m-foot">${m.martaNotes}</small>
        </div>
      </div>
    </div>
  </div>
  <div class="mock-phone" role="img" aria-label="${m.phoneAria}">
    <div class="phone-screen">
      <small class="m-eyebrow">${m.todayThu}</small>
      <b class="m-title">${m.helloLucia}</b>
      <ul class="m-tasks">
        <li class="done"><i></i><span>${m.makeBed}</span><em>+5</em></li>
        <li><i></i><span>${m.setTable}</span><em>+10</em></li>
        <li><i></i><span>${m.read20}</span><em>+10</em></li>
      </ul>
      <div class="m-progress">
        <div><b>42</b> ${m.ptsOf}</div>
        <div class="m-bar"><span class="w-70"></span></div>
        <small>${m.need18}</small>
      </div>
    </div>
  </div>
</div>`;
}

function weekMock(m) {
  return `
<div class="mock-card" role="img" aria-label="${m.weekAria}">
  <div class="mc-head"><b>${m.houseTasks}</b><span class="m-pill">${m.thisWeek}</span></div>
  <div class="mc-row">
    <span class="mc-icon">🛏️</span>
    <div class="grow"><b>${m.makeBed}</b><small>${m.luciaPabloPts}</small><div class="m-days"><i class="on">L</i><i class="on">M</i><i class="on">X</i><i class="on">J</i><i class="on">V</i><i class="on">S</i><i class="on">D</i></div></div>
  </div>
  <div class="mc-row">
    <span class="mc-icon">🍽️</span>
    <div class="grow"><b>${m.setTable}</b><small>${m.lucia10pts}</small><div class="m-days"><i class="on">L</i><i class="on">M</i><i class="on">X</i><i class="on">J</i><i class="on">V</i><i>S</i><i>D</i></div></div>
  </div>
  <div class="mc-row">
    <span class="mc-icon">🗑️</span>
    <div class="grow"><b>${m.takeTrash}</b><small>${m.weeklyTurn}</small></div>
    <span class="m-pill sage">${m.rotates}</span>
  </div>
  <div class="mc-swap">
    <b>Pablo ↔ Lucía</b>
    <p>${m.swapQuote}</p>
    <div><span class="m-btn">${m.accept}</span><span class="m-btn quiet">${m.notNow}</span></div>
  </div>
</div>`;
}

function moneyMock(m) {
  return `
<div class="mock-card money" role="img" aria-label="${m.moneyAria}">
  <div class="mm-hero">
    <small>${m.luciaPiggy}</small>
    <b>48,50 €</b>
    <span>${m.weekPay}</span>
  </div>
  <div class="mm-pockets">
    <div><small>${m.toSpend}</small><b>12,50 €</b><em>${m.sheDecides}</em></div>
    <div><small>${m.savings}</small><b>36,00 €</b><em class="up">${m.interest}</em></div>
  </div>
  <div class="mm-goal">
    <span>🚲</span>
    <div class="grow"><b>${m.savingBike}</b><small>${m.of120}</small><div class="m-bar sage"><span class="w-30"></span></div></div>
  </div>
</div>`;
}

function calendarMock(m) {
  return `
<div class="mock-card" role="img" aria-label="${m.calAria}">
  <div class="mc-head"><b>${m.familyCal}</b><span class="m-pill rose">${m.thisWeek}</span></div>
  <div class="m-presence">
    <div class="away"><small>L</small><b>5</b><span>—</span></div>
    <div class="home"><small>M</small><b>6</b><span>${m.english}</span></div>
    <div class="home"><small>X</small><b>7</b><span>${m.outing}</span></div>
    <div class="home"><small>J</small><b>8</b><span>${m.english}</span></div>
    <div class="home"><small>V</small><b>9</b><span>${m.dentist}</span></div>
    <div class="home"><small>S</small><b>10</b><span>${m.birthday}</span></div>
    <div class="away"><small>D</small><b>11</b><span>—</span></div>
  </div>
  <div class="mc-event">
    <span class="mc-icon rose">🚌</span>
    <div class="grow"><b>${m.farmTrip}</b><small>${m.wedPablo}</small></div>
    <span class="m-pill">${m.twoOfThree}</span>
  </div>
  <ul class="m-checklist">
    <li class="done"><span>${m.signedAuth}</span><em>Marta</em></li>
    <li class="done"><span>${m.lunchBag}</span><em>Pablo</em></li>
    <li><span>${m.changeClothes}</span><em>Jorge</em></li>
  </ul>
</div>`;
}

function kitchenMock(m) {
  return `
<div class="mock-card" role="img" aria-label="${m.kitAria}">
  <div class="mc-head"><b>${m.weekMenu}</b><span class="m-pill sand">${m.people4}</span></div>
  <div class="m-menu">
    <div><small>${m.mon}</small><span>🥘</span><b>${m.lentils}</b></div>
    <div><small>${m.tue}</small><span>🍝</span><b>${m.macaroni}</b></div>
    <div><small>${m.wed}</small><span>🐟</span><b>${m.bakedHake}</b></div>
    <div><small>${m.thu}</small><span>🥗</span><b>${m.chickpeaSalad}</b></div>
  </div>
  <div class="m-shop">
    <div class="mc-head"><b>${m.shopList}</b><span class="m-muted">${m.fromMenu}</span></div>
    <ul>
      <li class="done"><span>${m.hake}</span><em>600 g</em></li>
      <li><span>${m.cookedChickpeas}</span><em>2</em></li>
      <li><span>${m.tomatoes}</span><em>1 kg</em></li>
      <li><span>${m.eggs}</span><em>6</em></li>
    </ul>
    <p class="m-pantry">${m.alreadyPantry}</p>
  </div>
</div>`;
}

function buildHome(code, t) {
  const h = t.home;
  const m = t.mock;
  const howHref = localePath(code, '/como-funciona');
  const faqHtml = t.faq.map(item => `
    <details>
      <summary>${item.q}</summary>
      <p>${item.a}</p>
    </details>`).join('');

  return `
<section class="hero wrap">
  <div class="hero-copy">
    <p class="eyebrow">${h.eyebrow}</p>
    <h1>${h.h1}</h1>
    <p class="lede">${h.lede}</p>
    <div class="actions">
      <a class="button" href="${APP}">${h.cta}</a>
      <a class="button quiet" href="#como-se-usa">${h.see}</a>
    </div>
    <p class="hero-note">${h.note}</p>
  </div>
  ${heroMock(m)}
</section>

<section class="wrap section why">
  <div class="section-head">
    <p class="eyebrow">${h.whyEyebrow}</p>
    <h2>${h.whyH2}</h2>
    <p class="lede">${h.whyLede}</p>
  </div>
  <div class="questions">
    <article>
      <p class="q">${h.q1}</p>
      <p class="a">${h.a1}</p>
    </article>
    <article>
      <p class="q">${h.q2}</p>
      <p class="a">${h.a2}</p>
    </article>
    <article>
      <p class="q">${h.q3}</p>
      <p class="a">${h.a3}</p>
    </article>
  </div>
</section>

<section class="wrap section">
  <div class="section-head center">
    <p class="eyebrow">${h.pillarsEyebrow}</p>
    <h2>${h.pillarsH2}</h2>
    <p class="lede">${h.pillarsLede}</p>
  </div>
</section>

<section class="wrap section" id="como-se-usa">
  <div class="section-head center">
    <p class="eyebrow">${h.dayEyebrow}</p>
    <h2>${h.dayH2}</h2>
  </div>

  <article class="feature tint-lilac">
    <div class="feature-copy">
      <p class="eyebrow">${h.tasksEyebrow}</p>
      <h3>${h.tasksH3}</h3>
      <p>${h.tasksP1}</p>
      <p>${h.tasksP2}</p>
      <ul class="checks">
        ${check(h.tasksC1)}
        ${check(h.tasksC2)}
        ${check(h.tasksC3)}
      </ul>
    </div>
    ${weekMock(m)}
  </article>

  <article class="feature tint-sage flip">
    <div class="feature-copy">
      <p class="eyebrow">${h.moneyEyebrow}</p>
      <h3>${h.moneyH3}</h3>
      <p>${h.moneyP1}</p>
      <p>${h.moneyP2}</p>
      <ul class="checks">
        ${check(h.moneyC1)}
        ${check(h.moneyC2)}
        ${check(h.moneyC3)}
      </ul>
    </div>
    ${moneyMock(m)}
  </article>

  <article class="feature tint-rose">
    <div class="feature-copy">
      <p class="eyebrow">${h.calEyebrow}</p>
      <h3>${h.calH3}</h3>
      <p>${h.calP1}</p>
      <p>${h.calP2}</p>
      <ul class="checks">
        ${check(h.calC1)}
        ${check(h.calC2)}
      </ul>
    </div>
    ${calendarMock(m)}
  </article>

  <article class="feature tint-sand flip">
    <div class="feature-copy">
      <p class="eyebrow">${h.kitEyebrow}</p>
      <h3>${h.kitH3}</h3>
      <p>${h.kitP1}</p>
      <p>${h.kitP2}</p>
      <ul class="checks">
        ${check(h.kitC1)}
        ${check(h.kitC2)}
      </ul>
    </div>
    ${kitchenMock(m)}
  </article>
</section>

<section class="wrap section">
  <div class="section-head">
    <p class="eyebrow">${h.teamEyebrow}</p>
    <h2>${h.teamH2}</h2>
  </div>
  <div class="roles">
    <article>
      <span class="role-icon lilac">🧑</span>
      <h3>${h.adultsH3}</h3>
      <p>${h.adultsP}</p>
    </article>
    <article>
      <span class="role-icon sand">🧒</span>
      <h3>${h.kidsH3}</h3>
      <p>${h.kidsP}</p>
    </article>
    <article>
      <span class="role-icon sage">🐶</span>
      <h3>${h.petsH3}</h3>
      <p>${h.petsP}</p>
    </article>
    <article>
      <span class="role-icon rose">📱</span>
      <h3>${h.tabletH3}</h3>
      <p>${h.tabletP}</p>
    </article>
  </div>
</section>

<section class="wrap section">
  <div class="not-list">
    <div>
      <p class="eyebrow">${h.outEyebrow}</p>
      <h2>${h.outH2}</h2>
      <p class="lede">${h.outLede}</p>
    </div>
    <ul>
      <li><b>${h.out1b}</b>${h.out1}</li>
      <li><b>${h.out2b}</b>${h.out2}</li>
      <li><b>${h.out3b}</b>${h.out3}</li>
      <li><b>${h.out4b}</b>${h.out4}</li>
    </ul>
  </div>
</section>

<section class="wrap section">
  <div class="section-head center">
    <p class="eyebrow">${h.startEyebrow}</p>
    <h2>${h.startH2}</h2>
  </div>
  <ol class="steps">
    <li>
      <span>1</span>
      <h3>${h.step1H}</h3>
      <p>${h.step1P}</p>
    </li>
    <li>
      <span>2</span>
      <h3>${h.step2H}</h3>
      <p>${h.step2P}</p>
    </li>
    <li>
      <span>3</span>
      <h3>${h.step3H}</h3>
      <p>${h.step3P}</p>
    </li>
  </ol>
</section>

<section class="wrap section faq-section">
  <div class="section-head">
    <p class="eyebrow">${h.faqEyebrow}</p>
    <h2>${h.faqH2}</h2>
  </div>
  <div class="faq">${faqHtml}
  </div>
</section>

<section class="wrap section">
  <div class="cta">
    <h2>${h.ctaH2}</h2>
    <p>${h.ctaP}</p>
    <div class="actions">
      <a class="button light" href="${APP}">${h.cta}</a>
      <a class="button ghost" href="${howHref}">${h.ctaWeek}</a>
    </div>
  </div>
</section>`;
}

function buildHow(t) {
  const how = t.how;
  return `
<section class="wrap page-hero">
  <p class="eyebrow">${how.eyebrow}</p>
  <h1>${how.h1}</h1>
  <p class="lede">${how.lede}</p>
</section>

<section class="wrap timeline">
  ${how.timeline.map(item => `
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
    <p class="eyebrow">${how.philEyebrow}</p>
    <h2>${how.philH2}</h2>
  </div>
  <div class="rules">
    <article>
      <h3>${how.v1H}</h3>
      <p>${how.v1P}</p>
    </article>
    <article>
      <h3>${how.v2H}</h3>
      <p>${how.v2P}</p>
    </article>
    <article>
      <h3>${how.v3H}</h3>
      <p>${how.v3P}</p>
    </article>
    <article>
      <h3>${how.v4H}</h3>
      <p>${how.v4P}</p>
    </article>
  </div>
</section>

<section class="wrap section">
  <div class="cta">
    <h2>${how.ctaH2}</h2>
    <p>${how.ctaP}</p>
    <div class="actions"><a class="button light" href="${APP}">${how.cta || t.home.cta}</a></div>
  </div>
</section>`;
}

function buildFamilies(t) {
  const f = t.families;
  const cards = f.cards.map((card, i) => {
    const meta = FAMILY_CARD_META[i] || FAMILY_CARD_META[0];
    return `
  <article class="${meta.tint}">
    <span class="role-icon">${meta.icon}</span>
    <h2>${card.h2}</h2>
    <p>${card.p}</p>
  </article>`;
  }).join('');

  return `
<section class="wrap page-hero">
  <p class="eyebrow">${f.eyebrow}</p>
  <h1>${f.h1}</h1>
  <p class="lede">${f.lede}</p>
</section>

<section class="wrap families">${cards}
</section>

<section class="wrap section">
  <div class="cta">
    <h2>${f.ctaH2}</h2>
    <p>${f.ctaP}</p>
    <div class="actions"><a class="button light" href="${APP}">${f.cta || t.home.cta}</a></div>
  </div>
</section>`;
}

function buildPrivacy(t) {
  const p = t.privacy;
  return `
<article class="wrap page narrow">
  <p class="eyebrow">${p.eyebrow}</p>
  <h1>${p.h1}</h1>
  <p class="lede">${p.lede}</p>
  <div class="prose">
    <h2>${p.accountsH}</h2>
    <p>${p.accountsP}</p>
    <h2>${p.dataH}</h2>
    <p>${p.dataP}</p>
    <h2>${p.adminH}</h2>
    <p>${p.adminP1}</p>
    <p>${p.adminP2}</p>
    <h2>${p.photosH}</h2>
    <p>${p.photosP}</p>
    <h2>${p.webH}</h2>
    <p>${p.webP}</p>
  </div>
</article>`;
}

export function pagesFor(code = 'es') {
  const t = getSiteCopy(code);
  const lang = code === 'va' ? 'ca' : code;
  const prefix = code === 'es' ? '' : `${code}/`;
  return [
    {
      path: localePath(code, '/'),
      file: `${prefix}index.html`,
      title: t.meta.homeTitle,
      description: t.meta.homeDesc,
      locale: code,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: 'La Homa',
            url: 'https://lahoma.app/',
            description: `${t.home.eyebrow} ${t.home.h1}`,
            inLanguage: lang
          },
          {
            '@type': 'WebApplication',
            name: 'La Homa',
            url: 'https://app.lahoma.app/',
            applicationCategory: 'LifestyleApplication',
            operatingSystem: 'Web',
            inLanguage: lang
          },
          {
            '@type': 'FAQPage',
            mainEntity: t.faq.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a }
            }))
          }
        ]
      },
      body: buildHome(code, t)
    },
    {
      path: localePath(code, '/como-funciona'),
      file: `${prefix}como-funciona/index.html`,
      title: t.meta.howTitle,
      description: t.meta.howDesc,
      locale: code,
      body: buildHow(t)
    },
    {
      path: localePath(code, '/familias'),
      file: `${prefix}familias/index.html`,
      title: t.meta.familiesTitle,
      description: t.meta.familiesDesc,
      locale: code,
      body: buildFamilies(t)
    },
    {
      path: localePath(code, '/privacidad'),
      file: `${prefix}privacidad/index.html`,
      title: t.meta.privacyTitle,
      description: t.meta.privacyDesc,
      locale: code,
      body: buildPrivacy(t)
    }
  ];
}

export const pages = pagesFor('es');
