// Progressive enhancement for the sketchbook theme. Without JS every link is a normal
// page (each gallery/story/about/contact page renders the desk with its sheet open).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const HOME = body.dataset.home;
const ov = $("#ov");

/* ---------- gallery tiles: fill one screen whatever the number of galleries ---------- */
const MAX_TILES = 9;
const gals = $("#gals");
const tiles = $$(".tile", gals);

function bestGrid(n, W, H) {
  let best;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols), tw = W / cols, th = H / rows;
    // prefer roughly 4:3 tiles and few empty cells
    const score = Math.min(tw, th * 1.25) - (rows * cols - n) * 0.15 * Math.min(tw, th);
    if (!best || score > best.score) best = { cols, rows, score };
  }
  return best;
}

if (tiles.length > MAX_TILES) {
  // keep the newest MAX-1, the last tile becomes "+N galleries" opening the next one (album has tabs to all)
  const rest = tiles.slice(MAX_TILES - 1);
  rest.forEach((t) => (t.hidden = true));
  const more = document.createElement("a");
  more.className = "tile more";
  more.href = rest[0].href;
  more.dataset.ov = "";
  more.style.setProperty("--r", "1deg");
  more.innerHTML = `<span><span class="stack">${rest.slice(0, 3).map((t) => `<img src="${t.querySelector(".ph").src}" alt="">`).join("")}</span>
    <b>${body.dataset.i18nMore.replace("%d", rest.length)}</b></span>`;
  gals.append(more);
}

function layoutTiles() {
  const shown = $$(".tile:not([hidden])", gals);
  if (!shown.length) return;
  shown.forEach((t) => (t.style.gridColumn = ""));
  const r = gals.getBoundingClientRect();
  const { cols, rows } = bestGrid(shown.length, r.width, r.height);
  gals.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  gals.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
  const gap = rows * cols - shown.length;
  if (gap > 0) shown[0].style.gridColumn = `span ${Math.min(gap + 1, cols)}`; // newest gets the spare room
}
layoutTiles();
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(layoutTiles, 150); });

// slow slideshow inside each tile
tiles.forEach((t, i) => {
  const ph = $$(".ph", t);
  if (ph.length < 2) return;
  let k = 0;
  const next = () => { k = (k + 1) % ph.length; ph.forEach((p, j) => p.classList.toggle("on", j === k)); };
  setTimeout(() => setInterval(next, 4500), 1500 + i * 900);
  t.addEventListener("mouseenter", next);
});

/* ---------- overlays: load other pages' sheet into #ov, keep the URL in sync ---------- */
const cache = new Map();
const fetchPage = (url) => {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => r.text()).then((t) => new DOMParser().parseFromString(t, "text/html")));
  return cache.get(url);
};
const isOpen = () => ov.classList.contains("open");

function setOverlay(doc) {
  const src = doc.getElementById("ov");
  ov.dataset.kind = src.dataset.kind;
  ov.innerHTML = src.innerHTML;
  document.title = doc.title;
  enhance();
}
async function openUrl(url, push) {
  let doc;
  try { doc = await fetchPage(url); } catch { location.href = url; return; }
  const src = doc.getElementById("ov");
  if (!src || !src.dataset.kind) { location.href = url; return; }
  const swapping = isOpen() && ov.dataset.kind === src.dataset.kind && src.dataset.kind === "album";
  if (isOpen() && !swapping) { ov.classList.remove("open"); await new Promise((r) => setTimeout(r, 250)); }
  setOverlay(doc);
  if (!swapping) { void ov.offsetWidth; ov.classList.add("open"); }
  body.classList.add("ov-on");
  if (push) history.pushState({ ov: true }, "", url);
}
function closeOverlay() {
  ov.classList.remove("open");
  body.classList.remove("ov-on");
  document.title = homeTitle;
}
let homeTitle = document.title;
if (isOpen()) {
  body.classList.add("ov-on");
  fetchPage(HOME).then((d) => (homeTitle = d.title)).catch(() => {});
}

document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const close = e.target.closest("[data-close]");
  if (close && (isOpen() || location.pathname === HOME)) {
    e.preventDefault();
    if (!isOpen()) return;
    if (history.state && history.state.ov) history.back();
    else { history.pushState({}, "", HOME); closeOverlay(); }
    return;
  }
  const a = e.target.closest("a[data-ov]");
  if (a) { e.preventDefault(); openUrl(a.href, a.href !== location.href); return; }
  const snap = e.target.closest(".snap");
  if (snap) { e.preventDefault(); openLightbox(snap); }
});
// prefetch on hover so sheets open instantly
document.addEventListener("pointerover", (e) => { const a = e.target.closest("a[data-ov]"); if (a) fetchPage(a.href).catch(() => {}); });
addEventListener("popstate", () => {
  if (location.pathname === HOME) closeOverlay();
  else openUrl(location.href, false);
});
addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !isOpen() || lb.classList.contains("open")) return;
  $("[data-close]", ov)?.click();
});

/* things inside a freshly opened sheet */
function enhance() {
  const reader = $(".reader", ov);
  if (reader) {
    const bar = $(".reader-progress i", reader);
    reader.addEventListener("scroll", () => (bar.style.width = (reader.scrollTop / (reader.scrollHeight - reader.clientHeight)) * 100 + "%"));
  }
  const letter = $("#letter", ov);
  if (letter) letter.addEventListener("submit", sendLetter);
}
enhance();

/* ---------- contact: post into the Google Form, then fold a paper plane ---------- */
function sendLetter(e) {
  e.preventDefault();
  const f = e.currentTarget, data = new FormData(f);
  const email = data.get("email");
  data.delete("email");
  if (email) data.set(f.dataset.message, `${data.get(f.dataset.message)}\n\n— e-mail: ${email}`);
  fetch(f.action, { method: "POST", mode: "no-cors", body: data }).catch(() => {});
  f.classList.add("fly");
  const toast = $("#toast");
  setTimeout(() => { $("[data-close]", ov).click(); toast.classList.add("on"); f.reset(); }, 1250);
  setTimeout(() => { toast.classList.remove("on"); f.classList.remove("fly"); }, 3400);
}

/* ---------- lightbox ---------- */
const lb = $("#lb");
let items = [], idx = 0;
function show(i, dir = 0) {
  idx = (i + items.length) % items.length;
  const it = items[idx], img = $(".lb-img", lb);
  img.style.transition = "none"; img.style.opacity = 0; img.style.transform = `translateX(${dir * 40}px)`;
  img.onload = () => requestAnimationFrame(() => {
    img.style.transition = "opacity .45s, transform .45s cubic-bezier(.2,.8,.2,1)";
    img.style.opacity = 1; img.style.transform = "none";
  });
  img.src = it.href; img.alt = it.title;
  $(".lb-cap b", lb).textContent = it.title;
  $(".lb-cap span", lb).textContent = it.caption;
  $(".lb-count", lb).textContent = `${idx + 1} / ${items.length}`;
  // preload neighbours
  [1, -1].forEach((d) => { new Image().src = items[(idx + d + items.length) % items.length].href; });
}
function openLightbox(snap) {
  const snaps = $$(".snap", ov);
  items = snaps.map((s) => ({ href: s.href, title: s.dataset.title, caption: s.dataset.caption }));
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add("open"));
  show(snaps.indexOf(snap));
}
function closeLightbox() { lb.classList.remove("open"); setTimeout(() => (lb.hidden = true), 350); }
lb.addEventListener("click", (e) => {
  if (e.target.closest(".lb-next")) show(idx + 1, 1);
  else if (e.target.closest(".lb-prev")) show(idx - 1, -1);
  else if (e.target.closest(".lb-close") || e.target === lb) closeLightbox();
});
addEventListener("keydown", (e) => {
  if (!lb.classList.contains("open")) return;
  if (e.key === "ArrowRight") show(idx + 1, 1);
  if (e.key === "ArrowLeft") show(idx - 1, -1);
  if (e.key === "Escape") closeLightbox();
});
let tx = null;
lb.addEventListener("touchstart", (e) => (tx = e.touches[0].clientX), { passive: true });
lb.addEventListener("touchend", (e) => {
  if (tx == null) return;
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  tx = null;
});
