/* =====================================================================
   CENAS POINT AND CLICK (edite aqui). Carregado depois de cases.js.
   SCENES[idDoCaso] = ()=>cena (função, montada só quando o caso abre; id de SEEDS em cases.js).
   Ausente = modo linear (fallback).
   Cena: { intro, salas:[{id,nome,svg}], hotspots:[...], interrogatorio:[...], final:{texto,fala} }
   Interrogatório (antes do chefão): [{fala (depoimento falso), pista (índice da fase que o
              desmente), refuta (resposta do detetive)}], na ordem em que são feitos.
   Hotspot: { caso (0-9, índice da fase em cases.js), sala (id), nome,
              x,y,w,h (em % da cena; use box(px) numa arte 1600x900),
              requires:[índices de fases que precisam estar resolvidas],
              falaAbrir, falaBloqueado, falaResolvido, quem (quem fala ao resolver),
              pista (linha de cena exibida no dossiê) }
   Paralaxe: cada sala tem <g data-depth="0"> (fundo: paredes, piso), <g data-depth="1">
   (objetos e hotspots) e itens soltos data-depth="2" (frente, sem hotspot).
   Estados visuais da arte: elementos SVG com data-on="k" aparecem quando a fase k
   está resolvida; data-off="k" somem quando ela é resolvida (com transição).
   Arte original, estilo Art Déco noir (sem assets de terceiros).
   ===================================================================== */
const box=(x,y,w,h)=>({x:x/16,y:y/9,w:w/16,h:h/9});   /* px (viewBox 1600x900) -> % */

/* ---- peças comuns às cenas (p = prefixo dos ids da cena) ---- */
const SVG0='<svg class="art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false">';
const baseDefs=p=>`<linearGradient id="${p}Gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc8a"/><stop offset=".45" stop-color="#c9a232"/><stop offset=".7" stop-color="#e5c158"/><stop offset="1" stop-color="#8a6d1c"/></linearGradient>
 <radialGradient id="${p}Vig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></radialGradient>
 <radialGradient id="${p}Cu"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".6"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></radialGradient>
 <radialGradient id="${p}Cy"><stop offset="0" stop-color="#9be7ff" stop-opacity=".55"/><stop offset="1" stop-color="#4fc3f7" stop-opacity="0"/></radialGradient>
 <linearGradient id="${p}Cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c" stop-opacity=".5"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></linearGradient>
 <linearGradient id="${p}Beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9be7ff" stop-opacity=".4"/><stop offset="1" stop-color="#4fc3f7" stop-opacity="0"/></linearGradient>
 <pattern id="${p}Chev" width="80" height="44" patternUnits="userSpaceOnUse"><path d="M0 4L40 38L80 4" fill="none" stroke="#d4af37" stroke-opacity=".38"/></pattern>
 <filter id="${p}Glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
/* friso Art Déco no topo e pilastras laterais */
const frieze=(p,yb)=>`<rect width="1600" height="62" fill="#090e14"/><rect y="8" width="1600" height="44" fill="url(#${p}Chev)"/><rect y="60" width="1600" height="3" fill="url(#${p}Gold)"/>
<rect x="0" y="63" width="46" height="${yb-63}" fill="#0a1017"/><rect x="44" y="63" width="2" height="${yb-63}" fill="url(#${p}Gold)" opacity=".5"/>
<rect x="1554" y="63" width="46" height="${yb-63}" fill="#0a1017"/><rect x="1554" y="63" width="2" height="${yb-63}" fill="url(#${p}Gold)" opacity=".5"/>
<rect y="${yb-2}" width="1600" height="2" fill="url(#${p}Gold)" opacity=".6"/>`;
/* linhas de piso em perspectiva a partir de y0 */
const pFloor=(y0,c,o)=>{let s='<g stroke="'+c+'" stroke-opacity="'+o+'" fill="none">';
  for(let xb=-800;xb<=2400;xb+=200)s+='<line x1="'+(800+(xb-800)*.42).toFixed(0)+'" y1="'+y0+'" x2="'+xb+'" y2="900"/>';
  [.11,.26,.46,.73].forEach(f=>{const y=Math.round(y0+(900-y0)*f);s+='<line x1="0" y1="'+y+'" x2="1600" y2="'+y+'"/>'});return s+"</g>"};
const vig=p=>`<rect width="1600" height="900" fill="url(#${p}Vig)"/>`;
/* silhueta do suspeito (chapéu, ombros, olhos vermelhos) com a base em (cx,by) */
const suspect=(p,cx,by,s)=>`<g transform="translate(${cx} ${by}) scale(${s})">
 <ellipse cx="0" cy="-130" rx="95" ry="120" fill="url(#${p}Cu)"/>
 <path d="M-75 0C-75-62-30-80 0-82C30-80 75-62 75 0Z" fill="#05090e"/><circle cx="0" cy="-132" r="42" fill="#05090e"/>
 <ellipse cx="0" cy="-162" rx="64" ry="12" fill="#03060a"/><path d="M-48-162V-190Q0-206 48-190V-162Z" fill="#03060a"/>
 <g filter="url(#${p}Glow)"><circle cx="-16" cy="-134" r="5" fill="#ff5a4d"/><circle cx="16" cy="-134" r="5" fill="#ff5a4d"/></g></g>`;
const plaque=(p,cx,y)=>`<rect x="${cx-65}" y="${y}" width="130" height="28" fill="#0a1017" stroke="#d4af37"/><text x="${cx}" y="${y+20}" text-anchor="middle" font-family="Cinzel,serif" font-size="15" fill="#e5c158" letter-spacing="3">SUSPEITO</text>`;
/* estante: lombadas pseudoaleatórias (reprodutíveis) entre x0 e x1, apoiadas em y */
const books=(x0,x1,y,h,seed)=>{let s="",x=x0,r=seed;const nx=()=>(r=(r*9301+49297)%233280)/233280;
  const cs=["#3a1d24","#1d2a3a","#2a2236","#3a2e1a","#18302a","#2b1a2e"];
  while(true){const w=14+Math.floor(nx()*16),hh=h-6-Math.floor(nx()*26),c=cs[Math.floor(nx()*cs.length)];
    if(x+w>x1)break;
    s+='<rect x="'+x+'" y="'+(y-hh)+'" width="'+(w-2)+'" height="'+hh+'" fill="'+c+'"/>';
    if(nx()<.35)s+='<rect x="'+x+'" y="'+(y-hh+10)+'" width="'+(w-2)+'" height="3" fill="#d4af37" opacity=".4"/>';
    x+=w+(nx()<.08?24:0);}
  return s};
/* frasco Erlenmeyer com base em (cx,by); liq = cor do líquido */
const flask=(cx,by,liq,stroke)=>`<path d="M${cx-12} ${by-92}h24v34l32 46a8 8 0 0 1-7 12h-74a8 8 0 0 1-7-12l32-46z" fill="#cfeeff" fill-opacity=".08" stroke="${stroke||"#9be7ff"}" stroke-opacity=".6" stroke-width="2"/>
 <path d="M${cx-30} ${by-34}h60l12 18a8 8 0 0 1-7 12h-70a8 8 0 0 1-7-12z" fill="${liq}"/>`;

/* ---- peças geradas por código ---- */
const kFloor=()=>{let s="";for(let xb=-800;xb<=2400;xb+=200)s+='<line x1="'+(800+(xb-800)*.42)+'" y1="640" x2="'+xb+'" y2="900"/>';
  [668,708,760,830].forEach(y=>s+='<line x1="0" y1="'+y+'" x2="1600" y2="'+y+'"/>');return s};
const kPrints=()=>{let s="";for(let n=0;n<7;n++){const t=n/6,cx=650+t*470,cy=838-t*52+(n%2?10:-10);
  s+='<g transform="translate('+cx.toFixed(0)+' '+cy.toFixed(0)+') rotate(-6)"><ellipse rx="22" ry="10"/><ellipse cx="-30" rx="9" ry="8"/></g>'}return s};
const kBolts=(cx,cy,r,n)=>{let s="";for(let i=0;i<n;i++){const a=i/n*Math.PI*2;s+='<circle cx="'+(cx+Math.cos(a)*r).toFixed(1)+'" cy="'+(cy+Math.sin(a)*r).toFixed(1)+'" r="5"/>'}return s};
const kStars=()=>[[130,150],[200,120],[330,150],[355,215],[160,230],[120,310],[360,300]].map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="1.8" fill="#cfeeff" opacity=".7"/>').join("");

/* As cenas são funções: a arte (strings grandes) só é montada quando o caso é aberto. */
const salaCofre=()=>`<svg class="art" viewBox="0 0 1600 900" aria-hidden="true" focusable="false">
<defs>
 <linearGradient id="kWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16212d"/><stop offset="1" stop-color="#0c131b"/></linearGradient>
 <linearGradient id="kFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101a25"/><stop offset="1" stop-color="#05080c"/></linearGradient>
 <linearGradient id="kGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc8a"/><stop offset=".45" stop-color="#c9a232"/><stop offset=".7" stop-color="#e5c158"/><stop offset="1" stop-color="#8a6d1c"/></linearGradient>
 <linearGradient id="kBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fc3f7" stop-opacity=".36"/><stop offset="1" stop-color="#4fc3f7" stop-opacity="0"/></linearGradient>
 <linearGradient id="kSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07131f"/><stop offset="1" stop-color="#143049"/></linearGradient>
 <linearGradient id="kCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></linearGradient>
 <radialGradient id="kMoon"><stop offset="0" stop-color="#e9fbff"/><stop offset=".45" stop-color="#9be7ff" stop-opacity=".7"/><stop offset="1" stop-color="#4fc3f7" stop-opacity="0"/></radialGradient>
 <radialGradient id="kCu"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".6"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></radialGradient>
 <radialGradient id="kVig" cx=".5" cy=".45" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></radialGradient>
 <pattern id="kDeco" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 0V40M0 20H40" stroke="#d4af37" stroke-opacity=".04" fill="none"/></pattern>
 <pattern id="kChev" width="80" height="44" patternUnits="userSpaceOnUse"><path d="M0 4L40 38L80 4" fill="none" stroke="#d4af37" stroke-opacity=".38"/></pattern>
 <clipPath id="kWin"><path d="M90 470V250A150 150 0 0 1 390 250V470Z"/></clipPath>
 <filter id="kGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<g data-depth="0">

<!-- parede, friso e rodapé -->
<rect width="1600" height="640" fill="url(#kWall)"/><rect width="1600" height="640" fill="url(#kDeco)"/>
<rect width="1600" height="62" fill="#090e14"/><rect y="8" width="1600" height="44" fill="url(#kChev)"/><rect y="60" width="1600" height="3" fill="url(#kGold)"/>
<rect y="610" width="1600" height="30" fill="#0a1017"/><rect y="610" width="1600" height="2" fill="url(#kGold)" opacity=".6"/>
<rect x="0" y="63" width="46" height="547" fill="#0a1017"/><rect x="44" y="63" width="2" height="547" fill="url(#kGold)" opacity=".5"/>
<rect x="1554" y="63" width="46" height="547" fill="#0a1017"/><rect x="1554" y="63" width="2" height="547" fill="url(#kGold)" opacity=".5"/>
<!-- piso -->
<rect y="640" width="1600" height="260" fill="url(#kFloor)"/>
<g stroke="#d4af37" stroke-opacity=".07" fill="none">${kFloor()}</g>

<!-- arandelas -->
<g><ellipse cx="440" cy="232" rx="44" ry="70" fill="url(#kCone)" opacity=".28"/><path d="M430 214h20l-5 40h-10z" fill="url(#kGold)"/><circle cx="440" cy="212" r="9" fill="#ffd9a0"/></g>
<g><ellipse cx="896" cy="232" rx="44" ry="70" fill="url(#kCone)" opacity=".28"/><path d="M886 214h20l-5 40h-10z" fill="url(#kGold)"/><circle cx="896" cy="212" r="9" fill="#ffd9a0"/></g>

</g>
<g data-depth="1">
<!-- JANELA (fase 3) -->
<path d="M80 480V250A160 160 0 0 1 400 250V480Z" fill="#0b1824" stroke="url(#kGold)" stroke-width="7"/>
<g clip-path="url(#kWin)"><rect x="80" y="90" width="330" height="390" fill="url(#kSky)"/>
 <circle cx="285" cy="215" r="92" fill="url(#kMoon)" opacity=".85"/><circle cx="285" cy="215" r="34" fill="#e9fbff"/>${kStars()}
 <path d="M90 470V420h30v-40h24v30h20v-70h26v70h22v-30h30v60h34v-90h20v90h26v-50h36v50h42V470Z" fill="#04080d"/>
 <g fill="#ffb35c" opacity=".75"><rect x="104" y="430" width="5" height="7"/><rect x="152" y="396" width="5" height="7"/><rect x="214" y="408" width="5" height="7"/><rect x="274" y="414" width="5" height="7"/><rect x="334" y="425" width="5" height="7"/></g>
</g>
<path d="M240 100V470M90 330H390" stroke="url(#kGold)" stroke-width="4" fill="none"/><rect x="66" y="470" width="348" height="16" fill="url(#kGold)"/>
<g data-on="3" filter="url(#kGlow)"><circle cx="330" cy="428" r="7" fill="#ff7b00"/><path d="M330 400V456M302 428H358" stroke="#9be7ff" stroke-width="2.5"/><circle cx="330" cy="428" r="22" fill="none" stroke="#9be7ff" stroke-width="2"/></g>
<polygon points="96,486 392,486 900,900 330,900" fill="url(#kBeam)"/>
<polygon data-on="3" points="96,486 392,486 900,900 330,900" fill="url(#kBeam)"/>

<!-- QUADRO-NEGRO (fase 2) -->
<rect x="462" y="122" width="396" height="266" rx="6" fill="#6f5614"/><rect x="470" y="130" width="380" height="250" rx="3" fill="#0c1a1f"/>
<rect x="470" y="380" width="380" height="12" fill="url(#kGold)"/><g fill="#e8e4d8" opacity=".5"><rect x="520" y="371" width="34" height="9" rx="2"/><rect x="566" y="373" width="20" height="7" rx="2"/></g>
<ellipse cx="640" cy="300" rx="110" ry="28" fill="#cfeeff" opacity=".05"/><ellipse cx="760" cy="215" rx="60" ry="20" fill="#cfeeff" opacity=".04"/>
<g font-family="Rajdhani,sans-serif" font-size="34" fill="#cfeeff" fill-opacity=".5"><text x="500" y="200">T(x1,x2) = (x1, 0)</text><text x="500" y="262">T(x) = 0   ⇒   x1 = 0</text></g><text data-off="2" x="500" y="324" font-family="Rajdhani,sans-serif" font-size="34" fill="#cfeeff" fill-opacity=".5">N(T) = <tspan fill="#ff7b00">?</tspan></text>
<g data-on="2" filter="url(#kGlow)" font-family="Rajdhani,sans-serif" font-size="34" fill="#9be7ff"><text x="500" y="324">N(T) = {(0, x2)}  dim 1</text><path d="M500 336H800" stroke="#9be7ff" stroke-width="2.5"/></g>

<!-- RETRATO (fase 9) -->
<rect x="934" y="114" width="232" height="312" fill="url(#kGold)"/><rect x="942" y="122" width="216" height="296" fill="#0b121a"/><rect x="958" y="138" width="184" height="264" fill="#0c141c" stroke="#d4af37" stroke-opacity=".5"/>
<g data-on="9"><ellipse cx="1050" cy="270" rx="95" ry="120" fill="url(#kCu)"/></g>
<path d="M975 402C975 340 1020 322 1050 320C1080 322 1125 340 1125 402Z" fill="#05090e"/><circle cx="1050" cy="268" r="42" fill="#05090e"/>
<ellipse cx="1050" cy="238" rx="64" ry="12" fill="#03060a"/><path d="M1002 238V210Q1050 194 1098 210V238Z" fill="#03060a"/>
<text data-off="9" x="1050" y="286" text-anchor="middle" font-family="Cinzel,serif" font-size="58" fill="#4fc3f7" fill-opacity=".4">?</text>
<g data-on="9" filter="url(#kGlow)"><circle cx="1034" cy="266" r="5" fill="#ff5a4d"/><circle cx="1066" cy="266" r="5" fill="#ff5a4d"/><rect x="934" y="114" width="232" height="312" fill="none" stroke="#ff7b00" stroke-width="3"/></g>
<g data-on="9"><rect x="985" y="436" width="130" height="28" fill="#0a1017" stroke="#d4af37"/><text x="1050" y="456" text-anchor="middle" font-family="Cinzel,serif" font-size="15" fill="#e5c158" letter-spacing="3">SUSPEITO</text></g>

<!-- COFRE (fase 6) -->
<rect x="1222" y="172" width="306" height="356" fill="#070b10" stroke="url(#kGold)" stroke-width="5"/><rect x="1236" y="186" width="278" height="328" fill="#0a1017" stroke="#d4af37" stroke-opacity=".4"/>
<g data-on="6"><rect x="1245" y="195" width="260" height="310" fill="#05080c"/><rect x="1245" y="195" width="260" height="310" fill="url(#kCu)" opacity=".5"/><path d="M1245 300H1505M1245 400H1505" stroke="#d4af37" stroke-opacity=".25"/>
 <g fill="#ffb35c" opacity=".7"><circle cx="1330" cy="470" r="2.5"/><circle cx="1400" cy="440" r="2"/><circle cx="1450" cy="478" r="2.5"/><circle cx="1370" cy="350" r="2"/></g>
 <ellipse cx="1236" cy="350" rx="34" ry="126" fill="#17232f" stroke="url(#kGold)" stroke-width="5"/><ellipse cx="1236" cy="350" rx="14" ry="82" fill="none" stroke="#d4af37" stroke-opacity=".5"/></g>
<g data-off="6"><circle cx="1375" cy="350" r="128" fill="#17232f" stroke="url(#kGold)" stroke-width="7"/><circle cx="1375" cy="350" r="102" fill="none" stroke="#d4af37" stroke-opacity=".55" stroke-width="2"/><circle cx="1375" cy="350" r="64" fill="#101a24" stroke="url(#kGold)" stroke-width="3"/>
 <g fill="url(#kGold)">${kBolts(1375,350,115,10)}</g><path d="M1375 296V404M1321 350H1429M1337 312L1413 388M1413 312L1337 388" stroke="url(#kGold)" stroke-width="7" stroke-linecap="round"/><circle cx="1375" cy="350" r="22" fill="url(#kGold)"/><circle cx="1375" cy="350" r="9" fill="#101a24"/>
 <rect x="1218" y="250" width="18" height="36" fill="url(#kGold)"/><rect x="1218" y="414" width="18" height="36" fill="url(#kGold)"/></g>

<!-- ESTANTE DE ARQUIVOS (fase 4) -->
<rect x="474" y="404" width="232" height="324" fill="#0c141c" stroke="url(#kGold)" stroke-width="3"/><rect x="466" y="398" width="248" height="14" fill="url(#kGold)"/>
<g fill="#131e2a" stroke="#d4af37" stroke-opacity=".5"><rect x="486" y="424" width="208" height="62"/><rect x="486" y="494" width="208" height="62"/><rect x="486" y="564" width="208" height="62"/><rect x="486" y="634" width="208" height="62"/></g>
<g fill="url(#kGold)"><rect x="560" y="448" width="60" height="8" rx="3"/><rect x="560" y="518" width="60" height="8" rx="3"/><rect x="560" y="588" width="60" height="8" rx="3"/><rect x="560" y="658" width="60" height="8" rx="3"/></g>
<g data-on="4"><rect x="470" y="500" width="244" height="52" fill="#05080c" stroke="url(#kGold)"/><g filter="url(#kGlow)" fill="#9be7ff" opacity=".85"><rect x="490" y="486" width="46" height="26"/><rect x="548" y="482" width="40" height="30"/><rect x="600" y="488" width="52" height="24"/></g></g>

<!-- MESA (fases 1, 5, 7) -->
<ellipse cx="985" cy="752" rx="300" ry="20" fill="#000" opacity=".5"/>
<rect x="746" y="584" width="26" height="162" fill="#0c141c" stroke="#d4af37" stroke-opacity=".4"/><rect x="1198" y="584" width="26" height="162" fill="#0c141c" stroke="#d4af37" stroke-opacity=".4"/>
<rect x="772" y="584" width="426" height="150" fill="#101a25" stroke="#d4af37" stroke-opacity=".5"/><path d="M790 600H1180V718H790Z" fill="none" stroke="#d4af37" stroke-opacity=".25"/>
<polygon points="736,554 1234,554 1258,584 712,584" fill="#22364a" stroke="url(#kGold)" stroke-width="2"/><polygon points="736,554 1234,554 1230,560 740,560" fill="#fff" opacity=".07"/>
<rect x="890" y="602" width="210" height="78" fill="#152331" stroke="#d4af37"/>
<g data-off="1"><circle cx="995" cy="636" r="7" fill="#05080c" stroke="url(#kGold)" stroke-width="2"/><path d="M995 640v14" stroke="#05080c" stroke-width="4"/><rect x="950" y="664" width="90" height="7" rx="3" fill="url(#kGold)"/></g>
<g data-on="1"><polygon points="896,680 1094,680 1118,730 872,730" fill="#05080c" stroke="url(#kGold)"/><g filter="url(#kGlow)"><circle cx="985" cy="706" r="9" fill="none" stroke="#ffd36b" stroke-width="3"/><path d="M994 706H1032M1020 706v10M1030 706v8" stroke="#ffd36b" stroke-width="3" stroke-linecap="round"/></g></g>

<!-- telefone (fase 5) -->
<rect x="808" y="528" width="84" height="32" rx="12" fill="#15222f" stroke="url(#kGold)"/><circle cx="850" cy="540" r="17" fill="#0a1017" stroke="url(#kGold)"/><g fill="#d4af37" opacity=".7"><circle cx="850" cy="527" r="1.6"/><circle cx="861" cy="531" r="1.6"/><circle cx="863" cy="541" r="1.6"/><circle cx="837" cy="531" r="1.6"/><circle cx="837" cy="548" r="1.6"/></g>
<g data-off="5"><rect x="812" y="504" width="76" height="16" rx="8" fill="#243546" stroke="url(#kGold)"/></g>
<g data-on="5"><g transform="rotate(-26 850 520)"><rect x="812" y="498" width="76" height="16" rx="8" fill="#243546" stroke="url(#kGold)"/></g><g filter="url(#kGlow)" fill="none" stroke="#9be7ff" stroke-width="2.5" stroke-linecap="round"><path d="M906 478q16-10 30 0"/><path d="M912 462q24-16 46 0"/></g></g>

<!-- livro-caixa (fase 7) -->
<g data-off="7"><rect x="950" y="534" width="130" height="24" rx="3" fill="#3a2418" stroke="url(#kGold)"/><rect x="1000" y="540" width="30" height="12" fill="#0a1017" stroke="#d4af37" stroke-opacity=".6"/></g>
<g data-on="7"><polygon points="948,558 1015,540 1015,516 948,534" fill="#e8e4d8" opacity=".92"/><polygon points="1015,540 1082,558 1082,534 1015,516" fill="#d9d4c5" opacity=".92"/><g filter="url(#kGlow)" stroke="#4fc3f7" stroke-width="2" opacity=".9"><path d="M960 540l44-12M960 548l44-12M1026 530l44 12M1026 538l44 12"/></g></g>

<!-- abajur -->
<polygon points="1108,498 1212,498 1330,610 990,610" fill="url(#kCone)" opacity=".5"/>
<ellipse cx="1160" cy="556" rx="24" ry="6" fill="url(#kGold)"/><rect x="1157" y="484" width="6" height="72" fill="url(#kGold)"/><polygon points="1122,450 1198,450 1216,494 1104,494" fill="#7a4310" stroke="url(#kGold)"/><circle cx="1160" cy="496" r="16" fill="url(#kCu)"/>

<!-- TAPETE e pegadas (fase 0) -->
<polygon points="574,760 1196,760 1250,864 520,864" fill="#16222f" stroke="url(#kGold)" stroke-width="3"/><polygon points="604,772 1166,772 1212,852 560,852" fill="none" stroke="#d4af37" stroke-opacity=".4"/>
<g fill="none" stroke="#d4af37" stroke-opacity=".28"><path d="M880 780l40 36-40 36-40-36z"/><path d="M740 790l26 24-26 24-26-24zM1020 790l26 24-26 24-26-24z"/></g>
<g fill="#04070b" opacity=".8">${kPrints()}</g>
<g data-on="0" filter="url(#kGlow)" fill="none" stroke="#9be7ff" stroke-width="2.5"><g fill="#9be7ff" fill-opacity=".25">${kPrints()}</g><path d="M610 846V818M596 832H624"/><circle cx="610" cy="832" r="16"/></g>

<!-- INFORMANTE (fase 8) -->
<ellipse cx="240" cy="806" rx="112" ry="14" fill="#000" opacity=".55"/>
<path d="M168 590C168 560 200 552 240 552C280 552 312 560 312 590L336 804H150Z" fill="#0a111a"/><path d="M312 590L336 804" stroke="#4fc3f7" stroke-opacity=".5" stroke-width="2" fill="none"/>
<path d="M205 556L240 640L275 556Z" fill="#05090e"/><path d="M150 700H336" stroke="url(#kGold)" stroke-width="3" opacity=".6"/>
<circle cx="240" cy="520" r="34" fill="#070c12"/><ellipse cx="240" cy="496" rx="64" ry="12" fill="#04070b"/><path d="M200 496V470Q240 454 280 470V496Z" fill="#04070b"/><path d="M200 496H280" stroke="url(#kGold)" stroke-width="2.5"/>
<g filter="url(#kGlow)"><ellipse cx="227" cy="522" rx="5" ry="3" fill="#9be7ff"/><ellipse cx="253" cy="522" rx="5" ry="3" fill="#9be7ff"/></g>
<g data-on="8" filter="url(#kGlow)"><path d="M338 420h132a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14H386l-30 24 4-24h-22a14 14 0 0 1-14-14v-52a14 14 0 0 1 14-14z" fill="#0a1017" stroke="#9be7ff" stroke-width="2.5"/><g fill="#9be7ff"><circle cx="380" cy="460" r="5"/><circle cx="404" cy="460" r="5"/><circle cx="428" cy="460" r="5"/></g></g>

</g>
<rect width="1600" height="900" fill="url(#kVig)"/>
</svg>`;

/* =================== A MATRIZ FANTASMA: teatro e biblioteca =================== */
const fDefs=()=>baseDefs("f")+`
 <linearGradient id="fWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1527"/><stop offset="1" stop-color="#0d0a14"/></linearGradient>
 <linearGradient id="fFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1218"/><stop offset="1" stop-color="#060408"/></linearGradient>
 <linearGradient id="fGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22384a"/><stop offset="1" stop-color="#0a1118"/></linearGradient>
 <linearGradient id="fGhost" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9fbff" stop-opacity=".85"/><stop offset="1" stop-color="#9be7ff" stop-opacity=".1"/></linearGradient>
 <pattern id="fFold" width="60" height="10" patternUnits="userSpaceOnUse"><rect width="60" height="10" fill="#5a1220"/><rect x="12" width="20" height="10" fill="#87202f"/><rect x="30" width="7" height="10" fill="#a8303f" opacity=".55"/><rect x="48" width="6" height="10" fill="#3c0b15"/></pattern>
 <pattern id="fDeco" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M20 0L40 20L20 40L0 20Z" fill="none" stroke="#d4af37" stroke-opacity=".05"/></pattern>`;

const salaPalco=()=>SVG0+`<defs>${fDefs()}</defs>
<g data-depth="0">
<rect width="1600" height="640" fill="url(#fWall)"/><rect width="1600" height="640" fill="url(#fDeco)"/>
${frieze("f",640)}
<rect y="640" width="1600" height="260" fill="url(#fFloor)"/>${pFloor(640,"#d4af37",".06")}
<!-- poltronas da plateia -->
<g data-depth="2" fill="#16090e" stroke="#d4af37" stroke-opacity=".18">${[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>'<path d="M'+(110+i*120)+' 900v-60a24 24 0 0 1 48 0v60z"/>').join("")}</g>

</g>
<g data-depth="1">
<!-- PALCO: boca de cena -->
<rect x="540" y="232" width="520" height="370" fill="#07050a"/>
<polygon points="540,560 1060,560 1076,604 524,604" fill="#2c1a10"/><g stroke="#000" stroke-opacity=".5">${[0,1,2,3,4,5,6,7,8,9].map(i=>'<line x1="'+(560+i*52)+'" y1="560" x2="'+(550+i*55)+'" y2="604"/>').join("")}</g>
<rect x="500" y="600" width="600" height="40" fill="#1e120c" stroke="url(#fGold)" stroke-width="2"/>
<g>${[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i=>'<ellipse cx="'+(530+i*45)+'" cy="612" rx="16" ry="5" fill="#ffb35c" opacity=".22"/><circle cx="'+(530+i*45)+'" cy="614" r="4" fill="#ffd9a0"/>').join("")}</g>

<!-- CORTINA (fase 9) -->
<g data-on="9">
 <polygon points="760,274 840,274 960,600 640,600" fill="url(#fCone)" opacity=".35"/>
 ${suspect("f",800,598,.95)}
 ${plaque("f",800,560)}
 <path d="M545 274H650Q606 430 632 600H545Z" fill="url(#fFold)"/><path d="M1055 274H950Q994 430 968 600H1055Z" fill="url(#fFold)"/>
 <circle cx="632" cy="440" r="8" fill="url(#fGold)"/><circle cx="968" cy="440" r="8" fill="url(#fGold)"/>
</g>
<g data-off="9">
 <path d="M545 274H802V600Q762 590 722 600Q682 590 642 600Q602 590 545 600Z" fill="url(#fFold)"/>
 <path d="M1055 274H798V600Q838 590 878 600Q918 590 958 600Q998 590 1055 600Z" fill="url(#fFold)"/>
 <path d="M802 274V600" stroke="#2a0710" stroke-width="3"/>
 <g fill="url(#fGold)"><circle cx="800" cy="584" r="9"/><path d="M793 590h14l-3 22h-8z"/></g>
</g>
<!-- sanefa e boca dourada -->
<path d="M540 232H1060V268Q1028 290 996 268Q964 290 932 268Q900 290 868 268Q836 290 800 268Q764 290 732 268Q700 290 668 268Q636 290 604 268Q572 290 540 268Z" fill="url(#fFold)"/>
<path d="M520 604V262Q520 206 580 204H1020Q1080 206 1080 262V604" fill="none" stroke="url(#fGold)" stroke-width="10"/>
<path d="M506 604V254Q506 190 574 188H1026Q1094 190 1094 254V604" fill="none" stroke="#d4af37" stroke-opacity=".4" stroke-width="2"/>
<path d="M760 188L800 166L840 188" fill="none" stroke="url(#fGold)" stroke-width="4"/><circle cx="800" cy="178" r="6" fill="url(#fGold)"/>

<!-- LUSTRE (fase 7) -->
<path d="M800 63V112" stroke="url(#fGold)" stroke-width="3"/>
<polygon data-on="7" points="700,200 900,200 1060,600 540,600" fill="url(#fCone)" opacity=".22"/>
<ellipse cx="800" cy="150" rx="100" ry="18" fill="none" stroke="url(#fGold)" stroke-width="4"/>
<path d="M800 112L720 150M800 112L880 150M800 112V150" stroke="url(#fGold)" stroke-width="2.5"/>
<g fill="url(#fGold)">${[700,750,850,900].map(x=>'<rect x="'+(x-4)+'" y="128" width="8" height="18"/>').join("")}</g>
<g data-off="7" fill="#3e4a55">${[[760,176],[800,176],[840,176],[780,198],[820,198],[800,220]].map(p=>'<path d="M'+p[0]+' '+(p[1]-10)+'l7 10-7 10-7-10z"/>').join("")}</g>
<g data-on="7" filter="url(#fGlow)"><g fill="#cfeeff">${[[760,176],[800,176],[840,176],[780,198],[820,198],[800,220]].map(p=>'<path d="M'+p[0]+' '+(p[1]-10)+'l7 10-7 10-7-10z"/>').join("")}</g>
 <g fill="#ffd36b">${[700,750,850,900].map(x=>'<ellipse cx="'+x+'" cy="122" rx="4" ry="7"/>').join("")}</g></g>

<!-- ESPELHO DO CAMARIM (fase 0) -->
<rect x="96" y="160" width="228" height="280" fill="#0b0f16" stroke="url(#fGold)" stroke-width="6"/>
<rect x="114" y="178" width="192" height="244" fill="url(#fGlass)"/>
<path d="M130 400L290 196" stroke="#fff" stroke-opacity=".06" stroke-width="18"/>
<g fill="#ffd9a0" opacity=".75">${[0,1,2,3,4].map(i=>'<circle cx="'+(120+i*45)+'" cy="152" r="7"/>').join("")+[0,1,2,3,4].map(i=>'<circle cx="88" cy="'+(190+i*55)+'" r="7"/><circle cx="332" cy="'+(190+i*55)+'" r="7"/>').join("")}</g>
<g data-off="0"><path d="M172 422C172 360 196 342 210 340C224 342 248 360 248 422Z" fill="#05080d" opacity=".7"/><circle cx="210" cy="314" r="24" fill="#05080d" opacity=".7"/>
 <text x="210" y="300" text-anchor="middle" font-family="Cinzel,serif" font-size="44" fill="#4fc3f7" fill-opacity=".4">?</text></g>
<g data-on="0" filter="url(#fGlow)"><path d="M172 422C172 360 196 342 210 340C224 342 248 360 248 422Z" fill="url(#fGhost)" opacity=".6"/><circle cx="210" cy="314" r="24" fill="url(#fGhost)" opacity=".7"/>
 <text x="210" y="252" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="30" font-weight="700" fill="#9be7ff">T⁻¹ = T</text></g>
<rect x="70" y="448" width="280" height="14" fill="url(#fGold)"/><rect x="82" y="462" width="256" height="56" fill="#140d16" stroke="#d4af37" stroke-opacity=".4"/>
<path d="M210 462V518" stroke="#d4af37" stroke-opacity=".3"/><g fill="url(#fGold)"><rect x="140" y="486" width="30" height="5" rx="2"/><rect x="250" y="486" width="30" height="5" rx="2"/></g>
<rect x="92" y="518" width="12" height="122" fill="#140d16"/><rect x="316" y="518" width="12" height="122" fill="#140d16"/>
<g><rect x="118" y="420" width="16" height="28" rx="3" fill="#7a2a3a" opacity=".85"/><rect x="122" y="412" width="8" height="8" fill="url(#fGold)"/><rect x="290" y="426" width="22" height="22" rx="11" fill="#2a4a5a" opacity=".8"/></g>

<!-- PROGRAMA DA PEÇA (fase 1) -->
<path d="M404 640L444 392M500 640L460 392" stroke="#3a2416" stroke-width="8"/>
<rect x="386" y="396" width="128" height="178" fill="#1a1220" stroke="url(#fGold)" stroke-width="3"/>
<text x="450" y="424" text-anchor="middle" font-family="Cinzel,serif" font-size="15" fill="#e5c158" letter-spacing="2">ESTREIA</text>
<text x="450" y="444" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#e5c158" fill-opacity=".7">O FANTASMA</text>
<g fill="none" stroke="#d4af37" stroke-opacity=".35"><rect x="404" y="460" width="92" height="64"/></g>
<g data-off="1" fill="#e8e4d8" opacity=".25"><rect x="412" y="472" width="76" height="4"/><rect x="412" y="488" width="60" height="4"/><rect x="412" y="504" width="70" height="4"/></g>
<g data-on="1" filter="url(#fGlow)" stroke="#9be7ff" stroke-width="2" fill="none"><rect x="404" y="460" width="92" height="64"/><path d="M404 492H496M434.7 460V524M465.3 460V524"/>
 <text x="450" y="556" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="20" font-weight="700" fill="#9be7ff" stroke="none">2 × 3</text></g>

<!-- PIANO E PARTITURA (fase 3) -->
<rect x="1110" y="458" width="290" height="16" fill="url(#fGold)"/>
<rect x="1120" y="474" width="270" height="190" fill="#120b10" stroke="#d4af37" stroke-opacity=".5"/>
<rect x="1130" y="560" width="250" height="30" fill="#e8e4d8" opacity=".85"/><g fill="#0a0608">${[0,1,3,4,5,7,8,10,11,12].map(i=>'<rect x="'+(1140+i*17.5)+'" y="560" width="10" height="18"/>').join("")}</g>
<rect x="1176" y="484" width="158" height="68" fill="#e8e4d8" opacity=".88"/>
<g stroke="#5a4a3a" stroke-opacity=".5">${[0,1,2,3,4].map(i=>'<line x1="1184" y1="'+(496+i*11)+'" x2="1326" y2="'+(496+i*11)+'"/>').join("")}</g>
<path data-off="3" d="M1186 518q17.5-22 35 0t35 0t35 0t35 0" fill="none" stroke="#1a1218" stroke-width="3"/>
<g data-on="3" filter="url(#fGlow)"><path d="M1186 496q17.5 22 35 22t35-22t35 22t35-22" fill="none" stroke="#4fc3f7" stroke-width="3.5"/>
 <g fill="#9be7ff" font-family="serif" font-size="30"><text x="1250" y="440">♪</text><text x="1300" y="418">♫</text><text x="1200" y="428">♪</text></g></g>
<rect x="1176" y="640" width="160" height="18" fill="#2a1a20" stroke="url(#fGold)"/><rect x="1186" y="658" width="10" height="40" fill="#140d16"/><rect x="1316" y="658" width="10" height="40" fill="#140d16"/>
<rect x="1128" y="664" width="14" height="36" fill="#120b10"/><rect x="1368" y="664" width="14" height="36" fill="#120b10"/>

<!-- CAMAROTE E FANTASMA (fase 8) -->
<path d="M1262 330V176Q1262 130 1396 130Q1530 130 1530 176V330Z" fill="#06040a" stroke="url(#fGold)" stroke-width="4"/>
<g data-off="8" filter="url(#fGlow)" opacity=".55"><ellipse cx="1380" cy="236" rx="6" ry="4" fill="#9be7ff"/><ellipse cx="1410" cy="236" rx="6" ry="4" fill="#9be7ff"/></g>
<g data-on="8">
 <ellipse cx="1395" cy="240" rx="110" ry="90" fill="url(#fCy)"/>
 <path d="M1350 320V230Q1350 180 1395 178Q1440 180 1440 230V320Q1428 306 1418 320Q1406 306 1395 320Q1384 306 1372 320Q1362 306 1350 320Z" fill="url(#fGhost)" opacity=".85"/>
 <ellipse cx="1380" cy="226" rx="7" ry="9" fill="#0b1017"/><ellipse cx="1410" cy="226" rx="7" ry="9" fill="#0b1017"/><ellipse cx="1395" cy="256" rx="8" ry="10" fill="#0b1017"/>
 <g filter="url(#fGlow)"><path d="M1130 170h96a12 12 0 0 1 12 12v40a12 12 0 0 1-12 12h-20l14 22-34-22h-56a12 12 0 0 1-12-12v-40a12 12 0 0 1 12-12z" fill="#0a1017" stroke="#9be7ff" stroke-width="2.5"/>
 <text x="1178" y="212" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="24" font-weight="700" fill="#9be7ff">TD ≠ I</text></g>
</g>
<path d="M1262 140Q1300 230 1284 330H1262Z" fill="url(#fFold)"/><path d="M1530 140Q1492 230 1508 330H1530Z" fill="url(#fFold)"/>
<path d="M1246 300H1546V336Q1396 384 1246 336Z" fill="#2a1520" stroke="url(#fGold)" stroke-width="3"/>
<g fill="url(#fGold)">${[0,1,2,3,4,5,6].map(i=>'<circle cx="'+(1276+i*40)+'" cy="318" r="4"/>').join("")}</g>
</g>
${vig("f")}
</svg>`;

const salaBiblioteca=()=>SVG0+`<defs>${fDefs()}
 <linearGradient id="fLib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151d26"/><stop offset="1" stop-color="#0a0e13"/></linearGradient>
 <linearGradient id="fRug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1018"/><stop offset="1" stop-color="#14060a"/></linearGradient></defs>
<g data-depth="0">
<rect width="1600" height="620" fill="url(#fLib)"/>
${frieze("f",620)}
<!-- estantes -->
<g>${[200,320,440,560].map((y,i)=>books(66,1534,y,104,17+i*31)).join("")}</g>
<g fill="#24170e">${[200,320,440,560].map(y=>'<rect x="56" y="'+y+'" width="1488" height="12"/>').join("")}</g>
<g fill="url(#fGold)" opacity=".5">${[200,320,440,560].map(y=>'<rect x="56" y="'+y+'" width="1488" height="2"/>').join("")}</g>
<rect x="0" y="0" width="1600" height="620" fill="#000" opacity=".28"/>
<rect y="620" width="1600" height="280" fill="url(#fRug)"/>${pFloor(620,"#d4af37",".06")}
<ellipse data-depth="2" cx="900" cy="790" rx="560" ry="70" fill="none" stroke="#d4af37" stroke-opacity=".25" stroke-width="3"/>

</g>
<g data-depth="1">
<!-- QUADRO DO ELENCO (fase 2) -->
<rect x="120" y="150" width="320" height="270" fill="#3a2a1a" stroke="url(#fGold)" stroke-width="5"/>
<g>${[[150,175],[300,170],[160,300],[310,290]].map((p,i)=>'<g transform="rotate('+[-4,3,2,-3][i]+' '+(p[0]+45)+' '+(p[1]+50)+')"><rect x="'+p[0]+'" y="'+p[1]+'" width="90" height="100" fill="#e8e4d8"/><rect x="'+(p[0]+8)+'" y="'+(p[1]+8)+'" width="74" height="66" fill="#1a1a22"/><circle cx="'+(p[0]+45)+'" cy="'+(p[1]+36)+'" r="14" fill="#05080d"/><path d="M'+(p[0]+22)+' '+(p[1]+74)+'Q'+(p[0]+45)+' '+(p[1]+46)+' '+(p[0]+68)+' '+(p[1]+74)+'Z" fill="#05080d"/></g>').join("")}</g>
<g fill="#ff5a4d">${[[195,172],[345,167],[205,297],[355,287]].map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="5"/>').join("")}</g>
<g data-off="2" font-family="Cinzel,serif" font-size="30" fill="#4fc3f7" fill-opacity=".45" text-anchor="middle"><text x="195" y="222">?</text><text x="345" y="217">?</text><text x="205" y="347">?</text><text x="355" y="337">?</text></g>
<g data-on="2"><path d="M195 172L345 167L355 287L205 297Z M195 172L355 287" fill="none" stroke="#ff5a4d" stroke-width="2.5"/>
 <g filter="url(#fGlow)"><rect x="196" y="380" width="168" height="30" fill="#0a1017" stroke="#9be7ff" stroke-width="2"/><text x="280" y="402" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="18" font-weight="700" fill="#9be7ff">T(x) = A·x</text></g></g>

<!-- RELÓGIO DE PÊNDULO (fase 4) -->
<path d="M550 262V176Q550 150 630 146Q710 150 710 176V262Z" fill="#1a0f0a" stroke="url(#fGold)" stroke-width="4"/>
<circle cx="630" cy="208" r="44" fill="#e8e4d8" opacity=".9"/><circle cx="630" cy="208" r="44" fill="none" stroke="url(#fGold)" stroke-width="4"/>
<g stroke="#1a1218" stroke-width="3">${[...Array(12).keys()].map(i=>{const a=i/12*Math.PI*2;return '<line x1="'+(630+Math.sin(a)*34).toFixed(1)+'" y1="'+(208-Math.cos(a)*34).toFixed(1)+'" x2="'+(630+Math.sin(a)*40).toFixed(1)+'" y2="'+(208-Math.cos(a)*40).toFixed(1)+'"/>'}).join("")}</g>
<g data-off="4" stroke="#1a1218" stroke-width="4" stroke-linecap="round"><line x1="630" y1="208" x2="650" y2="226"/><line x1="630" y1="208" x2="600" y2="190"/></g>
<g data-on="4"><circle cx="630" cy="208" r="52" fill="none" stroke="#9be7ff" stroke-width="3" filter="url(#fGlow)"/><g stroke="#16688f" stroke-width="4" stroke-linecap="round"><line x1="630" y1="208" x2="604" y2="193"/><line x1="630" y1="208" x2="630" y2="174"/></g></g>
<circle cx="630" cy="208" r="4" fill="url(#fGold)"/>
<rect x="574" y="262" width="112" height="380" fill="#140b07" stroke="#d4af37" stroke-opacity=".5"/>
<rect x="594" y="290" width="72" height="300" fill="#07050a" stroke="url(#fGold)" stroke-width="2"/>
<path d="M630 290V510" stroke="url(#fGold)" stroke-width="3"/><circle cx="630" cy="530" r="22" fill="url(#fGold)"/>
<g data-on="4" filter="url(#fGlow)"><circle cx="630" cy="530" r="26" fill="none" stroke="#9be7ff" stroke-width="2.5"/><text x="630" y="574" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="20" font-weight="700" fill="#9be7ff">Aⁿ</text></g>
<rect x="560" y="642" width="140" height="80" fill="#1a0f0a" stroke="url(#fGold)" stroke-width="3"/>

<!-- ESCRIVANINHA E BALANÇA (fase 5) -->
<ellipse cx="960" cy="742" rx="200" ry="14" fill="#000" opacity=".5"/>
<rect x="780" y="560" width="360" height="18" fill="#2a1a10" stroke="url(#fGold)" stroke-width="2"/>
<rect x="796" y="578" width="328" height="80" fill="#160d08" stroke="#d4af37" stroke-opacity=".35"/><rect x="800" y="658" width="16" height="84" fill="#160d08"/><rect x="1104" y="658" width="16" height="84" fill="#160d08"/>
<rect x="926" y="540" width="68" height="20" fill="url(#fGold)"/><rect x="956" y="430" width="8" height="112" fill="url(#fGold)"/><circle cx="960" cy="426" r="8" fill="url(#fGold)"/>
<g data-off="5" transform="rotate(-12 960 430)"><path d="M860 430H1060" stroke="url(#fGold)" stroke-width="5"/><path d="M870 430L850 480M870 430L890 480M1050 430L1030 480M1050 430L1070 480" stroke="#d4af37" stroke-opacity=".7"/><path d="M840 480H900Q870 506 840 480Z" fill="url(#fGold)"/><path d="M1020 480H1080Q1050 506 1020 480Z" fill="url(#fGold)"/></g>
<g data-on="5"><path d="M860 430H1060" stroke="url(#fGold)" stroke-width="5"/><path d="M870 430L850 480M870 430L890 480M1050 430L1030 480M1050 430L1070 480" stroke="#d4af37" stroke-opacity=".7"/><path d="M840 480H900Q870 506 840 480Z" fill="url(#fGold)"/><path d="M1020 480H1080Q1050 506 1020 480Z" fill="url(#fGold)"/>
 <g filter="url(#fGlow)" fill="#9be7ff"><rect x="856" y="464" width="28" height="16"/><rect x="1036" y="462" width="28" height="18"/><path d="M944 396h32" stroke="#9be7ff" stroke-width="3"/></g></g>
<g><rect x="1082" y="520" width="10" height="40" fill="#e8e4d8"/><ellipse cx="1087" cy="514" rx="5" ry="9" fill="#ffd36b"/><ellipse cx="1087" cy="520" rx="40" ry="30" fill="url(#fCu)" opacity=".7"/></g>

<!-- GRIMÓRIO NO ATRIL (fase 6) -->
<polygon points="1250,720 1350,720 1330,480 1270,480" fill="#1a0f0a" stroke="#d4af37" stroke-opacity=".5"/>
<rect x="1230" y="712" width="140" height="14" fill="url(#fGold)"/>
<polygon points="1182,476 1418,476 1404,446 1196,446" fill="#24160e" stroke="url(#fGold)" stroke-width="3"/>
<g data-off="6"><polygon points="1220,446 1380,446 1370,418 1230,418" fill="#4a1420" stroke="url(#fGold)" stroke-width="2"/><circle cx="1300" cy="432" r="8" fill="url(#fGold)"/></g>
<g data-on="6"><ellipse cx="1300" cy="400" rx="130" ry="70" fill="url(#fCy)"/>
 <polygon points="1206,446 1300,438 1300,404 1212,410" fill="#e8e4d8"/><polygon points="1394,446 1300,438 1300,404 1388,410" fill="#d9d4c5"/>
 <g filter="url(#fGlow)" stroke="#4fc3f7" stroke-width="2"><path d="M1222 420l64-4M1222 430l64-4M1314 416l64 4M1314 426l64 4"/></g>
 <g filter="url(#fGlow)" fill="#9be7ff" font-family="Rajdhani,sans-serif" font-size="20" font-weight="700"><text x="1240" y="380">AB</text><text x="1322" y="372">≠ BA</text></g></g>
</g>
${vig("f")}
</svg>`;

const sceneFantasma=()=>({
  intro:"O teatro fechou há anos, mas toda noite alguém troca as provas de lugar. Matrizes não mentem; fantasmas, sim.",
  salas:[{id:"palco",nome:"Palco do teatro",svg:salaPalco()},{id:"biblioteca",nome:"Biblioteca proibida",svg:salaBiblioteca()}],
  hotspots:[
    {caso:0,sala:"palco",nome:"Espelho do camarim",...box(80,140,260,320),
      falaAbrir:"O espelho devolve tudo invertido. Refletir duas vezes desfaz o truque?",
      falaResolvido:"Refletir de novo desfaz tudo: a inversa é a própria reflexão.",
      pista:"No espelho, a inversa da reflexão é ela mesma."},
    {caso:1,sala:"palco",nome:"Programa da peça",...box(370,380,150,260),
      falaAbrir:"O programa lista o elenco em linhas e colunas. Quantas de cada?",
      falaResolvido:"Duas linhas, três colunas: a ficha tem o formato do crime.",
      pista:"Uma linha por coordenada de saída, uma coluna por coordenada de entrada."},
    {caso:2,sala:"biblioteca",nome:"Quadro do elenco",...box(110,140,340,290),requires:[1],
      falaBloqueado:"Fotos e barbantes, mas sem saber o formato da ficha não consigo ler o quadro. O programa da peça, no palco, deve ajudar.",
      falaAbrir:"Cada foto é uma coluna da matriz. Vamos aplicá-la ao suspeito.",
      falaResolvido:"O barbante liga as fotos certas. O relógio e a balança agora fazem sentido.",
      pista:"Aplicar a matriz é cruzar cada linha com o vetor do suspeito."},
    {caso:3,sala:"palco",nome:"Partitura no piano",...box(1110,430,300,250),
      falaAbrir:"Uma partitura de senos e cossenos. Quem tocou isto estava derivando.",
      falaResolvido:"Derivar troca seno por cosseno, com um sinal no caminho.",
      pista:"Na base (sen, cos), derivar é girar: as colunas trocam de lugar e uma muda de sinal."},
    {caso:4,sala:"biblioteca",nome:"Relógio de pêndulo",...box(550,140,170,590),requires:[2],
      falaBloqueado:"O relógio parou num horário estranho. Preciso entender o quadro do elenco primeiro.",
      falaAbrir:"O pêndulo bate sempre igual. Potências repetidas escondem um padrão.",
      falaResolvido:"Cada batida soma um no canto da matriz. O tempo não apaga o padrão.",
      pista:"Nas potências da matriz de cisalhamento, o canto cresce de um em um."},
    {caso:5,sala:"biblioteca",nome:"Balança da escrivaninha",...box(790,380,340,190),requires:[2],
      falaBloqueado:"Dois pratos, nenhum rótulo. O quadro do elenco diz o que pesar.",
      falaAbrir:"Duas provas na balança. Somar matrizes é somar posição por posição.",
      falaResolvido:"A balança equilibrou. As provas somam o que deviam.",
      pista:"Matrizes do mesmo tamanho se somam elemento a elemento."},
    {caso:6,sala:"biblioteca",nome:"Grimório no atril",...box(1170,360,260,370),requires:[4,5],
      falaBloqueado:"O grimório está lacrado. Primeiro o relógio e a balança.",
      falaAbrir:"Fórmulas que parecem verdadeiras. Só uma sobrevive quando AB ≠ BA.",
      falaResolvido:"AB não é BA. O feitiço só funciona na ordem certa.",
      pista:"Ao expandir produtos de matrizes, nunca troque a ordem dos fatores."},
    {caso:7,sala:"palco",nome:"Lustre",...box(690,66,220,160),requires:[4],
      falaBloqueado:"O lustre está apagado. O relógio da biblioteca deve dizer quando acendê-lo.",
      falaAbrir:"Os cristais formam um triângulo. Cada potência acende mais uma fileira.",
      falaResolvido:"O lustre acendeu e o palco inteiro ficou à vista.",
      pista:"No canto de uma potência triangular aparecem os números triangulares."},
    {caso:8,sala:"palco",nome:"Vulto no camarote",...box(1240,110,310,260),requires:[3,6],
      falaBloqueado:"O vulto no camarote some quando me aproximo. Preciso da partitura e do grimório.",
      falaAbrir:"Ele derivou e integrou, mas na ordem errada. O que se perde no caminho?",
      quem:"Fantasma",falaResolvido:"As constantes… somem sempre que derivam primeiro. Olhe atrás da cortina.",
      pista:"DT = I, mas TD apaga as constantes: o núcleo de TD não é só o zero."},
    {caso:9,sala:"palco",nome:"Cortina do palco",...box(560,240,480,360),requires:[0,1,2,3,4,5,6,7,8],
      falaBloqueado:"A cortina não se abre enquanto houver provas soltas pelo teatro.",
      falaAbrir:"Atrás da cortina, uma matriz triangular. Resolva de baixo para cima.",
      falaResolvido:"A cortina se abriu. O fantasma era de carne e osso, e a inversa o entregou.",
      pista:"Matriz triangular se inverte de baixo para cima, uma coordenada por vez."}
  ],
  interrogatorio:[
    {pista:1,fala:"A ficha é 2×3, então ela leva vetores do ℝ² para o ℝ³.",
      refuta:"Matriz m×n leva ℝⁿ em ℝᵐ. A ficha 2×3 vai do ℝ³ para o ℝ²."},
    {pista:6,fala:"(A+B)² = A² + 2AB + B², como em qualquer conta de colégio.",
      refuta:"Só se AB = BA. Em geral, (A+B)² = A² + AB + BA + B²."},
    {pista:8,fala:"Se DT é a identidade, TD também é. Derivar e integrar dá no mesmo em qualquer ordem.",
      refuta:"TD(p) = p − p(0): as constantes somem. DT = I não garante TD = I."}
  ],
  final:{
    texto:"A cortina se abriu e o fantasma tinha nome, endereço e uma matriz triangular no bolso. Cada potência, cada soma e cada inversa fechou uma saída do teatro. Caso arquivado.",
    fala:"Fantasmas não existem. Matrizes que não comutam, sim."
  }
});

/* =================== A DEPENDÊNCIA LETAL: laboratório e câmara fria =================== */
const dDefs=()=>baseDefs("d")+`
 <linearGradient id="dWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#11222a"/><stop offset="1" stop-color="#091318"/></linearGradient>
 <linearGradient id="dFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1c22"/><stop offset="1" stop-color="#04080a"/></linearGradient>
 <linearGradient id="dSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c3d49"/><stop offset="1" stop-color="#141f27"/></linearGradient>
 <linearGradient id="dGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9be7ff" stop-opacity=".16"/><stop offset="1" stop-color="#4fc3f7" stop-opacity=".04"/></linearGradient>
 <pattern id="dTile" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0V60H0" fill="none" stroke="#3fd0a0" stroke-opacity=".06"/></pattern>
 <pattern id="dHaz" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="40" fill="#c9a232"/><rect x="20" width="20" height="40" fill="#0a1017"/></pattern>`;

const salaLab=()=>SVG0+`<defs>${dDefs()}</defs>
<g data-depth="0">
<rect width="1600" height="620" fill="url(#dWall)"/><rect width="1600" height="620" fill="url(#dTile)"/>
${frieze("d",620)}
<rect y="620" width="1600" height="280" fill="url(#dFloor)"/>${pFloor(620,"#3fd0a0",".07")}
<!-- luminárias -->
<g>${[262,1385].map(x=>'<path d="M'+x+' 63V96" stroke="#d4af37" stroke-width="2"/><path d="M'+(x-50)+' 112L'+(x-30)+' 96H'+(x+30)+'L'+(x+50)+' 112Z" fill="url(#dGold)"/><polygon points="'+(x-50)+',112 '+(x+50)+',112 '+(x+150)+',520 '+(x-150)+',520" fill="url(#dBeam)" opacity=".35"/>').join("")}</g>

</g>
<g data-depth="1">
<!-- FRASCOS DE REAGENTES (fase 0) -->
<rect x="80" y="300" width="340" height="12" fill="url(#dGold)"/><path d="M110 312v24h14M390 312v24h-14" stroke="#d4af37" stroke-opacity=".6" fill="none" stroke-width="3"/>
${flask(125,300,"#1d4a3e")}${flask(205,300,"#1d4a3e")}${flask(285,300,"#1d4a3e")}${flask(365,300,"#1d4a3e")}
<g font-family="Rajdhani,sans-serif" font-size="16" font-weight="700" fill="#cfeeff" fill-opacity=".6" text-anchor="middle"><text x="125" y="286">x</text><text x="205" y="286">0</text><text x="285" y="286">eˣ</text><text x="365" y="286">±</text></g>
<g data-on="0" filter="url(#dGlow)"><path d="M95 266h60l12 18a8 8 0 0 1-7 12h-70a8 8 0 0 1-7-12z" fill="#3fd0a0" opacity=".7"/><path d="M175 266h60l12 18a8 8 0 0 1-7 12h-70a8 8 0 0 1-7-12z" fill="#3fd0a0" opacity=".7"/>
 <path d="M255 266h60l12 18a8 8 0 0 1-7 12h-70a8 8 0 0 1-7-12z" fill="#ff5a4d"/><path d="M335 266h60l12 18a8 8 0 0 1-7 12h-70a8 8 0 0 1-7-12z" fill="#3fd0a0" opacity=".7"/>
 <g fill="#ff8a7d"><circle cx="280" cy="240" r="4"/><circle cx="292" cy="222" r="3"/><circle cx="284" cy="200" r="5"/></g></g>

<!-- CENTRÍFUGA (fase 7) -->
<rect x="120" y="600" width="200" height="180" rx="14" fill="url(#dSteel)" stroke="url(#dGold)" stroke-width="3"/>
<ellipse cx="220" cy="600" rx="100" ry="24" fill="#22343e" stroke="url(#dGold)" stroke-width="3"/><ellipse cx="220" cy="598" rx="60" ry="12" fill="#0a1418"/>
<rect x="150" y="680" width="140" height="44" fill="#0a1418" stroke="#d4af37" stroke-opacity=".5"/>
<g data-off="7" fill="#3a4a55"><circle cx="180" cy="702" r="9"/><circle cx="220" cy="702" r="9"/><rect x="246" y="694" width="30" height="16"/></g>
<g data-on="7" filter="url(#dGlow)"><ellipse cx="220" cy="598" rx="70" ry="16" fill="none" stroke="#9be7ff" stroke-width="3"/><path d="M146 576q74-30 148 0M150 620q70 26 140 0" fill="none" stroke="#9be7ff" stroke-width="2" stroke-dasharray="10 8"/>
 <circle cx="180" cy="702" r="9" fill="#3fd0a0"/><circle cx="220" cy="702" r="9" fill="#3fd0a0"/><text x="261" y="709" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="16" font-weight="700" fill="#9be7ff">c₀</text></g>

<!-- GEL DE ELETROFORESE (fase 3) -->
<rect x="500" y="120" width="380" height="170" fill="#0a1418" stroke="url(#dGold)" stroke-width="4"/>
<g fill="#12242a" stroke="#3fd0a0" stroke-opacity=".25">${[0,1,2,3].map(i=>'<rect x="'+(540+i*80)+'" y="140" width="50" height="132"/>').join("")}</g>
<g fill="#05080c">${[0,1,2,3].map(i=>'<rect x="'+(548+i*80)+'" y="146" width="34" height="8"/>').join("")}</g>
<g data-off="3" fill="#3fd0a0" opacity=".18">${[[0,190],[1,215],[2,240],[3,180]].map(b=>'<rect x="'+(546+b[0]*80)+'" y="'+b[1]+'" width="38" height="7"/>').join("")}</g>
<g data-on="3" filter="url(#dGlow)" fill="#9be7ff">${[[0,190],[0,250],[1,215],[2,240],[2,168],[3,180],[3,226]].map(b=>'<rect x="'+(546+b[0]*80)+'" y="'+b[1]+'" width="38" height="7"/>').join("")}</g>
<text x="690" y="284" text-anchor="middle" font-family="Cinzel,serif" font-size="11" fill="#d4af37" fill-opacity=".7" letter-spacing="3">A₁  A₂  A₃  A₄</text>

<!-- BANCADA CENTRAL -->
<rect x="460" y="520" width="440" height="18" fill="#2a3a44" stroke="url(#dGold)" stroke-width="2"/>
<rect x="470" y="538" width="420" height="160" fill="#0d181e" stroke="#d4af37" stroke-opacity=".35"/><path d="M680 538V698" stroke="#d4af37" stroke-opacity=".3"/>
<g fill="url(#dGold)"><rect x="650" y="606" width="20" height="5"/><rect x="690" y="606" width="20" height="5"/></g>

<!-- TUBOS DE ENSAIO (fase 1) -->
<rect x="500" y="480" width="140" height="40" fill="#1a2830" stroke="url(#dGold)" stroke-width="2"/>
<g>${[525,570,615].map(x=>'<rect x="'+(x-9)+'" y="410" width="18" height="96" rx="9" fill="#cfeeff" fill-opacity=".1" stroke="#9be7ff" stroke-opacity=".5"/>').join("")}</g>
<g data-off="1" fill="#24463e">${[525,570,615].map(x=>'<rect x="'+(x-7)+'" y="460" width="14" height="44" rx="7"/>').join("")}</g>
<g data-on="1" filter="url(#dGlow)">${[[525,"#9be7ff",440],[570,"#3fd0a0",452],[615,"#e5c158",430]].map(t=>'<rect x="'+(t[0]-7)+'" y="'+t[2]+'" width="14" height="'+(504-t[2])+'" rx="7" fill="'+t[1]+'"/>').join("")}</g>

<!-- MICROSCÓPIO (fase 2) -->
<ellipse cx="790" cy="514" rx="62" ry="9" fill="#1a2830" stroke="url(#dGold)" stroke-width="2"/>
<path d="M820 510V440Q820 400 790 380" fill="none" stroke="url(#dSteel)" stroke-width="18" stroke-linecap="round"/>
<rect x="744" y="460" width="96" height="10" fill="url(#dGold)"/>
<g transform="rotate(-22 770 400)"><rect x="758" y="330" width="26" height="100" rx="5" fill="#2c3d49" stroke="url(#dGold)" stroke-width="2"/><rect x="754" y="320" width="34" height="16" rx="4" fill="url(#dGold)"/></g>
<g data-on="2" filter="url(#dGlow)"><ellipse cx="792" cy="458" rx="30" ry="6" fill="#9be7ff" opacity=".8"/><polygon points="772,456 812,456 800,420 784,420" fill="url(#dBeam)" opacity=".7"/>
 <circle cx="760" cy="300" r="2.5" fill="#9be7ff"/></g>

<!-- CABINE DE CONTENÇÃO (fase 9) -->
<rect x="940" y="140" width="250" height="640" fill="#0b161c" stroke="url(#dGold)" stroke-width="6"/>
<rect x="944" y="736" width="242" height="40" fill="url(#dHaz)" opacity=".7"/>
<text x="1065" y="166" text-anchor="middle" font-family="Cinzel,serif" font-size="14" fill="#e5c158" letter-spacing="3">CONTENÇÃO</text>
<rect x="960" y="176" width="210" height="550" fill="#05090c"/>
<g data-on="9">${suspect("d",1065,720,1.05)}${plaque("d",1065,606)}</g>
<g data-off="9"><rect x="960" y="176" width="210" height="550" fill="#9be7ff" opacity=".1"/><g stroke="#cfeeff" stroke-opacity=".1" stroke-width="22">${[0,1,2,3,4].map(i=>'<path d="M960 '+(250+i*110)+'L1170 '+(170+i*110)+'"/>').join("")}</g>
 <text x="1065" y="470" text-anchor="middle" font-family="Cinzel,serif" font-size="70" fill="#4fc3f7" fill-opacity=".35">?</text></g>
<rect x="960" y="176" width="210" height="550" fill="url(#dGlass)" stroke="#9be7ff" stroke-opacity=".4"/>

<!-- BANCADA DE MISTURA (fase 6) -->
<rect x="1220" y="520" width="330" height="18" fill="#2a3a44" stroke="url(#dGold)" stroke-width="2"/>
<rect x="1230" y="538" width="310" height="160" fill="#0d181e" stroke="#d4af37" stroke-opacity=".35"/>
<rect x="1262" y="440" width="54" height="80" fill="#cfeeff" fill-opacity=".08" stroke="#9be7ff" stroke-opacity=".6" stroke-width="2"/><rect x="1264" y="478" width="50" height="40" fill="#2a6f9a" opacity=".8"/>
<rect x="1454" y="440" width="54" height="80" fill="#cfeeff" fill-opacity=".08" stroke="#9be7ff" stroke-opacity=".6" stroke-width="2"/><rect x="1456" y="470" width="50" height="48" fill="#2f8a5a" opacity=".8"/>
<circle cx="1385" cy="476" r="40" fill="#cfeeff" fill-opacity=".07" stroke="#9be7ff" stroke-opacity=".6" stroke-width="2"/><rect x="1375" y="398" width="20" height="42" fill="#cfeeff" fill-opacity=".07" stroke="#9be7ff" stroke-opacity=".6" stroke-width="2"/>
<path d="M1290 440V410H1375M1481 440V410H1395" fill="none" stroke="#9be7ff" stroke-opacity=".45" stroke-width="3"/>
<rect x="1360" y="514" width="50" height="8" fill="url(#dGold)"/>
<g data-on="6" filter="url(#dGlow)"><path d="M1347 486a40 40 0 0 0 76 0Z" fill="#e5c158"/><g fill="#fff3c4"><circle cx="1372" cy="470" r="4"/><circle cx="1392" cy="456" r="3"/><circle cx="1385" cy="430" r="4"/><circle cx="1398" cy="412" r="3"/></g>
 <path d="M1290 410H1375M1481 410H1395" stroke="#9be7ff" stroke-width="3"/></g>
</g>
${vig("d")}
</svg>`;

const salaCamara=()=>SVG0+`<defs>${dDefs()}
 <linearGradient id="dCold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15283a"/><stop offset="1" stop-color="#08121b"/></linearGradient></defs>
<g data-depth="0">
<rect width="1600" height="640" fill="url(#dCold)"/><rect width="1600" height="640" fill="url(#dTile)"/>
${frieze("d",640)}
<rect y="640" width="1600" height="260" fill="url(#dFloor)"/>${pFloor(640,"#9be7ff",".06")}
<g data-depth="2" fill="#cfeeff" opacity=".1">${[[300,700],[540,760],[1460,720],[760,820],[1500,860]].map(p=>'<ellipse cx="'+p[0]+'" cy="'+p[1]+'" rx="90" ry="10"/>').join("")}</g>

</g>
<g data-depth="1">
<!-- GAVETAS DO NECROTÉRIO (fase 4) -->
<rect x="120" y="150" width="640" height="460" fill="#0a131a" stroke="url(#dGold)" stroke-width="4"/>
<g>${[[150,180,"A₁"],[350,180,"A₂"],[550,180,"A₃"],[150,400,"A₄"],[350,400,"A₅"]].map(d=>'<rect x="'+d[0]+'" y="'+d[1]+'" width="180" height="190" fill="url(#dSteel)" stroke="#d4af37" stroke-opacity=".5"/><rect x="'+(d[0]+60)+'" y="'+(d[1]+80)+'" width="60" height="12" rx="5" fill="url(#dGold)"/><rect x="'+(d[0]+66)+'" y="'+(d[1]+24)+'" width="48" height="24" fill="#0a1017" stroke="#d4af37" stroke-opacity=".6"/><text x="'+(d[0]+90)+'" y="'+(d[1]+42)+'" text-anchor="middle" font-family="Cinzel,serif" font-size="16" fill="#e5c158">'+d[2]+'</text>').join("")}</g>
<g><rect x="550" y="400" width="180" height="190" fill="#0d1820" stroke="#d4af37" stroke-opacity=".35"/><circle cx="640" cy="480" r="44" fill="#0a1017" stroke="url(#dGold)" stroke-width="3"/><path d="M640 480L664 456" stroke="#9be7ff" stroke-width="3"/><text x="640" y="556" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="20" font-weight="700" fill="#9be7ff" fill-opacity=".7">−18 °C</text></g>
<g data-on="4"><rect x="350" y="400" width="180" height="190" fill="#03070a"/><polygon points="330,560 550,560 590,640 290,640" fill="url(#dSteel)" stroke="url(#dGold)" stroke-width="2"/>
 <path d="M340 560Q440 530 540 560" fill="#cfd8de" opacity=".8"/>
 <g filter="url(#dGlow)"><rect x="352" y="600" width="176" height="30" fill="#0a1017" stroke="#9be7ff" stroke-width="2"/><text x="440" y="622" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="19" font-weight="700" fill="#9be7ff">A₅ = A₄ − A₁</text></g></g>

<!-- DUTO DE VENTILAÇÃO (fase 5) -->
<rect x="1230" y="90" width="290" height="160" fill="#05090c" stroke="url(#dGold)" stroke-width="4"/>
<g data-off="5" stroke="#4a5d6a" stroke-width="8">${[0,1,2,3,4,5,6].map(i=>'<line x1="1246" y1="'+(108+i*21)+'" x2="1504" y2="'+(108+i*21)+'"/>').join("")}</g>
<g data-on="5"><polygon points="1230,250 1520,250 1486,330 1196,330" fill="url(#dSteel)" stroke="url(#dGold)" stroke-width="2" opacity=".9"/>
 <g filter="url(#dGlow)" fill="none" stroke="#9be7ff" stroke-width="2.5" stroke-linecap="round"><path d="M1290 130q20 40 0 80t0 80"/><path d="M1375 120q24 40 0 90t0 90"/><path d="M1460 130q20 40 0 80t0 80"/></g></g>

<!-- MACA (fase 8) -->
<path d="M1120 63V170" stroke="#d4af37" stroke-width="2"/><path d="M1070 196Q1120 160 1170 196Z" fill="url(#dGold)"/>
<polygon data-on="8" points="1080,196 1160,196 1360,600 880,600" fill="url(#dBeam)" opacity=".55"/>
<rect x="880" y="600" width="480" height="14" fill="url(#dSteel)" stroke="url(#dGold)" stroke-width="2"/>
<path d="M920 614L1100 740M1100 614L920 740M1140 614L1320 740M1320 614L1140 740" stroke="#4a5d6a" stroke-width="6"/>
<g fill="#05080c" stroke="url(#dGold)" stroke-width="2">${[920,1100,1140,1320].map(x=>'<circle cx="'+x+'" cy="752" r="14"/>').join("")}</g>
<path d="M900 600Q905 560 950 556Q1000 548 1040 560Q1100 540 1180 552Q1260 545 1330 570Q1345 585 1340 600Z" fill="#cfd8de" opacity=".88"/>
<path d="M1340 584L1362 600" stroke="#e8e4d8" stroke-width="2"/><rect x="1352" y="600" width="64" height="36" fill="#e8e4d8" transform="rotate(8 1384 618)"/>
<text data-off="8" x="1384" y="626" text-anchor="middle" font-family="Cinzel,serif" font-size="20" fill="#1a1218" transform="rotate(8 1384 618)">?</text>
<g data-on="8" filter="url(#dGlow)" transform="rotate(8 1384 618)"><rect x="1352" y="600" width="64" height="36" fill="none" stroke="#4fc3f7" stroke-width="3"/><text x="1384" y="626" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="20" font-weight="700" fill="#16688f">LI</text></g>
</g>
${vig("d")}
</svg>`;

const sceneDependencia=()=>({
  intro:"O laboratório foi lacrado e a cientista-chefe sumiu. Alguém transformou as amostras em vetores, e um deles dependia dos outros.",
  salas:[{id:"laboratorio",nome:"Laboratório de genética",svg:salaLab()},{id:"camara",nome:"Câmara fria",svg:salaCamara()}],
  hotspots:[
    {caso:0,sala:"laboratorio",nome:"Frascos de reagentes",...box(80,170,340,150),
      falaAbrir:"Quatro frascos, quatro reações. Uma delas não respeita a origem.",
      falaResolvido:"O frasco da exponencial ferveu no zero. Não é linear.",
      pista:"Toda transformação linear leva zero em zero; a exponencial leva zero em um."},
    {caso:1,sala:"laboratorio",nome:"Tubos de ensaio",...box(490,400,160,125),
      falaAbrir:"Três tubos, três linhas de uma matriz. Algum deles é cópia dos outros?",
      falaResolvido:"Três tubos, três direções diferentes. Nenhum é cópia.",
      pista:"Determinante não nulo: as linhas são LI e geram o espaço todo."},
    {caso:2,sala:"laboratorio",nome:"Microscópio",...box(705,320,170,205),
      falaAbrir:"Na lâmina, a imagem de uma transformação. Até onde ela chega?",
      falaResolvido:"A imagem é um plano inteiro: posto dois.",
      pista:"Núcleo trivial: o posto é a dimensão do domínio."},
    {caso:3,sala:"laboratorio",nome:"Gel de eletroforese",...box(500,112,380,186),requires:[1],
      falaBloqueado:"O gel ainda não revelou as bandas. Os tubos de ensaio vêm primeiro.",
      falaAbrir:"Quatro fitas no gel. Escalonar é separar as bandas.",
      falaResolvido:"Quatro bandas distintas: quatro vetores LI.",
      pista:"Escalonar não muda o espaço-linha; conte as linhas não nulas."},
    {caso:4,sala:"camara",nome:"Gavetas do necrotério",...box(120,150,640,460),requires:[3],
      falaBloqueado:"Cinco gavetas trancadas. As fitas do gel, no laboratório, dizem qual abrir.",
      falaAbrir:"Cinco gavetas, cinco vetores. Uma delas guarda uma combinação das outras.",
      falaResolvido:"A quinta gaveta era a diferença de duas: A₄ − A₁. O conjunto é LD.",
      pista:"Um vetor que é combinação dos outros não aumenta a dimensão."},
    {caso:5,sala:"camara",nome:"Duto de ventilação",...box(1220,80,310,180),requires:[0],
      falaBloqueado:"A grade do duto está soldada. Os frascos do laboratório explicam o gás que passou por aqui.",
      falaAbrir:"O gás escapou por algum caminho. Que entradas viram zero?",
      falaResolvido:"Uma direção inteira some pelo duto: nulidade um.",
      pista:"Resolva T(x)=0 e conte os parâmetros livres."},
    {caso:6,sala:"laboratorio",nome:"Bancada de mistura",...box(1240,380,290,150),requires:[2],
      falaBloqueado:"Os béqueres estão vazios. Preciso entender o microscópio antes de misturar.",
      falaAbrir:"Dois reagentes e uma ordem de mistura: primeiro T, depois S.",
      falaResolvido:"A mistura brilhou. A composição tem ordem.",
      pista:"ST aplica T primeiro e S depois."},
    {caso:7,sala:"laboratorio",nome:"Centrífuga",...box(110,560,220,230),requires:[5],
      falaBloqueado:"A centrífuga está sem energia. O duto da câmara fria pode explicar o curto.",
      falaAbrir:"A centrífuga descarta o primeiro coeficiente e gira o resto.",
      falaResolvido:"Só as constantes ficam paradas no centro: elas são o núcleo.",
      pista:"O deslocamento S zera apenas os polinômios constantes."},
    {caso:8,sala:"camara",nome:"Maca",...box(860,500,540,280),requires:[4,6],
      falaBloqueado:"O lençol cobre algo que ainda não estou pronto para ver. Gavetas e mistura primeiro.",
      falaAbrir:"A etiqueta no pé diz: injetora. O que isso garante?",
      falaResolvido:"Injetora não esmaga direções: o que era LI continua LI.",
      pista:"Com N(T)={0}, T preserva a independência linear."},
    {caso:9,sala:"laboratorio",nome:"Cabine de contenção",...box(930,130,270,660),requires:[0,1,2,3,4,5,6,7,8],
      falaBloqueado:"A cabine só abre com todas as amostras analisadas.",
      falaAbrir:"O suspeito desfazia o que fazia… quase. Cada coeficiente guarda a marca.",
      falaResolvido:"TS não é a identidade: o c₀ apagado denunciou o culpado.",
      pista:"TS apaga c₀ e devolve o resto; repetir não muda mais nada."}
  ],
  interrogatorio:[
    {pista:0,fala:"A reação exponencial é tão linear quanto as outras. Eu só segui a fórmula.",
      refuta:"e⁰ = 1: a exponencial não leva zero em zero, então não é linear."},
    {pista:4,fala:"Cinco gavetas, cinco vetores: são independentes e geram um espaço de dimensão cinco.",
      refuta:"A₅ = A₄ − A₁. O conjunto é LD e o espaço-linha tem dimensão 4."},
    {pista:8,fala:"Uma transformação injetora pode juntar vetores independentes numa mesma direção.",
      refuta:"Se T é injetora, N(T) = {0}, e ela leva vetores LI em vetores LI."}
  ],
  final:{
    texto:"A cabine se abriu e o culpado estava lá dentro, cercado de vetores que jurava independentes. Um deles não era. Caso arquivado.",
    fala:"Dependência linear é como álibi combinado: basta um para derrubar o resto."
  }
});

/* =================== O OBSERVATÓRIO QUADRÁTICO: cúpula e sala de mapas =================== */
const oStars=(x0,y0,w,h,n,seed)=>{let s="",r=seed;const nx=()=>(r=(r*9301+49297)%233280)/233280;
  for(let i=0;i<n;i++)s+='<circle cx="'+(x0+nx()*w).toFixed(0)+'" cy="'+(y0+nx()*h).toFixed(0)+'" r="'+(.8+nx()*1.6).toFixed(1)+'" fill="#cfeeff" opacity="'+(.35+nx()*.6).toFixed(2)+'"/>';return s};
const oDefs=()=>baseDefs("o")+`
 <linearGradient id="oSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b16"/><stop offset="1" stop-color="#12284a"/></linearGradient>
 <linearGradient id="oDome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1622"/><stop offset="1" stop-color="#16212d"/></linearGradient>
 <linearGradient id="oFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121a24"/><stop offset="1" stop-color="#05080c"/></linearGradient>
 <linearGradient id="oTube" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a3a48"/><stop offset=".5" stop-color="#4a5d6e"/><stop offset="1" stop-color="#1a2530"/></linearGradient>
 <radialGradient id="oSun"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#e5c158"/><stop offset="1" stop-color="#8a6d1c"/></radialGradient>
 <radialGradient id="oGlobe" cx=".35" cy=".35"><stop offset="0" stop-color="#2a4a6a"/><stop offset="1" stop-color="#0a1624"/></radialGradient>
 <clipPath id="oSlit"><rect x="700" y="63" width="200" height="380"/></clipPath>`;

const salaCupula=()=>SVG0+`<defs>${oDefs()}</defs>
<g data-depth="0">
<rect width="1600" height="640" fill="#080d14"/>
<!-- cúpula com nervuras e fenda -->
<path d="M46 640V420Q46 63 800 63Q1554 63 1554 420V640Z" fill="url(#oDome)"/>
<g fill="none" stroke="#d4af37" stroke-opacity=".18" stroke-width="2">${[-3,-2,-1,1,2,3].map(i=>'<path d="M800 63Q'+(800+i*230)+' 200 '+(800+i*250)+' 640"/>').join("")}<path d="M60 330Q800 230 1540 330"/><path d="M50 470Q800 400 1550 470"/></g>
<g clip-path="url(#oSlit)"><rect x="700" y="63" width="200" height="380" fill="url(#oSky)"/>${oStars(700,63,200,380,40,11)}
 <circle cx="860" cy="130" r="18" fill="#e9fbff" opacity=".9"/></g>
<path d="M700 63V443M900 63V443" stroke="url(#oGold)" stroke-width="5"/>
${frieze("o",640)}
<rect y="640" width="1600" height="260" fill="url(#oFloor)"/>${pFloor(640,"#d4af37",".06")}
<ellipse cx="800" cy="700" rx="420" ry="46" fill="none" stroke="#d4af37" stroke-opacity=".3" stroke-width="3"/>

</g>
<g data-depth="1">
<!-- LUNETA (fase 0): aponta na direção (1,1) -->
<path d="M760 700L790 600H810L840 700Z" fill="#141e28" stroke="url(#oGold)" stroke-width="2"/>
<circle cx="800" cy="580" r="26" fill="url(#oGold)"/>
<g transform="rotate(45 800 560)"><rect x="770" y="300" width="60" height="300" rx="8" fill="url(#oTube)" stroke="url(#oGold)" stroke-width="3"/>
 <rect x="762" y="296" width="76" height="22" rx="4" fill="url(#oGold)"/><rect x="782" y="590" width="36" height="40" fill="#1a2530" stroke="#d4af37" stroke-opacity=".6"/>
 <rect x="770" y="420" width="60" height="10" fill="url(#oGold)"/></g>
<g data-on="0" filter="url(#oGlow)"><path d="M1012 348L1160 200" stroke="#9be7ff" stroke-width="3" stroke-dasharray="12 8"/>
 <circle cx="1180" cy="180" r="18" fill="none" stroke="#9be7ff" stroke-width="2.5"/><path d="M1180 152V208M1152 180H1208" stroke="#9be7ff" stroke-width="2"/>
 <text x="1214" y="232" font-family="Rajdhani,sans-serif" font-size="24" font-weight="700" fill="#9be7ff">Av = λv</text></g>

<!-- RELÓGIO ASTRONÔMICO (fase 2) -->
<circle cx="260" cy="310" r="130" fill="#0b1219" stroke="url(#oGold)" stroke-width="6"/>
<circle cx="260" cy="310" r="104" fill="none" stroke="#d4af37" stroke-opacity=".5" stroke-width="2"/><circle cx="260" cy="310" r="66" fill="none" stroke="url(#oGold)" stroke-width="3"/>
<g stroke="#d4af37" stroke-opacity=".7" stroke-width="2">${[...Array(24).keys()].map(i=>{const a=i/24*Math.PI*2;return '<line x1="'+(260+Math.cos(a)*108).toFixed(1)+'" y1="'+(310+Math.sin(a)*108).toFixed(1)+'" x2="'+(260+Math.cos(a)*(i%2?118:124)).toFixed(1)+'" y2="'+(310+Math.sin(a)*(i%2?118:124)).toFixed(1)+'"/>'}).join("")}</g>
<path d="M260 310L260 214M260 310L330 352" stroke="url(#oGold)" stroke-width="4" stroke-linecap="round"/><circle cx="260" cy="310" r="10" fill="url(#oSun)"/>
<g data-off="2" fill="#4a5d6e"><circle cx="198" cy="262" r="9"/><circle cx="330" cy="280" r="9"/></g>
<g data-on="2" filter="url(#oGlow)"><circle cx="198" cy="262" r="10" fill="#9be7ff"/><circle cx="330" cy="280" r="10" fill="#9be7ff"/>
 <text x="260" y="476" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="22" font-weight="700" fill="#9be7ff">det(A − λI) = 0</text></g>

<!-- PRISMA (fase 4) -->
<path d="M1110 640L1150 560H1250L1290 640" fill="none" stroke="#3a2416" stroke-width="8"/>
<rect x="1120" y="552" width="160" height="14" fill="url(#oGold)"/>
<path d="M1000 520L1170 520" stroke="#e8e4d8" stroke-width="4" opacity=".7"/>
<polygon points="1200,460 1240,548 1160,548" fill="#cfeeff" fill-opacity=".18" stroke="#9be7ff" stroke-width="2.5"/>
<g data-on="4" filter="url(#oGlow)" stroke-width="4" stroke-linecap="round">
 <path d="M1222 512L1330 470" stroke="#ff5a4d"/><path d="M1224 518L1335 494" stroke="#ff9a3a"/><path d="M1226 524L1338 518" stroke="#e5c158"/>
 <path d="M1226 530L1336 542" stroke="#3fd0a0"/><path d="M1224 536L1330 566" stroke="#4fc3f7"/>
 <text x="1250" y="448" font-family="Rajdhani,sans-serif" font-size="22" font-weight="700" fill="#9be7ff" stroke="none">λ ∈ ℝ</text></g>

<!-- PLANETÁRIO (fase 7) -->
<path d="M260 780L290 700H350L380 780Z" fill="#141e28" stroke="url(#oGold)" stroke-width="2"/><rect x="314" y="620" width="12" height="82" fill="url(#oGold)"/>
<circle cx="320" cy="610" r="24" fill="url(#oSun)"/>
<g data-off="7" fill="none" stroke="#d4af37" stroke-opacity=".35" stroke-width="2"><ellipse cx="320" cy="610" rx="150" ry="40"/><ellipse cx="320" cy="610" rx="96" ry="26"/></g>
<g data-off="7"><circle cx="170" cy="610" r="10" fill="#4a5d6e"/><circle cx="410" cy="630" r="7" fill="#4a5d6e"/></g>
<g data-on="7" filter="url(#oGlow)"><ellipse cx="320" cy="610" rx="150" ry="58" transform="rotate(-20 320 610)" fill="none" stroke="#9be7ff" stroke-width="3"/>
 <path d="M178 662L462 558M282 506L358 714" stroke="#9be7ff" stroke-opacity=".5" stroke-dasharray="6 6"/>
 <circle cx="180" cy="660" r="10" fill="#9be7ff"/><text x="320" y="530" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="20" font-weight="700" fill="#9be7ff">x'² + 5y'² = 5</text></g>
</g>
${vig("o")}
</svg>`;

const salaMapas=()=>SVG0+`<defs>${oDefs()}
 <linearGradient id="oWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1a22"/><stop offset="1" stop-color="#0e0d12"/></linearGradient>
 <linearGradient id="oChart" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2236"/><stop offset="1" stop-color="#081422"/></linearGradient></defs>
<g data-depth="0">
<rect width="1600" height="620" fill="url(#oWood)"/>
${frieze("o",620)}
<rect x="46" y="500" width="1508" height="120" fill="#151016"/><path d="M46 500H1554" stroke="url(#oGold)" stroke-width="2"/>
<g stroke="#d4af37" stroke-opacity=".15">${[...Array(15).keys()].map(i=>'<line x1="'+(100+i*100)+'" y1="510" x2="'+(100+i*100)+'" y2="610"/>').join("")}</g>
<rect y="620" width="1600" height="280" fill="url(#oFloor)"/>${pFloor(620,"#d4af37",".06")}

</g>
<g data-depth="1">
<!-- LOUSA (fase 1) -->
<rect x="90" y="130" width="350" height="270" rx="4" fill="#6f5614"/><rect x="100" y="140" width="330" height="250" fill="#0c1a1f"/>
<rect x="100" y="390" width="330" height="10" fill="url(#oGold)"/>
<g font-family="Rajdhani,sans-serif" font-size="34" fill="#cfeeff" fill-opacity=".55"><text x="130" y="200">A =</text>
 <path d="M200 160V300M370 160V300" stroke="#cfeeff" stroke-opacity=".55" stroke-width="3"/><text x="214" y="214">a</text><text x="306" y="214">b</text><text x="216" y="282">0</text><text x="306" y="282">d</text></g>
<text x="130" y="360" font-family="Rajdhani,sans-serif" font-size="26" fill="#cfeeff" fill-opacity=".45">λ = ?</text>
<g data-on="1" filter="url(#oGlow)" fill="none" stroke="#9be7ff" stroke-width="3"><circle cx="224" cy="203" r="26"/><circle cx="315" cy="271" r="26"/><path d="M244 222L295 252"/></g>

<!-- MAPA DE CONSTELAÇÕES (fase 3) -->
<rect x="500" y="110" width="360" height="220" fill="url(#oChart)" stroke="url(#oGold)" stroke-width="4"/>
<g stroke="#d4af37" stroke-opacity=".2">${[0,1,2,3,4,5].map(i=>'<line x1="'+(500+i*72)+'" y1="110" x2="'+(500+i*72)+'" y2="330"/>').join("")+[0,1,2,3].map(i=>'<line x1="500" y1="'+(110+i*73)+'" x2="860" y2="'+(110+i*73)+'"/>').join("")}</g>
${oStars(510,120,340,200,26,5)}
<g stroke="#cfeeff" stroke-opacity=".5" fill="#cfeeff"><path d="M560 280L620 230L700 250L760 180L820 200" fill="none"/>${[[560,280],[620,230],[700,250],[760,180],[820,200]].map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5"/>').join("")}</g>
<g data-on="3" filter="url(#oGlow)"><path d="M590 300L770 120M590 140L770 300" stroke="#9be7ff" stroke-width="2.5"/>
 <g font-family="Rajdhani,sans-serif" font-size="20" font-weight="700" fill="#9be7ff"><text x="776" y="132">b₁</text><text x="776" y="312">b₂</text></g></g>

<!-- SUSPEITO atrás do cavalete (fase 9) -->
<g data-on="9">${suspect("o",825,470,.72)}</g>
<!-- CAVALETE COM O GRÁFICO (fase 9) -->
<path d="M760 780L800 440M890 780L850 440M825 440V790" stroke="#3a2416" stroke-width="8"/>
<rect x="730" y="450" width="190" height="180" fill="#e8e4d8" opacity=".92"/>
<path d="M750 610H906M760 620V466" stroke="#1a1218" stroke-width="2"/><path d="M760 610V466" stroke="#1a1218" stroke-width="2"/>
<g fill="#1a1218">${[[790,560],[828,560],[866,500]].map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="6"/>').join("")}</g>
<g data-off="9"><rect x="730" y="450" width="190" height="90" fill="#5a1220" opacity=".9"/><text x="825" y="505" text-anchor="middle" font-family="Cinzel,serif" font-size="34" fill="#e5c158" fill-opacity=".8">?</text></g>
<g data-on="9"><path d="M766 584L900 494" stroke="#ff5a4d" stroke-width="4"/>${plaque("o",825,640)}</g>

<!-- ESCRIVANINHA E CADERNO (fase 6) -->
<ellipse cx="470" cy="770" rx="230" ry="14" fill="#000" opacity=".5"/>
<rect x="260" y="560" width="420" height="18" fill="#2a1a10" stroke="url(#oGold)" stroke-width="2"/>
<rect x="276" y="578" width="388" height="90" fill="#160d08" stroke="#d4af37" stroke-opacity=".35"/><rect x="280" y="668" width="16" height="96" fill="#160d08"/><rect x="644" y="668" width="16" height="96" fill="#160d08"/>
<polygon points="372,556 470,548 470,512 380,518" fill="#e8e4d8"/><polygon points="568,556 470,548 470,512 560,518" fill="#d9d4c5"/>
<g data-off="6" stroke="#1a1218" stroke-opacity=".4" stroke-width="2"><path d="M392 530l64-4M392 540l64-4M484 526l64 4M484 536l64 4"/></g>
<g data-on="6" filter="url(#oGlow)"><path d="M392 530l64-4M392 540l64-4M484 526l64 4M484 536l64 4" stroke="#4fc3f7" stroke-width="2"/>
 <text x="470" y="494" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="22" font-weight="700" fill="#9be7ff">λ₁x'² + λ₂y'²</text></g>
<g><rect x="610" y="520" width="10" height="40" fill="#e8e4d8"/><ellipse cx="615" cy="514" rx="5" ry="9" fill="#ffd36b"/><ellipse cx="615" cy="520" rx="40" ry="30" fill="url(#oCu)" opacity=".7"/></g>

<!-- GLOBO CELESTE (fase 5) -->
<ellipse cx="1090" cy="700" rx="70" ry="12" fill="url(#oGold)"/><rect x="1084" y="560" width="12" height="140" fill="url(#oGold)"/>
<circle cx="1090" cy="450" r="96" fill="url(#oGlobe)"/>${oStars(1010,370,160,160,18,23)}
<g fill="none" stroke="#d4af37" stroke-opacity=".35"><ellipse cx="1090" cy="450" rx="96" ry="30"/><ellipse cx="1090" cy="450" rx="40" ry="96"/></g>
<circle data-off="5" cx="1090" cy="450" r="110" fill="none" stroke="url(#oGold)" stroke-width="6"/>
<g data-on="5"><ellipse cx="1090" cy="450" rx="110" ry="110" fill="none" stroke="url(#oGold)" stroke-width="6"/>
 <ellipse cx="1090" cy="450" rx="110" ry="36" transform="rotate(-30 1090 450)" fill="none" stroke="#9be7ff" stroke-width="3" filter="url(#oGlow)"/>
 <text x="1090" y="300" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="22" font-weight="700" fill="#9be7ff" filter="url(#oGlow)">QᵀQ = I</text></g>

<!-- MAQUETE DO HIPERBOLOIDE (fase 8) -->
<rect x="1290" y="620" width="140" height="100" fill="#141e28" stroke="url(#oGold)" stroke-width="3"/><rect x="1280" y="610" width="160" height="12" fill="url(#oGold)"/>
<g data-off="8" stroke="#d4af37" stroke-opacity=".55" stroke-width="2">${[...Array(14).keys()].map(i=>{const a=i/14*Math.PI*2,b=a+1.9;return '<line x1="'+(1360+Math.cos(a)*70).toFixed(1)+'" y1="'+(340+Math.sin(a)*14).toFixed(1)+'" x2="'+(1360+Math.cos(b)*70).toFixed(1)+'" y2="'+(590+Math.sin(b)*14).toFixed(1)+'"/>'}).join("")}</g>
<g data-on="8" filter="url(#oGlow)" stroke="#9be7ff" stroke-width="2">${[...Array(14).keys()].map(i=>{const a=i/14*Math.PI*2,b=a+1.9;return '<line x1="'+(1360+Math.cos(a)*70).toFixed(1)+'" y1="'+(340+Math.sin(a)*14).toFixed(1)+'" x2="'+(1360+Math.cos(b)*70).toFixed(1)+'" y2="'+(590+Math.sin(b)*14).toFixed(1)+'"/>'}).join("")}
 <text x="1360" y="314" text-anchor="middle" font-family="Rajdhani,sans-serif" font-size="20" font-weight="700" fill="#9be7ff" stroke="none">1 folha</text></g>
<ellipse cx="1360" cy="340" rx="70" ry="14" fill="none" stroke="url(#oGold)" stroke-width="3"/><ellipse cx="1360" cy="590" rx="70" ry="14" fill="none" stroke="url(#oGold)" stroke-width="3"/>
</g>
${vig("o")}
</svg>`;

const sceneObservatorio=()=>({
  intro:"O observatório apagou as luzes na noite do eclipse. O astrônomo-chefe sumiu e deixou o céu inteiro anotado em matrizes.",
  salas:[{id:"cupula",nome:"Cúpula do telescópio",svg:salaCupula()},{id:"mapas",nome:"Sala de mapas",svg:salaMapas()}],
  hotspots:[
    {caso:0,sala:"cupula",nome:"Luneta",...box(700,300,360,420),
      falaAbrir:"A luneta aponta numa direção fixa. Se a matriz não a desvia, é um autovetor.",
      falaResolvido:"A direção se manteve, só esticou. O fator é o autovalor.",
      pista:"Autovetor não muda de direção: Av é só um múltiplo de v."},
    {caso:1,sala:"mapas",nome:"Lousa",...box(80,120,370,290),
      falaAbrir:"Uma matriz triangular na lousa, meio apagada. A diagonal sobreviveu.",
      falaResolvido:"Matriz triangular entrega os autovalores de bandeja: estão na diagonal.",
      pista:"Em matriz triangular, os autovalores são os elementos da diagonal."},
    {caso:2,sala:"cupula",nome:"Relógio astronômico",...box(110,160,300,330),requires:[1],
      falaBloqueado:"Os anéis do relógio giram sem parar. A lousa da sala de mapas explica como lê-los.",
      falaAbrir:"Cada ponteiro marca uma raiz do polinômio característico.",
      falaResolvido:"Os anéis travaram nas duas raízes.",
      pista:"Em 2×2, o polinômio característico é λ² − (traço)λ + det."},
    {caso:3,sala:"mapas",nome:"Mapa de constelações",...box(490,100,380,240),requires:[0],
      falaBloqueado:"O mapa está em outra base. Preciso antes saber para onde a luneta aponta.",
      falaAbrir:"As estrelas estão anotadas numa base girada. Vamos levar o vetor para ela.",
      falaResolvido:"Nas coordenadas novas, o mapa bate com o céu.",
      pista:"Coordenadas numa base nova: resolva c₁b₁ + c₂b₂ = v."},
    {caso:4,sala:"cupula",nome:"Prisma",...box(1070,430,290,210),requires:[2],
      falaBloqueado:"O prisma está escuro. Sem o relógio astronômico, não sei que luz procurar.",
      falaAbrir:"Entra luz complexa, saem cores reais. Coisa de matriz hermitiana.",
      falaResolvido:"O espectro saiu todo real, como prometido.",
      pista:"Matrizes hermitianas têm autovalores reais."},
    {caso:5,sala:"mapas",nome:"Globo celeste",...box(980,340,220,380),requires:[3],
      falaBloqueado:"O globo está travado. O mapa de constelações mostra o eixo de giro.",
      falaAbrir:"Girar o globo não muda distâncias. Desfazer o giro é transpor.",
      falaResolvido:"O giro desfeito revelou o ponto de partida.",
      pista:"Matriz ortogonal: a inversa é a transposta."},
    {caso:6,sala:"mapas",nome:"Caderno do astrônomo",...box(360,470,220,100),requires:[4,5],
      falaBloqueado:"O caderno está em código. Preciso do prisma e do globo para decifrá-lo.",
      falaAbrir:"Uma forma quadrática com termo misto. Nos eixos certos, ela fica limpa.",
      falaResolvido:"Diagonalizada: só quadrados, nenhum termo misto.",
      pista:"Na matriz da forma, os coeficientes de x² e y² vão na diagonal e metade do termo misto fora dela."},
    {caso:7,sala:"cupula",nome:"Planetário",...box(150,500,340,290),requires:[6],
      falaBloqueado:"As órbitas do planetário emperraram. O caderno do astrônomo tem a equação delas.",
      falaAbrir:"Uma órbita inclinada. Que curva é essa, afinal?",
      falaResolvido:"Uma elipse inclinada: os eixos principais a endireitam.",
      pista:"Autovalores de mesmo sinal: a cônica é uma elipse."},
    {caso:8,sala:"mapas",nome:"Maquete de retas",...box(1270,290,190,440),requires:[6],
      falaBloqueado:"A maquete está coberta. O caderno explica o que ela representa.",
      falaAbrir:"Retas que formam uma superfície curva. Quantas folhas ela tem?",
      falaResolvido:"Uma folha só, feita de retas. Bela peça.",
      pista:"Dois sinais positivos e um negativo, com lado direito positivo: hiperboloide de uma folha."},
    {caso:9,sala:"mapas",nome:"Cavalete do gráfico",...box(720,330,210,450),requires:[0,1,2,3,4,5,6,7,8],
      falaBloqueado:"O gráfico está coberto por um pano. Antes, todas as provas.",
      falaAbrir:"Três observações, uma reta e um mentiroso. A reta de menor erro o denuncia.",
      falaResolvido:"A reta apontou o esconderijo. O astrônomo nunca saiu do observatório.",
      pista:"Mínimos quadrados: resolva AᵀA·c = Aᵀy."}
  ],
  interrogatorio:[
    {pista:4,fala:"Aquela matriz hermitiana tinha autovalores complexos. Ninguém poderia confiar nas medidas.",
      refuta:"Matriz hermitiana tem autovalores sempre reais. O prisma provou isso."},
    {pista:5,fala:"Girar o globo distorce as distâncias. Por isso as minhas medidas não batem com as suas.",
      refuta:"Rotação é ortogonal: QᵀQ = I, e comprimentos e ângulos são preservados."},
    {pista:7,fala:"A órbita era uma hipérbole. Os planetas fugiram e levaram as provas.",
      refuta:"Os dois autovalores da forma são positivos: a órbita é uma elipse, fechada."}
  ],
  final:{
    texto:"A reta de mínimos quadrados cruzou o gráfico e apontou um único lugar: o próprio cavalete, onde o astrônomo se escondia. Cada autovalor indicou uma direção, e todas convergiram. Caso arquivado.",
    fala:"No fim, todo erro tem um mínimo. Basta saber projetar."
  }
});

const SCENES={
cofre:()=>({
  intro:"O cofre está vazio e o ladrão deixou tudo arrumado demais. Vamos ver o que cada objeto confessa.",
  salas:[{id:"escritorio",nome:"Escritório do cofre arrombado",svg:salaCofre()}],
  hotspots:[
    {caso:0,sala:"escritorio",nome:"Pegadas no tapete",...box(540,740,700,130),
      falaAbrir:"Alguém atravessou o tapete sem pressa. Vejamos o rastro.",
      falaResolvido:"O rastro parte da origem. Pista sólida.",
      pista:"Os passos partem da origem: o que é linear não sai do zero."},
    {caso:1,sala:"escritorio",nome:"Gaveta da mesa",...box(880,590,230,100),
      falaAbrir:"Uma gaveta com marcas de chave, nada forçado.",
      falaResolvido:"A chave encaixou. A estante vai ceder, e o cofre também.",
      pista:"Uma chave 2×2, gravada com a ordem das colunas."},
    {caso:2,sala:"escritorio",nome:"Quadro-negro",...box(470,130,380,250),
      falaAbrir:"Alguém apagou o quadro às pressas, mas sobrou um traço.",
      falaResolvido:"O que some no ponto cego tem dimensão. Anotado.",
      pista:"Um ponto cego: o que a transformação zera some do mapa."},
    {caso:3,sala:"escritorio",nome:"Janela",...box(90,100,300,370),
      falaAbrir:"Da janela só se vê um plano da cidade. O resto fica fora do campo.",
      falaResolvido:"Dois eixos aparecem, um se perde. Faz sentido.",
      pista:"A imagem é só um plano: o terceiro eixo foi descartado."},
    {caso:4,sala:"escritorio",nome:"Estante de arquivos",...box(480,410,220,310),requires:[1],
      falaBloqueado:"Trancada a chave. A chave deve estar por perto, talvez na mesa.",
      falaAbrir:"Dois arquivos lado a lado. Pelo menos os números não mentem.",
      falaResolvido:"Os arquivos se cruzam. Falta o cofre.",
      pista:"Dois cofres e uma só tabela de passagem entre eles."},
    {caso:5,sala:"escritorio",nome:"Telefone",...box(800,490,100,75),
      falaAbrir:"O telefone ainda está morno. Alguém desfez uma ligação.",
      falaResolvido:"A inversa existe. O informante vai querer falar.",
      pista:"Toda chamada tem um caminho de volta."},
    {caso:6,sala:"escritorio",nome:"Cofre",...box(1230,180,290,340),requires:[1,4],
      falaBloqueado:"O cofre pede a chave da mesa e o arquivo da estante. Ainda faltam peças.",
      falaAbrir:"A cadeia de custódia tem dois elos. Quem agiu primeiro?",
      falaResolvido:"Vazio, mas o rastro continua.",
      pista:"Dois movimentos em ordem: o último a agir é o primeiro a ser escrito."},
    {caso:7,sala:"escritorio",nome:"Livro-caixa",...box(945,505,140,65),requires:[2,3],
      falaBloqueado:"O livro está lacrado por um padrão. Preciso entender melhor o quadro e a janela.",
      falaAbrir:"Cada página sobe uma potência. Quem escreve assim quer esconder algo.",
      falaResolvido:"Os coeficientes sobem de grau, mas nada volta igual.",
      pista:"Deslocar e derivar não desfazem um ao outro."},
    {caso:8,sala:"escritorio",nome:"Informante",...box(150,470,180,335),requires:[5],
      falaBloqueado:"Ele não fala sem uma ligação feita. Preciso usar o telefone antes.",
      falaAbrir:"“Dois interrogatórios, uma única saída”, ele sussurra.",
      quem:"Informante",falaResolvido:"Já falei demais. O retrato deve interessar ao senhor.",
      pista:"O que escapa do duplo interrogatório vem de uma só linha."},
    {caso:9,sala:"escritorio",nome:"Retrato",...box(940,120,220,300),requires:[0,1,2,3,4,5,6,7,8],
      falaBloqueado:"O retrato esconde algo, mas ainda faltam pistas. Examine tudo antes.",
      falaAbrir:"Todos os rastros apontam para este rosto. Uma última conta.",
      falaResolvido:"Era ele. O caso está resolvido.",
      pista:"A inversa da composição entrega o endereço do suspeito."}
  ],
  interrogatorio:[
    {pista:0,fala:"Eu só somei uma constante às coordenadas. Uma transformação dessas continua sendo linear.",
      refuta:"Somar uma constante tira a origem do lugar: T(0) deixa de ser 0. Não é linear."},
    {pista:6,fala:"A ordem não importa: arrombar e depois esconder dá no mesmo que esconder e depois arrombar. ST e TS são iguais.",
      refuta:"Composição tem ordem. ST aplica T primeiro; aqui TS nem está definida, porque S sai do ℝ² e chega ao ℝ³."},
    {pista:8,fala:"Minha transformação não apaga nada. O núcleo de ST é só o vetor zero.",
      refuta:"O núcleo de ST tem dimensão 1: a direção inteira de (−1, 1, 1) vai para zero."}
  ],
  final:{
    texto:"O retrato girou e mostrou o rosto de quem esvaziou o cofre. Cada conta fechou um elo, e a inversa da composição entregou o nome. Caso arquivado.",
    fala:"Nada some de verdade: só muda de lugar. E toda transformação deixa um núcleo para quem sabe olhar."
  }
}),
fantasma:sceneFantasma,
dependencia:sceneDependencia,
observatorio:sceneObservatorio
};
