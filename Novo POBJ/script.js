/* =========================================================
   POBJ • script.js  —  cards, tabela em árvore e ranking
   ========================================================= */

/* ===== Config ===== */
const DATA_SOURCE = "mock";
const API_URL = "/api";
const TICKET_URL = "https://botpj.com/index.php?class=LoginForm";

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmtBRL = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" });
const fmtINT = new Intl.NumberFormat("pt-BR");

/* ===== Visões (chips) da tabela ===== */
const TABLE_VIEWS = [
  { id:"diretoria", label:"Diretoria regional", key:"diretoria" },
  { id:"gerencia",  label:"Gerência regional",  key:"gerenciaRegional" },
  { id:"agencia",   label:"Agência",            key:"agencia" },
  { id:"gGestao",   label:"Gerente de gestão",  key:"gerenteGestao" },
  { id:"gerente",   label:"Gerente",            key:"gerente" },
  { id:"familia",   label:"Família",            key:"familia" },
  { id:"prodsub",   label:"Produto/Subproduto", key:"prodOrSub" },
];

/* === Seções e cards === */
const CARD_SECTIONS_DEF = [
  {
    id:"financeiro", label:"FINANCEIRO",
    items:[
      { id:"rec_vencidos_59",     nome:"Recuperação de Vencidos até 59 dias",     icon:"ti ti-rotate-rectangle", peso:6, metric:"valor" },
      { id:"rec_vencidos_50mais", nome:"Recuperação de Vencidos acima de 50 dias", icon:"ti ti-rotate-rectangle", peso:5, metric:"valor" },
      { id:"rec_credito",         nome:"Recuperação de Crédito",                   icon:"ti ti-cash",             peso:5, metric:"valor" },
    ]
  },
  {
    id:"captacao", label:"CAPTAÇÃO",
    items:[
      { id:"captacao_bruta",   nome:"Captação Bruta",                           icon:"ti ti-pig-money",       peso:4, metric:"valor" },
      { id:"captacao_liquida", nome:"Captação Líquida",                         icon:"ti ti-arrows-exchange", peso:4, metric:"valor" },
      { id:"portab_prev",      nome:"Portabilidade de Previdência Privada",     icon:"ti ti-shield-check",    peso:3, metric:"valor" },
      { id:"centralizacao",    nome:"Centralização de Caixa",                   icon:"ti ti-briefcase",       peso:3, metric:"valor" },
    ]
  },
  {
    id:"credito", label:"CRÉDITO",
    items:[
      { id:"prod_credito_pj", nome:"Produção de Crédito PJ",               icon:"ti ti-building-bank",  peso:8, metric:"valor" },
      { id:"rotativo_pj_vol", nome:"Limite Rotativo PJ (Volume)",          icon:"ti ti-wallet",         peso:3, metric:"valor" },
      { id:"rotativo_pj_qtd", nome:"Limite Rotativo PJ (Quantidade)",      icon:"ti ti-list-numbers",   peso:3, metric:"qtd" },
    ]
  },
  {
    id:"ligadas", label:"LIGADAS",
    items:[
      { id:"cartoes",    nome:"Cartões",    icon:"ti ti-credit-card",   peso:4, metric:"perc" },
      { id:"consorcios", nome:"Consórcios", icon:"ti ti-building-bank", peso:3, metric:"perc" },
      { id:"seguros",    nome:"Seguros",    icon:"ti ti-shield-lock",   peso:5, metric:"perc" },
    ]
  },
  {
    id:"produtividade", label:"PRODUTIVIDADE",
    items:[
      { id:"sucesso_equipe_credito", nome:"Sucesso de Equipe Crédito", icon:"ti ti-activity", peso:10, metric:"perc" },
    ]
  },
  {
    id:"clientes", label:"CLIENTES",
    items:[
      { id:"conquista_qualif_pj", nome:"Conquista Qualificada Gerenciado PJ",      icon:"ti ti-user-star",   peso:3, metric:"qtd" },
      { id:"conquista_folha",     nome:"Conquista de Clientes Folha de Pagamento", icon:"ti ti-users-group", peso:3, metric:"qtd" },
      { id:"bradesco_expresso",   nome:"Bradesco Expresso",                        icon:"ti ti-bolt",        peso:2, metric:"perc" },
    ]
  },
];

/* Índice produto → seção/meta */
const PRODUCT_INDEX = (() => {
  const map = new Map();
  CARD_SECTIONS_DEF.forEach(sec => {
    sec.items.forEach(it => {
      map.set(it.id, { sectionId: sec.id, name: it.nome, icon: it.icon, metric: it.metric, peso: it.peso });
    });
  });
  return map;
})();

/* ===== Datas (UTC) ===== */
function firstDayOfMonthISO(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }
function todayISO(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function formatBRDate(iso){ if(!iso) return ""; const [y,m,day]=iso.split("-"); return `${day}/${m}/${y}`; }
function dateUTCFromISO(iso){ const [y,m,d]=iso.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); }
function isoFromUTCDate(d){ return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`; }
function businessDaysBetweenInclusive(startISO,endISO){
  if(!startISO || !endISO) return 0;
  let s = dateUTCFromISO(startISO), e = dateUTCFromISO(endISO);
  if(s > e) return 0;
  let cnt=0;
  for(let d=new Date(s); d<=e; d.setUTCDate(d.getUTCDate()+1)){
    const wd = d.getUTCDay(); if(wd!==0 && wd!==6) cnt++;
  }
  return cnt;
}
function businessDaysRemainingFromToday(startISO,endISO){
  if(!startISO || !endISO) return 0;
  const today = todayISO();
  let t = dateUTCFromISO(today), s=dateUTCFromISO(startISO), e=dateUTCFromISO(endISO);
  if(t >= e) return 0;
  let startCount = new Date(t); startCount.setUTCDate(startCount.getUTCDate()+1);
  if(startCount < s) startCount = s;
  return businessDaysBetweenInclusive(isoFromUTCDate(startCount), endISO);
}

/* ===== Helpers de métrica ===== */
function formatByMetric(metric, value){
  if(metric === "perc") return `${Number(value).toFixed(1)}%`;
  if(metric === "qtd")  return fmtINT.format(Math.round(value));
  return fmtBRL.format(Math.round(value));
}
function makeRandomForMetric(metric){
  if(metric === "perc"){ const meta=100; const realizado=Math.round(45+Math.random()*75); return { meta, realizado }; }
  if(metric === "qtd"){ const meta=Math.round(1_000+Math.random()*19_000); const realizado=Math.round(meta*(0.75+Math.random()*0.6)); return { meta, realizado }; }
  const meta=Math.round(4_000_000+Math.random()*16_000_000);
  const realizado=Math.round(meta*(0.75+Math.random()*0.6));
  return { meta, realizado };
}

/* ===== API / MOCK ===== */
async function apiGet(path, params){
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  const r = await fetch(`${API_URL}${path}${qs}`); if(!r.ok) throw new Error("Falha ao carregar dados");
  return r.json();
}
async function getData(){
  const period = state.period || { start:firstDayOfMonthISO(), end: todayISO() };

  // MOCK (gera valores mensais e acumulados)
  const hoje = new Date();
  const sections = CARD_SECTIONS_DEF.map(sec=>{
    const items = sec.items.map(it=>{
      const { meta, realizado } = makeRandomForMetric(it.metric);
      const ating = it.metric==="perc" ? (realizado/100) : (meta? realizado/meta : 0);
      return { ...it, meta, realizado, ating, atingido: ating>=1, ultimaAtualizacao: hoje.toLocaleDateString("pt-BR") };
    });
    return { id:sec.id, label:sec.label, items };
  });

  const allItems = sections.flatMap(s => s.items);
  const indicadoresTotal = allItems.length;
  const indicadoresAtingidos = allItems.filter(i => i.atingido).length;
  const pontosPossiveis = allItems.reduce((acc,i)=> acc + (i.peso||0), 0);
  const pontosAtingidos = allItems.filter(i=>i.atingido).reduce((acc,i)=> acc + (i.peso||0), 0);

  const dres  = ["DR 01","DR 02","DR 03"];
  const grs   = ["GR 01","GR 02","GR 03","GR 04"];
  const segs  = ["Empresas","Negócios","MEI"];
  const prodIds = [...PRODUCT_INDEX.keys()];
  const famsMacro = ["Crédito","Investimentos","Seguros","Consórcios","Previdência","Cartão de crédito"];

  const ranking = Array.from({length:140}, (_,i)=>{
    const produtoId = prodIds[i % prodIds.length];
    const metaProd  = PRODUCT_INDEX.get(produtoId);
    const subps = ["Aplicação","Resgate","A vista","Parcelado", ""];
    const subproduto = subps[Math.floor(Math.random()*subps.length)];
    const produtoNome = metaProd?.name || produtoId;

    // valores mensais e acumulados (mock)
    const meta_mens = Math.round(2_000_000 + Math.random()*18_000_000);
    const real_mens = Math.round(meta_mens*(0.75+Math.random()*0.6));
    const fator = 1.2 + Math.random()*1.2; // acum > mensal
    const meta_acum = Math.round(meta_mens * fator);
    const real_acum = Math.round(real_mens * fator);

    return {
      diretoria: dres[i % dres.length],
      gerenciaRegional: grs[i % grs.length],
      gerenteGestao: `GG ${String(1 + (i%3)).padStart(2,"0")}`,
      familia: famsMacro[i % famsMacro.length],
      produtoId,
      produto: produtoNome,
      prodOrSub: subproduto || produtoNome,
      subproduto,
      gerente: `Gerente ${1+(i%16)}`,
      agencia: `Ag ${1000+i}`,
      segmento: segs[i % segs.length],

      // manter campos "tradicionais" usados na tabela
      realizado: real_mens,
      meta:      meta_mens,
      qtd:       Math.round(50 + Math.random()*1950),
      data:      todayISO(),

      // novos campos para ranking
      real_mens, meta_mens, real_acum, meta_acum
    };
  });
  ranking.forEach(r => r.ating = r.meta ? r.realizado/r.meta : 0);

  return {
    sections,
    summary:{
      indicadoresTotal,
      indicadoresAtingidos,
      indicadoresPct: indicadoresTotal ? indicadoresAtingidos/indicadoresTotal : 0,
      pontosPossiveis,
      pontosAtingidos,
      pontosPct: pontosPossiveis ? pontosAtingidos/pontosPossiveis : 0
    },
    ranking,
    period
  };
}

/* ===== Estado ===== */
const state = {
  _dataset:null,
  _rankingRaw:[],
  activeView:"cards",
  tableView:"diretoria",
  tableRendered:false,
  isAnimating:false,
  period: { start:firstDayOfMonthISO(), end: todayISO() },
  datePopover:null,
  compact:false,

  // ranking
  rk:{ mode:"mensal", level:"agencia" } // nível é inferido, mas guardo visível
};

/* ===== Utils UI ===== */
function injectStyles(){
  if(document.getElementById("dynamic-styles")) return;
  const style = document.createElement("style");
  style.id = "dynamic-styles";
  style.textContent = `
    .view-panel{ opacity:1; transform:translateY(0); transition:opacity .28s ease, transform .28s ease; will-change:opacity, transform; }
    .view-panel.is-exit{ opacity:0; transform:translateY(8px); }
    .view-panel.is-enter{ opacity:0; transform:translateY(-6px); }
    .view-panel.is-enter-active{ opacity:1; transform:translateY(0); }
    .hidden{ display:none; }
  `;
  document.head.appendChild(style);
  ["#view-cards", "#view-table"].forEach(sel => $(sel)?.classList.add("view-panel"));
}

/* ===== Popover de data (header) ===== */
function openDatePopover(anchor){
  closeDatePopover();
  const pop = document.createElement("div");
  pop.className = "date-popover";
  pop.id = "date-popover";
  pop.innerHTML = `
    <h4>Alterar data</h4>
    <div class="row" style="margin-bottom:8px">
      <input id="inp-start" type="date" value="${state.period.start}" aria-label="Data inicial">
      <input id="inp-end"   type="date" value="${state.period.end}"   aria-label="Data final">
    </div>
    <div class="actions">
      <button type="button" class="btn-sec" id="btn-cancelar">Cancelar</button>
      <button type="button" class="btn-pri" id="btn-salvar">Salvar</button>
    </div>
  `;
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth || 340;
  const top = r.bottom + 8 + window.scrollY;
  const left = Math.max(12, r.right - w + window.scrollX);
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;

  pop.querySelector("#btn-cancelar").addEventListener("click", closeDatePopover);
  pop.querySelector("#btn-salvar").addEventListener("click", ()=>{
    const s = $("#inp-start").value;
    const e = $("#inp-end").value;
    if(!s || !e || new Date(s) > new Date(e)){ alert("Período inválido."); return; }
    state.period.start = s; state.period.end = e;
    $("#lbl-periodo-inicio").textContent = formatBRDate(s);
    $("#lbl-periodo-fim").textContent    = formatBRDate(e);
    closeDatePopover();
    refresh();
  });

  const outside = (ev)=>{ if(ev.target===pop || pop.contains(ev.target) || ev.target===anchor) return; closeDatePopover(); };
  const esc     = (ev)=>{ if(ev.key==="Escape") closeDatePopover(); };
  document.addEventListener("mousedown", outside, { once:true });
  document.addEventListener("keydown", esc, { once:true });

  state.datePopover = pop;
}
function closeDatePopover(){
  if(state.datePopover?.parentNode) state.datePopover.parentNode.removeChild(state.datePopover);
  state.datePopover = null;
}

/* ===== Botão “Limpar filtros” ===== */
function injectClearButton(){
  const actions = $(".filters__actions");
  if(!actions || $("#btn-limpar")) return;
  const btn = document.createElement("button");
  btn.id="btn-limpar"; btn.className="btn"; btn.type="button";
  btn.innerHTML = `<i class="ti ti-x"></i> Limpar filtros`;
  actions.prepend(btn);
  btn.addEventListener("click", ()=>{
    btn.disabled = true;
    try{ clearFilters(); } finally { setTimeout(()=> btn.disabled = false, 300); }
  });
}
function clearFilters(){
  ["#f-segmento","#f-diretoria","#f-gerencia","#f-gerente","#f-agencia","#f-ggestao","#f-familia","#f-produto","#f-status-kpi","#f-subproduto","#f-contrato"]
    .forEach(sel=>{
      const el=$(sel); if(!el) return;
      if(el.tagName==="SELECT"){ el.selectedIndex=0; }
      else if(el.tagName==="INPUT"){ el.value=""; }
    });
  applyFiltersAndRender();
  if(state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
  renderAppliedFilters();
}

/* ===== Avançado: status/subproduto/contrato ===== */
function ensureStatusFilterInAdvanced(){
  const adv = $("#advanced-filters");
  if(!adv) return;
  const host = adv.querySelector(".adv__grid") || adv;

  if(!$("#f-status-kpi")){
    const wrap = document.createElement("div");
    wrap.className = "filters__group";
    wrap.innerHTML = `
      <label for="f-status-kpi">Status dos indicadores</label>
      <select id="f-status-kpi" class="input">
        <option value="todos" selected>Todos</option>
        <option value="atingidos">Atingidos</option>
        <option value="nao">Não atingidos</option>
      </select>
    `;
    host.appendChild(wrap);
    $("#f-status-kpi").addEventListener("change", ()=>{
      state._dataset && renderFamilias(state._dataset.sections, state._dataset.summary);
      applyFiltersAndRender();
      renderAppliedFilters();
    });
  }

  if(!$("#f-subproduto")){
    const wrap=document.createElement("div");
    wrap.className="filters__group";
    wrap.innerHTML=`
      <label for="f-subproduto">Subproduto</label>
      <select id="f-subproduto" class="input">
        <option value="">Todos</option>
        <option>Aplicação</option><option>Resgate</option><option>A vista</option><option>Parcelado</option>
      </select>`;
    host.appendChild(wrap);
    $("#f-subproduto").addEventListener("change", ()=>{ applyFiltersAndRender(); renderAppliedFilters(); });
  }

  if(!$("#f-contrato")){
    const wrap=document.createElement("div");
    wrap.className="filters__group";
    wrap.innerHTML=`
      <label for="f-contrato">Pesquisar por contrato</label>
      <input id="f-contrato" class="input" placeholder="Ex.: CT-2025-001234">`;
    host.appendChild(wrap);
    $("#f-contrato").addEventListener("input", ()=>{ applyFiltersAndRender(); renderAppliedFilters(); });
  }

  // Remover “Período da busca” (se existir no HTML legado)
  const gStart = $("#f-inicio")?.closest(".filters__group");
  if(gStart) gStart.remove();
}

/* ===== Chips (tabela) + Toolbar ===== */
function ensureChipBarAndToolbar(){
  if($("#table-controls")) return;
  const card = $("#table-section"); if(!card) return;

  const holder = document.createElement("div");
  holder.id="table-controls";
  holder.innerHTML = `<div id="applied-bar" class="applied-bar"></div><div id="chipbar" class="chipbar"></div><div id="tt-toolbar" class="table-toolbar"></div>`;
  card.querySelector(".card__header").insertAdjacentElement("afterend", holder);

  const chipbar = $("#chipbar");
  TABLE_VIEWS.forEach(v=>{
    const chip=document.createElement("button");
    chip.type="button"; chip.className="chip"; chip.dataset.view=v.id; chip.textContent=v.label;
    if(v.id===state.tableView) chip.classList.add("is-active");
    chip.addEventListener("click", ()=>{
      if(state.tableView===v.id) return;
      state.tableView=v.id; setActiveChip(v.id); renderTreeTable();
    });
    chipbar.appendChild(chip);
  });

  const tb = $("#tt-toolbar");
  tb.innerHTML = `
    <button id="btn-expandir" class="btn btn--sm"><i class="ti ti-chevrons-down"></i> Expandir tudo</button>
    <button id="btn-recolher" class="btn btn--sm"><i class="ti ti-chevrons-up"></i> Recolher tudo</button>
    <button id="btn-compacto" class="btn btn--sm"><i class="ti ti-layout-collage"></i> Modo compacto</button>`;
  $("#btn-expandir").addEventListener("click", expandAllRows);
  $("#btn-recolher").addEventListener("click", collapseAllRows);
  $("#btn-compacto").addEventListener("click", ()=>{ state.compact=!state.compact; $("#table-section")?.classList.toggle("is-compact", state.compact); });

  renderAppliedFilters();
}
function setActiveChip(viewId){ $$("#chipbar .chip").forEach(c=> c.classList.toggle("is-active", c.dataset.view===viewId)); }

/* ===== “Filtros aplicados” (chips acima da tabela) ===== */
function renderAppliedFilters(){
  const bar = $("#applied-bar"); if(!bar) return;
  const vals = getFilterValues();
  const items = [];

  const push = (k, v, id, resetFn) => {
    const chip = document.createElement("div");
    chip.className = "applied-chip";
    chip.innerHTML = `<span class="k">${k}</span><span class="v">${v}</span><button title="Limpar" class="applied-x" aria-label="Remover ${k}"><i class="ti ti-x"></i></button>`;
    chip.querySelector("button").addEventListener("click", ()=>{ resetFn?.(); applyFiltersAndRender(); renderAppliedFilters(); state._dataset && renderFamilias(state._dataset.sections, state._dataset.summary); if(state.activeView==="ranking") renderRanking(); });
    items.push(chip);
  };

  bar.innerHTML = "";

  if(vals.segmento && vals.segmento!=="Todos") push("Segmento", vals.segmento, "f-segmento", ()=> $("#f-segmento").selectedIndex=0);
  if(vals.diretoria && vals.diretoria!=="Todas") push("Diretoria", vals.diretoria, "f-diretoria", ()=> $("#f-diretoria").selectedIndex=0);
  if(vals.gerencia && vals.gerencia!=="Todas") push("Gerência", vals.gerencia, "f-gerencia", ()=> $("#f-gerencia").selectedIndex=0);
  if(vals.agencia && vals.agencia!=="Todas") push("Agência", vals.agencia, "f-agencia", ()=> $("#f-agencia").selectedIndex=0);
  if(vals.ggestao && vals.ggestao!=="Todos") push("Gerente de gestão", vals.ggestao, "f-ggestao", ()=> $("#f-ggestao").selectedIndex=0);
  if(vals.gerente && vals.gerente!=="Todos") push("Gerente", vals.gerente, "f-gerente", ()=> $("#f-gerente").selectedIndex=0);
  if(vals.produtoId && vals.produtoId!=="Todas") push("Produto", $("#f-familia")?.selectedOptions?.[0]?.text || vals.produtoId, "f-familia", ()=> $("#f-familia").selectedIndex=0);
  if(vals.subproduto) push("Subproduto", vals.subproduto, "f-subproduto", ()=> $("#f-subproduto").selectedIndex=0);
  if(vals.status && vals.status!=="todos") push("Status", vals.status==="atingidos"?"Atingidos":"Não atingidos", "f-status-kpi", ()=> $("#f-status-kpi").selectedIndex=0);
  if(vals.contrato) push("Contrato", vals.contrato, "f-contrato", ()=> $("#f-contrato").value="");

  items.forEach(ch => bar.appendChild(ch));
}

/* ===== Filtros superiores ===== */
function ensureSegmentoField(){
  if($("#f-segmento")) return;
  const filters = $(".filters");
  if(!filters) return;
  const actions = filters.querySelector(".filters__actions");
  const wrap = document.createElement("div");
  wrap.className = "filters__group";
  wrap.innerHTML = `<label>Segmento</label><select id="f-segmento" class="input"></select>`;
  filters.insertBefore(wrap, actions);
}
function getFilterValues(){
  const val = (sel) => $(sel)?.value || "";
  return {
    segmento: val("#f-segmento"),
    diretoria: val("#f-diretoria"),
    gerencia:  val("#f-gerencia"),
    agencia:   val("#f-agencia"),
    ggestao:   val("#f-ggestao"),
    gerente:   val("#f-gerente"),
    produtoId: val("#f-familia"),
    subproduto: val("#f-subproduto"),
    status:    val("#f-status-kpi"),
    contrato: ($("#f-contrato")?.value || "").trim()
  };
}

/* ===== Filtro “normal” (cards/tabela) ===== */
function filterRows(rows){
  return filterRowsExcept(rows, {}); // usa a versão genérica sem exclusões
}

/* ===== Filtro “custom” para ranking (ignora a dimensão do nível) ===== */
function filterRowsExcept(rows, except){
  const f = getFilterValues();
  const startISO = state.period.start, endISO = state.period.end;

  return rows.filter(r=>{
    const okSeg = (f.segmento==="Todos" || f.segmento==="" || r.segmento===f.segmento);
    const okDR  = (except.diretoria) || (f.diretoria === "Todas" || f.diretoria === "" || r.diretoria === f.diretoria);
    const okGR  = (except.gerencia)  || (f.gerencia  === "Todas" || f.gerencia  === "" || r.gerenciaRegional === f.gerencia);
    const okAg  = (except.agencia)   || (f.agencia   === "Todas" || f.agencia   === "" || r.agencia === f.agencia);
    const okGG  = (f.ggestao   === "Todos" || f.ggestao   === "" || r.gerenteGestao === f.ggestao);
    const okGer = (except.gerente)   || (f.gerente   === "Todos" || f.gerente   === "" || r.gerente === f.gerente);
    const okProd= (f.produtoId === "Todas" || f.produtoId === "" || r.produtoId === f.produtoId);
    const okSub = (!f.subproduto || (r.subproduto || "") === f.subproduto);
    const okCt  = (!f.contrato || (r._contracts?.some(c => c.id.includes(f.contrato))));
    const okDt  = (!startISO || r.data >= startISO) && (!endISO || r.data <= endISO);

    const ating = r.meta ? (r.realizado/r.meta) : 0;
    const okStatus = (f.status==="todos") ? true : (f.status==="atingidos" ? (ating >= 1) : (ating < 1));

    return okSeg && okDR && okGR && okAg && okGG && okGer && okProd && okSub && okCt && okDt && okStatus;
  });
}
function autoSnapViewToFilters(){
  const f = getFilterValues();
  let snap = null;
  if(f.produtoId && f.produtoId !== "Todas") snap = "prodsub";
  else if(f.gerente && f.gerente !== "Todos") snap = "gerente";
  else if(f.gerencia && f.gerencia !== "Todas") snap = "gerencia";
  else if(f.diretoria && f.diretoria !== "Todas") snap = "diretoria";
  if(snap && state.tableView !== snap){ state.tableView = snap; setActiveChip(snap); }
}

/* ===== Árvore da tabela ===== */
function ensureContracts(r){
  if(r._contracts) return r._contracts;
  const n=2+Math.floor(Math.random()*3), arr=[];
  for(let i=0;i<n;i++){
    const id=`CT-${new Date().getFullYear()}-${String(Math.floor(1e6+Math.random()*9e6)).padStart(7,"0")}`;
    const valor=Math.round((r.realizado/n)*(0.6+Math.random()*0.9)),
          meta=Math.round((r.meta/n)*(0.6+Math.random()*0.9));
    const sp=r.subproduto||r.produto;
    arr.push({id, produto:r.produto, subproduto:r.subproduto||"", prodOrSub:sp, qtd:1, realizado:valor, meta, ating:meta?(valor/meta):0, data:r.data, tipo:Math.random()>.5?"Venda direta":"Digital"});
  }
  r._contracts=arr; return arr;
}
function buildTree(list, startKey){
  const keyMap = { diretoria:"diretoria", gerencia:"gerenciaRegional", agencia:"agencia", gGestao:"gerenteGestao", gerente:"gerente", familia:"familia", prodsub:"prodOrSub", produto:"prodOrSub" };
  const NEXT = { diretoria:"gerencia", gerencia:"agencia", agencia:"gGestao", gGestao:"gerente", gerente:"prodsub", familia:"contrato", prodsub:"contrato" };

  function group(arr, key){
    const m=new Map();
    arr.forEach(r=>{ const k=r[key] || "—"; const a=m.get(k)||[]; a.push(r); m.set(k,a); });
    return [...m.entries()];
  }
  function agg(arr){
    const realizado=arr.reduce((a,b)=>a+(b.realizado||0),0),
          meta=arr.reduce((a,b)=>a+(b.meta||0),0),
          qtd=arr.reduce((a,b)=>a+(b.qtd||0),0),
          data=arr.reduce((mx,b)=> b.data>mx?b.data:mx, "0000-00-00");
    return { realizado, meta, qtd, ating: meta? realizado/meta : 0, data };
  }

  function buildLevel(arr, levelKey, level){
    if(levelKey==="contrato"){
      return arr.flatMap(r => ensureContracts(r).map(c => ({
        type:"contrato", level, label:c.id, realizado:c.realizado, meta:c.meta, qtd:c.qtd, ating:c.ating, data:c.data,
        breadcrumb:[c.prodOrSub, r.gerente, r.gerenteGestao, r.agencia, r.gerenciaRegional, r.diretoria].filter(Boolean),
        children:[]
      })));
    }

    const mapKey = keyMap[levelKey] || levelKey;
    return group(arr, mapKey).map(([k, subset])=>{
      const a=agg(subset), next=NEXT[levelKey];
      return {
        type:"grupo", level, label:k, realizado:a.realizado, meta:a.meta, qtd:a.qtd, ating:a.ating, data:a.data,
        breadcrumb:[k], children: next? buildLevel(subset, next, level+1):[]
      };
    });
  }
  return buildLevel(list, startKey, 0);
}

/* ===== UI ===== */
function initCombos(){
  ensureSegmentoField();

  const fill = (sel, arr)=>{ const el=$(sel); if(!el) return; el.innerHTML=""; arr.forEach(v=>{ const o=document.createElement("option"); o.value=v.value; o.textContent=v.label; el.appendChild(o); }); };

  // VISÍVEIS: Segmento, Diretoria, Gerência
  fill("#f-segmento", [{value:"Todos",label:"Todos"},{value:"Empresas",label:"Empresas"},{value:"Negócios",label:"Negócios"},{value:"MEI",label:"MEI"}]);
  fill("#f-diretoria", [{value:"Todas",label:"Todas"},{value:"DR 01",label:"DR 01"},{value:"DR 02",label:"DR 02"},{value:"DR 03",label:"DR 03"}]);
  fill("#f-gerencia",  [{value:"Todas",label:"Todas"},{value:"GR 01",label:"GR 01"},{value:"GR 02",label:"GR 02"},{value:"GR 03",label:"GR 03"},{value:"GR 04",label:"GR 04"}]);

  // Avançado
  fill("#f-agencia",   [{value:"Todas",label:"Todas"},{value:"Ag 1001",label:"Ag 1001"},{value:"Ag 1002",label:"Ag 1002"},{value:"Ag 1003",label:"Ag 1003"},{value:"Ag 1004",label:"Ag 1004"}]);
  fill("#f-ggestao",   [{value:"Todos",label:"Todos"},{value:"GG 01",label:"GG 01"},{value:"GG 02",label:"GG 02"},{value:"GG 03",label:"GG 03"}]);
  fill("#f-gerente",   [{value:"Todos",label:"Todos"},{value:"Gerente 1",label:"Gerente 1"},{value:"Gerente 2",label:"Gerente 2"},{value:"Gerente 3",label:"Gerente 3"},{value:"Gerente 4",label:"Gerente 4"},{value:"Gerente 5",label:"Gerente 5"}]);

  // #f-familia = TODOS OS CARDS
  const products = [{value:"Todas",label:"Todas"}].concat(
    [...PRODUCT_INDEX.entries()].map(([id,meta]) => ({ value:id, label: meta.name }))
  );
  fill("#f-familia", products);

  const produtosExemplo = [{value:"Todos",label:"Todos"},{value:"CDC",label:"CDC"},{value:"Cheque Especial",label:"Cheque Especial"},{value:"CDB",label:"CDB"},{value:"Seguro Vida",label:"Seguro Vida"}];
  fill("#f-produto", produtosExemplo);
}
function bindEvents(){
  $("#btn-consultar")?.addEventListener("click", ()=>{
    autoSnapViewToFilters();
    applyFiltersAndRender();
    if(state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
    renderAppliedFilters();
  });

  $("#btn-abrir-filtros")?.addEventListener("click", () => {
    const adv = $("#advanced-filters");
    const isOpen = adv.classList.toggle("is-open");
    adv.setAttribute("aria-hidden", String(!isOpen));
    $("#btn-abrir-filtros").setAttribute("aria-expanded", String(isOpen));
    $("#btn-abrir-filtros").innerHTML = isOpen
      ? `<i class="ti ti-chevron-up"></i> Fechar filtros`
      : `<i class="ti ti-chevron-down"></i> Abrir filtros`;
    if(isOpen) ensureStatusFilterInAdvanced();
  });

  ensureRankingTab();

  $$(".tab").forEach(t=>{
    t.addEventListener("click", ()=>{
      if(t.classList.contains("is-active")) return;
      $$(".tab").forEach(x=>x.classList.remove("is-active"));
      t.classList.add("is-active");
      const view = t.dataset.view;
      if(view==="table"){ switchView("table"); }
      else if(view==="ranking"){ switchView("ranking"); }
      else { switchView("cards"); }
    });
  });

  // filtros — reflete em cards, tabela e ranking
  ["#f-segmento","#f-diretoria","#f-gerencia","#f-agencia","#f-ggestao","#f-gerente","#f-familia","#f-subproduto","#f-status-kpi","#f-contrato"].forEach(sel=>{
    $(sel)?.addEventListener("change", ()=>{
      autoSnapViewToFilters();
      applyFiltersAndRender();
      if(state._dataset) renderFamilias(state._dataset.sections, state._dataset.summary);
      renderAppliedFilters();
      if(state.activeView==="ranking") renderRanking();
    });
  });
  $("#f-contrato")?.addEventListener("input", ()=>{ applyFiltersAndRender(); renderAppliedFilters(); if(state.activeView==="ranking") renderRanking(); });

  // remover Exportar CSV (não pode)
  $("#btn-export")?.remove();
}

/* Apenas 3 filtros aparentes: Segmento, Diretoria, Gerência */
function reorderFiltersUI(){
  const area = $(".filters"); if(!area) return;
  const adv = $("#advanced-filters .adv__grid") || $("#advanced-filters");

  const groupOf = (sel)=>$(sel)?.closest?.(".filters__group") || null;

  const gSeg = groupOf("#f-segmento");
  const gDR  = groupOf("#f-diretoria");
  const gGR  = groupOf("#f-gerencia");
  const gAg  = groupOf("#f-agencia");
  const gGG  = groupOf("#f-ggestao");
  const gGer = groupOf("#f-gerente");
  const gFam = groupOf("#f-familia");
  const gProd= groupOf("#f-produto");
  const gStatus = groupOf("#f-status-kpi");
  const gSubp = groupOf("#f-subproduto");
  const gCt   = groupOf("#f-contrato");

  const actions = area.querySelector(".filters__actions") || area.lastElementChild;

  [gSeg,gDR,gGR].filter(Boolean).forEach(el=> area.insertBefore(el, actions));
  [gAg,gGG,gGer,gFam,gProd,gStatus,gSubp,gCt].filter(Boolean).forEach(el=> adv?.appendChild(el));

  // remover bloco legado de período, se existir
  const gStart = $("#f-inicio")?.closest(".filters__group"); if(gStart) gStart.remove();
}

/* ===== Troca de view ===== */
function switchView(next){
  const views = { cards:"#view-cards", table:"#view-table", ranking:"#view-ranking" };
  if(next==="ranking" && !$("#view-ranking")) createRankingView();

  Object.values(views).forEach(sel => $(sel)?.classList.add("hidden"));

  if(next === "table" && !state.tableRendered){
    ensureChipBarAndToolbar();
    autoSnapViewToFilters();
    renderTreeTable();
    state.tableRendered = true;
  }
  if(next === "ranking"){ renderRanking(); }

  const el = $(views[next]) || $("#view-cards");
  el.classList.remove("hidden");
  state.activeView = next;
}

/* ===== Resumo (Indicadores / Pontos) ===== */
function renderResumoKPI(summary, visibleItemsHitCount, visiblePointsHit){
  let kpi = $("#kpi-summary");
  if(!kpi){
    kpi = document.createElement("div");
    kpi.id = "kpi-summary";
    kpi.className = "kpi-summary";
    $("#grid-familias").prepend(kpi);
  }
  const pctInd = summary.indicadoresTotal ? (visibleItemsHitCount/summary.indicadoresTotal) : summary.indicadoresPct;
  const pctPts = summary.pontosPossiveis ? (visiblePointsHit/summary.pontosPossiveis) : summary.pontosPct;

  kpi.innerHTML = `
    <div class="kpi-pill">
      <div class="kpi-pill__icon"><i class="ti ti-list-check"></i></div>
      <div>
        <div class="kpi-pill__title">Indicadores</div>
        <div class="kpi-pill__meta">
          Total: <strong>${fmtINT.format(summary.indicadoresTotal)}</strong> •
          Atingidos: <strong>${fmtINT.format(visibleItemsHitCount)}</strong> •
          Atingimento: <strong>${(pctInd*100).toFixed(1)}%</strong>
        </div>
      </div>
    </div>
    <div class="kpi-pill">
      <div class="kpi-pill__icon"><i class="ti ti-medal"></i></div>
      <div>
        <div class="kpi-pill__title">Pontos</div>
        <div class="kpi-pill__meta">
          Possíveis: <strong>${fmtINT.format(summary.pontosPossiveis)}</strong> •
          Atingidos: <strong>${fmtINT.format(visiblePointsHit)}</strong> •
          Atingimento: <strong>${(pctPts*100).toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  `;
}

/* ===== Tooltip dos cards ===== */
function buildCardTooltipHTML(item){
  const start = state.period.start, end = state.period.end;
  const diasTotais     = businessDaysBetweenInclusive(start, end);
  const diasRestantes  = businessDaysRemainingFromToday(start, end);
  const diasDecorridos = Math.max(0, diasTotais - diasRestantes);

  let meta = item.meta, realizado = item.realizado;
  if(item.metric === "perc"){ meta = 100; }
  const faltaTotal       = Math.max(0, meta - realizado);
  const necessarioPorDia = diasRestantes > 0 ? (faltaTotal / diasRestantes) : 0;
  const mediaDiaria      = diasDecorridos > 0 ? (realizado / diasDecorridos) : 0;
  const forecast         = mediaDiaria * diasTotais;

  const fmt = (m,v)=> m==="perc" ? `${v.toFixed(1)}%` : (m==="qtd" ? fmtINT.format(Math.round(v)) : fmtBRL.format(Math.round(v)));

  return `
    <div class="kpi-tip" role="dialog" aria-label="Detalhes do indicador">
      <h5>Projeção e metas</h5>
      <div class="row"><span>Dias úteis que faltam</span><span>${fmtINT.format(diasRestantes)}</span></div>
      <div class="row"><span>Falta para meta</span><span>${fmt(item.metric, faltaTotal)}</span></div>
      <div class="row"><span>Necessário por dia</span><span>${fmt(item.metric, necessarioPorDia)}</span></div>
      <div class="row"><span>Média diária atual</span><span>${fmt(item.metric, mediaDiaria)}</span></div>
      <div class="row"><span>Forecast (ritmo atual)</span><span>${fmt(item.metric, forecast)}</span></div>
    </div>
  `;
}
function positionTip(badge, tip){
  const card = badge.closest(".prod-card"); if(!card) return;
  const b = badge.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;

  let top = (b.bottom - c.top) + 8;
  if (b.bottom + th + 12 > vh) top = (b.top - c.top) - th - 8;

  let left = c.width - tw - 12;
  const absLeft = c.left + left;
  if (absLeft < 12) left = 12;
  if (absLeft + tw > vw - 12) left = Math.max(12, vw - 12 - c.left - tw);

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}
function closeAllTips(){
  $$(".kpi-tip.is-open").forEach(t=>{ t.classList.remove("is-open"); t.style.left=""; t.style.top=""; });
  $$(".prod-card.is-tip-open").forEach(c=>c.classList.remove("is-tip-open"));
}
function bindBadgeTooltip(card){
  const tip = card.querySelector(".kpi-tip");
  const badge = card.querySelector(".badge");
  if(!tip || !badge) return;

  const open = ()=>{
    closeAllTips();
    tip.classList.add("is-open");
    card.classList.add("is-tip-open");
    positionTip(badge, tip);
  };
  const close = ()=>{
    tip.classList.remove("is-open");
    card.classList.remove("is-tip-open");
    tip.style.left=""; tip.style.top="";
  };

  badge.addEventListener("mouseenter", open);
  card.addEventListener("mouseleave", close);
  badge.addEventListener("click",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); });
  badge.addEventListener("touchstart",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); }, {passive:true});

  document.addEventListener("click",(e)=>{ if(!card.contains(e.target)) close(); });
  document.addEventListener("touchstart",(e)=>{ if(!card.contains(e.target)) close(); }, {passive:true});
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") close(); });
  document.addEventListener("scroll", close, true);

  window.addEventListener("resize",()=>{ if(tip.classList.contains("is-open")) positionTip(badge, tip); });
}

/* ===== Cards por seção ===== */
function getStatusFilter(){ return $("#f-status-kpi")?.value || "todos"; }
function renderFamilias(sections, summary){
  const host = $("#grid-familias");
  host.innerHTML = "";
  host.style.display = "block";
  host.style.gap = "0";

  const status = getStatusFilter();
  const produtoFilterId = $("#f-familia")?.value || "Todas";

  let atingidosVisiveis = 0;
  let pontosAtingidosVisiveis = 0;

  // KPIs topo
  const kpiHolder = document.createElement("div");
  kpiHolder.id = "kpi-summary";
  kpiHolder.className = "kpi-summary";
  host.appendChild(kpiHolder);

  sections.forEach(sec=>{
    if(produtoFilterId !== "Todas"){
      const secOfProduct = PRODUCT_INDEX.get(produtoFilterId)?.sectionId;
      if(sec.id !== secOfProduct) return;
    }

    const itemsFiltered = sec.items.filter(it=>{
      const okStatus = status === "atingidos" ? it.atingido : (status === "nao" ? !it.atingido : true);
      const okProduto = (produtoFilterId === "Todas" || it.id === produtoFilterId);
      return okStatus && okProduto;
    });
    if(!itemsFiltered.length) return;

    const sectionTotalPoints = sec.items.reduce((acc,i)=> acc + (i.peso||0), 0);
    const sectionPointsHit   = sec.items.filter(i=> i.atingido).reduce((acc,i)=> acc + (i.peso||0), 0);

    const sectionEl = document.createElement("section");
    sectionEl.className = "fam-section";
    sectionEl.id = `sec-${sec.id}`;
    sectionEl.innerHTML = `
      <header class="fam-section__header">
        <div class="fam-section__title"><span>${sec.label}</span></div>
        <small class="fam-section__meta">pontos: ${fmtINT.format(sectionPointsHit)}/${fmtINT.format(sectionTotalPoints)}</small>
      </header>
      <div class="fam-section__grid"></div>
    `;
    const grid = sectionEl.querySelector(".fam-section__grid");

    itemsFiltered.forEach(f=>{
      if(f.atingido){ atingidosVisiveis += 1; pontosAtingidosVisiveis += (f.peso||0); }
      const pct = (f.ating*100);
      const badgeClass = pct < 50 ? "badge--low" : (pct < 100 ? "badge--warn" : "badge--ok");
      const badgeTxt = `${pct.toFixed(1)}%`;

      grid.insertAdjacentHTML("beforeend", `
        <article class="prod-card" tabindex="0" data-prod-id="${f.id}">
          <div class="prod-card__title">
            <i class="${f.icon}"></i>
            <span class="prod-card__name">${f.nome}</span>
            <span class="badge ${badgeClass}" aria-label="Atingimento">${badgeTxt}</span>
          </div>

          <div class="prod-card__meta">
            <span class="pill">Pontos: ${fmtINT.format(f.peso)}/${fmtINT.format(sectionTotalPoints)}</span>
            <span class="pill">Peso: ${fmtINT.format(f.peso)}</span>
            <span class="pill">${f.metric === "valor" ? "Valor" : f.metric === "qtd" ? "Quantidade" : "Percentual"}</span>
          </div>

          <div class="prod-card__kpis">
            <div class="kv"><small>Realizado</small><strong>${formatByMetric(f.metric, f.realizado)}</strong></div>
            <div class="kv"><small>Meta</small><strong>${formatByMetric(f.metric, f.meta)}</strong></div>
          </div>

          <div class="prod-card__foot">Atualizado em ${f.ultimaAtualizacao}</div>
          ${buildCardTooltipHTML(f)}
        </article>
      `);
    });

    host.appendChild(sectionEl);
  });

  renderResumoKPI(summary, atingidosVisiveis, pontosAtingidosVisiveis);

  $$(".prod-card").forEach(card=>{
    const tip = card.querySelector(".kpi-tip");
    const badge = card.querySelector(".badge");
    if(badge && tip) bindBadgeTooltip(card);

    card.addEventListener("click", (ev)=>{
      if(ev.target?.classList.contains("badge")) return;
      const prodId = card.getAttribute("data-prod-id");

      const sel = $("#f-familia");
      if(sel){
        let opt = Array.from(sel.options).find(o=>o.value===prodId);
        if(!opt){
          const meta = PRODUCT_INDEX.get(prodId);
          opt = new Option(meta?.name || prodId, prodId);
          sel.appendChild(opt);
        }
        sel.value = prodId;
      }

      state.tableView = "prodsub";
      setActiveChip("prodsub");
      const tabDet = document.querySelector('.tab[data-view="table"]');
      if(tabDet && !tabDet.classList.contains("is-active")) tabDet.click(); else switchView("table");
      applyFiltersAndRender();
      renderAppliedFilters();
    });
  });
}

/* ===== TABELA ===== */
function ensureRankingTab(){
  const tabs = $(".tabs"); if(!tabs) return;
  if(!tabs.querySelector('.tab[data-view="ranking"]')){
    const b = document.createElement("button");
    b.className="tab"; b.dataset.view="ranking"; b.textContent="Ranking";
    tabs.insertBefore(b, tabs.querySelector(".tabs__aside"));
  }
}
function createRankingView(){
  const main = $(".container"); if(!main) return;
  const section = document.createElement("section");
  section.id="view-ranking"; section.className="hidden view-panel";
  section.innerHTML = `
    <section class="card card--ranking">
      <header class="card__header">
        <h3>Ranking</h3>
        <div class="rk-controls">
          <div class="segmented" role="tablist" aria-label="Período">
            <button class="seg-btn is-active" data-mode="mensal">Mensal</button>
            <button class="seg-btn" data-mode="acumulado">Acumulado</button>
          </div>
        </div>
      </header>

      <div class="rk-summary" id="rk-summary"></div>
      <div id="rk-table"></div>
    </section>
  `;
  main.appendChild(section);

  // binds
  $$("#view-ranking .seg-btn").forEach(b=>{
    b.addEventListener("click", ()=>{
      $$("#view-ranking .seg-btn").forEach(x=>x.classList.remove("is-active"));
      b.classList.add("is-active");
      state.rk.mode = b.dataset.mode;
      renderRanking();
    });
  });
}

/* ===== Render da tabela (tree) ===== */
function renderTreeTable(){
  ensureChipBarAndToolbar();

  const def = TABLE_VIEWS.find(v=> v.id === state.tableView) || TABLE_VIEWS[0];
  const rowsFiltered = filterRows(state._rankingRaw);
  const nodes = buildTree(rowsFiltered, def.id);

  const host = $("#gridRanking"); if(!host) return;
  host.innerHTML = "";

  const table = document.createElement("table");
  table.className = "tree-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>${def.label}</th>
        <th>Quantidade</th>
        <th>Realizado (R$)</th>
        <th>Meta (R$)</th>
        <th>Defasagem (R$)</th>
        <th>Atingimento</th>
        <th>Data</th>
        <th class="col-actions">Ações</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");
  host.appendChild(table);

  if(state.compact) $("#table-section")?.classList.add("is-compact"); else $("#table-section")?.classList.remove("is-compact");

  let seq=0; const mkId=()=>`n${++seq}`;
  const att=(p)=>{const pct=(p*100);const cls=pct<50?"att-low":(pct<100?"att-warn":"att-ok");return `<span class="att-badge ${cls}">${pct.toFixed(1)}%</span>`}
  const defas=(real,meta)=>{ const d = (real||0)-(meta||0); const cls=d>=0?"def-pos":"def-neg"; return `<span class="def-badge ${cls}">${fmtBRL.format(d)}</span>` }

  function renderNode(node, parentId=null, parentTrail=[]){
    const id=mkId(), has=!!(node.children&&node.children.length);
    const tr=document.createElement("tr");
    tr.className=`tree-row ${node.type==="contrato"?"type-contrato":""} lvl-${node.level}`;
    tr.dataset.id=id; if(parentId) tr.dataset.parent=parentId;
    const trail=[...parentTrail, node.label];

    tr.innerHTML=`
      <td><div class="tree-cell">
        <button class="toggle" ${has?"":"disabled"} aria-label="${has?"Expandir/colapsar":""}"><i class="ti ${has?"ti-chevron-right":"ti-dot"}"></i></button>
        <span class="label-strong">${node.label}</span></div></td>
      <td>${fmtINT.format(node.qtd||0)}</td>
      <td>${fmtBRL.format(node.realizado||0)}</td>
      <td>${fmtBRL.format(node.meta||0)}</td>
      <td>${defas(node.realizado,node.meta)}</td>
      <td>${att(node.ating||0)}</td>
      <td>${formatBRDate(node.data||"")}</td>
      <td class="actions-cell">
        <span class="actions-group">
          <button class="icon-btn" title="Abrir chamado"><i class="ti ti-ticket"></i></button>
          <button class="icon-btn" title="Copiar referência"><i class="ti ti-copy"></i></button>
        </span>
      </td>`;

    const [btnTicket, btnCopy] = tr.querySelectorAll(".icon-btn");
    btnTicket?.addEventListener("click",(ev)=>{ ev.stopPropagation(); window.open(TICKET_URL,"_blank"); });
    btnCopy?.addEventListener("click",(ev)=>{
      ev.stopPropagation();
      const text = trail.join(" > ");
      navigator.clipboard?.writeText(text);
      btnCopy.innerHTML = '<i class="ti ti-check"></i>'; setTimeout(()=> btnCopy.innerHTML = '<i class="ti ti-copy"></i>', 900);
    });

    const btn=tr.querySelector(".toggle");
    if(btn && has){
      btn.addEventListener("click", ()=>{
        const isOpen=btn.dataset.open==="1";
        btn.dataset.open=isOpen?"0":"1";
        btn.querySelector("i").className=`ti ${isOpen?"ti-chevron-right":"ti-chevron-down"}`;
        toggleChildren(id, !isOpen);
      });
    }

    tbody.appendChild(tr);
    if(has){
      node.children.forEach(ch=>renderNode(ch, id, trail));
      toggleChildren(id, false);
    }
  }

  function toggleChildren(parentId, show){
    const kids=[...tbody.querySelectorAll(`tr[data-parent="${parentId}"]`)];
    kids.forEach(ch=>{
      ch.style.display=show?"table-row":"none";
      if(!show){
        const b=ch.querySelector(".toggle[data-open='1']");
        if(b){ b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"; }
        toggleChildren(ch.dataset.id,false);
      }
    });
  }

  nodes.forEach(n=>renderNode(n,null,[]));
}
function applyFiltersAndRender(){ if(state.tableRendered) renderTreeTable(); }
function expandAllRows(){
  const tb=$("#gridRanking tbody"); if(!tb) return;
  tb.querySelectorAll("tr").forEach(tr=>{
    const b=tr.querySelector("i.ti-chevron-right")?.parentElement;
    if(b && !b.disabled){ b.dataset.open="1"; b.querySelector("i").className="ti ti-chevron-down"; }
    if(tr.dataset.parent) tr.style.display="table-row";
  });
}
function collapseAllRows(){
  const tb=$("#gridRanking tbody"); if(!tb) return;
  tb.querySelectorAll("tr").forEach(tr=>{
    const b=tr.querySelector("i.ti-chevron-down")?.parentElement || tr.querySelector(".toggle");
    if(b && !b.disabled){ b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"; }
    if(tr.dataset.parent) tr.style.display="none";
  });
}

/* ===== RANKING ===== */
function currentUnitForLevel(level){
  const f=getFilterValues();
  switch(level){
    case "gerente":  return f.gerente && f.gerente!=="Todos" ? f.gerente : "";
    case "agencia":  return f.agencia && f.agencia!=="Todas" ? f.agencia : "";
    case "gerencia": return f.gerencia && f.gerencia!=="Todas" ? f.gerencia : "";
    case "diretoria":return f.diretoria && f.diretoria!=="Todas" ? f.diretoria : "";
    default: return "";
  }
}
function rkGroupCount(level){
  if(level==="diretoria") return 4;
  if(level==="gerencia")  return 8;
  if(level==="agencia")   return 15;
  return 12; // gerente
}
function deriveRankingLevelFromFilters(){
  const f = getFilterValues();
  if(f.gerente && f.gerente!=="Todos")   return "gerente";
  if(f.agencia && f.agencia!=="Todas")   return "agencia";
  if(f.gerencia && f.gerencia!=="Todas") return "gerencia";
  if(f.diretoria && f.diretoria!=="Todas") return "diretoria";
  return "agencia"; // default saudável
}
function aggRanking(rows, level){
  const keyMap = { diretoria:"diretoria", gerencia:"gerenciaRegional", agencia:"agencia", gerente:"gerente" };
  const k = keyMap[level] || "agencia";
  const map = new Map();
  rows.forEach(r=>{
    const key=r[k] || "—";
    const obj = map.get(key) || { unidade:key, real_mens:0, meta_mens:0, real_acum:0, meta_acum:0, qtd:0 };
    obj.real_mens += (r.real_mens ?? r.realizado ?? 0);
    obj.meta_mens += (r.meta_mens ?? r.meta ?? 0);
    obj.real_acum += (r.real_acum ?? r.realizado ?? 0);
    obj.meta_acum += (r.meta_acum ?? r.meta ?? 0);
    obj.qtd       += (r.qtd ?? 0);
    map.set(key,obj);
  });
  const list = [...map.values()].map(x=>{
    const ating_mens = x.meta_mens ? x.real_mens/x.meta_mens : 0;
    const ating_acum = x.meta_acum ? x.real_acum/x.meta_acum : 0;
    return { ...x, ating_mens, ating_acum, p_mens: ating_mens*100, p_acum: ating_acum*100 };
  });
  return list;
}
function renderRanking(){
  const hostSum = $("#rk-summary");
  const hostTbl = $("#rk-table");
  if(!hostSum || !hostTbl) return;

  const level = deriveRankingLevelFromFilters();
  state.rk.level = level;

  // para ranking: ignora o filtro da dimensão corrente para trazer os "pares"
  const except = { [level]: true };
  const rows = filterRowsExcept(state._rankingRaw, except);

  const data = aggRanking(rows, level);
  const modeKey = state.rk.mode === "acumulado" ? "p_acum" : "p_mens";
  data.sort((a,b)=> (b[modeKey] - a[modeKey]));

  const gruposLimite = rkGroupCount(level);
  const dataClamped = data.slice(0, gruposLimite);

  const myUnit = currentUnitForLevel(level);
  const myIndexFull = myUnit ? data.findIndex(d => d.unidade===myUnit) : -1;
  const myRankFull = myIndexFull>=0 ? (myIndexFull+1) : "—";

  hostSum.innerHTML = `
    <div class="rk-badges">
      <span class="rk-badge"><strong>Nível:</strong> ${level.charAt(0).toUpperCase()+level.slice(1)}</span>
      <span class="rk-badge"><strong>Limite do nível:</strong> ${fmtINT.format(gruposLimite)}</span>
      <span class="rk-badge"><strong>Exibindo:</strong> ${fmtINT.format(dataClamped.length)}</span>
      <span class="rk-badge"><strong>Sua posição:</strong> ${myRankFull}</span>
    </div>
  `;

  // tabela
  hostTbl.innerHTML = "";
  const tbl = document.createElement("table");
  tbl.className = "rk-table";
  tbl.innerHTML = `
    <thead>
      <tr>
        <th class="pos-col">#</th>
        <th class="unit-col">Unidade</th>
        <th>Pontos (mensal)</th>
        <th>Pontos (acumulado)</th>
        <th>Atingimento</th>
        <th>Realizado (R$)</th>
        <th>Meta (R$)</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tb = tbl.querySelector("tbody");

  dataClamped.forEach((r,idx)=>{
    const isMine = (myUnit && r.unidade === myUnit);
    const nome = isMine ? r.unidade : "••••••••••";
    const ating = state.rk.mode === "acumulado" ? r.ating_acum : r.ating_mens;
    const real  = state.rk.mode === "acumulado" ? r.real_acum : r.real_mens;
    const meta  = state.rk.mode === "acumulado" ? r.meta_acum : r.meta_mens;

    const tr = document.createElement("tr");
    tr.className = `rk-row ${isMine? "rk-row--mine":""}`;
    tr.innerHTML = `
      <td class="pos-col">${idx+1}</td>
      <td class="unit-col rk-name">${nome}</td>
      <td>${r.p_mens.toFixed(1)}</td>
      <td>${r.p_acum.toFixed(1)}</td>
      <td><span class="att-badge ${ating*100<50?"att-low":(ating*100<100?"att-warn":"att-ok")}">${(ating*100).toFixed(1)}%</span></td>
      <td>${fmtBRL.format(real)}</td>
      <td>${fmtBRL.format(meta)}</td>
    `;
    tb.appendChild(tr);
  });

  hostTbl.appendChild(tbl);
}

/* ===== Boot ===== */
async function refresh(){
  try{
    const dataset = await getData();
    state._dataset = dataset;
    state._rankingRaw = dataset.ranking;

    const right = $("#lbl-atualizacao");
    if(right){
      right.innerHTML = `
        <div class="period-inline">
          <span class="txt">
            Valores acumulados desde
            <strong><span id="lbl-periodo-inicio">${formatBRDate(state.period.start)}</span></strong>
            até
            <strong><span id="lbl-periodo-fim">${formatBRDate(state.period.end)}</span></strong>
          </span>
          <button id="btn-alterar-data" type="button" class="link-action">
            <i class="ti ti-chevron-down"></i> Alterar data
          </button>
        </div>`;
      $("#btn-alterar-data").addEventListener("click", (e)=> openDatePopover(e.currentTarget));
    }

    renderFamilias(dataset.sections, dataset.summary);
    reorderFiltersUI();
    renderAppliedFilters();
    if(state.tableRendered) renderTreeTable();
    if(state.activeView==="ranking") renderRanking();
  }catch(e){
    console.error(e);
    alert("Falha ao carregar dados.");
  }
}

(function(){
  injectStyles();
  initCombos();
  bindEvents();
  injectClearButton();
  ensureStatusFilterInAdvanced();
  reorderFiltersUI();
  refresh();
})();
