/* RKO SOR – interfejs (podgląd) */
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const cfg=Object.assign({listen:'cont',liveAsk:'1',lektor:'m',lektorVol:'1',srOff:'0',metroAsk:'quiet',email:'',energy:'mindray',syr:'',paceEl:'ap',atroAmp:'0.5',iso:'1/50',dopa:'200/50',adrinf:'1/50',sayConc:'1',pacer:'mindray',fentConc:'50',midaConc:'1',midaAmp:'5/1',atroDose:'0.5',stacked:'0',metro:'1',metroRate:'110',metroVol:'0.15',metroLucas:'1',barge:'min',amioMode:'drip',dropSet:'20',hep:'25000/50',hepAmp:'5000',amioInf:'900/50'},LS.get('rko_cfg',{}));if(!cfg.m161){cfg.metroLucas='1';cfg.m161=1;try{LS.set('rko_cfg',cfg)}catch(e){}}if(!cfg.m210){if(cfg.liveAsk==='1')cfg.liveAsk='all';if(!cfg.lektor)cfg.lektor='m';cfg.m210=1;try{LS.set('rko_cfg',cfg)}catch(e){}}// v2.1.1 (t95u): powrót do sprawdzonego w 2.0.0 trybu mikrofonu („w trakcie krótkich pytań”); „zawsze” – tylko z wyboru (eksperymentalne); mikrofon zawsze włączony po migracji
if(!cfg.m211){try{if(cfg.liveAsk==='all'||!cfg.liveAsk)cfg.liveAsk='1';if(cfg.lektor!=='k')cfg.lektor='m';if(!cfg.lektorVol)cfg.lektorVol='1';if(cfg.listen!=='window')cfg.listen='cont';cfg.m211=1;LS.set('rko_cfg',cfg)}catch(e){}}
if(!cfg.m17){if(cfg.metroVol==='0.3')cfg.metroVol='0.15';cfg.m17=1;try{LS.set('rko_cfg',cfg)}catch(e){}}
let E=null,timer=null,wl=null,said=[];
// ---- v1.9 licencja (offline, Ed25519) ----
let instId=LS.get('rko_inst',null);if(!instId){instId=LIC.makeId('RKO');LS.set('rko_inst',instId)}
let LICS=null;function licCheck(){LICS=LIC.status({now:Date.now(),maxSeen:LS.get('rko_maxseen',0),code:LS.get('rko_code',null),id:instId,app:LIC.APPS.RKO});LS.set('rko_maxseen',LICS.maxSeen);
 const full=LICS.full;$('#licId').textContent=instId;$('#licSt').textContent={trial:'pełna – wersja próbna do 31.12.2026',code:'pełna – kod aktywacji'+(LICS.code&&LICS.code.exp?' do '+new Date(LICS.code.exp).toLocaleDateString('pl-PL'):''),owner:'pełna – kod właściciela (bez terminu)',demo:'DEMO'}[LICS.mode];
 $('#licban').classList.toggle('hide',!LICS.banner);$('#licbt').textContent=LICS.banner||'';
 $('#sim').textContent=full?'SYMULACJA (szkolenie)':'SYMULACJA 🔒 (pełna wersja)';document.body.classList.toggle('demo',!full);return LICS}
function isFull(){return !!(LICS&&LICS.full)}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(x){}a.remove();return true}}
function copyId(){copyText(LIC.shareText(instId)).then(()=>toast('Skopiowano – wklej w WhatsApp do autora'))}
function toast(t){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.style.cssText='position:fixed;left:5vw;right:5vw;bottom:20px;background:#333;color:#fff;padding:12px;border-radius:8px;z-index:99;text-align:center';document.body.appendChild(el)}el.textContent=t;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',3500)}
function needFull(what){if(isFull())return true;toast((what||'Ta funkcja')+' – w wersji pełnej (Licencja → kod aktywacji)');return false}
function show(id){if(id==='reports'&&!needFull('Historia raportów'))return;if(id==='settings'){try{Ears.perm&&Ears.perm(false)}catch(e){}}if(id==='settings'){const lim=!isFull();$('#settings').classList.toggle('limited',lim);if(lim)toast('Pełne ustawienia – w wersji pełnej; lektor i głośność zawsze dostępne');const act=typeof E!=='undefined'&&E&&E.s&&(E.s.mode==='arrest'||E.s.mode==='rosc');$('#setBack').classList.toggle('hide',!act);try{setTopRender()}catch(e){}}$$('.scr').forEach(s=>s.classList.toggle('on',s.id===id));if(id==='reports')renderList();if(id==='help')renderHelp();window.scrollTo(0,0)}
$$('[data-s]').forEach(b=>b.onclick=()=>show(b.dataset.s));
$('#ver').textContent=RKO.VERSION;
// ---- ustawienia ----
for(const k in RKO.ENERGY_LABEL){const o=document.createElement('option');o.value=k;o.textContent=RKO.ENERGY_LABEL[k];$('#energy').appendChild(o)}
$('#email').value=cfg.email;$('#energy').value=cfg.energy;$('#syr').value=cfg.syr;
$('#paceEl').value=cfg.paceEl;for(const k in RKO.PACEMAX){const o=document.createElement('option');o.value=k;o.textContent=RKO.PACEMAX[k].label;$('#pacer').appendChild(o)}
const KS=['atroAmp','iso','dopa','adrinf','sayConc','pacer','fentConc','midaConc','midaAmp','atroDose','stacked','hep','hepAmp','amioMode','dropSet','barge','metro','metroRate','metroVol','metroLucas','listen','liveAsk','metroAsk','lektor','srOff','lektorVol'];KS.forEach(k=>{const el=$('#'+k);if(el)el.value=cfg[k]});['email','energy','syr','paceEl'].concat(KS).forEach(k=>{const el=$('#'+k);if(el)el.onchange=()=>{cfg[k]=el.value.trim();try{LS.set('rko_cfg',cfg)}catch(e){}}});
// v1.9.7 (B6): Android WebView nie aktualizuje navigator.onLine w trybie samolotowym – sprawdzamy połączenie naprawdę (zapytanie bez treści, limit 4 s)
let netOk=null,netP=null;const NET_URL='https://www.gstatic.com/generate_204';
// v2.1.3 (t101u): napis o dostępności sieci usunięty z ekranu (mylący, aplikacja działa offline); sprawdzanie sieci zostaje po cichu (kolejka raportów, aktualizacje)
function netShow(ok){const was=netOk;netOk=ok;if(ok&&was===false){const q=LS.get('rko_queue',[]);updQ();if(q.length&&cfg.email&&!active())toast('Sieć wróciła – raporty w kolejce: '+q.length+'. Raporty → „Wyślij kolejkę teraz”.')}}
function probe(){if(netP)return netP;netP=(async()=>{if(navigator.onLine===false){netShow(false);return false}const c=window.AbortController?new AbortController():null;const t=setTimeout(()=>c&&c.abort(),4000);
 try{await fetch(NET_URL+'?t='+Date.now(),{mode:'no-cors',cache:'no-store',signal:c?c.signal:undefined});netShow(true);return true}catch(e){netShow(false);return false}finally{clearTimeout(t);netP=null}})();return netP}
function net(){probe()}
addEventListener('online',net);addEventListener('offline',net);document.addEventListener('visibilitychange',()=>{if(!document.hidden)probe()});probe();setInterval(()=>{if(!document.hidden)probe()},45000);
// v1.9.7 (B1): blokada przypadkowego podwójnego dotknięcia – w ciągu 500 ms od poprzedniego dotknięcia przycisku akcji kolejne jest ignorowane
const TAPLOCK=500;let lastTap=0;$('#run').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.id==='ptt')return;const now=Date.now();if(now-lastTap<TAPLOCK){e.stopImmediatePropagation();e.preventDefault();return}lastTap=now},true);
window.__tapLock=()=>({TAPLOCK,lastTap});
// ---- start ----
async function wake(on){const K=plug('KeepAwake');try{if(K){on?await K.keepAwake():await K.allowSleep();return}
 if(on&&navigator.wakeLock)wl=await navigator.wakeLock.request('screen');if(!on&&wl){wl.release();wl=null}}catch(e){}}
function concCfg(){const o={};for(const k of ['iso','dopa','adrinf']){const m=String(cfg[k]).split('/').map(Number);if(m.length===2&&m[0]>0&&m[1]>0)o[k]={mg:m[0],ml:m[1]}}return o}
function engine(){return new RKO.Engine({full:isFull(),energy:cfg.energy,paceEl:cfg.paceEl,fentConc:+String(cfg.fentConc).replace(',','.')||50,midaConc:+String(cfg.midaConc).replace(',','.')||1,midaAmpMg:+cfg.midaAmp.split('/')[0]||5,midaAmpMl:+cfg.midaAmp.split('/')[1]||1,atroDose:+cfg.atroDose,stacked:cfg.stacked==='1',amioMode:cfg.amioMode,dropSet:+cfg.dropSet,hepAmp:+String(cfg.hepAmp).replace(',','.')||5000,hep:{u:+cfg.hep.split('/')[0]||25000,ml:+cfg.hep.split('/')[1]||50},amioInf:{mg:+cfg.amioInf.split('/')[0]||900,ml:+cfg.amioInf.split('/')[1]||50},paceMax:(RKO.PACEMAX[cfg.pacer]||RKO.PACEMAX.mindray).mA,atroAmp:+cfg.atroAmp,sayConc:cfg.sayConc!=='0',conc:concCfg(),out:(t,k)=>{Voice.say(t,k);/* v2.1.2: pytanie widoczne RAZ – w polu „next” (▸), nie drugi raz w „said” */if(k==='ask'||k==='remind')return;said.push(Voice.genderize?Voice.genderize(t):t);said=said.slice(-3);$('#said').innerHTML=said.map((x,i)=>i===said.length-1?'<b>'+x+'</b>':'<span class="old">'+x+'</span>').join('<br>')},alarm:()=>Voice.alarm(),persist:s=>LS.set('rko_cur',s)})}
// v2.1.0: lektor M/K, nasłuch w trakcie lektora (all/ask/off), rozpoznawanie offline
// v2.1.1 (t95u): żaden błąd ustawień/lektora nie może wyłączyć mikrofonu – każdy krok osobno w try/catch
function earsCfg(){try{Ears.liveAsk=cfg.liveAsk!=='0';Ears.liveMode=cfg.liveAsk==='all'?'all':cfg.liveAsk==='0'?'off':'ask'}catch(e){}try{Voice.setVoice(cfg.lektor==='k'?'k':'m')}catch(e){}try{Voice.setVol&&Voice.setVol(+cfg.lektorVol||1)}catch(e){}try{Ears.offline=cfg.srOff==='1'}catch(e){}
 Ears.onNative=v=>{const l=$('#srOffL');if(l)l.style.display=v>=210?'':'none'};Ears.onOffline=v=>{cfg.srOff=v?'1':'0';LS.set('rko_cfg',cfg);const el=$('#srOff');if(el)el.value=cfg.srOff;toast('Rozpoznawanie offline niedostępne na tym telefonie – używam online')}}
earsCfg();['lektor','liveAsk','srOff','lektorVol'].forEach(k=>{const el=$('#'+k);if(!el)return;const prev=el.onchange;el.onchange=()=>{prev&&prev();earsCfg();setTopRender();if(k==='lektor'&&!(E&&E.s&&(E.s.mode==='arrest'||E.s.mode==='rosc'))){try{Voice.unlock&&Voice.unlock();Voice.say(RKO.SAY.lektorTest,'ack')}catch(e){}}if(k==='srOff'&&Ears.running&&Ears.mode==='native')Ears.opts().then(()=>Ears.kick('zmiana trybu rozpoznawania'))}});
// v2.1.1 (t95u): Ustawienia → „Lektor i głośność”: wybór lektora (♂/♀) + Odsłuchaj, głośność lektora i metronomu z testem; zapis od razu (LS rko_cfg)
function setTopRender(){try{$$('.lekB').forEach(b=>b.classList.toggle('act',b.dataset.lek===(cfg.lektor==='k'?'k':'m')));const lv=$('#lektorVol');if(lv&&lv.value!==String(cfg.lektorVol))lv.value=cfg.lektorVol;$('#lektorVolV').textContent=Math.round((+cfg.lektorVol||1)*100)+'%';const mv=$('#metroVol');if(mv&&mv.value!==String(cfg.metroVol))mv.value=cfg.metroVol;$('#metroVolV').textContent=Math.round((+String(cfg.metroVol).replace(',','.')||0.15)*100)+'%'}catch(e){}}
function cfgSet(k,v){cfg[k]=String(v);try{LS.set('rko_cfg',cfg)}catch(e){}const el=$('#'+k);if(el&&el.value!==String(v))el.value=v;try{earsCfg()}catch(e){}setTopRender()}
function inAction(){return !!(E&&E.s&&(E.s.mode==='arrest'||E.s.mode==='rosc'))}
function lekSample(t){if(inAction()){toast('Odsłuch po zakończeniu akcji (lektor prowadzi akcję)');return}try{Voice.unlock&&Voice.unlock();Voice.stop&&Voice.stop();Voice.say(t||RKO.SAY.lektorTest,'ack')}catch(e){}}
$$('.lekB').forEach(b=>b.onclick=()=>{cfgSet('lektor',b.dataset.lek);lekSample()});
$('#lekTest').onclick=()=>lekSample();
{const lv=$('#lektorVol');lv.oninput=()=>{cfgSet('lektorVol',lv.value)};lv.onchange=()=>cfgSet('lektorVol',lv.value);const mv=$('#metroVol');mv.oninput=()=>cfgSet('metroVol',mv.value);mv.onchange=()=>cfgSet('metroVol',mv.value)}
$('#metroTest').onclick=()=>{try{Voice.unlock&&Voice.unlock();const vol=Math.max(0.02,Math.min(1,+String(cfg.metroVol).replace(',','.')||0.15)),rate=+cfg.metroRate||110;
 if(inAction()){toast('Metronom gra w trakcie akcji – głośność zmienia się od razu');return}
 const N=plug('RkoNative');if(N&&N.metro){N.metro({on:true,rate,vol}).catch(()=>{});setTimeout(()=>{N.metro({on:false,rate,vol}).catch(()=>{})},3000);return}
 const c=Voice.ctx;if(!c)return;try{c.resume()}catch(e){}const per=60/rate;const old=Metro.vol;Metro.vol=vol;for(let i=0;i<6;i++)Metro.click(c.currentTime+0.1+i*per);setTimeout(()=>{Metro.vol=old},4000)}catch(e){}};
$('#setRun').onclick=()=>show('settings');$('#setBack').onclick=()=>show('run');
setTopRender();
const NAT=()=>plug('RkoNative');
function nat(m,o){const N=NAT();if(N&&N[m])return N[m](o||{}).catch(()=>{})}
function begin(sim,resumeState){if(sim&&!needFull('Symulacja'))return;if(typeof mic!=='undefined'&&mic.on){mic.on=false;clearTimeout(mic.t);Ears.stop()}Voice.unlock();E=engine();
 try{Ears.windowMode=cfg.listen==='window'}catch(e){}earsCfg();Metro.askMode=cfg.metroAsk||'quiet';Ears.liveAllowed=()=>{if(!E||!E.s||!E.s.cur)return true;return RKO.buttonsFor(E.s).map(x=>x.c).join()==='tak,nie'};Ears.questionOpen=()=>!!(E&&E.s&&E.s.cur&&(E.s.mode==='arrest'||E.s.mode==='rosc'));Ears.classify=a=>RKO.interpret(a,E?E.ctx():{});if(resumeState){E.resume(resumeState)}else E.start({sim,email:cfg.email,syr:cfg.syr?+cfg.syr:null});
 Ears.classify=alts=>RKO.interpret(alts,E&&E.s&&E.s.mode!=='idle'?E.ctx():{});
 $('#simbar').classList.toggle('hide',!E.s.sim);$('#chg').classList.toggle('hide',!E.s.sim);
 try{Metro.start()}catch(e){}show('run');try{wake(true)}catch(e){}Metro.useNative=true;try{nat('action',{on:true});if(cfg.pin==='1')nat('pin',{on:true})}catch(e){}try{$('#wywB').classList.toggle('hide',!isFull())}catch(e){}begin._t=Date.now();Ears.onResult=(alts,conf,src)=>{if(!Ears.inWindow()){Ears.mark('poza oknem odpowiedzi – pominięto');micFlashSet('bad','poza oknem odpowiedzi – naciśnij mikrofon',1500);return}handle(alts,false,conf)};Ears.barge=cfg.barge;startEarsAfterFirst();clearInterval(timer);timer=setInterval(loop,250);render()}
$('#go').onclick=()=>{if(E&&E.s&&E.s.mode!=='idle'&&E.s.mode!=='ended'){show('run');return}begin(false)};$('#sim').onclick=()=>begin(true);
// mikrofon dopiero po pierwszym komunikacie (start rozpoznawania zabiera fokus audio na Androidzie)
// v1.6.2: mikrofon startuje natychmiast po końcu pierwszego nagrania (pętla natywna i tak czeka, aż lektor zamilknie)
// v1.7: rozpoznawanie startuje od razu i słucha także podczas lektora (trwały rozpoznawacz natywny)
function startEarsAfterFirst(){setTimeout(()=>{try{Ears.start()}catch(e){}},300)}
// v2.1.1 (t95u): opiekun mikrofonu – w trakcie akcji mikrofon nie może pozostać wyłączony (poza brakiem uprawnienia); ponowny start co 5 s
// v2.1.2: naprawa uprawnienia mikrofonu – dotknięcie czerwonego „ZEZWÓL” prosi Androida o zgodę (okno systemowe); trwała odmowa → instrukcja, jak włączyć w ustawieniach telefonu
async function micFix(fromBtn){try{Ears.set('mikrofon: proszę Androida o uprawnienie…');micRender();const st=await Ears.perm(true);permRender(st);
 if(Ears.permOk(st)){permHide();Ears.permDenied=null;Ears.set('mikrofon: uruchamiam…');if(E&&E.s&&(E.s.mode==='arrest'||E.s.mode==='rosc')&&!Ears.running)await Ears.start();toast('Mikrofon: uprawnienie przyznane');return true}
 Ears.permFail(st);permShow(st);return false}catch(e){Ears.addLog&&Ears.addLog('info','micFix: '+(e&&e.message||e));return false}}
function permShow(st){const b=$('#permBox');if(!b)return;$('#permWhy').textContent=st==='denied'?'Android nie pozwala aplikacji RKO SOR używać mikrofonu, a telefon nie pokazuje już pytania o zgodę (wcześniej wybrano „Nie zezwalaj”).':'Android nie przyznał aplikacji RKO SOR uprawnienia do mikrofonu (okno zgody zamknięto bez wyboru albo odmówiono).';b.classList.remove('hide')}
function permHide(){const b=$('#permBox');if(b)b.classList.add('hide')}
function permRender(st){const el=$('#permSt');if(!el)return;st=st||Ears.permState;el.textContent='Uprawnienie do mikrofonu: '+(st==='granted'?'✓ przyznane':st==='denied'?'✕ ZABLOKOWANE w Androidzie – włącz w ustawieniach telefonu':st&&st!=='unknown'?'✕ nieprzyznane – dotknij przycisku poniżej':'—');el.style.color=st==='granted'?'var(--ok)':st&&st!=='unknown'?'#ff8a8a':''}
Ears.onPerm=st=>permRender(st);Ears.onPermFail=st=>{permRender(st);if(Date.now()-(permRender._t||0)>20000){permRender._t=Date.now();try{toast('Mikrofon: brak uprawnienia Androida – dotknij czerwonego „ZEZWÓL”')}catch(e){}}};
$('#permRetry').onclick=()=>micFix(true);$('#permX').onclick=()=>permHide();$('#permChk').onclick=()=>micFix(true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Ears.permDenied){micGuard._p=0;micGuard()}});
function micGuard(){try{if(!E||!E.s||!(E.s.mode==='arrest'||E.s.mode==='rosc'))return;if(Ears.running||(typeof mic!=='undefined'&&mic.on))return;const n=Date.now();if(n-(begin._t||0)<4000||n-(micGuard._t||0)<5000)return;if(/uprawnien/.test(String(Ears.status||''))&&!Ears.permDenied)return;if(Ears.permDenied){if(n-(micGuard._p||0)>3000&&!micGuard._busy){micGuard._p=n;micGuard._busy=true;Promise.resolve(Ears.perm?Ears.perm(false):'denied').then(st=>{micGuard._busy=false;if(Ears.permOk&&Ears.permOk(st)){Ears.permDenied=null;Ears.set('mikrofon: uruchamiam…');permHide();Ears.addLog('info','uprawnienie do mikrofonu przyznane – uruchamiam');Ears.start()}}).catch(()=>{micGuard._busy=false})}return}micGuard._t=n;Ears.addLog&&Ears.addLog('info','opiekun: mikrofon był wyłączony w trakcie akcji – uruchamiam ponownie');Ears.start()}catch(e){}}
let pendingIn=[],lastYN=0;Voice.hooks.push(sp=>{if(!sp&&pendingIn.length){const q=pendingIn;pendingIn=[];q.forEach(a=>handle(a,true,null,'głos'))}});
function handle(alts,direct,conf,src){if(mic.on){mic.res(alts);return}if(!E)return;alts=[].concat(alts);
 // v1.8: głos nigdy nie przerywa lektora (wynik w trakcie mowy → kolejka)
 // v2.1.1: „zakończ” – natychmiast, także w trakcie lektora (bez kolejki i bez pytania)
 if(RKO.interpret(alts,E.ctx()).cmd==='abort'&&(E.s.mode==='arrest'||E.s.mode==='rosc')){Voice.stop();pendingIn=[];}
 // v2.1.0 (t93u): komendy z głosu w trakcie lektora wykonują się OD RAZU („tak/nie”, „zaintubowany” i inne); echo lektora usuwa wcześniej Ears.clean
 else if(!direct&&Voice.speaking){const rq=RKO.interpret(alts,E.ctx());
  // v2.1.0: odpowiedź słowem z przycisku otwartego pytania wyboru (np. „hipotermia”) też w trakcie lektora
  const opt=()=>{try{const bs=RKO.buttonsFor(E.s).map(b=>RKO.norm(b.c||'')).filter(k=>k.length>=4);return alts.some(a=>{const t=RKO.norm(a).split(' ');return bs.some(k=>t.includes(k)||t.some(w=>w.length>=6&&RKO.lev(w,k)<=1))})}catch(e){return false}};
  if(!rq.cmd&&!opt()){Ears.mark('nie pasuje (lektor mówi)');return}}
// v2.0.0: ochrona przed podwójnym wykonaniem – to samo tak/nie z głosu w ciągu 450 ms nie odpowie na następne pytanie
 if(!direct||src==='głos'){const r1=RKO.interpret(alts,E.ctx());if((r1.cmd==='yes'||r1.cmd==='no')){const n=Date.now();if(lastYN&&n-lastYN<450){Ears.mark('duplikat tak/nie – pominięto');return}lastYN=n}}
{const ry=RKO.interpret(alts,E.ctx());if((ry.cmd==='yes'||ry.cmd==='no')&&!E.s.cur&&!E.s.paused&&E.s.mode!=='idle'&&E.s.mode!=='ended'){Ears.mark('tak/nie – brak otwartego pytania');$('#heard').textContent='mikrofon: '+alts[0]+' – brak otwartego pytania';micFlashSet('bad','„'+cmdLbl(ry.cmd)+'” – brak otwartego pytania',1500);return}}
$('#heard').textContent='mikrofon: '+[].concat(alts)[0];const before=E.s.cur&&E.s.cur.id,beforeTxt=E.s.cur&&E.s.cur.text,k0=RKO.btnKey(E.s);const r=RKO.interpret(alts,E.ctx());const c=E.input(alts,src||(direct?'przycisk':'głos'));
 if(c==='unmatched')$('#heard').textContent='nie rozpoznano: „'+alts[0]+'” – powiedz jeszcze raz albo użyj przycisku';
 if(!direct||src==='głos'||src==='ptt'){if(!c&&RKO.btnKey(E.s)!==k0)micFlashSet('ok','rozpoznano: '+alts[0],1300);else if(c==='unmatched'||!c)micFlashSet('bad','nie rozpoznano: „'+alts[0]+'”',1500);else micFlashSet('ok','rozpoznano: '+cmdLbl(c,r.cmd),1300)}
 if(beforeTxt&&RKO.btnKey(E.s)!==k0&&!(E.s.cur&&E.s.cur.text===beforeTxt))Voice.skipStale(beforeTxt);Ears.mark(c&&c!=='unmatched'?('komenda: '+c+(r.fuzzy?' (przybliżone)':'')+(before?' [pytanie: '+before+']':'')):('nie pasuje'+(before?' [pytanie: '+before+']':'')));
 if(c==='send'){if(E.s.mode==='ended'){if(cfg.email)sendReport(E.s);else{showReport(E.s);askEmail(E.s)}}else E.say('Raport wyślę po zakończeniu.')}
 if((E.s.cur&&E.s.cur.id)!==before)Metro.askEnd();if(c==='abort'&&E.s.mode==='ended'){toast(RKO.SAY.abortBye);$('#heard').textContent=RKO.SAY.abortBye}if(E.s.mode==='ended')finished();render()}
$$('.fb [data-c],.fb2 [data-c]').forEach(b=>b.onclick=()=>{Ears.addLog('przycisk',b.dataset.c);press(b,b.dataset.c);handle([b.dataset.c],true,null,'przycisk')});
// v1.8: przyciski kontekstowe – do bieżącego pytania lektora; kolor aktywny do przyjęcia komendy / następnego kroku
const PS=new RKO.PressState();let ctxKey=null;
function press(el,c){PS.press(c,Date.now());document.querySelectorAll('button.exp').forEach(b=>b.classList.remove('exp'));el.classList.add('act');setTimeout(()=>{el.classList.remove('act')},900)}
function renderCtx(force){const box=$('#ctxb');if(!box||!E)return;const key=RKO.btnKey(E.s),act=PS.sync(key,Date.now());
 if(force||key!==ctxKey){ctxKey=key;const L=RKO.buttonsFor(E.s);box.className='ctxb n'+Math.min(L.length,5);box.innerHTML='';
  L.forEach(x=>{const b=document.createElement('button');b.textContent=x.label;b.dataset.c=x.c;if(x.cls)b.classList.add('k'+x.cls);
   b.onclick=()=>{press(b,x.c);Ears.addLog('przycisk',x.c);if(x.c==='#num'){$('#numB').click();return}setTimeout(()=>{handle([x.c],true,null,'przycisk');renderCtx()},120)};box.appendChild(b)});const ex=RKO.expectedBtn(E.s);if(ex){const eb=[...box.querySelectorAll('button')].find(b=>b.dataset.c===ex);if(eb)eb.classList.add('exp')}}
 renderRhy(act);box.querySelectorAll('button').forEach(b=>b.classList.toggle('act',act!=null&&b.dataset.c===act))}
// v1.9: skróty rytmu zawsze widoczne w NZK
let rhyKey=null;function renderRhy(act){const box=$('#rhyb');if(!box||!E)return;const L=RKO.rhyButtons(E.s);const k=L.length+'|'+E.s.mode;if(k!==rhyKey){rhyKey=k;box.innerHTML='';box.classList.toggle('hide',!L.length);
 L.forEach(x=>{const b=document.createElement('button');b.textContent=x.label;b.dataset.c=x.c;if(x.cls)b.classList.add('k'+x.cls);b.onclick=()=>{press(b,x.c);Ears.addLog('przycisk',x.c);setTimeout(()=>{handle([x.c],true,null,'przycisk');renderCtx()},120)};box.appendChild(b)})}
 box.querySelectorAll('button').forEach(b=>b.classList.toggle('act',act!=null&&b.dataset.c===act))}
// v1.9: COFNIJ przez 5 s po każdym potwierdzeniu
// v1.9.7 (B1): pasek COFNIJ ma stałe, zarezerwowane miejsce nad przyciskami (nie przesuwa ich, nie pojawia się w miejscu naciśniętego przycisku); aktywny dopiero 600 ms po pojawieniu się
let undoShownT=0,undoSnapT=null;const UNDO_ARM=600;
function renderUndo(){const u=$('#undo');const ok=!!(E&&E.canUndo&&E.canUndo());if(!ok){u.classList.remove('on','arm');u.setAttribute('aria-hidden','true');undoSnapT=null;return}
 if(undoSnapT!==E.undoSnap.t){undoSnapT=E.undoSnap.t;undoShownT=Date.now()}const armed=Date.now()-undoShownT>=UNDO_ARM;u.classList.add('on');u.classList.toggle('arm',!armed);u.setAttribute('aria-hidden','false');
 const l=Math.max(0,5-Math.floor((Date.now()-E.undoSnap.t)/1000));$('#undoB').textContent='COFNIJ ('+l+')';$('#undoT').textContent=E.undoSnap.label.slice(0,60)}
// v1.9.6: przycisk mikrofonu – metronom i lektor stop, świeży rozpoznawacz, wynik pośredni, transkrypcja na żywo
const PTT={get on(){return Ears.pttOn}};function pttSet(on){micRender()}
// wskaźnik mikrofonu – patrz micBase (v2.1.0)
const CMD_LBL={abort:'NATYCHMIASTOWE ZAKOŃCZENIE',shockable:'VF / pVT',nonshock:'asystolia / PEA',pulse:'jest tętno',nopulse:'brak tętna',rosc:'ROSC',shock_done:'wyładowano',adr:'adrenalina podana',amio:'amiodaron podany',lido:'lidokaina podana',yes:'TAK',no:'NIE',ack:'OK',given:'podano',next:'dalej',number:'liczba',intub:'intubacja',usg:'USG',organised:'rytm zorganizowany',arrest:'zatrzymanie krążenia',pause:'pauza',end:'zakończ',zakoncz_tak:'tak, zakończ',replay:'powtórz',send:'wyślij',up:'zwiększ',down:'zmniejsz',keep:'utrzymaj',rko_od:'RKO od…',lucas_off:'LUCAS stop',lucas_on:'LUCAS start',alone:'nie mogę uciskać',hyperk:'hiperkaliemia',bicarb:'wodorowęglan',unknown:'nie wiem',present:'jest',checked:'sprawdzone',brady:'bradykardia',pace:'stymulacja',kg:'masa ciała',decide:'decyzja',iso:'izoprenalina',dopa:'dopamina',nora:'noradrenalina',dobu:'dobutamina',hepinf:'wlew heparyny',amioinf:'wlew amiodaronu',adrinf:'wlew adrenaliny',change:'zmień rytm',s20:'20',s50:'50'};
function cmdLbl(c,c2){return CMD_LBL[c]||CMD_LBL[c2]||String(c||c2||'')}
let micFlash=null;function micFlashSet(kind,text,ms){micFlash={kind,text,until:Date.now()+(ms||1300)};micRender()}
// v2.1.0 (t93u): 🟡 ŻÓŁTY MIGA = przygotuj się (lektor kończy pytanie / mikrofon się uruchamia); 🟢 ZIELONY MIGA = mikrofon NAPRAWDĘ słucha (gotowość rozpoznawacza), mów teraz;
// 🔵 niebieski = rozpoznano; ⚪ szary „nie rozpoznano” (krótko) / czeka; 🔴 czerwony = błąd
function micBase(){const st=String(Ears.status||'off');const rdy=!Ears.ready||Ears.ready();
 // v2.1.2: brak uprawnienia – krótki napis mieszczący się w przycisku („ZEZWÓL” = dotknij, by poprosić Androida o zgodę)
 if(Ears.permDenied||/uprawnien/.test(st))return ['err','ZEZWÓL','brak uprawnienia – dotknij mikrofonu'];
 if(/niedostępn|brak rozpoznawania|nieobsługiwan|błąd (9|12|13|not-allowed|audio-capture|service-not-allowed|language-not-supported|NOT_AVAILABLE)\b/.test(st))return ['err','BŁĄD',st.replace(/^mikrofon: /,'')];
 if(Ears.pttOn)return rdy?['listen','MÓW','mikrofon aktywny – mów teraz']:['prep','UWAGA','przygotuj się – mikrofon się uruchamia'];
 if(!Ears.running)return ['off','WYŁ.','mikrofon wyłączony – naciśnij, by mówić'];
 const q=Voice.speaking&&(Voice.kind==='ask'||Voice.kind==='remind');
 if(Voice.speaking){if(Ears.liveNow&&!Ears.paused)return rdy?['listen','MÓW','mikrofon aktywny – możesz mówić także w trakcie lektora']:['prep','UWAGA','przygotuj się – mikrofon się uruchamia'];
  return q?['prep','UWAGA','przygotuj się do odpowiedzi – lektor kończy pytanie']:['wait','CZEKAJ','lektor mówi – mikrofon wstrzymany']}
 if(Ears.paused||!Ears.inWindow())return ['wait','NACIŚNIJ','mikrofon czeka na pytanie – naciśnij, by mówić'];
 if(/^mikrofon: błąd/.test(st)&&Date.now()-(Ears._errT||0)<3000)return ['prep','UWAGA','ponawiam nasłuch – przygotuj się'];
 if(!rdy)return ['prep','UWAGA','przygotuj się – mikrofon się uruchamia'];
 return ['listen','MÓW','mikrofon aktywny – mów teraz']}
function micRender(){const b=$('#ptt');if(!b)return;let [k,l,t]=micBase();if(micFlash&&Date.now()<micFlash.until&&k!=='err'){k=micFlash.kind;l=k==='ok'?'✓ OK':'✕ ?';t=micFlash.text}else micFlash=null;
 const cls='ptt m-'+k;if(b.className!==cls)b.className=cls;const L=$('#pttL');if(L&&L.textContent!==l)L.textContent=l;const m=$('#micst');if(m){if(m.textContent!==t)m.textContent=t;if(m.className!=='micst m-'+k)m.className='micst m-'+k}}
window.__micRender=micRender;
function pttUi(t,cls){const r=$('#recog');if(!r)return;r.textContent=t;r.className='recog'+(cls?' '+cls:'')}
function pttPress(onCmd){if(Ears.pttOn){Ears.pttEnd(null,'anulowano');return}Voice.unlock&&Voice.unlock();pttSet(true);pttUi('przygotowuję mikrofon…');
 Ears.ptt({ms:8000,match:a=>RKO.pttMatch(a),ui:t=>pttUi(t,'live'),done:(alts,why)=>{pttSet(false);if(!alts){pttUi(why,'err');return}const m=RKO.pttMatch(alts);
  if(m){pttUi('słyszę: „'+alts[0]+'” → '+m.label,'ok');onCmd(m,alts)}else{pttUi('słyszę: „'+alts[0]+'” → nie rozpoznano komendy','err');onCmd(null,alts)}}})}
$('#ptt').onclick=()=>{if(!E)return;if(Ears.permDenied||/uprawnien/.test(String(Ears.status||''))){micFix(true);return}pttPress((m,alts)=>{if(m){handle([m.say],true,null,'ptt');showRec()}else handle(alts,true,null,'ptt')})};
window.__pttPress=pttPress;
function showRec(){if(E&&E.lastRec&&Date.now()-E.lastRec.t<6000){const r=$('#recog');r.textContent=r.textContent+' · '+E.lastRec.text+' — COFNIJ przez 5 s, jeśli źle';r.classList.add('ok')}}
$('#undoB').onclick=()=>{if(!E||!$('#undo').classList.contains('on')||Date.now()-undoShownT<UNDO_ARM)return;Voice.stop();Ears.addLog('przycisk','COFNIJ');if(E.undo())toast('Cofnięto');render()};
// v1.9: wywiad (tekst, dyktowanie klawiaturą)
let wywTarget=null;function openWyw(target){wywTarget=target;$('#wywT').value=target.wywiad||'';$('#wyw').classList.remove('hide');setTimeout(()=>$('#wywT').focus(),100)}
$('#wywB').onclick=()=>{if(!E||!needFull('Wywiad'))return;openWyw(E.s)};
$('#wywS').onclick=()=>{if(wywTarget){const raw=$('#wywT').value.trim(),clean=RKO.anonymize(raw,{free:true});wywTarget.wywiad=clean;if(clean!==raw)toast('Usunięto dane osobowe z wywiadu (PESEL, telefony, daty, adresy, nazwiska) – sprawdź raport');if(E&&wywTarget===E.s){LS.set('rko_cur',E.s.mode==='ended'?null:E.s)}saveRep(wywTarget);if(curRep===wywTarget)showReport(curRep)}$('#wyw').classList.add('hide')};
$('#wywX').onclick=()=>$('#wyw').classList.add('hide');
function saveRep(s){if(!s||s.mode!=='ended')return;const list=LS.get('rko_reports',[]);const i=list.findIndex(r=>r.id===s.id);if(i>=0){list[i]=s;LS.set('rko_reports',list)}}
// v1.9: wyjście w trakcie akcji
function active(){return !!(E&&E.s&&E.s.mode!=='idle'&&E.s.mode!=='ended')}
window.__rkoBack=()=>{if(active()){$('#exitq').classList.remove('hide');return true}return false};
$('#exitStay').onclick=()=>$('#exitq').classList.add('hide');$('#exitBg').onclick=()=>{$('#exitq').classList.add('hide');nat('toBack')};
addEventListener('beforeunload',e=>{if(active()){e.preventDefault();e.returnValue=''}});
// klawiatura liczb
let pv='';const pg=$('.padg');['1','2','3','4','5','6','7','8','9','⌫','0','OK'].forEach(k=>{const b=document.createElement('button');b.textContent=k;b.onclick=()=>{if(k==='OK'){$('#pad').classList.add('hide');if(pv)handle([pv],true);pv=''}else if(k==='⌫')pv=pv.slice(0,-1);else pv+=k;$('#padv').textContent=pv||'\u00a0'};pg.appendChild(b)});
$('#numB').onclick=()=>{pv='';$('#padv').textContent='\u00a0';$('#pad').classList.remove('hide')};
Ears.onState=st=>{micRender();const el=$('#ears');el.textContent='🎤 '+st;el.classList.toggle('on',/^słucham/.test(st));if(mic.on)mic.show()};Ears.onHeard=t=>{$('#heard').textContent='mikrofon: '+t};
function hm(t){const d=new Date(t),p=n=>String(n).padStart(2,'0');return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())}
function renderLog(){const L=Ears.log.filter(e=>!e.quiet&&e.src!=='pośredni').slice(-5);$('#rawlog').textContent=L.map(e=>hm(e.t)+' '+e.src+': '+e.text+(e.verdict?' → '+e.verdict:'')).join('\n')}
let logT=null;Ears.onLog=()=>{if(logT)return;logT=setTimeout(()=>{logT=null;renderLog();if(mic.on)mic.show();try{localStorage.setItem('rko_srlog',Ears.logText().slice(-60000))}catch(e){}},120)};
async function downloadLog(){const txt='RKO SOR v'+RKO.VERSION+' – log mikrofonu (tylko tekst, bez dźwięku)\nBłędy: '+JSON.stringify(Ears.errors)+'\nUrządzenie/usługa: '+JSON.stringify(await Ears.info())+'\n\n'+(Ears.log.length?Ears.logText():(localStorage.getItem('rko_srlog')||'(pusty)'));
 const d=new Date(),p=n=>String(n).padStart(2,'0');const name='RKO_mikrofon_'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes())+'.txt';
 const F=plug('Filesystem'),N=plug('RkoNative');if(F&&N){try{const r=await F.writeFile({path:name,data:txt,directory:'CACHE',encoding:'utf8'});await N.share({uri:r.uri,title:name,mime:'text/plain'});return}catch(e){$('#stres').textContent='Log: błąd zapisu '+e.message}}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download=name;a.click()}
$('#logdl').onclick=downloadLog;
// test mikrofonu (Ustawienia): surowy tekst + rozpoznana komenda przez 20 s
const mic={on:false,lines:[],async run(){if(E&&E.s&&E.s.mode!=='idle'&&E.s.mode!=='ended'){$('#stres').textContent='Test mikrofonu niedostępny w trakcie akcji.';return}
  mic.on=true;mic.lines=[];const inf=await Ears.info();mic.inf=inf;Voice.unlock();Ears.barge=cfg.barge;Ears.windowMode=false;Ears.classify=a=>RKO.interpret(a,{rhythm:true,confirm:true});Ears.onResult=(a)=>handle(a,false);
  mic.show();await Ears.start();clearTimeout(mic.t);mic.t=setTimeout(()=>{mic.on=false;Ears.stop();mic.lines.push('— koniec testu —');mic.show(true)},20000)},
 res(alts){const r=RKO.interpret(alts,{rhythm:true,confirm:true});const lab={shockable:'VF/pVT',nonshock:'ASYSTOLIA/PEA',nopulse:'PEA (bez tętna)',pulse:'TĘTNO → ROSC',yes:'TAK',present:'JEST = tak',ack:'potwierdzenie',given:'PODANO'}[r.cmd]||r.cmd||'— nie pasuje';
  mic.lines.push('„'+alts[0]+'” → '+lab+(r.fuzzy?' (przybliżone)':''));Ears.mark('test: '+(r.cmd||'nie pasuje'));mic.show()},
 show(end){const i=mic.inf||{};const L=['TEST MIKROFONU – powiedz: asystolia, PEA, migotanie, tętno, tak','Usługa mowy: '+(i.service||(i.web?'przeglądarka':'?'))+(i.maker?' · '+i.maker+' · Android SDK '+i.sdk:''),
  (i.installed?'Pakiety na urządzeniu: '+(i.installed.join(', ')||'brak')+' · online: '+((i.online||[]).filter(x=>/^pl/i.test(x)).join(', ')||'brak pl'):'')+(i.supportError!=null?' · sprawdzenie języka: błąd '+i.supportError:''),
  'Stan: '+Ears.status+' · błędy: '+JSON.stringify(Ears.errors)].filter(Boolean).concat(mic.lines.slice(-10));if(!end&&!mic.on)return;$('#stres').textContent=L.join('\n')}};
$('#mictest').onclick=()=>mic.run();
function mmss(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function loop(){micRender();try{if(Ears.watch)Ears.watch()}catch(e){}micGuard();if(!E)return;E.tick();if(E.s.mode!=='ended'&&Date.now()-(loop._p||0)>5000){loop._p=Date.now();LS.set('rko_cur',E.s)}{const w=E.metroWanted({on:cfg.metro!=='0',lucas:cfg.metroLucas!=='0'});Metro.want=w>0;Metro.rate=+cfg.metroRate||110;Metro.vol=(+String(cfg.metroVol).replace(',','.')||0.3)*(w||1)}render()}
function render(){if(!E)return;const s=E.s,now=Date.now();if(s.mode==='idle')return;
 $('#modeL').textContent=s.mode==='rosc'?'PO ROSC':s.mode==='ended'?'ZAKOŃCZONO':(s.paused?'NZK – PAUZA':'NZK');
 $('#tTot').textContent=mmss((s.tEnd||now)-s.arrestT);
 const left=120000-(now-s.cycleT);const chk=s.mode==='arrest'&&(left<15000||(s.cur&&['rhythm','rhyAsy','pulse'].includes(s.cur.id)));$('#tCyc').textContent=s.mode==='arrest'?mmss(left).slice(1):'—';$('#tCyc').classList.toggle('cy',chk);$('#tCyc').classList.toggle('cg',s.mode==='arrest'&&!chk);$('#tCycL').textContent=s.mode!=='arrest'?'—':chk?'OCENA RYTMU – przygotuj się':'uciskanie – do oceny rytmu';
 {const rt=s.mode==='rosc'?'ROSC':s.rhythm;const el=$('#rhy');if(el.textContent!==rt.replace('/','/\u200b')){el.textContent=rt.replace('/','/\u200b')}el.classList.toggle('long',rt.length>6)}$('#shk').textContent=s.shocks;
 let nx='—',due=false;
 if(s.mode==='arrest'){if(s.adrDue){const l=s.adrDue-now;due=l<=0;nx='Adrenalina 1 mg '+(due?'TERAZ':'za '+mmss(l))}else nx='Adrenalina: przy rytmie niedefibrylacyjnym od razu, VF po 3. wyładowaniu'}
 if(s.mode==='rosc'){nx=s.nora?'Noradrenalina '+RKO.fmt1(s.nora.mlh)+' ml/h':'Pętla ciśnienia';if(s.dobu)nx+=' · dobutamina '+RKO.fmt1(s.dobu.mlh)+' ml/h';if(s.lastMap!=null)nx+=' · MAP '+s.lastMap;if(s.nextMap)nx+=' · pomiar za '+mmss(s.nextMap-now)}
 if(s.cur)nx+='\n▸ '+s.cur.text.slice(0,70);
 // v2.0.0: przegląd listy 4H/4T
 if(s.htGo){const Q=RKO.HTQ;const y=Q.filter(x=>s.ht[x.k]==='✓').map(x=>x.sub&&s.htSub&&s.htSub[x.k]&&s.htSub[x.k]!=='?'?s.htSub[x.k]:(x.l||x.k).replace(/ \(.*\)/,''));nx+='\n4H/4T '+(s.htDone?'✔':Math.min(s.htIdx+1,Q.length)+'/'+Q.length)+(y.length?' · TAK: '+(y.length>3?y.slice(0,3).join(', ')+' +'+(y.length-3):y.join(', ')):s.htDone?' · brak potwierdzonych':'')}
 if(s.sim&&s.mode==='arrest')nx='Monitor (symulacja): '+(s.simRhythm||'?')+'\n'+nx;
 $('#next').textContent=nx;$('#next').classList.toggle('due',due);renderCtx();renderUndo()}
function finished(){clearInterval(timer);Metro.want=false;Metro.cut();Ears.stop();wake(false);Metro.useNative=false;nat('action',{on:false});nat('pin',{on:false});const s=E.s;LS.set('rko_cur',null);
 const list=LS.get('rko_reports',[]);s.id=s.id||('R'+s.t0);if(!list.find(r=>r.id===s.id))list.unshift(s);LS.set('rko_reports',list.slice(0,30));
 setTimeout(()=>{if(isFull())showReport(s);else{show('home');toast('Akcja zapisana. Raport i PDF – w wersji pełnej.')}},1200)}
// ---- wznowienie po zamknięciu ----
const pend=LS.get('rko_cur',null);if(pend&&pend.mode&&pend.mode!=='ended'){$('#resume').classList.remove('hide');$('#resT').textContent=RKO.hhmm(pend.t0)}
$('#resGo').onclick=()=>{$('#resume').classList.add('hide');begin(false,pend)};
// v1.9: po zabiciu aplikacji w trakcie akcji – wznów automatycznie (z oczekującym pytaniem)
if(pend&&pend.mode&&pend.mode!=='ended'&&Date.now()-(pend.nowT||pend.t0)<30*60000){setTimeout(()=>{$('#resume').classList.add('hide');begin(false,pend)},400)}
$('#resEnd').onclick=()=>{E=engine();E.s=pend;E.s.q=[];E.finish=E.finish.bind(E);E.out=()=>{};E.finish();$('#resume').classList.add('hide');finished()};
// ---- raport ----
let curRep=null;
function esc(t){return String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function tbl(rows){return '<table>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table>'}
function repBlocks(s){const r=RKO.report(s);const d=new Date(s.t0).toLocaleDateString('pl-PL');const B=[];
 B.push({text:'RKO SOR – raport przekazania (OIT) – '+d,h:1});if(s.sim)B.push({text:'SYMULACJA – NIE DO DOKUMENTACJI PACJENTA',b:true});
 if(s.summary){B.push({text:'Podsumowanie symulacji',h:2},{table:[...s.summary.good.map(x=>['✅ dobrze',x]),...s.summary.late.map(x=>['⏱ spóźnione',x]),...s.summary.miss.map(x=>['❌ pominięte',x]),['Czas bez ucisku',s.summary.handsOff+' s'],['Wyładowania',String(s.summary.shocks)]]})}
 B.push({text:'Pacjent: ____________________  PESEL: ______________ (uzupełnić w systemie szpitalnym)'});
 B.push({text:'Najważniejsze (30 s)',h:2},{table:r.sum});if(s.wywiad)B.push({text:'Wywiad',h:2},{text:RKO.anonymize(s.wywiad,{free:true})});
 if(r.missing.length)B.push({text:'Brakujące dane: '+r.missing.join(', ')});
 B.push({text:'Leki (godzina, lek, dawka)',h:2},{table:r.drugs.length?r.drugs:[['—','brak']]});
 B.push({text:'4H i 4T (✓ potwierdzona, ✗ wykluczona, – niesprawdzona)',h:2},{table:r.ht});
 B.push({text:'Pełna oś czasu',h:2,pb:1},{table:r.timeline.map(row=>[row[0],row[1],RKO.anonymize(row[2])])});
 B.push({text:'Wygenerowano: RKO SOR v'+RKO.VERSION+', ERC 2025. Dawki µg/kg/min wyłącznie w dokumentacji; lektor podaje przepływ w ml/h.'});
 B.push({text:'Podpis lekarza: ______________________   Godzina przekazania: ________'});return B}
function showReport(s){curRep=s;const B=repBlocks(s);
 $('#rep').innerHTML=B.map(b=>b.table?tbl(b.table):b.h==1?'<h1>'+esc(b.text)+'</h1>':b.h?'<h2 class="'+(b.pb?'pb':'')+'">'+esc(b.text)+'</h2>':'<p class="'+(/SYMULACJA/.test(b.text)?'simw':'')+'">'+esc(b.text)+'</p>').join('');show('report')}
function docxBytes(s){return DOCX.build(repBlocks(s))}
function fname(s){const d=new Date(s.t0);const p=n=>String(n).padStart(2,'0');return 'RKO_SOR_'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes())+(s.sim?'_SYMULACJA':'')+'.docx'}
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
async function saveDocx(s){const F=plug('Filesystem'),bytes=docxBytes(s),name=fname(s);
 if(F){const r=await F.writeFile({path:name,data:b64(bytes),directory:'CACHE'});return {uri:r.uri,name}}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));a.download=name;a.click();return {name}}
async function sendReport(s,silent){const to=cfg.email;
 // v1.9.7 (B10): bez adresu – prośba o adres (nie podgląd AI)
 if(!to){if(!silent){if(curRep!==s)showReport(s);askEmail(s)}return}
 const q=LS.get('rko_queue',[]);if(!q.includes(s.id||('R'+s.t0)))q.push(s.id||('R'+s.t0));LS.set('rko_queue',q);updQ();
 // v1.9.7 (B6): prawdziwe sprawdzenie sieci; bez sieci raport czeka w kolejce
 if(!(await probe())){Voice.say(RKO.SAY.queued);toast('Brak sieci – raport w kolejce ('+LS.get('rko_queue',[]).length+'). Wyślij później: Raporty → „Wyślij kolejkę teraz”.');updQ();return}
 try{const f=await saveDocx(s);const N=plug('RkoNative');const subj='Raport RKO SOR '+new Date(s.t0).toLocaleString('pl-PL')+(s.sim?' (SYMULACJA)':'');
  const body='Raport z aplikacji RKO SOR w załączniku (DOCX). Bez danych osobowych – uzupełnij w systemie szpitalnym.';
  if(N)await N.sendEmail({to,subject:subj,body,uri:f.uri});else location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body+' Plik '+f.name+' został pobrany – dołącz go.');
  LS.set('rko_queue',LS.get('rko_queue',[]).filter(x=>x!==(s.id||('R'+s.t0))));if(!silent)Voice.say(RKO.SAY.sent)}catch(e){Voice.say(RKO.SAY.queued)}updQ()}
let emqRep=null;function askEmail(s){emqRep=s;$('#emqI').value=cfg.email||'';$('#emqE').textContent='';$('#emq').classList.remove('hide');setTimeout(()=>$('#emqI').focus(),100)}
$('#emqX').onclick=()=>{$('#emq').classList.add('hide');emqRep=null};
$('#emqGo').onclick=()=>{const v=$('#emqI').value.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){$('#emqE').textContent='Wpisz poprawny adres e-mail.';return}cfg.email=v;LS.set('rko_cfg',cfg);$('#email').value=v;$('#emq').classList.add('hide');const s=emqRep;emqRep=null;if(s)sendReport(s)};
function flushQueue(auto){const q=LS.get('rko_queue',[]);if(!q.length||!cfg.email||(E&&E.s.mode!=='ended'&&E.s.mode!=='idle'))return;const rep=LS.get('rko_reports',[]).find(r=>r.id===q[0]);
 if(rep&&!auto)sendReport(rep,true);updQ()}
function updQ(){const n=LS.get('rko_queue',[]).length;$('#qn').textContent=n?'('+n+' w kolejce)':''}updQ();
$('#back').onclick=()=>show('home');$('#docx').onclick=()=>curRep&&saveDocx(curRep).then(f=>{const N=plug('RkoNative');if(N&&f.uri)N.share({uri:f.uri,title:f.name})});
$('#send').onclick=()=>curRep&&sendReport(curRep);
function repText(s){return repBlocks(s).map(b=>b.table?b.table.map(r=>r.join(' | ')).join('\n'):b.h?'\n'+b.text.toUpperCase():b.text).join('\n')}
$('#copy').onclick=()=>curRep&&copyText(repText(curRep)).then(()=>toast('Raport skopiowany'));
$('#pdf').onclick=async()=>{if(!curRep)return;const N=NAT();if(N&&N.pdf){try{const r=await N.pdf({name:fname(curRep).replace(/\.docx$/,'.pdf')});await N.share({uri:r.uri,title:r.name,mime:'application/pdf'})}catch(e){toast('PDF: '+(e.message||e))}}else window.print()};
$('#wywR').onclick=()=>curRep&&openWyw(curRep);
function openAI(s){if(!s)return;if(!needFull('Wysyłka do AI'))return;$('#aipT').value=RKO.AI_PROMPT+'\n\n'+RKO.anonymize(repText(s));$('#aipOk').checked=false;$('#aip').classList.remove('hide')}
// v1.9.5: jedno dotknięcie – kopiuje raport do schowka i otwiera menu udostępniania
async function aiOneTap(s){if(!s||!needFull('Wysyłka do AI'))return;const t=RKO.AI_PROMPT+'\n\n'+RKO.anonymize(repText(s));await copyText(t);toast('Raport skopiowany — wklej w ChatGPT');const N=NAT();
 try{if(N&&N.shareText)await N.shareText({text:t,title:'Raport RKO – do poprawy stylu'});else if(navigator.share)await navigator.share({text:t})}catch(e){}}
$('#ai').onclick=()=>aiOneTap(curRep);$('#aiPrev').onclick=()=>openAI(curRep);
$('#aipX').onclick=()=>$('#aip').classList.add('hide');
$('#aipGo').onclick=async()=>{if(!$('#aipOk').checked){toast('Najpierw sprawdź podgląd i zaznacz potwierdzenie');return}const t=RKO.anonymize($('#aipT').value);const N=NAT();
 try{if(N&&N.shareText)await N.shareText({text:t,title:'Raport RKO – do poprawy stylu'});else if(navigator.share)await navigator.share({text:t});else{await copyText(t);toast('Skopiowano – wklej w aplikacji AI')}}catch(e){}$('#aip').classList.add('hide')};
$('#dnd').onclick=()=>{if(!nat('dnd'))toast('Dostępne w aplikacji Android')};
$('#pin').value=cfg.pin||'0';$('#pin').onchange=()=>{cfg.pin=$('#pin').value;LS.set('rko_cfg',cfg)};
$('#licCopy').onclick=copyId;$('#licCopy2').onclick=copyId;
$('#licGo').onclick=()=>{const c=$('#licCode').value.trim();const v=LIC.verify(c,instId,LIC.APPS.RKO);if(!v.ok){$('#licRes').textContent='✗ '+v.reason;return}LS.set('rko_code',c);licCheck();$('#licRes').textContent=LICS.full?'✓ aktywowano':'✗ kod wygasł';$('#licCode').value=''};
licCheck();
// v1.9.1: licencja, numer instalacji i ustawienia kopiowane do pamięci natywnej; po aktualizacji odtwarzane, jeśli WebView je zgubił
const KEEP=['rko_inst','rko_code','rko_maxseen','rko_cfg'];
(async()=>{const N=NAT();if(!N||!N.kvGet)return;let changed=false;for(const k of KEEP){try{const loc=localStorage.getItem(k);const r=await N.kvGet({k});
 if(r&&r.v!=null&&(loc==null||(k==='rko_inst'&&loc!==r.v))){localStorage.setItem(k,r.v);changed=true}else if(loc!=null&&(!r||r.v!==loc))await N.kvSet({k,v:loc})}catch(e){}}
 if(changed){instId=LS.get('rko_inst',instId);Object.assign(cfg,LS.get('rko_cfg',{}));licCheck()}})();
{const _set=LS.set;LS.set=(k,v)=>{_set(k,v);if(KEEP.includes(k)){const N=NAT();if(N&&N.kvSet)N.kvSet({k,v:JSON.stringify(v)}).catch(()=>{})}}}
// v1.9: sprawdzenie aktualizacji (GitHub releases) – tylko baner
function verNum(v){return String(v||'').replace(/^v/i,'').split('.').map(n=>+n||0)}
function newer(a,b){const x=verNum(a),y=verNum(b);for(let i=0;i<Math.max(x.length,y.length);i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)>(y[i]||0)}return false}
async function updCheck(){if(!isFull()||!navigator.onLine)return;try{const r=await fetch('https://api.github.com/repos/j736107-beep/rko-sor/releases/latest',{cache:'no-store'});if(!r.ok)return;const j=await r.json();
 if(j&&j.tag_name&&newer(j.tag_name,RKO.VERSION)){const b=$('#updban');b.textContent='Dostępna nowa wersja '+j.tag_name.replace(/^v/,'')+' – poproś autora o plik instalacyjny.';b.classList.remove('hide')}}catch(e){}}
setTimeout(updCheck,2500);
window.__rkoTest={newer,repText:()=>curRep&&repText(curRep),licCheck,get LICS(){return LICS},instId};
$('#print').onclick=()=>{const N=plug('RkoNative');if(N)N.print({name:'Raport RKO SOR'});else window.print()};
function renderList(){const L=LS.get('rko_reports',[]),q=LS.get('rko_queue',[]);$('#rlist').innerHTML=L.length?'':'<p>Brak raportów.</p>';
 L.forEach(s=>{const d=document.createElement('div');d.className='card';d.innerHTML='<span>'+new Date(s.t0).toLocaleString('pl-PL')+(s.sim?' · SYMULACJA':'')+(q.includes(s.id)?' · ✉ w kolejce':'')+'</span>';const b=document.createElement('button');b.textContent='Otwórz';b.onclick=()=>showReport(s);d.appendChild(b);$('#rlist').appendChild(d)});
 if(q.length&&cfg.email){const b=document.createElement('button');b.textContent='Wyślij kolejkę teraz';b.onclick=()=>flushQueue(false);$('#rlist').appendChild(b)}}
// ---- test startowy ----
($('#voicetest')||{}).onclick=()=>{Voice.unlock();const S=RKO.SAY;[S.start,S.call,S.defib,S.iv,S.team,'Ustaw pompę 2,6 mililitra na godzinę.',S.warn15,S.rhythm,RKO.vfInstr('mindray',0),S.afterShock,'Dociągnij 450 miligramów amiodaronu do 500 mililitrów 5% glukozy. Ustaw kroplówkę na siedem kropli na minutę, czyli jedna kropla co osiem sekund. Wlew przez 24 godziny. Tylko glukoza 5%.','Średnie ciśnienie wynosi 72.','Zdanie spoza nagrań, czytane syntezatorem telefonu: test numer 17.'].forEach(t=>Voice.say(t));
 const t0=Date.now();const h=sp=>{if(!sp){Voice.hooks.splice(Voice.hooks.indexOf(h),1);$('#stres').textContent='Test lektora: '+Math.round((Date.now()-t0)/1000)+' s, nagrań '+Voice.stats.clips+', syntezator '+Voice.stats.tts+', awaryjnie '+Voice.stats.fallback+(Voice.ctx?', WebAudio '+Voice.ctx.sampleRate+' Hz':', bez WebAudio')}};Voice.hooks.push(h)};
{const N=plug('RkoNative');if(N)N.maxVolume().catch(()=>{})}
($('#selftest')||{}).onclick=async()=>{const o=[];Voice.unlock();o.push('Nagrania lektora: '+Object.keys(Voice.clips).length);Voice.say('Test lektora. Słychać mnie dobrze?');Voice.say('Ustaw pompę 2,6 mililitra na godzinę.');
 try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();o.push('Pamięć: wolne ok. '+Math.round((e.quota-e.usage)/1e6)+' MB')}}catch(e){}
 const SR=plug('SpeechRecognition');if(SR){try{const a=await SR.available();o.push('Rozpoznawanie mowy: '+(a.available?'dostępne':'BRAK'));const p=await SR.requestPermissions();o.push('Mikrofon: '+p.speechRecognition)}catch(e){o.push('Mikrofon: błąd '+e.message)}}
 else o.push('Rozpoznawanie mowy (przeglądarka): '+((window.SpeechRecognition||window.webkitSpeechRecognition)?'dostępne (Chrome wymaga sieci)':'brak – tylko przyciski'));
 $('#stres').textContent=o.join('\n')};
function renderHelp(){$('#helpc').innerHTML=`<h2>Co nowego w wersji 2.1.3</h2><ul><li>Usunięty napis o dostępności sieci („sieć dostępna” / „offline”) – był mylący (np. w trybie samolotowym), a aplikacja działa bez sieci. Sprawdzanie aktualizacji i wysyłka kolejki raportów działają dalej po cichu.</li></ul><h2>Co nowego w wersji 2.1.2</h2><ul><li><b>Mikrofon „brak uprawnienia”:</b> czerwony przycisk mikrofonu (napis <b>ZEZWÓL</b>) teraz naprawdę prosi Androida o zgodę na mikrofon. Jeśli telefon zablokował mikrofon na stałe (wcześniej wybrano „Nie zezwalaj”), pojawia się instrukcja: Ustawienia telefonu → Aplikacje → RKO SOR → Uprawnienia → Mikrofon → „Zezwalaj tylko podczas używania aplikacji”. Po powrocie do aplikacji mikrofon włącza się sam. Stan uprawnienia widać w Ustawieniach → Mikrofon.</li><li><b>Ustawienia bez powtórzeń:</b> każde ustawienie jest tylko raz – karty Lektor, Metronom i Mikrofon na górze, niżej leki i sprzęt.</li><li>Pytanie lektora widoczne na ekranie raz (pole pod zegarem), komunikat nie jest odtwarzany drugi raz po krótkim przerwaniu dźwięku przez system. Uwaga: „Przypominam…” po 30 s bez odpowiedzi to zamierzone przypomnienie pytania.</li><li>Wąski ekran telefonu: WYWIAD, napis w przycisku mikrofonu, pasek stanu mikrofonu i podpowiedź mieszczą się w całości.</li></ul><h2>Co nowego w wersji 2.1.1</h2><ul>
<li><b>Mikrofon naprawiony:</b> domyślnie wraca sprawdzony w 2.0.0 tryb „słucha w trakcie krótkich pytań”; po aktualizacji z 2.0.0/2.1.0 mikrofon jest włączony. Zabezpieczenia: brak sygnału gotowości rozpoznawacza nie blokuje mikrofonu (po chwili traktowany jako aktywny), strażnik wznawia mikrofon wstrzymany po komunikacie lektora, a mikrofon wyłączony w trakcie akcji (poza brakiem uprawnienia) uruchamia się ponownie sam w ciągu kilku sekund. Błąd ustawień albo lektora nie wyłącza mikrofonu.</li>
<li><b>⚙ Ustawienia</b> – duży przycisk na ekranie startowym (i ⚙ na ekranie akcji). Na górze: <b>Lektor ♂ Męski / ♀ Damski</b> z przyciskiem „▶ Odsłuchaj”, <b>Głośność lektora</b> (50–200%, „▶ Test”), <b>Głośność metronomu</b> (5–100%, „▶ Test”). Zapisywane od razu na stałe.</li>
<li><b>Komenda kończąca: „zakończ”</b> (także „zakończyć”, „kończymy”, „koniec akcji”) – natychmiastowe zakończenie akcji bez potwierdzenia, raport zapisany; lektor mówi: „Kończę akcję. Raport zapisany.” Lektor nigdy nie wypowiada tych słów, więc nie zakończy akcji „echem”. „Nie zakończ” nie kończy akcji. Przycisk ZAKOŃCZ na ekranie nadal pyta o potwierdzenie („TAK, ZAKOŃCZ”).</li>
<li>Tryb „słucha zawsze, także w trakcie długich komunikatów” – dostępny w Ustawieniach jako eksperymentalny.</li>
<li>Dawki i algorytmy leków bez zmian.</li></ul>
<h2>Co nowego w wersji 2.1.0</h2><ul>
<li><b>Kolory mikrofonu (nowe):</b><br>🟡 <b>żółty, miga</b> – przygotuj się do odpowiedzi: lektor kończy pytanie albo mikrofon się uruchamia;<br>🟢 <b>zielony, miga</b> – mikrofon NAPRAWDĘ słucha (rozpoznawacz zgłosił gotowość) – mów teraz;<br>🔵 <b>niebieski</b> – rozpoznano (obok nazwa komendy);<br>⚪ <b>szary z przerywaną ramką „✕ ?”</b> – nie rozpoznano, powiedz jeszcze raz; szary bez ramki – mikrofon czeka;<br>🔴 <b>czerwony</b> – błąd mikrofonu lub brak uprawnienia – użyj przycisków.</li>
<li><b>Komendy działające w każdej chwili</b> – także w trakcie lektora i bez względu na to, czy jest pytanie:<br>• <b>„tak”</b> = potwierdzam otwarte pytanie, <b>„nie”</b> = nie potwierdzam (gdy nie ma pytania – wskaźnik pokaże „brak otwartego pytania”);<br>• <b>„zaintubowany” / „zaintubowana” / „zaintubowano” / „intubacja” / „rurka założona”</b> – intubacja zapisana od razu z godziną, lektor potwierdza krótko („Zaintubowany, przyjąłem/przyjęłam”), otwarte pytanie o intubację znika i aplikacja NIGDY więcej nie pyta o drogi oddechowe w tej akcji;<br>• <b>„zakończ”</b> (od 2.1.1) – natychmiastowe zakończenie akcji (bez potwierdzenia, raport zapisany).</li>
<li><b>Szybsze „tak/nie”:</b> mikrofon słucha także w trakcie lektora (echo lektora jest odfiltrowywane – usuwane są słowa, które lektor mówił w chwili, gdy zaczęła się wypowiedź; „tak” albo „wyładowano” po „Powiedz: …” zawsze liczy się jako odpowiedź), a ok. 0,35 s przed końcem pytania rozpoznawacz zaczyna nową sesję, więc jest gotowy dokładnie wtedy, gdy lektor kończy. „Tak/nie” wykonuje się z pierwszego wyniku pośredniego, bez czekania.</li>
<li><b>Lektor męski albo damski</b> (Ustawienia → „Lektor i głośność”) – oba głosy spokojne, rzeczowe; nowy damski głos jest wolniejszy i niższy. Domyślnie męski.</li>
<li><b>Ustawienia mikrofonu:</b> „Mikrofon w trakcie komunikatów lektora” (od 2.1.1 zalecane: w trakcie krótkich pytań; „zawsze” – eksperymentalne).</li>
<li>Dawki i algorytmy leków bez zmian.</li></ul>
<h2>Co nowego w wersji 2.0.0</h2><ul>
<li><b>Przyczyny odwracalne (4H/4T) – nowy, krótki przebieg.</b> Od 2. cyklu lektor mówi „Przyczyny odwracalne.” i zadaje po kolei 10 krótkich pytań: Hipoksja? · Hipowolemia? · Hiper- lub hipokaliemia? · Hipoglikemia? · Hipotermia lub hipertermia? · Zakrzepica wieńcowa? · Zatorowość płucna? · Odma prężna? · Tamponada? · Zatrucie?<br>Odpowiedź: <b>TAK</b> albo <b>NIE</b> (duże przyciski, zawsze w tym samym miejscu, albo głosem). Po „tak” aplikacja NIE rozwija pytań – idzie dalej przez całą listę. Odpowiedź „nie” zamyka przyczynę.</li>
<li><b>Jedno podsumowanie na końcu</b> – tylko przyczyny z odpowiedzią „tak”, z konkretnymi działaniami (treści i dawki bez zmian: wapń → insulina z glukozą → wodorowęglan w hiperkaliemii, alteplaza w zatorowości itd.). Przy „Hiper- lub hipokaliemia?” i „Hipotermia lub hipertermia?” pada jedno doprecyzowanie (dwa przyciski), bo leczenie jest przeciwne.</li>
<li><b>COFNIJ</b> – przez 5 s po każdej odpowiedzi cofa ostatnią odpowiedź i ponawia pytanie. Postęp listy i przyczyny „TAK” widać na ekranie (np. „4H/4T 4/10 · TAK: hipoksja”), pełna tabela – w raporcie.</li>
<li><b>Głos „tak”/„nie” – szybciej i pewniej:</b> krótkie „tak”/„nie” wykonuje się od razu z wyniku pośredniego, gdy pytanie jest otwarte; słowo nie przepada, gdy rozpoznawacz zgłosi „brak dopasowania” lub zakończy sesję; sprawdzane są wszystkie alternatywy; więcej odmian („jest”, „obecna”, „potwierdzam” / „brak”, „nieobecna”, „negatywnie”, „wykluczona”); podwójne wykonanie zablokowane.</li>
<li><b>Mikrofon zostaje włączony w trakcie krótkich pytań</b> („Hipoksja?”) – można odpowiadać od razu, bez martwej strefy ponownego uruchamiania rozpoznawacza.</li>
<li><b>Zakończenie akcji na dwa sposoby:</b> przycisk <b>ZAKOŃCZ</b> (dotyk; potem „TAK, ZAKOŃCZ”) albo komenda głosowa kończąca akcję natychmiast (od 2.1.1: <b>„zakończ”</b>). Raport zapisuje się jak przy zwykłym zakończeniu, dane nie giną.</li>
<li><b>Metronom ciszej w trakcie pytania tak/nie</b> (do 6 s lub do odpowiedzi). Ustawienia: „Mikrofon w trakcie krótkich pytań”, „Metronom w trakcie pytania tak/nie”.</li></ul>
<h2>Co nowego w wersji 1.9.9</h2><ul><li><b>Wskaźnik mikrofonu</b> (kolory zmienione w 2.1.0 – patrz wyżej; duży przycisk z mikrofonem i pasek obok – stałe miejsce, nic się nie przesuwa):<br>🟢 <b>zielony, miga</b> – mikrofon słucha, mów komendę;<br>🔵 <b>niebieski</b> (ok. 1,3 s) – rozpoznano polecenie, obok jego nazwa;<br>🟡 <b>żółty</b> – wypowiedź nierozpoznana („nie rozpoznano”) – powiedz jeszcze raz;<br>⚪ <b>szary</b> – mikrofon czeka (mówi lektor) albo wyłączony;<br>🔴 <b>czerwony</b> – błąd mikrofonu lub brak uprawnienia – użyj przycisków.</li><li>Nasłuch ciągły w trakcie akcji: komendy działają w każdej chwili, nie tylko 8 s po pytaniu (Ustawienia → „Nasłuch mikrofonu”).</li><li>Szybsza reakcja: jednoznaczna komenda wykonuje się już z wyniku pośredniego (0,2 s), mikrofon wraca 0,08 s po komunikacie lektora, zawieszony rozpoznawacz jest restartowany automatycznie.</li><li>Komenda wypowiedziana tuż przed komunikatem lektora nie przepada – wykona się zaraz po nim.</li><li>Więcej odmian komend: „podałem/dałem adrenalinę”, „adrenalina poszła”, „podałam amiodaron”, „strzał”, „mamy tętno”, „wyczuwam tętno”, „potwierdzam”, „zgadza się”, „negatywnie”.</li></ul><h2>Co nowego w wersji 1.9.8</h2><ul><li>Przegląd treści medycznej z ERC 2025 (ALS, okoliczności szczególne) i ERC–ESICM 2025 (opieka po ROSC).</li><li>Hiperkaliemia w zatrzymaniu krążenia: po chlorku wapnia i insulinie z glukozą lektor prosi o wodorowęglan sodu 50 mmol (innym dostępem albo po przepłukaniu linii).</li><li>4H/4T: dodane hipokaliemia (KCl 20 mmol i.v. w 2–3 min, potem 10 mmol w 2 min, wyrównać magnez) oraz hipertermia (aktywne chłodzenie; hipertermia złośliwa – dantrolen 2,5 mg/kg).</li><li>Dostęp: najpierw dożylny, po dwóch nieudanych próbach doszpikowy. Przyrząd nadgłośniowy: preferowany i-gel. Rurka: potwierdzenie stałym zapisem kapnografii.</li><li>Bradykardia po urazie rdzenia kręgowego: rozważ aminofilinę 100–200 mg i.v. powoli.</li><li>Po ROSC: cel MAP &gt;60–65 mmHg (ERC–ESICM 2025).</li><li>Bez zmian (lokalny standard): insulina, alteplaza 50 mg, wlew amiodaronu po ROSC, heparyna, glukoza 20% 100 ml, kolejność wapnia i insuliny.</li></ul><h2>Co nowego w wersji 1.9.7</h2><ul class="small">
<li>COFNIJ ma stałe miejsce nad przyciskami – przyciski już się nie przesuwają. COFNIJ działa 0,6 s po pojawieniu się, a przypadkowe podwójne dotknięcie (do 0,5 s) jest ignorowane.</li>
<li>Po zamknięciu aplikacji po ROSC wracają pomiary: ciśnienie (pętla MAP), SpO₂, EKG, temperatura, glikemia i GCS.</li>
<li>Dane osobowe (PESEL także ze spacjami i myślnikami, telefony, e-maile, daty, adresy, imiona i nazwiska) są usuwane z wywiadu przy zapisie oraz z raportu, PDF, DOCX, e-maila i tekstu dla AI.</li>
<li>Działa przycisk „Kopiuj raport (tekst)”.</li>
<li>Wskaźnik sieci naprawdę sprawdza połączenie (tryb samolotowy = „offline”); bez sieci e-mail trafia do kolejki. E-mail bez ustawionego adresu prosi o adres.</li>
<li>ERC 2025: po 3 wyładowaniach podpowiedź zmiany położenia elektrod na przednio-tylne; seria 3 wyładowań seryjnych liczona jako 1. wyładowanie przy lekach; przy bloku z szerokim QRS i po przeszczepie serca „nie podawaj atropiny” (stymulacja, izoprenalina lub adrenalina; po przeszczepie aminofilina 100–200 mg i.v. powoli); glukagon 3–10 mg i.v. przy podejrzeniu β-blokera lub blokera kanału wapniowego; po ROSC cele: normokapnia PaCO₂ 35–45 mmHg i zapobieganie gorączce (≤37,5 °C przez 72 h u nieprzytomnego).</li>
<li>Drobne: pełna nazwa rytmu „asystolia/PEA”, spójny czas RKO w raporcie (min i s), poprawione podsumowanie symulacji, układ poziomy z przyciskami po prawej.</li></ul>
<h2>Najważniejsze (v1.9)</h2><p class="small">Przyciski są główne. Mikrofon słucha przez całą akcję (gdy miga na zielono); w trakcie komunikatu lektora czeka. Głosem: komendy i „TAK” / „NIE”. Ocena rytmu: „Czy migotanie komór albo częstoskurcz bez tętna?” → „Czy asystolia?” → „Czy jest tętno?” (NIE = PEA, TAK = ROSC; brak odpowiedzi 10 s = brak tętna). Po ROSC: „Czy rytm zatokowy?” → „Czy migotanie przedsionków?” → inny nadkomorowy. Skróty VF / pVT / ASYSTOLIA / PEA / TĘTNO są zawsze na ekranie. Po każdym potwierdzeniu przez 5 s widać COFNIJ (stałe miejsce nad przyciskami, aktywny po 0,6 s). Zegar cyklu: zielony = uciskanie, żółty = ocena rytmu za ≤15 s. Przerwa w uciskaniu &gt;10 s = ostrzeżenie.</p><h2>Inne komendy głosowe</h2><p class="small">„migotanie komór” / „częstoskurcz bez tętna” / „asystolia” / „PEA” / „tętno” · „RKO od 20 minut” (pacjent przywieziony) · „wyładowano” · „nie mogę uciskać” · „intubacja” · „USG” · „zatrzymanie” · „zwiększ”/„utrzymaj” · liczby („120 na 80”) · „pauza”/„dalej” · „wlew heparyny”, „wlew amiodaronu”, „wlew adrenaliny” (wersja pełna) · „powtórz” · „zakończ” (natychmiast, bez potwierdzenia).</p><h2>Raport</h2><p class="small">Po akcji: PDF (jedno dotknięcie), DOCX, „Kopiuj raport (tekst)”, Wywiad, „Wyślij do AI” (podgląd obowiązkowy). Dane osobowe są usuwane automatycznie z wywiadu, raportu, PDF, DOCX, e-maila i tekstu dla AI – mimo to sprawdź podgląd.</p>
<h2>Wysyłka raportu – instrukcja dla lekarza</h2><ol class="small"><li>Ustawienia → „Mój e-mail” → wpisz swój adres (raz).</li><li>Po zakończeniu: przycisk „WYŚLIJ” albo komenda „wyślij na moją skrzynkę”.</li><li>Otworzy się program poczty z adresem i załącznikiem DOCX – zatwierdź „Wyślij”.</li><li>Bez sieci raport czeka w kolejce (Raporty → „Wyślij kolejkę teraz”).</li><li>Na komputerze: otwórz pocztę lub chmurę tego samego konta i pobierz plik.</li></ol>
<p class="small">Raport nie zawiera nazwiska ani PESEL – aplikacja usuwa je także z wywiadu. Zgodność z RODO – DO WERYFIKACJI z IOD.</p>`}
if('serviceWorker' in navigator&&!window.isNative&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
Voice.init();
window.__rko={get E(){return E},probe,handle,show,showReport,docxBytes,wake,nat,repBlocks,toast,copyText,get LICS(){return LICS},instId,isFull,updCheck,newer,active,mic};
})();
