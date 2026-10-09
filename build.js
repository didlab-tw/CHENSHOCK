// 網站產生程式：讀取 content/ 裡的資料，產生完整的網站到 _site/
// 一般情況下不需要修改這個檔案。內容請到後台（Pages CMS）編輯。
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, '_site');
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');

// ---------- 工具 ----------
function readJSON(file, fallback) {
  try {
    const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn('⚠ 無法讀取 ' + file + '：' + e.message);
    return fallback;
  }
}

function readCollection(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = readJSON(path.join(dir, f), null);
      if (!data || typeof data !== 'object') return null;
      return Object.assign({ id: f.replace(/\.json$/, '') }, data);
    })
    .filter((d) => d && d.published !== false);
}

const arr = (v) => (Array.isArray(v) ? v.filter((x) => x !== null && x !== undefined && x !== '') : []);
const str = (v) => (v === null || v === undefined ? '' : String(v)).trim();

function esc(v) {
  return str(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 網址：站內路徑加上 BASE；外部網址原樣保留
function u(p) {
  const s = str(p);
  if (!s) return '';
  if (/^(https?:|mailto:|#)/i.test(s)) return s;
  if (s.startsWith('/')) return BASE + s;
  return s;
}

// 多行文字 → 段落
function paras(text, cls) {
  const t = str(text);
  if (!t) return '';
  return t.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p)}</p>`).join('\n');
}

function num(v) {
  const n = parseFloat(String(v).replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function copyDir(src, dest) {
  const from = path.join(ROOT, src);
  if (!fs.existsSync(from)) return;
  fs.cpSync(from, path.join(OUT, dest), { recursive: true });
}

// ---------- 讀取資料 ----------
const profile = readJSON('content/profile.json', {});
const team = arr(readJSON('content/team.json', []));
const studentAwards = arr(readJSON('content/student-awards.json', []));
const pubs = readCollection('content/publications').sort((a, b) => num(b.year) - num(a.year));
const semOrder = { '第一學期': 1, '第二學期': 2, '暑期': 3 };
const courses = readCollection('content/courses').sort((a, b) =>
  num(b.academic_year) - num(a.academic_year) || (semOrder[b.semester] || 0) - (semOrder[a.semester] || 0));
const projects = readCollection('content/projects').sort((a, b) => num(b.year) - num(a.year));
const theses = readCollection('content/theses').sort((a, b) => num(b.year) - num(a.year));

const NAME = str(profile.name) || '我的網站';
const TYPE_LABEL = { journal: '期刊論文', conference: '研討會論文', book: '專書／專章', project: '研究計畫' };

// ---------- 共用版面 ----------
const NAV = [
  ['home', '/', '首頁'],
  ['about', '/about/', '關於我'],
  ['pubs', '/publications/', '學術發表'],
  ['courses', '/courses/', '歷年授課'],
  ['team', '/team/', '研究團隊'],
];

function layout({ title, active, body, description }) {
  const pageTitle = title ? `${esc(title)}｜${esc(NAME)}` : esc(NAME);
  const desc = esc(description || [profile.title, profile.department, profile.school].filter(Boolean).join(' · '));
  const nav = NAV.map(([key, href, label]) =>
    `<a href="${u(href)}"${key === active ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('');
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@600;700&display=swap">
<link rel="stylesheet" href="${u('/assets/style.css')}">
</head>
<body>
<a class="skip" href="#main">跳到主要內容</a>
<header class="topbar">
<nav class="wrap topnav" aria-label="主選單">
<a class="brand" href="${u('/')}">${esc(NAME)}</a>
<div class="navlinks">${nav}</div>
</nav>
</header>
<div id="main">
${body}
</div>
<footer class="foot">
<div class="wrap foot-inner">
<span>© ${new Date().getFullYear()} ${esc(NAME)}${profile.email ? ` · <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>` : ''}</span>
${active === 'home' ? '' : `<a href="${u('/')}">回到首頁</a>`}
</div>
</footer>
<script src="${u('/assets/site.js')}" defer></script>
</body>
</html>
`;
}

function pageHero(kicker, title, intro, extra) {
  return `<section class="page-hero">
<div class="wrap">
${kicker ? `<span class="kicker">${kicker}</span>` : ''}
<h1>${title}</h1>
${intro || ''}
${extra || ''}
</div>
</section>`;
}

function photo(src, alt, cls) {
  return src
    ? `<img class="${cls}" src="${esc(u(src))}" alt="${esc(alt)}" loading="lazy">`
    : `<div class="${cls} ph" aria-hidden="true"></div>`;
}

function rows(items, render) {
  const list = arr(items);
  if (!list.length) return '<p class="empty">尚未新增資料。</p>';
  return `<div class="rows">${list.map(render).join('')}</div>`;
}

function rowItem(date, main, sub) {
  return `<div class="row"><span class="row-date">${esc(date)}</span><div class="row-main"><strong>${esc(main)}</strong>${sub ? `<span>${esc(sub)}</span>` : ''}</div></div>`;
}

function pubItem(p) {
  const links = [
    p.pdf ? `<a href="${esc(u(p.pdf))}">PDF</a>` : '',
    p.doi ? `<a href="${esc(u(p.doi))}">DOI／連結</a>` : '',
  ].join('');
  return `<li class="pub" data-type="${esc(p.type || '')}">
<span class="pub-year">${esc(p.year)}</span>
<div class="pub-main">
<strong class="pub-title">${esc(p.title)}</strong>
${p.authors ? `<span class="pub-authors">${esc(p.authors)}</span>` : ''}
${p.venue ? `<span class="pub-venue">${esc(p.venue)}${p.volume_pages ? ', ' + esc(p.volume_pages) : ''}</span>` : ''}
<div class="pub-links"><span class="tag">${esc(TYPE_LABEL[p.type] || '其他')}</span>${links}</div>
</div>
</li>`;
}

function evalBadge(c) {
  const e = c.evaluation || {};
  if (c.status !== '已結束' || !str(e.score)) return '';
  return `<div class="eval-mini"><span>課程評鑑</span><span><strong>${esc(e.score)}</strong> / ${esc(e.scale || '5')}</span></div>`;
}

function courseCard(c) {
  const ongoing = c.status !== '已結束';
  const meta = [c.level, c.credits ? `${c.credits} 學分` : '', !ongoing && c.evaluation && c.evaluation.students ? `修課 ${c.evaluation.students} 人` : '']
    .filter(Boolean).map(esc).join(' · ');
  return `<a class="card course-card${ongoing ? ' is-ongoing' : ''}" href="${u('/courses/' + c.id + '/')}">
<span class="tag ${ongoing ? 'tag-solid' : 'tag-muted'}">${ongoing ? '進行中' : esc((c.semester || '') + ' · 已結束')}</span>
<strong class="card-title">${esc(c.title)}</strong>
${meta ? `<span class="muted">${meta}</span>` : ''}
${ongoing && (c.schedule || c.room) ? `<span class="muted">${esc([c.schedule, c.room].filter(Boolean).join(' · '))}</span>` : ''}
${evalBadge(c)}
<span class="more">進入課程頁 →</span>
</a>`;
}

function listLink(href, year, badge, badgeCls, who, title) {
  return `<a class="list-link" href="${u(href)}">
<span class="ll-year">${esc(year)}</span>
<span class="tag ${badgeCls}">${esc(badge)}</span>
<span class="ll-who">${esc(who)}</span>
<span class="ll-title">${esc(title)}</span>
<span class="ll-more">詳細 →</span>
</a>`;
}

function toc(items) {
  return `<aside class="toc" aria-label="本頁內容">
<span class="toc-label">本頁內容</span>
${items.map(([id, label], i) => `<a href="#${id}"${i === 0 ? ' class="active"' : ''}>${label}</a>`).join('')}
</aside>`;
}

// ---------- 首頁 ----------
function homePage() {
  const titleLine = [profile.title, profile.department, profile.school].filter(Boolean).map(esc).join(' · ');
  const areas = arr(profile.research_areas).map((a) => `<span class="chip">${esc(a)}</span>`).join('');
  const current = courses.filter((c) => c.status !== '已結束');
  const featured = pubs.filter((p) => p.featured).slice(0, 3);
  const recent = featured.length ? featured : pubs.slice(0, 3);
  const links = [['Google Scholar', profile.scholar], ['ORCID', profile.orcid], ['ResearchGate', profile.researchgate]]
    .filter(([, href]) => str(href)).map(([l, href]) => `<a href="${esc(u(href))}">${l}</a>`).join('');

  const body = `<section class="hero">
<div class="wrap hero-inner">
${photo(profile.photo, NAME, 'hero-photo')}
<div class="hero-text">
${titleLine ? `<p class="hero-kicker">${titleLine}</p>` : ''}
<h1>${esc(NAME)}</h1>
${paras(profile.bio, 'hero-bio')}
${areas ? `<div class="chips">${areas}</div>` : ''}
${profile.email ? `<p class="hero-mail"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg><a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></p>` : ''}
</div>
</div>
</section>

${current.length ? `<section class="wrap section" aria-labelledby="now-h">
<div class="section-head"><h2 id="now-h">本學期授課</h2><a href="${u('/courses/')}">歷年授課 →</a></div>
<div class="grid">${current.map(courseCard).join('')}</div>
</section>` : ''}

${recent.length ? `<section class="wrap section" aria-labelledby="pub-h">
<div class="section-head"><h2 id="pub-h">近期發表</h2><a href="${u('/publications/')}">全部發表 →</a></div>
<ol class="pubs">${recent.map(pubItem).join('')}</ol>
</section>` : ''}

<section class="contact" id="contact" aria-labelledby="contact-h">
<div class="wrap contact-inner">
<div><h2 id="contact-h">聯絡方式</h2><p>歡迎對研究合作、修課或加入團隊有興趣的同學與夥伴來信。</p></div>
<div class="contact-list">
${profile.email ? `<div>Email：<a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></div>` : ''}
${profile.office ? `<div>研究室：${esc(profile.office)}</div>` : ''}
${profile.office_hours ? `<div>Office Hour：${esc(profile.office_hours)}</div>` : ''}
${links ? `<div class="contact-links">${links}</div>` : ''}
</div>
</div>
</section>`;
  write('index.html', layout({ title: '', active: 'home', body }));
}

// ---------- 關於我 ----------
function aboutPage() {
  const secs = [
    ['edu', '學歷', profile.education, (e) => rowItem(e.period, e.degree, e.school)],
    ['work', '工作經歷', profile.work, (e) => rowItem(e.period, e.title, e.org)],
    ['service', '學術服務經歷', profile.service, (e) => rowItem(e.period, e.role, e.org)],
    ['awards', '獲獎紀錄', profile.awards, (e) => rowItem(e.year, e.name, e.org)],
  ];
  const body = `${pageHero('ABOUT', '關於我')}
<div class="wrap with-toc">
${toc(secs.map(([id, label]) => [id, label]))}
<div class="toc-main">
${secs.map(([id, label, items, render]) => `<section id="${id}" class="block" aria-labelledby="${id}-h">
<h2 id="${id}-h">${label}</h2>
${rows(items, render)}
</section>`).join('\n')}
</div>
</div>`;
  write('about/index.html', layout({ title: '關於我', active: 'about', body }));
}

// ---------- 學術發表 ----------
function pubsPage() {
  const filters = [['all', '全部']].concat(Object.entries(TYPE_LABEL).filter(([k]) => pubs.some((p) => p.type === k)));
  const links = [['Google Scholar', profile.scholar], ['ORCID', profile.orcid]].filter(([, h]) => str(h));
  const intro = links.length ? `<p>完整發表紀錄也可在 ${links.map(([l, h]) => `<a href="${esc(u(h))}">${l}</a>`).join(' 與 ')} 查詢。</p>` : '';
  const body = `${pageHero('PUBLICATIONS', '學術發表', intro)}
<section class="wrap section" aria-label="發表列表">
${pubs.length > 0 && filters.length > 2 ? `<div class="filters" role="group" aria-label="依類型篩選">
${filters.map(([k, l], i) => `<button type="button" data-filter="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}
</div>` : ''}
${pubs.length ? `<ol class="pubs" id="pub-list">${pubs.map(pubItem).join('')}</ol>` : '<p class="empty">尚未新增資料。</p>'}
</section>`;
  write('publications/index.html', layout({ title: '學術發表', active: 'pubs', body }));
}

// ---------- 歷年授課 ----------
function coursesPage() {
  const current = courses.filter((c) => c.status !== '已結束');
  const ended = courses.filter((c) => c.status === '已結束');
  const years = [...new Set(ended.map((c) => str(c.academic_year)))];
  const body = `${pageHero('TEACHING', '歷年授課', '<p>每門課都有自己的頁面，整理課程大綱、教學內容與學生課堂任務；已結束的課程附上課程評鑑分數。</p>')}
<div class="wrap section stack-lg">
${current.length ? `<section aria-labelledby="cur-h" class="block">
<h2 id="cur-h">本學期</h2>
<div class="grid">${current.map(courseCard).join('')}</div>
</section>` : ''}
${years.map((y, i) => `<section aria-labelledby="y${i}-h" class="block">
<h2 id="y${i}-h">${esc(y)} 學年度</h2>
<div class="grid">${ended.filter((c) => str(c.academic_year) === y).map(courseCard).join('')}</div>
</section>`).join('\n')}
${courses.length ? '' : '<p class="empty">尚未新增課程。</p>'}
</div>`;
  write('courses/index.html', layout({ title: '歷年授課', active: 'courses', body }));
}

function coursePage(c) {
  const e = c.evaluation || {};
  const ended = c.status === '已結束';
  const showEval = ended && str(e.score);
  const goals = arr(c.goals);
  const grading = arr(c.grading);
  const weeks = arr(c.weeks);
  const lessons = arr(c.lessons);
  const tasks = arr(c.tasks);
  const works = arr(c.works);
  const sections = [];

  if (goals.length || grading.length || weeks.length) {
    sections.push(['syllabus', '課程大綱', `<div class="grid grid-2">
${goals.length ? `<div class="card"><strong>學習目標</strong><ol class="goal-list">${goals.map((g) => `<li>${esc(g)}</li>`).join('')}</ol></div>` : ''}
${grading.length ? `<div class="card"><strong>評分方式</strong><div class="kv">${grading.map((g) => `<div><span>${esc(g.item)}</span><span>${esc(g.percent)}${/%$/.test(str(g.percent)) || !str(g.percent) ? '' : '%'}</span></div>`).join('')}</div></div>` : ''}
</div>
${weeks.length ? `<div class="table-wrap"><table>
<thead><tr><th scope="col">週次</th><th scope="col">單元主題</th><th scope="col">課堂活動／任務</th></tr></thead>
<tbody>${weeks.map((w) => `<tr><td class="muted">${esc(w.week)}</td><td>${esc(w.topic)}</td><td>${esc(w.activity)}</td></tr>`).join('')}</tbody>
</table></div>` : ''}`]);
  }
  if (lessons.length) {
    sections.push(['content', '教學內容', lessons.map((l) => `<article class="card lesson">
${l.image ? `<img src="${esc(u(l.image))}" alt="" loading="lazy">` : ''}
<div class="lesson-text">
<span class="muted">${esc([l.week, l.date].filter(Boolean).join(' · '))}</span>
<h3>${esc(l.title)}</h3>
${paras(l.summary)}
${arr(l.files).length ? `<div class="pub-links">${arr(l.files).map((f) => `<a href="${esc(u(f.file || f.url))}">${esc(f.label || '檔案')}</a>`).join('')}</div>` : ''}
</div>
</article>`).join('')]);
  }
  if (tasks.length || works.length) {
    sections.push(['tasks', '學生課堂任務', `${tasks.length ? `<div class="grid">${tasks.map((t, i) => `<div class="card task">
<div class="task-top"><span class="task-no">任務 ${i + 1}</span>${t.due ? `<span class="muted">繳交：${esc(t.due)}</span>` : ''}</div>
<strong class="card-title">${esc(t.name)}</strong>
${paras(t.description)}
${t.format ? `<div class="task-format">繳交形式：${esc(t.format)}</div>` : ''}
</div>`).join('')}</div>` : ''}
${works.length ? `<h3>課堂作品精選</h3><div class="grid grid-sm">${works.map((w) => `<figure class="work">
${photo(w.image, w.title, 'work-img')}
<figcaption><strong>${esc(w.title)}</strong><br>${esc([w.by, w.task].filter(Boolean).join(' · '))}</figcaption>
</figure>`).join('')}</div>` : ''}`]);
  }
  if (showEval) {
    sections.push(['eval', '課程評鑑', `<div class="grid grid-sm">
<div class="card stat"><span class="muted">整體評分</span><span><strong>${esc(e.score)}</strong> / ${esc(e.scale || '5')}</span></div>
${arr(e.items).map((it) => `<div class="card stat"><span class="muted">${esc(it.name)}</span><span><strong>${esc(it.score)}</strong> / ${esc(e.scale || '5')}</span></div>`).join('')}
</div>
${arr(e.feedback).map((f) => `<blockquote>${esc(f)}</blockquote>`).join('')}`]);
  }

  const meta = [c.schedule ? `上課時間：${esc(c.schedule)}` : '', c.room ? `地點：${esc(c.room)}` : '', e.students ? `修課人數：${esc(e.students)}` : '']
    .filter(Boolean).map((m) => `<span>${m}</span>`).join('');
  const hero = `<section class="page-hero">
<div class="wrap course-hero">
<div class="course-hero-text">
<a class="back" href="${u('/courses/')}">← 歷年授課</a>
<span class="kicker">${esc([c.academic_year ? c.academic_year + ' 學年度' : '', c.semester, c.level, c.credits ? c.credits + ' 學分' : ''].filter(Boolean).join(' · '))}</span>
<h1>${esc(c.title)}</h1>
${paras(c.description)}
${meta ? `<div class="hero-meta">${meta}</div>` : ''}
</div>
${showEval ? `<div class="eval-box"><span>課程評鑑</span><span><strong>${esc(e.score)}</strong> / ${esc(e.scale || '5')}</span>${e.response_rate ? `<span class="small">填答率 ${esc(e.response_rate)}${/%$/.test(str(e.response_rate)) ? '' : '%'}</span>` : ''}</div>` : ''}
</div>
</section>`;
  const body = `${hero}
<div class="wrap with-toc">
${sections.length ? toc(sections.map(([id, l]) => [id, l])) : ''}
<div class="toc-main">
${sections.map(([id, label, html]) => `<section id="${id}" class="block" aria-labelledby="${id}-h"><h2 id="${id}-h">${label}</h2>${html}</section>`).join('\n') || '<p class="empty">這門課的內容還在準備中。</p>'}
</div>
</div>`;
  write(`courses/${c.id}/index.html`, layout({ title: c.title, active: 'courses', body, description: c.description }));
}

// ---------- 研究團隊 ----------
function teamPage() {
  const jump = [['members', '目前成員', team.length], ['projects', '大學部專題', projects.length], ['theses', '碩博士論文', theses.length], ['awards', '學生得獎紀錄', studentAwards.length]]
    .filter(([, , n]) => n);
  const body = `${pageHero('RESEARCH TEAM', '研究團隊與學生成果', paras(profile.lab_intro), jump.length ? `<div class="jump">${jump.map(([id, l]) => `<a href="#${id}">${l}</a>`).join('')}</div>` : '')}
<div class="wrap section stack-lg">
${team.length ? `<section id="members" class="block" aria-labelledby="mem-h"><h2 id="mem-h">目前成員</h2>
<div class="grid grid-sm">${team.map((m) => `<div class="card member">${photo(m.photo, m.name, 'avatar')}<div><strong>${esc(m.name)}</strong><span class="accent">${esc(m.level)}</span><span class="muted">${esc(m.topic)}</span></div></div>`).join('')}</div>
</section>` : ''}
${projects.length ? `<section id="projects" class="block" aria-labelledby="proj-h"><h2 id="proj-h">大學部專題</h2>
<p class="muted">每組一列，點進去可看專題介紹、組員分工與成果。</p>
<div class="list">${projects.map((p) => listLink('/projects/' + p.id + '/', p.year, '專題', 'tag-muted', arr(p.members).map((m) => m.name).join('、'), p.title)).join('')}</div>
</section>` : ''}
${theses.length ? `<section id="theses" class="block" aria-labelledby="th-h"><h2 id="th-h">碩博士論文</h2>
<p class="muted">點進去可看論文中英文摘要與臺灣博碩士論文知識加值系統的連結。</p>
<div class="list">${theses.map((t) => listLink('/theses/' + t.id + '/', t.year, t.degree || '碩士', t.degree === '博士' ? 'tag-solid' : '', t.student, t.title_zh)).join('')}</div>
</section>` : ''}
${studentAwards.length ? `<section id="awards" class="block" aria-labelledby="aw-h"><h2 id="aw-h">指導學生得獎紀錄</h2>
<div class="table-wrap"><table>
<thead><tr><th scope="col">年份</th><th scope="col">競賽／獎項</th><th scope="col">名次</th><th scope="col">得獎學生</th><th scope="col">作品</th></tr></thead>
<tbody>${studentAwards.map((a) => `<tr><td class="muted">${esc(a.year)}</td><td><strong>${esc(a.competition)}</strong></td><td>${esc(a.rank)}</td><td>${esc(a.students)}</td><td>${a.work_link ? `<a href="${esc(u(a.work_link))}">${esc(a.work_title || '查看')}</a>` : esc(a.work_title)}</td></tr>`).join('')}</tbody>
</table></div>
</section>` : ''}
${jump.length ? '' : '<p class="empty">尚未新增資料。</p>'}
</div>`;
  write('team/index.html', layout({ title: '研究團隊', active: 'team', body }));
}

function projectPage(p) {
  const members = arr(p.members);
  const gallery = arr([].concat(p.gallery || []));
  const links = arr(p.links);
  const body = `<article class="wrap narrow section stack">
<a class="back-dark" href="${u('/team/#projects')}">← 研究團隊與學生成果</a>
<div class="tags"><span class="tag">大學部專題${p.year ? ' · ' + esc(p.year) : ''}</span>${p.award ? `<span class="tag tag-gold">${esc(p.award)}</span>` : ''}</div>
<h1 class="detail-title">${esc(p.title)}</h1>
${paras(p.summary, 'lead')}
${p.cover ? `<img class="cover" src="${esc(u(p.cover))}" alt="${esc(p.title)}">` : ''}
${members.length ? `<section class="block" aria-labelledby="m-h"><h2 id="m-h">組員與分工</h2>
<div class="grid grid-sm">${members.map((m) => `<div class="card member">${photo(m.photo, m.name, 'avatar')}<div><strong>${esc(m.name)}</strong><span class="muted">${esc(m.role)}</span></div></div>`).join('')}</div></section>` : ''}
${str(p.intro) ? `<section class="block" aria-labelledby="i-h"><h2 id="i-h">專題介紹</h2>${paras(p.intro)}</section>` : ''}
${gallery.length || links.length || p.poster ? `<section class="block" aria-labelledby="g-h"><h2 id="g-h">成果展示</h2>
${gallery.length ? `<div class="grid grid-sm">${gallery.map((g) => `<img class="gallery-img" src="${esc(u(g))}" alt="" loading="lazy">`).join('')}</div>` : ''}
<div class="btns">${p.poster ? `<a class="btn" href="${esc(u(p.poster))}">專題海報 PDF</a>` : ''}${links.map((l) => `<a class="btn btn-line" href="${esc(u(l.url))}">${esc(l.label || '連結')}</a>`).join('')}</div>
</section>` : ''}
</article>`;
  write(`projects/${p.id}/index.html`, layout({ title: p.title, active: 'team', body, description: p.summary }));
}

function thesisPage(t) {
  const body = `<article class="wrap narrower section stack">
<a class="back-dark" href="${u('/team/#theses')}">← 研究團隊與學生成果</a>
<span class="tag tag-start">${esc(t.degree || '碩士')}論文${t.year ? ' · ' + esc(t.year) + ' 學年度' : ''}</span>
<h1 class="detail-title">${esc(t.title_zh)}</h1>
${t.title_en ? `<p class="title-en" lang="en">${esc(t.title_en)}</p>` : ''}
<div class="facts">
<div><span>研究生</span><strong>${esc(t.student)}</strong></div>
<div><span>指導教授</span><strong>${esc(t.advisor || NAME)}</strong></div>
${t.department ? `<div><span>系所</span><strong>${esc(t.department)}</strong></div>` : ''}
${t.year ? `<div><span>畢業學年度</span><strong>${esc(t.year)}</strong></div>` : ''}
</div>
${t.ndltd_url ? `<a class="ndltd" href="${esc(u(t.ndltd_url))}"><span><strong>臺灣博碩士論文知識加值系統</strong><span>查看論文全文與公開資訊</span></span><span>開啟連結 ↗</span></a>` : ''}
${str(t.abstract_zh) ? `<section class="block" aria-labelledby="zh-h"><h2 id="zh-h">中文摘要</h2>${paras(t.abstract_zh)}${t.keywords_zh ? `<p class="muted"><strong>關鍵詞：</strong>${esc(t.keywords_zh)}</p>` : ''}</section>` : ''}
${str(t.abstract_en) ? `<section class="block divided" lang="en" aria-labelledby="en-h"><h2 id="en-h">Abstract</h2>${paras(t.abstract_en)}${t.keywords_en ? `<p class="muted"><strong>Keywords:</strong> ${esc(t.keywords_en)}</p>` : ''}</section>` : ''}
</article>`;
  write(`theses/${t.id}/index.html`, layout({ title: t.title_zh, active: 'team', body, description: t.abstract_zh }));
}

function notFound() {
  const body = `${pageHero('404', '找不到這個頁面', `<p>頁面可能已經移除或網址有誤。<a href="${u('/')}" style="color:#A9C4F0">回到首頁</a></p>`)}`;
  write('404.html', layout({ title: '找不到頁面', active: '', body }));
}

// ---------- 開始產生 ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir('assets', 'assets');
copyDir('media', 'media');
homePage();
aboutPage();
pubsPage();
coursesPage();
courses.forEach(coursePage);
teamPage();
projects.forEach(projectPage);
theses.forEach(thesisPage);
notFound();
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`✓ 網站產生完成：${pubs.length} 篇發表、${courses.length} 門課、${projects.length} 個專題、${theses.length} 篇論文`);
