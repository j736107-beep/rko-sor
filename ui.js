/* RKO SOR – interfejs (podgląd) */
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const cfg=Object.assign({email:'',energy:'mindray',syr:'',paceEl:'ap',atroAmp:'0.5',iso:'1/50',dopa:'200/50',adrinf:'1/50',sayConc:'1',pacer:'mindray',fentConc:'50',midaConc:'1',midaAmp:'5/1',atroDose:'0.5',stacked:'0',metro:'1',metroRate:'110',metroVol:'0.15',metroLucas:'1',barge:'min',amioMode:'drip',dropSet:'20',hep:'25000/50',hepAmp:'5000',amioInf:'900/50'},LS.get('rko_cfg',{}));if(!cfg.m161){cfg.metroLucas='1';cfg.m161=1;try{LS.set('rko_cfg',cfg)}catch(e){}}if(!cfg.m17){if(cfg.metroVol==='0.3')cfg.metroVol='0.15';cfg.m17=1;try{LS.set('rko_cfg',cfg)}catch(e){}}
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
function show(id){if((id==='settings'||id==='reports')&&!needFull(id==='settings'?'Ustawienia':'Historia raportów'))return;$$('.scr').forEach(s=>s.classList.toggle('on',s.id===id));if(id==='reports')renderList();if(id==='help')renderHelp();window.scrollTo(0,0)}
$$('[data-s]').forEach(b=>b.onclick=()=>show(b.dataset.s));
$('#ver').textContent=RKO.VERSION;
// ---- ustawienia ----
for(const k in RKO.ENERGY_LABEL){const o=document.createElement('option');o.value=k;o.textContent=RKO.ENERGY_LABEL[k];$('#energy').appendChild(o)}
$('#email').value=cfg.email;$('#energy').value=cfg.energy;$('#syr').value=cfg.syr;
$('#paceEl').value=cfg.paceEl;for(const k in RKO.PACEMAX){const o=document.createElement('option');o.value=k;o.textContent=RKO.PACEMAX[k].label;$('#pacer').appendChild(o)}
const KS=['atroAmp','iso','dopa','adrinf','sayConc','pacer','fentConc','midaConc','midaAmp','atroDose','stacked','hep','hepAmp','amioMode','dropSet','barge','metro','metroRate','metroVol','metroLucas'];KS.forEach(k=>$('#'+k).value=cfg[k]);['email','energy','syr','paceEl'].concat(KS).forEach(k=>$('#'+k).onchange=()=>{cfg[k]=$('#'+k).value.trim();LS.set('rko_cfg',cfg)});
function net(){$('#net').textContent=navigator.onLine?'☁ sieć dostępna':'✈ offline';if(navigator.onLine)flushQueue(true)}
addEventListener('online',net);addEventListener('offline',net);net();
// ---- start ----
async function wake(on){const K=plug('KeepAwake');try{if(K){on?await K.keepAwake():await K.allowSleep();return}
 if(on&&navigator.wakeLock)wl=await navigator.wakeLock.request('screen');if(!on&&wl){wl.release();wl=null}}catch(e){}}
function concCfg(){const o={};for(const k of ['iso','dopa','adrinf']){const m=String(cfg[k]).split('/').map(Number);if(m.length===2&&m[0]>0&&m[1]>0)o[k]={mg:m[0],ml:m[1]}}return o}
function engine(){return new RKO.Engine({full:isFull(),energy:cfg.energy,paceEl:cfg.paceEl,fentConc:+String(cfg.fentConc).replace(',','.')||50,midaConc:+String(cfg.midaConc).replace(',','.')||1,midaAmpMg:+cfg.midaAmp.split('/')[0]||5,midaAmpMl:+cfg.midaAmp.split('/')[1]||1,atroDose:+cfg.atroDose,stacked:cfg.stacked==='1',amioMode:cfg.amioMode,dropSet:+cfg.dropSet,hepAmp:+String(cfg.hepAmp).replace(',','.')||5000,hep:{u:+cfg.hep.split('/')[0]||25000,ml:+cfg.hep.split('/')[1]||50},amioInf:{mg:+cfg.amioInf.split('/')[0]||900,ml:+cfg.amioInf.split('/')[1]||50},paceMax:(RKO.PACEMAX[cfg.pacer]||RKO.PACEMAX.mindray).mA,atroAmp:+cfg.atroAmp,sayConc:cfg.sayConc!=='0',conc:concCfg(),out:(t,k)=>{Voice.say(t,k);said.push(t);said=said.slice(-3);$('#said').innerHTML=said.map((x,i)=>i===said.length-1?'<b>'+x+'</b>':'<span class="old">'+x+'</span>').join('<br>')},alarm:()=>Voice.alarm(),persist:s=>LS.set('rko_cur',s)})}
const NAT=()=>plug('RkoNative');
function nat(m,o){const N=NAT();if(N&&N[m])return N[m](o||{}).catch(()=>{})}
function begin(sim,resumeState){if(sim&&!needFull('Symulacja'))return;if(typeof mic!=='undefined'&&mic.on){mic.on=false;clearTimeout(mic.t);Ears.stop()}Voice.unlock();E=engine();
 Ears.windowMode=true;if(resumeState){E.resume(resumeState)}else E.start({sim,email:cfg.email,syr:cfg.syr?+cfg.syr:null});
 Ears.classify=alts=>RKO.interpret(alts,E&&E.s&&E.s.mode!=='idle'?E.ctx():{});
 $('#simbar').classList.toggle('hide',!E.s.sim);$('#chg').classList.toggle('hide',!E.s.sim);
 Metro.start();show('run');wake(true);Metro.useNative=true;nat('action',{on:true});if(cfg.pin==='1')nat('pin',{on:true});$('#wywB').classList.toggle('hide',!isFull());Ears.onResult=(alts,conf,src)=>{if(!Ears.inWindow()){Ears.mark('poza oknem odpowiedzi – pominięto');return}handle(alts,false,conf)};Ears.barge=cfg.barge;startEarsAfterFirst();clearInterval(timer);timer=setInterval(loop,250);render()}
$('#go').onclick=()=>{if(E&&E.s&&E.s.mode!=='idle'&&E.s.mode!=='ended'){show('run');return}begin(false)};$('#sim').onclick=()=>begin(true);
// mikrofon dopiero po pierwszym komunikacie (start rozpoznawania zabiera fokus audio na Androidzie)
// v1.6.2: mikrofon startuje natychmiast po końcu pierwszego nagrania (pętla natywna i tak czeka, aż lektor zamilknie)
// v1.7: rozpoznawanie startuje od razu i słucha także podczas lektora (trwały rozpoznawacz natywny)
function startEarsAfterFirst(){setTimeout(()=>Ears.start(),300)}
let pendingIn=[];Voice.hooks.push(sp=>{if(!sp&&pendingIn.length){const q=pendingIn;pendingIn=[];q.forEach(a=>handle(a,true))}});
function handle(alts,direct,conf,src){if(mic.on){mic.res(alts);return}if(!E)return;alts=[].concat(alts);
 // v1.8: głos nigdy nie przerywa lektora (wynik w trakcie mowy → kolejka)
 if(!direct&&Voice.speaking){pendingIn.push(alts);Ears.mark('w kolejce (lektor mówi)');return}
$('#heard').textContent='mikrofon: '+[].concat(alts)[0];const before=E.s.cur&&E.s.cur.id,beforeTxt=E.s.cur&&E.s.cur.text,k0=RKO.btnKey(E.s);const r=RKO.interpret(alts,E.ctx());const c=E.input(alts,src||(direct?'przycisk':'głos'));
 if(c==='unmatched')$('#heard').textContent='nie rozpoznano: „'+alts[0]+'” – powiedz jeszcze raz albo użyj przycisku';
 else if(beforeTxt&&RKO.btnKey(E.s)!==k0&&!(E.s.cur&&E.s.cur.text===beforeTxt))Voice.skipStale(beforeTxt);Ears.mark(c&&c!=='unmatched'?('komenda: '+c+(r.fuzzy?' (przybliżone)':'')+(before?' [pytanie: '+before+']':'')):('nie pasuje'+(before?' [pytanie: '+before+']':'')));
 if(c==='send'){if(E.s.mode==='ended')sendReport(E.s);else E.say('Raport wyślę po zakończeniu.')}
 if(E.s.mode==='ended')finished();render()}
$$('.fb [data-c],.fb2 [data-c]').forEach(b=>b.onclick=()=>{Ears.addLog('przycisk',b.dataset.c);press(b,b.dataset.c);handle([b.dataset.c],true,null,'przycisk')});
// v1.8: przyciski kontekstowe – do bieżącego pytania lektora; kolor aktywny do przyjęcia komendy / następnego kroku
const PS=new RKO.PressState();let ctxKey=null;
function press(el,c){PS.press(c,Date.now());el.classList.add('act');setTimeout(()=>{el.classList.remove('act')},900)}
function renderCtx(force){const box=$('#ctxb');if(!box||!E)return;const key=RKO.btnKey(E.s),act=PS.sync(key,Date.now());
 if(force||key!==ctxKey){ctxKey=key;const L=RKO.buttonsFor(E.s);box.className='ctxb n'+Math.min(L.length,5);box.innerHTML='';
  L.forEach(x=>{const b=document.createElement('button');b.textContent=x.label;b.dataset.c=x.c;if(x.cls)b.classList.add('k'+x.cls);
   b.onclick=()=>{press(b,x.c);Ears.addLog('przycisk',x.c);if(x.c==='#num'){$('#numB').click();return}setTimeout(()=>{handle([x.c],true,null,'przycisk');renderCtx()},120)};box.appendChild(b)})}
 renderRhy(act);box.querySelectorAll('button').forEach(b=>b.classList.toggle('act',act!=null&&b.dataset.c===act))}
// v1.9: skróty rytmu zawsze widoczne w NZK
let rhyKey=null;function renderRhy(act){const box=$('#rhyb');if(!box||!E)return;const L=RKO.rhyButtons(E.s);const k=L.length+'|'+E.s.mode;if(k!==rhyKey){rhyKey=k;box.innerHTML='';box.classList.toggle('hide',!L.length);
 L.forEach(x=>{const b=document.createElement('button');b.textContent=x.label;b.dataset.c=x.c;if(x.cls)b.classList.add('k'+x.cls);b.onclick=()=>{press(b,x.c);Ears.addLog('przycisk',x.c);setTimeout(()=>{handle([x.c],true,null,'przycisk');renderCtx()},120)};box.appendChild(b)})}
 box.querySelectorAll('button').forEach(b=>b.classList.toggle('act',act!=null&&b.dataset.c===act))}
// v1.9: COFNIJ przez 5 s po każdym potwierdzeniu
function renderUndo(){const u=$('#undo');if(!E||!E.canUndo){u.classList.add('hide');return}const ok=E.canUndo();u.classList.toggle('hide',!ok);if(ok){const l=Math.max(0,5-Math.floor((Date.now()-E.undoSnap.t)/1000));$('#undoB').textContent='COFNIJ ('+l+')';$('#undoT').textContent=E.undoSnap.label.slice(0,60)}}
$('#undoB').onclick=()=>{if(!E)return;Voice.stop();Ears.addLog('przycisk','COFNIJ');if(E.undo())toast('Cofnięto');render()};
// v1.9: wywiad (tekst, dyktowanie klawiaturą)
let wywTarget=null;function openWyw(target){wywTarget=target;$('#wywT').value=target.wywiad||'';$('#wyw').classList.remove('hide');setTimeout(()=>$('#wywT').focus(),100)}
$('#wywB').onclick=()=>{if(!E||!needFull('Wywiad'))return;openWyw(E.s)};
$('#wywS').onclick=()=>{if(wywTarget){wywTarget.wywiad=$('#wywT').value.trim();if(E&&wywTarget===E.s){LS.set('rko_cur',E.s.mode==='ended'?null:E.s)}saveRep(wywTarget);if(curRep===wywTarget)showReport(curRep)}$('#wyw').classList.add('hide')};
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
Ears.onState=st=>{const el=$('#ears');el.textContent='🎤 '+st;el.classList.toggle('on',/^słucham/.test(st));if(mic.on)mic.show()};Ears.onHeard=t=>{$('#heard').textContent='mikrofon: '+t};
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
function loop(){if(!E)return;E.tick();if(E.s.mode!=='ended'&&Date.now()-(loop._p||0)>5000){loop._p=Date.now();LS.set('rko_cur',E.s)}{const w=E.metroWanted({on:cfg.metro!=='0',lucas:cfg.metroLucas!=='0'});Metro.want=w>0;Metro.rate=+cfg.metroRate||110;Metro.vol=(+String(cfg.metroVol).replace(',','.')||0.3)*(w||1)}render()}
function render(){if(!E)return;const s=E.s,now=Date.now();if(s.mode==='idle')return;
 $('#modeL').textContent=s.mode==='rosc'?'PO ROSC':s.mode==='ended'?'ZAKOŃCZONO':(s.paused?'NZK – PAUZA':'NZK');
 $('#tTot').textContent=mmss((s.tEnd||now)-s.arrestT);
 const left=120000-(now-s.cycleT);const chk=s.mode==='arrest'&&(left<15000||(s.cur&&['rhythm','rhyAsy','pulse'].includes(s.cur.id)));$('#tCyc').textContent=s.mode==='arrest'?mmss(left).slice(1):'—';$('#tCyc').classList.toggle('cy',chk);$('#tCyc').classList.toggle('cg',s.mode==='arrest'&&!chk);$('#tCycL').textContent=s.mode!=='arrest'?'—':chk?'OCENA RYTMU – przygotuj się':'uciskanie – do oceny rytmu';
 $('#rhy').textContent=s.mode==='rosc'?'ROSC':s.rhythm;$('#shk').textContent=s.shocks;
 let nx='—',due=false;
 if(s.mode==='arrest'){if(s.adrDue){const l=s.adrDue-now;due=l<=0;nx='Adrenalina 1 mg '+(due?'TERAZ':'za '+mmss(l))}else nx='Adrenalina: przy rytmie niedefibrylacyjnym od razu, VF po 3. wyładowaniu'}
 if(s.mode==='rosc'){nx=s.nora?'Noradrenalina '+RKO.fmt1(s.nora.mlh)+' ml/h':'Pętla ciśnienia';if(s.dobu)nx+=' · dobutamina '+RKO.fmt1(s.dobu.mlh)+' ml/h';if(s.lastMap!=null)nx+=' · MAP '+s.lastMap;if(s.nextMap)nx+=' · pomiar za '+mmss(s.nextMap-now)}
 if(s.cur)nx+='\n▸ '+s.cur.text.slice(0,70);
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
 B.push({text:'Najważniejsze (30 s)',h:2},{table:r.sum});if(s.wywiad)B.push({text:'Wywiad',h:2},{text:s.wywiad});
 if(r.missing.length)B.push({text:'Brakujące dane: '+r.missing.join(', ')});
 B.push({text:'Leki (godzina, lek, dawka)',h:2},{table:r.drugs.length?r.drugs:[['—','brak']]});
 B.push({text:'4H i 4T (✓ potwierdzona, ✗ wykluczona, – niesprawdzona)',h:2},{table:r.ht});
 B.push({text:'Pełna oś czasu',h:2,pb:1},{table:r.timeline});
 B.push({text:'Wygenerowano: RKO SOR v'+RKO.VERSION+' (Wujek Fido), ERC 2025. Dawki µg/kg/min wyłącznie w dokumentacji; lektor podaje przepływ w ml/h.'});
 B.push({text:'Podpis lekarza: ______________________   Godzina przekazania: ________'});return B}
function showReport(s){curRep=s;const B=repBlocks(s);
 $('#rep').innerHTML=B.map(b=>b.table?tbl(b.table):b.h==1?'<h1>'+esc(b.text)+'</h1>':b.h?'<h2 class="'+(b.pb?'pb':'')+'">'+esc(b.text)+'</h2>':'<p class="'+(/SYMULACJA/.test(b.text)?'simw':'')+'">'+esc(b.text)+'</p>').join('');show('report')}
function docxBytes(s){return DOCX.build(repBlocks(s))}
function fname(s){const d=new Date(s.t0);const p=n=>String(n).padStart(2,'0');return 'RKO_SOR_'+d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'_'+p(d.getHours())+p(d.getMinutes())+(s.sim?'_SYMULACJA':'')+'.docx'}
function b64(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
async function saveDocx(s){const F=plug('Filesystem'),bytes=docxBytes(s),name=fname(s);
 if(F){const r=await F.writeFile({path:name,data:b64(bytes),directory:'CACHE'});return {uri:r.uri,name}}
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));a.download=name;a.click();return {name}}
async function sendReport(s,silent){const to=cfg.email;const q=LS.get('rko_queue',[]);if(!q.includes(s.id||('R'+s.t0)))q.push(s.id||('R'+s.t0));LS.set('rko_queue',q);
 if(!to){Voice.say(RKO.SAY.noMail);updQ();return}
 if(!navigator.onLine){Voice.say(RKO.SAY.queued);updQ();return}
 try{const f=await saveDocx(s);const N=plug('RkoNative');const subj='Raport RKO SOR '+new Date(s.t0).toLocaleString('pl-PL')+(s.sim?' (SYMULACJA)':'');
  const body='Raport z aplikacji RKO SOR w załączniku (DOCX). Bez danych osobowych – uzupełnij w systemie szpitalnym.';
  if(N)await N.sendEmail({to,subject:subj,body,uri:f.uri});else location.href='mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body+' Plik '+f.name+' został pobrany – dołącz go.');
  LS.set('rko_queue',LS.get('rko_queue',[]).filter(x=>x!==(s.id||('R'+s.t0))));if(!silent)Voice.say(RKO.SAY.sent)}catch(e){Voice.say(RKO.SAY.queued)}updQ()}
function flushQueue(auto){const q=LS.get('rko_queue',[]);if(!q.length||!cfg.email||(E&&E.s.mode!=='ended'&&E.s.mode!=='idle'))return;const rep=LS.get('rko_reports',[]).find(r=>r.id===q[0]);
 if(rep&&!auto)sendReport(rep,true);updQ()}
function updQ(){const n=LS.get('rko_queue',[]).length;$('#qn').textContent=n?'('+n+' w kolejce)':''}updQ();
$('#back').onclick=()=>show('home');$('#docx').onclick=()=>curRep&&saveDocx(curRep).then(f=>{const N=plug('RkoNative');if(N&&f.uri)N.share({uri:f.uri,title:f.name})});
$('#send').onclick=()=>curRep&&sendReport(curRep);
function repText(s){return repBlocks(s).map(b=>b.table?b.table.map(r=>r.join(' | ')).join('\n'):b.h?'\n'+b.text.toUpperCase():b.text).join('\n')}
$('#copy').onclick=()=>curRep&&copyText(repText(curRep)).then(()=>toast('Raport skopiowany'));
$('#pdf').onclick=async()=>{if(!curRep)return;const N=NAT();if(N&&N.pdf){try{const r=await N.pdf({name:fname(curRep).replace(/\.docx$/,'.pdf')});await N.share({uri:r.uri,title:r.name,mime:'application/pdf'})}catch(e){toast('PDF: '+(e.message||e))}}else window.print()};
$('#wywR').onclick=()=>curRep&&openWyw(curRep);
$('#ai').onclick=()=>{if(!curRep)return;$('#aipT').value=RKO.AI_PROMPT+'\n\n'+RKO.anonymize(repText(curRep));$('#aipOk').checked=false;$('#aip').classList.remove('hide')};
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
$('#voicetest').onclick=()=>{Voice.unlock();const S=RKO.SAY;[S.start,S.call,S.defib,S.iv,S.team,'Ustaw pompę 2,6 mililitra na godzinę.',S.warn15,S.rhythm,RKO.vfInstr('mindray',0),S.afterShock,'Dociągnij 450 miligramów amiodaronu do 500 mililitrów 5% glukozy. Ustaw kroplówkę na siedem kropli na minutę, czyli jedna kropla co osiem sekund. Wlew przez 24 godziny. Tylko glukoza 5%.','Średnie ciśnienie wynosi 72.','Zdanie spoza nagrań, czytane syntezatorem telefonu: test numer 17.'].forEach(t=>Voice.say(t));
 const t0=Date.now();const h=sp=>{if(!sp){Voice.hooks.splice(Voice.hooks.indexOf(h),1);$('#stres').textContent='Test lektora: '+Math.round((Date.now()-t0)/1000)+' s, nagrań '+Voice.stats.clips+', syntezator '+Voice.stats.tts+', awaryjnie '+Voice.stats.fallback+(Voice.ctx?', WebAudio '+Voice.ctx.sampleRate+' Hz':', bez WebAudio')}};Voice.hooks.push(h)};
{const N=plug('RkoNative');if(N)N.maxVolume().catch(()=>{})}
$('#selftest').onclick=async()=>{const o=[];Voice.unlock();o.push('Nagrania lektora: '+Object.keys(Voice.clips).length);Voice.say('Test lektora. Słychać mnie dobrze?');Voice.say('Ustaw pompę 2,6 mililitra na godzinę.');
 try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();o.push('Pamięć: wolne ok. '+Math.round((e.quota-e.usage)/1e6)+' MB')}}catch(e){}
 const SR=plug('SpeechRecognition');if(SR){try{const a=await SR.available();o.push('Rozpoznawanie mowy: '+(a.available?'dostępne':'BRAK'));const p=await SR.requestPermissions();o.push('Mikrofon: '+p.speechRecognition)}catch(e){o.push('Mikrofon: błąd '+e.message)}}
 else o.push('Rozpoznawanie mowy (przeglądarka): '+((window.SpeechRecognition||window.webkitSpeechRecognition)?'dostępne (Chrome wymaga sieci)':'brak – tylko przyciski'));
 $('#stres').textContent=o.join('\n')};
function renderHelp(){$('#helpc').innerHTML=`<h2>Najważniejsze (v1.9)</h2><p class="small">Przyciski są główne. Mikrofon słucha tylko ok. 8 s po pytaniu lektora. Głosem odpowiadasz tylko „TAK” albo „NIE”. Ocena rytmu: „Czy migotanie komór albo częstoskurcz bez tętna?” → „Czy asystolia?” → „Czy jest tętno?” (NIE = PEA, TAK = ROSC; brak odpowiedzi 10 s = brak tętna). Po ROSC: „Czy rytm zatokowy?” → „Czy migotanie przedsionków?” → inny nadkomorowy. Skróty VF / pVT / ASYSTOLIA / PEA / TĘTNO są zawsze na ekranie. Po każdym potwierdzeniu przez 5 s widać COFNIJ. Zegar cyklu: zielony = uciskanie, żółty = ocena rytmu za ≤15 s. Przerwa w uciskaniu &gt;10 s = ostrzeżenie.</p><h2>Inne komendy głosowe</h2><p class="small">„migotanie komór” / „częstoskurcz bez tętna” / „asystolia” / „PEA” / „tętno” · „RKO od 20 minut” (pacjent przywieziony) · „wyładowano” · „nie mogę uciskać” · „intubacja” · „USG” · „zatrzymanie” · „zwiększ”/„utrzymaj” · liczby („120 na 80”) · „pauza”/„dalej” · „wlew heparyny”, „wlew amiodaronu”, „wlew adrenaliny” (wersja pełna) · „powtórz” · „zakończ” → „tak, zakończ”.</p><h2>Raport</h2><p class="small">Po akcji: PDF (jedno dotknięcie), Kopiuj, Wywiad, „Wyślij do AI” (podgląd obowiązkowy, dane osobowe usuwane automatycznie – sprawdź).</p>
<h2>Wysyłka raportu – instrukcja dla lekarza</h2><ol class="small"><li>Ustawienia → „Mój e-mail” → wpisz swój adres (raz).</li><li>Po zakończeniu: przycisk „WYŚLIJ” albo komenda „wyślij na moją skrzynkę”.</li><li>Otworzy się program poczty z adresem i załącznikiem DOCX – zatwierdź „Wyślij”.</li><li>Bez sieci raport czeka w kolejce (Raporty → „Wyślij kolejkę teraz”).</li><li>Na komputerze: otwórz pocztę lub chmurę tego samego konta i pobierz plik.</li></ol>
<p class="small">Raport nie zawiera nazwiska ani PESEL. Zgodność z RODO – DO WERYFIKACJI z IOD.</p>`}
if('serviceWorker' in navigator&&!window.isNative&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
Voice.init();
window.__rko={get E(){return E},handle,show,showReport,docxBytes,wake,nat,repBlocks,toast,copyText,get LICS(){return LICS},instId,isFull,updCheck,newer,active,mic};
})();
