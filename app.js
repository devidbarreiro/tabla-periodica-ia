(function () {
  "use strict";

  const { UPDATED, CATEGORIES, ELEMENTS } = window.AI_TABLE;
  const STORAGE_KEY = "tpia.known.v1";
  const MOBILE_QUERY = window.matchMedia("(max-width: 900px)");
  const SERIES_LABELS = [
    { row: 9, text: "Modelos frontera" },
    { row: 10, text: "Serie agéntica" },
  ];

  const catById = Object.fromEntries(CATEGORIES.map((c, i) => [c.id, { ...c, index: i }]));
  const $ = (id) => document.getElementById(id);
  const table = $("table");
  const preview = $("preview");
  const legend = $("legend");
  const search = $("q");

  const state = {
    pinned: null,
    category: null,
    query: "",
    known: loadKnown(),
  };

  function loadKnown() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (err) {
      return new Set();
    }
  }

  function saveKnown() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.known]));
    } catch (err) {
      // Almacenamiento bloqueado (modo privado): el contador sigue funcionando en memoria.
    }
  }

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

  const normalize = (str) => String(str).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  function renderLegend() {
    legend.innerHTML = CATEGORIES.map(
      (c) => `<button class="chip" style="--c:${c.color}" data-cat="${c.id}" aria-pressed="false">${escapeHtml(c.name)}</button>`
    ).join("");
    legend.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      state.category = state.category === chip.dataset.cat ? null : chip.dataset.cat;
      applyFilters();
    });
  }

  function renderTable() {
    const labels = SERIES_LABELS.map(
      (l) => `<div class="series-label" style="grid-row:${l.row}">${escapeHtml(l.text)} →</div>`
    ).join("");

    const cells = ELEMENTS.map((el) => {
      const cat = catById[el.cat];
      const mobileOrder = cat.index * 1000 + el.num;
      return `<button class="el" role="gridcell" data-num="${el.num}"
        style="--c:${cat.color};--i:${el.num};grid-row:${el.row};grid-column:${el.col};order:var(--o,0)"
        data-order="${mobileOrder}" aria-label="${escapeHtml(`${el.num} ${el.s} — ${el.n}`)}">
        <span class="num">${el.num}</span>
        ${el.hot ? '<span class="new" aria-hidden="true"></span>' : ""}
        <span class="sym">${escapeHtml(el.s)}</span>
        <span class="name">${escapeHtml(el.n)}</span>
      </button>`;
    }).join("");

    table.insertAdjacentHTML("beforeend", labels + cells);
    applyMobileOrder();
  }

  function applyMobileOrder() {
    table.querySelectorAll(".el").forEach((node) => {
      node.style.setProperty("--o", MOBILE_QUERY.matches ? node.dataset.order : "0");
    });
  }

  function renderPreview(el) {
    const cat = catById[el.cat];
    preview.classList.remove("empty");
    const isKnown = state.known.has(el.s);
    const meta = [el.org, el.y].filter(Boolean).join(" · ");
    preview.style.setProperty("--c", cat.color);
    preview.innerHTML = `
      <button class="close" aria-label="Cerrar">×</button>
      <div class="big" style="--c:${cat.color}">
        <span class="num">${el.num}</span>
        <span class="sym">${escapeHtml(el.s)}</span>
        <span class="yr">${el.y ?? "—"}</span>
      </div>
      <div class="info">
        <div class="cat">${escapeHtml(cat.name)}${el.hot ? ' <span class="tag">· novedad</span>' : ""}</div>
        <h2>${escapeHtml(el.n)}</h2>
        ${el.org ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
        <p>${escapeHtml(el.d)}</p>
        ${el.latest ? `<div class="latest">Última versión: <b>${escapeHtml(el.latest)}</b></div>` : ""}
        <div class="actions">
          <button class="btn ${isKnown ? "on" : ""}" data-toggle-known="${escapeHtml(el.s)}">${isKnown ? "✓ Lo conozco" : "Lo conozco"}</button>
          <span class="hint">${state.pinned === el.num ? "Fijado · Esc para soltar" : "Clic para fijar"}</span>
        </div>
      </div>`;
  }

  function renderIntro() {
    preview.classList.remove("empty");
    preview.style.setProperty("--c", catById.fund.color);
    preview.innerHTML = `
      <div class="big" style="--c:${catById.fund.color}">
        <span class="num">1</span><span class="sym">Ia</span><span class="yr">1956</span>
      </div>
      <div class="info">
        <div class="cat">Cómo leerla</div>
        <h2>${ELEMENTS.length} términos, 12 familias</h2>
        <p>Los fundamentos a la izquierda, arquitecturas y entrenamiento en el centro, seguridad y horizonte a la derecha. Abajo, como los lantánidos: los modelos frontera y la serie agéntica. Pasa el ratón por cualquier elemento.</p>
      </div>`;
  }

  function renderEmpty(query) {
    preview.classList.add("empty");
    preview.style.removeProperty("--c");
    preview.innerHTML = `
      <button class="close" aria-label="Cerrar">×</button>
      <div class="big"><span class="num">0</span><span class="sym">?</span><span class="yr">—</span></div>
      <div class="info">
        <div class="cat">Sin resultados</div>
        <h2>Nada coincide con «${escapeHtml(query)}»</h2>
        <p>Prueba con el nombre en inglés (fine-tuning, tool use), con una sigla (RAG, MCP) o con un año (2025). También puedes filtrar por familia con la leyenda.</p>
        <div class="actions"><button class="btn" data-clear-search>Limpiar búsqueda</button></div>
      </div>`;
  }

  function show(num) {
    const el = ELEMENTS.find((e) => e.num === num);
    if (!el) return;
    table.querySelectorAll(".el.active").forEach((n) => n.classList.remove("active"));
    table.querySelector(`.el[data-num="${num}"]`)?.classList.add("active");
    renderPreview(el);
  }

  function pin(num) {
    state.pinned = num;
    show(num);
    preview.classList.add("open");
  }

  function unpin() {
    state.pinned = null;
    table.querySelectorAll(".el.active").forEach((n) => n.classList.remove("active"));
    preview.classList.remove("open");
    renderIntro();
  }

  function matches(el) {
    const inCategory = !state.category || el.cat === state.category;
    if (!state.query) return inCategory;
    const haystack = normalize([el.s, el.n, el.d, el.org, el.y, el.latest, catById[el.cat].name].join(" "));
    return inCategory && haystack.includes(state.query);
  }

  function applyFilters() {
    const isFiltering = Boolean(state.category || state.query);
    table.classList.toggle("dim", isFiltering);
    legend.classList.toggle("filtering", Boolean(state.category));
    legend.querySelectorAll(".chip").forEach((chip) => {
      chip.setAttribute("aria-pressed", String(chip.dataset.cat === state.category));
    });
    let count = 0;
    ELEMENTS.forEach((el) => {
      const isMatch = matches(el);
      if (isMatch) count += 1;
      table.querySelector(`.el[data-num="${el.num}"]`).classList.toggle("match", isMatch);
    });
    $("count").textContent = isFiltering ? `${count}/${ELEMENTS.length}` : String(ELEMENTS.length);
    const isEmpty = isFiltering && count === 0;
    if (isEmpty) {
      state.pinned = null;
      renderEmpty(search.value.trim());
      preview.classList.add("open");
    } else if (preview.classList.contains("empty")) {
      unpin();
    }
  }

  function renderKnown() {
    const total = ELEMENTS.length;
    const known = ELEMENTS.filter((el) => state.known.has(el.s)).length;
    $("known").textContent = known;
    $("total").textContent = total;
    $("knownBar").style.transform = `scaleX(${known / total})`;
    ELEMENTS.forEach((el) => {
      table.querySelector(`.el[data-num="${el.num}"]`).classList.toggle("known", state.known.has(el.s));
    });
  }

  function toggleKnown(symbol) {
    const next = new Set(state.known);
    if (next.has(symbol)) next.delete(symbol);
    else next.add(symbol);
    state.known = next;
    saveKnown();
    renderKnown();
    const current = state.pinned ?? Number(table.querySelector(".el.active")?.dataset.num);
    if (current) show(current);
  }

  function step(delta) {
    const visible = ELEMENTS.filter(matches).map((e) => e.num);
    if (!visible.length) return;
    const idx = visible.indexOf(state.pinned);
    const next = visible[(idx + delta + visible.length) % visible.length];
    pin(next);
    table.querySelector(`.el[data-num="${next}"]`)?.focus({ preventScroll: true });
  }

  function bindEvents() {
    table.addEventListener("mouseover", (e) => {
      const cell = e.target.closest(".el");
      if (cell && state.pinned === null && !MOBILE_QUERY.matches) show(Number(cell.dataset.num));
    });
    table.addEventListener("mouseleave", () => {
      if (state.pinned === null) unpin();
    });
    table.addEventListener("click", (e) => {
      const cell = e.target.closest(".el");
      if (!cell) return;
      const num = Number(cell.dataset.num);
      if (state.pinned === num) unpin();
      else pin(num);
    });
    preview.addEventListener("click", (e) => {
      e.stopPropagation();
      const toggle = e.target.closest("[data-toggle-known]");
      if (toggle) toggleKnown(toggle.dataset.toggleKnown);
      if (e.target.closest(".close")) unpin();
      if (e.target.closest("[data-clear-search]")) {
        search.value = "";
        state.query = "";
        applyFilters();
        search.focus();
      }
    });
    search.addEventListener("input", () => {
      state.query = normalize(search.value.trim());
      applyFilters();
    });
    document.addEventListener("keydown", (e) => {
      if (e.target === search) {
        if (e.key === "Escape") search.blur();
        return;
      }
      if (e.key === "Escape") unpin();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "/") {
        e.preventDefault();
        search.focus();
      }
    });
    MOBILE_QUERY.addEventListener("change", applyMobileOrder);
  }

  $("updated").textContent = UPDATED;
  renderLegend();
  renderTable();
  renderIntro();
  renderKnown();
  applyFilters();
  bindEvents();
})();
