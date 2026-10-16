/* RKO SOR – interfejs (podgląd) */
(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const cfg=Object.assign({email:'',energy:'mindray',syr:'',paceEl:'ap',atroAmp:'0.5',iso:'1/50',dopa:'200/50',adrinf:'1/50',sayConc:'1',pacer:'mindray',fentConc:'50',midaConc:'1',midaAmp:'5/1',atroDose:'0.5',stacked:'0',barge:'min',amioMode:'drip',dropSet:'20',hep:'25000/50',hepAmp:'5000',amioInf:'900/50'},LS.get('rko_cfg',{}));
let E=null,timer=null,wl=null,said=[];
function show(id){$$('.scr').forEach(s=>s.classList.toggle('on',s.id===id));if(id==='reports')renderList();if(id==='help')renderHelp();window.scrollTo(0,0)}
$$('[data-s]').forEach(b=>b.onclick=()=>show(b.dataset.s));
$('#ver').textContent=RKO.VERSION;
// ---- ustawienia ----
for(const k in RKO.ENERGY_LABEL){const o=document.createElement('option');o.value=k;o.textContent=RKO.ENERGY_LABEL[k];$('#energy').appendChild(o)}
$('#email').value=cfg.email;$('#energy').value=cfg.energy;$('#syr').value=cfg.syr;
$('#paceEl').value=cfg.paceEl;for(const k in RKO.PACEMAX){const o=document.createElement('option');o.value=k;o.textContent=RKO.PACEMAX[k].label;$('#pacer').appendChild(o)}
const KS=['atroAmp','iso','dopa','adrinf','sayConc','pacer','fentConc','midaConc','midaAmp','atroDose','stacked','hep','hepAmp','amioMode','dropSet','barge'];KS.forEach(k=>$('#'+k).value=cfg[k]);['email','energy','syr','paceEl'].concat(KS).forEach(k=>$('#'+k).onchange=()=>{cfg[k]=$('#'+k).value.trim();LS.set('rko_cfg',cfg)});
function net(){$('#net').textContent=navigator.onLine?'☁ sieć dostępna':'✈ offline';if(navigator.onLine)flushQueue(true)}
addEventListener('online',net);addEventListener('offline',net);net();
// ---- start ----
async function wake(on){const K=plug('KeepAwake');try{if(K){on?await K.keepAwake():await K.allowSleep();return}
 if(on&&navigator.wakeLock)wl=await navigator.wakeLock.request('screen');if(!on&&wl){wl.release();wl=null}}catch(e){}}
function concCfg(){const o={};for(const k of ['iso','dopa','adrinf']){const m=String(cfg[k]).split('/').map(Number);if(m.length===2&&m[0]>0&&m[1]>0)o[k]={mg:m[0],ml:m[1]}}return o}
function engine(){return new RKO.Engine({energy:cfg.energy,paceEl:cfg.paceEl,fentConc:+String(cfg.fentConc).replace(',','.')||50,midaConc:+String(cfg.midaConc).replace(',','.')||1,midaAmpMg:+cfg.midaAmp.split('/')[0]||5,midaAmpMl:+cfg.midaAmp.split('/')[1]||1,atroDose:+cfg.atroDose,stacked:cfg.stacked==='1',amioMode:cfg.amioMode,dropSet:+cfg.dropSet,hepAmp:+String(cfg.hepAmp).replace(',','.')||5000,hep:{u:+cfg.hep.split('/')[0]||25000,ml:+cfg.hep.split('/')[1]||50},amioInf:{mg:+cfg.amioInf.split('/')[0]||900,ml:+cfg.amioInf.split('/')[1]||50},paceMax:(RKO.PACEMAX[cfg.pacer]||RKO.PACEMAX.mindray).mA,atroAmp:+cfg.atroAmp,sayConc:cfg.sayConc!=='0',conc:concCfg(),out:(t,k)=>{Voice.say(t,k);said.push(t);said=said.slice(-3);$('#said').innerHTML=said.map((x,i)=>i===said.length-1?'<b>'+x+'</b>':'<span class="old">'+x+'</span>').join('<br>')},alarm:()=>Voice.alarm(),persist:s=>LS.set('rko_cur',s)})}
function begin(sim,resumeState){Voice.unlock();E=engine();
 if(resumeState){E.s=resumeState;E.s.q=[];E.s.cur=null;E.say('Wznawiam zapis.')}else E.start({sim,email:cfg.email,syr:cfg.syr?+cfg.syr:null});
 $('#simbar').classList.toggle('hide',!E.s.sim);$('#chg').classList.toggle('hide',!E.s.sim);
 show('run');wake(true);Ears.onResult=(alts,conf)=>handle(alts,false,conf);Ears.barge=cfg.barge;startEarsAfterFirst();clearInterval(timer);timer=setInterval(loop,250);render()}
$('#go').onclick=()=>begin(false);$('#sim').onclick=()=>begin(true);
// mikrofon dopiero po pierwszym komunikacie (start rozpoznawania zabiera fokus audio na Androidzie)
function startEarsAfterFirst(){let done=false;const go=()=>{if(done)return;done=true;Ears.start()};if(!Voice.speaking&&!Voice.queue.length){setTimeout(()=>{if(!Voice.speaking)go();else waitIdle()},600)}else waitIdle();
 function waitIdle(){const h=sp=>{if(!sp){Voice.hooks.splice(Voice.hooks.indexOf(h),1);setTimeout(go,300)}};Voice.hooks.push(h)}setTimeout(go,20000)}
let pendingIn=[];Voice.hooks.push(sp=>{if(!sp&&pendingIn.length){const q=pendingIn;pendingIn=[];q.forEach(a=>handle(a,true))}});
function handle(alts,direct,conf){if(!E)return;alts=[].concat(alts);
 if(!direct&&Voice.speaking){const b=RKO.bargeIn(alts[0],Voice.current,cfg.barge,conf);if(b==='ignore')return;if(b==='queue'){pendingIn.push(alts);$('#heard').textContent='w kolejce: '+alts[0];return}Voice.stop()}
$('#heard').textContent='usłyszano: '+[].concat(alts)[0];const c=E.input(alts);
 if(c==='send'){if(E.s.mode==='ended')sendReport(E.s);else E.say('Raport wyślę po zakończeniu.')}
 if(E.s.mode==='ended')finished();render()}
$$('.fb [data-c],.fb2 [data-c]').forEach(b=>b.onclick=()=>{if(RKO.bargeIn(b.dataset.c,'')==='interrupt')Voice.stop();handle([b.dataset.c],true)});
// klawiatura liczb
let pv='';const pg=$('.padg');['1','2','3','4','5','6','7','8','9','⌫','0','OK'].forEach(k=>{const b=document.createElement('button');b.textContent=k;b.onclick=()=>{if(k==='OK'){$('#pad').classList.add('hide');if(pv)handle([pv],true);pv=''}else if(k==='⌫')pv=pv.slice(0,-1);else pv+=k;$('#padv').textContent=pv||'\u00a0'};pg.appendChild(b)});
$('#numB').onclick=()=>{pv='';$('#padv').textContent='\u00a0';$('#pad').classList.remove('hide')};
Ears.onState=st=>{$('#ears').textContent='🎤 '+st};
function mmss(ms){ms=Math.max(0,ms);const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function loop(){if(!E)return;E.tick();render()}
function render(){if(!E)return;const s=E.s,now=Date.now();if(s.mode==='idle')return;
 $('#modeL').textContent=s.mode==='rosc'?'PO ROSC':s.mode==='ended'?'ZAKOŃCZONO':(s.paused?'NZK – PAUZA':'NZK');
 $('#tTot').textContent=mmss((s.tEnd||now)-s.arrestT);
 const left=120000-(now-s.cycleT);$('#tCyc').textContent=s.mode==='arrest'?mmss(left).slice(1):'—';$('#tCyc').classList.toggle('warn',s.mode==='arrest'&&left<15000);
 $('#rhy').textContent=s.mode==='rosc'?'ROSC':s.rhythm;$('#shk').textContent=s.shocks;
 let nx='—',due=false;
 if(s.mode==='arrest'){if(s.adrDue){const l=s.adrDue-now;due=l<=0;nx='Adrenalina 1 mg '+(due?'TERAZ':'za '+mmss(l))}else nx='Adrenalina: przy rytmie niedefibrylacyjnym od razu, VF po 3. wyładowaniu'}
 if(s.mode==='rosc'){nx=s.nora?'Noradrenalina '+RKO.fmt1(s.nora.mlh)+' ml/h':'Pętla ciśnienia';if(s.dobu)nx+=' · dobutamina '+RKO.fmt1(s.dobu.mlh)+' ml/h';if(s.lastMap!=null)nx+=' · MAP '+s.lastMap;if(s.nextMap)nx+=' · pomiar za '+mmss(s.nextMap-now)}
 if(s.cur)nx+='\n❓ '+s.cur.text.slice(0,70);
 if(s.sim&&s.mode==='arrest')nx='Monitor (symulacja): '+(s.simRhythm||'?')+'\n'+nx;
 $('#next').textContent=nx;$('#next').classList.toggle('due',due)}
function finished(){clearInterval(timer);Ears.stop();wake(false);const s=E.s;LS.set('rko_cur',null);
 const list=LS.get('rko_reports',[]);s.id=s.id||('R'+s.t0);if(!list.find(r=>r.id===s.id))list.unshift(s);LS.set('rko_reports',list.slice(0,30));
 setTimeout(()=>{showReport(s)},1200)}
// ---- wznowienie po zamknięciu ----
const pend=LS.get('rko_cur',null);if(pend&&pend.mode&&pend.mode!=='ended'){$('#resume').classList.remove('hide');$('#resT').textContent=RKO.hhmm(pend.t0)}
$('#resGo').onclick=()=>{$('#resume').classList.add('hide');begin(false,pend)};
$('#resEnd').onclick=()=>{E=engine();E.s=pend;E.s.q=[];E.finish=E.finish.bind(E);E.out=()=>{};E.finish();$('#resume').classList.add('hide');finished()};
// ---- raport ----
let curRep=null;
function esc(t){return String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function tbl(rows){return '<table>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</table>'}
function repBlocks(s){const r=RKO.report(s);const d=new Date(s.t0).toLocaleDateString('pl-PL');const B=[];
 B.push({text:'RKO SOR – raport przekazania (OIT) – '+d,h:1});if(s.sim)B.push({text:'SYMULACJA – NIE DO DOKUMENTACJI PACJENTA',b:true});
 if(s.summary){B.push({text:'Podsumowanie symulacji',h:2},{table:[...s.summary.good.map(x=>['✅ dobrze',x]),...s.summary.late.map(x=>['⏱ spóźnione',x]),...s.summary.miss.map(x=>['❌ pominięte',x]),['Czas bez ucisku',s.summary.handsOff+' s'],['Wyładowania',String(s.summary.shocks)]]})}
 B.push({text:'Pacjent: ____________________  PESEL: ______________ (uzupełnić w systemie szpitalnym)'});
 B.push({text:'Najważniejsze (30 s)',h:2},{table:r.sum});
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
$('#print').onclick=()=>{const N=plug('RkoNative');if(N)N.print({name:'Raport RKO SOR'});else window.print()};
function renderList(){const L=LS.get('rko_reports',[]),q=LS.get('rko_queue',[]);$('#rlist').innerHTML=L.length?'':'<p>Brak raportów.</p>';
 L.forEach(s=>{const d=document.createElement('div');d.className='card';d.innerHTML='<span>'+new Date(s.t0).toLocaleString('pl-PL')+(s.sim?' · SYMULACJA':'')+(q.includes(s.id)?' · ✉ w kolejce':'')+'</span>';const b=document.createElement('button');b.textContent='Otwórz';b.onclick=()=>showReport(s);d.appendChild(b);$('#rlist').appendChild(d)});
 if(q.length&&cfg.email){const b=document.createElement('button');b.textContent='Wyślij kolejkę teraz';b.onclick=()=>flushQueue(false);$('#rlist').appendChild(b)}}
// ---- test startowy ----
$('#voicetest').onclick=()=>{Voice.unlock();const S=RKO.SAY;[S.start,S.scen,S.team,'Ustaw pompę 2,6 mililitra na godzinę.',S.warn15,S.rhythm,RKO.vfInstr('mindray',0),S.afterShock,'Dociągnij 450 miligramów amiodaronu do 500 mililitrów 5% glukozy. Ustaw kroplówkę na siedem kropli na minutę, czyli jedna kropla co osiem sekund. Wlew przez 24 godziny. Tylko glukoza 5%.','Średnie ciśnienie wynosi 72.','Zdanie spoza nagrań, czytane syntezatorem telefonu: test numer 17.'].forEach(t=>Voice.say(t));
 const t0=Date.now();const h=sp=>{if(!sp){Voice.hooks.splice(Voice.hooks.indexOf(h),1);$('#stres').textContent='Test lektora: '+Math.round((Date.now()-t0)/1000)+' s, nagrań '+Voice.stats.clips+', syntezator '+Voice.stats.tts+', awaryjnie '+Voice.stats.fallback+(Voice.ctx?', WebAudio '+Voice.ctx.sampleRate+' Hz':', bez WebAudio')}};Voice.hooks.push(h)};
{const N=plug('RkoNative');if(N)N.maxVolume().catch(()=>{})}
$('#selftest').onclick=async()=>{const o=[];Voice.unlock();o.push('Nagrania lektora: '+Object.keys(Voice.clips).length);Voice.say('Test lektora. Słychać mnie dobrze?');Voice.say('Ustaw pompę 2,6 mililitra na godzinę.');
 try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();o.push('Pamięć: wolne ok. '+Math.round((e.quota-e.usage)/1e6)+' MB')}}catch(e){}
 const SR=plug('SpeechRecognition');if(SR){try{const a=await SR.available();o.push('Rozpoznawanie mowy: '+(a.available?'dostępne':'BRAK'));const p=await SR.requestPermissions();o.push('Mikrofon: '+p.speechRecognition)}catch(e){o.push('Mikrofon: błąd '+e.message)}}
 else o.push('Rozpoznawanie mowy (przeglądarka): '+((window.SpeechRecognition||window.webkitSpeechRecognition)?'dostępne (Chrome wymaga sieci)':'brak – tylko przyciski'));
 $('#stres').textContent=o.join('\n')};
function renderHelp(){$('#helpc').innerHTML=`<h2>Komendy głosowe</h2><p class="small">TAK · NIE · PODANO · „adrenalina podano” · „amiodaron/lidokaina podano” · rytm: „migotanie komór”, „VF”, „częstoskurcz komorowy bez tętna”, „asystolia”, „PEA”, „rozkojarzenie”, „rytm zatokowy”, „jest tętno”, „bradykardia” · „defibrylacja wykonana”/„wyładowano” · „nie mogę uciskać”/„jestem sam” · „intubacja” · „USG” · „ROSC” · „zatrzymanie” · „zwiększ”/„utrzymaj” · liczby słownie („dziewięćdziesiąt”) · „wodorowęglan” · „pauza”/„stop”/„dalej”, „zmniejsz”, „wlew heparyny”, „wlew amiodaronu”, „wlew adrenaliny”, „masa 80 kilogramów”, ciśnienie „120 na 80” · „powtórz”, „powtórz ostatnie polecenie”, „odtwórz instrukcję” · „zakończ” → „tak, zakończ” · „wyślij na moją skrzynkę”.</p>
<h2>Wysyłka raportu – instrukcja dla lekarza</h2><ol class="small"><li>Ustawienia → „Mój e-mail” → wpisz swój adres (raz).</li><li>Po zakończeniu: przycisk „WYŚLIJ” albo komenda „wyślij na moją skrzynkę”.</li><li>Otworzy się program poczty z adresem i załącznikiem DOCX – zatwierdź „Wyślij”.</li><li>Bez sieci raport czeka w kolejce (Raporty → „Wyślij kolejkę teraz”).</li><li>Na komputerze: otwórz pocztę lub chmurę tego samego konta i pobierz plik.</li></ol>
<p class="small">Raport nie zawiera nazwiska ani PESEL. Zgodność z RODO – DO WERYFIKACJI z IOD.</p>`}
if('serviceWorker' in navigator&&!window.isNative&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
Voice.init();
window.__rko={get E(){return E},handle,show,showReport,docxBytes};
})();
