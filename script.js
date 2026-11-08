"use strict";
/* =====================================================================
   CASO KERNEL · motor point and click
   - Casos com cena em SCENES (scenes.js): exploração + painel de problema.
   - Casos sem cena: modo linear (fallback), igual ao jogo anterior.
   ===================================================================== */
const KEY="caso-kernel-v6",V5KEY="caso-kernel-v5",V4KEY="caso-kernel-v4",V3KEY="caso-kernel-v3",BKEY="caso-kernel-best-v2",OLDBKEY="caso-kernel-best",
  MAXHP=100,HIT=15,HINT=10,HEAL=10,N=10;   /* dica mais barata que erro: pedir ajuda vale mais que chutar */
const $=id=>document.getElementById(id);
const IC=n=>'<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-'+n+'"/></svg>';
const DIF={f:["◆","Fácil"],m:["◆","Médio"],d:["◆","Difícil"],b:["◆","Chefão"]};
const SCN=typeof SCENES!=="undefined"?SCENES:{};
const DEBUG=/[?&]debug=1(&|$)/.test(location.search);   /* ?debug=1: caixas dos hotspots e coordenadas */
if(DEBUG)document.documentElement.classList.add("dbg");

/* ============ CASOS E CENAS POR ID ============ */
/* O estado usa o índice do caso em SEEDS; o save e os recordes usam o id estável. */
const SID=SEEDS.map(s=>s.id);
const LEGACY=["cofre","fantasma","dependencia"];   /* ordem dos casos até o save v4 (seed = índice) */
const idxOf=id=>{const k=SID.indexOf(id);return k<0?null:k};
const hasScene=i=>i!==null&&i!==undefined&&!!SCN[SID[i]];
const scCache={};
/* Time Attack: todas as fases com sorteio, de todos os casos */
const TA_POOL=SEEDS.flatMap((s,k)=>s.casos.map((c,i)=>typeof c.g==="function"?[k,i]:null).filter(Boolean));
const sceneAt=i=>{if(!hasScene(i))return null;const id=SID[i];return scCache[id]||(scCache[id]=typeof SCN[id]==="function"?SCN[id]():SCN[id])};

/* ============ ESTADO E PERSISTÊNCIA (v6) ============ */
/* mode: "det" (Detetive, com HP) ou "inv" (Investigador, sem dano, pontos ×0,5)
   pmode: modo escolhido na tela de casos | ta: partida de Time Attack em andamento */
/* solved: fases resolvidas | hs: {fase:{h:dicas,w:erros}} | open: fase com painel aberto
   fc: dossiê aberto | sv/last: só no modo linear (feedback "Acertou") | room: sala atual */
/* rs: semente da partida (sorteio dos problemas com g, ver cases.js) */
const newRs=()=>Math.floor(Math.random()*4294967296);
const TA_MS=180000,TA_PEN=10000,TA_PTS={f:50,m:100,d:150,b:200};
const fresh=()=>({seed:null,iq:0,mode:"det",pmode:"det",ta:null,rs:0,hp:MAXHP,score:0,solved:[],hs:{},open:null,sv:false,sel:null,fc:null,last:0,room:null,snd:true,over:false,fin:false,t:0});
const rdj=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
const sceneOf=s=>sceneAt(s.seed);
const isAv=(s,i)=>{
  const D=sceneOf(s);
  if(D){const h=D.hotspots.find(x=>x.caso===i);return !!h&&(h.requires||[]).every(r=>s.solved.includes(r))}
  for(let j=0;j<i;j++)if(!s.solved.includes(j))return false;
  return true;
};
const firstUn=s=>{for(let i=0;i<N;i++)if(!s.solved.includes(i))return i;return null};

function load(){
  const s=fresh(),v6=rdj(KEY)||rdj(V5KEY);   /* v5 tem o mesmo formato, sem modo (vale Detetive) */
  if(v6&&typeof v6==="object"){Object.assign(s,v6);s.seed=typeof v6.seed==="string"?idxOf(v6.seed):null;return s}
  /* migração v4/v3 -> v5: seed era o índice na ordem antiga (LEGACY) */
  const v4=rdj(V4KEY),v3=rdj(V3KEY),old=k=>Number.isInteger(k)&&LEGACY[k]?idxOf(LEGACY[k]):null;
  if(v4&&typeof v4==="object"){Object.assign(s,v4);s.seed=old(v4.seed)}
  else if(v3&&typeof v3==="object"){
    ["hp","score","snd","t","over","fin"].forEach(k=>{if(k in v3)s[k]=v3[k]});
    s.seed=old(v3.seed);s.solved=Array.isArray(v3.clues)?v3.clues:[];
    s.sv=!!v3.sv;s.open=(!hasScene(s.seed)&&Number.isInteger(v3.i))?v3.i:null;   /* cena: volta a explorar */
  }
  return s;
}
function loadBest(){
  const b=rdj(BKEY);if(b&&typeof b==="object")return Object.assign({},b);
  const o=rdj(OLDBKEY),r={};   /* recordes antigos: chave = índice LEGACY */
  if(o&&typeof o==="object")for(const k in o){const id=LEGACY[+k];if(id&&Number.isFinite(o[k]))r[id]=o[k]}
  return r;
}
function sanitize(s){
  const n=(v,a,b,f)=>Number.isFinite(v)&&v>=a&&v<=b?v:f;
  const base=Object.assign(fresh(),{snd:s.snd!==false,pmode:s.pmode==="inv"?"inv":"det"});
  const t=s.ta;
  if(t&&typeof t==="object"&&t.q&&TA_POOL.some(p=>p[0]===t.q.s&&p[1]===t.q.i)){
    base.ta={left:n(t.left,0,TA_MS,TA_MS),score:n(t.score,0,1e7,0),n:n(t.n,0,1e5,0),w:n(t.w,0,1e5,0),end:!!t.end,
      q:{s:t.q.s,i:t.q.i,rs:Number.isInteger(t.q.rs)?t.q.rs:newRs()}};
    return base;
  }
  if(!(Number.isInteger(s.seed)&&SEEDS[s.seed]))return base;
  const I=v=>Number.isInteger(v)&&v>=0&&v<N&&!!SEEDS[s.seed].casos[v];
  const r=Object.assign(base,{seed:s.seed,iq:n(s.iq,0,9,0),mode:s.mode==="inv"?"inv":"det",rs:Number.isInteger(s.rs)&&s.rs>0&&s.rs<4294967296?s.rs:newRs(),hp:n(s.hp,0,MAXHP,MAXHP),score:n(s.score,0,1e6,0),t:n(s.t,0,1e9,0),last:n(s.last,0,1e4,0),over:!!s.over,fin:!!s.fin});
  r.solved=[...new Set((Array.isArray(s.solved)?s.solved:[]).filter(I))];
  const hs={};
  if(s.hs&&typeof s.hs==="object")for(const k in s.hs){const e=s.hs[k];if(I(+k)&&e)hs[k]={h:n(e.h,0,2,0),w:n(e.w,0,999,0)}}
  r.hs=hs;
  const D=sceneAt(s.seed);
  r.room=D?(D.salas.find(x=>x.id===s.room)||D.salas[0]).id:null;
  if(r.over||r.fin)return r;
  r.fc=I(s.fc)&&r.solved.includes(s.fc)?s.fc:null;
  if(D){r.open=(I(s.open)&&!r.solved.includes(s.open)&&isAv(r,s.open))?s.open:null}
  else{ /* linear */
    const u=firstUn(r);
    if(u===null){r.open=N-1;r.sv=true}
    else if(s.sv&&I(s.open)&&r.solved.includes(s.open)){r.open=s.open;r.sv=true}
    else{r.open=u;r.sv=false}
  }
  return r;
}
let S=sanitize(load()),best=loadBest(),tk=Date.now(),qk="",enter=false;
const save=()=>{try{
  localStorage.setItem(KEY,JSON.stringify(Object.assign({},S,{seed:S.seed===null?null:SID[S.seed]})));
  localStorage.setItem(BKEY,JSON.stringify(best));
}catch(e){}};
const scn=()=>sceneAt(S.seed);
/* recordes: tempo por caso e modo ("cofre", "cofre@inv"); Time Attack: maior pontuação ("@ta") */
const bkey=(i,m)=>SID[i]+(m==="inv"?"@inv":"");
const bestOf=(i,m)=>best[bkey(i,m===undefined?S.mode:m)];
const INV=()=>S.mode==="inv";
/* fase i do caso s com a semente rs (sorteio aplicado e memorizado) */
const gMemo={};
function caseOf(s,i,rs){
  const P=SEEDS[s].casos[i];if(typeof P.g!=="function")return P;
  const key=s+":"+i+":"+rs;if(gMemo[key])return gMemo[key];
  let h=rs^0x9E3779B9;for(const ch of SID[s]+":"+i)h=Math.imul(h^ch.charCodeAt(0),16777619);
  return gMemo[key]=Object.assign({},P,P.g(mkR(h>>>0)));
}
const caseAt=i=>caseOf(S.seed,i,S.rs);
const cur=()=>S.ta?caseOf(S.ta.q.s,S.ta.q.i,S.ta.q.rs):caseAt(S.open);
const hsd=i=>S.hs[i]||(S.hs[i]={h:0,w:0});
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};

/* ============ CRONÔMETRO ============ */
let ticks=0;
setInterval(()=>{
  const n=Date.now();
  if(document.hidden){tk=n;return}
  if(S.ta&&!S.ta.end){S.ta.left=Math.max(0,S.ta.left-(n-tk));$("tm").textContent=fmt(S.ta.left);paintTaBar();if(S.ta.left<=0)taEnd();else if(++ticks%5===0)save()}
  else if(S.seed!==null&&!S.over&&!S.fin){S.t+=n-tk;$("tm").textContent=fmt(S.t);if(++ticks%5===0)save()}
  tk=n;
},1000);
document.addEventListener("visibilitychange",()=>{tk=Date.now();if(document.hidden)save();calm()});
addEventListener("pagehide",save);

/* ============ RENDERIZADOR MATEMÁTICO ============ */
function mth(e){
  e=e.replace(/mat\(([^)]*)\)/g,(_,b)=>'<span class="mx">'+b.split(";").map(r=>'<span class="r">'+r.split(",").map(c=>"<i>"+c.trim()+"</i>").join("")+"</span>").join("")+"</span>");
  return e.replace(/RR/g,"ℝ").replace(/->/g,"→")
    .replace(/\^\{([^}]*)\}/g,"<sup>$1</sup>").replace(/\^(-?\w+)/g,"<sup>$1</sup>").replace(/_(\d+|[A-Za-z])/g,"<sub>$1</sub>");   /* c_1x = c₁·x */
}
const M=s=>s.replace(/\$(.+?)\$/g,(_,e)=>'<span class="m">'+mth(e)+"</span>");

/* ============ ÁUDIO RETRÔ (Web Audio API) ============ */
let ac;
const ctx=()=>ac=ac||new(window.AudioContext||window.webkitAudioContext)();
let nb=null;   /* 1 s de ruído branco, criado uma vez; o decaimento fica no ganho */
function noise(t,d,v,fq){
  const c=ctx();
  if(!nb){nb=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=nb.getChannelData(0);for(let k=0;k<a.length;k++)a[k]=Math.random()*2-1}
  const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter(),T=c.currentTime+t;
  f.type="bandpass";f.frequency.value=fq;s.buffer=nb;
  g.gain.setValueAtTime(v,T);g.gain.linearRampToValueAtTime(0,T+d);
  s.connect(f);f.connect(g);g.connect(c.destination);s.start(T,Math.random()*(1-d),d);
}
function tone(fq,t,d,ty,v){
  const c=ctx(),o=c.createOscillator(),g=c.createGain(),T=c.currentTime+t;
  o.type=ty;o.frequency.setValueAtTime(fq,T);g.gain.setValueAtTime(v,T);
  g.gain.exponentialRampToValueAtTime(.001,T+d);o.connect(g);g.connect(c.destination);o.start(T);o.stop(T+d);
}
function sfx(k){
  if(!S.snd)return;
  try{
    if(k==="key")noise(0,.04,.5,2500);
    if(k==="pick"){noise(0,.03,.4,1800);tone(880,.02,.1,"sine",.12)}
    if(k==="lock"){noise(0,.05,.4,900);tone(150,0,.1,"square",.08)}
    if(k==="hint"){noise(0,.04,.5,2500);noise(.1,.04,.5,3000);noise(.2,.04,.5,2200)}
    if(k==="ok"){noise(0,.08,.9,300);tone(110,0,.2,"triangle",.4);tone(1760,.3,.7,"sine",.15)}
    if(k==="no"){noise(0,.15,.9,200);tone(70,0,.3,"sawtooth",.3)}
    if(k==="win")[0,.15,.3,.45].forEach((t,i)=>tone(523*(1+i*.25),t,.4,"triangle",.2));
    if(k==="lose")[0,.25,.5].forEach((t,i)=>tone(220/(1+i*.3),t,.45,"sawtooth",.2));
  }catch(e){}
}

/* ============ MODAIS (foco, inert, fundo clicável) ============ */
let ret=null,lastHS=null;
const calm=()=>document.documentElement.classList.toggle("calm",document.hidden||!!document.querySelector(".ov.on"));
const syncInert=()=>{const on=!!document.querySelector(".ov.on");["header","main"].forEach(s=>{document.querySelector(s).inert=on});calm()};
function openM(id,f){if(!document.querySelector(".ov.on"))ret=document.activeElement;$(id).classList.add("on");syncInert();$(f).focus()}
function closeM(id,back){
  $(id).classList.remove("on");syncInert();
  if(back){const t=(id==="ov"&&$("again"))||ret;if(t&&t.focus&&document.contains(t))t.focus()}
  if(!document.querySelector(".ov.on"))ret=null;
}
const backFocus=()=>{const el=lastHS!==null&&$("hs"+lastHS);if(el)el.focus()};

/* ============ LÓGICA ============ */
/* Resposta numérica com n componentes. Separadores: "," ou ";". Decimal: "1.5" ou "1,5".
   Vírgula decimal com vários componentes exige ";" entre eles ("2; 1,5"). Frações: "1/2".
   Retorna {v:[números]} | {amb:true} (vírgulas demais, provável decimal) | {bad:true}. */
const num=p=>{
  if(/^[-+]?(\d+\.?\d*|\.\d+)\/[-+]?(\d+\.?\d*|\.\d+)$/.test(p)){const[a,b]=p.split("/");return +b===0?NaN:+a/+b}
  return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(p)?+p:NaN;
};
function parse(v,n){
  v=v.replace(/[−–]/g,"-").replace(/[()\s]/g,"");
  let p;
  if(v.includes(";"))p=v.split(";").filter(Boolean).map(x=>x.replace(",","."));
  else{
    p=v.split(",").filter(Boolean);
    if(p.length!==n){
      if(n===1&&p.length===2)p=[p.join(".")];               /* uma resposta só: "1,5" = 1.5 */
      else if(p.length>n&&p.length<=2*n)return {amb:true};  /* "2,1,5" para (2; 1,5)? */
    }
  }
  const r=p.map(num);
  return !r.length||r.some(isNaN)?{bad:true}:{v:r,raw:p};
}
/* prévia do que será enviado, com o renderizador do jogo (frações e vírgula decimal) */
function preview(){
  const a=$("ans"),pv=$("pv");if(!a||!pv)return;
  const n=+a.dataset.n,v=a.value.trim();
  if(!v){pv.className="pv";pv.innerHTML="";return}
  const r=parse(v,n);
  if(r.amb||r.bad){pv.className="pv warn";pv.innerHTML=IC("bulb")+(r.amb?"Ambíguo: separe os números com ponto e vírgula (ex.: 2; 1,5).":"Formato ainda incompleto ou inválido.");return}
  const fx=t=>(+t<0?"−":"")+String(Math.abs(+t)).replace(".",","),
    show=r.raw.map(t=>{if(t.includes("/")){const[x,y]=t.split("/");return '<span class="fr"><sup>'+fx(x)+"</sup>⁄<sub>"+fx(y)+"</sub></span>"}return fx(t)}),
    dec=r.raw.some(t=>/\./.test(t)),k=r.v.length;
  pv.className="pv"+(k!==n?" warn":"");
  pv.innerHTML=IC(k===n?"check":"bulb")+"Você vai enviar: <span class=\"m\">"+(k>1?"(":"")+show.join(dec?"; ":", ")+(k>1?")":"")+"</span>"+
    (k!==n?" · esperado: "+n+" número"+(n>1?"s":""):"");
}
/* barra de símbolos (celular): insere na posição do cursor sem fechar o teclado */
function ins(ch){
  const a=$("ans");if(!a||a.disabled)return;
  const s0=a.selectionStart??a.value.length,s1=a.selectionEnd??s0;
  a.setRangeText(ch,s0,s1,"end");a.focus();preview();sfx("key");
}
const pts=()=>{const d=hsd(S.open),v=Math.max(100-10*d.h-5*d.w,10)+(cur().d==="b"?50:0);return INV()?Math.round(v*.5):v};
const setH=(el,h)=>{if(el._h!==h){el._h=h;el.innerHTML=h}};
const anim=(id,cls)=>{const el=$(id);el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)};
const nextLabel=()=>S.solved.length>=N?IC("trophy")+"Encerrar caso":(scn()?IC("search")+"Continuar investigação":IC("folder")+"Próxima fase");

/* ---- diálogo (barra sob a cena) ---- */
let dlgWho="Detetive",dlgTxt="",dlgSeed=null;
function paintDlg(){const d=$("dlg");if(d)d.innerHTML='<span class="who">'+dlgWho+"</span><p>"+dlgTxt+"</p>"}
function say(who,txt){dlgWho=who;dlgTxt=txt;paintDlg()}

/* ---- cena ---- */
const px=v=>Math.round(v*100)/100;
function hsHTML(h){
  const dbg=DEBUG?' data-box="#'+h.caso+" "+px(h.x*16)+","+px(h.y*9)+" "+px(h.w*16)+"×"+px(h.h*9)+'"':"";
  return '<button class="hs" id="hs'+h.caso+'" data-k="'+h.caso+'"'+dbg+' style="left:'+h.x+"%;top:"+h.y+"%;width:"+h.w+"%;height:"+h.h+'%"><span class="mk"></span><span class="hl">'+h.nome+"</span></button>";
}
function buildScene(final){
  const D=scn(),room=D.salas.find(r=>r.id===S.room)||D.salas[0],g=$("game");
  let h='<div class="sbar"><span class="rn">'+IC("eye")+room.nome+"</span>";
  if(D.salas.length>1)h+='<span class="rooms">'+D.salas.map(r=>'<button class="btn sm" data-room="'+r.id+'"'+(r.id===room.id?' aria-pressed="true"':"")+">"+r.nome+"</button>").join("")+"</span>";
  if(!final)h+='<button class="btn sm" id="hlt">'+IC("search")+'<span class="t">Destacar objetos</span><kbd>H</kbd></button>';
  h+='</div><div class="scenewrap" id="sw"><div class="scene'+(final?" final":"")+'" id="scene" data-key="'+S.seed+":"+room.id+":"+(final?"f":"p")+'">'+room.svg;
  if(!final)h+=D.hotspots.filter(x=>x.sala===room.id).map(hsHTML).join("");
  if(DEBUG)h+='<output class="dbgxy" id="dbgxy">x, y</output>';
  h+='</div></div><p class="keys pan">Arraste a cena para os lados para explorar.</p><div class="dlg" id="dlg" role="status" aria-live="polite"></div>';
  if(final){
    h+='<div class="fim"><h2>'+IC("trophy")+'Caso resolvido</h2><div class="carimbo v">Arquivado</div><p class="story">'+D.final.texto+"</p><p><b>"+SEEDS[S.seed].nome+"</b><br>"+IC("medal")+"Pontuação: <b>"+S.score+"</b> · "+IC("heart")+"Vida: "+S.hp+"/"+MAXHP+"<br>"+IC("clock")+"Tempo total: <b>"+fmt(S.t)+"</b> · "+IC("flag")+"Melhor: "+fmt(bestOf(S.seed))+"<br>"+modeTag()+'</p>'+weak().html+'<button class="btn stamp" id="again">'+IC("folder")+"Escolher outro caso</button></div>";
  }
  g.innerHTML=h;
  g.querySelectorAll(".hs").forEach(b=>b.onclick=()=>hsClick(+b.dataset.k));
  g.querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>{S.room=b.dataset.room;save();render()});
  if($("hlt"))$("hlt").onclick=flashAll;
  if(final)$("again").onclick=reset;
  const sc0=$("scene");sc0.classList.add("nt");paintScene();   /* 1ª pintura sem transição */
  requestAnimationFrame(()=>requestAnimationFrame(()=>sc0.classList.remove("nt")));
  const w=$("sw");w.scrollLeft=(w.scrollWidth-w.clientWidth)/2;
  if(DEBUG){   /* coordenadas no sistema da arte (1600×900); clique fora de hotspot registra no console */
    const xy=e=>{const r=sc0.getBoundingClientRect();return [Math.round((e.clientX-r.left)/r.width*1600),Math.round((e.clientY-r.top)/r.height*900)]};
    sc0.addEventListener("pointermove",e=>{$("dbgxy").textContent=xy(e).join(", ")});
    sc0.addEventListener("click",e=>{if(!e.target.closest(".hs"))console.log("[debug] cena "+SID[S.seed]+"/"+room.id+" ponto",xy(e).join(","))});
  }
  if(final){dlgSeed=S.seed;say("Detetive",D.final.fala)}
  else if(dlgSeed!==S.seed){dlgSeed=S.seed;say("Detetive",D.intro)}
  else paintDlg();
}
function paintScene(){
  const D=scn(),s=$("scene");if(!s)return;
  const R=S.solved;
  s.querySelectorAll(".hs").forEach(b=>{
    const k=+b.dataset.k,h=D.hotspots.find(x=>x.caso===k),ok=R.includes(k),av=!ok&&isAv(S,k);
    b.classList.remove("av","lk","ok");b.classList.add(ok?"ok":av?"av":"lk");
    b.setAttribute("aria-label",h.nome+(ok?" — resolvido, rever o dossiê":av?" — disponível":" — bloqueado"));
    b.setAttribute("aria-disabled",ok||av?"false":"true");
    b.querySelector(".mk").innerHTML=IC(ok?"check":av?"search":"lock");
  });
  s.querySelectorAll("[data-on]").forEach(e=>{e.style.opacity=R.includes(+e.dataset.on)?1:0});
  s.querySelectorAll("[data-off]").forEach(e=>{e.style.opacity=R.includes(+e.dataset.off)?0:1});
}
function ensureScene(){
  const D=scn(),room=D.salas.find(r=>r.id===S.room)||D.salas[0],s=$("scene");
  if(!s||s.dataset.key!==S.seed+":"+room.id+":p")buildScene(false);
  paintScene();
}
let fl1=null;
function flashAll(){
  const s=$("scene");if(!s)return;
  s.classList.remove("hint");void s.offsetWidth;s.classList.add("hint");
  clearTimeout(fl1);fl1=setTimeout(()=>s.classList.remove("hint"),2400);sfx("key");
}
function flashOne(k){
  const b=$("hs"+k);if(!b)return;
  b.scrollIntoView({block:"nearest",inline:"center",behavior:"smooth"});
  b.classList.add("flash");setTimeout(()=>b.classList.remove("flash"),2400);
}
function hsClick(k){
  if(S.over||S.fin)return;
  const D=scn(),h=D.hotspots.find(x=>x.caso===k);lastHS=k;
  if(S.solved.includes(k)){sfx("pick");say(h.quem||"Detetive",h.falaResolvido||"Já resolvido.");S.fc=k;save();render();return}
  if(!isAv(S,k)){sfx("lock");say("Detetive",h.falaBloqueado||"Ainda não consigo abrir isto.");return}
  sfx("pick");say("Detetive",h.falaAbrir||"Vamos ver o que isto esconde.");
  S.open=k;S.sel=null;save();render();
}

/* ---- problema (painel sobre a cena ou card linear) ---- */
function puzzleHTML(P,i,modal){
  const ta=!!S.ta,d=ta?{h:0,w:0}:hsd(i),b=P.d==="b"&&!ta,df=DIF[P.d],sv=!modal&&S.sv&&!ta,H=modal?scn().hotspots.find(x=>x.caso===i):null;
  let h='<div class="cs'+(b?" boss":"")+'">'+(b?'<div class="carimbo suspeito">Suspeito principal</div>':"")+'<div class="fase">'+IC(ta?"clock":modal?"pin":"folder")+(ta?"Time Attack · questão "+(S.ta.n+S.ta.w+1)+" · "+SEEDS[S.ta.q.s].nome:modal?H.nome+" · Pista "+(i+1)+" de "+N:"Fase "+(i+1)+" de "+N)+' <span class="dif d-'+P.d+'">'+df[0]+" "+df[1]+"</span></div><h2>"+IC("eye")+P.t+"</h2>"+(P.s?'<div class="story">'+M(P.s)+"</div>":"")+'<div class="q">'+IC("search")+M(P.q)+"</div>";
  if(P.tool&&!ta&&!sv&&typeof TOOLS2D!=="undefined"&&TOOLS2D[P.tool])
    h+='<div class="trow"><button type="button" class="btn cyan sm" id="tlb" aria-expanded="false" aria-controls="tool">'+IC("eye")+"Abrir ferramenta: "+TOOLS2D[P.tool].nome+'</button></div><div class="tool" id="tool" hidden></div>';
  if(P.type==="choice"){
    h+='<div class="opts" role="group" aria-label="Alternativas">'+P.o.map((o,k)=>'<button class="btn opt" data-k="'+k+'" aria-pressed="'+(S.sel===k)+'"'+(sv?" disabled":"")+">"+String.fromCharCode(65+k)+") "+M(o)+"</button>").join("")+"</div>";
    if(!sv)h+='<p class="keys">Atalhos: teclas A–D (ou 1–4) escolhem · Enter analisa'+(modal?" · Esc volta à cena":"")+"</p>";
  }
  else{
    const n=[].concat(P.a).length;
    h+='<div class="row"><input id="ans" data-n="'+n+'" inputmode="decimal" aria-label="Sua resposta" aria-describedby="fmt pv" placeholder="'+(n>1?"Ex.: "+Array.from({length:n},(_,k)=>k+1).join(","):"Ex.: 7 ou 1/2")+'" autocomplete="off" autocapitalize="off" spellcheck="false"'+(sv?" disabled":"")+'></div>'+
      (sv?"":'<div class="symbar" role="toolbar" aria-label="Símbolos para a resposta">'+[["-","−","sinal de menos"],["/","/","fração"],[";",";","ponto e vírgula"],[",",",","vírgula"]].map(b=>'<button type="button" class="btn sm sym" data-ins="'+b[0]+'" aria-label="'+b[2]+'">'+b[1]+"</button>").join("")+"</div>")+
      '<p class="pv" id="pv" aria-live="polite"></p>'+
      '<p class="fmt" id="fmt">'+(n>1?"Resposta com "+n+" números separados por vírgula. Com decimais, use ponto (1.5) ou separe por ponto e vírgula: 2; 1,5.":"Decimais: 1.5 ou 1,5. Frações: 1/2.")+"</p>";
  }
  if(!sv)h+='<div class="row"><button class="btn stamp" id="chk">'+IC("search")+'Analisar resposta</button>'+(ta?"":'<button class="btn cyan" id="hb"'+(d.h>=2?" disabled":"")+">"+IC("bulb")+"Pedir dica"+(INV()?"":" (−"+HINT+" HP)")+"</button>")+(modal?'<button class="btn" id="bk">'+IC("eye")+"Voltar à cena</button>":"")+"</div>";
  if(modal&&iqMsg&&b)h+='<p class="iqok">'+IC("check")+iqMsg+"</p>";
  for(let k=0;k<d.h;k++)h+='<div class="hint">'+IC("bulb")+M(P.h[k])+"</div>";
  h+='<div id="fb" role="status">'+(sv?'<span class="carimbo v">Acertou!</span> <span class="good">+'+S.last+" pts · +"+HEAL+' HP</span><div class="row"><button class="btn" id="rv">'+IC("note")+'Rever dossiê</button><button class="btn stamp" id="nx">'+nextLabel()+"</button></div>":"")+"</div></div>";
  return h;
}
function renderPuzzle(box,i,modal){
  if(typeof V3!=="undefined")setTimeout(()=>V3.gc());   /* visualização 3D que saiu da tela libera a GPU */
  /* preserva o que foi digitado quando render() roda por dica/erro no mesmo problema */
  if(modal&&iqPending(i)){
    qk="";box.innerHTML=iqHTML(i);
    box.querySelectorAll(".iqopt").forEach(b=>b.onclick=()=>iqPick(+b.dataset.k));
    $("bk").onclick=closePz;return;
  }
  const key=S.ta?"ta:"+S.ta.q.s+":"+S.ta.q.i+":"+S.ta.q.rs:S.seed+":"+i,keep=($("ans")&&qk===key)?$("ans").value:"";
  box.innerHTML=puzzleHTML(S.ta?cur():caseAt(i),i,modal);
  if(!modal&&enter){const c=box.firstElementChild;if(c)c.classList.add("enter");enter=false}
  box.querySelectorAll(".opt").forEach(x=>x.onclick=()=>{S.sel=+x.dataset.k;sfx("key");save();render();const c=$("chk");if(c)c.focus()});
  const a=$("ans");
  box.querySelectorAll(".sym").forEach(b=>{b.onpointerdown=e=>e.preventDefault();b.onclick=()=>ins(b.dataset.ins)});
  if(a){if(keep){a.value=keep;a.setSelectionRange(keep.length,keep.length)}a.oninput=()=>{sfx("key");preview()};preview();a.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();check()}};a.focus()}
  qk=key;
  if($("tlb"))bindTool(caseAt(i),key);
  if($("chk"))$("chk").onclick=check;
  if($("hb"))$("hb").onclick=hint;
  if($("bk"))$("bk").onclick=closePz;
  if($("rv"))$("rv").onclick=()=>{S.fc=S.open;save();render()};
  if($("nx"))$("nx").onclick=next;
}

/* ---- ferramentas geométricas (tools2d.js): estado por fase, sobrevive aos re-render ---- */
const toolSt={};
function bindTool(P,key){
  const b=$("tlb"),el=$("tool"),st=toolSt[key]||(toolSt[key]={open:!!P.toolOpen});
  const mount=()=>{
    TOOLS2D[P.tool].ui(el,P.tp(P),st,v=>{
      sfx("ok");
      if(P.type==="choice"){S.sel=P.o.indexOf(v);save();render();const c=$("chk");if(c)c.focus();return}
      const a=$("ans");a.value=[].concat(v).map(x=>String(Math.round(x*1e6)/1e6)).join(",");preview();
      msg('<span class="good">'+IC("check")+"Resultado da ferramenta no campo de resposta. Confira e analise.</span>",1);$("chk").focus();
    });
  };
  const show=on=>{
    if(!on&&typeof V3!=="undefined"&&V3.active&&el.contains(V3.active.host)){V3.active.dispose();V3.active=null;el.innerHTML=""}   /* fecha: libera a GPU */
    st.open=on;el.hidden=!on;b.setAttribute("aria-expanded",on);b.innerHTML=IC("eye")+(on?"Fechar ferramenta":"Abrir ferramenta: "+TOOLS2D[P.tool].nome);if(on&&!el.firstChild)mount()};
  b.onclick=()=>{sfx("key");show(!st.open);if(st.open){const sv=el.querySelector("svg");if(sv)sv.focus()}};
  if(st.open)show(true);
}
/* teste de fumaça: leva a ferramenta ao alvo e remonta */
function toolAuto(){const P=cur(),st=toolSt[qk];if(!P.tool||!st)return false;TOOLS2D[P.tool].solve(P.tp(P),st);$("tool").innerHTML="";st.open=false;$("tlb").click();return true}

/* ---- interrogatório por contradição (antes do problema do chefão) ---- */
let iqMsg="";
const IQ_ZOMBA=["O suspeito ri: “Essa pista não prova nada.”","“Detetive, isso nem tem a ver com o que eu disse.”","Ele cruza os braços: “Tente outra vez.”"];
const iqList=()=>{const D=scn();return D&&D.interrogatorio||[]};
const iqPending=i=>!S.ta&&!!scn()&&caseAt(i).d==="b"&&S.iq<iqList().length;
function iqHTML(i){
  const L=iqList(),dep=L[S.iq],H=scn().hotspots.find(x=>x.caso===i),sd=SEEDS[S.seed];
  return '<div class="cs boss iq"><div class="carimbo suspeito">Interrogatório</div><div class="fase">'+IC("pin")+H.nome+" · Depoimento "+(S.iq+1)+" de "+L.length+"</div>"+
    "<h2>"+IC("eye")+"Confronto com o suspeito</h2>"+(iqMsg?'<p class="iqok">'+IC("check")+iqMsg+"</p>":"")+
    '<blockquote class="dep"><span class="who">Suspeito</span>“'+M(dep.fala)+"”</blockquote>"+
    '<p class="q">'+IC("search")+"Apresente a pista do inventário que desmente o depoimento.</p><div id=\"fb\" role=\"status\"></div>"+
    '<div class="opts iqopts" role="group" aria-label="Pistas do inventário">'+S.solved.filter(k=>k!==i).sort((a,b)=>a-b).map(k=>'<button class="btn opt iqopt" data-k="'+k+'"><b>'+sd.casos[k].t+"</b> <small>"+FL[sd.casos[k].k].k+"</small></button>").join("")+"</div>"+
    '<div class="row"><button class="btn" id="bk">'+IC("eye")+"Voltar à cena</button></div></div>";
}
function iqPick(k){
  const dep=iqList()[S.iq];
  if(k===dep.pista){
    S.iq++;iqMsg=dep.refuta;sfx("ok");say("Detetive",dep.refuta);save();render();anim("folder","ok");
    const f=document.querySelector("#pzb .iqopt")||$("ans")||$("chk");if(f)f.focus();
  }else{
    hsd(S.open).w++;sfx("no");damage(HIT);
    if(!S.over)msg(IQ_ZOMBA[Math.floor(Math.random()*IQ_ZOMBA.length)]+(INV()?"":" (−"+HIT+" HP)"));
  }
}

/* ---- resumo final: conceitos com mais erros e dicas ---- */
function weak(){
  const c={};
  for(const k in S.hs){const e=S.hs[k],P=SEEDS[S.seed].casos[k];if(!P||!(e.w||e.h))continue;
    const n=FL[P.k].k,x=c[n]||(c[n]={w:0,h:0});x.w+=e.w;x.h+=e.h}
  const l=Object.keys(c).sort((a,b)=>(c[b].w*2+c[b].h)-(c[a].w*2+c[a].h)).slice(0,3);
  const pl=(n,u)=>n+" "+u+(n>1?"s":"");
  return {txt:l.length?"Revise: "+l.map(n=>n+" ("+[c[n].w&&pl(c[n].w,"erro"),c[n].h&&pl(c[n].h,"dica")].filter(Boolean).join(", ")+")").join(" · ")+".":"Sem erros nem dicas: domínio completo.",
    html:'<p class="weak">'+IC(l.length?"bulb":"check")+(l.length?"<b>Revise:</b> "+l.map(n=>n+' <span class="wn">('+[c[n].w&&pl(c[n].w,"erro"),c[n].h&&pl(c[n].h,"dica")].filter(Boolean).join(", ")+")</span>").join(" · "):"Sem erros nem dicas: domínio completo.")+"</p>"};
}

/* ---- dossiê ---- */
function fillFC(i){
  const P=caseAt(i),f=FL[P.k],D=scn(),H=D&&D.hotspots.find(x=>x.caso===i);
  $("fcb").innerHTML="<h3>"+IC("note")+"Dossiê · Folha de anotações</h3>"+
    (H&&H.pista?'<p class="clue"><span class="lb">Achado na cena · '+H.nome+"</span>"+H.pista+"</p>":"")+
    '<p class="concept"><span class="lb">Conceito-chave</span>'+f.k+"</p>"+
    '<p class="tip"><span class="lb">Dica de prova</span>'+M(f.p)+"</p>"+
    '<p class="case"><span class="lb">Neste caso</span>'+M(P.e)+"</p>";
  $("fcn").innerHTML=nextLabel();
}

/* ---- modos ---- */
const modeTag=()=>'<span class="mtag">'+IC(INV()?"book":"heart")+"Modo "+(INV()?"Investigador":"Detetive")+"</span>";
const paintTaBar=()=>{$("pf").style.width=(S.ta.left/TA_MS*100)+"%";$("pb").setAttribute("aria-valuenow",Math.round(S.ta.left/TA_MS*100))};
function taPick(){
  const t=S.ta,ok=TA_POOL.filter(p=>!(t.q&&p[0]===t.q.s&&p[1]===t.q.i)),p=ok[Math.floor(Math.random()*ok.length)];
  t.q={s:p[0],i:p[1],rs:newRs()};
}
function taStart(){
  S=Object.assign(fresh(),{snd:S.snd,pmode:S.pmode,ta:{left:TA_MS,score:0,n:0,w:0,end:false,q:null}});
  taPick();tk=Date.now();qk="";save();render();
}
function taEnd(){
  S.ta.end=true;S.ta.left=0;
  if(best["@ta"]==null||S.ta.score>best["@ta"])best["@ta"]=S.ta.score;
  save();render();sfx("win");
}
function renderTA(g){
  const t=S.ta;
  setH($("sc"),IC("medal")+t.score+" pts");$("tm").textContent=fmt(t.left);paintTaBar();
  $("hpf").style.width="100%";$("hpf").className="hpf";$("hpt").textContent="—";
  $("folder").dataset.label="Time Attack · 3 minutos";
  const sig="ta|"+t.n+"|"+t.w+"|"+t.end+"|"+best["@ta"];
  if(sig!==invSig){invSig=sig;$("inv").innerHTML='<li class="cl"><b>'+IC("check")+"Acertos: "+t.n+"</b>Cada acerto vale de "+TA_PTS.f+" a "+TA_PTS.b+" pontos, pela dificuldade.</li>"+
    '<li class="cl"><b>'+IC("clock")+"Erros: "+t.w+"</b>Cada erro tira "+TA_PEN/1000+" segundos.</li>"+
    '<li class="cl"><b>'+IC("flag")+"Recorde: "+(best["@ta"]||0)+" pts</b>Problemas sorteados de todos os casos.</li>"}
  if(t.end){
    qk="";
    g.innerHTML='<div class="fim"><h2>'+IC("clock")+'Tempo esgotado</h2><div class="carimbo v">Time Attack</div><p>'+IC("medal")+"Pontuação: <b>"+t.score+"</b> · "+IC("check")+"Acertos: "+t.n+" · Erros: "+t.w+"<br>"+IC("flag")+"Recorde: <b>"+(best["@ta"]||0)+"</b></p>"+
      '<div class="row" style="justify-content:center"><button class="btn stamp" id="tagain">'+IC("reset")+'Jogar de novo</button><button class="btn" id="again">'+IC("folder")+"Escolher outro modo</button></div></div>";
    $("tagain").onclick=taStart;$("again").onclick=reset;return;
  }
  renderPuzzle(g,0,false);
}

/* ---- render principal ---- */
let invSig=null;
function render(){
  ["pz","fc"].forEach(id=>{if(S.ta&&$(id).classList.contains("on"))closeM(id,false)});
  if(S.ta){renderTA($("game"));return}
  setH($("sc"),IC("medal")+S.score+" pts");
  $("tm").textContent=fmt(S.t);
  setH($("snd"),IC(S.snd?"sound":"mute")+'<span class="t">'+(S.snd?"Áudio":"Mudo")+"</span>");
  $("hpf").style.width=S.hp+"%";
  $("hpf").className="hpf"+(S.hp<=30?" low":S.hp<=60?" mid":"");
  $("hpt").textContent=S.seed!==null&&INV()?"Sem dano":S.hp+"/"+MAXHP;$("hp").setAttribute("aria-valuenow",S.hp);
  const sd=S.seed===null?null:SEEDS[S.seed],D=scn(),done=sd?S.solved.length:0;
  $("pf").style.width=(done/N*100)+"%";$("pb").setAttribute("aria-valuenow",done*10);
  $("folder").dataset.label="Caso nº 0417"+(sd?" · "+sd.nome:"");
  const sig=S.seed+"|"+S.solved.join(",");   /* refaz o inventário só quando muda */
  if(sig!==invSig){invSig=sig;
  $("inv").innerHTML=sd?Array.from({length:N},(_,k)=>S.solved.includes(k)?'<li class="cl"><button class="rl" data-k="'+k+'"><b>'+IC("pin")+sd.casos[k].t+"</b>"+FL[sd.casos[k].k].k+"</button></li>":'<li class="cl lk">'+IC("lock")+"Pista "+(k+1)+" oculta</li>").join(""):'<li class="cl lk">'+IC("lock")+"Escolha uma investigação.</li>";
  $("inv").querySelectorAll(".rl").forEach(b=>b.onclick=()=>relic(+b.dataset.k));
  }

  /* qual modal deve estar aberto (o estado manda; recarregar a página restaura) */
  const want=(!sd||S.over||S.fin)?null:(S.fc!==null?"fc":(D&&S.open!==null?"pz":null));
  ["pz","fc"].forEach(id=>{if($(id).classList.contains("on")&&want!==id){closeM(id,false);
    if(id==="pz"){$("pzb").innerHTML="";if(typeof V3!=="undefined")V3.gc()}}});   /* painel fechado: libera ferramentas e a GPU */

  const g=$("game");
  if(!sd){
    qk="";$("pzb").innerHTML="";
    const pm=S.pmode,bt=(k,m)=>bestOf(k,m)!=null?fmt(bestOf(k,m)):null;
    g.innerHTML='<h2>'+IC("folder")+'Escolha a investigação</h2><p class="story">Cada caso tem 10 pistas. O cronômetro começa ao abrir o arquivo.</p>'+
      '<div class="modes" role="radiogroup" aria-label="Modo de jogo">'+[["det","heart","Detetive","Erros e dicas custam vida"],["inv","book","Investigador","Sem perda de vida · pontos pela metade"]].map(m=>'<button class="btn mode" role="radio" data-m="'+m[0]+'" aria-checked="'+(pm===m[0])+'">'+IC(m[1])+"<b>"+m[2]+"</b><small>"+m[3]+"</small></button>").join("")+"</div>"+
      '<div class="opts">'+SEEDS.map((s,k)=>'<button class="btn seedc" data-k="'+k+'"><b>'+s.ic+" "+s.nome+"</b><br><small>"+s.intro+" · "+(hasScene(k)?IC("search")+"Point and click":"Modo linear")+(bt(k,"det")?" · "+IC("flag")+"Detetive: "+bt(k,"det"):"")+(bt(k,"inv")?" · "+IC("flag")+"Investigador: "+bt(k,"inv"):"")+"</small></button>").join("")+
      '<button class="btn seedc ta" id="tab"><b>'+IC("clock")+'Time Attack</b><br><small>3 minutos de problemas sorteados de todos os casos, sem vida. Erro tira '+TA_PEN/1000+" s."+(best["@ta"]!=null?" · "+IC("flag")+"Recorde: "+best["@ta"]+" pts":"")+"</small></button></div>";
    g.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{S.pmode=b.dataset.m;sfx("key");save();render();const f=g.querySelector('.mode[data-m="'+S.pmode+'"]');if(f)f.focus()});
    $("tab").onclick=taStart;
    g.querySelectorAll(".seedc[data-k]").forEach(b=>b.onclick=()=>{
      S=Object.assign(fresh(),{snd:S.snd,pmode:S.pmode,mode:S.pmode,seed:+b.dataset.k,rs:newRs()});
      const Dn=sceneAt(S.seed);if(Dn)S.room=Dn.salas[0].id;else S.open=0;
      tk=Date.now();dlgSeed=null;lastHS=null;save();render();
    });
    return;
  }
  if(S.over){
    qk="";$("pzb").innerHTML="";
    g.innerHTML='<div class="fim"><h2>'+IC("skull")+'Investigação fracassada</h2><div class="carimbo">Detetive fora de combate</div><p>Sua vida chegou a zero ('+sd.nome+"). Pistas coletadas: "+S.solved.length+" de "+N+" · Pontuação: "+S.score+" · "+IC("clock")+fmt(S.t)+'.</p><button class="btn stamp" id="again">'+IC("reset")+'Reiniciar investigação</button></div>';
    $("again").onclick=reset;return;
  }
  if(S.fin){
    qk="";$("pzb").innerHTML="";
    if(D){buildScene(true);paintScene();return}
    g.innerHTML='<div class="fim"><h2>'+IC("trophy")+'Caso resolvido</h2><div class="carimbo v">Arquivado</div><p><b>'+sd.nome+"</b><br>"+IC("medal")+"Pontuação: <b>"+S.score+"</b> · "+IC("heart")+"Vida: "+S.hp+"/"+MAXHP+"<br>"+IC("clock")+"Tempo total: <b>"+fmt(S.t)+"</b> · "+IC("flag")+"Melhor: "+fmt(bestOf(S.seed))+"<br>"+modeTag()+'</p>'+weak().html+'<button class="btn stamp" id="again">'+IC("folder")+"Escolher outro caso</button></div>";
    $("again").onclick=reset;return;
  }
  if(D)ensureScene();
  else{
    if(S.open===null){const u=firstUn(S);if(u===null){finish();return}S.open=u}
    renderPuzzle(g,S.open,false);
  }
  if(want==="pz"){
    if(!$("pz").classList.contains("on"))openM("pz","pzp");
    renderPuzzle($("pzb"),S.open,true);
  }
  if(want==="fc"){
    fillFC(S.fc);
    if(!$("fc").classList.contains("on"))openM("fc","fcn");
  }
}

/* ---- ações ---- */
function relic(k){
  if(S.over||S.fin)return;
  if(scn()){const h=scn().hotspots.find(x=>x.caso===k);lastHS=k;flashOne(k);say("Detetive","Esta pista veio de: "+h.nome+".")}
  else{S.fc=k;save();render()}
}
function closePz(){S.open=null;S.sel=null;iqMsg="";save();render();backFocus();if(typeof V3!=="undefined")V3.gc()}
function dismissFC(){if(scn())next();else{S.fc=null;save();render()}}
function damage(n){
  if(!INV())S.hp=Math.max(0,S.hp-n);   /* Investigador: erros e dicas contam no resumo, mas não ferem */
  if(S.hp===0){S.over=true;S.open=null;S.fc=null;sfx("lose")}
  save();render();anim("folder","hit");
}
function hint(){const d=hsd(S.open);if(d.h>=2)return;d.h++;sfx("hint");damage(HINT)}
function check(){
  const P=cur(),i=S.open;let ok;
  if(S.ta&&S.ta.end)return;
  if(P.type==="choice"){if(S.sel===null)return msg("Escolha uma alternativa antes de analisar.");ok=S.sel===P.a}
  else{const a=[].concat(P.a),r=parse($("ans").value,a.length);
    if(r.amb)return msg("Ambíguo: com vírgula decimal, separe os números com ponto e vírgula (ex.: 2; 1,5).");
    if(r.bad)return msg("Formato inválido. Exemplos: 5,6 · 1/2 · 2; 1,5.");
    ok=r.v.length===a.length&&r.v.every((x,k)=>Math.abs(x-a[k])<1e-6)}
  if(S.ta){
    const t=S.ta;
    if(ok){t.score+=TA_PTS[P.d]||100;t.n++;taPick();qk="";sfx("ok");save();render();anim("folder","ok");msg('<span class="good">✔ +'+(TA_PTS[P.d]||100)+" pts. Próxima!</span>",1)}
    else{t.w++;t.left=Math.max(0,t.left-TA_PEN);sfx("no");anim("folder","hit");if(t.left<=0){taEnd();return}save();render();msg("✘ Resposta incorreta (−"+TA_PEN/1000+" s).")}
    return;
  }
  if(ok){
    S.last=pts();S.score+=S.last;S.hp=Math.min(MAXHP,S.hp+HEAL);S.solved.push(i);S.fc=i;S.sel=null;
    const D=scn();
    if(D){const h=D.hotspots.find(x=>x.caso===i);S.open=null;S.sv=false;say(h.quem||"Detetive",h.falaResolvido||"Pista conseguida.")}
    else S.sv=true;
    sfx("ok");save();render();anim("folder","ok");
  }else{
    hsd(i).w++;sfx("no");damage(HIT);
    if(!S.over)msg("✘ Resposta incorreta"+(INV()?"":" (−"+HIT+" HP)")+". Revise ou peça uma dica.");
  }
}
function msg(t,raw){const f=$("fb");if(f)f.innerHTML=raw?t:'<span class="bad">'+t+"</span>"}
function finish(){
  S.fin=true;S.open=null;S.fc=null;S.sv=false;
  const id=bkey(S.seed,S.mode);if(best[id]==null||S.t<best[id])best[id]=S.t;
  save();render();sfx("win");
  $("ovp").textContent=SEEDS[S.seed].nome+" (modo "+(INV()?"Investigador":"Detetive")+"): "+S.score+" pontos, "+(INV()?"":S.hp+" HP, ")+"tempo total "+fmt(S.t)+". "+weak().txt;
  openM("ov","ovb");
}
function next(){
  S.fc=null;
  if(S.solved.length>=N){finish();return}
  if(!scn()){S.open=firstUn(S);S.sel=null;S.sv=false;enter=true}
  save();render();
  if(scn())backFocus();
}
function reset(){
  const s=S.snd,pm=S.pmode;S=fresh();iqMsg="";S.snd=s;S.pmode=pm;qk="";dlgSeed=null;lastHS=null;invSig=null;
  if($("ov").classList.contains("on"))closeM("ov",false);
  save();render();
}

$("rs").onclick=()=>{if((S.seed===null&&!S.ta)||(S.ta&&S.ta.end)||confirm("Reiniciar e voltar à escolha de casos? O progresso atual será apagado."))reset()};
$("snd").onclick=()=>{S.snd=!S.snd;save();render()};
$("ovb").onclick=()=>closeM("ov",true);
$("fcn").onclick=next;
/* clicar no fundo: dossiê/painel fecham sem custo; o final só fecha o aviso */
$("ov").onclick=e=>{if(e.target===$("ov"))closeM("ov",true)};
$("fc").onclick=e=>{if(e.target===$("fc"))dismissFC()};
$("pz").onclick=e=>{if(e.target===$("pz"))closePz()};

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    if($("ov").classList.contains("on"))closeM("ov",true);
    else if($("fc").classList.contains("on"))dismissFC();
    else if($("pz").classList.contains("on"))closePz();
    return;
  }
  const m=document.querySelector(".ov.on");
  if(m&&e.key==="Tab"){ /* prende o Tab dentro do modal aberto */
    const f=[...m.querySelectorAll("button:not(:disabled),input:not(:disabled)")];if(!f.length)return;
    const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}
    else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}
    return;
  }
  if(e.ctrlKey||e.metaKey||e.altKey||S.seed===null||S.ta||S.over||S.fin)return;
  if(m&&m.id!=="pz")return;
  const t=e.target.tagName;if(t==="INPUT"||t==="TEXTAREA"||t==="SELECT")return;
  if(!m&&scn()&&e.key.toLowerCase()==="h"){flashAll();return}   /* destacar objetos */
  if(S.open===null||S.sv)return;
  const P=cur();if(P.type!=="choice")return;
  const k=e.key.length===1?("abcd".indexOf(e.key.toLowerCase())>=0?"abcd".indexOf(e.key.toLowerCase()):"1234".indexOf(e.key)):-1;
  if(k>=0&&k<P.o.length){S.sel=k;sfx("key");save();render();const c=$("chk");if(c)c.focus();return}
  if(e.key==="Enter"&&t!=="BUTTON"){e.preventDefault();check()}
});
render();
/* offline: service worker (só em http/https, fora do modo de depuração) */
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)&&!DEBUG)
  addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
