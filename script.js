"use strict";
/* ============ ESTADO E PERSISTÊNCIA ============ */
const KEY="caso-kernel-v3",BKEY="caso-kernel-best",MAXHP=100,HIT=10,HINT=20,HEAL=10,N=10;
const $=id=>document.getElementById(id);
/* Ícones SVG inline (sprite no index.html) no lugar dos emojis */
const IC=n=>'<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-'+n+'"/></svg>';
const DIF={f:["◆","Fácil"],m:["◆","Médio"],d:["◆","Difícil"],b:["◆","Chefão"]};
const fresh=()=>({seed:null,i:0,hp:MAXHP,score:0,h:0,w:0,sv:false,sel:null,last:0,clues:[],snd:true,over:false,fin:false,t:0});
const rd=(k,d)=>{try{return Object.assign(d,JSON.parse(localStorage.getItem(k)))}catch(e){return d}};
let S=rd(KEY,fresh()),best=rd(BKEY,{}),tk=Date.now(),qk="",enter=false;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S));localStorage.setItem(BKEY,JSON.stringify(best))}catch(e){}};
/* [seção 7, item 3] estado salvo inválido (ex.: cases.js editado) volta ao início em vez de quebrar */
const okState=s=>s.seed===null||(Number.isInteger(s.seed)&&!!SEEDS[s.seed]&&Number.isInteger(s.i)&&s.i>=0&&s.i<N&&!!SEEDS[s.seed].casos[s.i]);
if(!okState(S))S=Object.assign(fresh(),{snd:S.snd!==false});
S.clues=Array.isArray(S.clues)?S.clues.filter(k=>Number.isInteger(k)&&k>=0&&k<N):[];
const cur=()=>SEEDS[S.seed].casos[S.i];
const fmt=ms=>{const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};

/* ============ CRONÔMETRO ============ */
/* [item 4] pausa com a aba oculta; grava a cada ~5 s (e ao sair da página) */
let ticks=0;
setInterval(()=>{
  const n=Date.now();
  if(document.hidden){tk=n;return}
  if(S.seed!==null&&!S.over&&!S.fin){S.t+=n-tk;$("tm").textContent=fmt(S.t);if(++ticks%5===0)save()}
  tk=n;
},1000);
document.addEventListener("visibilitychange",()=>{tk=Date.now();if(document.hidden)save()});
addEventListener("pagehide",save);

/* ============ RENDERIZADOR MATEMÁTICO ============ */
function mth(e){
  e=e.replace(/mat\(([^)]*)\)/g,(_,b)=>'<span class="mx">'+b.split(";").map(r=>'<span class="r">'+r.split(",").map(c=>"<i>"+c.trim()+"</i>").join("")+"</span>").join("")+"</span>");
  return e.replace(/RR/g,"ℝ").replace(/->/g,"→")
    .replace(/\^\{([^}]*)\}/g,"<sup>$1</sup>").replace(/\^(-?\w+)/g,"<sup>$1</sup>").replace(/_(\w+)/g,"<sub>$1</sub>");
}
const M=s=>s.replace(/\$(.+?)\$/g,(_,e)=>'<span class="m">'+mth(e)+"</span>");

/* ============ ÁUDIO RETRÔ (Web Audio API) ============ */
let ac;
const ctx=()=>ac=ac||new(window.AudioContext||window.webkitAudioContext)();
function noise(t,d,v,fq){
  const c=ctx(),b=c.createBuffer(1,Math.floor(c.sampleRate*d),c.sampleRate),a=b.getChannelData(0);
  for(let k=0;k<a.length;k++)a[k]=(Math.random()*2-1)*(1-k/a.length);
  const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
  f.type="bandpass";f.frequency.value=fq;g.gain.value=v;s.buffer=b;
  s.connect(f);f.connect(g);g.connect(c.destination);s.start(c.currentTime+t);
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
    if(k==="hint"){noise(0,.04,.5,2500);noise(.1,.04,.5,3000);noise(.2,.04,.5,2200)}
    if(k==="ok"){noise(0,.08,.9,300);tone(110,0,.2,"triangle",.4);tone(1760,.3,.7,"sine",.15)}
    if(k==="no"){noise(0,.15,.9,200);tone(70,0,.3,"sawtooth",.3)}
    if(k==="win")[0,.15,.3,.45].forEach((t,i)=>tone(523*(1+i*.25),t,.4,"triangle",.2));
    if(k==="lose")[0,.25,.5].forEach((t,i)=>tone(220/(1+i*.3),t,.45,"sawtooth",.2));
  }catch(e){}
}

/* ============ MODAIS (foco, inert, fundo clicável) ============ */
/* [item 5] devolve o foco ao fechar, bloqueia o fundo com inert e prende o Tab no modal */
let ret=null;
const syncInert=()=>{const on=!!document.querySelector(".ov.on");["header","main"].forEach(s=>{document.querySelector(s).inert=on})};
function openM(id,f){if(!document.querySelector(".ov.on"))ret=document.activeElement;$(id).classList.add("on");syncInert();$(f).focus()}
function closeM(id,back){
  $(id).classList.remove("on");syncInert();
  if(back){const t=(id==="fc"&&$("rv"))||(id==="ov"&&$("again"))||ret;if(t&&t.focus&&document.contains(t))t.focus()}
  if(!document.querySelector(".ov.on"))ret=null;
}

/* ============ LÓGICA ============ */
/* [item 2] aceita o sinal de menos Unicode (− e –) ao colar respostas */
const parse=v=>v.replace(/[−–]/g,"-").replace(/[()\s]/g,"").split(/[;,]/).filter(Boolean).map(p=>{if(p.includes("/")){const[a,b]=p.split("/");return +a/+b}return +p});
const pts=()=>Math.max(100-10*S.h-5*S.w,10)+(cur().d==="b"?50:0);
const anim=(id,cls)=>{const el=$(id);el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)};
const nextLabel=()=>S.i+1<N?IC("folder")+"Próxima fase":IC("trophy")+"Encerrar caso";

function render(){
  /* [item 1] preserva o que foi digitado quando render() roda por dica/erro na mesma fase */
  const key=S.seed+":"+S.i,keep=($("ans")&&qk===key)?$("ans").value:"";
  $("sc").innerHTML=IC("medal")+S.score+" pts";
  $("tm").textContent=fmt(S.t);
  $("snd").innerHTML=IC(S.snd?"sound":"mute")+'<span class="t">'+(S.snd?"Áudio":"Mudo")+"</span>";
  $("hpf").style.width=S.hp+"%";
  $("hpf").className="hpf"+(S.hp<=30?" low":S.hp<=60?" mid":"");
  $("hpt").textContent=S.hp+"/"+MAXHP;$("hp").setAttribute("aria-valuenow",S.hp);
  const sd=S.seed===null?null:SEEDS[S.seed],done=sd?S.i+(S.sv||S.fin?1:0):0;
  $("pf").style.width=(done/N*100)+"%";$("pb").setAttribute("aria-valuenow",done*10);
  $("folder").dataset.label="Caso nº 0417"+(sd?" · "+sd.nome:"");
  $("inv").innerHTML=sd?Array.from({length:N},(_,k)=>S.clues.includes(k)?'<li class="cl"><b>'+IC("pin")+sd.casos[k].t+"</b>"+FL[sd.casos[k].k].k+"</li>":'<li class="cl lk">'+IC("lock")+"Pista "+(k+1)+" oculta</li>").join(""):'<li class="cl lk">'+IC("lock")+"Escolha uma investigação.</li>";
  const g=$("game");
  if(!sd){
    g.innerHTML='<h2>'+IC("folder")+'Escolha a investigação</h2><p class="story">Cada caso tem 10 fases. O cronômetro começa ao abrir o arquivo.</p><div class="opts">'+SEEDS.map((s,k)=>'<button class="btn seedc" data-k="'+k+'"><b>'+s.ic+" "+s.nome+"</b><br><small>"+s.intro+(best[k]!=null?" · "+IC("flag")+"Melhor tempo: "+fmt(best[k]):"")+"</small></button>").join("")+"</div>";
    g.querySelectorAll(".seedc").forEach(b=>b.onclick=()=>{S=Object.assign(fresh(),{snd:S.snd,seed:+b.dataset.k});tk=Date.now();save();render()});
    return;
  }
  if(S.over){
    g.innerHTML='<div class="fim"><h2>'+IC("skull")+'Investigação fracassada</h2><div class="carimbo">Detetive fora de combate</div><p>Sua vida chegou a zero na fase '+(S.i+1)+" de "+N+" ("+sd.nome+"). Pontuação: "+S.score+" · "+IC("clock")+fmt(S.t)+'.</p><button class="btn stamp" id="again">'+IC("reset")+'Reiniciar investigação</button></div>';
    $("again").onclick=reset;return;
  }
  if(S.fin){
    g.innerHTML='<div class="fim"><h2>'+IC("trophy")+'Caso resolvido</h2><div class="carimbo v">Arquivado</div><p><b>'+sd.nome+"</b><br>"+IC("medal")+"Pontuação: <b>"+S.score+"</b> · "+IC("heart")+"Vida: "+S.hp+"/"+MAXHP+"<br>"+IC("clock")+"Tempo total: <b>"+fmt(S.t)+"</b> · "+IC("flag")+"Melhor: "+fmt(best[S.seed])+'</p><button class="btn stamp" id="again">'+IC("folder")+'Escolher outro caso</button></div>';
    $("again").onclick=reset;return;
  }
  const P=cur(),b=P.d==="b",df=DIF[P.d];
  let h='<div class="cs'+(b?" boss":"")+'">'+(b?'<div class="carimbo suspeito">Suspeito principal</div>':"")+'<div class="fase">'+IC("folder")+"Fase "+(S.i+1)+" de "+N+' <span class="dif d-'+P.d+'">'+df[0]+" "+df[1]+"</span></div><h2>"+IC("eye")+P.t+"</h2>"+(P.s?'<div class="story">'+M(P.s)+"</div>":"")+'<div class="q">'+IC("search")+M(P.q)+"</div>";
  if(P.type==="choice"){
    h+='<div class="opts" role="group" aria-label="Alternativas">'+P.o.map((o,k)=>'<button class="btn opt" data-k="'+k+'" aria-pressed="'+(S.sel===k)+'"'+(S.sv?" disabled":"")+">"+String.fromCharCode(65+k)+") "+M(o)+"</button>").join("")+"</div>";
    if(!S.sv)h+='<p class="keys">Atalhos: teclas A–D (ou 1–4) escolhem · Enter analisa</p>';
  }
  else h+='<div class="row"><input id="ans" aria-label="Sua resposta" placeholder="Digite sua resposta" autocomplete="off"'+(S.sv?" disabled":"")+"></div>";
  if(!S.sv)h+='<div class="row"><button class="btn stamp" id="chk">'+IC("search")+'Analisar resposta</button><button class="btn cyan" id="hb"'+(S.h>=2?" disabled":"")+">"+IC("bulb")+"Pedir dica (−"+HINT+" HP)</button></div>";
  for(let k=0;k<S.h;k++)h+='<div class="hint">'+IC("bulb")+M(P.h[k])+"</div>";
  h+='<div id="fb" role="status">'+(S.sv?'<span class="carimbo v">Acertou!</span> <span class="good">+'+S.last+" pts · +"+HEAL+' HP</span><div class="row"><button class="btn" id="rv">'+IC("note")+'Rever dossiê</button><button class="btn stamp" id="nx">'+nextLabel()+"</button></div>":"")+"</div></div>";
  g.innerHTML=h;
  if(enter){const c=g.firstElementChild;if(c)c.classList.add("enter");enter=false}
  g.querySelectorAll(".opt").forEach(x=>x.onclick=()=>{S.sel=+x.dataset.k;sfx("key");save();render()});
  const a=$("ans");if(a){if(keep){a.value=keep;a.setSelectionRange(keep.length,keep.length)}a.oninput=()=>sfx("key");a.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();check()}};a.focus()}
  qk=key;
  if($("chk"))$("chk").onclick=check;
  if($("hb"))$("hb").onclick=hint;
  if($("rv"))$("rv").onclick=openFC;
  if($("nx"))$("nx").onclick=next;
}
function openFC(){
  const P=cur(),f=FL[P.k];
  $("fcb").innerHTML="<h3>"+IC("note")+"Dossiê · Folha de anotações</h3>"+
    '<p class="concept"><span class="lb">Conceito-chave</span>'+f.k+"</p>"+
    '<p class="tip"><span class="lb">Dica de prova</span>'+M(f.p)+"</p>"+
    '<p class="case"><span class="lb">Neste caso</span>'+M(P.e)+"</p>";
  $("fcn").innerHTML=nextLabel();openM("fc","fcn");
}
function damage(n){
  S.hp=Math.max(0,S.hp-n);
  if(S.hp===0){S.over=true;sfx("lose")}
  save();render();anim("folder","hit");
}
function hint(){if(S.h>=2)return;S.h++;sfx("hint");damage(HINT)}
function check(){
  const P=cur();let ok;
  if(P.type==="choice"){if(S.sel===null)return msg("Escolha uma alternativa antes de analisar.");ok=S.sel===P.a}
  else{const u=parse($("ans").value),a=[].concat(P.a);
    if(!u.length||u.some(isNaN))return msg("Formato inválido. Use números, por exemplo 5,6 ou 1/2.");
    ok=u.length===a.length&&u.every((x,k)=>Math.abs(x-a[k])<1e-6)}
  if(ok){
    S.last=pts();S.score+=S.last;S.hp=Math.min(MAXHP,S.hp+HEAL);S.clues.push(S.i);S.sv=true;
    sfx("ok");save();render();anim("folder","ok");openFC();
  }else{
    S.w++;sfx("no");damage(HIT);
    if(!S.over)msg("✘ Resposta incorreta (−"+HIT+" HP). Revise ou peça uma dica.");
  }
}
function msg(t){const f=$("fb");if(f)f.innerHTML='<span class="bad">'+t+"</span>"}
function next(){
  closeM("fc",false);
  if(S.i+1>=N){
    S.fin=true;if(best[S.seed]==null||S.t<best[S.seed])best[S.seed]=S.t;
    save();render();sfx("win");
    $("ovp").textContent=SEEDS[S.seed].nome+": "+S.score+" pontos, "+S.hp+" HP, tempo total "+fmt(S.t)+".";
    openM("ov","ovb");return;
  }
  S.i++;S.h=0;S.w=0;S.sv=false;S.sel=null;enter=true;save();render();
}
function reset(){const s=S.snd;S=fresh();S.snd=s;save();render()}

$("rs").onclick=()=>{if(S.seed===null||confirm("Reiniciar e voltar à escolha de casos? O progresso atual será apagado."))reset()};
$("snd").onclick=()=>{S.snd=!S.snd;save();render()};
$("ovb").onclick=()=>closeM("ov",true);
$("fcn").onclick=next;
/* [item 5] clicar no fundo fecha sem avançar de fase */
$("ov").onclick=e=>{if(e.target===$("ov"))closeM("ov",true)};
$("fc").onclick=e=>{if(e.target===$("fc"))closeM("fc",true)};

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){if($("ov").classList.contains("on"))closeM("ov",true);else if($("fc").classList.contains("on"))closeM("fc",true);return}
  /* prende o Tab dentro do modal aberto */
  const m=document.querySelector(".ov.on");
  if(m){
    if(e.key==="Tab"){
      const f=[...m.querySelectorAll("button:not(:disabled)")];if(!f.length)return;
      const a=f[0],z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}
      else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}
    }
    return;
  }
  /* [item 6] atalhos nas questões de múltipla escolha: A–D/1–4 escolhem, Enter analisa */
  if(e.ctrlKey||e.metaKey||e.altKey||S.seed===null||S.over||S.fin||S.sv)return;
  const P=cur();if(P.type!=="choice")return;
  const t=e.target.tagName;if(t==="INPUT"||t==="TEXTAREA")return;
  const j=e.key.length===1?("abcd".indexOf(e.key.toLowerCase())>=0?"abcd".indexOf(e.key.toLowerCase()):"1234".indexOf(e.key)):-1;
  if(j>=0&&j<P.o.length){S.sel=j;sfx("key");save();render();return}
  if(e.key==="Enter"&&t!=="BUTTON"){e.preventDefault();check()}
});
render();
