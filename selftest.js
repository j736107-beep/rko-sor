/* RKO SOR v1.9.2 – SAMOTEST: każdy test daje natychmiastową informację (stan, odliczanie, tekst na żywo) i kończy się ZALICZONY / NIEZALICZONY z powodem i kodem. */
(function(){
const $=s=>document.querySelector(s);const R=()=>window.__rko;const N=()=>window.plug&&plug('RkoNative');const SR=()=>window.plug&&plug('SpeechRecognition');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const TO=(p,ms,code)=>Promise.race([p,new Promise((_,ko)=>setTimeout(()=>ko(Object.assign(new Error('przekroczony czas'),{code:code||'TIMEOUT'})),ms))]);
function tone(ok){try{Voice.unlock();const c=Voice.ctx;if(!c)return;const seq=ok===true?[880,1320]:ok===false?[330,220]:[1000];seq.forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.setValueAtTime(0.0001,c.currentTime+i*.16);g.gain.exponentialRampToValueAtTime(0.25,c.currentTime+i*.16+.01);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+i*.16+.14);o.connect(g);g.connect(c.destination);o.start(c.currentTime+i*.16);o.stop(c.currentTime+i*.16+.15)})}catch(e){}if(navigator.vibrate)navigator.vibrate(ok===false?[200,80,200]:40)}
const res={};let running=null;
function row(id){return document.getElementById('st_'+id)}
function set(id,state,txt){const r=row(id);if(!r)return;r.className='strow '+state;r.querySelector('.stat').textContent={idle:'—',run:'TRWA…',pass:'ZALICZONY',fail:'NIEZALICZONY',skip:'POMINIĘTY',ask:'ODPOWIEDZ'}[state]||state;if(txt!=null)r.querySelector('.det').textContent=txt}
function live(id,txt){const r=row(id);if(r)r.querySelector('.det').textContent=txt}
// pytanie do użytkownika (TAK/NIE) wewnątrz wiersza testu
function ask(id,q,ms){return new Promise(ok=>{set(id,'ask',q);const r=row(id);const box=r.querySelector('.ans');box.innerHTML='';let done=false;const fin=v=>{if(done)return;done=true;box.innerHTML='';ok(v)};
 const y=document.createElement('button');y.textContent='TAK';y.className='kb';y.onclick=()=>fin(true);const n=document.createElement('button');n.textContent='NIE';n.className='kn';n.onclick=()=>fin(false);box.append(y,n);if(ms)setTimeout(()=>fin(null),ms)})}
async function countdown(id,sec,label,until){for(let i=sec;i>0;i--){if(until&&until())return true;live(id,label+' – '+i+' s');await sleep(1000)}return until?!!until():false}
const T=[
 ['lektor','Głośnik / lektor',async id=>{const c0=Voice.stats.clips,f0=Voice.stats.fallback;Voice.unlock();Voice.say(RKO.SAY.team);live(id,'Lektor mówi: „'+RKO.SAY.team+'”');
  let t=0;while(Voice.speaking&&t<200){await sleep(100);t++}if(Voice.speaking){Voice.stop();return F('Lektor się zawiesił (ponad 20 s)','V_HANG')}
  const played=Voice.stats.clips>c0;const st=Voice.ctx?Voice.ctx.state:'brak';const a=await ask(id,'Czy słyszałeś/aś całe zdanie wyraźnie, bez ucinania?',30000);
  if(a===true)return P('nagranie odtworzone, WebAudio: '+st);return F(a===null?'brak odpowiedzi':'użytkownik nie słyszał poprawnie (WebAudio: '+st+(played?'':' , nagranie nie ruszyło')+')',played?'A_USER':'A_NOPLAY')}],
 ['metro','Metronom',async id=>{Voice.unlock();const k0=Metro.clicks;const nat=Metro.useNative;Metro.useNative=false;Metro.start();Metro.rate=110;Metro.vol=0.4;Metro.want=true;await countdown(id,4,'Metronom gra 110/min');Metro.want=false;Metro.cut();Metro.useNative=nat;
  const n=Metro.clicks-k0;if(n<4)return F('metronom nie generuje dźwięku (kliknięć: '+n+', WebAudio: '+(Voice.ctx&&Voice.ctx.state)+')','M_NOCLICK');const a=await ask(id,'Słyszałeś/aś równe kliknięcia ('+n+')?',30000);return a?P(n+' kliknięć w 4 s'):F('użytkownik nie słyszał metronomu','M_USER')}],
 ['perm','Mikrofon – uprawnienie',async id=>{const s=SR();live(id,'Sprawdzam uprawnienie…');try{if(s){let p=await TO(s.checkPermissions(),5000);if(p.speechRecognition!=='granted'){live(id,'Android zapyta o zgodę – wybierz „Zezwól”');p=await TO(s.requestPermissions(),30000)}
   return p.speechRecognition==='granted'?P('uprawnienie przyznane'):F('brak zgody na mikrofon – Ustawienia telefonu → Aplikacje → RKO SOR → Uprawnienia','PERM_'+p.speechRecognition)}
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){const m=await TO(navigator.mediaDevices.getUserMedia({audio:true}),30000);m.getTracks().forEach(t=>t.stop());return P('mikrofon dostępny (przeglądarka)')}return F('brak dostępu do mikrofonu w tym środowisku','PERM_NA')}catch(e){return F('błąd uprawnień: '+e.message,e.code||'PERM_ERR')}}],
 ['mowa','Rozpoznawanie mowy',async id=>{if(R().active())return F('niedostępne w trakcie akcji','BUSY');Ears.stop();await sleep(300);const saved={c:Ears.classify,r:Ears.onResult,h:Ears.onHeard,w:Ears.windowMode};const e0=JSON.stringify(Ears.errors);
  let heard='',got=null;Ears.windowMode=false;Ears.classify=a=>RKO.interpret(a,{rhythm:true,confirm:true});Ears.onHeard=t=>{heard=t;live(id,'słyszę: '+t)};Ears.onResult=a=>{const r=RKO.interpret(a,{rhythm:true,confirm:true});heard=a[0];if(r.cmd==='yes'||r.cmd==='nonshock')got={t:a[0],c:r.cmd};else live(id,'„'+a[0]+'” – to nie „tak” ani „asystolia”, powtórz')};
  tone();try{await TO(Ears.start(),8000,'SR_START')}catch(e){}if(!Ears.running){restore();return F('rozpoznawanie nie wystartowało: '+Ears.status,'SR_NOSTART')}
  const ok=await countdown(id,10,'Powiedz: „tak” albo „asystolia”'+(heard?' · słyszę: '+heard:''),()=>!!got);Ears.stop();restore();
  if(ok)return P('rozpoznano „'+got.t+'” → '+(got.c==='yes'?'TAK':'ASYSTOLIA'));const errs=Object.entries(Ears.errors).filter(([k])=>!JSON.parse(e0)[k]||JSON.parse(e0)[k]<Ears.errors[k]).map(([k])=>k);
  return F(heard?'usłyszano „'+heard+'”, ale nie rozpoznano słowa':errs.length?'błąd usługi mowy: '+errs.map(k=>k+' ('+(Ears.status||'')+')').join(', '):'nic nie usłyszano w 10 s (sprawdź usługę mowy Google, język polski)',errs[0]?'SR_'+errs[0]:heard?'SR_NOMATCH':'SR_SILENCE');
  function restore(){Ears.classify=saved.c;Ears.onResult=saved.r;Ears.onHeard=saved.h;Ears.windowMode=saved.w}}],
 ['undo','Przyciski / COFNIJ',async id=>{const E=new RKO.Engine({out:()=>{},alarm:()=>{}});E.start();live(id,'Symulacja: ASYSTOLIA (przycisk) → TAK → COFNIJ');E.input(['asystolia'],'przycisk');await sleep(300);E.input(['tak'],'przycisk');await sleep(300);
  if(E.s.adr.length!==1)return F('przycisk TAK nie zapisał adrenaliny','B_TAK');if(!E.canUndo())return F('brak COFNIJ po potwierdzeniu','B_UNDO');E.undo();if(E.s.adr.length!==0)return F('COFNIJ nie cofnął zapisu','B_UNDO2');
  if(!E.s.log.some(e=>e.src==='przycisk'))return F('brak zapisu źródła „przycisk”','B_SRC');return P('ASYSTOLIA → TAK zapisane (przycisk), COFNIJ cofnął')}],
 ['wake','Ekran nie gaśnie',async id=>{await R().wake(true);const K=window.plug&&plug('KeepAwake');let on=false;try{if(K&&K.isKeptAwake){on=(await TO(K.isKeptAwake(),3000)).isKeptAwake}else on=!!navigator.wakeLock}catch(e){}
  await countdown(id,5,'Blokada wygaszania włączona – nie dotykaj');return on?P('blokada wygaszania aktywna'):F('nie udało się zablokować wygaszania','WAKE')}],
 ['notif','Powiadomienie „RKO w toku”',async id=>{const n=N();if(!n||!n.action)return S('tylko w aplikacji Android');await n.action({on:true});await sleep(1500);let st={};try{st=await n.notifState()}catch(e){}
  if(!st.enabled){await n.action({on:false});return F('powiadomienia wyłączone – Ustawienia → Aplikacje → RKO SOR → Powiadomienia','N_OFF')}if(!st.service){await n.action({on:false});return F('usługa pierwszoplanowa nie wystartowała','N_SVC')}
  const a=await ask(id,'Rozwiń pasek powiadomień: widzisz „RKO w toku”?',45000);await n.action({on:false});return a?P('powiadomienie widoczne, usługa działa'):F('powiadomienie niewidoczne','N_USER')}],
 ['bg','Praca w tle (blokada 20 s)',async id=>{const n=N();if(n&&n.action)await n.action({on:true});Metro.useNative=!!n;Metro.want=true;Metro.rate=110;Metro.vol=0.3;const t0=Date.now();let ticks=0,hid=0,hidAt=0;const iv=setInterval(()=>ticks++,1000);
  const vis=()=>{if(document.hidden)hidAt=Date.now();else if(hidAt){hid+=Date.now()-hidAt;hidAt=0}};document.addEventListener('visibilitychange',vis);
  live(id,'Zablokuj ekran przyciskiem zasilania, odczekaj 20 s (metronom powinien grać), odblokuj.');let w=0;while(w<120&&!(hid>=15000&&!document.hidden)){await sleep(500);w+=.5;if(!document.hidden)live(id,'Zablokuj ekran na 20 s i odblokuj · czekam '+Math.round(120-w)+' s')}
  clearInterval(iv);document.removeEventListener('visibilitychange',vis);Metro.want=false;Metro.cut();let st={};try{if(n)st=await n.notifState()}catch(e){}if(n&&n.action)await n.action({on:false});Metro.useNative=false;
  if(hid<15000)return F('ekran nie był zablokowany ≥15 s (było '+Math.round(hid/1000)+' s)','BG_NOLOCK');const el=(Date.now()-t0)/1000,drift=Math.round(el-ticks);
  const a=await ask(id,'Czy metronom grał przy zablokowanym ekranie?',30000);const info='zablokowany '+Math.round(hid/1000)+' s, zegar akcji liczony z czasu systemowego (bez dryfu), opóźnienie timerów JS '+drift+' s, usługa: '+(st.service?'tak':'nie');
  return a?P(info):F('metronom milkł w tle · '+info,'BG_METRO')}],
 ['lic','Licencja',async id=>{const L=R().LICS||{};const m={trial:'próbna',code:'kod',owner:'właściciel (bez terminu)',demo:'DEMO'}[L.mode]||'?';const t='numer '+R().instId+' · tryb: '+m+(L.code&&L.code.exp?' · do '+new Date(L.code.exp).toLocaleDateString('pl-PL'):'');
  return L.full?P(t):F(t+' – wpisz kod w Licencja','LIC_DEMO')}],
 ['upd','Aktualizacja',async id=>{if(!navigator.onLine)return F('brak internetu','UPD_OFFLINE');live(id,'Sprawdzam GitHub…');try{const r=await TO(fetch('https://api.github.com/repos/j736107-beep/rko-sor/releases/latest',{cache:'no-store'}),8000,'UPD_TIMEOUT');if(!r.ok)return F('serwer odpowiedział '+r.status,'UPD_HTTP'+r.status);const j=await r.json();
  return P('najnowsze wydanie: '+j.tag_name+' · zainstalowana: '+RKO.VERSION+(R().newer(j.tag_name,RKO.VERSION)?' → DOSTĘPNA AKTUALIZACJA':' (aktualna)'))}catch(e){return F('błąd: '+e.message,e.code||'UPD_ERR')}}],
 ['pdf','Raport PDF',async id=>{const n=N();if(!n||!n.pdf)return S('tylko w aplikacji Android (w przeglądarce: Drukuj → Zapisz jako PDF)');const E=new RKO.Engine({out:()=>{},alarm:()=>{}});E.start({sim:true});E.input(['asystolia']);E.input(['tak']);E.finish();
  const rep=document.getElementById('rep');const old=rep.innerHTML;R().showReport(E.s);await sleep(500);try{const r=await TO(n.pdf({name:'Test_RKO_SOR.pdf'}),20000,'PDF_TIMEOUT');R().show('tests');rep.innerHTML=old;
   const a=await ask(id,'PDF utworzony. Otworzyć do podglądu (udostępnij)?',20000);if(a)await n.share({uri:r.uri,title:r.name,mime:'application/pdf'});return P('plik '+r.name+' utworzony')}catch(e){R().show('tests');return F('PDF nie powstał: '+e.message,e.code||'PDF_ERR')}}],
 ['ai','Udostępnianie do AI (podgląd)',async id=>{const src='Pacjent Jan Kowalski, PESEL 85010112345, tel. 601 234 567, ul. Długa 5, ur. 12.03.1960. Adrenalina 1 mg o 10:42.';const out=RKO.anonymize(src);live(id,out);
  const bad=['85010112345','601 234 567','Długa','12.03.1960','Kowalski'].filter(x=>out.includes(x));if(bad.length)return F('nie usunięto: '+bad.join(', '),'AI_LEAK');if(!/10:42/.test(out)||!/1 mg/.test(out))return F('usunięto fakty kliniczne','AI_FACTS');
  return P('PESEL, telefon, adres, data, nazwisko usunięte; dawki i godziny zostały')}]];
function P(m){return {ok:true,msg:m}}function F(m,c){return {ok:false,msg:m,code:c}}function S(m){return {skip:true,msg:m}}
async function run(id){if(running){R().toast('Trwa test: '+T.find(x=>x[0]===running)[1]+' – poczekaj na wynik');tone(false);return}running=id;const t=T.find(x=>x[0]===id);set(id,'run','start…');tone();let r;
 try{r=await t[2](id)}catch(e){r=F('wyjątek: '+(e&&e.message||e),(e&&e.code)||'EXC')}res[id]=Object.assign({t:Date.now()},r);
 set(id,r.skip?'skip':r.ok?'pass':'fail',r.msg+(r.code&&!r.ok?' [kod: '+r.code+']':''));tone(r.skip?undefined:!!r.ok);running=null;summary();return r}
async function runAll(){const b=$('#stAll');b.disabled=true;for(const [id] of T){row(id).scrollIntoView({block:'center'});await run(id);await sleep(400)}b.disabled=false;$('#stSum').scrollIntoView()}
function sumText(){const d=new Date();const L=T.map(([id,n])=>{const r=res[id];return (r?(r.skip?'–':r.ok?'✓':'✗'):'·')+' '+n+': '+(r?(r.msg+(r.code&&!r.ok?' [kod '+r.code+']':'')):'nie wykonano')});
 const ok=T.filter(([id])=>res[id]&&res[id].ok).length,bad=T.filter(([id])=>res[id]&&!res[id].ok&&!res[id].skip).length;
 return 'RKO SOR v'+RKO.VERSION+' – samotest '+d.toLocaleString('pl-PL')+'\nWynik: '+ok+' zaliczonych, '+bad+' niezaliczonych z '+T.length+'\nUrządzenie: '+((navigator.userAgent.match(/\(([^)]*)\)/)||[])[1]||navigator.userAgent)+'\n\n'+L.join('\n')}
function summary(){const el=$('#stSum');const bad=T.some(([id])=>res[id]&&res[id].ok===false&&!res[id].skip);el.className='stsum '+(Object.keys(res).length?(bad?'fail':'pass'):'');el.textContent=sumText()}
function build(){const box=$('#stList');box.innerHTML='';T.forEach(([id,name])=>{const d=document.createElement('div');d.className='strow idle';d.id='st_'+id;
 d.innerHTML='<div class="sth"><b>'+name+'</b><span class="stat">—</span><button class="stb">TEST</button></div><div class="det"></div><div class="ans row"></div>';d.querySelector('.stb').onclick=()=>run(id);box.appendChild(d)});
 $('#stAll').onclick=runAll;$('#stCopy').onclick=()=>R().copyText(sumText()).then(()=>R().toast('Wynik skopiowany'));summary()}
window.SelfTest={build,run,runAll,res,T,sumText};
if(document.readyState!=='loading')build();else document.addEventListener('DOMContentLoaded',build);
})();
