/* RKO SOR – logika (czysta, testowalna). Autor: Wujek Fido. */
(function(root){
'use strict';
const VERSION='1.3';
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
function binfPrep(d,o,sayConc){const c=binfConc(d,o);if(d==='adrinf'){const ml=c.mg===1?'1 mililitr':c.mg+' mililitry';return 'Wlew adrenaliny. Weź '+(c.mg===1?'1 miligram':c.mg+' miligramy')+' adrenaliny, czyli '+ml+' z ampułki. Dociągnij solą fizjologiczną do '+c.ml+' mililitrów.'+(sayConc===false?'':' Stężenie '+Math.round(c.conc)+' mikrogramów na mililitr.')}const mgw=c.mg===1?'1 miligram':c.mg+' miligramów';return (d==='iso'?'Izoprenalina':d==='dopa'?'Dopamina':'Adrenalina we wlewie')+': '+mgw+' dociągnij solą fizjologiczną do '+c.ml+' mililitrów.'}
function dobuMlh(dose,kg){return r1(dose*kg*60/DOBU.conc)}
const ADRINF={mg:1,ml:50,conc:20}; // µg/ml, bradykardia 2–10 µg/min
function adrInfMlh(ugmin){return r1(ugmin*60/ADRINF.conc)}
function volW(x){x=r1(x);return x===0.5?'pół mililitra':fmt1(x)+' '+mlWord(x)}
function volGen(x){x=r1(x);return x===0.5?'pół mililitra':fmt1(x)+' '+(Number.isInteger(x)&&x!==1?'mililitrów':'mililitra')}
function rangeW(a,b){return (r1(a)===0.5?'pół':fmt1(a))+' do '+volGen(b)}
function mgW(x){return x===0.5?'pół miligrama':x===1?'1 miligram':fmt1(x)+' miligrama'}
function atroText(dose,amp){dose=dose||.5;amp=amp||.5;return 'Podaj atropinę '+mgW(dose)+', czyli '+volW(dose/amp)+'. Powiedz: podano.'}
function atroNext(dose,amp){dose=dose||.5;amp=amp||.5;return 'Kolejna dawka atropiny '+mgW(dose)+', czyli '+volW(dose/amp)+'. Powiedz: podano.'}
function sedText(o){const f=o.fentConc||50,ma=o.midaAmpMg||5,mc=o.midaConc||1,mac=(o.midaAmpMg||5)/(o.midaAmpMl||1);
 const fen='Fentanyl: nabierz '+volW(25/f)+' z ampułki, podaj powoli dożylnie.';
 const mid=mc<mac?'Midazolam: 1 ampułkę '+ma+' miligramów rozcieńcz do '+volW(ma/mc).replace(/ mililitr\w*$/,' mililitrów')+', podaj '+rangeW(1/mc,2/mc)+' powoli.':'Midazolam bez rozcieńczania: podaj '+volW(1/mc)+' powoli.';
 return 'Pacjent przytomny – analgezja i sedacja małymi dawkami. '+fen+' '+mid}
function fentRepText(o){const f=o.fentConc||50;return 'Jeśli potrzeba, kolejna dawka fentanylu: '+rangeW(25/f,50/f)+'. Powiedz: podano, liczbę albo nie.'}
function midaRepText(o){const mc=o.midaConc||1;return 'Jeśli potrzeba, midazolam '+rangeW(1/mc,2/mc)+'. Powiedz: podano, liczbę albo nie.'}
function fentWarn(o){return 'Uwaga: łączna dawka fentanylu powyżej '+volGen(100/(o.fentConc||50))+'. Ryzyko depresji oddechu, przygotuj worek i nalokson.'}
function mapOf(s,d){return Math.round((s+2*d)/3)}
function noraTable(){const out=[];for(let kg=50;kg<=120;kg+=10)out.push({kg,s50:noraMlh(.05,kg,50),s20:noraMlh(.05,kg,20)});return out}
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
 ['lucas_off',/(przerw\w*|pauz\w*|zatrzymaj\w*|wstrzymaj\w*|stop)\W*(w )?lucas|lucas\W*(pauz\w*|stop|przerw\w*|wstrzyman\w*)/],['lucas_on',/lucas\W*(wlaczon\w*|wznowion\w*|pracuje|start)|(wznow\w*|wlacz\w*|uruchom\w*) lucas/],
 ['iso',/izoprenalin|isoprenalin|izuprel/],['dopa',/dopamin/],['nora',/noradrenalin/],['dobu',/dobutamin/],['hepinf',/wlew\w* heparyn|heparyn\w* (we )?wlew/],['amioinf',/wlew\w* amiodaron|amiodaron\w* (we )?wlew/],['adrinf',/wlew\w* adrenalin|\badrenalin\w* (we )?wlew/],['pace',/zalamki p bez qrs|zalamek p bez qrs|blok serca|blok przedsionkowo|blok av|potrzebny stymulator|stymulacj\w* przezskorn/],['alone',/nie moge uciskac|jestem sam|nikt nie uciska/],['zakoncz_tak',/\btak\b.*\bzakoncz/],['replay',/powtorz ostatnie|odtworz instrukcj|^powtorz\b|\bpowtorz$/],
 ['send',/wyslij/],['adr',/\badrenalin\w* podan|podan\w* adrenalin/],['amio',/amiodaron\w* podan/],['lido',/lidokain\w* podan/],
 ['nonshock',/nie do defibrylacji|brak wskazan|bez wskazan|nie defibrylowa|nie defibryluj/],['shock_done',/defibrylacj\w* wykonan|wyladowan\w*|wyladowano/], ['organised0',/migotanie przedsionkow/],['shockable',/migotanie|\bvf\b|\bp ?vt\b|\bvt\b|czestoskurcz komorowy|defibrylacj|do defibrylacji/],
 ['nopulse',/brak tetna|nie ma tetna|bez tetna/],
 ['pulse',/jest tetno|wyczuwalne tetno|tetno jest|mam tetno/],['brady',/bradykardi/],
 ['nonshock',/brak wskazan|nie do defibrylacji|asystoli|\bpea\b|rozkojarzenie|aktywnosc elektryczna bez/],
 ['organised',/rytm zatokowy|zatokowy|rytm zorganizowany|zorganizowany|wezlowy/],['intub',/intubacj|zaintubowan/],['usg',/\busg\b|u s g|pocus|ultrasonograf/],
 ['rosc',/\brosc\b|ros[ck]|powrot krazenia/],['arrest',/zatrzymanie/],['up',/zwieksz/],['keep',/utrzymaj/],['pause',/pauza|^stop\b|\bstop$/],['down',/zmniejsz/],['end',/zakoncz/],
 ['given',/podano|podane|podalem|podalam/],['bicarb',/wodoroweglan/],['change',/zmien rytm/],
 ['sor',/w sor|\bsor\b|na sor/],['brought',/przywiez/],['present',/^jest\b|jestem/],['checked',/sprawdzon|wykluczon/],['next',/dalej|nastepn|gotowe|gotowa|pomin/],['unknown',/nie wiem/],['kg',/kilogram|\bwaga\b|\bmasa\b/],
 ['s20',/dwadziescia|\b20\b/],['s50',/piecdziesiat|\b50\b/],
 ['yes',/^tak\b|\btak$|potwierdzam|zgadza/],['no',/^nie\b|\bnie$/]];
function parsePair(text){const t=norm(text).replace(/\//g,' na ');const p=t.split(/ na /);if(p.length!==2)return null;const a=parseNumber(p[0]),b=parseNumber(p[1]);return a!=null&&b!=null?[a,b]:null}
const CRIT=['lucas_off','lucas_on','pause','arrest','shock_done','replay'];
function bargeIn(heard,speaking){const h=norm(heard);if(!h)return 'ignore';if(speaking&&norm(speaking).includes(h))return 'ignore';const c=matchCommand(heard);return CRIT.includes(c)?'interrupt':'queue'}
function matchCommand(text){const t=norm(text);if(!t)return null;for(const [id,re] of CMDS)if(re.test(t))return id==='organised0'?'organised':id;return null}
function interpret(alts){alts=[].concat(alts||[]);for(const a of alts){const c=matchCommand(a);if(c)return {cmd:c,num:parseNumber(a),text:a}}
 for(const a of alts){const n=parseNumber(a);if(n!=null)return {cmd:'number',num:n,text:a}}return {cmd:null,num:null,text:alts[0]||''}}
// ---------- teksty bolusów (mg + ml) i pomp (tylko ml/h) ----------
const SAY={
 start:'Zatrzymanie krążenia. Ty kierujesz. Ucisk klatki piersiowej teraz. Wezwij anestezjologa. LUCAS i defibrylator.',
 sim:'To jest symulacja.',
 scen:'Zatrzymanie w SOR czy pacjent przywieziony?',
 mins:'Ile minut trwa reanimacja? Podaj liczbę.',
 zrmAdr:'Ile miligramów adrenaliny podał zespół ratownictwa?',
 zrmShk:'Ile wyładowań wykonał zespół ratownictwa?',
 team:'Role: ucisk lub LUCAS, drogi oddechowe, leki i dostęp, defibrylator, dokumentacja. Potwierdź: jest.',
 warn15:'Za 15 sekund ocena rytmu. Przygotuj ładowanie defibrylatora.',
 rhythm:'Jaki masz rytm?',
 nonshockI:'Nie defibryluj. Uciskaj. Kolejne dwie minuty.',
 adrNow:'Adrenalina 1 miligram teraz, czyli 1 mililitr z ampułki. Powiedz: podano.',
 alone:'Uciskaj do ostatniej chwili, ładuj. Jeśli ktoś jest przy głowie, wentyluj workiem w trakcie ładowania. Odsuń wszystkich, wyładowanie, natychmiast wróć do uciskań. Przerwa krótsza niż 5 sekund. Wezwij pomoc, podłącz LUCAS.',
 pace1ap:'Stymulacja przezskórna. Naklej elektrody przednio-tylnie. Powiedz: gotowe.',
 pace1al:'Stymulacja przezskórna. Naklej elektrody przednio-bocznie. Powiedz: gotowe.',
 pace2:'Podłącz elektrody EKG z monitora defibrylatora. Bez nich nie zobaczysz wychwytu. Powiedz: gotowe.',
 pace3:'Tryb na żądanie, częstość 70 na minutę. Powiedz: gotowe.',
 pace4:'Prąd 30 miliamperów. Zwiększaj co 10 aż do wychwytu. Wychwyt zwykle przy 50 do 100 miliamperach.',
 paceCap:'Czy po każdym impulsie jest szeroki QRS z falą T?',
 paceOk:'Wychwyt. Dodaj 10 miliamperów zapasu. Sprawdź tętno na tętnicy udowej, nie na szyjnej.',
 pacePulse:'Jest tętno na tętnicy udowej?',
 pacePEA:'Brak tętna mimo wychwytu. To PEA. Rozpocznij uciskanie, wracam do algorytmu NZK.',
 paceMax:'Maksymalny prąd bez wychwytu. Wezwij kardiologa. Sprawdź elektrody i ich położenie. Następny krok: wlew leku przyspieszającego i stymulacja przezżylna.',
 paceAnalg:'Jeśli pacjent przytomny, przed zwiększaniem prądu podaj analgezję.',
 paceConsc:'Czy pacjent jest przytomny?',
 paceMon:'Monitoruj oddech, saturację i ciśnienie. Miej przygotowany worek z maską i ssak.',
 fentGo:'Ile mililitrów fentanylu podano? Powiedz liczbę albo: podano.',midaGo:'Ile mililitrów midazolamu podano? Powiedz liczbę albo: podano.',
 midaMax:'Maksymalna dawka midazolamu.',
 paceNoSed:'Pacjent nieprzytomny. Bez sedacji, monitoruj.',
 bradyFail:'Atropina nieskuteczna. Przechodzę do stymulacji przezskórnej.',
 resumeCPR:'Wznawiaj uciskanie.',
 pulseQ:'Sprawdź tętno. Jest tętno?',
 escal:'Przy kolejnym wyładowaniu rozważ wyższą energię, zgodnie z defibrylatorem.',
 shock:'Powiedz: wyładowano.',
 afterShock:'Ucisk natychmiast. Kolejne dwie minuty.',
 cont:'Kontynuuj ucisk. Kolejne dwie minuty.',
 adr:'Podaj adrenalinę 1 miligram, czyli 1 mililitr z ampułki. Powiedz: podano.',
 amio300:'Podaj amiodaron 300 miligramów, czyli 6 mililitrów, dwie ampułki. Albo lidokaina 100 miligramów, czyli 5 mililitrów dwuprocentowej. Powiedz: podano.',
 amio150:'Podaj amiodaron 150 miligramów, czyli 3 mililitry, jedna ampułka. Albo lidokaina 50 miligramów, czyli 2 i pół mililitra. Powiedz: podano.',
 torsade:'Czy to częstoskurcz torsade de pointes?',
 mag:'Podaj siarczan magnezu 2 gramy, czyli 10 mililitrów dwudziestoprocentowego. Powiedz: podano.',
 intubQ:'Czy czujesz się pewnie w intubacji?',
 intubYes:'Intubacja. Przerwa w ucisku poniżej 5 sekund. Potwierdź kapnografią. Powiedz: intubacja, gdy rurka jest na miejscu.',
 intubNo:'Nadgłośniowy przyrząd, maska krtaniowa lub i-gel. Czekamy na anestezjologa.',
 intubDone:'Zapisano intubację. Ciągły ucisk, 10 oddechów na minutę, kapnografia.',
 etco2:'Podaj wartość CO2 w wydychanym powietrzu.',
 usg:'Zapisano USG. Tylko w przerwie na ocenę rytmu, przerwa poniżej 10 sekund.',
 calcium:'Podaj chlorek wapnia 10 procent, 10 mililitrów, czyli 1 gram. Powiedz: podano.',
 insulin:'Podaj insulinę krótko działającą 10 jednostek z glukozą 25 gramów, czyli 50 mililitrów glukozy 50-procentowej. Powiedz: podano.',
 glucose:'Podaj glukozę 20 procent, 100 mililitrów, czyli 20 gramów. Powiedz: podano.',
 bicarbQ:'Wodorowęglan nie rutynowo. Czy jest wskazanie: zatrucie trójcyklicznymi, hiperkaliemia z arytmią, kwasica hipochloremiczna lub długie zatrzymanie z potwierdzoną kwasicą?',
 bicarb:'Podaj wodorowęglan sodu 50 milimoli, czyli 50 mililitrów 8,4-procentowego. Powiedz: podano.',
 bicarbNo:'Nie podawaj wodorowęglanu.',
 lysis:'Tromboliza. Alteplaza 50 miligramów bolus, czyli 50 mililitrów. Kontynuuj resuscytację 60 do 90 minut. Powiedz: podano.',
 decision:'Dwadzieścia minut resuscytacji. Rozważ: CO2 w wydychanym powietrzu, przyczynę odwracalną, hipotermię i możliwość ECPR. Decyzja należy do lekarza. Prowadzę dalej.',
 endQ:'Zakończyć resuscytację? Powiedz: tak, zakończ.',
 adrinfArrest:'W trakcie zatrzymania krążenia adrenalina tylko w bolusie, 1 miligram.',
 weightAssume:'Przyjmuję 70 kilogramów, popraw jeśli inaczej.',
 tube:'Podaj rozmiar rurki.',usgRes:'Wynik USG? Powiedz krótko, na przykład: tamponada, odma, brak ruchów serca albo bez zmian.',
 glu:'Podaj glikemię.',gcs:'Podaj punktację GCS.',
 zrmAmio:'Ile miligramów amiodaronu podał zespół ratownictwa?',
 which:'Który lek zmienić: noradrenalina, dobutamina czy wlew w bradykardii?',
 downPump:'Zmniejszam. Ustaw pompę',
 noraLow:'Noradrenalina na dawce minimalnej. Rozważ wyłączenie pompy.',
 dobuMax:'Maksymalna dawka dobutaminy. Wezwij anestezjologa.',
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
 mapIs:'Średnie ciśnienie wynosi',
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
 rhythmPace:'Jaki masz rytm? Sprawdź wychwyt stymulatora i tętno.',
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
 acQ:'Czy pacjent przyjmuje leki przeciwkrzepliwe?',acDrug:'Który lek: dabigatran, rywaroksaban, apiksaban, warfaryna czy heparyna?',acDoac:'Przy lekach z grupy DOAC nie podawaj heparyny.',inrQ:'Podaj INR.',inrHigh:'INR powyżej 2,5. Nie podawaj heparyny.',inrUnknown:'Najpierw oznacz INR. Wstrzymaj heparynę.',hepLast:'Kiedy była ostatnia dawka heparyny?',hepRecent:'Ostatnia dawka mniej niż 12 godzin temu. Nie podawaj bolusu, skonsultuj dawkowanie.',hepLastUnknown:'Ustal czas ostatniej dawki. Wstrzymaj heparynę.',acUnknown:'Ustal leki przed podaniem heparyny.',hepStopped:'Heparyna wstrzymana – patrz wcześniejszy komunikat.',
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
const MS=1000,CYCLE=120*MS,REM=10*MS,ADRI=4*60*MS,MAPI=5*60*MS;
function Engine(opt){opt=opt||{};const E=this;E.now=opt.now||(()=>Date.now());E.out=opt.out||(()=>{});E.alarm=opt.alarm||(()=>{});E.persist=opt.persist||(()=>{});E.rand=opt.rand||Math.random;
 E.energy=opt.energy||'mindray';E.paceEl=opt.paceEl||'ap';E.paceMax=opt.paceMax||200;E.fentConc=opt.fentConc||50;E.midaConc=opt.midaConc||1;E.midaAmpMg=opt.midaAmpMg||5;E.midaAmpMl=opt.midaAmpMl||1;E.atroAmp=opt.atroAmp||0.5;E.atroDose=opt.atroDose||0.5;E.stacked=!!opt.stacked;E.mapHigh=opt.mapHigh||90;E.hep=Object.assign({u:25000,ml:50},opt.hep||{});E.hepAmp=opt.hepAmp||5000;E.amioInf=Object.assign({mg:900,ml:50},opt.amioInf||{});E.conc=opt.conc||{};E.sayConc=opt.sayConc!==false;E.s={mode:'idle'};}
const P=Engine.prototype;
P.say=function(t,kind){this.s.last=t;this.out(t,kind||'say')};
P.log=function(type,txt,extra){const s=this.s;const e=Object.assign({t:this.now(),type,txt},extra||{});s.log.push(e);this.persist(s);return e};
P.start=function(o){o=o||{};const now=this.now();this.s={mode:'arrest',sim:!!o.sim,t0:now,arrestT:now,cycleT:now,warned:false,rhythm:'?',shocks:0,adr:[],amio:0,lido:0,
 adrDue:null,q:[],cur:null,log:[],kg:o.kg||null,syr:o.syr||null,nora:null,dobu:null,lastMap:null,nextMap:null,ht:{},htIdx:0,cycles:0,handsOff:0,maxOff:0,
 airway:'worek z maską 30:2',intub:null,etco2:[],paused:false,decided:false,email:o.email||'',rosc:[],post:{},atropine:0,torsadeAsked:false,endAsk:false,sentQ:false,mapStep:null};
 const s=this.s;this.log('start','Start NZK'+(s.sim?' (SYMULACJA)':''));
 if(s.sim)this.simInit();
 this.say((s.sim?SAY.sim+' ':'')+SAY.start);
 this.ask('scen',SAY.scen,{def:'sor',tries:2});this.ask('team',SAY.team,{def:'skip',tries:1});
 return s};
// pytanie = pętla tymczasowa; gaśnie po odpowiedzi
P.ask=function(id,text,o){o=o||{};const q={id,text,def:o.def,tries:o.tries==null?Infinity:o.tries,prio:o.prio||0,asked:0,at:null,rem:0,data:o.data};
 const s=this.s;s.q=s.q.filter(x=>x.id!==id);if(s.cur&&s.cur.id===id)s.cur=null;
 let i=s.q.findIndex(x=>(x.prio||0)<q.prio);if(i<0)i=s.q.length;s.q.splice(i,0,q);
 if(s.cur&&(s.cur.prio||0)<q.prio){const c=s.cur;s.cur=null;let j=s.q.findIndex(x=>(x.prio||0)<(c.prio||0));if(j<0)j=s.q.length;s.q.splice(j,0,c)}
 this.pump();return q};
P.has=function(id){const s=this.s;return (s.cur&&s.cur.id===id)||s.q.some(x=>x.id===id)};
P.drop=function(id){const s=this.s;s.q=s.q.filter(x=>x.id!==id);if(s.cur&&s.cur.id===id){s.cur=null;this.pump()}};
P.pump=function(){const s=this.s;if(s.cur||!s.q.length||s.paused)return;s.cur=s.q.shift();s.cur.at=this.now();s.cur.rem=0;this.say(s.cur.text,'ask')};
P.tick=function(){const s=this.s,now=this.now();if(s.mode==='idle'||s.mode==='ended')return;
 if(s.paused)return;
 const c=s.cur;if(c&&now-c.at>=REM){c.rem++;c.at=now;
  if(c.rem>c.tries&&c.def!==undefined){s.cur=null;this.answer(c,{cmd:'default',def:c.def});this.pump()}
  else this.say(SAY.remind+' '+c.text,'remind')}
 if(s.aloneT&&now-s.aloneT>5*MS){s.aloneT=null;this.alarm('cpr');this.say(SAY.resumeCPR,'alarm');this.log('ucisk','Przerwa >5 s – wezwanie do wznowienia uciskania')}
 if(s.mode==='arrest'&&s.lucasP){const d=now-s.lucasP;if(!s.lucas5&&d>=5*MS){s.lucas5=true;this.say(SAY.lucas5,'alarm')}if(!s.lucas10&&d>=10*MS){s.lucas10=true;this.alarm('cpr');this.say(SAY.lucas10,'alarm')}}
 if(s.mode==='arrest'){const el=now-s.cycleT;
  if(!s.warned&&el>=CYCLE-15*MS){s.warned=true;this.say(SAY.warn15)}
  if(el>=CYCLE&&!this.has('rhythm')){s.offStart=now;if(s.sim)this.simShow();this.ask('rhythm',s.cprPace?SAY.rhythmPace:SAY.rhythm,{prio:2})}
  if(s.adrDue&&!s.adrHold&&now>=s.adrDue&&!this.has('adr')){this.ask('adr',SAY.adr,{prio:1})}
  if(!s.decided&&now-s.arrestT>=20*60*MS){s.decided=true;this.say(SAY.decision);this.log('decyzja','20 min RKO – omówienie kontynuacji')}
  if(s.sim&&now-(s.simSaid||s.t0)>=CYCLE){s.simSaid=now;this.say(SAY.sim,'sim')}}
 if(s.mode!=='arrest'){
 if(s.sedFentT&&now>=s.sedFentT&&!this.has('fentRep')){s.sedFentT=null;this.ask('fentRep',fentRepText(this),{prio:1,def:'skip',tries:1})}
 if(s.sedMidaT&&now>=s.sedMidaT&&!this.has('midaRep')){s.sedMidaT=null;this.ask('midaRep',midaRepText(this),{prio:1,def:'skip',tries:1})}
 if(s.bNext&&now>=s.bNext&&!this.has('bHR')&&!this.has('bSBP')&&!this.has('bSym')){s.bNext=null;this.ask('bHR',SAY.bHR,{prio:2,def:'skip',tries:2})}}
 if(s.mode==='rosc'&&s.nextMap&&now>=s.nextMap&&!this.has('sys')&&!this.has('dia')){s.nextMap=null;this.ask('sys',SAY.sys,{tries:Infinity})}};
P.lucasOff=function(){const s=this.s,now=this.now();if(s.lucasP)return;s.lucasP=now;s.lucas5=false;s.lucas10=false;if(!s.offStart)s.offStart=now;this.log('LUCAS','LUCAS wstrzymany');
 let t=SAY.lucasOff;if(s.gasCyc!==s.cycles){s.gasCyc=s.cycles;t+=' '+SAY.gas}this.say(t,'alarm');if(!this.has('rhythm'))this.ask('rhythm',s.cprPace?SAY.rhythmPace:SAY.rhythm,{prio:2})};
P.lucasEnd=function(){const s=this.s,now=this.now();if(!s.lucasP)return;const d=(now-s.lucasP)/MS;s.lucasP=null;s.lucasOffT=(s.lucasOffT||0)+d;s.lucasN=(s.lucasN||0)+1;this.log('LUCAS','Przerwa LUCAS '+Math.round(d)+' s')};
P.lucasOn=function(){const s=this.s,now=this.now();this.lucasEnd();if(s.offStart){const off=(now-s.offStart)/MS;s.handsOff+=off;s.maxOff=Math.max(s.maxOff,off);s.offStart=null}this.log('LUCAS','LUCAS pracuje');this.say(SAY.lucasOn,'ack')};
P.newCycle=function(txt){const s=this.s,now=this.now();this.lucasEnd();if(s.offStart){const off=(now-s.offStart)/MS;s.handsOff+=off;s.maxOff=Math.max(s.maxOff,off);s.offStart=null}
 s.cycleT=now;s.warned=false;s.cycles++;if(txt)this.say(txt);
 // drogi oddechowe po 1. cyklu, 4H4T od 2. cyklu, po jednej przyczynie na cykl
 if(s.cycles===1&&!s.intub)this.ask('intubQ',SAY.intubQ,{def:'no',tries:2});
 if(s.cycles>=2&&s.htIdx<HT.length&&!this.has('ht'))this.ask('ht',htQ(s.htIdx),{def:'skip',tries:1,data:s.htIdx});
 if(s.intub&&s.cycles%2===0)this.ask('etco2',SAY.etco2,{def:'skip',tries:1})};
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
P.setRhythm=function(shockable){const s=this.s;s.rhythm=shockable?'VF/pVT':'asystolia/PEA';this.drop('rhythm');this.log('rytm',shockable?'Rytm do defibrylacji (VF/pVT)':'Rytm nie do defibrylacji (asystolia/PEA)',{shockable});
 if(shockable){this.say(vfInstr(this.energy,s.shocks)+(s.shocks>=1&&!ENERGY_SEQ[this.energy]&&this.energy!=='max'?' '+SAY.escal:''));this.log('energia','Energia: '+energyFor(this.energy,s.shocks)+(/^\d/.test(energyFor(this.energy,s.shocks))?' J':''));if(this.stacked&&s.shocks===0&&s.scen!=='przywieziony')this.say(SAY.stacked);this.ask('shock',SAY.shock,{prio:2});
  if(!s.torsadeAsked){s.torsadeAsked=true;this.ask('torsade',SAY.torsade,{def:'no',tries:1})}}
 else{this.newCycle(SAY.nonshockI);s.adrHold=false;if(!s.adrDue||s.adrDue<=this.now())this.ask('adr',SAY.adrNow,{prio:1})}};
P.onRhythmCmd=function(c){const s=this.s;this.drop('rhythm');
 if(c==='shockable'){this.setRhythm(true);return true}if(c==='nonshock'||c==='nopulse'){this.setRhythm(false);return true}
 if(c==='organised'){this.log('rytm','Rytm zorganizowany – sprawdzenie tętna');this.ask('pulse',SAY.pulseQ,{prio:2});return true}
 if(c==='pulse'){this.newCycle();this.toRosc();return true}
 if(c==='brady'){this.newCycle();this.log('rytm','Bradykardia z tętnem');this.toRosc();this.startBrady();return true}return false};
// odpowiedź na bieżące pytanie
P.answer=function(q,r){if(r.cmd==='next'){if(q.def==='skip'||q.def==='go')r={cmd:'default',def:q.def,skip:true};else return false}
 const s=this.s,c=r.cmd,yes=c==='yes'||c==='given'||c==='present'||c==='checked',no=c==='no';
 const def=c==='default';const D=def?r.def:null;
 switch(q.id){
 case 'scen':if(c==='brought'||D==='brought'){s.scen='przywieziony';this.log('scenariusz','Pacjent przywieziony w trakcie RKO');this.ask('mins',SAY.mins,{def:'skip',tries:2})}
  else if(c==='sor'||def){s.scen='SOR';this.log('scenariusz','NZK w SOR')}else return false;break;
 case 'mins':if(r.num!=null){s.arrestT=this.now()-r.num*60*MS;this.log('scenariusz','RKO trwa od '+r.num+' min');this.ask('zrmAdr',SAY.zrmAdr,{def:'skip',tries:1});this.ask('zrmShk',SAY.zrmShk,{def:'skip',tries:1});this.ask('zrmAmio',SAY.zrmAmio,{def:'skip',tries:1})}else if(!def)return false;break;
 case 'zrmAdr':if(r.num!=null){const n=Math.round(r.num),now=this.now();for(let k=0;k<n;k++)s.adr.push(now);this.log('lek','ZRM: adrenalina łącznie '+n+' mg',{drug:'adrenalina (ZRM)',dose:n+' mg',zrm:true});if(n>0)s.adrDue=now+3*60*MS}else if(!def&&!no)return false;break;
 case 'zrmAmio':if(r.num!=null){if(r.num>=300)s.amio++;if(r.num>=450)s.amio++;this.log('lek','ZRM: amiodaron łącznie '+r.num+' mg',{drug:'amiodaron (ZRM)',dose:r.num+' mg'})}else if(!def&&!no)return false;break;
 case 'zrmShk':if(r.num!=null){s.shocks+=r.num;s.epShocks=(s.epShocks||0)+r.num;this.log('wyładowanie','ZRM: '+r.num+' wyładowań')}else if(!def&&!no)return false;break;
 case 'team':if(yes||def)this.log('zespół','Role przydzielone');else return false;break;
 case 'rhythm':if(!this.onRhythmCmd(c))return false;break;
 case 'pulse':if(yes||c==='pulse'){this.newCycle();this.toRosc()}else if(no||c==='nopulse'){this.setRhythm(false)}else return false;break;
 case 'shock':if(yes||c==='shock_done')this.shockDone();else if(no){this.newCycle(SAY.cont)}else return false;break;
 case 'adr':if(yes||c==='adr')this.giveAdr();else return false;break;
 case 'amio':if(c==='lido')this.giveAmio(true);else if(yes||c==='amio')this.giveAmio(false);else return false;break;
 case 'torsade':if(yes){this.log('rytm','Torsade de pointes');this.ask('mag',SAY.mag)}else if(no||def){}else return false;break;
 case 'mag':if(yes){this.log('lek','Siarczan magnezu 2 g',{drug:'siarczan magnezu',dose:'2 g'});this.say(SAY.logged+' magnez.','ack')}else return false;break;
 case 'intubQ':if(yes){s.airway='intubacja (planowana)';this.log('drogi oddechowe','Pewny w intubacji – intubacja');this.say(SAY.intubYes)}
  else if(no||def){s.airway='nadgłośniowy przyrząd';this.log('drogi oddechowe','Nadgłośniowy przyrząd (maska krtaniowa/i-gel)');this.say(SAY.intubNo)}else return false;break;
 case 'etco2':if(r.num!=null){s.etco2.push({t:this.now(),v:r.num});this.log('kapnografia','EtCO₂ '+r.num+' mmHg');this.say(SAY.logged+' '+r.num+'.','ack')}else if(!def&&!no)return false;break;
 case 'ht':{const i=q.data;if(yes){s.ht[HT[i][0]]='✓';this.log('4H4T',HT[i][0]+': potwierdzona');this.say(HT[i][1]);this.htTreat(i)}
  else if(no){s.ht[HT[i][0]]='✗';this.log('4H4T',HT[i][0]+': wykluczona')}else if(def){s.ht[HT[i][0]]='–'}else return false;s.htIdx=i+1;
  for(const[g,L,k]of[[HT_H,'Cztery H sprawdzone.','htH'],[HT_T,'Cztery T sprawdzone.','htT']])if(!s[k]&&g.every(n=>s.ht[n])){s[k]=true;this.log('4H4T',L.slice(0,-1));this.say(L)}break}
 case 'ccb':if(yes){this.ask('calcium',SAY.calcium)}else if(!no&&!def)return false;this.ask('tca',SAY.bicarbQ,{def:'no',tries:1});break;
 case 'insulin':if(yes){this.log('lek','Insulina 10 j. + glukoza 25 g (50 ml 50%)',{drug:'insulina+glukoza',dose:'10 j. / 25 g'});this.say(SAY.logged+' insulina z glukozą.','ack')}else return false;break;
 case 'glucose':if(yes){this.log('lek','Glukoza 20% 100 ml (20 g)',{drug:'glukoza',dose:'20 g'});this.say(SAY.logged+' glukoza.','ack')}else return false;break;
 case 'calcium':if(yes){this.log('lek','Chlorek wapnia 10% 10 ml (1 g)',{drug:'wapń',dose:'1 g'});this.say(SAY.logged+' wapń.','ack')}else return false;break;
 case 'tca':case 'bicarbQ':if(yes)this.ask('bicarb',SAY.bicarb);else if(no||def){this.say(SAY.bicarbNo);this.log('lek','Wodorowęglan – brak wskazania')}else return false;break;
 case 'bicarb':if(yes){this.log('lek','Wodorowęglan sodu 8,4% 50 ml (50 mmol)',{drug:'wodorowęglan',dose:'50 mmol'});this.say(SAY.logged+' wodorowęglan.','ack')}else return false;break;
 case 'lysis':if(yes){s.lysisT=this.now();this.log('lek','Alteplaza 50 mg bolus',{drug:'trombolityk',dose:'50 mg'});this.say(SAY.logged+' tromboliza. Kontynuuj 60 do 90 minut.','ack');this.startInf('hep','pe')}else return false;break;
 case 'endQ':s.endAsk=false;if(c==='zakoncz_tak'||c==='yes'){this.finish();return true}this.say(SAY.endCancel);break;
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
  else if(/heparyn|enoksaparyn|clexan|kleksan|fraksyparyn/.test(t)){this.log('heparyna – bezpieczeństwo','Lek: heparyna ('+r.text+')');this.ask('hepLast',SAY.hepLast,{prio:2})}else return false;break}
 case 'inrQ':if(r.num!=null&&r.num>0&&r.num<15){if(r.num>2.5)this.hepGateEnd('stop','INR '+fmt1(r.num)+' (>2,5) – heparyna przeciwwskazana',SAY.inrHigh);else this.hepGateEnd('ok','INR '+fmt1(r.num)+' (≤2,5) – heparyna dozwolona')}else if(c==='unknown'||no){this.hepGateEnd('stop','INR nieznany – heparyna wstrzymana do oznaczenia',SAY.inrUnknown)}else return false;break;
 case 'hepLast':{const t=norm(r.text);if(/wlew|pomp|trwa|teraz|w trakcie/.test(t)||(r.num!=null&&r.num<12)||/godzin[ea]? temu/.test(t)&&r.num==null){this.hepGateEnd('stop','Ostatnia dawka heparyny <12 h'+(r.num!=null?' ('+r.num+' h)':' / trwający wlew')+' – bez bolusu, konsultacja (próg 12 h – DO WERYFIKACJI)',SAY.hepRecent)}
  else if(r.num!=null&&r.num>=12){this.hepGateEnd('ok','Ostatnia dawka heparyny '+r.num+' h temu (≥12 h; próg DO WERYFIKACJI)')}else if(c==='unknown'){this.hepGateEnd('stop','Czas ostatniej dawki heparyny nieznany – wstrzymano',SAY.hepLastUnknown)}else return false;break}
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
P.dobuUp=function(){const s=this.s;if(s.dobu.dose>=20-1e-9){this.alarm('dobu');this.say(SAY.dobuMax,'alarm');this.log('alarm','Dobutamina 20 µg/kg/min');return}
 s.dobu.dose=Math.min(20,s.dobu.dose+2.5);s.dobu.mlh=dobuMlh(s.dobu.dose,s.kg);this.log('lek','Dobutamina ↑ '+fmt1(s.dobu.mlh)+' ml/h = '+fmt1(s.dobu.dose)+' µg/kg/min',{drug:'dobutamina',dose:fmt1(s.dobu.dose)+' µg/kg/min',mlh:s.dobu.mlh});this.say(SAY.upPump+' '+flowPhrase(s.dobu.mlh)+'.');
 if(s.dobu.dose>=20-1e-9){this.alarm('dobu');this.say(SAY.dobuMax,'alarm')}};
P.noraDown=function(){const s=this.s;if(s.nora.dose<=.05+1e-9){this.say(SAY.noraLow);return}s.nora.dose=Math.round((s.nora.dose-.05)*100)/100;s.nora.mlh=noraMlh(s.nora.dose,s.kg,s.syr);
 this.log('lek','Noradrenalina ↓ '+fmt1(s.nora.mlh)+' ml/h = '+String(s.nora.dose).replace('.',',')+' µg/kg/min',{drug:'noradrenalina',dose:String(s.nora.dose).replace('.',',')+' µg/kg/min',mlh:s.nora.mlh});this.say(SAY.downPump+' '+flowPhrase(s.nora.mlh)+'.')};
const HEPR={pe:18,acs:12},HEPB={pe:80,acs:60},HEPBMAX={acs:5000},HEPRMAX={acs:1000};
function fmt2(x){const v=Math.round(x*100)/100;return String(v).replace('.',',')}
function hepCalc(ind,kg,ampU,u,ml){const bu=Math.min(HEPB[ind]*kg,HEPBMAX[ind]||Infinity),bml=Math.round(bu/ampU*100)/100,rate=Math.min(HEPR[ind]*kg,HEPRMAX[ind]||Infinity),mlh=r1(rate/(u/ml));return {bu,bml,rate,mlh}}
function hepBolusText(bml){return 'Bolus heparyny: nabierz '+fmt2(bml)+' '+(Number.isInteger(bml)?mlWord(bml):'mililitra')+' z ampułki, podaj dożylnie.'}
function hepPrepText(u,ml){return 'Przygotuj '+(u%1000===0?(u/1000)+' tysięcy':u)+' jednostek heparyny w '+ml+' mililitrach.'}
P.hepGateEnd=function(res,txt,sayTxt){const s=this.s;s.hepGate=res;s.hepGateTxt=txt;this.log('heparyna – bezpieczeństwo',txt);if(sayTxt)this.say(sayTxt,'alarm');if(res==='ok'&&s.hepGatePend){const i=s.hepGatePend;s.hepGatePend=null;this.startInf('hep',i)}else if(res==='stop'){s.hepGatePend=null;s.hepAfterRosc=null}};
P.startInf=function(k,ind){const s=this.s;if(k==='hep'&&s.hepGate!=='ok'){if(s.hepGate==='stop'){this.say(SAY.hepStopped);return}s.hepGatePend=ind;this.ask('acQ',SAY.acQ,{prio:2});return}if(k==='hep'&&!s.kg){s.infPending=[k,ind];this.ask('weight',SAY.weight,{prio:2});return}s.infPending=null;s.infs=s.infs||{};
 if(k==='hep'){const now=this.now(),c=hepCalc(ind,s.kg,this.hepAmp,this.hep.u,this.hep.ml),lbl=ind==='pe'?'zatorowość płucna':'OZW';s.infs.hep=Object.assign({ind,bolusOnly:!!s.hepBolusOnly},c);
  this.log('lek','Heparyna bolus '+c.bu+' j. ('+HEPB[ind]+' j./kg'+(HEPBMAX[ind]?', max '+HEPBMAX[ind]+' j.':'')+') = '+fmt2(c.bml)+' ml z ampułki '+this.hepAmp+' j./ml ('+lbl+')',{drug:'heparyna bolus',dose:c.bu+' j.'});
  if(s.mode==='arrest'){s.hepAfterRosc=ind;this.log('lek','Wlew heparyny wstrzymany do ROSC (RKO)');this.say(hepBolusText(c.bml)+' '+SAY.hepNoInf);this.ask('infGo','Powiedz: podano.',{def:'skip',tries:2,prio:1,data:'Heparyna bolus'});return}
  s.hepAfterRosc=null;s.infs.hep.aptt=now+6*3600*1000;
  this.log('lek','Heparyna wlew '+this.hep.u+' j./'+this.hep.ml+' ml: '+fmt1(c.mlh)+' ml/h = '+c.rate+' j./h ('+HEPR[ind]+' j./kg/h'+(HEPRMAX[ind]?', max '+HEPRMAX[ind]+' j./h':'')+'); kontrola APTT o '+hhmm(now+6*3600*1000).slice(0,5),{drug:'heparyna wlew',dose:HEPR[ind]+' j./kg/h',mlh:c.mlh});
  this.say(hepBolusText(c.bml)+' '+hepPrepText(this.hep.u,this.hep.ml)+' '+SAY.setPump+' '+flowPhrase(c.mlh)+'. '+SAY.aptt);this.ask('infGo','Powiedz: podano, gdy pompa ruszy.',{def:'skip',tries:2,prio:1,data:'Heparyna'})}
 else{const mlh=r1(this.amioInf.ml/24);s.infs.amio={mlh};this.log('lek','Amiodaron wlew '+this.amioInf.mg+' mg/'+this.amioInf.ml+' ml na 24 h: '+fmt1(mlh)+' ml/h – DO WERYFIKACJI',{drug:'amiodaron wlew',dose:this.amioInf.mg+' mg/24 h',mlh});
  this.say('Amiodaron: '+this.amioInf.mg+' miligramów dociągnij glukozą 5 procent do '+this.amioInf.ml+' mililitrów. '+SAY.setPump+' '+flowPhrase(mlh)+'.');this.ask('infGo','Powiedz: podano, gdy pompa ruszy.',{def:'skip',tries:2,prio:1,data:'Amiodaron'})}};
P.setKg=function(kg){const s=this.s;s.kg=kg;s.kgAssumed=false;this.log('masa','Korekta masy ciała: '+kg+' kg');this.say(SAY.logged+' '+kg+' kilogramów.','ack');
 if(s.nora){s.nora.mlh=noraMlh(s.nora.dose,kg,s.syr);this.say('Noradrenalina. '+SAY.setPump+' '+flowPhrase(s.nora.mlh)+'.')}
 if(s.dobu){s.dobu.mlh=dobuMlh(s.dobu.dose,kg);this.say('Dobutamina. '+SAY.setPump+' '+flowPhrase(s.dobu.mlh)+'.')}
 if(s.binf&&BINF[s.binf.d].unit==='kgmin'){s.binf.mlh=binfMlh(s.binf.d,s.binf.dose,kg,this.conc);this.say('Dopamina. '+SAY.setPump+' '+flowPhrase(s.binf.mlh)+'.')}};
P.startBrady=function(){this.log('bradykardia','Bradykardia – ścieżka ERC 2025');this.ask('bradySigns',SAY.bradySigns,{prio:2,def:'yes',tries:2})};
P.startBinf=function(d){const s=this.s;if(BINF[d].unit==='kgmin'&&!s.kg){s.binfPending=d;this.ask('weight',SAY.weight,{prio:2});return}s.binfPending=null;
 const c=binfConc(d,this.conc),dose=c.start,mlh=binfMlh(d,dose,s.kg,this.conc);s.binf={d,dose,mlh};
 this.log('lek',c.name+' '+c.mg+' mg/'+c.ml+' ml: '+fmt1(mlh)+' ml/h = '+String(dose).replace('.',',')+(c.unit==='kgmin'?' µg/kg/min':' µg/min'),{drug:c.name,dose:String(dose).replace('.',',')+(c.unit==='kgmin'?' µg/kg/min':' µg/min'),mlh});
 this.say(binfPrep(d,this.conc,this.sayConc)+' '+SAY.setPump+' '+flowPhrase(mlh)+'.');this.ask('binfGo','Powiedz: podano, gdy pompa ruszy.',{def:'skip',tries:2,prio:1});s.bphase='binf'};
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
P.htTreat=function(i){const n=HT[i][0];if(n==='hiperkaliemia'){this.ask('calcium',SAY.calcium);this.ask('insulin',SAY.insulin);this.ask('bicarbQ',SAY.bicarbQ,{def:'no',tries:1})}
 if(n==='hipoglikemia')this.ask('glucose',SAY.glucose);if(n==='hipomagnezemia')this.ask('mag',SAY.mag);
 if(n==='zatorowość płucna')this.ask('lysis',SAY.lysis);if(n==='zawał')this.log('4H4T','Zawał – PCI do rozważenia');if(n==='toksyny')this.ask('ccb','Czy zatrucie blokerami kanału wapniowego?',{def:'no',tries:1});
 if(this.s.sim&&this.s.simCause===n)this.s.simTreated=true};
// wejście z mowy/przycisku
P.input=function(alts){const s=this.s;const r=interpret(alts);s.heard=r.text;
 if(s.mode==='idle'||s.mode==='ended'){if(r.cmd==='replay')this.replay();if(r.cmd==='send')return 'send';return r.cmd}
 // komendy globalne
 switch(r.cmd){
 case 'replay':this.replay();return r.cmd;
 case 'pace':if(s.mode==='arrest'){s.cprPace=true;this.log('stymulacja','RKO ze stymulacją (asystolia z załamkami P / blok całkowity) – DO WERYFIKACJI');this.say(SAY.cprPace+', '+this.paceMax+' miliamperów. '+SAY.cprPace2);return r.cmd}this.startPacing();return r.cmd;
 case 'adrinf':if(s.mode==='arrest'){this.say(SAY.adrinfArrest);return r.cmd}if(!(s.cur&&s.cur.id==='bradyDrug')){this.ask('adrinfQ',SAY.adrinfQ,{prio:2,def:'no',tries:1});return r.cmd}break;
 case 'hepinf':if(s.mode==='arrest'){this.say(SAY.hepNoInf);return r.cmd}{this.ask('hepQ',SAY.hepQ,{prio:1});return r.cmd}break;
 case 'amioinf':if(s.mode!=='arrest'){this.startInf('amio');return r.cmd}break;
 case 'kg':if(r.num!=null&&!(s.cur&&s.cur.id==='weight')&&r.num>=20&&r.num<=250){this.setKg(r.num);return r.cmd}break;
 case 'down':if(s.nora&&s.mode!=='arrest'){this.noraDown();return r.cmd}break;
 case 'alone':s.aloneT=this.now();this.log('ucisk','Brak drugiej osoby do ucisku – instrukcja, licznik przerwy 5 s');this.say(SAY.alone,'ack');return r.cmd;
 case 'lucas_off':if(s.mode==='arrest'){this.lucasOff();return r.cmd}break;
 case 'lucas_on':if(s.mode==='arrest'){this.lucasOn();return r.cmd}break;
 case 'pause':s.paused=true;this.say(SAY.paused);return r.cmd;
 case 'end':s.endAsk=true;this.ask('endQ',SAY.endQ,{prio:3,def:'cancel',tries:2});return r.cmd;
 case 'zakoncz_tak':this.finish();return r.cmd;
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
 const ok=this.answer(c,r);
 if(ok){if(s.cur===c)s.cur=null;this.pump()}else{c.at=this.now();this.say(SAY.notUnd+' '+c.text,'ask')}
 return r.cmd};
P.replay=function(){const s=this.s;const t=s.cur?s.cur.text:s.last;if(t)this.out(t,'replay');else this.out(SAY.nothing,'replay')};
P.toRosc=function(){const s=this.s,now=this.now();s.mode='rosc';s.rosc.push(now);s.q=s.q.filter(q=>['hepRoscQ','weight','syr','spo2','ekg','stemi','temp','glu','gcs','tube','usgRes'].includes(q.id));s.cur=null;if(s.hepAfterRosc)this.ask('hepRoscQ',SAY.hepRosc,{prio:1,def:'no',tries:2});
 this.log('ROSC','Powrót spontanicznego krążenia');this.say(SAY.rosc);this.ask('sys',SAY.sys,{prio:0});
 if(!s.post.spo2)this.ask('spo2',SAY.spo2,{def:'skip',tries:2});if(!s.post.ekg)this.ask('ekg',SAY.ekg,{def:'skip',tries:2});if(!s.post.temp)this.ask('temp',SAY.temp,{def:'skip',tries:2});if(s.post.glu==null)this.ask('glu',SAY.glu,{def:'skip',tries:2});if(s.post.gcs==null)this.ask('gcs',SAY.gcs,{def:'skip',tries:2})};
P.toArrest=function(quiet){const s=this.s;s.mode='arrest';s.q=[];s.cur=null;s.nextMap=null;s.bNext=null;s.sedFentT=null;s.sedMidaT=null;s.epShocks=0;s.adrHold=true;s.rhythm='?';this.log('NZK','Ponowne zatrzymanie krążenia');s.cycleT=this.now();s.warned=false;if(!quiet)this.say(SAY.rearrest);
 s.offStart=this.now();this.ask('rhythm',SAY.rhythm,{prio:2})};
// pętla MAP (stała, co 5 min)
P.onMap=function(m,sy,di){const s=this.s;s.lastMap=m;this.log('ciśnienie',sy+'/'+di+' mmHg, MAP '+m,{map:m});s.nextMap=this.now()+MAPI;
 const pre=SAY.mapIs+' '+m+'.';
 if(m<65){if(!s.nora){this.say(pre);this.startNora()}else{this.say(pre);this.noraUp()}}
 else{if(s.nora&&m>=this.mapHigh&&s.nora.dose>.05+1e-9){this.say(pre);this.noraDown()}else if(s.nora){this.say(pre+' '+SAY.keepPump+' '+flowPhrase(s.nora.mlh)+'.')}else this.say(pre);
  if(!s.dobu&&!s.dobuAsked)this.ask('lowOut',SAY.lowOut,{def:'no',tries:1})}};
P.startNora=function(){const s=this.s;s.noraPending=true;this.contNora()};
P.contNora=function(){const s=this.s;if(s.noraPending){if(!s.kg){this.ask('weight',SAY.weight,{prio:1});return}
 if(!s.syr){this.ask('syr',SAY.syr,{prio:1,def:50,tries:1});return}
 s.noraPending=false;const dose=.05,mlh=noraMlh(dose,s.kg,s.syr);s.nora={dose,mlh};
 this.log('lek','Noradrenalina '+NORA[s.syr].mg+' mg/'+NORA[s.syr].ml+' ml: '+fmt1(mlh)+' ml/h = 0,05 µg/kg/min',{drug:'noradrenalina',dose:'0,05 µg/kg/min',mlh});
 this.say((s.syr===20?SAY.noraPrep20:SAY.noraPrep50)+' '+SAY.setPump+' '+flowPhrase(mlh)+'.');this.ask('noraGo','Powiedz: podano, gdy pompa ruszy.',{def:'skip',tries:2,prio:1})}
 if(s.dobuPending){if(!s.kg){this.ask('weight',SAY.weight,{prio:1});return}this.startDobu()}};
P.noraUp=function(){const s=this.s;const d=r1(s.nora.dose*100+5)/100;s.nora.dose=Math.round(d*100)/100;s.nora.mlh=noraMlh(s.nora.dose,s.kg,s.syr);
 this.log('lek','Noradrenalina ↑ '+fmt1(s.nora.mlh)+' ml/h = '+String(s.nora.dose).replace('.',',')+' µg/kg/min',{drug:'noradrenalina',dose:String(s.nora.dose).replace('.',',')+' µg/kg/min',mlh:s.nora.mlh});
 this.say(SAY.upPump+' '+flowPhrase(s.nora.mlh)+'.');
 if(s.nora.dose>=.3-1e-9){this.alarm('nora');this.say(SAY.noraHigh,'alarm');this.log('alarm','Noradrenalina ≥0,3 µg/kg/min – wezwać anestezjologa')}};
P.startDobu=function(){const s=this.s;if(!s.kg){s.dobuPending=true;this.ask('weight',SAY.weight,{prio:1});return}s.dobuPending=false;
 const mlh=dobuMlh(5,s.kg);s.dobu={dose:5,mlh};this.log('lek','Dobutamina 250 mg/50 ml: '+fmt1(mlh)+' ml/h = 5 µg/kg/min',{drug:'dobutamina',dose:'5 µg/kg/min',mlh});
 this.say(SAY.dobuPrep+' '+SAY.setPump+' '+flowPhrase(mlh)+'.');this.ask('dobuGo','Powiedz: podano, gdy pompa ruszy.',{def:'skip',tries:2,prio:1})};
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
 if(!s.intub&&s.airway.indexOf('nadgłośniowy')<0)miss.push('Brak zabezpieczenia dróg oddechowych');if(!s.etco2.length)miss.push('Brak kapnografii');
 if(s.handsOff/Math.max(1,s.cycles)>10)late.push('Średnia przerwa w ucisku '+(s.handsOff/Math.max(1,s.cycles)).toFixed(0)+' s (cel <5–10 s)');
 const speech='Podsumowanie symulacji. Dobrze: '+good.length+'. Spóźnione: '+late.length+'. Pominięte: '+miss.length+'. Szczegóły na ekranie.';
 return {good,late,miss,speech,handsOff:Math.round(s.handsOff),shocks:s.shocks}};
// ---------- raport ----------
function hhmm(t){const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+':'+String(d.getSeconds()).padStart(2,'0')}
function report(s){const L=s.log||[],end=s.tEnd||Date.now();const dur=Math.round((end-s.arrestT)/60000);
 const drugs=L.filter(e=>e.type==='lek').map(e=>[hhmm(e.t),e.txt]);
 const sum=[['Tryb',s.sim?'SYMULACJA – nie do dokumentacji pacjenta':'Rzeczywisty'],['Scenariusz',s.scen||'SOR'],['Godzina NZK',hhmm(s.arrestT)],['Start prowadzenia',hhmm(s.t0)],
  ['ROSC',s.rosc.length?s.rosc.map(hhmm).join(', '):'nie'],['Zakończenie',s.tEnd?hhmm(s.tEnd):'w toku'],['Czas RKO',dur+' min'],
  ['Wyładowania',String(s.shocks)],['Adrenalina',s.adr.length+' × 1 mg'],['Amiodaron / lidokaina',s.amio+' / '+s.lido],
  ['Przerwy w ucisku (szac.)',Math.round(s.handsOff)+' s łącznie, najdłuższa '+Math.round(s.maxOff)+' s'],['Przerwy LUCAS',s.lucasN?(s.lucasN+'×, łącznie '+Math.round(s.lucasOffT)+' s'):'–'],['Drogi oddechowe',s.airway+(s.tube?', rurka nr '+fmt1(s.tube):'')],['POCUS',s.usgRes||'—'],
  ['EtCO₂',s.etco2.length?s.etco2.map(e=>e.v).join(', ')+' mmHg':'brak danych'],
  ['Noradrenalina',s.nora?fmt1(s.nora.mlh)+' ml/h ('+String(s.nora.dose).replace('.',',')+' µg/kg/min), '+NORA[s.syr].mg+' mg/'+NORA[s.syr].ml+' ml':'nie'],
  ['Dobutamina',s.dobu?fmt1(s.dobu.mlh)+' ml/h ('+fmt1(s.dobu.dose)+' µg/kg/min), 250 mg/50 ml':'nie'],['Masa ciała',s.kg?s.kg+' kg':'—'],
  ['Ostatnie ciśnienie średnie',s.lastMap!=null?s.lastMap+' mmHg':'—'],['SpO₂',s.post.spo2!=null?s.post.spo2+'%':'—'],['EKG 12-odpr. / STEMI',(s.post.ekg||'—')+' / '+(s.post.stemi||'—')],['Bradykardia – leki',s.atropine?'atropina '+fmt1(s.atropine)+' mg ('+(s.atroN||0)+' dawek)':'—'],['Wlew w bradykardii',s.binf?BINF[s.binf.d].name+' '+fmt1(s.binf.mlh)+' ml/h ('+String(s.binf.dose).replace('.',',')+(BINF[s.binf.d].unit==='kgmin'?' µg/kg/min':' µg/min')+')':'nie'],['Stymulacja przezskórna',s.cprPace&&!s.pacing?'w trakcie RKO (załamki P bez QRS), prąd maksymalny, 70/min':s.pacing?(s.pacing.capture?'wychwyt '+s.pacing.capture+' mA, ustawione '+s.pacing.mA+' mA, 70/min':'bez wychwytu ('+(s.pacing.mA||'—')+' mA)')+', elektrody '+(s.pacing.el==='al'?'przednio-boczne':'przednio-tylne'):'nie'],['Analgosedacja',s.sed?'fentanyl '+fmt1(s.sed.fent)+' ml ('+Math.round(s.sed.fent*(s.fentConc||50))+' µg, '+(s.fentConc||50)+' µg/ml), midazolam '+fmt1(s.sed.mida)+' ml ('+fmt1(s.sed.mida*(s.midaConc||1))+' mg, '+fmt1(s.midaConc||1)+' mg/ml)':'nie'],['Temperatura',s.post.temp!=null?s.post.temp+' °C':'—'],['Glikemia',s.post.glu!=null?s.post.glu+' mg/dl':'—'],['GCS',s.post.gcs!=null?String(s.post.gcs):'—'],['Masa ciała – źródło',s.kgAssumed?'PRZYJĘTA 70 kg (nieznana)':s.kg?'podana':'—'],['Heparyna – bezpieczeństwo',s.hepGateTxt||'—'],['Heparyna',s.infs&&s.infs.hep?('bolus '+s.infs.hep.bu+' j. ('+fmt2(s.infs.hep.bml)+' ml)'+(s.infs.hep.aptt?'; wlew '+s.infs.hep.rate+' j./h = '+HEPR[s.infs.hep.ind]+' j./kg/h'+(s.infs.hep.rate<HEPR[s.infs.hep.ind]*s.kg?' (limit '+HEPRMAX[s.infs.hep.ind]+' j./h)':'')+', '+fmt1(s.infs.hep.mlh)+' ml/h; APTT o '+hhmm(s.infs.hep.aptt).slice(0,5):'; wlew – po ROSC')+' ('+(s.infs.hep.ind==='pe'?'zatorowość płucna':'OZW')+')'):'—'],['Amiodaron wlew',s.infs&&s.infs.amio?fmt1(s.infs.amio.mlh)+' ml/h (900 mg/24 h)':'nie']];
 const ht=HT.map(h=>[h[0],s.ht[h[0]]||'–']);
 return {sum,drugs,ht,timeline:L.map(e=>[hhmm(e.t),e.type,e.txt]),missing:sum.filter(x=>x[1]==='—').map(x=>x[0])}}
// lista wszystkich stałych komunikatów (do generowania nagrań)
function staticPhrases(){const a=new Set(Object.values(SAY).filter(Boolean));HT.forEach((h,i)=>{a.add(h[1]);a.add(htQ(i))});
 ['Podaj','Powiedz: podano, gdy pompa ruszy.','Czy zatrucie blokerami kanału wapniowego?','Symulacja: na monitorze rytm zatokowy, wyczuwalne tętno.'].forEach(x=>a.add(x));
 Object.keys(ENERGY).concat(Object.keys(ENERGY_SEQ)).forEach(e=>{a.add(vfInstr(e));a.add(vfInstr(e,1));a.add(vfInstr(e,2))});
 for(let m=40;m<=200;m+=10)a.add(paceUp(m));[140,200].forEach(m=>a.add(SAY.cprPace+', '+m+' miliamperów.'));for(const d of [.5,1])for(const am of [.5,1]){a.add(atroText(d,am));a.add(atroNext(d,am))}const dO={};a.add('Cztery H sprawdzone.');a.add(SAY.lucasOff+' '+SAY.gas);a.add('Cztery T sprawdzone.');a.add(hepPrepText(25000,50));for(let kg=40;kg<=150;kg++)for(const ind of ['pe','acs'])a.add(hepBolusText(hepCalc(ind,kg,5000,25000,50).bml));a.add(SAY.hepNoInf);a.add('Amiodaron: 900 miligramów dociągnij glukozą 5 procent do 50 mililitrów.');['Noradrenalina.','Dobutamina.','Dopamina.','Zapisano: insulina z glukozą.','Zapisano: glukoza.','Zapisano: fentanyl.','Zapisano: midazolam.'].forEach(x=>a.add(x));a.add(sedText(dO));a.add(fentRepText(dO));a.add(midaRepText(dO));a.add(fentWarn(dO));['iso','dopa','adrinf'].forEach(d=>{a.add(binfPrep(d));a.add(binfPrep(d,{},false))});
 SIMR.forEach(r=>{a.add('Symulacja: na monitorze '+r+'.');a.add('Symulacja: zmiana rytmu. Na monitorze '+r+'.')});
 Object.values(SAY).forEach(t=>a.add(SAY.remind+' '+t));return [...a].filter(Boolean)}
const API={hepCalc,hepBolusText,hepPrepText,HEPB,parsePair,bargeIn,sedText,fentRepText,midaRepText,fentWarn,volW,HEPR,PACEMAX,atroNext,BINT,BINF,binfMlh,binfConc,binfPrep,atroText,ENERGY_SEQ,energyFor,ENERGY,ENERGY_LABEL,vfInstr,VERSION,SAY,HT,htQ,r1,fmt1,mlWord,flowPhrase,noraMlh,dobuMlh,adrInfMlh,mapOf,noraTable,norm,parseNumber,matchCommand,interpret,Engine,report,hhmm,staticPhrases,NORA,DOBU};
if(typeof module!=='undefined')module.exports=API;else root.RKO=API;
})(this);
