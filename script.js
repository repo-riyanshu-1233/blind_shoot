'use strict';

// -------------------- DOM --------------------
const $ = (id) => document.getElementById(id);
const menuScreen=$('menuScreen'), lobbyScreen=$('lobbyScreen'), gameScreen=$('gameScreen');
const bgCanvas=$('bgCanvas'), bgCtx=bgCanvas.getContext('2d');
const fxCanvas=$('fxCanvas'), fxCtx=fxCanvas.getContext('2d');
const canvas=$('gameCanvas'), ctx=canvas.getContext('2d');
const killFeed=$('killFeed'), shotRevealPanel=$('shotRevealPanel'), shotRevealList=$('shotRevealList'), rotateOverlay=$('rotateOverlay'), showdownBtn=$('showdownBtn');
const deathOverlay=$('deathOverlay'), resultOverlay=$('resultOverlay'), toastEl=$('toast');
const onlinePanel=$('onlinePanel'), hostPanel=$('hostPanel'), joinPanel=$('joinPanel');
const mobileDevice = (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints>0);
// ===== OWNER SETTINGS: change these true/false values whenever needed =====
const MAINTENANCE_MODE = false;                 // true = block gameplay and show maintenance screen
const SHOW_UNDER_CONSTRUCTION_NOTICE = true;     // true = show the short notice on page load
const PERMANENTLY_DISABLE_CONSTRUCTION_NOTICE = false; // true = never show the notice
const UNDER_CONSTRUCTION_NOTICE_DURATION_MS = 5000;
const CONTACT_EMAIL = 'riyanshusinh@gmail.com';
const INSTAGRAM_URL = 'https://www.instagram.com/riyanshu_1233/';
const OTHER_GAMES_URL = ''; // Add your future games URL here, e.g. 'https://example.com/games'


// -------------------- Background / effects --------------------
let bgW=0,bgH=0; const bgParticles=[]; const bgShapes=['O','X','•','✦'];
function resizeCanvases(){
  bgW=bgCanvas.width=window.innerWidth; bgH=bgCanvas.height=window.innerHeight;
  fxCanvas.width=window.innerWidth; fxCanvas.height=window.innerHeight;
}
window.addEventListener('resize',resizeCanvases); resizeCanvases();
for(let i=0;i<38;i++)bgParticles.push({x:Math.random()*bgW,y:Math.random()*bgH,size:Math.random()*23+10,speed:Math.random()*17+5,angle:Math.random()*Math.PI*2,turn:(Math.random()-.5)*.4,type:bgShapes[Math.floor(Math.random()*bgShapes.length)],alpha:Math.random()*.08+.025});
let fireworks=[];
function addFireworks(){for(let k=0;k<7;k++){const x=fxCanvas.width*(.15+Math.random()*.7),y=fxCanvas.height*(.1+Math.random()*.55),hue=Math.floor(Math.random()*360);for(let i=0;i<55;i++){const a=Math.random()*Math.PI*2,s=Math.random()*210+35;fireworks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,decay:Math.random()*.6+.3,size:Math.random()*3+1,hue});}}}
function drawBackground(dt){bgCtx.clearRect(0,0,bgW,bgH);for(const p of bgParticles){p.y-=p.speed*dt;p.angle+=p.turn*dt;if(p.y<-35){p.y=bgH+30;p.x=Math.random()*bgW;}bgCtx.save();bgCtx.translate(p.x,p.y);bgCtx.rotate(p.angle);bgCtx.globalAlpha=p.alpha;bgCtx.fillStyle='#fff';bgCtx.textAlign='center';bgCtx.textBaseline='middle';bgCtx.font=`${p.size}px 'Luckiest Guy',cursive`;bgCtx.fillText(p.type,0,0);bgCtx.restore();}}
function drawFireworks(dt){fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);fireworks=fireworks.filter(p=>p.life>0);for(const p of fireworks){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=105*dt;p.vx*=Math.pow(.985,dt*60);p.life-=p.decay*dt;fxCtx.globalAlpha=Math.max(0,p.life);fxCtx.fillStyle=`hsl(${p.hue} 100% 62%)`;fxCtx.beginPath();fxCtx.arc(p.x,p.y,p.size,0,Math.PI*2);fxCtx.fill();}fxCtx.globalAlpha=1;}
function spawnHitBlast(x,y,color='#fca311'){const colors=[color,'#ffd166','#fff5d6','#ff744f'];const count=15;for(let i=0;i<count;i++){const a=Math.PI*2*i/count+(Math.random()-.5)*.22,sp=85+Math.random()*170;explosions.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.48+Math.random()*.18,maxLife:.66,size:2.3+Math.random()*3.1,color:colors[Math.floor(Math.random()*colors.length)]});}}
function updateHitBlasts(dt){for(const b of explosions){b.x+=b.vx*dt;b.y+=b.vy*dt;b.vx*=Math.pow(.90,dt*60);b.vy=b.vy*.985+65*dt;b.life-=dt;}explosions=explosions.filter(b=>b.life>0);}
function drawHitBlasts(){if(!explosions.length)return;ctx.save();for(const b of explosions){const alpha=Math.max(0,Math.min(1,b.life/b.maxLife));ctx.globalAlpha=alpha;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.size*(.55+alpha*.65),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.restore();}

// -------------------- General app state --------------------
let currentScreen='menu', mode='solo', gameState='MENU', stateTimer=0, roundNumber=1, arenaSize=750;
let entities=[], localPlayerId='local-player', hostPlayerId='', winnerId=null, winnerName='', pendingHits=[], shots=[], scoutPerk=null, tiles=[], safeTileColor='GOLD', explosions=[];
let isAuthority=true, isNetworkClient=false, isRoomHost=false, isSpectating=false, localDeathSeen=false, gameResultShown=false, fastTapSent=false;
let peer=null, hostConn=null, roomCode='', localName='Player', peerReady=false, hostCreating=false;
let remoteConnections=new Map(), remoteUsers=new Map();
let lastFrame=performance.now(), snapshotElapsed=0, inputElapsed=0, toastTimeout=null, lobbyTimer=null, selectedPanel=null;
let onlineRosterBotNames=[], roomBotNames=[];
let fireProgress=0, gameElapsed=0, fastReadyAt=0, fastBotAt=0, fastShooterId=null, fastLoserId=null, rotatePendingStart=null;
const keys={w:false,a:false,s:false,d:false,arrowup:false,arrowdown:false,arrowleft:false,arrowright:false};
let mouseX=400,mouseY=400,mouseHasMoved=false;
let moveJoy={x:0,y:0,force:0}, aimJoy={x:0,y:0}, aimingByTouch=false, joysticksReady=false, moveNipple=null, aimNipple=null;
const BOT_NAMES=[
 'Aarav Sharma','Diya Patel','Kabir Mehta','Ananya Iyer','Ishaan Verma','Aanya Shah','Vihaan Rao','Meera Joshi','Arjun Nair','Kiara Desai','Rohan Singh','Zoya Khan','Neel Trivedi','Ira Kapoor','Reyansh Gupta','Mira Chawla',
 'Liam Carter','Olivia Brooks','Noah Miller','Emma Wilson','Lucas Martin','Sofia Rossi','Mateo Garcia','Isabella Costa','Hana Sato','Kenji Tanaka','Min-jun Kim','Yuna Park','Amir Haddad','Layla Hassan','Elena Petrova','Milan Novak','Freya Jensen','Oliver Smith','Nora Dubois','Theo Laurent','Amina Diallo','Kwame Mensah','Chinedu Okafor','Camila Silva','Diego Torres','Fatima Zahra','Youssef Ali','Anika Müller','Jakub Nowak','Nikolai Ivanov','Lucia Bianchi','Ethan Brown','Maya Chen','Samira Rahman'
];
const TILE_COLORS=[{name:'GOLD',fill:'#ffd166'},{name:'MINT',fill:'#38d9a9'},{name:'CORAL',fill:'#ff6b6b'},{name:'BLUE',fill:'#55a8ff'},{name:'PINK',fill:'#f7a6d8'},{name:'PURPLE',fill:'#b18cff'}];

function setScreen(name){
 const nextMap={menu:menuScreen,lobby:lobbyScreen,game:gameScreen};const next=nextMap[name];
 [menuScreen,lobbyScreen,gameScreen].forEach(el=>{if(el===next){el.classList.remove('leaving');el.classList.add('active');}else if(el.classList.contains('active')){el.classList.remove('active');el.classList.add('leaving');setTimeout(()=>el.classList.remove('leaving'),260);}});
 currentScreen=name;syncRotateOverlay();if(name==='game')initJoysticks();else destroyJoysticks();
}
function showToast(msg,ms=2600){toastEl.textContent=msg;toastEl.classList.add('active');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toastEl.classList.remove('active'),ms);}
function setOverlayVisible(el,visible){
 if(!el)return;
 clearTimeout(el._fadeTimer);
 if(visible){
  el.style.display='block';el.classList.remove('closing');
  requestAnimationFrame(()=>el.classList.add('shown'));
 }else if(el.style.display!=='none'){
  el.classList.remove('shown');el.classList.add('closing');
  el._fadeTimer=setTimeout(()=>{el.style.display='none';el.classList.remove('closing');},240);
 }
}
function addKillMessage(message){if(!killFeed)return;const item=document.createElement('div');item.className='kill-msg';item.textContent=String(message);killFeed.appendChild(item);setTimeout(()=>{if(item.parentNode)item.remove();},3500);while(killFeed.children.length>5)killFeed.firstElementChild.remove();}
function safeName(raw,fallback='Player'){const n=(raw||'').trim().replace(/[<>]/g,'').replace(/\s+/g,' ').slice(0,18);return n||fallback;}
function randomFrom(a){return a[Math.floor(Math.random()*a.length)];}
function uniqueBotName(used){let n=randomFrom(BOT_NAMES),tries=0;while(used.has(n.toLowerCase())&&tries++<100)n=randomFrom(BOT_NAMES);used.add(n.toLowerCase());return n;}
function makeId(prefix='p'){return prefix+'-'+Math.random().toString(36).slice(2,9);}
const panelHideTimers = new WeakMap();
function hidePanelAnimated(panel){
 if(!panel || (!panel.classList.contains('active') && !panel.classList.contains('closing'))) return;
 clearTimeout(panelHideTimers.get(panel));
 panel.classList.remove('active');
 panel.classList.add('closing');
 panelHideTimers.set(panel,setTimeout(()=>{panel.classList.remove('closing');},260));
}
function showPanelAnimated(panel){
 clearTimeout(panelHideTimers.get(panel));
 panel.classList.remove('closing');
 panel.classList.add('active');
}
function togglePanel(which){
 const map={online:onlinePanel,host:hostPanel,join:joinPanel};
 const next=map[which];
 [onlinePanel,hostPanel,joinPanel].forEach(p=>{if(p!==next)hidePanelAnimated(p);});
 showPanelAnimated(next);selectedPanel=which;
}
function closeModePanel(){[onlinePanel,hostPanel,joinPanel].forEach(hidePanelAnimated);selectedPanel=null;}
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if($('modalBackdrop').classList.contains('active')) closeModal();
  else if(selectedPanel) closeModePanel();
 }
});
$('backOnlineBtn').addEventListener('click',closeModePanel);$('backHostBtn').addEventListener('click',closeModePanel);$('backJoinBtn').addEventListener('click',closeModePanel);
function setModeForms(){closeModePanel();}

// -------------------- Main menu / information drawer --------------------
$('playBtn').addEventListener('click',()=>{setModeForms();localName='Player';startSoloMatch();});
$('onlineBtn').addEventListener('click',()=>togglePanel('online'));
$('hostBtn').addEventListener('click',()=>togglePanel('host'));
$('joinBtn').addEventListener('click',()=>togglePanel('join'));
$('findGameBtn').addEventListener('click',startOnlineBotLobby);
$('createRoomBtn').addEventListener('click',createRoom);
$('connectRoomBtn').addEventListener('click',joinRoom);
const modalHistory=[];
$('hamburgerBtn').addEventListener('click',()=>showModal('MENU',`<div class="overlay-actions"><button class="cartoon-btn" id="howOption">HOW TO PLAY</button><button class="cartoon-btn" id="aboutOption">ABOUT GAME</button><button class="cartoon-btn" id="contactOption">CONTACT US</button><button class="cartoon-btn" id="gamesOption">OTHER GAMES</button></div>`));
$('modalCloseBtn').addEventListener('click',closeModal);
$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal();});
function showModal(title,html,options={}){
 const modal=$('modalBackdrop'), body=$('modalBody');
 if(modal.classList.contains('active') && options.pushHistory!==false){modalHistory.push({title:$('modalTitle').textContent,html:body.innerHTML});}
 $('modalTitle').textContent=title;body.innerHTML=html;
 modal.classList.remove('closing');modal.classList.add('active');$('modalCloseBtn').textContent=modalHistory.length?'BACK':'CLOSE';
 $('howOption')?.addEventListener('click',()=>showModal('HOW TO PLAY',`<p><b>PC</b><br>Move with <b>W, A, S, D</b> or arrow keys. Aim with the mouse.</p><p><b>Mobile</b><br>Use the left joystick to move and the right joystick to aim. Play in landscape orientation.</p><p><b>Rules</b><br>Survive each simultaneous-shot round. The arena shrinks as rounds progress. After round 8, a scout perk can briefly reveal opponents. After round 12, reach a tile of the announced colour to survive. The final two fighters face a reaction-tap duel.</p>`));
 $('aboutOption')?.addEventListener('click',()=>showModal('ABOUT BLIND SHOT',`<p><b>Blind Shot</b> is a cartoon arena-survival game built around smart aiming, shrinking arenas, surprise survival rounds, and a final reaction duel.</p><p>Play offers AI opponents. Online Mode uses a simulated matchmaking lobby. Host Game and Join Room connect players through PeerJS when hosted online.</p>`));
 $('contactOption')?.addEventListener('click',()=>showModal('CONTACT US',`<p>Get in touch with the Blind Shot creator.</p><div class="contact-links"><a href="mailto:${CONTACT_EMAIL}">Email: ${CONTACT_EMAIL}</a><a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer">Instagram: @riyanshu_1233</a></div>`));
 $('gamesOption')?.addEventListener('click',()=>{if(OTHER_GAMES_URL.trim()){window.location.href=OTHER_GAMES_URL;}else showModal('OTHER GAMES',`<p>Game links are coming soon.</p><p>Add your games page URL in the <code>OTHER_GAMES_URL</code> setting near the top of JavaScript.</p>`);});
}
function closeModal(){
 const modal=$('modalBackdrop');
 if(modalHistory.length){const previous=modalHistory.pop();showModal(previous.title,previous.html,{pushHistory:false});return;}
 modal.classList.remove('active');modal.classList.add('closing');
 setTimeout(()=>{modal.classList.remove('closing');},260);
}

// -------------------- Orientation / fullscreen --------------------
function isPortrait(){return window.innerHeight>window.innerWidth;}
function syncRotateOverlay(){const should=currentScreen==='game'&&mobileDevice&&isPortrait();rotateOverlay.classList.toggle('active',should);}
let joystickRelayoutTimer=0;
function handleOrientationChange(){syncRotateOverlay();if(rotatePendingStart&&!isPortrait()){const start=rotatePendingStart;rotatePendingStart=null;start();}if(currentScreen==='game'&&mobileDevice){clearTimeout(joystickRelayoutTimer);joystickRelayoutTimer=setTimeout(()=>{if(currentScreen==='game'){destroyJoysticks();initJoysticks();}},220);}}
window.addEventListener('resize',handleOrientationChange);window.addEventListener('orientationchange',()=>setTimeout(handleOrientationChange,150));document.addEventListener('fullscreenchange',()=>setTimeout(handleOrientationChange,180));document.addEventListener('webkitfullscreenchange',()=>setTimeout(handleOrientationChange,180));
function requestLandscape(){if(!mobileDevice)return;try{const root=document.documentElement;let p=null;if(root.requestFullscreen)p=root.requestFullscreen();else if(root.webkitRequestFullscreen)p=root.webkitRequestFullscreen();if(p&&typeof p.then==='function'){p.then(()=>{try{screen.orientation?.lock?.('landscape').catch(()=>{});}catch(_){}}).catch(()=>{});}else{try{screen.orientation?.lock?.('landscape').catch(()=>{});}catch(_){}}}catch(_){}}
function leaveLandscape(){try{screen.orientation?.unlock?.();}catch(_){}try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();}catch(_){} }
$('rotateContinueBtn').addEventListener('click',()=>{requestLandscape();handleOrientationChange();if(!isPortrait())rotateOverlay.classList.remove('active');else showToast('Turn your phone sideways to continue.');});

// -------------------- Joysticks and input --------------------
function initJoysticks(){if(!mobileDevice||joysticksReady||typeof nipplejs==='undefined')return;try{moveNipple=nipplejs.create({zone:$('leftZone'),mode:'static',position:{left:'50%',bottom:'78px'},color:'white',restOpacity:.52,size:112});aimNipple=nipplejs.create({zone:$('rightZone'),mode:'static',position:{left:'50%',bottom:'78px'},color:'#ff6b6b',restOpacity:.52,size:112});moveNipple.on('move',(e,d)=>{moveJoy.x=d.vector.x||0;moveJoy.y=-(d.vector.y||0);moveJoy.force=Math.min(1,(d.force||0));});moveNipple.on('end',()=>{moveJoy={x:0,y:0,force:0};});aimNipple.on('move',(e,d)=>{aimJoy.x=d.vector.x||0;aimJoy.y=-(d.vector.y||0);aimingByTouch=true;});aimNipple.on('end',()=>{aimingByTouch=false;});joysticksReady=true;}catch(err){console.warn('Joystick init failed',err);showToast('Joystick library failed to load. Use keyboard/mouse if available.');}}
function destroyJoysticks(){if(moveNipple){try{moveNipple.destroy();}catch(_){}}if(aimNipple){try{aimNipple.destroy();}catch(_){}}moveNipple=aimNipple=null;joysticksReady=false;moveJoy={x:0,y:0,force:0};aimJoy={x:0,y:0};aimingByTouch=false;}
function getLocalInput(){let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let force=1;if(mobileDevice&&(moveJoy.x!==0||moveJoy.y!==0)){dx=moveJoy.x;dy=moveJoy.y;force=moveJoy.force||1;}let ent=entities.find(e=>e.id===localPlayerId);let ang=ent?ent.angle:0;if(mobileDevice&&aimingByTouch){ang=Math.atan2(aimJoy.y,aimJoy.x);}else if(mouseHasMoved&&ent){ang=Math.atan2(mouseY-ent.y,mouseX-ent.x);}return{moveX:dx,moveY:dy,force,angle:ang};}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k in keys){keys[k]=true;if(currentScreen==='game')e.preventDefault();}});window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k in keys)keys[k]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouseX=(e.clientX-r.left)*(canvas.width/r.width);mouseY=(e.clientY-r.top)*(canvas.height/r.height);mouseHasMoved=true;});

// -------------------- Lobby rendering --------------------
function renderRoster(players,online=false){const host=$('roster');host.innerHTML='';players.slice(0,11).forEach(p=>{const row=document.createElement('div');row.className='roster-item';const dot=document.createElement('span');dot.className='avatar-dot';dot.style.background=p.isHost?'var(--gold)':p.isBot?'#fca311':'var(--mint)';const name=document.createElement('span');name.className='roster-name';name.textContent=p.name;if(!online){const tag=document.createElement('span');tag.className='roster-tag';tag.textContent=p.isHost?'HOST':p.isBot?'AI BOT':'PLAYER';name.appendChild(tag);}row.append(dot,name);host.appendChild(row);});}
function showLobby({title,status,players=[],code='',host=false,online=false}){setScreen('lobby');$('lobbyTitle').textContent=title;$('lobbyStatus').textContent=status;$('lobbyHint').textContent='';renderRoster(players,online);$('roomCodeBox').style.display=code?'block':'none';$('roomCodeBox').textContent=code||'';$('shareRoomBtn').style.display=code?'inline-block':'none';$('startRoomBtn').style.display=host?'inline-block':'none';$('lobbyCountdown').textContent='';}
function buildHostLobbyRoster(){return [{name:localName,isHost:true},...Array.from(remoteUsers.values()).map(p=>({name:p.name,isHost:false}))].slice(0,10);}
function updateRoomLobby(){const players=buildHostLobbyRoster();showLobby({title:'HOST GAME',status:peerReady?`${players.length}/10 PLAYERS • EMPTY SLOTS FILL WITH BOTS`:'CONNECTING…',players,code:roomCode,host:peerReady});}
function updateJoinLobby(players,status='ROOM CONNECTED'){showLobby({title:'JOINED ROOM',status,players,code:roomCode,host:false});$('shareRoomBtn').style.display='none';$('lobbyHint').textContent='';}
$('cancelLobbyBtn').addEventListener('click',()=>exitToMenu(true));
$('shareRoomBtn').addEventListener('click',async()=>{const txt=`Join my Blind Shot room! Code: ${roomCode}`;try{if(navigator.share)await navigator.share({title:'Blind Shot room',text:txt});else if(navigator.clipboard){await navigator.clipboard.writeText(txt);showToast('Room code copied.');}else showToast(txt,4500);}catch(_){showToast(`Room code: ${roomCode}`,4500);}});
$('startRoomBtn').addEventListener('click',()=>{if(!isRoomHost||!peerReady)return;startRoomMatch();});

// -------------------- Online mode (AI lobby) --------------------
function startOnlineBotLobby(){
 const raw=($('onlineName').value||'').trim();
 if(!raw){showToast('Enter your name first.');$('onlineName').focus();return;}
 clearTimeout(lobbyTimer);clearInterval(lobbyTimer);
 localName=safeName(raw);mode='onlineBots';$('cancelLobbyBtn').textContent='CANCEL';
 const used=new Set([localName.toLowerCase()]);
 onlineRosterBotNames=[];
 for(let i=0;i<10;i++)onlineRosterBotNames.push(uniqueBotName(used));
 const queue=[{name:localName,isLocal:true,isBot:false},...onlineRosterBotNames.map(name=>({name,isBot:true}))];
 // Shuffle arrival order so the local name can appear early or arrive last, like matchmaking.
 for(let i=queue.length-1;i>0;i--){c