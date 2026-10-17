/* RKO SOR – logika (czysta, testowalna). */
(function(root){
'use strict';
const VERSION='1.9.4';
// ---------- liczby i formatowanie ----------
function r1(x){return Math.round(x*10)/10}
function fmt1(x){const v=r1(x);return (Number.isInteger(v)?String(v):v.toFixed(1)).replace('.',',')}
function mlWord(x){const v=r1(x);if(!Number.isInteger(v))return 'mililitra';
 if(v===1)return 'mililitr';const d=v%10,t=v%100;if(d>=2&&d<=4&&!(t>=12&&t<=14))return 'mililitry';return 'mililitrów'}
function flowPhrase(x){return fmt1(x)+' '+mlWord(x)+' na godzinę'}
const NORA={50:{mg:4,ml:50,conc:80},20:{mg:2,ml:20,conc:100}}; // µg/ml
function noraMlh(dose,kg,syr){return r1(dose*kg*60/NORA[syr||50].conc)}
const DOBU={mg:250,ml:50,conc:5000};
const BINT={iso:150000,adrinf:150000,dopa:300000};
const BINF={iso:{name:'izoprenalina',mg:1,ml:50,unit:'min',start:1*5,step:1,max:20},adrinf:{name:'adrenalina we wlewie',mg:1,ml:50,unit:'min',start:2,step:1,max:10},dopa:{name:'dopamina (poza ERC – lokalny standard)',mg:200,ml:50,unit:'kgmin',start:5,step:2,max:10}};
function binfConc(d,o){const c=Object.assign({},BINF[d],(o||{})[d]||{});c.conc=c.mg*1000/c.ml;return c}
function binfMlh(d,dose,kg,o){const c=binfConc(d,o);return r1(c.unit==='kgmin'?dose*kg*60/c.conc:dose*60/c.conc)}
function binfPrep(d,o,sayConc){const c=binfConc(d,o);if(d==='adrinf'){const ml=volW(c.mg);return 'Wlew adrenaliny. Weź '+mgW(c.mg)+' adrenaliny, czyli '+ml+' z ampułki. Dociągnij solą fizjologiczną do '+c.ml+' mililitrów.'+(sayConc===false?'':' Stężenie '+Math.round(c.conc)+' mikrogramów na mililitr.')}const mgw=mgW(c.mg);return (d==='iso'?'Izoprenalina':d==='dopa'?'Dopamina':'Adrenalina we wlewie')+': '+mgw+' dociągnij solą fizjologiczną do '+c.ml+' mililitrów.'}
function dobuMlh(dose,kg){return r1(dose*kg*60/DOBU.conc)}
const ADRINF={mg:1,ml:50,conc:20}; // µg/ml, bradykardia 2–10 µg/min
function adrInfMlh(ugmin){return r1(ugmin*60/ADRINF.conc)}
function volW(x){x=r1(x);return x===0.5?'pół mililitra':fmt1(x)+' '+mlWord(x)}
function volGen(x){x=r1(x);return x===0.5?'pół mililitra':fmt1(x)+' '+(Number.isInteger(x)&&x!==1?'mililitrów':'mililitra')}
function rangeW(a,b){return (r1(a)===0.5?'pół':fmt1(a))+' do '+volGen(b)}
function mgW(x){x=r1(x);return x===0.5?'pół miligrama':Number.isInteger(x)?x+' '+plN(x,'miligram','miligramy','miligramów'):fmt1(x)+' miligrama'}
function atroText(dose,amp){dose=dose||.5;amp=amp||.5;return 'Podaj atropinę '+mgW(dose)+', czyli '+volW(dose/amp)+'. Powiedz: tak.'}
function atroNext(dose,amp){dose=dose||.5;amp=amp||.5;return 'Kolejna dawka atropiny '+mgW(dose)+', czyli '+volW(dose/amp)+'. Powiedz: tak.'}
function sedText(o){const f=o.fentConc||50,ma=o.midaAmpMg||5,mc=o.midaConc||1,mac=(o.midaAmpMg||5)/(o.midaAmpMl||1);
 const fen='Fentanyl: nabierz '+volW(25/f)+' z ampułki, podaj powoli dożylnie.';
 const mid=mc<mac?'Midazolam: 1 ampułkę '+ma+' miligramów rozcieńcz do '+volW(ma/mc).replace(/ mililitr\w*$/,' mililitrów')+', podaj '+rangeW(1/mc,2/mc)+' powoli.':'Midazolam bez rozcieńczania: podaj '+volW(1/mc)+' powoli.';
 return 'Pacjent przytomny – analgezja i sedacja małymi dawkami. '+fen+' '+mid}
function fentRepText(o){const f=o.fentConc||50;return 'Jeśli potrzeba, kolejna dawka fentanylu: '+rangeW(25/f,50/f)+'. Powiedz: tak, liczbę albo nie.'}
function midaRepText(o){const mc=o.midaConc||1;return 'Jeśli potrzeba, midazolam '+rangeW(1/mc,2/mc)+'. Powiedz: tak, liczbę albo nie.'}
function fentWarn(o){return 'Uwaga: łączna dawka fentanylu powyżej '+volGen(100/(o.fentConc||50))+'. Ryzyko depresji oddechu, przygotuj worek i nalokson.'}
function mapOf(s,d){return Math.round((s+2*d)/3)}
function noraTable(){const out=[];for(let kg=50;kg<=120;kg+=10)out.push({kg,s50:noraMlh(.05,kg,50),s20:noraMlh(.05,kg,20)});return out}
// ---------- v1.9.4: liczebniki słownie z odmianą (lektor) ----------
const NW1=['zero','jeden','dwa','trzy','cztery','pięć','sześć','siedem','osiem','dziewięć','dziesięć','jedenaście','dwanaście','trzynaście','czternaście','piętnaście','szesnaście','siedemnaście','osiemnaście','dziewiętnaście'];
const NW10=['','','dwadzieścia','trzydzieści','czterdzieści','pięćdziesiąt','sześćdziesiąt','siedemdziesiąt','osiemdziesiąt','dziewięćdziesiąt'];
const NW100=['','sto','dwieście','trzysta','czterysta','pięćset','sześćset','siedemset','osiemset','dziewięćset'];
const NG1=['zera','jednego','dwóch','trzech','czterech','pięciu','sześciu','siedmiu','ośmiu','dziewięciu','dziesięciu','jedenastu','dwunastu','trzynastu','czternastu','piętnastu','szesnastu','siedemnastu','osiemnastu','dziewiętnastu'];
const NG10=['','','dwudziestu','trzydziestu','czterdziestu','pięćdziesięciu','sześćdziesięciu','siedemdziesięciu','osiemdziesięciu','dziewięćdziesięciu'];
const NG100=['','stu','dwustu','trzystu','czterystu','pięciuset','sześciuset','siedmiuset','ośmiuset','dziewięciuset'];
function plN(n,one,few,many){if(n===1)return one;const d=n%10,dd=n%100;return d>=2&&d<=4&&!(dd>=12&&dd<=14)?few:many}
// n całkowite 0..999999; gen – dopełniacz; fem – rodzaj żeński (jedna/dwie)
function numWords(n,gen,fem){if(n===0)return gen?'zera':'zero';const out=[];
 const th=Math.floor(n/1000),r=n%1000;
 if(th){if(th===1)out.push(gen?'tysiąca':'tysiąc');else out.push(numWords(th,gen,false)+' '+(gen?'tysięcy':plN(th,'tysiąc','tysiące','tysięcy')))}
 if(r){const h=Math.floor(r/100),t=r%100;if(h)out.push((gen?NG100:NW100)[h]);
  if(t){let w;if(t<20)w=(gen?NG1:NW1)[t];else{w=(gen?NG10:NW10)[Math.floor(t/10)];if(t%10)w+=' '+(gen?NG1:NW1)[t%10]}
   if(fem){if(!gen){w=w.replace(/\bdwa$/,'dwie');if(t===1&&!h&&!th)w='jedna'}else if(t===1&&!h&&!th)w='jednej'}
   out.push(w)}}
 return out.join(' ')}
const ADJP={1:'jedno',2:'dwu',3:'trzy',4:'cztero',5:'pięcio',10:'dziesięcio',12:'dwunasto',15:'piętnasto',20:'dwudziesto',40:'czterdziesto',50:'pięćdziesięcio'};
const GENPREP=/^(do|od|powyżej|poniżej|przy|z|ze|bez|około|wokół|spośród)$/i;
const FEMN=/^(minut|sekund|godzin|ampuł|kropl|dawk|doby|dób|jednost|strzykaw)/i;
function decWords(s){const[a,b]=s.split(',');return numWords(+a)+' przecinek '+(b.length===1||b[0]==='0'?b.split('').map(d=>NW1[+d]).join(' '):numWords(+b))}
function sayify(text){let t=String(text);
 t=t.replace(/\bEtCO₂|\bETCO2\b/g,'dwutlenek węgla w wydechu').replace(/\bCO₂|\bCO2\b/g,'dwutlenek węgla').replace(/\bSpO₂/g,'saturacja')
  .replace(/\s*mmHg\b/g,'').replace(/\bMAP\b/g,'średnie ciśnienie tętnicze').replace(/(\d)\s*µg\b/g,'$1 mikrogramów').replace(/(\d)\s*mg\b/g,'$1 miligramów').replace(/(\d)\s*ml\b/g,'$1 mililitrów');
 // przymiotniki procentowe: 5% glukozy / glukoza 5% / 12-odprowadzeniowe
 t=t.replace(/(\d+,\d+)%/g,'$1 procent');t=t.replace(/(\d+)% (glukoz\w*)/g,(m,n,g)=>ADJP[n]?ADJP[n]+'procentow'+(g==='glukozy'?'ej':g==='glukozę'?'ą':'a')+' '+g:m)
  .replace(/(glukoz\w*) (\d+)%/g,(m,g,n)=>ADJP[n]?g+' '+ADJP[n]+'procentow'+(g==='glukozy'?'ej':'a'):m)
  .replace(/(\d+,\d+)-procentow\w+/g,'$1 procent').replace(/(^|[^\d,])(\d+)-(procentow|odprowadzeniow)(\w+)/g,(m,p0,n,a,e)=>ADJP[n]?p0+ADJP[n]+a+e:m).replace(/(\d+(?:,\d+)?)%/g,'$1 procent');
 // liczby z kontekstem
 return t.replace(/\d+(?:,\d+)?/g,(num,off,all)=>{
  if(num.includes(','))return decWords(num);const n=+num;
  const before=all.slice(0,off).trim().split(/\s+/).pop()||'';const after=(all.slice(off+num.length).match(/^\s+([^\s.,;:?!]+)/)||[])[1]||'';
  // „N do M <rzecz>”: pierwsza liczba też odnosi się do rzeczownika po M
  let noun=after;if(/^do$/i.test(after)){const mm=all.slice(off+num.length).match(/^\s+do\s+\d+(?:,\d+)?\s+([^\s.,;:?!]+)/);if(mm)noun=mm[1]}
  const gen=GENPREP.test(before.replace(/[^\wąćęłńóśźż]/gi,''));const fem=FEMN.test(noun);
  return numWords(n,gen,fem)}).replace(/(^|[.?!]\s+)([a-ząćęłńóśźż])/g,(m,a,b)=>a+b.toUpperCase())}
// ---------- rozpoznawanie ----------
function norm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[.,!?;:"'„”]/g,' ').replace(/\s+/g,' ').trim()}
const UN={zero:0,jeden:1,jedna:1,jedno:1,dwa:2,dwie:2,trzy:3,cztery:4,piec:5,szesc:6,siedem:7,osiem:8,dziewiec:9,dziesiec:10,jedenascie:11,dwanascie:12,trzynascie:13,czternascie:14,pietnascie:15,szesnascie:16,siedemnascie:17,osiemnascie:18,dziewietnascie:19};
const TENS={dwadziescia:20,trzydziesci:30,czterdziesci:40,piecdziesiat:50,szescdziesiat:60,siedemdziesiat:70,osiemdziesiat:80,dziewiecdziesiat:90};
const HUND={sto:100,dwiescie:200,trzysta:300};
function parseNumber(text){const t=norm(text);{const pm=t.split(/ (?:przecinek|kropka) /);if(pm.length===2&&!/\d/.test(t)){const a=parseNumber(pm[0]),b=parseNumber(pm[1]);if(a!=null&&b!=null&&b<10)return a+b/10}}const m=t.match(/\d+(?:[ ,.]\d+)?/);if(m)return parseFloat(m[0].replace(/[ ,]/,'.'));
 let tot=0,any=false,half=false;for(const w of t.split(' ')){if(w in HUND){tot+=HUND[w];any=true}else if(w in TENS){tot+=TENS[w];any=true}else if(w in UN){tot+=UN[w];any=true}else if(w==='pol')half=true}
 return any?tot+(half?.5:0):null}
// kolejność ma znaczenie: dłuższe frazy pierwsze
const CMDS=[
 ['ack',/^((ok|okej|okay|o k|okey|oki|dobrze|zrobione|zrobiony|zrobiona|zrobilem|zrobilam|wykonane|gotowe|gotowa|gotowy)\s*)+$/],
 ['rko_od',/(rko|reanimacj\w*|resuscytacj\w*) (od|trwa)( od)? \S+/],
 ['decide',/czas na decyzj|podsumowani/],
 ['hyperk',/hiperkaliemi|insulin\w* z glukoz/],
 ['lucas_off',/(przerw\w*|pauz\w*|zatrzymaj\w*|wstrzymaj\w*|stop)\W*(w )?lucas|lucas\W*(pauz\w*|stop|przerw\w*|wstrzyman\w*)/],['lucas_on',/lucas\W*(wlaczon\w*|wznowion\w*|pracuje|start)|(wznow\w*|wlacz\w*|uruchom\w*) lucas/],
 ['iso',/izoprenalin|isoprenalin|izuprel/],['dopa',/dopamin/],['nora',/noradrenalin/],['dobu',/dobutamin/],['hepinf',/wlew\w* heparyn|heparyn\w* (we )?wlew/],['amioinf',/wlew\w* amiodaron|amiodaron\w* (we )?wlew/],['adrinf',/wlew\w* adrenalin|\badrenalin\w* (we )?wlew/],['pace',/zalamki p bez qrs|zalamek p bez qrs|blok serca|blok przedsionkowo|blok av|potrzebny stymulator|stymulacj\w* przezskorn/],['alone',/nie moge uciskac|jestem sam|nikt nie uciska/],['zakoncz_tak',/\btak\b.*\bzakoncz/],['replay',/powtorz ostatnie|odtworz instrukcj|^powtorz\b|\bpowtorz$/],
 ['send',/wyslij/],['adr',/\badrenalin\w* podan|podan\w* adrenalin/],['amio',/amiodaron\w* podan/],['lido',/lidokain\w* podan/],
 ['nonshock',/nie do defibrylacji|brak wskazan|bez wskazan|nie defibrylowa|nie defibryluj/],['shock_done',/defibrylacj\w* wykonan|wyladowan\w*|wyladowano/], ['organised0',/migotanie przedsionkow/],['shockable',/migotanie|\bvf\b|\bwf\b|\bwu ef\b|\bfau ef\b|\bv f\b|\bp ?vt\b|\bvt\b|\bwu te\b|\bfau te\b|czestoskurcz|defibrylacyjn|defibrylacj|do defibrylacji/],
 ['nopulse',/brak tetna|nie ma tetna|bez tetna|brak tetno|bez tetno/],
 ['pulse',/jest tetno|wyczuwalne tetno|tetno jest|mam tetno|^tetno$|^tetno (wyczuwalne|obecne)/],['brady',/bradykardi/],
 ['nonshock',/brak wskazan|nie do defibrylacji|asystol|asystori|\bpea\b|\bp e a\b|\bpe a\b|\bpe e a\b|\bpi i ej\b|rozkojarzeni|aktywnosc elektryczna/],
 ['organised',/rytm zatokowy|zatokowy|rytm zorganizowany|zorganizowany|wezlowy/],['intub',/intubacj|zaintubowan/],['usg',/\busg\b|u s g|pocus|ultrasonograf/],
 ['rosc',/\brosc\b|ros[ck]|powrot krazenia/],['arrest',/zatrzymanie/],['up',/zwieksz/],['keep',/utrzymaj/],['pause',/pauza|^stop\b|\bstop$/],['down',/zmniejsz/],['end',/zakoncz/],
 ['given',/podano|podane|podany|podana|podalem|podalam/],['bicarb',/wodoroweglan/],['change',/zmien rytm/],
 ['present',/^jest\b|jestem/],['checked',/sprawdzon|wykluczon/],['next',/dalej|nastepn|pomin/],['unknown',/nie wiem/],['kg',/kilogram|\bwaga\b|\bmasa\b/],
 ['s20',/dwadziescia|\b20\b/],['s50',/piecdziesiat|\b50\b/],
 ['yes',/^tak\b|\btak$|^tag$|^dak$|^tak tak/],['no',/^nie\b|\bnie$/]];
function parsePair(text){const t=norm(text).replace(/\//g,' na ');const p=t.split(/ na /);if(p.length!==2)return null;const a=parseNumber(p[0]),b=parseNumber(p[1]);return a!=null&&b!=null?[a,b]:null}
const CRIT=['rko_od','lucas_off','lucas_on','pause','arrest','shock_done','replay'];
const BARGE_MIN=['stop','wyladowano','wyladowanie','wyladowane'];
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=new Array(n+1),c=new Array(n+1);for(let j=0;j<=n;j++)p[j]=j;
 for(let i=1;i<=m;i++){c[0]=i;for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));[p,c]=[c,p]}return p[n]}
// v1.7: echo = tylko niemal dokładna kopia zdania lektora (≥3 słowa, podobieństwo ≥0,8); pojedyncze słowa nigdy nie są echem
function echoOf(h,speaking){if(!speaking)return false;h=norm(h);if(!h||h.split(' ').length<3)return false;const parts=String(speaking).split(/(?<=[.?!])\s+/).map(norm).filter(Boolean).concat([norm(speaking)]);
 return parts.some(p=>{const L=Math.max(p.length,h.length);return L>0&&1-lev(h,p)/L>=0.8})}
// słownik przybliżony (odległość edycyjna): [komenda, słowo/fraza, tylko w kontekście pytania o rytm]
const FUZZY=[['shockable','migotanie'],['shockable','migotanie komor'],['shockable','defibrylacyjny'],['shockable','czestoskurcz'],['shockable','czestoskurcz komorowy'],
 ['nonshock','asystolia'],['nonshock','asystoria'],['nonshock','asystol'],['nonshock','rozkojarzenie'],['nonshock','aktywnosc elektryczna'],
 ['nonshock','pea',1],['nonshock','pe a',1],['nonshock','pea pea',1],
 ['shockable','vf',1],['shockable','wf',1],['shockable','wu ef',1],['shockable','fau ef',1],['shockable','we ef',1],['shockable','vt',1],['shockable','wu te',1],['shockable','we te',1],
 ['nopulse','bez tetna'],['nopulse','brak tetna'],['pulse','tetno'],['pulse','jest tetno'],['rosc','powrot krazenia'],['rosc','rosc'],
 ['yes','tak',2],['present','jest',2],['ack','okej',2],['ack','dobrze',2],['ack','zrobione',2],['ack','gotowe',2],['given','podane',2],['given','podano',2]];
function fuzzTol(len){return len<=3?0:len<=7?1:2}
function fuzzyMatch(text,ctx){const t=norm(text);if(!t)return null;const w=t.split(' ');if(w.length>4)return null;ctx=ctx||{};let best=null;
 for(const [cmd,ph,lvl] of FUZZY){if(lvl===1&&!ctx.rhythm)continue;if(lvl===2&&!ctx.confirm)continue;const n=ph.split(' ').length;
  for(let i=0;i+n<=w.length;i++){const seg=w.slice(i,i+n).join(' ');
   // krótkie (≤3 znaki) tylko jako cała wypowiedź i dokładnie
   if(ph.replace(/ /g,'').length<=3){if(n!==w.length||seg!==ph)continue;}
   const d=lev(seg,ph),tol=fuzzTol(ph.replace(/ /g,'').length);if(d<=tol&&(!best||d<best.d||(d===best.d&&n>best.n)))best={cmd,d,n,ph}}}
 if(!best)return null;if(best.cmd==='pulse'&&/\b(bez|brak|nie)\b/.test(t))return {cmd:'nopulse',fuzzy:true,ph:best.ph};
 if(best.cmd==='shockable'&&/przedsionk/.test(t))return null;
 return {cmd:best.cmd,fuzzy:true,ph:best.ph,weak:lvl1(best.ph)}}
function lvl1(ph){const f=FUZZY.find(x=>x[1]===ph);return !!(f&&f[2])}
function bargeIn(heard,speaking,mode,conf){const h=norm(heard);if(!h)return 'ignore';if(echoOf(h,speaking))return 'ignore';mode=mode||'full';
 if(mode==='off')return 'queue';if(conf!=null&&conf>=0&&conf<(mode==='min'?0.7:0.6))return 'queue';
 if(mode==='min')return BARGE_MIN.includes(h)?'interrupt':'queue';
 const c=matchCommand(heard);return CRIT.includes(c)&&h.split(' ').length<=5?'interrupt':'queue'}
function matchCommand(text){const t=norm(text);if(!t)return null;for(const [id,re] of CMDS)if(re.test(t))return id==='organised0'?'organised':id;return null}
function interpret(alts,ctx){alts=[].concat(alts||[]).filter(a=>a!=null);for(const a of alts){const c=matchCommand(a);if(c)return {cmd:c,num:parseNumber(a),text:a}}
 for(const a of alts){const f=fuzzyMatch(a,ctx);if(f)return {cmd:f.cmd,num:parseNumber(a),text:a,fuzzy:true,weak:f.weak}}
 for(const a of alts){const n=parseNumber(a);if(n!=null)return {cmd:'number',num:n,text:a}}return {cmd:null,num:null,text:alts[0]||''}}
// ---------- teksty bolusów (mg + ml) i pomp (tylko ml/h) ----------
const SAY={
 start:'Zatrzymanie krążenia. Zaczynamy uciskanie klatki piersiowej.',
 call:'Wezwij anestezjologa i zespół reanimacyjny.',
 defib:'Podłącz defibrylator i przynieś LUCAS.',
 iv:'Dostęp dożylny.',
 roscRhy:'Czy rytm zatokowy?',
 sim:'To jest symulacja.',
 mins:'Jak długo trwa RKO?',
 zrmAdr:'Ile miligramów adrenaliny podał zespół ratownictwa?',
 zrmShk:'Ile wyładowań wykonał zespół ratownictwa?',
 team:'Przydziel funkcje. Ucisk, drogi oddechowe, leki, defibrylator, dokumentacja. Potwierdź: tak.',
 warn15:'Za 15 sekund ocena rytmu. Przygotuj defibrylator.',
 rhythm:'Czy migotanie komór albo częstoskurcz bez tętna?',
 rhyAsy:'Czy asystolia?',
 pulseNo:'Brak odpowiedzi – przyjmuję brak tętna.',
 offWarn:'Przerwa w uciskaniu ponad 10 sekund. Uciskaj.',
 roscAf:'Czy migotanie przedsionków?',
 undone:'Cofnięto.',
 fullOnly:'Ta funkcja jest w wersji pełnej.',
 roscDemo:'Powrót krążenia. Saturacja 94 do 98 procent, EKG 12-odprowadzeniowe.',
 nonshockI:'Nie defibryluj. Uciskaj. Kolejne dwie minuty.',
 adrNow:'Adrenalina 1 miligram teraz, czyli 1 mililitr z ampułki. Powiedz: tak.',
 alone:'Uciskaj do ostatniej chwili, ładuj. Jeśli ktoś jest przy głowie, wentyluj workiem w trakcie ładowania. Odsuń wszystkich, wyładowanie, natychmiast wróć do uciskań. Przerwa krótsza niż 5 sekund. Wezwij pomoc, podłącz LUCAS.',
 pace1ap:'Stymulacja przezskórna. Naklej elektrody przednio-tylnie. Powiedz: tak.',
 pace1al:'Stymulacja przezskórna. Naklej elektrody przednio-bocznie. Powiedz: tak.',
 pace2:'Podłącz elektrody EKG z monitora defibrylatora. Bez nich nie zobaczysz wychwytu. Powiedz: tak.',
 pace3:'Tryb na żądanie, częstość 70 na minutę. Powiedz: tak.',
 pace4:'Prąd 30 miliamperów. Zwiększaj co 10 aż do wychwytu. Wychwyt zwykle przy 50 do 100 miliamperach.',
 paceCap:'Czy po każdym impulsie jest szeroki QRS z falą T?',
 paceOk:'Wychwyt. Dodaj 10 miliamperów zapasu. Sprawdź tętno na tętnicy udowej, nie na szyjnej.',
 pacePulse:'Jest tętno na tętnicy udowej?',
 pacePEA:'Brak tętna mimo wychwytu. To PEA. Rozpocznij uciskanie, wracam do algorytmu NZK.',
 paceMax:'Maksymalny prąd bez wychwytu. Wezwij kardiologa. Sprawdź elektrody i ich położenie. Następny krok: wlew leku przyspieszającego i stymulacja przezżylna.',
 paceAnalg:'Jeśli pacjent przytomny, przed zwiększaniem prądu podaj analgezję.',
 paceConsc:'Czy pacjent jest przytomny?',
 paceMon:'Monitoruj oddech, saturację i ciśnienie. Miej przygotowany worek z maską i ssak.',
 fentGo:'Ile mililitrów fentanylu podano? Powiedz liczbę albo: tak.',midaGo:'Ile mililitrów midazolamu podano? Powiedz liczbę albo: tak.',
 midaMax:'Maksymalna dawka midazolamu.',
 paceNoSed:'Pacjent nieprzytomny. Bez sedacji, monitoruj.',
 bradyFail:'Atropina nieskuteczna. Przechodzę do stymulacji przezskórnej.',
 resumeCPR:'Wznawiaj uciskanie.',
 pulseQ:'Czy jest tętno?',
 escal:'Przy kolejnym wyładowaniu rozważ wyższą energię, zgodnie z defibrylatorem.',
 shock:'Powiedz: wyładowano.',
 afterShock:'Ucisk natychmiast. Kolejne dwie minuty.',
 cont:'Kontynuuj ucisk. Kolejne dwie minuty.',
 adr:'Podaj adrenalinę 1 miligram, czyli 1 mililitr z ampułki. Powiedz: tak.',
 amio300:'Podaj amiodaron 300 miligramów, czyli 6 mililitrów, dwie ampułki. Albo lidokaina 100 miligramów, czyli 5 mililitrów dwuprocentowej. Powiedz: tak.',
 amio150:'Podaj amiodaron 150 miligramów, czyli 3 mililitry, jedna ampułka. Albo lidokaina 50 miligramów, czyli 2 i pół mililitra. Powiedz: tak.',
 torsade:'Czy to częstoskurcz torsade de pointes?',
 mag:'Podaj siarczan magnezu 2 gramy, czyli 10 mililitrów dwudziestoprocentowego. Powiedz: tak.',
 intubQ:'Czy czujesz się pewnie w intubacji?',
 intubYes:'Intubacja. Przerwa w ucisku poniżej 5 sekund. Potwierdź kapnografią. Powiedz: intubacja, gdy rurka jest na miejscu.',
 intubNo:'Nadgłośniowy przyrząd, maska krtaniowa lub i-gel. Czekamy na anestezjologa.',
 intubDone:'Zapisano intubację. Ciągły ucisk, 10 oddechów na minutę, kapnografia.',
 etco2:'Podaj dwutlenek węgla w wydechu.',etco2Q:'Czy jest pomiar dwutlenku węgla w wydechu?',pocusQ:'Czy wykonano USG serca? Czy jest czynność serca?',decExc:'Czy są wyjątki: hipotermia, zatrucie, tromboliza w trakcie, kandydat do ECMO?',decEnd:'Zakończyć reanimację?',decSay:'Aby zakończyć, powiedz: tak, zakończ.',contCPR:'Kontynuuj RKO.',decLysis:'Tromboliza: kontynuuj RKO 60 do 90 minut od podania.',
 usg:'Zapisano USG. Tylko w przerwie na ocenę rytmu, przerwa poniżej 10 sekund.',
 calcium:'Podaj chlorek wapnia 10 procent, 10 mililitrów, czyli 1 gram. Powiedz: tak.',
 gluPre:'Glikemia przed podaniem?',gluNow:'Zmierz glikemię teraz.',hkEcg:'Czy są zmiany w EKG?',hkArrest:'Podaj insulinę dożylnie. Podłącz 250 mililitrów 10% glukozy, wlew pełnym strumieniem, możesz użyć mankietu ciśnieniowego.',hkOut:'Podaj insulinę dożylnie. Wlew 250 mililitrów 10% glukozy przez 15 minut.',hkProphDrip:'Potem 10% glukoza, 17 kropli na minutę przez 5 godzin.',hkProphPump:'Potem 10% glukoza. Ustaw pompę 50 mililitrów na godzinę przez 5 godzin.',hkGlu:'Sprawdź glikemię.',hkK:'Kontrola potasu. Podaj wynik.',hkKHigh:'Potas nadal wysoki. Można powtórzyć insulinę z glukozą.',hypo:'Glikemia poniżej 70. Hipoglikemia.',insGo:'Powiedz: tak.',
 glucose:'Podaj glukozę 20 procent, 100 mililitrów, czyli 20 gramów. Powiedz: tak.',
 bicarbQ:'Wodorowęglan nie rutynowo. Czy jest wskazanie: zatrucie trójcyklicznymi, hiperkaliemia z arytmią, kwasica hipochloremiczna lub długie zatrzymanie z potwierdzoną kwasicą?',
 bicarb:'Podaj wodorowęglan sodu 50 milimoli, czyli 50 mililitrów 8,4-procentowego. Powiedz: tak.',
 bicarbNo:'Nie podawaj wodorowęglanu.',
 lysis:'Tromboliza. Alteplaza 50 miligramów bolus, czyli 50 mililitrów. Kontynuuj resuscytację 60 do 90 minut. Powiedz: tak.',
 decision:'Dwadzieścia minut resuscytacji. Rozważ: CO2 w wydychanym powietrzu, przyczynę odwracalną, hipotermię i możliwość ECPR. Decyzja należy do lekarza. Prowadzę dalej.',
 endQ:'Zakończyć resuscytację? Powiedz: tak, zakończ.',
 adrinfArrest:'W trakcie zatrzymania krążenia adrenalina tylko w bolusie, 1 miligram.',
 weightAssume:'Przyjmuję 70 kilogramów, popraw jeśli inaczej.',
 tube:'Podaj rozmiar rurki.',usgRes:'Wynik USG? Powiedz krótko, na przykład: tamponada, odma, brak ruchów serca albo bez zmian.',
 glu:'Podaj glikemię.',gcs:'Podaj punktację GCS.',
 zrmAmio:'Ile miligramów amiodaronu podał zespół ratownictwa?',
 which:'Który lek zmienić: noradrenalina, dobutamina czy wlew w bradykardii?',
 downPump:'Zmniejszam. Ustaw pompę',
 noraLow:'Można wyłączyć noradrenalinę – decyzja lekarza.',mapKeep:'Utrzymaj. Pompa bez zmian.',mapHi1:'Utrzymaj, sprawdzę za 5 minut.',mapHi2:'MAP powyżej 80 w dwóch pomiarach. Zmniejszam dawkę.',dobu10:'Dobutamina powyżej 10. Rozważ konsultację kardiologiczną.',dobuWait:'Odczekaj 10 minut od ostatniej zmiany dobutaminy.',
 dobuMax:'Maksymalna dawka dobutaminy. Nie zwiększaj. Konsultacja kardiologiczna.',
 hepQ:'Heparyna: zatorowość płucna czy ostry zespół wieńcowy?',hepNoInf:'Wlew heparyny dopiero po powrocie krążenia.',aptt:'Kontrola APTT za 6 godzin.',hepRosc:'Zatorowość płucna: rozpocząć wlew heparyny? Tak albo nie.',
 stacked:'Monitorowane zatrzymanie: rozważ do 3 wyładowań seryjnych, potem uciskanie.',
 endCancel:'Nie zakończono. Prowadzę dalej.',
 ended:'Zakończono. Raport jest gotowy.',
 rosc:'Powrót krążenia. Saturacja 94 do 98 procent, EKG 12-odprowadzeniowe, temperatura. Zaczynam pętlę ciśnienia.',
 rearrest:'Ponowne zatrzymanie krążenia. Ucisk teraz.',
 sys:'Podaj aktualne ciśnienie skurczowe.',dia:'Podaj aktualne ciśnienie rozkurczowe.',
 sysAgain:'Powtórz ciśnienie skurczowe.',diaAgain:'Powtórz ciśnienie rozkurczowe.',
 weight:'Podaj masę ciała w kilogramach.',
 syr:'Strzykawka 50 czy 20?',
 noraPrep50:'Noradrenalina: 4 ampułki po 1 miligramie dociągnij solą fizjologiczną do 50 mililitrów w strzykawce 50.',
 noraPrep20:'Noradrenalina: 2 ampułki po 1 miligramie dociągnij solą fizjologiczną do 20 mililitrów w strzykawce 20.',
 setPump:'Ustaw pompę',upPump:'Zwiększam. Ustaw pompę',keepPump:'Utrzymaj. Pompa',
 mapIs:'Średnie ciśnienie tętnicze',
 noraHigh:'Wysoka dawka noradrenaliny. Wezwij anestezjologa. Rozważ drugi lek i przyczynę.',
 lowOut:'Czy są objawy niskiego rzutu: słaby tętno, zimne kończyny, wydłużony powrót kapilarny?',
 dobuPrep:'Dobutamina: 250 miligramów dociągnij solą fizjologiczną do 50 mililitrów w strzykawce 50.',
 spo2:'Podaj saturację.',ekg:'Czy EKG 12-odprowadzeniowe wykonane?',stemi:'Czy jest STEMI?',temp:'Podaj temperaturę w stopniach.',
 bradySigns:'Bradykardia. Czy są objawy niepokojące: hipotensja, zaburzenia świadomości, ból w klatce piersiowej lub niewydolność serca?',
 bradyNoSigns:'Bez objawów niepokojących. Monitoruj i szukaj przyczyny.',
 bradyHtx:'Czy to blok drugiego stopnia typu Mobitz 2, blok trzeciego stopnia lub pacjent po przeszczepie serca?',
 bradyHtxYes:'Atropina może być nieskuteczna. Przygotuj stymulację przezskórną.',
 bHR:'Podaj tętno.',bSBP:'Podaj ciśnienie skurczowe.',bSym:'Czy objawy ustąpiły?',
 bKeepAtro:'Utrzymaj. Obserwuj, bez kolejnej dawki.',
 atroMax:'Maksymalna dawka atropiny osiągnięta. Przejdź do stymulacji przezskórnej.',
 isoCap:'Osiągnięto 20 mililitrów na godzinę. Dalsze zwiększanie tylko po konsultacji.',
 dopaMax:'Maksymalna dawka dopaminy. Przejdź na wlew adrenaliny.',
 adrMax:'Wlew na maksimum. Rozpoczynam stymulację przezskórną.',
 cprPace:'Rozpoznaję RKO z blokiem serca. Uciskanie bez przerw. Jeśli widzisz załamki P bez QRS, nałóż elektrody stymulacyjne, nie przerywaj LUCAS, podłącz EKG, częstość 70, prąd maksymalny',
 cprPace2:'Wychwyt i tętno oceniamy tylko w przerwie na ocenę rytmu.',
 rhythmPace:'Czy migotanie komór albo częstoskurcz bez tętna? Sprawdź wychwyt stymulatora.',
 cardio:'Równolegle niech ktoś wezwie kardiologa.',
 bradyDrug:'Wlew: izoprenalina, adrenalina czy dopamina?',
 adrinfQ:'Czy bradykardia z objawami jest oporna na atropinę, a izoprenalina lub dopamina niedostępna albo niewystarczająca?',
 adrinfNo:'Wlew adrenaliny nie jest teraz wskazany.',
 bradyHR:'Podaj częstość serca.',
 bradyStill:'Czy nadal bradykardia z objawami?',
 binfMax:'Dawka maksymalna wlewu. Stymulacja przezskórna.',
 pacingOffer:'Jeśli leki nie działają, powiedz: potrzebny stymulator.',
 sent:'Raport wysłany do programu poczty.',queued:'Raport zapisany, wyślę po powrocie sygnału.',noMail:'Brak adresu e-mail w ustawieniach. Raport zapisany w kolejce.',
 notUnd:'Nie zrozumiałam.',remind:'Przypominam.',paused:'Pauza. Zegar biegnie. Powiedz: dalej.',resumed:'Wznawiam.',
 amioCvcOk:'Możesz podać przez wkłucie centralne.',amio50:'Wlew 50 mililitrów na dobę wymaga pompy.',
 amioCnt:'Czy w trakcie RKO lub przez ZRM podano amiodaron? Ile razy?',amioHow:'Ile razy podano amiodaron?',amioCvc:'Czy jest założone wkłucie centralne?',amioGlu:'Tylko glukoza 5%, nie sól fizjologiczna. Wlew przez 24 godziny.',
 acQ:'Czy pacjent przyjmuje leki przeciwkrzepliwe?',acDrug:'Który lek: dabigatran, rywaroksaban, apiksaban, warfaryna czy heparyna?',acDoac:'Przy lekach z grupy DOAC nie podawaj heparyny.',inrQ:'Podaj INR.',inrHigh:'INR powyżej 2,5. Nie podawaj heparyny.',inrUnknown:'Najpierw oznacz INR. Wstrzymaj heparynę.',hepLast:'Kiedy była ostatnia dawka heparyny?',hepOn:'Czy pacjent ma teraz podłączony wlew heparyny?',hepRecent:'Ostatnia dawka mniej niż 4 godziny temu. Wstrzymaj bolus, skonsultuj dawkowanie.',hepHalf:'Ostatnia dawka ponad 4 godziny temu. Podaj połowę bolusu i włącz wlew.',hepOnInf:'Pacjent na wlewie heparyny. Bez bolusu.',hepLastUnknown:'Ustal czas ostatniej dawki. Wstrzymaj heparynę.',acUnknown:'Ustal leki przed podaniem heparyny.',hepStopped:'Heparyna wstrzymana – patrz wcześniejszy komunikat.',
 ok:'OK.',
 lucasOff:'LUCAS wstrzymany. Ocena rytmu. Jeśli POCUS, w trakcie oceny rytmu, maksymalnie 10 sekund.',gas:'Pobierz gazometrię, potas.',lucas5:'Pięć sekund.',lucas10:'Dziesięć sekund, wznów LUCAS.',lucasOn:'LUCAS pracuje.',
 logged:'Zapisano:',nothing:'Nie mam nic do powtórzenia.',
 dobuNo:'Bez dobutaminy.',bicarbAsk:'',
};
const PACEMAX={mindray:{mA:200,label:'Mindray BeneHeart D3/D6: 0–200 mA'},zoll:{mA:140,label:'ZOLL X Series / R Series: 10–140 mA'},lp15:{mA:200,label:'LIFEPAK 15/20: 0–200 mA'}};
const ENERGY_SEQ={mindray:['200','300','360']};
const ENERGY={'300':'300 dżuli','150-200':'150 do 200 dżuli','150':'150 dżuli','200':'200 dżuli','120-150':'120 do 150 dżuli','360':'360 dżuli','max':'maksymalną energią defibrylatora'};
const ENERGY_LABEL={mindray:'Mindray BeneHeart D3/D6 (dwufazowa BTE): 200 → 300 → 360 J (domyślne fabryczne)','150-200':'150–200 J (dwufazowy, ERC)','150':'150 J','200':'200 J','120-150':'120–150 J (dwufazowy prostokątny)','360':'360 J (jednofazowy)','max':'maksymalna energia defibrylatora'};
function energyFor(e,n){const q=ENERGY_SEQ[e];return q?q[Math.min(n||0,q.length-1)]:e}
function vfInstr(e,n){const k=energyFor(e,n);const w=e==='360'?' jednofazowo':e==='max'?'':' dwufazowo';return 'Defibrylacja. Ładuj '+(ENERGY[k]||ENERGY['150-200'])+w+'. Uciskaj w trakcie ładowania. Wszyscy odsuń się, odsuń tlen. Wyładowanie. Potem natychmiast ucisk na 2 minuty.'}
const HT=[['hipoksja','Hipoksja: tlen 100 procent, sprawdź rurkę i wentylację.'],['hipowolemia','Hipowolemia: płyny, krew, zatrzymaj krwawienie.'],
 ['hiperkaliemia','Hiperkaliemia: wapń, insulina z glukozą, rozważ wodorowęglan.'],['hipoglikemia','Hipoglikemia: glukoza dożylnie.'],['hipomagnezemia','Hipomagnezemia: siarczan magnezu.'],['hipotermia','Hipotermia: ogrzewanie, rozważ ECPR.'],
 ['zatorowość płucna','Zatorowość płucna: rozważ trombolizę.'],['zawał','Zawał: rozważ pilną koronarografię i PCI, także w trakcie RKO z LUCAS.'],['odma','Odma prężna: odbarcz klatkę.'],['tamponada','Tamponada: nakłucie osierdzia.'],['toksyny','Toksyny i leki.']];
const HT_H=HT.filter(h=>/^hip/.test(h[0])).map(h=>h[0]),HT_T=HT.filter(h=>!/^hip/.test(h[0])).map(h=>h[0]);
function paceUp(mA){return 'Zwiększ do '+mA+' miliamperów.'}
function htQ(i){return 'Przyczyna '+(i+1)+' z '+HT.length+': '+HT[i][0]+'. Czy to przyczyna? Tak, nie albo dalej.'}
// ---------- silnik ----------
const RHY_NAME={'VF':'Migotanie komór. ','pVT':'Częstoskurcz bez tętna. ','VF/pVT':'Rytm do defibrylacji. ','asystolia':'Asystolia. ','PEA':'PEA. ','asystolia/PEA':'Rytm niedefibrylacyjny. '};
function labOf(c,heard){const t=norm(heard||'');if(c==='shockable')return /vt|czestoskurcz/.test(t)&&!/vf|migotan/.test(t)?'pVT':/vf|migotan/.test(t)?'VF':'VF/pVT';if(c==='nonshock'||c==='nopulse')return /asyst/.test(t)?'asystolia':/pea|tetna|elektryczn|rozkojarz/.test(t)?'PEA':'asystolia/PEA';return null}
function hm5(t){const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function adrText(s,base){const a=s.adr||[];base=base||SAY.adr;if(!a.length)return base;const x=' Ostatnia o '+hm5(a[a.length-1])+'.';return /Powiedz: tak\.$/.test(base)?base.replace(/ Powiedz: tak\.$/,x+' Powiedz: tak.'):base+x}
const MS=1000,CYCLE=120*MS,REM=30*MS,ADRI=4*60*MS,MAPI=5*60*MS;
function Engine(opt){opt=opt||{};const E=this;E.now=opt.now||(()=>Date.now());E.out=opt.out||(()=>{});E.alarm=opt.alarm||(()=>{});E.persist=opt.persist||(()=>{});E.rand=opt.rand||Math.random;
 E.full=opt.full!==false;E.energy=opt.energy||'mindray';E.paceEl=opt.paceEl||'ap';E.paceMax=opt.paceMax||200;E.fentConc=opt.fentConc||50;E.midaConc=opt.midaConc||1;E.midaAmpMg=opt.midaAmpMg||5;E.midaAmpMl=opt.midaAmpMl||1;E.atroAmp=opt.atroAmp||0.5;E.atroDose=opt.atroDose||0.5;E.stacked=!!opt.stacked;E.hep=Object.assign({u:25000,ml:50},opt.hep||{});E.hepAmp=opt.hepAmp||5000;E.amioMode=opt.amioMode||'drip';E.dropSet=opt.dropSet===60?60:20;E.amioInf=Object.assign({mg:900,ml:50},opt.amioInf||{});E.conc=opt.conc||{};E.sayConc=opt.sayConc!==false;E.s={mode:'idle'};}
const P=Engine.prototype;
P.say=function(t,kind){if(this._ack&&kind==='ack'){if(this._ackSaid)return;this._ackSaid=true;t=SAY.ok}this.s.last=t;this.out(t,kind||'say')};
P.log=function(type,txt,extra){const s=this.s;const e=Object.assign({t:this.now(),type,txt},this._src?{src:this._src}:{},extra||{});s.log.push(e);this.persist(s);return e};
P.start=function(o){o=o||{};const now=this.now();this.s={mode:'arrest',sim:!!o.sim,t0:now,arrestT:now,cycleT:now,warned:false,rhythm:'?',shocks:0,adr:[],amio:0,lido:0,
 adrDue:null,q:[],cur:null,log:[],kg:o.kg||null,syr:o.syr||null,nora:null,dobu:null,lastMap:null,nextMap:null,ht:{},htIdx:0,cycles:0,handsOff:0,maxOff:0,
 airway:'worek z maską 30:2',intub:null,etco2:[],paused:false,decided:false,email:o.email||'',rosc:[],post:{},atropine:0,torsadeAsked:false,endAsk:false,sentQ:false,mapStep:null};
 const s=this.s;this.log('start','Start NZK'+(s.sim?' (SYMULACJA)':''));
 if(s.sim)this.simInit();
 this.say((s.sim?SAY.sim+' ':'')+SAY.start);this.say(SAY.call);this.say(SAY.defib);this.say(SAY.iv);
 // pierwsza ocena rytmu od razu po komunikatach startowych
 this.ask('rhythm',SAY.rhythm,{prio:2});this.ask('team',SAY.team,{def:'skip',tries:1});
 return s};
// pytanie = pętla tymczasowa; gaśnie po odpowiedzi
P.ask=function(id,text,o){o=o||{};const q={id,text,def:o.def,tries:o.tries==null?Infinity:o.tries,prio:o.prio||0,asked:0,at:null,rem:0,data:o.data,timeout:o.timeout};
 const s=this.s;s.q=s.q.filter(x=>x.id!==id);if(s.cur&&s.cur.id===id)s.cur=null;
 let i=s.q.findIndex(x=>(x.prio||0)<q.prio);if(i<0)i=s.q.length;s.q.splice(i,0,q);
 if(s.cur&&(s.cur.prio||0)<q.prio){const c=s.cur;s.cur=null;let j=s.q.findIndex(x=>(x.prio||0)<(c.prio||0));if(j<0)j=s.q.length;s.q.splice(j,0,c)}
 this.pump();return q};
P.has=function(id){const s=this.s;return (s.cur&&s.cur.id===id)||s.q.some(x=>x.id===id)};
P.drop=function(id){const s=this.s;s.q=s.q.filter(x=>x.id!==id);if(s.cur&&s.cur.id===id){s.cur=null;this.pump()}};
P.pump=function(){const s=this.s;if(s.cur||!s.q.length||s.paused)return;s.cur=s.q.shift();s.cur.at=this.now();s.cur.t0=s.cur.at;s.cur.rem=0;this.say(s.cur.text,'ask');this.persist(s)};
P.tick=function(){const s=this.s,now=this.now();if(s.mode==='idle'||s.mode==='ended')return;s.nowT=now;
 if(s.paused)return;
 if(s.cur&&s.cur.timeout&&now-(s.cur.t0||s.cur.at)>=s.cur.timeout){const c0=s.cur;s.cur=null;this.answer(c0,{cmd:'default',def:c0.def,timeout:true});this.pump()}
 const c=s.cur;if(c&&now-c.at>=REM){c.rem++;c.at=now;
  if(c.rem>c.tries&&c.def!==undefined){s.cur=null;this.answer(c,{cmd:'default',def:c.def});this.pump()}
  else this.say(SAY.remind+' '+c.text,'remind')}
 if(s.aloneT&&now-s.aloneT>5*MS){s.aloneT=null;this.alarm('cpr');this.say(SAY.resumeCPR,'alarm');this.log('ucisk','Przerwa >5 s – wezwanie do wznowienia uciskania')}
 if(s.hk&&s.hk.t0){const h=s.hk;if(h.gi<HK_GLU.length&&now>=h.t0+HK_GLU[h.gi]*60*1000&&!this.has('hkGlu')){h.gi++;this.ask('hkGlu',SAY.hkGlu,{prio:2,def:'skip',tries:2})}if(h.kDue&&now>=h.kDue&&!this.has('hkK')){h.kDue=null;this.ask('hkK',SAY.hkK,{prio:2,def:'skip',tries:2})}}
 if(s.mode==='arrest'&&s.lucasP){const d=now-s.lucasP;if(!s.lucas5&&d>=5*MS){s.lucas5=true;this.say(SAY.lucas5,'alarm')}if(!s.lucas10&&d>=10*MS){s.lucas10=true;this.alarm('cpr');this.say(SAY.lucas10,'alarm')}}
 if(s.mode==='arrest'&&s.offStart&&!s.lucasP&&!s.offWarned&&now-s.offStart>10*MS&&s.cur&&['rhythm','rhyAsy','pulse'].includes(s.cur.id)){s.offWarned=true;this.alarm('cpr');this.say(SAY.offWarn,'alarm');this.log('ucisk','Przerwa w uciskaniu >10 s')}
 if(s.mode==='arrest'){const el=now-s.cycleT;
  if(!s.warned&&el>=CYCLE-15*MS){s.warned=true;this.say(SAY.warn15)}
  if(el>=CYCLE&&!this.has('rhythm')){s.offStart=now;if(s.sim)this.simShow();this.ask('rhythm',s.cprPace?SAY.rhythmPace:SAY.rhythm,{prio:2});s.checks=(s.checks||0)+1;if(s.checks%2===0)this.checkQs()}
  if(s.adrDue&&!s.adrHold&&now>=s.adrDue&&!this.has('adr')){this.ask('adr',adrText(s),{prio:1})}
  {const mn=Math.floor((now-s.arrestT)/60000);if(mn>=15&&mn%5===0&&s.minSaid!==mn){s.minSaid=mn;this.say(minText(mn))}}
  if(this.full&&!s.decided&&now-s.arrestT>=20*60*MS&&s.cycles>=1){s.decided=true;this.decSummary()}else if(s.decNext&&now>=s.decNext&&!this.has('decExc')&&!this.has('decEnd'))this.decSummary();
  if(s.sim&&now-(s.simSaid||s.t0)>=CYCLE){s.simSaid=now;this.say(SAY.sim,'sim')}}
 if(s.mode!=='arrest'){
 if(s.sedFentT&&now>=s.sedFentT&&!this.has('fentRep')){s.sedFentT=null;this.ask('fentRep',fentRepText(this),{prio:1,def:'skip',tries:1})}
 if(s.sedMidaT&&now>=s.sedMidaT&&!this.has('midaRep')){s.sedMidaT=null;this.ask('midaRep',midaRepText(this),{prio:1,def:'skip',tries:1})}
 if(s.bNext&&now>=s.bNext&&!this.has('bHR')&&!this.has('bSBP')&&!this.has('bSym')){s.bNext=null;this.ask('bHR',SAY.bHR,{prio:2,def:'skip',tries:2})}}
 if(s.mode==='rosc'&&s.nextMap&&now>=s.nextMap&&!this.has('sys')&&!this.has('dia')){s.nextMap=null;this.ask('sys',SAY.sys,{tries:Infinity})}};
// metronom: aktywne RKO, nie podczas oceny rytmu/pauzy, nie przy pracującym LUCAS (chyba że ustawienie)
P.metroWanted=function(o){const s=this.s;o=o||{};if(!s||s.mode==='idle'||s.mode==='ended'||o.on===false)return 0;if(s.mode==='arrest'&&s.lucas==='on'&&o.lucas===false)return 0;if(s.mode==='arrest'&&(s.offStart||s.lucasP))return 0.5;return 1};
P.lucasOff=function(){const s=this.s,now=this.now();if(s.lucasP)return;s.lucas='paused';s.lucasP=now;s.lucas5=false;s.lucas10=false;if(!s.offStart)s.offStart=now;this.log('LUCAS','LUCAS wstrzymany');
 let t=SAY.lucasOff;if(s.gasCyc!==s.cycles){s.gasCyc=s.cycles;t+=' '+SAY.gas}this.say(t,'alarm');if(!this.has('rhythm'))this.ask('rhythm',s.cprPace?SAY.rhythmPace:SAY.rhythm,{prio:2})};
P.lucasEnd=function(){const s=this.s,now=this.now();if(!s.lucasP)return;const d=(now-s.lucasP)/MS;s.lucasP=null;s.lucasOffT=(s.lucasOffT||0)+d;s.lucasN=(s.lucasN||0)+1;this.log('LUCAS','Przerwa LUCAS '+Math.round(d)+' s')};
P.lucasOn=function(){const s=this.s,now=this.now();s.lucas='on';this.lucasEnd();if(s.offStart){const off=(now-s.offStart)/MS;s.handsOff+=off;s.maxOff=Math.max(s.maxOff,off);s.offStart=null}this.log('LUCAS','LUCAS pracuje');this.say(SAY.lucasOn,'ack')};
P.newCycle=function(txt){const s=this.s,now=this.now();s.offWarned=false;this.lucasEnd();if(s.offStart){const off=(now-s.offStart)/MS;s.handsOff+=off;s.maxOff=Math.max(s.maxOff,off);s.offStart=null}
 s.cycleT=now;s.warned=false;s.cycles++;if(txt)this.say(txt);
 // drogi oddechowe po 1. cyklu, 4H4T od 2. cyklu, po jednej przyczynie na cykl
 if(s.cycles===1&&!s.intub)this.ask('intubQ',SAY.intubQ,{def:'no',tries:2});
 if(s.cycles>=2&&s.htIdx<HT.length&&!this.has('ht'))this.ask('ht',htQ(s.htIdx),{def:'skip',tries:1,data:s.htIdx});
};
P.checkQs=function(){const s=this.s;if(s.etco2Avail==null){if(!this.has('etco2Q'))this.ask('etco2Q',SAY.etco2Q,{def:'no',tries:1,prio:0})}else if(s.etco2Avail&&!this.has('etco2'))this.ask('etco2',SAY.etco2,{def:'skip',tries:1,prio:0});if(!this.has('pocusQ'))this.ask('pocusQ',SAY.pocusQ,{def:'skip',tries:1,prio:0})};
P.giveAdr=function(src){const s=this.s,now=this.now();s.adr.push(now);s.adrDue=now+ADRI;this.drop('adr');this.log('lek','Adrenalina 1 mg i.v./i.o.',{drug:'adrenalina',dose:'1 mg'});this.say(SAY.logged+' adrenalina 1 miligram.','ack')};
P.giveAmio=function(lido){const s=this.s;const first=(s.amio+s.lido)===0;if(lido){s.lido++;this.log('lek','Lidokaina '+(first?'100':'50')+' mg',{drug:'lidokaina',dose:first?'100 mg':'50 mg'})}
 else{s.amio++;this.log('lek','Amiodaron '+(first?'300':'150')+' mg',{drug:'amiodaron',dose:first?'300 mg':'150 mg'})}
 this.drop('amio');this.say(SAY.logged+(lido?' lidokaina.':' amiodaron.'),'ack')};
P.shockDone=function(){const s=this.s;s.shocks++;this.drop('shock');this.log('wyładowanie','Wyładowanie nr '+s.shocks,{n:s.shocks});
 if(s.sim)this.simAfterShock();
 this.newCycle(SAY.afterShock);
 s.epShocks=(s.epShocks||0)+1;const am=s.amio+s.lido,now=this.now();
 if(s.epShocks>=3&&!this.has('adr')&&(!s.adrDue||s.adrDue<=now)){s.adrHold=false;this.ask('adr',SAY.adr,{prio:1})}
 if(s.shocks>=3&&am===0&&!this.has('amio'))this.ask('amio',SAY.amio300,{prio:1});
 else if(s.shocks>=5&&am===1&&!this.has('amio'))this.ask('amio',SAY.amio150,{prio:1})};
P.noteInit=function(c,lab){const s=this.s;if(s.initRhythm)return;const t=norm(s.heard||'');let v=null;if(lab&&lab!=='VF/pVT'){s.initRhythm=lab;this.log('decyzja','Rytm początkowy: '+lab+(lab==='asystolia'?' (ASYSTOLIA – czynnik rokowniczy)':''));return}
 if(c==='shockable')v=/vt|czestoskurcz/.test(t)&&!/vf|migotan/.test(t)?'pVT':'VF';else if(c==='nonshock'||c==='nopulse')v=/asyst/.test(t)?'asystolia':(/pea|tetna|elektryczn|rozkojarz/.test(t)||/^(pe a|pe e a)$/.test(t))?'PEA':'asystolia/PEA';else if(c==='organised'||c==='pulse')v='rytm zorganizowany';else if(c==='brady')v='bradykardia';
 if(v){s.initRhythm=v;this.log('decyzja','Rytm początkowy: '+v+(v==='asystolia'?' (ASYSTOLIA – czynnik rokowniczy)':''))}};
P.setZrm=function(m,quiet){const s=this.s;const first=s.zrmMin==null;s.zrmMin=m;s.scen='przywieziony';if(!quiet&&first&&s.mode==='arrest'){this.ask('zrmAdr',SAY.zrmAdr,{def:'skip',tries:1});this.ask('zrmShk',SAY.zrmShk,{def:'skip',tries:1});this.ask('zrmAmio',SAY.zrmAmio,{def:'skip',tries:1})}s.arrestT=s.t0-m*60000;this.log('scenariusz','RKO przed przyjazdem (ZRM): '+m+' min');if(!quiet)this.say('Przyjęto: RKO od '+m+' minut przed przyjazdem.','ack')};
P.decSummary=function(){const s=this.s,now=this.now();const min=Math.floor((now-s.arrestT)/60000);const e=s.etco2.length?s.etco2[s.etco2.length-1].v:null;const u=s.pocus&&s.pocus.length?s.pocus[s.pocus.length-1].v:null;
 const sor=Math.floor((now-s.t0)/60000);const txt='Podsumowanie. Rytm początkowy: '+(s.initRhythm||'nieznany')+'. '+(s.zrmMin?'Czas całkowity: '+min+' '+plF(min,'minuta','minuty','minut')+', w tym '+sor+' na SOR':'Czas: '+min+' '+plF(min,'minuta','minuty','minut'))+'. Dwutlenek węgla w wydechu: '+(s.etco2Avail===false?'nie mierzono':(e==null||e==='–'?'brak danych':e))+'. USG: '+(u||'nie wykonano')+'.';
 s.decN=(s.decN||0)+1;s.decNext=null;this.log('decyzja','Podsumowanie #'+s.decN+': rytm początkowy '+(s.initRhythm||'?')+', czas '+min+' min, ETCO2 '+(e==null?'–':e)+', USG '+(u||'nie wykonano'));
 this.say(txt);this.ask('decExc',SAY.decExc,{prio:3})};
P.setRhythm=function(shockable,lab){const s=this.s;s.rhythm=shockable?'VF/pVT':'asystolia/PEA';lab=lab||(shockable?'VF/pVT':'asystolia/PEA');s.rhyLab=lab;const pre=RHY_NAME[lab]||'';this.drop('rhyAsy');this.drop('pulse');this.drop('rhythm');this.log('rytm',shockable?'Rytm do defibrylacji (VF/pVT)':'Rytm nie do defibrylacji (asystolia/PEA)',{shockable});
 if(pre)this.say(pre.trim());if(shockable){this.say(vfInstr(this.energy,s.shocks)+(s.shocks>=1&&!ENERGY_SEQ[this.energy]&&this.energy!=='max'?' '+SAY.escal:''));this.log('energia','Energia: '+energyFor(this.energy,s.shocks)+(/^\d/.test(energyFor(this.energy,s.shocks))?' J':''));if(this.stacked&&s.shocks===0&&s.scen!=='przywieziony')this.say(SAY.stacked);this.ask('shock',SAY.shock,{prio:2});
  if(!s.torsadeAsked){s.torsadeAsked=true;this.ask('torsade',SAY.torsade,{def:'no',tries:1})}}
 else{this.newCycle(SAY.nonshockI);s.adrHold=false;if(!s.adrDue||s.adrDue<=this.now())this.ask('adr',adrText(s,SAY.adrNow),{prio:1})}};
P.onRhythmCmd=function(c,lab){const s=this.s;if(!['shockable','nonshock','nopulse','organised','pulse','brady'].includes(c))return false;this.drop('rhythm');this.drop('rhyAsy');this.noteInit(c,lab);
 if(c==='shockable'){this.setRhythm(true,lab||labOf(c,s.heard));return true}if(c==='nonshock'||c==='nopulse'){this.setRhythm(false,lab||labOf(c,s.heard));return true}
 if(c==='organised'){s.preRosc=norm(s.heard||'');this.log('rytm','Rytm zorganizowany – sprawdzenie tętna');this.ask('pulse',SAY.pulseQ,{prio:2});return true}
 if(c==='pulse'){this.newCycle();this.toRosc();return true}
 if(c==='brady'){this.newCycle();this.log('rytm','Bradykardia z tętnem');s.preRosc='bradykardia';this.toRosc();this.startBrady();return true}return false};
// odpowiedź na bieżące pytanie
P.answer=function(q,r){if(r.cmd==='next'){if(q.def==='skip'||q.def==='go')r={cmd:'default',def:q.def,skip:true};else return false}
 const s=this.s,c=r.cmd,yes=c==='yes',no=c==='no';
 const def=c==='default';const D=def?r.def:null;
 switch(q.id){
 case 'scen':if(c==='sor'||c==='brought')this.say(SAY.ok,'ack');if(c==='brought'||D==='brought'){s.scen='przywieziony';this.log('scenariusz','Pacjent przywieziony w trakcie RKO');this.ask('mins',SAY.mins,{def:'skip',tries:2})}
  else if(c==='sor'||def){s.scen='SOR';this.log('scenariusz','NZK w SOR')}else return false;break;
 case 'mins':if(r.num!=null){this.setZrm(r.num,true);this.ask('zrmAdr',SAY.zrmAdr,{def:'skip',tries:1});this.ask('zrmShk',SAY.zrmShk,{def:'skip',tries:1});this.ask('zrmAmio',SAY.zrmAmio,{def:'skip',tries:1})}else if(!def)return false;break;
 case 'zrmAdr':if(r.num!=null){const n=Math.round(r.num),now=this.now();for(let k=0;k<n;k++)s.adr.push(now);this.log('lek','ZRM: adrenalina łącznie '+n+' mg',{drug:'adrenalina (ZRM)',dose:n+' mg',zrm:true});if(n>0)s.adrDue=now+3*60*MS}else if(!def&&!no)return false;break;
 case 'zrmAmio':if(r.num!=null){if(r.num>=300)s.amio++;if(r.num>=450)s.amio++;this.log('lek','ZRM: amiodaron łącznie '+r.num+' mg',{drug:'amiodaron (ZRM)',dose:r.num+' mg'})}else if(!def&&!no)return false;break;
 case 'zrmShk':if(r.num!=null){s.shocks+=r.num;s.epShocks=(s.epShocks||0)+r.num;this.log('wyładowanie','ZRM: '+r.num+' wyładowań')}else if(!def&&!no)return false;break;
 case 'team':if(yes||def)this.log('zespół','Role przydzielone');else return false;break;
 case 'rhythm':if(this.onRhythmCmd(c))break;if(yes){this.onRhythmCmd('shockable','VF/pVT');break}if(no){this.drop('rhythm');this.ask('rhyAsy',SAY.rhyAsy,{prio:2});break}return false;
 case 'rhyAsy':if(this.onRhythmCmd(c))break;if(yes){this.onRhythmCmd('nonshock','asystolia');break}if(no){this.ask('pulse',SAY.pulseQ,{prio:2,def:'nopulse',timeout:10*MS});break}return false;
 case 'roscAf':{if(yes){this.setRoscRhy('migotanie przedsionków');break}if(no||def){this.setRoscRhy('inny nadkomorowy');break}const v=roscRhyOf(r.text);if(!v)return false;this.setRoscRhy(v);break}
 case 'roscRhy':{if(def){this.log('rytm','Rytm po ROSC: nie podano');break}if(yes){this.setRoscRhy('zatokowy');break}if(no){this.ask('roscAf',SAY.roscAf,{prio:3,def:'skip',tries:1});break}const v=roscRhyOf(r.text);if(!v)return false;this.setRoscRhy(v);this.say(SAY.logged+' '+v+'.','ack');break}
 case 'pulse':if(yes||c==='pulse'){this.newCycle();this.toRosc()}else if(no||c==='nopulse'||(def&&D==='nopulse')){if(def)this.say(SAY.pulseNo,'alarm');this.noteInit('nopulse','PEA');this.setRhythm(false,'PEA')}else if(c==='shockable'||c==='nonshock'){this.onRhythmCmd(c)}else return false;break;
 case 'shock':if(yes||c==='shock_done')this.shockDone();else if(no){this.newCycle(SAY.cont)}else return false;break;
 case 'adr':if(yes||c==='adr')this.giveAdr();else return false;break;
 case 'amio':if(no){this.log('lek','Amiodaron/lidokaina – nie podano');break}if(c==='lido')this.giveAmio(true);else if(yes||c==='amio')this.giveAmio(false);else return false;break;
 case 'torsade':if(yes){this.log('rytm','Torsade de pointes');this.ask('mag',SAY.mag)}else if(no||def){}else return false;break;
 case 'mag':if(yes){this.log('lek','Siarczan magnezu 2 g',{drug:'siarczan magnezu',dose:'2 g'});this.say(SAY.logged+' magnez.','ack')}else return false;break;
 case 'intubQ':if(yes){s.airway='intubacja (planowana)';this.log('drogi oddechowe','Pewny w intubacji – intubacja');this.say(SAY.intubYes)}
  else if(no||def){s.airway='nadgłośniowy przyrząd';this.log('drogi oddechowe','Nadgłośniowy przyrząd (maska krtaniowa/i-gel)');this.say(SAY.intubNo)}else return false;break;
 case 'etco2Q':if(yes){s.etco2Avail=true;if(s.cur===q)s.cur=null;this.log('kapnografia','Pomiar dwutlenku węgla w wydechu dostępny');this.ask('etco2',SAY.etco2,{def:'skip',tries:1,prio:1})}else if(no||def){s.etco2Avail=false;this.log('kapnografia','Brak pomiaru dwutlenku węgla w wydechu – nie używany w tej akcji')}else if(r.num!=null){s.etco2Avail=true;s.etco2.push({t:this.now(),v:r.num});this.log('kapnografia','EtCO₂ '+r.num+' mmHg')}else return false;break;
 case 'etco2':if(r.num!=null){s.etco2.push({t:this.now(),v:r.num});this.log('kapnografia','EtCO₂ '+r.num+' mmHg');this.say(SAY.logged+' '+r.num+'.','ack')}else if(def||no||c==='unknown'){s.etco2.push({t:this.now(),v:'–'});this.log('kapnografia','EtCO₂ –')}else return false;break;
 case 'ht':{const i=q.data;if(yes){s.ht[HT[i][0]]='✓';this.log('4H4T',HT[i][0]+': potwierdzona');this.say(HT[i][1]);this.htTreat(i)}
  else if(no){s.ht[HT[i][0]]='✗';this.log('4H4T',HT[i][0]+': wykluczona')}else if(def){s.ht[HT[i][0]]='–'}else return false;s.htIdx=i+1;
  for(const[g,L,k]of[[HT_H,'Cztery H sprawdzone.','htH'],[HT_T,'Cztery T sprawdzone.','htT']])if(!s[k]&&g.every(n=>s.ht[n])){s[k]=true;this.log('4H4T',L.slice(0,-1));this.say(L)}break}
 case 'ccb':if(yes){this.ask('calcium',SAY.calcium)}else if(!no&&!def)return false;this.ask('tca',SAY.bicarbQ,{def:'no',tries:1});break;
 case 'hkEcg':if(yes){s.hk.ecg=true;this.log('hiperkaliemia','Zmiany w EKG – wapń');this.ask('calcium',SAY.calcium,{prio:2})}else if(no||def){s.hk.ecg=false}else return false;this.ask('gluPre',SAY.gluPre,{prio:2});break;
 case 'gluPre':if(r.num!=null&&r.num>=10&&r.num<=1000){s.hk.pre=r.num;this.log('hiperkaliemia','Glikemia przed: '+r.num+' mg/dl')}else if(c==='unknown'||no||def){s.hk.pre=null;this.log('hiperkaliemia','Glikemia przed: nieznana – zmierz teraz');this.say(SAY.gluNow)}else return false;this.hkGive();break;
 case 'insGo':if(yes||def){this.hkStarted()}else return false;break;
 case 'hkGlu':if(r.num!=null&&r.num>=10&&r.num<=1000){s.hk.glu.push({t:this.now(),v:r.num});this.log('hiperkaliemia','Glikemia '+r.num+' mg/dl');if(r.num<70){this.log('hiperkaliemia','HIPOGLIKEMIA '+r.num+' mg/dl');this.say(SAY.hypo,'alarm');this.ask('glucose',SAY.glucose,{prio:3})}}else if(!def)return false;break;
 case 'hkK':if(r.num!=null&&r.num>=1&&r.num<=12){s.hk.k.push({t:this.now(),v:r.num});this.log('hiperkaliemia','Potas '+fmt1(r.num)+' mmol/l');if(r.num>=6.5){this.say(SAY.hkKHigh,'alarm');this.log('hiperkaliemia','K ≥6,5 – można powtórzyć insulinę z glukozą')}}else if(!def)return false;break;
 case 'glucose':if(yes){this.log('lek','Glukoza 20% 100 ml (20 g)',{drug:'glukoza',dose:'20 g'});this.say(SAY.logged+' glukoza.','ack')}else return false;break;
 case 'calcium':if(yes){this.log('lek','Chlorek wapnia 10% 10 ml (1 g)',{drug:'wapń',dose:'1 g'});this.say(SAY.logged+' wapń.','ack')}else return false;break;
 case 'tca':case 'bicarbQ':if(yes)this.ask('bicarb',SAY.bicarb);else if(no||def){this.say(SAY.bicarbNo);this.log('lek','Wodorowęglan – brak wskazania')}else return false;break;
 case 'bicarb':if(yes){this.log('lek','Wodorowęglan sodu 8,4% 50 ml (50 mmol)',{drug:'wodorowęglan',dose:'50 mmol'});this.say(SAY.logged+' wodorowęglan.','ack')}else return false;break;
 case 'lysis':if(yes){s.lysisT=this.now();this.log('lek','Alteplaza 50 mg bolus',{drug:'trombolityk',dose:'50 mg'});this.say(SAY.logged+' tromboliza. Kontynuuj 60 do 90 minut.','ack');this.startInf('hep','pe')}else return false;break;
 case 'decExc':{const t=norm(r.text);const lys=/trombol/.test(t);if(no){this.log('decyzja','Wyjątki: brak');this.ask('decEnd',SAY.decEnd,{prio:3})}
  else if(yes||lys||/hipoterm|zatruc|ecmo|ecpr/.test(t)){this.log('decyzja','Wyjątek: '+r.text+' – kontynuacja RKO');this.say(SAY.contCPR+(lys||s.lysisT?' '+SAY.decLysis:''))}else if(def){this.ask('decEnd',SAY.decEnd,{prio:3})}else return false;break}
 case 'decEnd':if(c==='zakoncz_tak'){this.log('decyzja','Kierujący: ZAKOŃCZENIE RKO o '+hhmm(this.now()));this.finish();return true}
  if(yes){this.ask('decEnd',SAY.decSay,{prio:3});return true}if(no||def){this.log('decyzja','Kierujący: kontynuacja RKO o '+hhmm(this.now()));this.say(SAY.contCPR);s.decNext=this.now()+5*60000}else return false;break;
 case 'pocusQ':{const t=norm(r.text);let v=null;if(/brak czynn|nie ma czynn|bez czynn|brak ruch|nie ma ruch/.test(t))v='brak czynności serca';else if(/nie wykonan|nie robion|bez usg|nie zrobion/.test(t)||no)v='nie wykonano';else if(yes||/jest czynn|czynnosc obecn|kurczy/.test(t))v='czynność serca obecna';else if(def)break;if(!v)return false;
  s.pocus=s.pocus||[];if(v!=='nie wykonano'){s.pocus.push({t:this.now(),v});}this.log('POCUS','Kontrola rytmu: '+v);break}
 case 'endQ':s.endAsk=false;if(c==='zakoncz_tak'){this.finish();return true}if(yes){this.say(SAY.decSay);s.endAsk=true;this.ask('endQ',SAY.endQ,{prio:3,def:'cancel',tries:2});return true}this.say(SAY.endCancel);break;
 // ---- po ROSC ----
 case 'sys':{const pr=parsePair(r.text);if(pr&&pr[0]>=30&&pr[0]<=300&&pr[1]>=10&&pr[1]<=200){s.sysV=pr[0];this.onMap(mapOf(pr[0],pr[1]),pr[0],pr[1]);break}}if(r.num!=null&&r.num>=30&&r.num<=300){s.sysV=r.num;this.ask('dia',SAY.dia,{prio:1})}else{if(def)return true;this.ask('sys',SAY.sysAgain,{prio:1});return true}break;
 case 'dia':if(r.num!=null&&r.num>=10&&r.num<=200){this.onMap(mapOf(s.sysV,r.num),s.sysV,r.num)}else{this.ask('dia',SAY.diaAgain,{prio:1});return true}break;
 case 'weight':{let as=false;if(r.num!=null&&r.num>=20&&r.num<=250)s.kg=r.num;else if(def||c==='unknown'||c==='no'){s.kg=70;as=true;s.kgAssumed=true;this.say(SAY.weightAssume)}else return false;this.log('masa','Masa ciała '+s.kg+' kg'+(as?' (PRZYJĘTA – nieznana)':''))}if(s.infPending)this.startInf(...s.infPending);else if(s.binfPending)this.startBinf(s.binfPending);else this.contNora();break;
 case 'syr':if(c==='s20')s.syr=20;else if(c==='s50'||def)s.syr=50;else return false;this.contNora();break;
 case 'noraGo':if(yes)this.log('lek','Noradrenalina – pompa uruchomiona '+flowPhrase(s.nora.mlh));else return false;break;
 case 'lowOut':if(yes)this.startDobu();else if(no||def){s.dobuAsked=true;this.say(SAY.dobuNo)}else return false;break;
 case 'dobuGo':if(yes)this.log('lek','Dobutamina – pompa uruchomiona');else return false;break;
 case 'spo2':if(r.num!=null){s.post.spo2=r.num;this.log('po ROSC','SpO₂ '+r.num+'%')}else if(!def)return false;break;
 case 'ekg':if(yes){s.post.ekg='tak';this.log('po ROSC','EKG 12-odpr. wykonane');this.ask('stemi',SAY.stemi,{def:'skip',tries:1})}else if(no||def){s.post.ekg='nie'}else return false;break;
 case 'stemi':if(yes){s.post.stemi='TAK';this.log('po ROSC','STEMI – kontakt z pracownią hemodynamiki')}else if(no){s.post.stemi='nie'}else if(!def)return false;break;
 case 'temp':if(r.num!=null){s.post.temp=r.num;this.log('po ROSC','Temperatura '+r.num+' °C')}else if(!def)return false;break;
 case 'bradySigns':if(yes){this.log('bradykardia','Objawy niepokojące: TAK');this.ask('bradyHtx',SAY.bradyHtx,{prio:2,def:'no',tries:1})}else if(no||def){this.log('bradykardia','Bez objawów niepokojących');this.say(SAY.bradyNoSigns)}else return false;break;
 case 'bradyHtx':if(yes){this.log('bradykardia','Mobitz II / blok III° / przeszczep serca');this.say(SAY.bradyHtxYes);this.startPacing();this.ask('bradyDrug',SAY.bradyDrug,{def:'iso',tries:2})}else if(no||def){this.ask('atro',atroText(this.atroDose,this.atroAmp),{prio:2})}else return false;break;
 case 'atro':if(yes){s.atropine=r1(s.atropine+this.atroDose);s.atroN=(s.atroN||0)+1;this.log('lek','Atropina '+fmt1(this.atroDose)+' mg i.v. (łącznie '+fmt1(s.atropine)+' mg, '+s.atroN+'. dawka)',{drug:'atropina',dose:fmt1(this.atroDose)+' mg'});this.say(SAY.logged+' atropina.','ack');
  if(s.atropine>=3-1e-9){s.bNext=null;this.say(SAY.atroMax);this.startPacing();this.ask('bradyDrug',SAY.bradyDrug,{def:'iso',tries:2})}else{s.bphase='atro';s.bNext=this.now()+3*60*MS}}else return false;break;
 case 'bradyDrug':{const d=['iso','dopa','adrinf'].includes(c)?c:/adrenalin/.test(norm(r.text))?'adrinf':(def?'iso':null);if(!d)return false;this.startBinf(d);break}
 case 'which':{const t=norm(r.text);const k=/noradrenalin/.test(t)?'nora':/dobutamin/.test(t)?'dobu':/izopren|dopamin|adrenalin|bradykard|wlew/.test(t)?'binf':null;if(!k||!this.titratable().includes(k))return false;this.titrate(k,q.data);break}
 case 'hepQ':{const t=norm(r.text);const ind=/zator|pe\b|plucn/.test(t)?'pe':/wiencow|zawal|acs|ozw/.test(t)?'acs':null;if(!ind)return false;this.startInf('hep',ind);break}
 case 'hepRoscQ':if(yes){this.startInf('hep',s.hepAfterRosc||'pe')}else if(no||def){s.hepAfterRosc=null;this.log('lek','Wlew heparyny po ROSC – nie rozpoczęto')}else return false;break;
 case 'acQ':if(no){this.hepGateEnd('ok','Leki przeciwkrzepliwe: nie')}else if(yes){this.log('heparyna – bezpieczeństwo','Leki przeciwkrzepliwe: tak');this.ask('acDrug',SAY.acDrug,{prio:2})}else if(c==='unknown'){this.hepGateEnd('stop','Leki przeciwkrzepliwe: nieznane – heparyna wstrzymana',SAY.acUnknown)}else return false;break;
 case 'acDrug':{const t=norm(r.text);if(/dabigatran|rywaroksaban|rivaroksaban|riwaroksaban|apiksaban|apixaban|pradax|xarelt|eliqu|elikw|doac|noac|edoksaban|lixian/.test(t)){this.hepGateEnd('stop','Lek: DOAC ('+r.text+') – heparyna przeciwwskazana',SAY.acDoac)}
  else if(/warfaryn|warfin|acenokumarol|sintrom|syntrom/.test(t)){this.log('heparyna – bezpieczeństwo','Lek: antagonista witaminy K ('+r.text+')');this.ask('inrQ',SAY.inrQ,{prio:2})}
  else if(/heparyn|enoksaparyn|clexan|kleksan|fraksyparyn/.test(t)){this.log('heparyna – bezpieczeństwo','Lek: heparyna ('+r.text+')');this.ask('hepOn',SAY.hepOn,{prio:2})}else return false;break}
 case 'inrQ':if(r.num!=null&&r.num>0&&r.num<15){if(r.num>2.5)this.hepGateEnd('stop','INR '+fmt1(r.num)+' (>2,5) – heparyna przeciwwskazana',SAY.inrHigh);else this.hepGateEnd('ok','INR '+fmt1(r.num)+' (≤2,5) – heparyna dozwolona')}else if(c==='unknown'||no){this.hepGateEnd('stop','INR nieznany – heparyna wstrzymana do oznaczenia',SAY.inrUnknown)}else return false;break;
 case 'hepOn':if(yes){this.hepGateEnd('noBolus','Heparyna: trwający wlew – bez bolusu, wlew wg masy (reguła lokalna użytkownika)')}else if(no){this.ask('hepLast',SAY.hepLast,{prio:2})}else return false;break;
 case 'hepLast':{const h=hoursOf(r.text,r.num);if(h!=null){if(h<4)this.hepGateEnd('stop','Ostatnia dawka heparyny '+fmt1(h)+' h temu (<4 h) – bez bolusu i bez wlewu, konsultacja (reguła lokalna użytkownika)',SAY.hepRecent);
  else this.hepGateEnd('half','Ostatnia dawka heparyny '+fmt1(h)+' h temu (≥4 h) – połowa bolusu + wlew (reguła lokalna użytkownika)',SAY.hepHalf)}
  else if(c==='unknown'){this.hepGateEnd('stop','Czas ostatniej dawki heparyny nieznany – wstrzymano',SAY.hepLastUnknown)}else return false;break}
 case 'amioConf':if(yes){s.amioGiven=amioGivenMg(s.amio);this.log('lek','Amiodaron w RKO potwierdzony: '+s.amio+'× = '+s.amioGiven+' mg');this.startInf('amio')}else if(no){this.ask('amioCnt',SAY.amioCnt,{prio:2})}else return false;break;
 case 'amioCnt':{const n=amioCount(r.text,r.num);if(n==null){if(yes){this.ask('amioCnt',SAY.amioHow,{prio:2});return true}return false}s.amioGiven=amioGivenMg(n);this.log('lek','Amiodaron w RKO/ZRM: '+n+'× = '+s.amioGiven+' mg');this.startInf('amio');break}
 case 'amioCvc':{const t=norm(r.text);if(this.amioMode!=='pump'&&/\b50\b|piecdziesiat/.test(t)){this.say(SAY.amio50);this.ask('amioCvc',SAY.amioCvc,{prio:2});return true}if(yes||/central/.test(t))s.amioCentral=true;else if(no||/obwod/.test(t))s.amioCentral=false;else return false;this.startInf('amio');break}
 case 'infGo':if(yes)this.log('lek',q.data+' – pompa uruchomiona');else if(!def)return false;break;
 case 'tube':if(r.num!=null&&r.num>=2&&r.num<=10){s.tube=r.num;this.log('drogi oddechowe','Rurka nr '+fmt1(r.num))}else if(!def)return false;break;
 case 'usgRes':if(def)break;if(!r.text)return false;s.usgRes=(s.usgRes?s.usgRes+'; ':'')+r.text;this.log('POCUS','Wynik: '+r.text);break;
 case 'glu':if(r.num!=null){s.post.glu=r.num;this.log('po ROSC','Glikemia '+r.num+' mg/dl')}else if(!def)return false;break;
 case 'gcs':if(r.num!=null&&r.num>=3&&r.num<=15){s.post.gcs=r.num;this.log('po ROSC','GCS '+r.num)}else if(!def)return false;break;
 case 'adrinfQ':if(yes)this.startBinf('adrinf');else if(no||def)this.say(SAY.adrinfNo);else return false;break;
 case 'bHR':if(r.num!=null){s.bAss={hr:r.num};this.ask('bSBP',SAY.bSBP,{prio:2,def:'skip',tries:2})}else if(def){s.bAss={hr:null};this.ask('bSBP',SAY.bSBP,{prio:2,def:'skip',tries:2})}else return false;break;
 case 'bSBP':{const pr=parsePair(r.text);if(pr)r.num=pr[0]}if(r.num!=null||def){s.bAss.sbp=r.num==null?null:r.num;this.ask('bSym',SAY.bSym,{prio:2,def:'no',tries:1})}else return false;break;
 case 'bSym':if(yes||no||def){const a=s.bAss;a.res=!!yes;this.log('bradykardia','Ocena: HR '+(a.hr??'—')+', skurczowe '+(a.sbp??'—')+', objawy '+(a.res?'ustąpiły':'utrzymują się'));this.bDecide()}else return false;break;
 case 'binfGo':if(yes)this.log('lek',BINF[s.binf.d].name+' – pompa uruchomiona');else if(!def)return false;s.bphase='binf';s.bNext=this.now()+BINT[s.binf.d];break;
 case 'pace1':case 'pace2':case 'pace3':if(yes||no||def){const n=+q.id.slice(4);if(n<3)this.ask('pace'+(n+1),SAY['pace'+(n+1)],{prio:2,def:'go',tries:Infinity});else{this.log('stymulacja','Tryb na żądanie 70/min');this.say(SAY.pace4+(s.pacing.cardio?' '+SAY.cardio:''));s.pacing.mA=30;this.ask('paceCap',SAY.paceCap,{prio:2})}}else return false;break;
 case 'paceCap':if(yes){s.pacing.capture=s.pacing.mA;s.pacing.mA+=10;this.log('stymulacja','Wychwyt przy '+s.pacing.capture+' mA, ustawione '+s.pacing.mA+' mA');this.say(SAY.paceOk);this.ask('pacePulse',SAY.pacePulse,{prio:2})}
  else if(no||c==='up'){if(s.pacing.mA>=this.paceMax){this.log('stymulacja','Brak wychwytu przy '+this.paceMax+' mA – kardiolog');this.alarm('pace');this.say(SAY.paceMax,'alarm');if(!s.binf&&!this.has('bradyDrug'))this.ask('bradyDrug',SAY.bradyDrug,{prio:1,def:'iso',tries:2})}else{if(!s.pacing.analg){s.pacing.analg=true;this.say(SAY.paceAnalg)}s.pacing.mA+=10;this.log('stymulacja','Prąd '+s.pacing.mA+' mA');this.say(paceUp(s.pacing.mA));this.ask('paceCap',SAY.paceCap,{prio:2})}}else return false;break;
 case 'paceConsc':if(yes){this.log('sedacja','Pacjent przytomny – analgezja/sedacja (DO WERYFIKACJI)');s.sed={fent:0,mida:0};s.fentConc=this.fentConc;s.midaConc=this.midaConc;this.say(sedText(this)+' '+SAY.paceMon);this.ask('fentGo',SAY.fentGo,{prio:1,def:'skip',tries:2});this.ask('midaGo',SAY.midaGo,{prio:1,def:'skip',tries:2})}else if(no||def){this.say(SAY.paceNoSed)}else return false;break;
 case 'fentGo':case 'fentRep':case 'midaGo':case 'midaRep':{const f=q.id.startsWith('fent');if(no&&q.id.endsWith('Rep'))break;if(def&&q.id.endsWith('Go')){f?s.sedFentT=this.now()+4*60*MS:s.sedMidaT=this.now()+150*MS;break}if(def)break;
  let ml=r.num!=null&&r.num>0&&r.num<=10?r.num:(yes?(f?25/this.fentConc:1/this.midaConc):null);if(ml==null)return false;this.giveSed(f,ml);break}
 case 'pacePulse':if(yes||c==='pulse'){this.log('stymulacja','Tętno obecne – stymulacja skuteczna');this.ask('paceConsc',SAY.paceConsc,{prio:2,def:'no',tries:1})}else if(no||c==='nopulse'){this.log('NZK','PEA przy stymulacji');this.say(SAY.pacePEA);s.mode='rosc';this.toArrest(true)}else return false;break;
 default:if(!def)return false}
 return true};
P.titratable=function(){const s=this.s,a=[];if(s.nora)a.push('nora');if(s.dobu)a.push('dobu');if(s.binf)a.push('binf');return a};
P.titrate=function(k,cmd){const s=this.s;if(k==='nora'){cmd==='up'?this.noraUp():this.say(SAY.keepPump+' '+flowPhrase(s.nora.mlh)+'.')}
 else if(k==='dobu'){cmd==='up'?this.dobuUp():this.say(SAY.keepPump+' '+flowPhrase(s.dobu.mlh)+'.')}
 else{cmd==='up'?this.binfUp(false):this.say(SAY.keepPump+' '+flowPhrase(s.binf.mlh)+'.')}};
P.dobuUp=function(){const s=this.s,now=this.now();if(s.dobu.dose>=20-1e-9){this.alarm('dobu');this.say(SAY.dobuMax,'alarm');this.log('alarm','Dobutamina 20 µg/kg/min – odmowa dalszego zwiększania');return}
 if(s.dobu.t&&now-s.dobu.t<10*60*1000){this.say(SAY.dobuWait);return}s.dobu.t=now;
 s.dobu.dose=Math.min(20,s.dobu.dose+2.5);s.dobu.mlh=dobuMlh(s.dobu.dose,s.kg);this.log('lek','Dobutamina ↑ '+fmt1(s.dobu.mlh)+' ml/h = '+fmt1(s.dobu.dose)+' µg/kg/min',{drug:'dobutamina',dose:fmt1(s.dobu.dose)+' µg/kg/min',mlh:s.dobu.mlh});this.say(SAY.upPump+' '+flowPhrase(s.dobu.mlh)+'.');
 if(s.dobu.dose>=20-1e-9){this.alarm('dobu');this.say(SAY.dobuMax,'alarm')}else if(s.dobu.dose>10&&!s.dobu.a10){s.dobu.a10=true;this.alarm('dobu');this.say(SAY.dobu10,'alarm');this.log('alarm','Dobutamina >10 µg/kg/min – konsultacja kardiologiczna')}};
P.noraDown=function(pre){const s=this.s;if(s.nora.dose<=.05+1e-9){this.say((pre?pre+' ':'')+SAY.noraLow);this.log('lek','Noradrenalina na dawce minimalnej – wyłączenie: decyzja lekarza');return}s.nora.dose=Math.round((s.nora.dose-.05)*100)/100;s.nora.mlh=noraMlh(s.nora.dose,s.kg,s.syr);
 this.log('lek','Noradrenalina ↓ '+fmt1(s.nora.mlh)+' ml/h = '+String(s.nora.dose).replace('.',',')+' µg/kg/min',{drug:'noradrenalina',dose:String(s.nora.dose).replace('.',',')+' µg/kg/min',mlh:s.nora.mlh});this.say((pre?pre+' '+SAY.setPump:SAY.downPump)+' '+flowPhrase(s.nora.mlh)+'.')};
const HEPR={pe:18,acs:12},HEPB={pe:80,acs:60},HEPBMAX={acs:5000},HEPRMAX={acs:1000};
function hoursOf(text,num){const t=norm(text);if(/poltor/.test(t))return 1.5;if(/^(pol|pół) godzin|^pol godz/.test(t))return 0.5;if(num!=null)return num;if(/^godzin[eya]?\b/.test(t))return 1;return null}
const NUMW=['zero','jeden','dwa','trzy','cztery','pięć','sześć','siedem','osiem','dziewięć','dziesięć','jedenaście','dwanaście','trzynaście','czternaście','piętnaście','szesnaście','siedemnaście','osiemnaście','dziewiętnaście'],TENW=['','','dwadzieścia','trzydzieści','czterdzieści','pięćdziesiąt','sześćdziesiąt'];
function numW(n){return n<20?NUMW[n]:TENW[Math.floor(n/10)]+(n%10?' '+NUMW[n%10]:'')}
function plF(n,one,few,many){if(n===1)return one;const d=n%10,dd=n%100;return d>=2&&d<=4&&!(dd>=12&&dd<=14)?few:many}
function amioDrip(rem,set){const dpm=Math.round(500/1440*set),sec=Math.floor(60/dpm);return {rem,vol:500,conc:rem/500,dpm,sec,mgh:rem/24}}
function amioDripSay(rem,set,central){const d=amioDrip(rem,set);return 'Dociągnij '+rem+' miligramów amiodaronu do 500 mililitrów 5% glukozy. Ustaw kroplówkę na '+numW(d.dpm)+' '+plF(d.dpm,'kroplę','krople','kropli')+' na minutę, czyli jedna kropla co '+(d.sec===2?'dwie':numW(d.sec))+' '+plF(d.sec,'sekundę','sekundy','sekund')+'. Wlew przez 24 godziny. Tylko glukoza 5%.'+(central?' '+SAY.amioCvcOk:'')}
function amioGivenMg(n){return n>=2?450:n===1?300:0}
function amioCalc(given,central){const rem=Math.max(0,900-given),vol=central?50:500,conc=900/vol,raw=rem/conc/24,mlh=raw>=20?Math.round(raw):r1(raw);return {rem,vol,mgh:rem/24,mlh}}
function amioConfText(n){return 'W trakcie RKO podano amiodaron – '+(n===1?'1 raz':n+' razy')+'. Zgadza się?'}
function amioSay(central,mlh){return (central?'Przygotuj amiodaron w pompie infuzyjnej. 900 miligramów dociągnij do 50 mililitrów 5% glukozy.':'900 miligramów dociągnij do 500 mililitrów 5% glukozy.')+' '+SAY.setPump+' '+flowPhrase(mlh)+'. '+SAY.amioGlu}
function amioCount(t,num){t=norm(t);if(/^(nie|zero|zadn|brak)/.test(t))return 0;if(/\braz\b|jeden|jedn/.test(t)&&!/dwa|dwu/.test(t))return 1;if(num!=null){if(num>=150)return num>=450?2:num>=300?1:0;if(num<=2)return num}return null}
function minText(m){const w=numW(m).replace(/ dwa$/,' dwie');return w[0].toUpperCase()+w.slice(1)+' '+plF(m,'minuta','minuty','minut')+' RKO.'}
function fmt2(x){const v=Math.round(x*100)/100;return String(v).replace('.',',')}
function hepCalc(ind,kg,ampU,u,ml,f){f=f||1;const bu=Math.min(HEPB[ind]*f*kg,(HEPBMAX[ind]||Infinity)*f),bml=Math.round(bu/ampU*100)/100,rate=Math.min(HEPR[ind]*kg,HEPRMAX[ind]||Infinity),mlh=r1(rate/(u/ml));return {bu,bml,rate,mlh}}
function hepBolusText(bml){return 'Bolus heparyny: nabierz '+fmt2(bml)+' '+(Number.isInteger(bml)?mlWord(bml):'mililitra')+' z ampułki, podaj dożylnie.'}
function hepPrepText(u,ml){return 'Przygotuj '+(u%1000===0?(u/1000)+' tysięcy':u)+' jednostek heparyny w '+ml+' mililitrach.'}
P.hepGateEnd=function(res,txt,sayTxt){const s=this.s;s.hepGate=res;s.hepGateTxt=txt;this.log('heparyna – bezpieczeństwo',txt);if(sayTxt)this.say(sayTxt,'alarm');if(res!=='stop'&&s.hepGatePend){const i=s.hepGatePend;s.hepGatePend=null;this.startInf('hep',i)}else if(res==='stop'){s.hepGatePend=null;s.hepAfterRosc=null}};
P.startInf=function(k,ind){const s=this.s;if(k==='hep'&&!['ok','noBolus','half'].includes(s.hepGate)){if(s.hepGate==='stop'){this.say(SAY.hepStopped);return}s.hepGatePend=ind;this.ask('acQ',SAY.acQ,{prio:2});return}if(k==='hep'&&!s.kg){s.infPending=[k,ind];this.ask('weight',SAY.weight,{prio:2});return}s.infPending=null;s.infs=s.infs||{};
 if(k==='hep'){const now=this.now(),nb=s.hepGate==='noBolus',hf=s.hepGate==='half'?0.5:1,c=hepCalc(ind,s.kg,this.hepAmp,this.hep.u,this.hep.ml,hf),lbl=ind==='pe'?'zatorowość płucna':'OZW';s.infs.hep=Object.assign({ind,noBolus:nb,half:hf<1},c);
  if(nb){if(s.mode==='arrest'){s.hepAfterRosc=ind;this.say(SAY.hepNoInf);return}}else this.log('lek','Heparyna bolus '+(hf<1?'(POŁOWA – reguła lokalna użytkownika) ':'')+c.bu+' j. ('+HEPB[ind]*hf+' j./kg'+(HEPBMAX[ind]?', max '+HEPBMAX[ind]*hf+' j.':'')+') = '+fmt2(c.bml)+' ml z ampułki '+this.hepAmp+' j./ml ('+lbl+')',{drug:'heparyna bolus',dose:c.bu+' j.'});
  if(s.mode==='arrest'){s.hepAfterRosc=ind;this.log('lek','Wlew heparyny wstrzymany do ROSC (RKO)');this.say(hepBolusText(c.bml)+' '+SAY.hepNoInf);this.ask('infGo','Powiedz: tak.',{def:'skip',tries:2,prio:1,data:'Heparyna bolus'});return}
  s.hepAfterRosc=null;s.infs.hep.aptt=now+6*3600*1000;
  this.log('lek','Heparyna wlew '+this.hep.u+' j./'+this.hep.ml+' ml: '+fmt1(c.mlh)+' ml/h = '+c.rate+' j./h ('+HEPR[ind]+' j./kg/h'+(HEPRMAX[ind]?', max '+HEPRMAX[ind]+' j./h':'')+'); kontrola APTT o '+hhmm(now+6*3600*1000).slice(0,5),{drug:'heparyna wlew',dose:HEPR[ind]+' j./kg/h',mlh:c.mlh});
  this.say((nb?SAY.hepOnInf:hepBolusText(c.bml)+' '+hepPrepText(this.hep.u,this.hep.ml))+' '+SAY.setPump+' '+flowPhrase(c.mlh)+'. '+SAY.aptt);0&&this.say(hepBolusText(c.bml)+' '+hepPrepText(this.hep.u,this.hep.ml)+' '+SAY.setPump+' '+flowPhrase(c.mlh)+'. '+SAY.aptt);this.ask('infGo','Powiedz: tak, gdy pompa ruszy.',{def:'skip',tries:2,prio:1,data:'Heparyna'})}
 else{if(s.amioGiven==null){if(s.amio>0)this.ask('amioConf',amioConfText(s.amio),{prio:2});else this.ask('amioCnt',SAY.amioCnt,{prio:2});return}
  if(s.amioCentral==null){this.ask('amioCvc',SAY.amioCvc,{prio:2});return}
  if(this.amioMode!=='pump'){const now=this.now(),d=amioDrip(Math.max(0,900-s.amioGiven),this.dropSet),end=now+24*3600*1000;s.infs.amio=Object.assign({given:s.amioGiven,central:s.amioCentral,end,drip:true,set:this.dropSet},d);
   this.log('lek','Amiodaron wlew grawitacyjny: podano w RKO '+s.amioGiven+' mg, pozostało '+d.rem+' mg w 500 ml glukozy 5% ('+fmt1(d.conc)+' mg/ml) = '+fmt1(d.mgh)+' mg/h; '+d.dpm+' kropli/min (zestaw '+this.dropSet+' kropli/ml), '+(s.amioCentral?'wkłucie centralne':'obwodowo')+'; koniec o '+hhmm(end).slice(0,5),{drug:'amiodaron wlew',dose:d.rem+' mg/24 h'});
   this.say(amioDripSay(d.rem,this.dropSet,s.amioCentral));this.ask('infGo','Powiedz: tak, gdy kroplówka ruszy.',{def:'skip',tries:2,prio:1,data:'Amiodaron'});return}
  const now=this.now(),c=amioCalc(s.amioGiven,s.amioCentral),end=now+24*3600*1000;s.infs.amio=Object.assign({given:s.amioGiven,central:s.amioCentral,end},c);
  this.log('lek','Amiodaron wlew: podano w RKO '+s.amioGiven+' mg, pozostało '+c.rem+' mg/24 h = '+fmt1(c.mgh)+' mg/h; 900 mg w '+c.vol+' ml glukozy 5% ('+(s.amioCentral?'wkłucie centralne':'obwodowo')+'): '+fmt1(c.mlh)+' ml/h; koniec o '+hhmm(end).slice(0,5),{drug:'amiodaron wlew',dose:c.rem+' mg/24 h',mlh:c.mlh});
  this.say(amioSay(s.amioCentral,c.mlh));this.ask('infGo','Powiedz: tak, gdy pompa ruszy.',{def:'skip',tries:2,prio:1,data:'Amiodaron'})}};
P.setKg=function(kg){const s=this.s;s.kg=kg;s.kgAssumed=false;this.log('masa','Korekta masy ciała: '+kg+' kg');this.say(SAY.logged+' '+kg+' kilogramów.','ack');
 if(s.nora){s.nora.mlh=noraMlh(s.nora.dose,kg,s.syr);this.say('Noradrenalina. '+SAY.setPump+' '+flowPhrase(s.nora.mlh)+'.')}
 if(s.dobu){s.dobu.mlh=dobuMlh(s.dobu.dose,kg);this.say('Dobutamina. '+SAY.setPump+' '+flowPhrase(s.dobu.mlh)+'.')}
 if(s.binf&&BINF[s.binf.d].unit==='kgmin'){s.binf.mlh=binfMlh(s.binf.d,s.binf.dose,kg,this.conc);this.say('Dopamina. '+SAY.setPump+' '+flowPhrase(s.binf.mlh)+'.')}};
P.startBrady=function(){this.log('bradykardia','Bradykardia – ścieżka ERC 2025');this.ask('bradySigns',SAY.bradySigns,{prio:2,def:'yes',tries:2})};
P.startBinf=function(d){const s=this.s;if(BINF[d].unit==='kgmin'&&!s.kg){s.binfPending=d;this.ask('weight',SAY.weight,{prio:2});return}s.binfPending=null;
 const c=binfConc(d,this.conc),dose=c.start,mlh=binfMlh(d,dose,s.kg,this.conc);s.binf={d,dose,mlh};
 this.log('lek',c.name+' '+c.mg+' mg/'+c.ml+' ml: '+fmt1(mlh)+' ml/h = '+String(dose).replace('.',',')+(c.unit==='kgmin'?' µg/kg/min':' µg/min'),{drug:c.name,dose:String(dose).replace('.',',')+(c.unit==='kgmin'?' µg/kg/min':' µg/min'),mlh});
 this.say(binfPrep(d,this.conc,this.sayConc)+' '+SAY.setPump+' '+flowPhrase(mlh)+'.');this.ask('binfGo','Powiedz: tak, gdy pompa ruszy.',{def:'skip',tries:2,prio:1});s.bphase='binf'};
P.bDecide=function(){const s=this.s,a=s.bAss||{};const ok=a.hr!=null&&a.hr>60&&a.sbp!=null&&a.sbp>90&&a.res;
 if(ok){if(s.bphase==='binf'&&s.binf){this.say(SAY.keepPump+' '+flowPhrase(s.binf.mlh)+'.');s.bNext=this.now()+BINT[s.binf.d]}else{this.say(SAY.bKeepAtro);s.bNext=this.now()+3*60*MS}return}
 if(s.bphase==='binf'&&s.binf)this.binfUp(true);else if(s.atropine<3-1e-9){s.bNext=null;this.ask('atro',atroNext(this.atroDose,this.atroAmp),{prio:2})}};
P.binfSet=function(mlh,dose){const s=this.s,b=s.binf,c=binfConc(b.d,this.conc);b.mlh=r1(mlh);b.dose=dose!=null?dose:Math.round(b.mlh*c.conc/60*100)/100;
 const u=c.unit==='kgmin'?' µg/kg/min':' µg/min';this.log('lek',c.name+' ↑ '+fmt1(b.mlh)+' ml/h = '+String(b.dose).replace('.',',')+u,{drug:c.name,dose:String(b.dose).replace('.',',')+u,mlh:b.mlh});this.say(SAY.upPump+' '+flowPhrase(b.mlh)+'.')};
P.binfUp=function(auto){const s=this.s,b=s.binf;s.bNext=this.now()+BINT[b.d];
 if(b.d==='iso'){if(auto&&b.mlh>=20){this.say(SAY.isoCap);return}if(b.mlh>=60){this.alarm('binf');this.say(SAY.adrMax,'alarm');if(!s.pacing){this.startPacing();s.pacing.cardio=true}return}this.binfSet(Math.min(b.mlh+3,auto?20:60));if(auto&&b.mlh>=20)this.say(SAY.isoCap);return}
 if(b.d==='adrinf'){if(b.mlh>=30){this.alarm('binf');this.say(SAY.adrMax,'alarm');this.log('alarm','Wlew adrenaliny na maksimum');if(!s.pacing){this.startPacing();s.pacing.cardio=true}return}this.binfSet(Math.min(b.mlh+3,30));return}
 if(b.d==='dopa'){if(b.dose>=10){this.say(SAY.dopaMax);this.log('bradykardia','Dopamina max – zmiana na wlew adrenaliny');this.startBinf('adrinf');return}const d=Math.min(10,b.dose+2);this.binfSet(binfMlh('dopa',d,s.kg,this.conc),d)}};
P.giveSed=function(f,ml){const s=this.s,d=s.sed||(s.sed={fent:0,mida:0});
 if(f){const was=d.fent*this.fentConc;d.fent=r1(d.fent+ml);const ug=Math.round(d.fent*this.fentConc);this.log('lek','Fentanyl '+fmt1(ml)+' ml = '+Math.round(ml*this.fentConc)+' µg (łącznie '+fmt1(d.fent)+' ml = '+ug+' µg)',{drug:'fentanyl',dose:Math.round(ml*this.fentConc)+' µg'});this.say(SAY.logged+' fentanyl.','ack');s.sedFentT=this.now()+4*60*MS;
  if(ug>100&&was<=100){this.alarm('fent');this.say(fentWarn(this),'alarm');this.log('alarm','Fentanyl łącznie >100 µg')}}
 else{const maxMl=5/this.midaConc;const ok=Math.max(0,Math.min(ml,r1(maxMl-d.mida)));d.mida=r1(d.mida+ok);this.log('lek','Midazolam '+fmt1(ok)+' ml = '+fmt1(ok*this.midaConc)+' mg (łącznie '+fmt1(d.mida)+' ml = '+fmt1(d.mida*this.midaConc)+' mg)',{drug:'midazolam',dose:fmt1(ok*this.midaConc)+' mg'});
  if(d.mida*this.midaConc>=5-1e-9){s.sedMidaT=null;this.say(SAY.midaMax)}else{this.say(SAY.logged+' midazolam.','ack');s.sedMidaT=this.now()+150*MS}}};
P.startPacing=function(){const s=this.s;s.pacing={mA:null,capture:null,el:this.paceEl,t:this.now()};this.log('stymulacja','Stymulacja przezskórna – elektrody '+(this.paceEl==='al'?'przednio-boczne':'przednio-tylne'));
 this.ask('pace1',this.paceEl==='al'?SAY.pace1al:SAY.pace1ap,{prio:2,def:'go',tries:Infinity})};
function insText(){return 'Wbij pen z insuliną Novorapid do portu kroplówki i wstrzyknij 10 jednostek.'}
const HK_GLU=[30,60,90,120,180,240,300,360];
P.hkStart=function(){const s=this.s;s.hk={arrest:s.mode==='arrest',glu:[],k:[],gi:0};this.log('hiperkaliemia','Moduł insulina + glukoza'+(s.mode==='arrest'?' (NZK)':''));
 if(s.mode==='arrest')this.ask('gluPre',SAY.gluPre,{prio:2,def:'skip',tries:1});else this.ask('hkEcg',SAY.hkEcg,{prio:2})};
P.hkGive=function(){const s=this.s,h=s.hk;h.proph=h.pre!=null&&h.pre<126;let t=insText()+' '+(h.arrest?SAY.hkArrest:SAY.hkOut);if(h.proph)t+=' '+(this.amioMode==='pump'?SAY.hkProphPump:SAY.hkProphDrip);
 this.say(t);this.ask('insGo',SAY.insGo,{prio:2,def:'skip',tries:2})};
P.hkStarted=function(){const s=this.s,h=s.hk,now=this.now();h.t0=now;h.kDue=now+60*60*1000;
 this.log('lek','Insulina Novorapid 10 j. (pen do portu kroplówki – praktyka lokalna, DO WERYFIKACJI) i.v. + glukoza 10% 250 ml (25 g) '+(h.arrest?'pełnym strumieniem (NZK)':'przez 15 min')+(h.proph?'; profilaktyka: glukoza 10% '+(this.amioMode==='pump'?'50 ml/h':'17 kropli/min')+' przez 5 h (glikemia przed <126 mg/dl)':''),{drug:'insulina+glukoza',dose:'10 j. / 25 g'})};
P.htTreat=function(i){const n=HT[i][0];if(n==='hiperkaliemia'){this.ask('calcium',SAY.calcium);this.hkStart();this.ask('bicarbQ',SAY.bicarbQ,{def:'no',tries:1})}
 if(n==='hipoglikemia')this.ask('glucose',SAY.glucose);if(n==='hipomagnezemia')this.ask('mag',SAY.mag);
 if(n==='zatorowość płucna')this.ask('lysis',SAY.lysis);if(n==='zawał')this.log('4H4T','Zawał – PCI do rozważenia');if(n==='toksyny')this.ask('ccb','Czy zatrucie blokerami kanału wapniowego?',{def:'no',tries:1});
 if(this.s.sim&&this.s.simCause===n)this.s.simTreated=true};
// wejście z mowy/przycisku
P.ctx=function(){const s=this.s,c=s&&s.cur;return {rhythm:!!(s&&s.mode==='arrest'&&c&&['rhythm','rhyAsy','pulse'].includes(c.id)),confirm:!!c}};
P.input=function(alts,src){const r0=interpret(alts,this.ctx());this._ack=r0.cmd==='ack';this._ackSaid=false;const s=this.s;const snap=s&&s.mode!=='idle'&&s.mode!=='ended'?JSON.stringify(s):null;const n0=s&&s.log?s.log.length:0;this._src=src||null;
 try{const res=this._input(alts);const s2=this.s;if(snap&&s2&&s2.log&&s2.log.length>n0&&res!=='unmatched'){const last=s2.log[s2.log.length-1];this.undoSnap={json:snap,t:this.now(),label:last.txt}}this.persist(this.s);return res}finally{this._ack=false;this._src=null}};
// COFNIJ: 5 s po każdym potwierdzeniu
P.canUndo=function(){return !!(this.undoSnap&&this.now()-this.undoSnap.t<=5*MS&&this.s&&this.s.mode!=='ended')};
P.undo=function(){if(!this.canUndo())return false;const u=this.undoSnap;this.undoSnap=null;this.s=JSON.parse(u.json);this.log('cofnięto','COFNIĘTO: '+u.label);this.say(SAY.undone,'ack');if(this.s.cur){this.s.cur.at=this.now();this.s.cur.t0=this.now()}this.pump();this.persist(this.s);return true};
// wznowienie po zabiciu aplikacji – z oczekującym pytaniem klinicznym
P.resume=function(st){this.s=st;const s=st,now=this.now();const keep=['rhythm','rhyAsy','pulse','shock','adr','amio','roscRhy','roscAf','team'];s.q=(s.q||[]).filter(q=>keep.includes(q.id));if(s.cur&&!keep.includes(s.cur.id))s.cur=null;if(s.cur){s.cur.at=now;s.cur.t0=now}s.paused=false;s.resumed=(s.resumed||0)+1;this.log('wznowienie','Wznowiono po przerwie aplikacji');this.say('Wznawiam.','ack');if(s.cur)this.say(s.cur.text,'ask');else this.pump();this.persist(s)};
P._input=function(alts){const s=this.s;const r=interpret(alts,this.ctx());s.heard=r.text;
 if(s.mode==='idle'||s.mode==='ended'){if(r.cmd==='replay')this.replay();if(r.cmd==='send')return 'send';return r.cmd}
 // komendy globalne
 switch(r.cmd){
 case 'replay':this.replay();return r.cmd;
 case 'pace':if(s.mode==='arrest'){s.cprPace=true;this.log('stymulacja','RKO ze stymulacją (asystolia z załamkami P / blok całkowity) – DO WERYFIKACJI');this.say(SAY.cprPace+', '+this.paceMax+' miliamperów. '+SAY.cprPace2);return r.cmd}this.startPacing();return r.cmd;
 case 'adrinf':if(!this.full){this.say(SAY.fullOnly);return r.cmd}if(s.mode==='arrest'){this.say(SAY.adrinfArrest);return r.cmd}if(!(s.cur&&s.cur.id==='bradyDrug')){this.ask('adrinfQ',SAY.adrinfQ,{prio:2,def:'no',tries:1});return r.cmd}break;
 case 'hepinf':if(!this.full){this.say(SAY.fullOnly);return r.cmd}if(s.mode==='arrest'){this.say(SAY.hepNoInf);return r.cmd}{this.ask('hepQ',SAY.hepQ,{prio:1});return r.cmd}break;
 case 'amioinf':if(!this.full){this.say(SAY.fullOnly);return r.cmd}if(s.mode!=='arrest'){this.startInf('amio');return r.cmd}break;
 case 'kg':if(r.num!=null&&!(s.cur&&s.cur.id==='weight')&&r.num>=20&&r.num<=250){this.setKg(r.num);return r.cmd}break;
 case 'down':if(s.nora&&s.mode!=='arrest'){this.noraDown();return r.cmd}break;
 case 'alone':s.aloneT=this.now();this.log('ucisk','Brak drugiej osoby do ucisku – instrukcja, licznik przerwy 5 s');this.say(SAY.alone,'ack');return r.cmd;
 case 'rko_od':if(r.num!=null&&r.num>=0&&r.num<=300){this.setZrm(r.num);if(s.cur&&s.cur.id==='mins')this.answer(s.cur,r);return r.cmd}break;
 case 'decide':if(!this.full){this.say(SAY.fullOnly);return r.cmd}if(s.mode==='arrest'){this.decSummary();return r.cmd}break;
 case 'hyperk':if(!this.full){this.say(SAY.fullOnly);return r.cmd}if(!(s.cur&&s.cur.id==='ht')){this.hkStart();return r.cmd}break;
 case 'lucas_off':if(s.mode==='arrest'){this.lucasOff();return r.cmd}break;
 case 'lucas_on':if(s.mode==='arrest'){this.lucasOn();return r.cmd}break;
 case 'pause':s.paused=true;this.say(SAY.paused);return r.cmd;
 case 'end':s.endAsk=true;this.ask('endQ',SAY.endQ,{prio:3,def:'cancel',tries:2});return r.cmd;
 case 'zakoncz_tak':if(s.mode==='arrest')this.log('decyzja','Kierujący: ZAKOŃCZENIE RKO o '+hhmm(this.now()));this.finish();return r.cmd;
 case 'send':return 'send';
 case 'usg':this.log('POCUS','USG przy łóżku');this.say(SAY.usg,'ack');this.ask('usgRes',SAY.usgRes,{def:'skip',tries:1});return r.cmd;
 case 'intub':if(!(s.cur&&s.cur.id==='intubQ')){s.intub=this.now();s.airway='intubacja (wideolaryngoskop)';this.drop('intubQ');this.log('drogi oddechowe','Intubacja – potwierdzić kapnografią');this.say(SAY.intubDone);this.ask('tube',SAY.tube,{def:'skip',tries:1});return r.cmd}break;
 case 'rosc':if(s.mode!=='rosc'){this.toRosc();return r.cmd}break;
 case 'arrest':if(s.mode==='rosc'){this.toArrest();return r.cmd}break;
 case 'shock_done':if(!(s.cur&&s.cur.id==='shock')&&s.mode==='arrest'){this.shockDone();return r.cmd}break;
 case 'adr':if(!(s.cur&&s.cur.id==='adr')){this.giveAdr();return r.cmd}break;
 case 'amio':case 'lido':if(!(s.cur&&s.cur.id==='amio')){this.giveAmio(r.cmd==='lido');return r.cmd}break;
 case 'bicarb':this.ask('bicarbQ',SAY.bicarbQ,{prio:1,def:'no',tries:1});return r.cmd;
 case 'brady':if(s.mode==='arrest'&&!(s.cur&&s.cur.id==='rhythm')){this.onRhythmCmd('brady');return r.cmd}if(s.mode!=='arrest'){this.startBrady();return r.cmd}break;
 case 'change':if(s.sim){this.simForce();return r.cmd}break;
 case 'up':case 'keep':{if(s.cur&&['sys','dia','bSym','paceCap','which'].includes(s.cur.id))break;const act=this.titratable();if(!act.length)break;if(act.length>1){this.ask('which',SAY.which,{prio:2,data:r.cmd});return r.cmd}this.titrate(act[0],r.cmd);return r.cmd}
 case 'shockable':case 'nonshock':case 'nopulse':case 'organised':case 'pulse':if(s.mode==='arrest'&&!(s.cur&&['rhythm','pulse','shock'].includes(s.cur.id))){if(!s.offStart)s.offStart=this.now();this.onRhythmCmd(r.cmd);return r.cmd}break;
 }
 if(s.paused&&(r.cmd==='next'||r.cmd==='yes')){s.paused=false;this.say(SAY.resumed);this.pump();return 'resume'}
 const c=s.cur;if(!c){return r.cmd}
 let ok=this.answer(c,r);
 // v1.9.1: NIE zawsze zamyka pytanie TAK/NIE (zapis w raporcie), nigdy „nie rozpoznano”
 if(!ok&&r.cmd==='no'&&/\?/.test(c.text)){this.log('odpowiedź','NIE – '+c.text.replace(/\s+/g,' ').slice(0,70));ok=true}
 // rytm po ROSC jest opcjonalny: liczba (np. ciśnienie) zamyka pytanie i trafia do kolejnego
 if(!ok&&c.id==='roscRhy'&&(r.num!=null||r.cmd==='next'||r.cmd==='no')){this.log('rytm','Rytm po ROSC: nie podano');s.cur=null;this.pump();if(r.num!=null&&s.cur){const c2=s.cur;if(this.answer(c2,r)){if(s.cur===c2)s.cur=null;this.pump()}}return r.cmd}
 if(ok){s.unmatched=null;if(s.cur===c)s.cur=null;this.pump()}else{c.at=this.now();s.unmatched=r.text||'';return 'unmatched'}
 return r.cmd};
P.replay=function(){const s=this.s;const t=s.cur?s.cur.text:s.last;if(t)this.out(t,'replay');else this.out(SAY.nothing,'replay')};
P.toRosc=function(){const s=this.s,now=this.now();s.mode='rosc';s.rosc.push(now);s.q=s.q.filter(q=>['hepRoscQ','weight','syr','spo2','ekg','stemi','temp','glu','gcs','tube','usgRes'].includes(q.id));s.cur=null;if(s.hepAfterRosc)this.ask('hepRoscQ',SAY.hepRosc,{prio:1,def:'no',tries:2});
 this.log('ROSC','Powrót spontanicznego krążenia');if(!this.full){this.say(SAY.roscDemo);this.say(SAY.fullOnly);{const pr=roscRhyOf(s.preRosc||'');s.preRosc=null;if(pr)this.setRoscRhy(pr);else this.ask('roscRhy',SAY.roscRhy,{prio:3,def:'skip',tries:2})}return}this.say(SAY.rosc);this.ask('sys',SAY.sys,{prio:0});
 {const pr=roscRhyOf(s.preRosc||'');s.preRosc=null;if(pr)this.setRoscRhy(pr);else this.ask('roscRhy',SAY.roscRhy,{prio:3,def:'skip',tries:2})}
 if(!s.post.spo2)this.ask('spo2',SAY.spo2,{def:'skip',tries:2});if(!s.post.ekg)this.ask('ekg',SAY.ekg,{def:'skip',tries:2});if(!s.post.temp)this.ask('temp',SAY.temp,{def:'skip',tries:2});if(s.post.glu==null)this.ask('glu',SAY.glu,{def:'skip',tries:2});if(s.post.gcs==null)this.ask('gcs',SAY.gcs,{def:'skip',tries:2})};
function roscRhyOf(t){t=norm(t);if(!t)return null;if(/bradykard/.test(t))return 'bradykardia';if(/przedsionk|\baf\b|\ba ef\b|bezwzgledn|niemiarow|trzepotan/.test(t))return 'migotanie przedsionków';if(/zatok|sinus/.test(t))return 'zatokowy';
 if(/nadkomor|wezlow|inny|inna|zorganizowany/.test(t))return /nadkomor/.test(t)?'nadkomorowy':/wezlow/.test(t)?'węzłowy':'inny';const w=t.split(' ');if(w.some(x=>lev(x,'zatokowy')<=1||lev(x,'zatoka')<=1))return 'zatokowy';if(w.some(x=>lev(x,'przedsionkow')<=2))return 'migotanie przedsionków';return null}
P.setRoscRhy=function(v){const s=this.s;s.roscRhythm=v;this.log('rytm','Rytm po ROSC: '+v)};
P.toArrest=function(quiet){const s=this.s;s.mode='arrest';s.q=[];s.cur=null;s.nextMap=null;s.bNext=null;s.sedFentT=null;s.sedMidaT=null;s.epShocks=0;s.adrHold=true;s.rhythm='?';this.log('NZK','Ponowne zatrzymanie krążenia');s.cycleT=this.now();s.warned=false;if(!quiet)this.say(SAY.rearrest);
 s.offStart=this.now();this.ask('rhythm',SAY.rhythm,{prio:2})};
// pętla MAP (stała, co 5 min)
P.onMap=function(m,sy,di){const s=this.s;s.lastMap=m;this.log('ciśnienie',sy+'/'+di+' mmHg, MAP '+m,{map:m});s.nextMap=this.now()+MAPI;
 const pre=SAY.mapIs+' '+m+'.';
 if(m<65){s.mapHiN=0;if(!s.nora){this.say(pre);this.startNora()}else{this.say(pre);this.noraUp()}}
 else{if(s.nora&&m>80){s.mapHiN=(s.mapHiN||0)+1;if(s.mapHiN>=2){s.mapHiN=0;this.log('ciśnienie','MAP >80 w dwóch kolejnych pomiarach');this.noraDown(pre+' '+SAY.mapHi2)}else this.say(pre+' '+SAY.mapHi1)}
  else if(s.nora){s.mapHiN=0;this.say(pre+' '+SAY.mapKeep)}else this.say(pre);
  if(!s.dobu&&!s.dobuAsked)this.ask('lowOut',SAY.lowOut,{def:'no',tries:1})}};
P.startNora=function(){const s=this.s;s.noraPending=true;this.contNora()};
P.contNora=function(){const s=this.s;if(s.noraPending){if(!s.kg){this.ask('weight',SAY.weight,{prio:1});return}
 if(!s.syr){this.ask('syr',SAY.syr,{prio:1,def:50,tries:1});return}
 s.noraPending=false;const dose=.05,mlh=noraMlh(dose,s.kg,s.syr);s.nora={dose,mlh};
 this.log('lek','Noradrenalina '+NORA[s.syr].mg+' mg/'+NORA[s.syr].ml+' ml: '+fmt1(mlh)+' ml/h = 0,05 µg/kg/min',{drug:'noradrenalina',dose:'0,05 µg/kg/min',mlh});
 this.say((s.syr===20?SAY.noraPrep20:SAY.noraPrep50)+' '+SAY.setPump+' '+flowPhrase(mlh)+'.');this.ask('noraGo','Powiedz: tak, gdy pompa ruszy.',{def:'skip',tries:2,prio:1})}
 if(s.dobuPending){if(!s.kg){this.ask('weight',SAY.weight,{prio:1});return}this.startDobu()}};
P.noraUp=function(){const s=this.s;const d=r1(s.nora.dose*100+5)/100;s.nora.dose=Math.round(d*100)/100;s.nora.mlh=noraMlh(s.nora.dose,s.kg,s.syr);
 this.log('lek','Noradrenalina ↑ '+fmt1(s.nora.mlh)+' ml/h = '+String(s.nora.dose).replace('.',',')+' µg/kg/min',{drug:'noradrenalina',dose:String(s.nora.dose).replace('.',',')+' µg/kg/min',mlh:s.nora.mlh});
 this.say(SAY.upPump+' '+flowPhrase(s.nora.mlh)+'.');
 if(s.nora.dose>=.3-1e-9){this.alarm('nora');this.say(SAY.noraHigh,'alarm');this.log('alarm','Noradrenalina ≥0,3 µg/kg/min – wezwać anestezjologa')}};
P.startDobu=function(){const s=this.s;if(!s.kg){s.dobuPending=true;this.ask('weight',SAY.weight,{prio:1});return}s.dobuPending=false;
 const mlh=dobuMlh(2.5,s.kg);s.dobu={dose:2.5,mlh,t:this.now()};this.log('lek','Dobutamina 250 mg/50 ml: '+fmt1(mlh)+' ml/h = 2,5 µg/kg/min',{drug:'dobutamina',dose:'2,5 µg/kg/min',mlh});
 this.say(SAY.dobuPrep+' '+SAY.setPump+' '+flowPhrase(mlh)+'.');this.ask('dobuGo','Powiedz: tak, gdy pompa ruszy.',{def:'skip',tries:2,prio:1})};
P.finish=function(){const s=this.s;if(s.mode==='ended')return;if(s.offStart){s.handsOff+=(this.now()-s.offStart)/MS;s.offStart=null}
 s.endPrevMode=s.mode;s.mode='ended';s.tEnd=this.now();s.q=[];s.cur=null;this.log('koniec','Zakończenie: '+(s.endPrevMode==='rosc'?'ROSC':'bez ROSC'));
 if(s.sim)s.summary=this.simSummary();this.say(SAY.ended+(s.sim?' '+s.summary.speech:''))};
// ---------- symulacja ----------
const SIMR=['VF','pVT','asystolia','PEA'],SIMC=['hiperkaliemia','zatorowość płucna','tamponada','hipowolemia','hipoksja','toksyny'];
P.simInit=function(){const s=this.s,R=this.rand;s.simPt={age:25+Math.floor(R()*60),kg:50+Math.floor(R()*8)*10,scen:R()<.5?'SOR':'przywieziony'};
 s.simRhythm=SIMR[Math.floor(R()*4)];s.simCause=SIMC[Math.floor(R()*SIMC.length)];s.simTreated=false;s.simBP=null;
 s.kg=s.kg||s.simPt.kg;this.log('symulacja','Pacjent: '+s.simPt.age+' lat, '+s.simPt.kg+' kg, '+s.simPt.scen+', rytm '+s.simRhythm+', przyczyna: '+s.simCause)};
P.simShow=function(){const s=this.s;s.simEvents=(s.simEvents||0)+1;
 const shockable=s.simRhythm==='VF'||s.simRhythm==='pVT';const R=this.rand();
 let p=.05;if(shockable&&s.shocks>=3&&(s.amio||s.lido))p+=.25;if(s.simTreated)p+=.35;if(!shockable&&s.adr.length)p+=.1;
 if(R<p){s.simRhythm='ROSC';this.say('Symulacja: na monitorze rytm zatokowy, wyczuwalne tętno.','sim');this.log('symulacja','Monitor: rytm z tętnem');return}
 if(R>.85)s.simRhythm=SIMR[Math.floor(this.rand()*4)];this.say('Symulacja: na monitorze '+s.simRhythm+'.','sim');this.log('symulacja','Monitor: '+s.simRhythm)};
P.simAfterShock=function(){};P.simForce=function(){const s=this.s;s.simRhythm=SIMR[(SIMR.indexOf(s.simRhythm)+1)%4];this.say('Symulacja: zmiana rytmu. Na monitorze '+s.simRhythm+'.','sim');this.log('symulacja','Instruktor: zmiana rytmu na '+s.simRhythm)};
P.simSummary=function(){const s=this.s,L=s.log,good=[],late=[],miss=[];const t0=s.t0;
 const rh=L.filter(e=>e.type==='rytm'&&e.shockable),sh=L.filter(e=>e.type==='wyładowanie'&&e.n);
 if(rh.length&&sh.length){const dt=(sh[0].t-rh[0].t)/MS;(dt<=120?good:late).push('Pierwsze wyładowanie po '+Math.round(dt)+' s od rozpoznania rytmu')}
 good.push('Ucisk od startu (komunikat w 0 s)');
 const a=s.adr;for(let i=1;i<a.length;i++){const m=(a[i]-a[i-1])/60000;if(m>5.5)late.push('Adrenalina po '+m.toFixed(1)+' min (zalecane 3–5)')}
 if(a.length)good.push('Adrenalina podana '+a.length+'×');else miss.push('Brak adrenaliny');
 if(s.shocks>=3&&!(s.amio||s.lido))miss.push('Brak amiodaronu/lidokainy po 3. wyładowaniu');
 if(s.ht[s.simCause]==='✓')good.push('Rozpoznano przyczynę: '+s.simCause);else miss.push('Nie leczono przyczyny: '+s.simCause);
 if(!s.intub&&s.airway.indexOf('nadgłośniowy')<0)miss.push('Brak zabezpieczenia dróg oddechowych');if(!s.etco2.length)miss.push(s.etco2Avail===false?'Kapnografia niedostępna (nie używana)':'Brak kapnografii');
 if(s.handsOff/Math.max(1,s.cycles)>10)late.push('Średnia przerwa w ucisku '+(s.handsOff/Math.max(1,s.cycles)).toFixed(0)+' s (cel <5–10 s)');
 const speech='Podsumowanie symulacji. Dobrze: '+good.length+'. Spóźnione: '+late.length+'. Pominięte: '+miss.length+'. Szczegóły na ekranie.';
 return {good,late,miss,speech,handsOff:Math.round(s.handsOff),shocks:s.shocks}};
// ---------- raport ----------
function hhmm(t){const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0')}
function report(s){const L=s.log||[],end=s.tEnd||Date.now();const dur=Math.round((end-s.arrestT)/60000);
 const drugs=L.filter(e=>e.type==='lek').map(e=>[hhmm(e.t),e.txt]);
 const sum=[['Tryb',s.sim?'SYMULACJA – nie do dokumentacji pacjenta':'Rzeczywisty'],['Scenariusz',s.scen||'SOR'],['Godzina NZK',hhmm(s.arrestT)],['Start prowadzenia',hhmm(s.t0)],
  ['ROSC',s.rosc.length?s.rosc.map(hhmm).join(', ')+(s.roscRhythm?' – rytm: '+s.roscRhythm:''):'nie'],['Rytm po ROSC',s.roscRhythm||(s.rosc.length?'—':'nie dotyczy')],['Rytm początkowy',s.initRhythm||'—'],['Zakończenie',s.tEnd?hhmm(s.tEnd):'w toku'],['Czas RKO',dur+' min'],
  ['Wyładowania',String(s.shocks)],['Adrenalina',s.adr.length+' × 1 mg'],['Amiodaron / lidokaina',s.amio+' / '+s.lido],
  ['Przerwy w ucisku (szac.)',Math.round(s.handsOff)+' s łącznie, najdłuższa '+Math.round(s.maxOff)+' s'],['Przerwy LUCAS',s.lucasN?(s.lucasN+'×, łącznie '+Math.round(s.lucasOffT)+' s'):'–'],['Drogi oddechowe',s.airway+(s.tube?', rurka nr '+fmt1(s.tube):'')],['POCUS',s.usgRes||'—'],
  ['EtCO₂',s.etco2.length?s.etco2.map(e=>e.v).join(', ')+' mmHg':s.etco2Avail===false?'nie mierzono (brak kapnografii)':'brak danych'],
  ['Noradrenalina',s.nora?fmt1(s.nora.mlh)+' ml/h ('+String(s.nora.dose).replace('.',',')+' µg/kg/min), '+NORA[s.syr].mg+' mg/'+NORA[s.syr].ml+' ml':'nie'],
  ['Dobutamina',s.dobu?fmt1(s.dobu.mlh)+' ml/h ('+fmt1(s.dobu.dose)+' µg/kg/min), 250 mg/50 ml':'nie'],['Masa ciała',s.kg?s.kg+' kg':'—'],
  ['Ostatnie ciśnienie średnie',s.lastMap!=null?s.lastMap+' mmHg':'—'],['SpO₂',s.post.spo2!=null?s.post.spo2+'%':'—'],['EKG 12-odpr. / STEMI',(s.post.ekg||'—')+' / '+(s.post.stemi||'—')],['Bradykardia – leki',s.atropine?'atropina '+fmt1(s.atropine)+' mg ('+(s.atroN||0)+' dawek)':'—'],['Wlew w bradykardii',s.binf?BINF[s.binf.d].name+' '+fmt1(s.binf.mlh)+' ml/h ('+String(s.binf.dose).replace('.',',')+(BINF[s.binf.d].unit==='kgmin'?' µg/kg/min':' µg/min')+')':'nie'],['Stymulacja przezskórna',s.cprPace&&!s.pacing?'w trakcie RKO (załamki P bez QRS), prąd maksymalny, 70/min':s.pacing?(s.pacing.capture?'wychwyt '+s.pacing.capture+' mA, ustawione '+s.pacing.mA+' mA, 70/min':'bez wychwytu ('+(s.pacing.mA||'—')+' mA)')+', elektrody '+(s.pacing.el==='al'?'przednio-boczne':'przednio-tylne'):'nie'],['Analgosedacja',s.sed?'fentanyl '+fmt1(s.sed.fent)+' ml ('+Math.round(s.sed.fent*(s.fentConc||50))+' µg, '+(s.fentConc||50)+' µg/ml), midazolam '+fmt1(s.sed.mida)+' ml ('+fmt1(s.sed.mida*(s.midaConc||1))+' mg, '+fmt1(s.midaConc||1)+' mg/ml)':'nie'],['Temperatura',s.post.temp!=null?s.post.temp+' °C':'—'],['Glikemia',s.post.glu!=null?s.post.glu+' mg/dl':'—'],['GCS',s.post.gcs!=null?String(s.post.gcs):'—'],['Masa ciała – źródło',s.kgAssumed?'PRZYJĘTA 70 kg (nieznana)':s.kg?'podana':'—'],['Czas RKO: ZRM / SOR / całkowity',(s.zrmMin!=null?s.zrmMin+' min':'—')+' / '+Math.floor(((s.tEnd||s.nowT||Date.now())-s.t0)/60000)+' min / '+Math.floor(((s.tEnd||s.nowT||Date.now())-s.arrestT)/60000)+' min'],['Decyzja – dane',(s.initRhythm?'rytm początkowy: '+s.initRhythm:'rytm początkowy: —')+'; ETCO2: '+(s.etco2.map(e=>hhmm(e.t).slice(0,5)+' '+e.v).join(', ')||'—')+'; POCUS: '+((s.pocus||[]).map(e=>hhmm(e.t).slice(0,5)+' '+e.v).join(', ')||'—')+'; decyzje kierującego: '+(s.log.filter(e=>e.type==='decyzja'&&/Kierujący|Wyjątek/.test(e.txt)).map(e=>hhmm(e.t).slice(0,5)+' '+e.txt).join('; ')||'—')+'. ETCO2 i POCUS same w sobie nie wystarczają do decyzji o zakończeniu RKO (ERC 2025). Lektor nie rekomenduje zakończenia – decyzja należy do kierującego.'],['Hiperkaliemia – insulina/glukoza',s.hk&&s.hk.t0?('insulina Novorapid 10 j. penem do portu kroplówki – praktyka lokalna; ChPL NovoRapid dopuszcza podanie dożylne tylko z fiolki – DO WERYFIKACJI + glukoza 10% 250 ml (25 g) o '+hhmm(s.hk.t0).slice(0,5)+(s.hk.arrest?' (NZK, pełny strumień)':' (15 min)')+'; glikemia przed: '+(s.hk.pre!=null?s.hk.pre+' mg/dl':'nieznana')+(s.hk.proph?'; profilaktyka hipoglikemii G10% 5 h':'')+'; glikemie: '+(s.hk.glu.map(g=>hhmm(g.t).slice(0,5)+' '+g.v).join(', ')||'—')+'; potas: '+(s.hk.k.map(g=>hhmm(g.t).slice(0,5)+' '+fmt1(g.v)).join(', ')||'—')+'. Uwaga: lektor celowo podaje jednostki insuliny i mililitry (wyjątek od zasady „tylko ml” – bezpieczeństwo).'):'—'],['Heparyna – bezpieczeństwo',s.hepGateTxt||'—'],['Heparyna',s.infs&&s.infs.hep?((s.infs.hep.noBolus?'bez bolusu (trwający wlew – reguła lokalna użytkownika)':'bolus '+(s.infs.hep.half?'POŁOWA (reguła lokalna użytkownika) ':'')+s.infs.hep.bu+' j. ('+fmt2(s.infs.hep.bml)+' ml)')+(s.infs.hep.aptt?'; wlew '+s.infs.hep.rate+' j./h = '+HEPR[s.infs.hep.ind]+' j./kg/h'+(s.infs.hep.rate<HEPR[s.infs.hep.ind]*s.kg?' (limit '+HEPRMAX[s.infs.hep.ind]+' j./h)':'')+', '+fmt1(s.infs.hep.mlh)+' ml/h; APTT o '+hhmm(s.infs.hep.aptt).slice(0,5):'; wlew – po ROSC')+' ('+(s.infs.hep.ind==='pe'?'zatorowość płucna':'OZW')+')'):'—'],['Amiodaron wlew',s.infs&&s.infs.amio&&s.infs.amio.drip?('kroplówka: podano w RKO '+s.infs.amio.given+' mg; pozostało '+s.infs.amio.rem+' mg w 500 ml glukozy 5% ('+fmt1(s.infs.amio.conc)+' mg/ml) = '+fmt1(s.infs.amio.mgh)+' mg/h; '+s.infs.amio.dpm+' kropli/min (zestaw '+s.infs.amio.set+' kropli/ml); '+(s.infs.amio.central?'centralnie':'obwodowo')+'; koniec o '+hhmm(s.infs.amio.end).slice(0,5)):s.infs&&s.infs.amio?('podano w RKO '+s.infs.amio.given+' mg; pozostało '+s.infs.amio.rem+' mg/24 h = '+fmt1(s.infs.amio.mgh)+' mg/h; '+fmt1(s.infs.amio.mlh)+' ml/h (900 mg/'+s.infs.amio.vol+' ml glukozy 5%, '+(s.infs.amio.central?'centralnie':'obwodowo')+'); koniec o '+hhmm(s.infs.amio.end).slice(0,5)):'nie']];
 const ht=HT.map(h=>[h[0],s.ht[h[0]]||'–']);
 return {sum,drugs,ht,timeline:L.map(e=>[hhmm(e.t),e.type,e.txt+(e.src?' ('+e.src+')':'')]),wywiad:s.wywiad||'',missing:sum.filter(x=>x[1]==='—').map(x=>x[0])}}
// lista wszystkich stałych komunikatów (do generowania nagrań)
function staticPhrases(){const a=new Set(Object.values(SAY).filter(Boolean));Object.values(RHY_NAME).forEach(t=>a.add(t.trim()));a.add('Wznawiam.');HT.forEach((h,i)=>{a.add(h[1]);a.add(htQ(i))});
 ['Podaj','Powiedz: tak, gdy pompa ruszy.','Czy zatrucie blokerami kanału wapniowego?','Symulacja: na monitorze rytm zatokowy, wyczuwalne tętno.'].forEach(x=>a.add(x));
 Object.keys(ENERGY).concat(Object.keys(ENERGY_SEQ)).forEach(e=>{a.add(vfInstr(e));a.add(vfInstr(e,1));a.add(vfInstr(e,2))});
 for(let m=40;m<=200;m+=10)a.add(paceUp(m));[140,200].forEach(m=>a.add(SAY.cprPace+', '+m+' miliamperów.'));for(const d of [.5,1])for(const am of [.5,1]){a.add(atroText(d,am));a.add(atroNext(d,am))}const dO={};a.add('Cztery H sprawdzone.');a.add(SAY.lucasOff+' '+SAY.gas);a.add('Cztery T sprawdzone.');a.add(hepPrepText(25000,50));for(let m=15;m<=60;m+=5)a.add(minText(m));for(const ar of [SAY.hkArrest,SAY.hkOut])for(const p of ['',' '+SAY.hkProphDrip,' '+SAY.hkProphPump])a.add(insText()+' '+ar+p);for(let kg=40;kg<=150;kg++)for(const ind of ['pe','acs'])for(const f of [1,.5])a.add(hepBolusText(hepCalc(ind,kg,5000,25000,50,f).bml));a.add(SAY.hepNoInf);for(const g of [0,300,450])for(const c of [true,false])a.add(amioSay(c,amioCalc(g,c).mlh));[1,2,3].forEach(n=>a.add(amioConfText(n)));for(const g of [0,300,450])for(const st of [20,60])for(const c of [true,false])a.add(amioDripSay(900-g,st,c));['Noradrenalina.','Dobutamina.','Dopamina.','Zapisano: insulina z glukozą.','Zapisano: glukoza.','Zapisano: fentanyl.','Zapisano: midazolam.'].forEach(x=>a.add(x));a.add(sedText(dO));a.add(fentRepText(dO));a.add(midaRepText(dO));a.add(fentWarn(dO));['iso','dopa','adrinf'].forEach(d=>{a.add(binfPrep(d));a.add(binfPrep(d,{},false))});
 SIMR.forEach(r=>{a.add('Symulacja: na monitorze '+r+'.');a.add('Symulacja: zmiana rytmu. Na monitorze '+r+'.')});
 Object.values(SAY).forEach(t=>a.add(SAY.remind+' '+t));return [...a].filter(Boolean)}
// ---------- v1.8: przyciski kontekstowe do bieżącego kroku ----------
const B=(label,c,cls)=>({label,c,cls:cls||''});
const RHY=[B('VF','migotanie komór','r'),B('pVT','częstoskurcz bez tętna','r'),B('ASYSTOLIA','asystolia','a'),B('PEA','PEA','a'),B('TĘTNO','tętno','g')];
const BTN={rhythm:[B('TAK','tak','b'),B('NIE','nie','n')],
 roscRhy:[B('TAK','tak','b'),B('NIE','nie','n'),B('ZATOKOWY','zatokowy'),B('MIG. PRZEDS.','migotanie przedsionków'),B('INNY','inny')],
 roscAf:[B('TAK','tak','b'),B('NIE','nie','n')],rhyAsy:[B('TAK','tak','b'),B('NIE','nie','n')],pulse:[B('TAK – TĘTNO','tak','g'),B('NIE','nie','n')],
 shock:[B('WYŁADOWANO','wyładowano','r'),B('NIE','nie','n')],amio:[B('TAK – AMIODARON','tak','b'),B('LIDOKAINA','lidokaina podano'),B('NIE','nie','n')],
 ht:[B('TAK','tak','b'),B('NIE','nie','n'),B('DALEJ','dalej')],syr:[B('50 ml','50'),B('20 ml','20')],
 hepQ:[B('ZATOROWOŚĆ','zatorowość'),B('OZW','OZW')],acDrug:[B('DOAC','doac'),B('WARFARYNA','warfaryna'),B('HEPARYNA','heparyna'),B('NIE WIEM','nie wiem')],
 bradyDrug:[B('IZOPRENALINA','izoprenalina'),B('DOPAMINA','dopamina'),B('ADRENALINA WLEW','wlew adrenaliny')],which:[B('NORADRENALINA','noradrenalina'),B('DOBUTAMINA','dobutamina'),B('WLEW W BRADYKARDII','wlew')],
 decExc:[B('NIE – BRAK WYJĄTKÓW','nie'),B('HIPOTERMIA','hipotermia'),B('ZATRUCIE','zatrucie'),B('TROMBOLIZA','tromboliza'),B('ECPR','ecpr')],
 decEnd:[B('TAK, ZAKOŃCZ','tak, zakończ','r'),B('NIE – KONTYNUUJ','nie')],endQ:[B('TAK, ZAKOŃCZ','tak, zakończ','r'),B('NIE','nie','n')],
 pocusQ:[B('CZYNNOŚĆ OBECNA','jest czynność'),B('BRAK CZYNNOŚCI','brak czynności'),B('NIE WYKONANO','nie wykonano')],
 amioCvc:[B('CENTRALNIE','centralnie'),B('OBWODOWO','obwodowo')],amioCnt:[B('0','zero'),B('1 raz','jeden raz'),B('2 razy','dwa')],
 acQ:[B('TAK','tak','b'),B('NIE','nie','n'),B('NIE WIEM','nie wiem')],inrQ:[B('LICZBA','#num'),B('NIE WIEM','nie wiem')],hepLast:[B('LICZBA (h)','#num'),B('NIE WIEM','nie wiem')],gluPre:[B('LICZBA','#num'),B('NIE WIEM','nie wiem')],
 weight:[B('LICZBA (kg)','#num'),B('NIE WIEM','nie wiem')],usgRes:[B('POMIŃ','dalej')]};
const NUMQ=['etco2','sys','dia','spo2','temp','glu','gcs','tube','mins','zrmAdr','zrmShk','zrmAmio','hkGlu','hkK','fentGo','midaGo','fentRep','midaRep','bHR','bSBP'];
function rhyButtons(s){return s&&s.mode==='arrest'?RHY.slice():[]}
function buttonsFor(s){if(!s||s.mode==='idle'||s.mode==='ended')return [];const c=s.cur;
 if(!c){return s.mode==='arrest'?[]:[B('ZWIĘKSZ','zwiększ'),B('UTRZYMAJ','utrzymaj'),B('ZATRZYMANIE','zatrzymanie','r')]}
 if(BTN[c.id])return BTN[c.id].slice();
 if(NUMQ.includes(c.id))return [B('LICZBA','#num'),B('POMIŃ','dalej')];
 if(/\?/.test(c.text))return [B('TAK','tak','b'),B('NIE','nie','n')];
 return [B('TAK','tak','b')]}
// v1.9.4: przycisk oczekiwany teraz (pulsuje) – pierwszy przycisk bieżącego pytania
function expectedBtn(s){if(!s||!s.cur)return null;const L=buttonsFor(s);return L.length?L[0].c:null}
function btnKey(s){return s?(s.mode+'|'+(s.cur?s.cur.id+'|'+s.cur.text:'-')+'|'+(s.log?s.log.length:0)):''}
// stan wciśnięcia: kolor aktywny do przyjęcia komendy / zmiany kroku, maks. 900 ms bez zmiany – nigdy nie zostaje
function PressState(){this.key=null;this.act=null;this.t=0}
PressState.prototype.press=function(c,now){this.act=c;this.t=now};
PressState.prototype.sync=function(key,now){if(key!==this.key){this.key=key;this.act=null}else if(this.act!=null&&now-this.t>900)this.act=null;return this.act};
// v1.9: usuwanie danych osobowych przed wysłaniem do AI (PESEL, telefon, daty, adresy, e-mail)
const AI_PROMPT='Popraw styl na medyczny, nie zmieniaj faktów ani dawek.';
function anonymize(t){return String(t||'')
 .replace(/\b\d{11}\b/g,'[PESEL usunięty]')
 .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,'[e-mail usunięty]')
 .replace(/\b\d{4}-\d{2}-\d{2}\b/g,'[data usunięta]')
 .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g,'[data usunięta]')
 .replace(/(\+48[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g,'[telefon usunięty]')
 .replace(/\b\d{2}-\d{3}\b/g,'[kod usunięty]')
 .replace(/\b(ul\.|ulica|ulicy|al\.|aleja|alei|os\.|osiedle|osiedlu|pl\.|plac|placu|zam\.|zamieszkał[ya]?|zamieszkała)\s+[^\n,;.]*/gi,'[adres usunięty]')
 .replace(/\b([Pp]an|[Pp]ani|[Pp]acjent|[Pp]acjentka|[Nn]azwisko|[Ii]mię)\s*:?\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)?/g,(m,a)=>a+' [dane usunięte]')}
const API={mgW,expectedBtn,sayify,numWords,anonymize,AI_PROMPT,buttonsFor,rhyButtons,RHY,adrText,RHY_NAME,labOf,btnKey,PressState,BTN,lev,fuzzyMatch,FUZZY,roscRhyOf,echoOf,BARGE_MIN,minText,insText,HK_GLU,amioDrip,amioDripSay,numW,amioCalc,amioSay,amioCount,hepCalc,hepBolusText,hepPrepText,HEPB,parsePair,bargeIn,sedText,fentRepText,midaRepText,fentWarn,volW,HEPR,PACEMAX,atroNext,BINT,BINF,binfMlh,binfConc,binfPrep,atroText,ENERGY_SEQ,energyFor,ENERGY,ENERGY_LABEL,vfInstr,VERSION,SAY,HT,htQ,r1,fmt1,mlWord,flowPhrase,noraMlh,dobuMlh,adrInfMlh,mapOf,noraTable,norm,parseNumber,matchCommand,interpret,Engine,report,hhmm,staticPhrases,NORA,DOBU};
if(typeof module!=='undefined')module.exports=API;else root.RKO=API;
})(this);
