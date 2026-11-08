#!/usr/bin/env node
/* =====================================================================
   Teste de fumaça (Playwright):  node tools/smoke.js [--shots pasta] [--mobile]
   Para cada caso: escolhe o caso, erra uma vez (perde HP), pede uma dica,
   resolve todas as fases pela cena (ou no modo linear), recarrega no meio
   para conferir que o estado volta, e confere a tela final.
   Também falha se houver erro no console e mede tarefas longas (>50 ms).
   Requer o pacote playwright com o Chromium (npm i -D playwright && npx playwright install chromium).
   ===================================================================== */
"use strict";
const http=require("http"),fs=require("fs"),path=require("path");
const {chromium,devices}=require("playwright");
const ROOT=path.join(__dirname,"..");
const arg=k=>{const i=process.argv.indexOf(k);return i<0?null:(process.argv[i+1]||true)};
const SHOTS=arg("--shots"),MOBILE=!!arg("--mobile"),ONLY=arg("--case");
const TYPES={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".png":"image/png",".json":"application/json",".svg":"image/svg+xml"};

const server=http.createServer((q,r)=>{
  let f=decodeURIComponent(new URL(q.url,"http://x").pathname);if(f==="/")f="/index.html";
  const p=path.join(ROOT,f);
  if(!p.startsWith(ROOT)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);r.end();return}
  r.writeHead(200,{"Content-Type":TYPES[path.extname(p)]||"application/octet-stream"});fs.createReadStream(p).pipe(r);
});

const fail=m=>{throw new Error(m)};
const fmtAns=(a,dec)=>[].concat(a).map(v=>{
  if(Number.isInteger(v))return String(v);
  const s=String(+v.toFixed(6));return dec?s.replace(".",","):s;
}).join(dec?"; ":",");

(async()=>{
  await new Promise(r=>server.listen(0,r));
  const URL0="http://127.0.0.1:"+server.address().port+"/";
  const browser=await chromium.launch();
  const ctx=await browser.newContext(MOBILE?devices["Pixel 7"]:{viewport:{width:1280,height:900}});
  /* sem fontes externas no teste: não depende da rede */
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await ctx.addInitScript(()=>{
    window.__long=[];
    try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__long.push(Math.round(e.duration)))).observe({type:"longtask",buffered:true})}catch(e){}
  });
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error"&&!/fonts\.|ERR_FAILED|net::/.test(m.text()))errors.push(m.text())});
  const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+".png")})}};

  /* o jogo salva no pagehide; para começar limpo, bloqueia gravações antes de recarregar */
  const wipe=async seed=>{
    await page.evaluate(seed=>{const set=Storage.prototype.setItem;localStorage.clear();
      for(const k in seed||{})set.call(localStorage,k,seed[k]);Storage.prototype.setItem=function(){}},seed||null);
    await page.reload();
  };
  await page.goto(URL0);
  await wipe();
  const seeds=await page.evaluate(()=>SEEDS.map(s=>({id:s.id,nome:s.nome})));
  const report=[];

  for(let k=0;k<seeds.length;k++){
    const sd=seeds[k];
    if(ONLY&&ONLY!==sd.id)continue;
    await wipe();
    await page.evaluate(()=>{window.__long.length=0});
    await page.locator(".seedc").nth(k).click();
    const scene=await page.evaluate(()=>!!scn());
    await page.waitForSelector(scene?"#scene":"#game .cs");
    const openLong=await page.evaluate(()=>Math.max(0,...window.__long));
    await shot(sd.id+"-0-inicio");
    let solved=0,erred=false,hinted=false,reloaded=false,guard=0;
    while(solved<10){
      if(++guard>60)fail(sd.id+": laço sem progresso");
      if(scene){
        /* troca de sala se não houver hotspot disponível nesta */
        if(!(await page.locator(".hs.av").count())){
          const rooms=page.locator("[data-room]:not([aria-pressed=true])");
          if(!(await rooms.count()))fail(sd.id+": nenhum hotspot disponível e nenhuma outra sala");
          let found=false;
          for(let r=0;r<await rooms.count()&&!found;r++){await rooms.nth(r).click();found=(await page.locator(".hs.av").count())>0}
          if(!found)fail(sd.id+": nenhum hotspot disponível em nenhuma sala");
        }
        await page.locator(".hs.av").first().click();
        await page.waitForSelector("#pz.on");
      }
      /* interrogatório antes do chefão: no 1º caso, apresenta uma pista errada antes */
      let iqWrong=k===0;
      while(scene&&await page.locator("#pzb .iqopt").count()){
        const q=await page.evaluate(()=>({p:iqList()[S.iq].pista,iq:S.iq,hp:S.hp}));
        if(iqWrong){
          const other=await page.locator('#pzb .iqopt:not([data-k="'+q.p+'"])').first().getAttribute("data-k");
          await page.click('#pzb .iqopt[data-k="'+other+'"]');
          const hp=await page.evaluate(()=>S.hp);
          if(hp!==q.hp-await page.evaluate(()=>HIT)||await page.evaluate(()=>S.iq)!==q.iq)fail(sd.id+": pista errada no interrogatório não foi punida");
          await shot(sd.id+"-interrogatorio");
          iqWrong=false;
        }
        await page.click('#pzb .iqopt[data-k="'+q.p+'"]');
        await page.waitForFunction(n=>S.iq===n,q.iq+1);
      }
      if(scene&&await page.evaluate(()=>cur().d==="b"&&iqList().length&&S.iq<iqList().length))fail(sd.id+": chefão abriu sem interrogatório");
      const P=await page.evaluate(()=>{const c=cur();return {type:c.type,a:c.a,o:c.o,i:S.open,hp:S.hp,tool:c.tool||null}});
      const box=scene?"#pzb":"#game";
      if(!erred){ /* erra de propósito uma vez */
        if(P.type==="choice"){await page.locator(box+" .opt").nth((P.a+1)%P.o.length).click()}
        else await page.fill("#ans","999");
        await page.click("#chk");
        const hp=await page.evaluate(()=>S.hp);
        const HIT=await page.evaluate(()=>HIT);
        if(hp!==P.hp-HIT)fail(sd.id+": erro deveria custar "+HIT+" HP ("+P.hp+" -> "+hp+")");
        erred=true;
      }
      if(!hinted){
        const hp0=await page.evaluate(()=>S.hp);await page.click("#hb");
        if(!(await page.locator(box+" .hint").count()))fail(sd.id+": dica não apareceu");
        if(await page.evaluate(()=>S.hp)>=hp0)fail(sd.id+": dica não custou HP");
        hinted=true;
      }
      if(P.tool&&scene){ /* ferramenta geométrica: interação real (teclado ou controle deslizante) e "Usar resultado" */
        await page.click("#tlb");await page.waitForSelector("#tool #tuse");
        const info=await page.evaluate(()=>{const P=cur(),tp=P.tp(P);return {k:P.tool,tgt:TOOLS2D[P.tool].ans(tp),st:JSON.parse(JSON.stringify(toolSt[qk])),tp}});
        if(["det","orto","basis"].includes(info.k)){
          const c0=info.k==="basis"?info.st.c:info.st.x,dx=info.tgt[0]-c0[0],dy=info.tgt[1]-c0[1];
          await page.focus("#tool svg");
          for(let j=0;j<Math.abs(dx);j++)await page.keyboard.press(dx>0?"ArrowRight":"ArrowLeft");
          for(let j=0;j<Math.abs(dy);j++)await page.keyboard.press(dy>0?"ArrowUp":"ArrowDown");
        }else if(info.k==="eigen"||info.k==="conic"){
          const g=await page.evaluate(()=>{const P=cur(),st={};TOOLS2D[P.tool].solve(P.tp(P),st);return st.g});
          await page.locator("#tang").fill(String(g));
        }else if(info.k==="rref"){ /* escalona pela interface: "Sugerir passo" + "Aplicar" até a forma escalonada */
          for(let j=0;j<30&&await page.locator("#tuse[disabled]").count();j++){await page.click("#rsg");await page.click("#rap")}
          if(await page.evaluate(()=>toolSt[qk].hist.length)<1)fail(sd.id+": lupa sem operações aplicadas");
          await page.click("#rud");await page.click("#rsg");await page.click("#rap");   /* desfazer e refazer */
        }else await page.evaluate(()=>toolAuto());
        await page.waitForSelector("#tuse:not([disabled])",{timeout:3000}).catch(()=>fail(sd.id+": ferramenta "+info.k+" não chegou ao alvo na fase "+P.i));
        if(solved===0||info.k==="lsq"||info.k==="rref")await shot(sd.id+"-ferramenta-"+info.k);
        await page.click("#tuse");
        if(P.type==="choice"){if(await page.evaluate(()=>S.sel)!==P.a)fail(sd.id+": ferramenta "+info.k+" escolheu a alternativa errada")}
        else{const v=await page.evaluate(()=>{const a=cur().a;return parse($("ans").value,[].concat(a).length).v});
          if(JSON.stringify(v)!==JSON.stringify([].concat(P.a)))fail(sd.id+": ferramenta "+info.k+" entregou "+JSON.stringify(v)+" em vez de "+JSON.stringify(P.a))}
        report.push("  ferramenta "+info.k+" ("+sd.id+", fase "+P.i+"): ok");
      }
      else if(P.type==="choice"){await page.locator(box+" .opt").nth(P.a).click()}
      else{ /* alterna "3,1" e "3; 1" / vírgula decimal; no celular, símbolos pela barra */
        const txt=fmtAns(P.a,solved%2===1);
        if(MOBILE){
          await page.fill("#ans","");
          for(const ch of txt){
            if("-/;,".includes(ch))await page.click('.sym[data-ins="'+ch+'"]');
            else await page.locator("#ans").pressSequentially(ch);
          }
          if(await page.inputValue("#ans")!==txt)fail(sd.id+": barra de símbolos digitou '"+await page.inputValue("#ans")+"' em vez de '"+txt+"'");
        }else await page.fill("#ans",txt);
        if(await page.locator("#pv.warn").count())fail(sd.id+": prévia acusou problema em resposta válida '"+txt+"': "+await page.locator("#pv").innerText());
      }
      await page.click("#chk");
      await page.waitForSelector("#fc.on",{timeout:3000}).catch(async()=>{
        const fb=await page.locator("#fb").innerText().catch(()=>"");
        fail(sd.id+": resposta certa não foi aceita na fase "+P.i+" ("+fmtAns(P.a,solved%2===1)+") "+fb);
      });
      solved++;
      if(solved===1)await shot(sd.id+"-1-dossie");
      await page.click("#fcn");
      if(solved===5&&!reloaded){
        const before=await page.evaluate(()=>({n:S.solved.length,hp:S.hp,score:S.score}));
        await page.reload();
        await page.waitForSelector(scene?"#scene":"#game .cs");
        const after=await page.evaluate(()=>({n:S.solved.length,hp:S.hp,score:S.score}));
        if(JSON.stringify(before)!==JSON.stringify(after))fail(sd.id+": estado não voltou após recarregar "+JSON.stringify([before,after]));
        reloaded=true;
        await shot(sd.id+"-2-meio");
      }
    }
    await page.waitForSelector("#ov.on");
    const ovp=await page.locator("#ovp").innerText();
    if(!ovp.includes(sd.nome))fail(sd.id+": aviso final sem o nome do caso");
    await page.click("#ovb");
    const fim=await page.locator(".fim").innerText();
    if(!/Caso resolvido/.test(fim))fail(sd.id+": tela final ausente");
    await shot(sd.id+"-3-final");
    const st=await page.evaluate(()=>({hp:S.hp,score:S.score,fin:S.fin,best:JSON.parse(localStorage.getItem(BKEY))}));
    if(!st.fin||st.best[sd.id]==null)fail(sd.id+": recorde não foi salvo");
    report.push(sd.id+": ok ("+(scene?"cena":"linear")+", "+st.score+" pts, "+st.hp+" HP, maior tarefa ao abrir: "+openLong+" ms)");
  }

  /* modo Investigador: erro não tira vida e a pontuação cai pela metade */
  await wipe();
  await page.click('.mode[data-m="inv"]');
  await page.locator(".seedc[data-k]").first().click();
  await page.waitForSelector("#scene");
  await page.locator(".hs.av").first().click();await page.waitForSelector("#pz.on");
  {
    const P=await page.evaluate(()=>{const c=cur();return {type:c.type,a:c.a,o:c.o}});
    if(P.type==="choice")await page.locator("#pzb .opt").nth((P.a+1)%P.o.length).click();else await page.fill("#ans","999");
    await page.click("#chk");
    if(await page.evaluate(()=>S.hp)!==100)fail("Investigador: erro tirou vida");
    if(P.type==="choice")await page.locator("#pzb .opt").nth(P.a).click();else await page.fill("#ans",fmtAns(P.a,false));
    await page.click("#chk");await page.waitForSelector("#fc.on");
    const st=await page.evaluate(()=>({sc:S.score,m:S.mode,hp:S.hp,txt:$("hpt").textContent}));
    if(st.m!=="inv"||st.sc!==48||st.hp!==100||st.txt!=="Sem dano")fail("Investigador: estado inesperado "+JSON.stringify(st));
    await page.click("#fcn");
    await page.reload();
    if(await page.evaluate(()=>S.mode)!=="inv")fail("Investigador: modo não sobreviveu à recarga");
  }
  report.push("modo Investigador: ok");

  /* Time Attack: 3 acertos, 1 erro (−10 s), fim do tempo e recorde */
  await wipe();
  await page.click("#tab");
  await page.waitForSelector("#game .cs");
  for(let k=0;k<3;k++){
    const a=await page.evaluate(()=>cur().a);
    await page.fill("#ans",fmtAns(a,k===1));await page.click("#chk");
    await page.waitForFunction(n=>S.ta.n===n,k+1);
  }
  {
    const l0=await page.evaluate(()=>S.ta.left);
    await page.fill("#ans","999");await page.click("#chk");
    const t=await page.evaluate(()=>({w:S.ta.w,left:S.ta.left,score:S.ta.score}));
    if(t.w!==1||l0-t.left<10000||t.score<150)fail("Time Attack: placar inesperado "+JSON.stringify(t));
    await page.reload();
    if(await page.evaluate(()=>!S.ta||S.ta.n!==3))fail("Time Attack: estado não voltou após recarregar");
    await page.evaluate(()=>{S.ta.left=600});
    await page.waitForSelector("#tagain",{timeout:5000});
    const r=await page.evaluate(()=>({end:S.ta.end,best:best["@ta"],score:S.ta.score}));
    if(!r.end||r.best!==r.score)fail("Time Attack: recorde não salvo "+JSON.stringify(r));
    await shot("time-attack-fim");
  }
  report.push("Time Attack: ok");

  /* migração do save v4 (seed = índice) e dos recordes antigos */
  await wipe({"caso-kernel-v4":JSON.stringify({seed:1,hp:70,score:200,solved:[0,1],hs:{},open:null,room:null,snd:true,t:5000}),
    "caso-kernel-best":JSON.stringify({0:12000,2:9000})});
  const mig=await page.evaluate(()=>({id:SID[S.seed],hp:S.hp,n:S.solved.length,best:loadBest()}));
  if(mig.id!=="fantasma"||mig.hp!==70||mig.n!==2||mig.best.cofre!==12000||mig.best.dependencia!==9000)fail("migração v4 -> v5 falhou: "+JSON.stringify(mig));
  report.push("migração v4 -> v5: ok");

  /* parser de respostas */
  const pr=await page.evaluate(()=>[parse("3,1",2),parse("2; 1,5",2),parse("1,5",1),parse("2,1,5",2),parse("1/2",1),parse("(−1, 5)",2),parse("abc",1),parse("1/0",1)].map(r=>{delete r.raw;return r}));
  const want=[{v:[3,1]},{v:[2,1.5]},{v:[1.5]},{amb:true},{v:[.5]},{v:[-1,5]},{bad:true},{bad:true}];
  if(JSON.stringify(pr)!==JSON.stringify(want))fail("parser: "+JSON.stringify(pr));
  report.push("parser de respostas: ok");

  if(errors.length)fail("erros no console:\n  "+[...new Set(errors)].join("\n  "));
  await browser.close();server.close();
  console.log(report.join("\n")+"\n\nTeste de fumaça passou"+(MOBILE?" (mobile)":"")+".");
})().catch(async e=>{console.error("FALHOU: "+e.message);process.exit(1)});
