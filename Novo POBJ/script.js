/* ========= CONFIG ========= */
const DATA_SOURCE = "mock";
const API_URL = "/api";
const TICKET_URL = "https://botpj.com/index.php?class=LoginForm";

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);
const fmtBRL = new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const fmtINT = new Intl.NumberFormat("pt-BR");

/* ========= VIEWS ========= */
const TABLE_VIEWS = [
  { id:"diretoria", label:"Diretoria regional", key:"diretoria" },
  { id:"gerencia",  label:"Gerência regional",  key:"gerenciaRegional" },
  { id:"agencia",   label:"Agência",            key:"agencia" },
  { id:"gGestao",   label:"Gerente de gestão",  key:"gerenteGestao" },
  { id:"gerente",   label:"Gerente",            key:"gerente" },
  { id:"familia",   label:"Família (seção)",    key:"familia" },
  { id:"produto",   label:"Produto",            key:"produto" }
];

/* ========= CARDS ========= */
const CARD_SECTIONS_DEF = [
  { id:"financeiro", label:"FINANCEIRO", items:[
    { id:"rec_vencidos_59",     nome:"Recuperação de Vencidos até 59 dias",     icon:"ti ti-rotate-rectangle", peso:6, metric:"valor" },
    { id:"rec_vencidos_50mais", nome:"Recuperação de Vencidos acima de 50 dias", icon:"ti ti-rotate-rectangle", peso:5, metric:"valor" },
    { id:"rec_credito",         nome:"Recuperação de Crédito",                   icon:"ti ti-cash",             peso:5, metric:"valor" },
  ]},
  { id:"captacao", label:"CAPTAÇÃO", items:[
    { id:"captacao_bruta",   nome:"Captação Bruta",                       icon:"ti ti-pig-money",       peso:4, metric:"valor" },
    { id:"captacao_liquida", nome:"Captação Líquida",                     icon:"ti ti-arrows-exchange", peso:4, metric:"valor" },
    { id:"portab_prev",      nome:"Portabilidade de Previdência Privada", icon:"ti ti-shield-check",    peso:3, metric:"valor" },
    { id:"centralizacao",    nome:"Centralização de Caixa",               icon:"ti ti-briefcase",       peso:3, metric:"valor" },
  ]},
  { id:"credito", label:"CRÉDITO", items:[
    { id:"prod_credito_pj", nome:"Produção de Crédito PJ",          icon:"ti ti-building-bank", peso:8, metric:"valor" },
    { id:"rotativo_pj_vol", nome:"Limite Rotativo PJ (Volume)",     icon:"ti ti-wallet",        peso:3, metric:"valor" },
    { id:"rotativo_pj_qtd", nome:"Limite Rotativo PJ (Quantidade)", icon:"ti ti-list-numbers",  peso:3, metric:"qtd" },
  ]},
  { id:"ligadas", label:"LIGADAS", items:[
    { id:"cartoes",    nome:"Cartões",    icon:"ti ti-credit-card",   peso:4, metric:"perc" },
    { id:"consorcios", nome:"Consórcios", icon:"ti ti-building-bank", peso:3, metric:"perc" },
    { id:"seguros",    nome:"Seguros",    icon:"ti ti-shield-lock",   peso:5, metric:"perc" },
  ]},
  { id:"produtividade", label:"PRODUTIVIDADE", items:[
    { id:"sucesso_equipe_credito", nome:"Sucesso de Equipe Crédito", icon:"ti ti-activity", peso:10, metric:"perc" },
  ]},
  { id:"clientes", label:"CLIENTES", items:[
    { id:"conquista_qualif_pj", nome:"Conquista Qualificada Gerenciado PJ", icon:"ti ti-user-star",   peso:3, metric:"qtd" },
    { id:"conquista_folha",     nome:"Conquista Clientes Folha de Pagamento", icon:"ti ti-users-group", peso:3, metric:"qtd" },
    { id:"bradesco_expresso",   nome:"Bradesco Expresso",                    icon:"ti ti-bolt",        peso:2, metric:"perc" },
  ]},
];

/* Índice produto → meta */
const PRODUCT_INDEX = (()=>{
  const m = new Map();
  CARD_SECTIONS_DEF.forEach(sec=>sec.items.forEach(it=>m.set(it.id,{sectionId:sec.id,name:it.nome,icon:it.icon,metric:it.metric,peso:it.peso})));
  return m;
})();

/* ========= DATAS ========= */
function firstDayOfMonthISO(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`}
function todayISO(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function formatBRDate(iso){if(!iso)return"";const [y,m,day]=iso.split("-");return `${day}/${m}/${y}`}
function dateUTCFromISO(iso){const [y,m,d]=iso.split("-").map(Number);return new Date(Date.UTC(y,m-1,d))}
function isoFromUTCDate(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`}
function businessDaysBetweenInclusive(startISO,endISO){
  if(!startISO||!endISO) return 0;
  let s=dateUTCFromISO(startISO), e=dateUTCFromISO(endISO); if(s>e) return 0;
  let c=0; for(let d=new Date(s); d<=e; d.setUTCDate(d.getUTCDate()+1)){const w=d.getUTCDay(); if(w!==0&&w!==6) c++} return c;
}
function businessDaysRemainingFromToday(startISO,endISO){
  if(!startISO||!endISO) return 0;
  const today=todayISO(); let t=dateUTCFromISO(today), s=dateUTCFromISO(startISO), e=dateUTCFromISO(endISO);
  if(t>=e) return 0; let start=new Date(t); start.setUTCDate(start.getUTCDate()+1); if(start<s) start=s;
  return businessDaysBetweenInclusive(isoFromUTCDate(start),endISO);
}

/* ========= MÉTRICAS ========= */
function formatByMetric(metric,v){if(metric==="perc")return `${Number(v).toFixed(1)}%`; if(metric==="qtd")return fmtINT.format(Math.round(v)); return fmtBRL.format(Math.round(v))}
function makeRandomForMetric(metric){
  if(metric==="perc"){const meta=100, realizado=Math.round(45+Math.random()*75);return{meta,realizado}}
  if(metric==="qtd"){const meta=Math.round(1_000+Math.random()*19_000);const realizado=Math.round(meta*(0.75+Math.random()*0.6));return{meta,realizado}}
  const meta=Math.round(4_000_000+Math.random()*16_000_000), realizado=Math.round(meta*(0.75+Math.random()*0.6)); return{meta,realizado}
}

/* ========= MOCK ========= */
async function getData(){
  const hoje=new Date();
  const sections = CARD_SECTIONS_DEF.map(sec=>{
    const items = sec.items.map(it=>{
      const { meta, realizado } = makeRandomForMetric(it.metric);
      const ating = it.metric==="perc" ? (realizado/100) : (meta? realizado/meta : 0);
      return { ...it, meta, realizado, ating, atingido: ating>=1, ultimaAtualizacao: hoje.toLocaleDateString("pt-BR") };
    });
    return { id:sec.id, label:sec.label, items };
  });

  const all = sections.flatMap(s=>s.items);
  const summary = {
    indicadoresTotal: all.length,
    indicadoresAtingidos: all.filter(i=>i.atingido).length,
    indicadoresPct: all.length ? all.filter(i=>i.atingido).length / all.length : 0,
    pontosPossiveis: all.reduce((a,i)=>a+(i.peso||0),0),
    pontosAtingidos: all.filter(i=>i.atingido).reduce((a,i)=>a+(i.peso||0),0)
  };
  summary.pontosPct = summary.pontosPossiveis ? summary.pontosAtingidos/summary.pontosPossiveis : 0;

  const dres=["DR 01","DR 02","DR 03"], grs=["GR 01","GR 02","GR 03","GR 04"], prodIds=[...PRODUCT_INDEX.keys()], fams=["Crédito","Investimentos","Seguros","Consórcios","Previdência","Cartão de crédito"];
  const ranking = Array.from({length:120},(_,i)=>{
    const produtoId = prodIds[i%prodIds.length], meta = PRODUCT_INDEX.get(produtoId);
    return {
      diretoria:dres[i%dres.length],
      gerenciaRegional:grs[i%grs.length],
      gerenteGestao:`GG ${String(1+(i%3)).padStart(2,"0")}`,
      familia:fams[i%fams.length],
      produtoId,
      produto:meta?.name||produtoId,
      subproduto: Math.random()>.5?"Aplicação":"Resgate",
      gerente:`Gerente ${1+(i%12)}`,
      agencia:`Ag ${1000+i}`,
      realizado:Math.round(2_000_000+Math.random()*18_000_000),
      meta:Math.round(2_000_000+Math.random()*18_000_000),
      qtd:Math.round(50+Math.random()*1950),
      data:todayISO()
    };
  });
  ranking.forEach(r=> r.ating = r.meta ? r.realizado/r.meta : 0);

  return { sections, summary, ranking };
}

/* ========= STATE ========= */
const state={
  _dataset:null, _rankingRaw:[],
  activeView:"cards", tableView:"diretoria", tableRendered:false, isAnimating:false,
  period:{ start:firstDayOfMonthISO(), end:todayISO() },
  datePopover:null, compact:false
};

/* ========= HELPERS UI ========= */
function injectStyles(){
  try{
    if($("#dynamic-styles")) return;
    const s=document.createElement("style"); s.id="dynamic-styles";
    s.textContent=`.view-panel{opacity:1;transform:translateY(0);transition:opacity .28s ease,transform .28s ease;will-change:opacity,transform}.view-panel.is-exit{opacity:0;transform:translateY(8px)}.view-panel.is-enter{opacity:0;transform:translateY(-6px)}.view-panel.is-enter-active{opacity:1;transform:translateY(0)}.hidden{display:none}`;
    document.head.appendChild(s);
    ["#view-cards","#view-table"].forEach(sel=>$(sel)?.classList.add("view-panel"));
  }catch(e){ console.warn("injectStyles:",e); }
}

/* ========= POPOVER DATA ========= */
function openDatePopover(anchor){
  try{
    closeDatePopover();
    const pop=document.createElement("div"); pop.className="date-popover"; pop.id="date-popover";
    pop.innerHTML=`
      <h4>Alterar data</h4>
      <div class="row" style="margin-bottom:8px">
        <input id="inp-start" type="date" value="${state.period.start}">
        <input id="inp-end"   type="date" value="${state.period.end}">
      </div>
      <div class="actions">
        <button type="button" class="btn-sec" id="btn-cancelar">Cancelar</button>
        <button type="button" class="btn-pri" id="btn-salvar">Salvar</button>
      </div>`;
    document.body.appendChild(pop);
    const r=anchor.getBoundingClientRect(), w=pop.offsetWidth||340;
    pop.style.top=`${r.bottom+8+window.scrollY}px`; pop.style.left=`${Math.max(12,r.right-w+window.scrollX)}px`;
    pop.querySelector("#btn-cancelar").addEventListener("click",closeDatePopover);
    pop.querySelector("#btn-salvar").addEventListener("click",()=>{
      const s=$("#inp-start").value, e=$("#inp-end").value;
      if(!s||!e||new Date(s)>new Date(e)){alert("Período inválido.");return}
      state.period.start=s; state.period.end=e;
      $("#lbl-periodo-inicio") && ($("#lbl-periodo-inicio").textContent=formatBRDate(s));
      $("#lbl-periodo-fim")   && ($("#lbl-periodo-fim").textContent=formatBRDate(e));
      closeDatePopover(); refresh();
    });
    const outside=(ev)=>{ if(ev.target===pop||pop.contains(ev.target)||ev.target===anchor) return; closeDatePopover() };
    const esc=(ev)=>{ if(ev.key==="Escape") closeDatePopover() };
    document.addEventListener("mousedown",outside,{once:true}); document.addEventListener("keydown",esc,{once:true});
    state.datePopover=pop;
  }catch(e){ console.warn("openDatePopover:",e); }
}
function closeDatePopover(){ try{ if(state.datePopover?.parentNode) state.datePopover.parentNode.removeChild(state.datePopover); state.datePopover=null }catch{} }

/* ========= FILTROS ========= */
function injectClearButton(){
  try{
    const actions=$(".filters__actions"); if(!actions||$("#btn-limpar")) return;
    const btn=document.createElement("button"); btn.id="btn-limpar"; btn.className="btn"; btn.type="button"; btn.innerHTML=`<i class="ti ti-x"></i> Limpar filtros`;
    actions.prepend(btn);
    btn.addEventListener("click",()=>{btn.disabled=true; try{ clearFilters() } finally{ setTimeout(()=>btn.disabled=false,300) }});
  }catch(e){ console.warn("injectClearButton:",e); }
}
function clearFilters(){
  try{
    ["#f-diretoria","#f-gerencia","#f-gerente","#f-agencia","#f-ggestao","#f-familia","#f-produto","#f-status-kpi","#f-subproduto","#f-contrato"].forEach(sel=>{
      const el=$(sel); if(!el) return;
      if(el.tagName==="SELECT"){ el.selectedIndex = 0; }
      else if(el.tagName==="INPUT"){ el.value=""; }
    });
    applyFiltersAndRender(); if(state._dataset) renderFamilias(state._dataset.sections,state._dataset.summary);
  }catch(e){ console.warn("clearFilters:",e); }
}

/* remove o período do card de filtros */
function removePeriodFromFiltersCard(){
  try{
    const start=$("#f-inicio"), end=$("#f-fim");
    const grp = start?.closest?.(".filters__group") || end?.closest?.(".filters__group");
    if(grp && grp.parentNode){ grp.parentNode.removeChild(grp); return; }
    $$(".filters__group")?.forEach(g=>{
      const lbl=g.querySelector("label")?.textContent?.trim()?.toLowerCase?.();
      if(lbl && (lbl.includes("período da busca") || lbl.includes("periodo da busca"))) g.remove();
    });
  }catch(e){ console.warn("removePeriodFromFiltersCard:",e); }
}

/* cria/garante Status/Subproduto/Contrato no avançado */
function ensureAdvancedExtras(){
  try{
    const adv=$("#advanced-filters"); if(!adv) return;
    const grid=adv.querySelector(".adv__grid")||adv;

    if(!$("#f-subproduto")){
      const subp=document.createElement("div");
      subp.className="filters__group";
      subp.innerHTML=`
        <label for="f-subproduto">Subproduto</label>
        <select id="f-subproduto" class="input">
          <option value="">Todos</option>
          <option>Aplicação</option><option>Resgate</option><option>A vista</option><option>Parcelado</option>
        </select>`;
      grid.appendChild(subp);
      $("#f-subproduto").addEventListener("change",()=>{ applyFiltersAndRender() });
    }

    if(!$("#f-status-kpi")){
      const wrap=document.createElement("div");
      wrap.className="filters__group";
      wrap.innerHTML=`
        <label for="f-status-kpi">Status dos indicadores</label>
        <select id="f-status-kpi" class="input">
          <option value="todos" selected>Todos</option>
          <option value="atingidos">Atingidos</option>
          <option value="nao">Não atingidos</option>
        </select>`;
      grid.appendChild(wrap);
      $("#f-status-kpi").addEventListener("change",()=> state._dataset && renderFamilias(state._dataset.sections,state._dataset.summary));
    }

    if(!$("#f-contrato")){
      const ct=document.createElement("div");
      ct.className="filters__group";
      ct.innerHTML=`
        <label for="f-contrato">Pesquisar por contrato</label>
        <input id="f-contrato" class="input" placeholder="Ex.: CT-2025-001234">`;
      grid.appendChild(ct);
      $("#f-contrato").addEventListener("input",()=>{ applyFiltersAndRender() });
    }
  }catch(e){ console.warn("ensureAdvancedExtras:",e); }
}

/* reordena filtros — VISÍVEIS: Diretoria, Gerência, Agência (resto no avançado) */
function reorderFiltersUI(){
  try{
    const top = $(".filters"); if(!top) return;
    const adv = $("#advanced-filters .adv__grid") || $("#advanced-filters");

    const groupOf = (sel)=>$(sel)?.closest?.(".filters__group") || null;

    const gDiret = groupOf("#f-diretoria");
    const gGeren = groupOf("#f-gerencia");
    const gAg    = groupOf("#f-agencia");

    const gGG    = groupOf("#f-ggestao");
    const gGer   = groupOf("#f-gerente");
    const gFam   = groupOf("#f-familia");
    const gProd  = groupOf("#f-produto");
    const gSubp  = groupOf("#f-subproduto");
    const gStat  = groupOf("#f-status-kpi");
    const gContr = groupOf("#f-contrato");

    // mantém só 3 no topo
    const actions = top.querySelector(".filters__actions") || top.lastElementChild;
    [gDiret,gGeren,gAg].filter(Boolean).forEach(el=> top.insertBefore(el, actions));

    // demais no avançado
    [gGG,gGer,gFam,gProd,gSubp,gStat,gContr].filter(Boolean).forEach(el=> adv?.appendChild(el));
  }catch(e){ console.warn("reorderFiltersUI:",e); }
}

/* ========= CHIPS & TOOLBAR ========= */
function ensureControls(){
  try{
    if($("#table-controls")) return;
    const section=$("#table-section"); if(!section) return;
    const holder=document.createElement("div");
    holder.id="table-controls";
    holder.innerHTML=`<div id="chipbar" class="chipbar"></div><div id="tt-toolbar" class="table-toolbar"></div>`;
    section.querySelector(".card__header")?.insertAdjacentElement("afterend",holder);

    const chipbar=$("#chipbar");
    TABLE_VIEWS.forEach(v=>{
      const chip=document.createElement("button");
      chip.type="button"; chip.className="chip"; chip.dataset.view=v.id; chip.textContent=v.label;
      if(v.id===state.tableView) chip.classList.add("is-active");
      chip.addEventListener("click",()=>{ if(state.tableView===v.id) return; state.tableView=v.id; setActiveChip(v.id); renderTreeTable(); });
      chipbar?.appendChild(chip);
    });

    const tb=$("#tt-toolbar");
    if(tb){
      tb.innerHTML=`
        <button id="btn-expandir" class="btn btn--sm"><i class="ti ti-chevrons-down"></i> Expandir tudo</button>
        <button id="btn-recolher" class="btn btn--sm"><i class="ti ti-chevrons-up"></i> Recolher tudo</button>
        <button id="btn-compacto" class="btn btn--sm"><i class="ti ti-layout-collage"></i> Modo compacto</button>`;
      $("#btn-expandir")?.addEventListener("click",expandAllRows);
      $("#btn-recolher")?.addEventListener("click",collapseAllRows);
      $("#btn-compacto")?.addEventListener("click",()=>{state.compact=!state.compact; $("#table-section")?.classList.toggle("is-compact",state.compact);});
    }
  }catch(e){ console.warn("ensureControls:",e); }
}
function setActiveChip(id){ $$("#chipbar .chip").forEach(c=>c.classList.toggle("is-active",c.dataset.view===id)); }

/* ========= COMBOS / EVENTS ========= */
function initCombos(){
  try{
    const fill=(sel,arr)=>{ const host=$(sel); if(!host) return; arr.forEach(v=>{const o=document.createElement("option");o.value=v.value;o.textContent=v.label;host.appendChild(o)}); };
    fill("#f-diretoria",[ {value:"Todas",label:"Todas"},{value:"DR 01",label:"DR 01"},{value:"DR 02",label:"DR 02"},{value:"DR 03",label:"DR 03"} ]);
    fill("#f-gerencia",[ {value:"Todas",label:"Todas"},{value:"GR 01",label:"GR 01"},{value:"GR 02",label:"GR 02"},{value:"GR 03",label:"GR 03"},{value:"GR 04",label:"GR 04"} ]);
    fill("#f-gerente",[ {value:"Todos",label:"Todos"},{value:"Gerente 1",label:"Gerente 1"},{value:"Gerente 2",label:"Gerente 2"},{value:"Gerente 3",label:"Gerente 3"},{value:"Gerente 4",label:"Gerente 4"},{value:"Gerente 5",label:"Gerente 5"} ]);
    fill("#f-agencia",[ {value:"Todas",label:"Todas"},{value:"Ag 1001",label:"Ag 1001"},{value:"Ag 1002",label:"Ag 1002"},{value:"Ag 1003",label:"Ag 1003"},{value:"Ag 1004",label:"Ag 1004"} ]);
    fill("#f-ggestao",[ {value:"Todos",label:"Todos"},{value:"GG 01",label:"GG 01"},{value:"GG 02",label:"GG 02"},{value:"GG 03",label:"GG 03"} ]);

    const prods=[{value:"Todas",label:"Todas"}].concat([...PRODUCT_INDEX.entries()].map(([id,meta])=>({value:id,label:meta.name})));
    fill("#f-familia",prods);

    const exemplos=[{value:"Todos",label:"Todos"},{value:"CDC",label:"CDC"},{value:"Cheque Especial",label:"Cheque Especial"},{value:"CDB",label:"CDB"},{value:"Seguro Vida",label:"Seguro Vida"}];
    fill("#f-produto",exemplos);
  }catch(e){ console.warn("initCombos:",e); }
}

function bindEvents(){
  try{
    $("#btn-consultar")?.addEventListener("click",()=>{ autoSnapViewToFilters(); applyFiltersAndRender(); if(state._dataset) renderFamilias(state._dataset.sections,state._dataset.summary); });

    $("#btn-abrir-filtros")?.addEventListener("click",()=>{
      const adv=$("#advanced-filters"); if(!adv) return;
      const isOpen=adv.classList.toggle("is-open");
      adv.setAttribute("aria-hidden",String(!isOpen));
      $("#btn-abrir-filtros").setAttribute("aria-expanded",String(isOpen));
      $("#btn-abrir-filtros").innerHTML=isOpen?`<i class="ti ti-chevron-up"></i> Fechar filtros`:`<i class="ti ti-chevron-down"></i> Abrir filtros`;
      if(isOpen) ensureAdvancedExtras();
    });

    $$(".tab")?.forEach(t=>t.addEventListener("click",()=>{
      if(t.classList.contains("is-active")) return;
      $$(".tab").forEach(x=>x.classList.remove("is-active"));
      t.classList.add("is-active");
      const view=t.dataset.view==="table"?"table":"cards"; switchView(view);
    }));

    ["#f-diretoria","#f-gerencia","#f-gerente","#f-agencia","#f-ggestao","#f-familia","#f-subproduto","#f-contrato"].forEach(sel=>{
      const el=$(sel); if(!el) return;
      el.addEventListener("change",()=>{ autoSnapViewToFilters(); applyFiltersAndRender(); if(state._dataset) renderFamilias(state._dataset.sections,state._dataset.summary); });
      el.addEventListener("input", ()=>{ autoSnapViewToFilters(); applyFiltersAndRender(); });
    });
  }catch(e){ console.warn("bindEvents:",e); }
}

/* ========= VIEW SWITCH ========= */
function switchView(next){
  try{
    if(state.isAnimating||state.activeView===next) return;
    const cur=state.activeView==="table"?$("#view-table"):$("#view-cards");
    const nxt=next==="table"?$("#view-table"):$("#view-cards");
    if(next==="table" && !state.tableRendered){
      ensureControls(); autoSnapViewToFilters(); renderTreeTable(); state.tableRendered=true;
    }
    if(!cur||!nxt){ state.activeView=next; return; }
    state.isAnimating=true; nxt.classList.remove("hidden"); nxt.classList.add("is-enter"); cur.classList.add("is-exit");
    requestAnimationFrame(()=>{
      nxt.classList.add("is-enter-active");
      const onExit=()=>{cur.classList.add("hidden");cur.classList.remove("is-exit");cur.removeEventListener("transitionend",onExit)};
      const onEnter=()=>{nxt.classList.remove("is-enter","is-enter-active");nxt.removeEventListener("transitionend",onEnter);state.isAnimating=false;state.activeView=next;if(next==="table") $("#table-section")?.scrollIntoView({behavior:"smooth",block:"start"})};
      cur.addEventListener("transitionend",onExit,{once:true}); nxt.addEventListener("transitionend",onEnter,{once:true});
    });
  }catch(e){ console.warn("switchView:",e); }
}

/* ========= KPI RESUMO (cards) ========= */
function renderResumoKPI(summary,visibleItemsHitCount,visiblePointsHit){
  try{
    let k=$("#kpi-summary"); if(!k){k=document.createElement("div");k.id="kpi-summary";k.className="kpi-summary";$("#grid-familias")?.prepend(k)}
    const pctInd=summary.indicadoresTotal?(visibleItemsHitCount/summary.indicadoresTotal):summary.indicadoresPct;
    const pctPts=summary.pontosPossiveis?(visiblePointsHit/summary.pontosPossiveis):summary.pontosPct;
    k.innerHTML=`
      <div class="kpi-pill">
        <div class="kpi-pill__icon"><i class="ti ti-list-check"></i></div>
        <div><div class="kpi-pill__title">Indicadores</div>
          <div class="kpi-pill__meta">Total: <strong>${fmtINT.format(summary.indicadoresTotal)}</strong> • Atingidos: <strong>${fmtINT.format(visibleItemsHitCount)}</strong> • Atingimento: <strong>${(pctInd*100).toFixed(1)}%</strong></div>
        </div>
      </div>
      <div class="kpi-pill">
        <div class="kpi-pill__icon"><i class="ti ti-medal"></i></div>
        <div><div class="kpi-pill__title">Pontos</div>
          <div class="kpi-pill__meta">Possíveis: <strong>${fmtINT.format(summary.pontosPossiveis)}</strong> • Atingidos: <strong>${fmtINT.format(visiblePointsHit)}</strong> • Atingimento: <strong>${(pctPts*100).toFixed(1)}%</strong></div>
        </div>
      </div>`;
  }catch(e){ console.warn("renderResumoKPI:",e); }
}

/* ========= CARD TOOLTIP ========= */
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
  try{
    const card = badge.closest(".prod-card");
    if(!card) return;
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
  }catch(e){ console.warn("positionTip:",e); }
}
function closeAllTips(){
  $$(".kpi-tip.is-open")?.forEach(t=>{ t.classList.remove("is-open"); t.style.left=""; t.style.top=""; });
  $$(".prod-card.is-tip-open")?.forEach(c=>c.classList.remove("is-tip-open"));
}
function bindBadgeTooltip(card){
  try{
    const tip = card.querySelector(".kpi-tip");
    const badge = card.querySelector(".badge");
    if(!tip || !badge) return;

    const open = (evt)=>{
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

    // mouse
    badge.addEventListener("mouseenter", open);
    card.addEventListener("mouseleave", close);

    // click / touch
    badge.addEventListener("click",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); });
    badge.addEventListener("touchstart",(e)=>{ e.stopPropagation(); if(tip.classList.contains("is-open")) close(); else open(e); }, {passive:true});

    // fora do card
    document.addEventListener("click",(e)=>{ if(!card.contains(e.target)) close(); });
    document.addEventListener("touchstart",(e)=>{ if(!card.contains(e.target)) close(); }, {passive:true});

    // esc/scroll
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") close(); });
    document.addEventListener("scroll", close, true);

    // relayout
    window.addEventListener("resize",()=>{ if(tip.classList.contains("is-open")) positionTip(badge, tip); });
  }catch(e){ console.warn("bindBadgeTooltip:",e); }
}

/* ========= RENDER CARDS ========= */
function getStatusFilter(){return $("#f-status-kpi")?.value || "todos"}
function renderFamilias(sections,summary){
  try{
    const host=$("#grid-familias"); if(!host) return;
    host.innerHTML="";
    const status=getStatusFilter(); const filtroProdId=$("#f-familia")?.value || "Todas";
    let visAting=0, visPts=0;

    const kpiHolder=document.createElement("div"); kpiHolder.id="kpi-summary"; kpiHolder.className="kpi-summary"; host.appendChild(kpiHolder);

    sections.forEach(sec=>{
      const secOfProd=filtroProdId!=="Todas"?PRODUCT_INDEX.get(filtroProdId)?.sectionId:null;
      if(secOfProd && sec.id!==secOfProd) return;

      const items=sec.items.filter(it=>{
        const okStatus=status==="atingidos" ? it.atingido : (status==="nao" ? !it.atingido : true);
        const okProduto=(filtroProdId==="Todas"||it.id===filtroProdId); return okStatus && okProduto;
      });
      if(!items.length) return;

      const sectionTotal=sec.items.reduce((a,i)=>a+(i.peso||0),0);
      const sectionHit=sec.items.filter(i=>i.atingido).reduce((a,i)=>a+(i.peso||0),0);

      const sectionEl=document.createElement("section");
      sectionEl.className="fam-section"; sectionEl.id=`sec-${sec.id}`;
      sectionEl.innerHTML=`
        <header class="fam-section__header">
          <div class="fam-section__title"><span>${sec.label}</span></div>
          <small class="fam-section__meta">pontos: ${fmtINT.format(sectionHit)}/${fmtINT.format(sectionTotal)} — peso ${fmtINT.format(sectionTotal)}</small>
        </header>
        <div class="fam-section__grid"></div>`;
      const grid=sectionEl.querySelector(".fam-section__grid");

      items.forEach(f=>{
        if(f.atingido){visAting++; visPts+=(f.peso||0)}
        const pct=f.ating*100, badgeClass=pct<50?"badge--low":(pct<100?"badge--warn":"badge--ok"), badgeTxt=`${pct.toFixed(1)}%`;
        grid.insertAdjacentHTML("beforeend",`
          <article class="prod-card" tabindex="0" data-prod-id="${f.id}">
            <div class="prod-card__title">
              <i class="${f.icon}"></i><span class="prod-card__name">${f.nome}</span>
              <span class="badge ${badgeClass}" aria-label="Atingimento">${badgeTxt}</span>
            </div>
            <div class="prod-card__meta">
              <span class="pill">Pontos: ${fmtINT.format(f.peso)}/${fmtINT.format(sectionTotal)}</span>
              <span class="pill">Peso: ${fmtINT.format(f.peso)}</span>
              <span class="pill">${f.metric==="valor"?"Valor":f.metric==="qtd"?"Quantidade":"Percentual"}</span>
            </div>
            <div class="prod-card__kpis">
              <div class="kv"><small>Realizado</small><strong>${formatByMetric(f.metric,f.realizado)}</strong></div>
              <div class="kv"><small>Meta</small><strong>${formatByMetric(f.metric,f.meta)}</strong></div>
            </div>
            <div class="prod-card__foot">Atualizado em ${f.ultimaAtualizacao}</div>
            ${buildCardTooltipHTML(f)}
          </article>`);
      });

      host.appendChild(sectionEl);
    });

    renderResumoKPI(summary,visAting,visPts);

    $$(".prod-card")?.forEach(card=>{
      bindBadgeTooltip(card);
      card.addEventListener("click",(ev)=>{
        if(ev.target?.classList?.contains("badge")) return;
        const prodId=card.getAttribute("data-prod-id");
        const sel=$("#f-familia"); if(sel){ let opt=[...sel.options].find(o=>o.value===prodId); if(!opt){const meta=PRODUCT_INDEX.get(prodId); opt=new Option(meta?.name||prodId,prodId); sel.appendChild(opt)} sel.value=prodId; }
        state.tableView="produto"; setActiveChip("produto");
        const tabDet=document.querySelector('.tab[data-view="table"]'); if(tabDet && !tabDet.classList.contains("is-active")) tabDet.click(); else switchView("table");
        applyFiltersAndRender();
      });
    });
  }catch(e){ console.error("renderFamilias:",e); }
}

/* ========= TABELA (árvore) ========= */
function getFilterValues(){
  const val=(sel)=>$(sel)?.value || "";
  return { diretoria:val("#f-diretoria"), gerencia:val("#f-gerencia"), gerente:val("#f-gerente"), agencia:val("#f-agencia"), ggestao:val("#f-ggestao"), produtoId:val("#f-familia"), subproduto:val("#f-subproduto"), contrato:($("#f-contrato")?.value||"").trim() };
}
function filterRows(rows){
  try{
    const f=getFilterValues();
    const s=state.period.start, e=state.period.end;
    return rows.filter(r=>{
      const okDR =(f.diretoria==="Todas"||f.diretoria===""||r.diretoria===f.diretoria);
      const okGR =(f.gerencia==="Todas" ||f.gerencia==="" ||r.gerenciaRegional===f.gerencia);
      const okAg =(f.agencia==="Todas"  ||f.agencia===""  ||r.agencia===f.agencia);
      const okGG =(f.ggestao==="Todos"  ||f.ggestao===""  ||r.gerenteGestao===f.ggestao);
      const okGer=(f.gerente==="Todos"  ||f.gerente===""  ||r.gerente===f.gerente);
      const okProd=(f.produtoId==="Todas"||f.produtoId===""||r.produtoId===f.produtoId);
      const okSub =(!f.subproduto||(r.subproduto||"-")===f.subproduto);
      const okCt  =(!f.contrato||(r._contracts?.some(c=>c.id.includes(f.contrato))));
      const okDt  =(!s||r.data>=s)&&(!e||r.data<=e);
      return okDR && okGR && okAg && okGG && okGer && okProd && okSub && okCt && okDt;
    });
  }catch(e){ console.warn("filterRows:",e); return rows; }
}
function ensureContracts(r){
  if(r._contracts) return r._contracts;
  const n=2+Math.floor(Math.random()*3), arr=[];
  for(let i=0;i<n;i++){
    const id=`CT-${new Date().getFullYear()}-${String(Math.floor(1e6+Math.random()*9e6)).padStart(7,"0")}`;
    const valor=Math.round((r.realizado/n)*(0.6+Math.random()*0.9)), meta=Math.round((r.meta/n)*(0.6+Math.random()*0.9));
    const subps=["Aplicação","Resgate","A vista","Parcelado"]; const subp=r.subproduto || subps[Math.floor(Math.random()*subps.length)];
    arr.push({id,produto:r.produto,subproduto:subp||r.produto||"-",qtd:1,realizado:valor,meta,ating:meta?(valor/meta):0,data:r.data,tipo:Math.random()>.5?"Venda direta":"Digital"});
  }
  r._contracts=arr; return arr;
}
function buildTree(rows,startKey){
  const mapKey={diretoria:"diretoria",gerencia:"gerenciaRegional",agencia:"agencia",gGestao:"gerenteGestao",gerente:"gerente",produto:"produto",familia:"familia"};
  function group(list,key){const m=new Map();list.forEach(r=>{const k=r[key]||"—";const a=m.get(k)||[];a.push(r);m.set(k,a)});return [...m.entries()]}
  function agg(list){const realizado=list.reduce((a,b)=>a+(b.realizado||0),0), meta=list.reduce((a,b)=>a+(b.meta||0),0), qtd=list.reduce((a,b)=>a+(b.qtd||0),0), data=list.reduce((mx,b)=>b.data>mx?b.data:mx,"0000-00-00"); return{realizado,meta,qtd,ating:meta?realizado/meta:0,data}}
  const NEXT_VIEW={diretoria:"gerencia",gerencia:"agencia",agencia:"gerente",gGestao:"gerente",gerente:"contrato",produto:"contrato",familia:"contrato"};
  function buildLevel(list,levelKey,level){
    if(levelKey==="contrato"){
      return list.flatMap(r=>ensureContracts(r).map(c=>({type:"contrato",level,label:c.id,produto:c.produto,subproduto:c.subproduto,realizado:c.realizado,meta:c.meta,qtd:c.qtd,ating:c.ating,data:c.data,children:[]})));
    }
    return group(list,mapKey[levelKey]||levelKey).map(([k,arr])=>{
      const a=agg(arr), next=NEXT_VIEW[levelKey];
      return {type:"grupo",level,label:k,realizado:a.realizado,meta:a.meta,qtd:a.qtd,ating:a.ating,data:a.data,children: next? buildLevel(arr,next,level+1):[]};
    });
  }
  return buildLevel(rows,startKey,0);
}
function renderTreeTable(){
  try{
    ensureControls();
    const def=TABLE_VIEWS.find(v=>v.id===state.tableView)||TABLE_VIEWS[0];
    const rows=filterRows(state._rankingRaw);
    const nodes=buildTree(rows,def.id);

    const host=$("#gridRanking"); if(!host) return;
    host.innerHTML="";
    const table=document.createElement("table"); table.className="tree-table";
    table.innerHTML=`
      <thead><tr>
        <th>${def.label}</th><th>Produto</th><th>Subproduto</th>
        <th>Quantidade</th><th>Realizado (R$)</th><th>Meta (R$)</th><th>Atingimento</th><th>Data</th>
        <th class="col-actions">Ações</th>
      </tr></thead><tbody></tbody>`;
    const tbody=table.querySelector("tbody"); host.appendChild(table);
    if(state.compact) $("#table-section")?.classList.add("is-compact"); else $("#table-section")?.classList.remove("is-compact");

    let seq=0; const mkId=()=>`n${++seq}`;
    const att=(p)=>{const pct=(p*100);const cls=pct<50?"att-low":(pct<100?"att-warn":"att-ok");return `<span class="att-badge ${cls}">${pct.toFixed(1)}%</span>`}

    function renderNode(node,parentId=null){
      const id=mkId(), has=!!(node.children&&node.children.length);
      const tr=document.createElement("tr"); tr.className=`tree-row lvl-${node.level} ${node.type==="contrato"?"type-contrato":""}`; tr.dataset.id=id; if(parentId) tr.dataset.parent=parentId;

      const prod = node.type==="contrato" ? node.produto : "—";
      const subp = node.type==="contrato" ? (node.subproduto || node.produto || "—") : "—";
      const actions = node.type==="contrato"
        ? `<span class="actions-group">
             <button class="icon-btn" title="Abrir chamado"><i class="ti ti-ticket"></i></button>
             <button class="icon-btn" title="Copiar referência"><i class="ti ti-copy"></i></button>
           </span>`
        : `<span class="muted">—</span>`;

      tr.innerHTML=`
        <td><div class="tree-cell">
          <button class="toggle" ${has?"":"disabled"} aria-label="${has?"Expandir/colapsar":""}"><i class="ti ${has?"ti-chevron-right":"ti-dot"}"></i></button>
          <span class="label-strong">${node.label}</span></div></td>
        <td>${prod}</td><td>${subp}</td>
        <td>${fmtINT.format(node.qtd||0)}</td>
        <td>${fmtBRL.format(node.realizado||0)}</td>
        <td>${fmtBRL.format(node.meta||0)}</td>
        <td>${att(node.ating||0)}</td>
        <td>${formatBRDate(node.data||"")}</td>
        <td class="actions-cell">${actions}</td>`;

      const btn=tr.querySelector(".toggle");
      if(btn && has){
        btn.addEventListener("click",()=>{
          const isOpen=btn.dataset.open==="1"; btn.dataset.open=isOpen?"0":"1";
          btn.querySelector("i").className=`ti ${isOpen?"ti-chevron-right":"ti-chevron-down"}`;
          toggleChildren(id,!isOpen);
        });
      }

      if(node.type==="contrato"){
        const [btnT, btnC] = tr.querySelectorAll(".actions-group .icon-btn");
        btnT?.addEventListener("click",(ev)=>{ev.stopPropagation(); window.open(TICKET_URL,"_blank")});
        btnC?.addEventListener("click",(ev)=>{
          ev.stopPropagation();
          const txt=`Contrato ${node.label} • Produto: ${node.produto} • Subproduto: ${node.subproduto||"-"}`;
          navigator.clipboard?.writeText(txt);
          btnC.innerHTML='<i class="ti ti-check"></i>'; setTimeout(()=>btnC.innerHTML='<i class="ti ti-copy"></i>',900);
        });
        tr.addEventListener("dblclick",()=>openDetailRow(tr,node));
      }

      tbody.appendChild(tr);
      if(has){ node.children.forEach(ch=>renderNode(ch,id)); toggleChildren(id,false); }
    }

    function toggleChildren(parentId,show){
      const children=[...tbody.querySelectorAll(`tr[data-parent="${parentId}"]`)];
      children.forEach(ch=>{
        ch.style.display=show?"table-row":"none";
        if(!show){ const b=ch.querySelector(".toggle[data-open='1']"); if(b){b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"} toggleChildren(ch.dataset.id,false) }
      });
    }

    function openDetailRow(anchorTr,node){
      const nxt=anchorTr.nextElementSibling;
      if(nxt && nxt.classList.contains("detail-row")){ nxt.remove(); anchorTr.classList.remove("is-active"); return; }
      anchorTr.classList.add("is-active");
      const tr=document.createElement("tr"); tr.className="detail-row";
      const td=document.createElement("td"); td.colSpan=9; td.innerHTML=`
        <div class="detail-card">
          <div class="detail-title">Detalhes do contrato ${node.label}</div>
          <table class="detail-table">
            <thead><tr><th>Contrato</th><th>Produto</th><th>Subproduto</th><th>Tipo</th><th>Valor</th><th>Meta</th><th>Data</th></tr></thead>
            <tbody><tr>
              <td>${node.label}</td><td>${node.produto}</td><td>${node.subproduto||"-"}</td><td>${node.tipo||"—"}</td>
              <td>${fmtBRL.format(node.realizado||0)}</td><td>${fmtBRL.format(node.meta||0)}</td><td>${formatBRDate(node.data||"")}</td>
            </tr></tbody>
          </table>
        </div>`; tr.appendChild(td); anchorTr.insertAdjacentElement("afterend",tr);
    }

    nodes.forEach(n=>renderNode(n,null));
  }catch(e){ console.error("renderTreeTable:",e); }
}
function expandAllRows(){ try{ const tb=$("#gridRanking tbody"); if(!tb) return; tb.querySelectorAll("tr").forEach(tr=>{ if(tr.classList.contains("detail-row")) tr.remove(); const b=tr.querySelector(".toggle"); if(b&&!b.disabled){b.dataset.open="1"; b.querySelector("i").className="ti ti-chevron-down"} if(tr.dataset.parent) tr.style.display="table-row" }) }catch(e){ console.warn("expandAllRows:",e); } }
function collapseAllRows(){ try{ const tb=$("#gridRanking tbody"); if(!tb) return; tb.querySelectorAll("tr").forEach(tr=>{ if(tr.classList.contains("detail-row")) tr.remove(); const b=tr.querySelector(".toggle"); if(b&&!b.disabled){b.dataset.open="0"; b.querySelector("i").className="ti ti-chevron-right"} if(tr.dataset.parent) tr.style.display="none" }) }catch(e){ console.warn("collapseAllRows:",e); } }

/* ========= AUTO SNAP ========= */
function getFilterValuesSimple(){const v=(s)=>$(s)?.value||""; return {diretoria:v("#f-diretoria"),gerencia:v("#f-gerencia"),agencia:v("#f-agencia"),ggestao:v("#f-ggestao"),gerente:v("#f-gerente"),produtoId:v("#f-familia")}}
function autoSnapViewToFilters(){
  try{
    const f=getFilterValuesSimple(); let snap=null;
    if(f.produtoId && f.produtoId!=="Todas") snap="produto";
    else if(f.gerente && f.gerente!=="Todos") snap="gerente";
    else if(f.gerencia && f.gerencia!=="Todas") snap="gerencia";
    else if(f.diretoria && f.diretoria!=="Todas") snap="diretoria";
    if(snap && state.tableView!==snap){ state.tableView=snap; setActiveChip(snap); }
  }catch(e){ console.warn("autoSnapViewToFilters:",e); }
}
function applyFiltersAndRender(){ if(state.tableRendered) renderTreeTable(); }

/* ========= REFRESH ========= */
async function refresh(){
  try{
    const ds=await getData();
    state._dataset=ds; state._rankingRaw=ds.ranking;

    const right=$("#lbl-atualizacao");
    if(right){
      right.innerHTML=`
        <div class="period-inline">
          <span class="txt">Valores acumulados desde <strong><span id="lbl-periodo-inicio">${formatBRDate(state.period.start)}</span></strong> até <strong><span id="lbl-periodo-fim">${formatBRDate(state.period.end)}</span></strong></span>
          <button id="btn-alterar-data" type="button" class="link-action"><i class="ti ti-chevron-down"></i> Alterar data</button>
        </div>`;
      $("#btn-alterar-data")?.addEventListener("click",e=>openDatePopover(e.currentTarget));
    }

    renderFamilias(ds.sections,ds.summary);
    reorderFiltersUI();
    if(state.tableRendered) renderTreeTable();
  }catch(e){ console.error("refresh:",e); alert("Falha ao carregar dados."); }
}

/* ========= BOOT ========= */
(function(){
  try{
    injectStyles();
    initCombos();
    bindEvents();
    injectClearButton();
    ensureAdvancedExtras();
    removePeriodFromFiltersCard();
    reorderFiltersUI();
    refresh();
  }catch(e){ console.error("BOOT:",e); }
})();
