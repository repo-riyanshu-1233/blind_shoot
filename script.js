'use strict';

const $ = (id) => document.getElementById(id);
const menuScreen=$('menuScreen'), lobbyScreen=$('lobbyScreen'), gameScreen=$('gameScreen');
const bgCanvas=$('bgCanvas'), bgCtx=bgCanvas.getContext('2d');
const fxCanvas=$('fxCanvas'), fxCtx=fxCanvas.getContext('2d');
const canvas=$('gameCanvas'), ctx=canvas.getContext('2d');
const killFeed=$('killFeed'), shotRevealPanel=$('shotRevealPanel'), shotRevealList=$('shotRevealList'), rotateOverlay=$('rotateOverlay'), showdownBtn=$('showdownBtn');
const deathOverlay=$('deathOverlay'), resultOverlay=$('resultOverlay'), toastEl=$('toast');
const onlinePanel=$('onlinePanel'), hostPanel=$('hostPanel'), joinPanel=$('joinPanel');
const mobileDevice = (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints>0);
const MAINTENANCE_MODE = false; 
const SHOW_UNDER_CONSTRUCTION_NOTICE = true;
const PERMANENTLY_DISABLE_CONSTRUCTION_NOTICE = false;
const UNDER_CONSTRUCTION_NOTICE_DURATION_MS = 5000;
const CONTACT_EMAIL = 'riyanshusinh@gmail.com';
const INSTAGRAM_URL = 'https://www.instagram.com/riyanshu_1233/';
const OTHER_GAMES_URL = 'https://arcade-edition.onrender.com/';


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

function isPortrait(){return window.innerHeight>window.innerWidth;}
function syncRotateOverlay(){const should=currentScreen==='game'&&mobileDevice&&isPortrait();rotateOverlay.classList.toggle('active',should);}
let joystickRelayoutTimer=0;
function handleOrientationChange(){syncRotateOverlay();if(rotatePendingStart&&!isPortrait()){const start=rotatePendingStart;rotatePendingStart=null;start();}if(currentScreen==='game'&&mobileDevice){clearTimeout(joystickRelayoutTimer);joystickRelayoutTimer=setTimeout(()=>{if(currentScreen==='game'){destroyJoysticks();initJoysticks();}},220);}}
window.addEventListener('resize',handleOrientationChange);window.addEventListener('orientationchange',()=>setTimeout(handleOrientationChange,150));document.addEventListener('fullscreenchange',()=>setTimeout(handleOrientationChange,180));document.addEventListener('webkitfullscreenchange',()=>setTimeout(handleOrientationChange,180));
function requestLandscape(){if(!mobileDevice)return;try{const root=document.documentElement;let p=null;if(root.requestFullscreen)p=root.requestFullscreen();else if(root.webkitRequestFullscreen)p=root.webkitRequestFullscreen();if(p&&typeof p.then==='function'){p.then(()=>{try{screen.orientation?.lock?.('landscape').catch(()=>{});}catch(_){}}).catch(()=>{});}else{try{screen.orientation?.lock?.('landscape').catch(()=>{});}catch(_){}}}catch(_){}}
function leaveLandscape(){try{screen.orientation?.unlock?.();}catch(_){}try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});else if(document.webkitFullscreenElement&&document.webkitExitFullscreen)document.webkitExitFullscreen();}catch(_){} }
$('rotateContinueBtn').addEventListener('click',()=>{requestLandscape();handleOrientationChange();if(!isPortrait())rotateOverlay.classList.remove('active');else showToast('Turn your phone sideways to continue.');});

function initJoysticks(){if(!mobileDevice||joysticksReady||typeof nipplejs==='undefined')return;try{moveNipple=nipplejs.create({zone:$('leftZone'),mode:'static',position:{left:'50%',bottom:'78px'},color:'white',restOpacity:.52,size:112});aimNipple=nipplejs.create({zone:$('rightZone'),mode:'static',position:{left:'50%',bottom:'78px'},color:'#ff6b6b',restOpacity:.52,size:112});moveNipple.on('move',(e,d)=>{moveJoy.x=d.vector.x||0;moveJoy.y=-(d.vector.y||0);moveJoy.force=Math.min(1,(d.force||0));});moveNipple.on('end',()=>{moveJoy={x:0,y:0,force:0};});aimNipple.on('move',(e,d)=>{aimJoy.x=d.vector.x||0;aimJoy.y=-(d.vector.y||0);aimingByTouch=true;});aimNipple.on('end',()=>{aimingByTouch=false;});joysticksReady=true;}catch(err){console.warn('Joystick init failed',err);showToast('Joystick library failed to load. Use keyboard/mouse if available.');}}
function destroyJoysticks(){if(moveNipple){try{moveNipple.destroy();}catch(_){}}if(aimNipple){try{aimNipple.destroy();}catch(_){}}moveNipple=aimNipple=null;joysticksReady=false;moveJoy={x:0,y:0,force:0};aimJoy={x:0,y:0};aimingByTouch=false;}
function getLocalInput(){let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);let dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let force=1;if(mobileDevice&&(moveJoy.x!==0||moveJoy.y!==0)){dx=moveJoy.x;dy=moveJoy.y;force=moveJoy.force||1;}let ent=entities.find(e=>e.id===localPlayerId);let ang=ent?ent.angle:0;if(mobileDevice&&aimingByTouch){ang=Math.atan2(aimJoy.y,aimJoy.x);}else if(mouseHasMoved&&ent){ang=Math.atan2(mouseY-ent.y,mouseX-ent.x);}return{moveX:dx,moveY:dy,force,angle:ang};}
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k in keys){keys[k]=true;if(currentScreen==='game')e.preventDefault();}});window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k in keys)keys[k]=false;});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouseX=(e.clientX-r.left)*(canvas.width/r.width);mouseY=(e.clientY-r.top)*(canvas.height/r.height);mouseHasMoved=true;});

function renderRoster(players,online=false){const host=$('roster');host.innerHTML='';players.slice(0,11).forEach(p=>{const row=document.createElement('div');row.className='roster-item';const dot=document.createElement('span');dot.className='avatar-dot';dot.style.background=p.isHost?'var(--gold)':p.isBot?'#fca311':'var(--mint)';const name=document.createElement('span');name.className='roster-name';name.textContent=p.name;if(!online){const tag=document.createElement('span');tag.className='roster-tag';tag.textContent=p.isHost?'HOST':p.isBot?'AI BOT':'PLAYER';name.appendChild(tag);}row.append(dot,name);host.appendChild(row);});}
function showLobby({title,status,players=[],code='',host=false,online=false}){setScreen('lobby');$('lobbyTitle').textContent=title;$('lobbyStatus').textContent=status;$('lobbyHint').textContent='';renderRoster(players,online);$('roomCodeBox').style.display=code?'block':'none';$('roomCodeBox').textContent=code||'';$('shareRoomBtn').style.display=code?'inline-block':'none';$('startRoomBtn').style.display=host?'inline-block':'none';$('lobbyCountdown').textContent='';}
function buildHostLobbyRoster(){return [{name:localName,isHost:true},...Array.from(remoteUsers.values()).map(p=>({name:p.name,isHost:false}))].slice(0,10);}
function updateRoomLobby(){const players=buildHostLobbyRoster();showLobby({title:'HOST GAME',status:peerReady?`${players.length}/10 PLAYERS • EMPTY SLOTS FILL WITH BOTS`:'CONNECTING…',players,code:roomCode,host:peerReady});}
function updateJoinLobby(players,status='ROOM CONNECTED'){showLobby({title:'JOINED ROOM',status,players,code:roomCode,host:false});$('shareRoomBtn').style.display='none';$('lobbyHint').textContent='';}
$('cancelLobbyBtn').addEventListener('click',()=>exitToMenu(true));
$('shareRoomBtn').addEventListener('click',async()=>{const txt=`Join my Blind Shot room! Code: ${roomCode}`;try{if(navigator.share)await navigator.share({title:'Blind Shot room',text:txt});else if(navigator.clipboard){await navigator.clipboard.writeText(txt);showToast('Room code copied.');}else showToast(txt,4500);}catch(_){showToast(`Room code: ${roomCode}`,4500);}});
$('startRoomBtn').addEventListener('click',()=>{if(!isRoomHost||!peerReady)return;startRoomMatch();});

function startOnlineBotLobby(){
 const raw=($('onlineName').value||'').trim();
 if(!raw){showToast('Enter your name first.');$('onlineName').focus();return;}
 clearTimeout(lobbyTimer);clearInterval(lobbyTimer);
 localName=safeName(raw);mode='onlineBots';$('cancelLobbyBtn').textContent='CANCEL';
 const used=new Set([localName.toLowerCase()]);
 onlineRosterBotNames=[];
 for(let i=0;i<10;i++)onlineRosterBotNames.push(uniqueBotName(used));
 const queue=[{name:localName,isLocal:true,isBot:false},...onlineRosterBotNames.map(name=>({name,isBot:true}))];
 
 for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
 let shown=[];let index=0;
 showLobby({title:'FINDING PLAYERS',status:'Finding a match…',players:[],online:true});
 $('lobbyCountdown').textContent='';
 const arriveNext=()=>{
   if(currentScreen!=='lobby'||mode!=='onlineBots')return;
   if(index>=queue.length){
     $('lobbyStatus').textContent='MATCH FOUND';
     let count=5;$('lobbyCountdown').textContent=`STARTING IN ${count}`;
     const countNext=()=>{
       if(currentScreen!=='lobby'||mode!=='onlineBots')return;
       count--;
       if(count>0){$('lobbyCountdown').textContent=`STARTING IN ${count}`;lobbyTimer=setTimeout(countNext,1000);}
       else{$('lobbyCountdown').textContent='';startLocalMatch('onlineBots',localName);}
     };
     lobbyTimer=setTimeout(countNext,1000);return;
   }
   shown.push(queue[index++]);renderRoster(shown,true);
   $('lobbyStatus').textContent=shown.length===1?'PLAYER FOUND':`${shown.length} PLAYERS FOUND`;
   lobbyTimer=setTimeout(arriveNext,450+Math.random()*850);
 };
 lobbyTimer=setTimeout(arriveNext,350+Math.random()*650);
}

function peerAvailable(){if(typeof Peer==='undefined'){showToast('PeerJS could not load. Check your internet connection and reload.');return false;}return true;}
function createRoom(){roomBotNames=[];if(!($('hostName').value||'').trim()){showToast('Enter your name first.');$('hostName').focus();return;}const name=safeName($('hostName').value);localName=name;if(!peerAvailable())return;destroyPeer(false);mode='host';isRoomHost=true;isNetworkClient=false;isAuthority=true;hostCreating=true;peerReady=false;remoteConnections.clear();remoteUsers.clear();let attempts=0;showLobby({title:'HOST GAME',status:'Requesting a room code…',players:[{name:localName,isHost:true}],host:false});
 const tryCreate=()=>{attempts++;roomCode=String(Math.floor(10000+Math.random()*90000));try{peer=new Peer(`blindshot-${roomCode}`);}catch(err){$('lobbyStatus').textContent='Could not create PeerJS connection.';showToast('Unable to create room.');return;}
 peer.on('open',id=>{peerReady=true;hostCreating=false;hostPlayerId=makeId('host');localPlayerId=hostPlayerId;updateRoomLobby();});
 peer.on('connection',conn=>attachHostConnection(conn));
 peer.on('error',err=>{console.error('Peer host error',err);if(err&&err.type==='unavailable-id'&&attempts<6){try{peer.destroy();}catch(_){}setTimeout(tryCreate,250);return;}hostCreating=false;peerReady=false;$('lobbyStatus').textContent=err&&err.type==='unavailable-id'?'Could not find a free room code. Try again.':'Room connection error: '+(err?.type||'network issue')+'. Check internet and try again.';showToast('Room setup failed.');});
 peer.on('disconnected',()=>{peerReady=false;$('lobbyStatus').textContent='Disconnected from PeerJS. Reconnect or create a new room.';});};tryCreate();}
function attachHostConnection(conn){remoteConnections.set(conn.peer,conn);conn.on('data',msg=>handleHostMessage(conn,msg));conn.on('close',()=>{remoteConnections.delete(conn.peer);const pid=conn._playerId;if(pid){remoteUsers.delete(pid);const ent=entities.find(e=>e.id===pid);if(ent&&ent.alive&&!['MENU','LOBBY','GAME_OVER'].includes(gameState)){ent.alive=false;addKillMessage(`${ent.name} LEFT THE MATCH`);}broadcastLobby();}});conn.on('error',err=>console.warn('Room connection issue',err));}
function handleHostMessage(conn,msg){if(!msg||typeof msg!=='object')return;if(msg.type==='join'){
 if(conn._playerId)return;if(currentScreen==='game'||gameState!=='MENU'){try{conn.send({type:'error',message:'This match has already started. Ask the host to create a new room.'});}catch(_){}conn.close();return;}if(remoteUsers.size>=9){try{conn.send({type:'error',message:'Room is full (10 players maximum).'});}catch(_){}conn.close();return;}
 const pid=makeId('guest');const name=safeName(msg.name,'Guest');conn._playerId=pid;conn._playerName=name;remoteUsers.set(pid,{id:pid,name,conn,isHost:false});try{conn.send({type:'welcome',playerId:pid,roomCode,hostId:hostPlayerId});}catch(_){}broadcastLobby();return;}
 if(msg.type==='input'&&conn._playerId){const ent=entities.find(e=>e.id===conn._playerId);if(ent&&ent.alive){ent.netMoveX=clamp(Number(msg.moveX)||0,-1,1);ent.netMoveY=clamp(Number(msg.moveY)||0,-1,1);ent.angle=Number.isFinite(msg.angle)?msg.angle:ent.angle;}}
 if(msg.type==='fastTap'&&conn._playerId){const ent=entities.find(e=>e.id===conn._playerId);if(ent&&ent.alive&&gameState==='FAST_READY'&&!winnerId)resolveFastTap(ent);}
 if(msg.type==='leave'&&conn._playerId){remoteUsers.delete(conn._playerId);remoteConnections.delete(conn.peer);broadcastLobby();}}
function broadcastLobby(){if(!isRoomHost)return;const players=buildHostLobbyRoster().map(p=>({id:p.isHost?hostPlayerId:(Array.from(remoteUsers.values()).find(u=>u.name===p.name)?.id||makeId('botlobby')),name:p.name,isHost:!!p.isHost,isBot:!!p.isBot}));for(const conn of remoteConnections.values()){if(conn.open){try{conn.send({type:'lobby',roomCode,hostId:hostPlayerId,players});}catch(_){}}}if(currentScreen==='lobby')updateRoomLobby();}
function joinRoom(){if(!($('joinName').value||'').trim()){showToast('Enter your name first.');$('joinName').focus();return;}const name=safeName($('joinName').value);const code=($('joinCode').value||'').replace(/\D/g,'').slice(0,5);if(code.length!==5){showToast('Enter a valid 5-digit room code.');return;}if(!peerAvailable())return;destroyPeer(false);localName=name;roomCode=code;mode='join';isRoomHost=false;isAuthority=false;isNetworkClient=true;showLobby({title:'JOIN ROOM',status:'Connecting to host…',players:[{name,isHost:false}]});$('lobbyHint').textContent='Connecting through PeerJS. Keep this tab open while in the room.';try{peer=new Peer();}catch(err){showToast('Could not start PeerJS.');return;}peer.on('open',()=>{hostConn=peer.connect(`blindshot-${code}`,{reliable:true});hostConn.on('open',()=>{hostConn.send({type:'join',name});});hostConn.on('data',msg=>handleClientMessage(msg));hostConn.on('error',err=>{console.warn(err);$('lobbyStatus').textContent='Connection to host failed. Check the code and try again.';});hostConn.on('close',()=>{if(currentScreen!=='menu'&&currentScreen!=='lobby')showToast('Host connection closed.');});});peer.on('error',err=>{console.error('Peer join error',err);$('lobbyStatus').textContent=err?.type==='peer-unavailable'?'Room not found or host is offline.':'Could not connect: '+(err?.type||'network issue')+'.';showToast('Could not join room.');});}
function handleClientMessage(msg){if(!msg||typeof msg!=='object')return;if(msg.type==='error'){showToast(msg.message||'Room error');$('lobbyStatus').textContent=msg.message||'Room error';return;}if(msg.type==='welcome'){localPlayerId=msg.playerId;hostPlayerId=msg.hostId;roomCode=msg.roomCode;return;}if(msg.type==='lobby'){roomCode=msg.roomCode;hostPlayerId=msg.hostId;updateJoinLobby(msg.players.map(p=>({name:p.name,isHost:p.isHost,isBot:p.isBot})));return;}if(msg.type==='matchStart'){if(msg.state){syncSnapshot(msg);setScreen('game');gameResultShown=false;setOverlayVisible(deathOverlay,false);setOverlayVisible(resultOverlay,false);}return;}if(msg.type==='snapshot'){if(currentScreen==='lobby'&&msg.started){syncSnapshot(msg);setScreen('game');}else syncSnapshot(msg);return;}if(msg.type==='hostLeft'){showToast('The host closed the room.');exitToMenu(false);}}
function startRoomMatch(){if(!isRoomHost||!peerReady)return;clearTimeout(lobbyTimer);clearInterval(lobbyTimer);const humans=[{id:hostPlayerId,name:localName,isLocal:true,isHost:true},...Array.from(remoteUsers.values()).map(p=>({id:p.id,name:p.name,isLocal:false,isHost:false}))].slice(0,10);roomBotNames=[];for(let i=1;i<=10-humans.length;i++)roomBotNames.push(`BOT ${i}`);beginAuthoritativeMatch('host',humans,5);}
function destroyPeer(sendLeave=true){if(sendLeave&&hostConn&&hostConn.open){try{hostConn.send({type:'leave'});}catch(_){}}if(isRoomHost){for(const c of remoteConnections.values()){if(c.open){try{c.send({type:'hostLeft'});}catch(_){}try{c.close();}catch(_){}}}}remoteConnections.clear();remoteUsers.clear();if(hostConn){try{hostConn.close();}catch(_){}hostConn=null;}if(peer){try{peer.destroy();}catch(_){}peer=null;}peerReady=false;isRoomHost=false;hostCreating=false;}

function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function randomPosition(size=arenaSize){const r=size/2-35,a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*r;return{x:400+Math.cos(a)*d,y:400+Math.sin(a)*d};}
function createEntity({id,name,isBot=false,isLocal=false,isHost=false,color=null,x=null,y=null}){const pos=(x===null||y===null)?randomPosition():{x,y};return{id,name,x:pos.x,y:pos.y,radius:13,color:color||(isBot?'#fca311':isHost?'#ffd166':'#38d9a9'),angle:Math.random()*Math.PI*2,speed:isBot?160:280,alive:true,isBot,isLocal,isHost,kills:0,moveAnim:0,netMoveX:0,netMoveY:0,aiMoveAngle:Math.random()*Math.PI*2,aiThink:0,aimOffset:0,targetId:null,scoutTimer:0,tileSafe:false,fastTapped:false};}
function buildEntities(humans,deferBots=false){entities=[];const targetCount=(mode==='solo'||mode==='onlineBots')?11:10;const used=new Set();for(const h of humans){const nm=safeName(h.name,'Player');used.add(nm.toLowerCase());entities.push(createEntity({id:h.id,name:nm,isBot:false,isLocal:!!h.isLocal,isHost:!!h.isHost}));}if(deferBots){const points=[];for(const e of entities){const p=randomPosition(arenaSize);e.x=p.x;e.y=p.y;points.push(p);}return;}const botRoster=mode==='onlineBots'?onlineRosterBotNames.slice():mode==='host'?roomBotNames.slice():[];let botIndex=0;while(entities.length<targetCount){let nm=botRoster[botIndex++];if(!nm||used.has(nm.toLowerCase()))nm=uniqueBotName(used);else used.add(nm.toLowerCase());entities.push(createEntity({id:makeId('bot'),name:nm,isBot:true,isLocal:false,color:'#fca311'}));}entities=entities.slice(0,targetCount);const points=[];for(const e of entities){let p=null,tries=0;do{p=randomPosition(arenaSize);tries++;}while(points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<50)&&tries<80);e.x=p.x;e.y=p.y;points.push(p);e.alive=true;e.kills=0;e.scoutTimer=0;e.tileSafe=false;}}
function resetMatchVars(){roundNumber=1;arenaSize=750;pendingHits=[];shots=[];scoutPerk=null;tiles=[];safeTileColor='GOLD';winnerId=null;winnerName='';stateTimer=0;fireProgress=0;gameElapsed=0;fastReadyAt=0;fastBotAt=0;fastShooterId=null;fastLoserId=null;fastTapSent=false;localDeathSeen=false;gameResultShown=false;isSpectating=false;setOverlayVisible(deathOverlay,false);setOverlayVisible(resultOverlay,false);showdownBtn.style.display='none';killFeed.innerHTML='';shotRevealList.innerHTML='';shotRevealPanel.classList.remove('active');fireworks=[];explosions=[];}
function startSoloMatch(){mode='solo';isRoomHost=false;isNetworkClient=false;isAuthority=true;localName='You';localPlayerId='local-player';const human=[{id:localPlayerId,name:localName,isLocal:true}];beginAuthoritativeMatch('solo',human,3);requestLandscape();}
function beginAuthoritativeMatch(newMode,humans,countdown){mode=newMode;isAuthority=true;isNetworkClient=false;if(newMode==='host')isRoomHost=true;resetMatchVars();buildEntities(humans,newMode==='host');setScreen('game');requestLandscape();const beginCountdown=()=>{rotatePendingStart=null;setState('MATCH_COUNTDOWN',countdown);addKillMessage(countdown===5?'MATCH STARTING IN 5…':'GET READY!');showdownBtn.style.display='none';broadcastSnapshot(true);};if(mobileDevice&&isPortrait()){gameState='ROTATE_WAIT';stateTimer=0;rotatePendingStart=beginCountdown;updateHud();broadcastSnapshot(true);}else beginCountdown();}
function startLocalMatch(newMode,name){localName=safeName(name,newMode==='solo'?'You':'Player');if(newMode!=='solo')mode=newMode;isRoomHost=false;isAuthority=true;isNetworkClient=false;localPlayerId='local-player';const humans=[{id:localPlayerId,name:localName,isLocal:true}];beginAuthoritativeMatch(newMode,humans,3);requestLandscape();}
function exitToMenu(closeNetwork=true){rotatePendingStart=null;clearTimeout(lobbyTimer);clearInterval(lobbyTimer);onlineRosterBotNames=[];roomBotNames=[];if(closeNetwork)destroyPeer(true);setScreen('menu');leaveLandscape();gameState='MENU';entities=[];pendingHits=[];tiles=[];scoutPerk=null;winnerId=null;winnerName='';isSpectating=false;setOverlayVisible(deathOverlay,false);setOverlayVisible(resultOverlay,false);showdownBtn.style.display='none';killFeed.innerHTML='';shotRevealList.innerHTML='';shotRevealPanel.classList.remove('active');fireworks=[];explosions=[];fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);setModeForms();$('cancelLobbyBtn').textContent='MAIN MENU';$('lobbyCountdown').textContent='';}
$('exitGameBtn').addEventListener('click',()=>{if(mode==='host'&&isRoomHost&&remoteUsers.size>0){if(!confirm('Leaving will close this hosted room for everyone. Continue?'))return;}exitToMenu(true);});
$('deathMenuBtn').addEventListener('click',()=>exitToMenu(true));$('spectateBtn').addEventListener('click',()=>{isSpectating=true;setOverlayVisible(deathOverlay,false);showToast('Spectator mode: you can watch the remaining fighters.');});
$('resultMenuBtn').addEventListener('click',()=>exitToMenu(true));
$('shareResultBtn').addEventListener('click',async()=>{const txt=winnerId?`${winnerName} won a Blind Shot match! I got ${entities.find(e=>e.id===localPlayerId)?.kills||0} kills. Play Blind Shot with me!`:'We got a draw in Blind Shot! Play with me!';const url=location.href;try{if(navigator.share)await navigator.share({title:'Blind Shot match result',text:txt,url});else if(navigator.clipboard){await navigator.clipboard.writeText(`${txt}\n${url}`);showToast('Result copied to clipboard.');}else showToast(txt,5000);}catch(_){showToast('Share cancelled.');}});

function setState(next,duration=0){gameState=next;stateTimer=duration;if(next==='EXECUTING')renderShotRevealPanel();else shotRevealPanel.classList.remove('active');if(next==='FIRING'){fireProgress=0;}if(next==='FAST_WAIT'){showdownBtn.style.display=aliveEntities().some(e=>e.id===localPlayerId)?'block':'none';showdownBtn.classList.remove('green');showdownBtn.classList.add('red');showdownBtn.disabled=true;showdownBtn.textContent='WAIT…';fastTapSent=false;}else if(next==='FAST_READY'){stateTimer=-1;showdownBtn.style.display=aliveEntities().some(e=>e.id===localPlayerId)?'block':'none';showdownBtn.classList.remove('red');showdownBtn.classList.add('green');showdownBtn.disabled=false;showdownBtn.textContent='TAP TO FIRE!';fastReadyAt=gameElapsed;fastBotAt=gameElapsed+(.35+Math.random()*.65);}else if(!next.startsWith('FAST_')){showdownBtn.style.display='none';}updateHud();}
function fillHostBots(){if(mode!=='host'||!isAuthority)return;const used=new Set(entities.map(e=>e.name.toLowerCase()));let n=1;while(entities.length<10){let name=roomBotNames[n-1]||`BOT ${n}`;while(used.has(name.toLowerCase()))name=`BOT ${++n}`;used.add(name.toLowerCase());entities.push(createEntity({id:makeId('bot'),name,isBot:true,color:'#fca311'}));n++;}const placed=[];for(const e of entities){if(e.isBot){let pos,tries=0;do{pos=randomPosition(arenaSize);tries++;}while(placed.some(q=>Math.hypot(q.x-pos.x,q.y-pos.y)<48)&&tries<80);e.x=pos.x;e.y=pos.y;placed.push(pos);}}} 
function beginRound(){pendingHits=[];shots=[];const living=aliveEntities();if(living.length<=1){finishMatch(living[0]||null);return;}if(living.length===2){startFastFinger();return;}if(roundNumber>12){beginTileRound();return;}scoutPerk=null;if(roundNumber>8){scoutPerk={...randomPosition(arenaSize),active:true};}aliveEntities().forEach(e=>{e.tileSafe=false;e.fastTapped=false;});setState('STARTING',3);addKillMessage(`ROUND ${roundNumber} — GET READY`);}
function aliveEntities(){return entities.filter(e=>e.alive);}
function updateHud(){if(currentScreen!=='game')return;$('roundHud').textContent=`ROUND ${roundNumber}`;const labelMap={ROTATE_WAIT:'ROTATE TO PLAY',MATCH_COUNTDOWN:'STARTING',STARTING:'GET READY',AIMING:'AIM!',EXECUTING:'LOCKED',FIRING:'FIRING',REVEAL:'REVEAL',TILE_SURVIVAL:`STAND ON ${safeTileColor}`,FAST_WAIT:'WAIT…',FAST_READY:'FIRE!',FAST_SHOOT:'FINAL SHOT',GAME_OVER:'MATCH OVER'};$('statusHud').textContent=(labelMap[gameState]||gameState)+' '+(stateTimer>0?Math.ceil(stateTimer):'');}
function keepInArena(ent){const maxDist=Math.max(10,arenaSize/2-ent.radius-5),dx=ent.x-400,dy=ent.y-400,d=Math.hypot(dx,dy);if(d>maxDist){const a=Math.atan2(dy,dx);ent.x=400+Math.cos(a)*maxDist;ent.y=400+Math.sin(a)*maxDist;}}
function closestEnemy(ent){let best=null,bd=Infinity;for(const t of entities){if(!t.alive||t.id===ent.id)continue;const d=Math.hypot(t.x-ent.x,t.y-ent.y);if(d<bd){bd=d;best=t;}}return best;}
function applyHumanMovement(ent,dt){const inp=ent.isLocal?getLocalInput():{moveX:ent.netMoveX||0,moveY:ent.netMoveY||0,force:1,angle:ent.angle};if(Number.isFinite(inp.angle))ent.angle=inp.angle;let dx=inp.moveX||0,dy=inp.moveY||0;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}if(len>0){const speed=ent.speed*(inp.force||1);ent.x+=dx/Math.max(1,len)*speed*dt;ent.y+=dy/Math.max(1,len)*speed*dt;ent.moveAnim+=dt*13;}keepInArena(ent);}
function updateBot(ent,dt,phase){
 if(!ent.alive)return;
 ent.aiThink=(ent.aiThink||0)-dt;
 let target=entities.find(e=>e.id===ent.targetId&&e.alive&&e.id!==ent.id);
 if(!target||ent.aiThink<=0){
   const enemies=aliveEntities().filter(e=>e.id!==ent.id);
   if(!enemies.length)return;
  
   enemies.sort((a,b)=>Math.hypot(a.x-ent.x,a.y-ent.y)-Math.hypot(b.x-ent.x,b.y-ent.y));
   target=(Math.random()<.22&&enemies.length>1)?enemies[Math.floor(Math.random()*Math.min(4,enemies.length))]:enemies[0];
   ent.targetId=target.id;
   ent.aimOffset=(Math.random()-.5)*(Math.random()<.18?1.0:.48);
   ent.aiStrafeSign=ent.aiStrafeSign|| (Math.random()<.5?-1:1);
   if(Math.random()<.34)ent.aiStrafeSign*=-1;
   ent.aiThink=.55+Math.random()*.55;
   ent.aiMoveAngle=Number.isFinite(ent.aiMoveAngle)?ent.aiMoveAngle:Math.random()*Math.PI*2;
 }
 const dx=target.x-ent.x,dy=target.y-ent.y,dist=Math.hypot(dx,dy),targetAngle=Math.atan2(dy,dx);
 if(phase==='AIMING'||phase==='STARTING'){
   
   const aimTarget=targetAngle+(ent.aimOffset||0);
   const diff=Math.atan2(Math.sin(aimTarget-ent.angle),Math.cos(aimTarget-ent.angle));
   ent.angle+=clamp(diff,-dt*(1.7+Math.min(1.0,dist/260)),dt*(1.7+Math.min(1.0,dist/260)));
 }
 if(phase==='STARTING'||phase==='AIMING'){
   
   let desired;
   if(dist<105) desired=targetAngle+Math.PI+(ent.aiStrafeSign||1)*.28;
   else if(dist>270) desired=targetAngle+(ent.aiStrafeSign||1)*.38;
   else desired=targetAngle+(ent.aiStrafeSign||1)*(Math.PI/2);
   const borderDist=Math.hypot(ent.x-400,ent.y-400),borderRatio=borderDist/Math.max(1,arenaSize/2);
   if(borderRatio>.78){const inward=Math.atan2(400-ent.y,400-ent.x);desired=inward+(Math.random()<.5?-.18:.18);}
   
   let repelX=0,repelY=0;
   for(const other of aliveEntities()){
     if(other.id===ent.id)continue;
     const ox=ent.x-other.x,oy=ent.y-other.y,od=Math.hypot(ox,oy);
     if(od>0&&od<43){const weight=(43-od)/43;repelX+=(ox/od)*weight;repelY+=(oy/od)*weight;}
   }
   if(Math.hypot(repelX,repelY)>.12)desired=Math.atan2(Math.sin(desired)+repelY*1.8,Math.cos(desired)+repelX*1.8);
   if(!Number.isFinite(ent.aiMoveAngle))ent.aiMoveAngle=desired;
   let moveDiff=Math.atan2(Math.sin(desired-ent.aiMoveAngle),Math.cos(desired-ent.aiMoveAngle));
   ent.aiMoveAngle+=clamp(moveDiff,-dt*2.9,dt*2.9);
   const speed=ent.speed*(phase==='AIMING'?.70:.78);
   ent.x+=Math.cos(ent.aiMoveAngle)*speed*dt;
   ent.y+=Math.sin(ent.aiMoveAngle)*speed*dt;
   ent.moveAnim+=dt*9;
 }
 keepInArena(ent);
}
function updateAllMovement(dt,phase){for(const ent of entities){if(!ent.alive)continue;if(ent.isBot){if(phase==='TILE_SURVIVAL')moveBotToTile(ent,dt);else updateBot(ent,dt,phase);}else if(ent.isLocal||isAuthority){applyHumanMovement(ent,dt);}}if(scoutPerk?.active){for(const ent of aliveEntities()){if(Math.hypot(ent.x-scoutPerk.x,ent.y-scoutPerk.y)<ent.radius+17){ent.scoutTimer=3;scoutPerk.active=false;addKillMessage(`${ent.name} FOUND THE SCOUT PULSE`);break;}}}}
function beginAiming(){setState('AIMING',10);}
function getShots(){const hits=[],shotLines=[];for(const s of aliveEntities()){shotLines.push({shooterId:s.id,angle:s.angle});let best=null,bestProj=Infinity;const c=Math.cos(s.angle),si=Math.sin(s.angle);for(const t of aliveEntities()){if(t.id===s.id)continue;const dx=t.x-s.x,dy=t.y-s.y,proj=dx*c+dy*si,perp=Math.abs(-dx*si+dy*c);if(proj>0&&proj<bestProj&&perp<=t.radius+8){best=t;bestProj=proj;}}if(best)hits.push({shooterId:s.id,targetId:best.id,projection:bestProj});}pendingHits=hits;shots=shotLines;}
function renderShotRevealPanel(){
 if(gameState!=='EXECUTING'){shotRevealPanel.classList.remove('active');return;}
 shotRevealList.innerHTML='';
 const living=aliveEntities();
 for(const shooter of living){
   const hit=pendingHits.find(h=>h.shooterId===shooter.id);
   const target=hit?living.find(e=>e.id===hit.targetId):null;
   const row=document.createElement('div');row.className='shot-reveal-row'+(target?'':' no-hit');
   const a=document.createElement('span');a.className='shooter-name';a.textContent=shooter.name;
   const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='→';
   const b=document.createElement('span');b.className='target-name';b.textContent=target?target.name:'NO HIT';
   row.append(a,arrow,b);shotRevealList.appendChild(row);
 }
 shotRevealPanel.classList.add('active');
}
function resolveShots(){const targetIds=new Set();for(const hit of pendingHits){const t=entities.find(e=>e.id===hit.targetId);if(!t||!t.alive||targetIds.has(t.id))continue;const credited=pendingHits.find(h=>h.targetId===t.id&&entities.find(e=>e.id===h.shooterId)?.alive);const shooter=credited&&entities.find(e=>e.id===credited.shooterId);spawnHitBlast(t.x,t.y,t.color||'#fca311');t.alive=false;targetIds.add(t.id);if(shooter)shooter.kills++;addKillMessage(shooter?`${shooter.name} ELIMINATED ${t.name}`:`${t.name} ELIMINATED`);}pendingHits=[];const alive=aliveEntities();const localEnt=entities.find(e=>e.id===localPlayerId);if(localEnt&&!localEnt.alive&&alive.length>1)showDeathOverlay();if(alive.length<=1){finishMatch(alive[0]||null);return;}if(alive.length===2){startFastFinger();return;}setState('REVEAL',2);}
function startFastFinger(){const alive=aliveEntities();if(alive.length<=1){finishMatch(alive[0]||null);return;}fastShooterId=null;fastLoserId=null;winnerId=null;setState('FAST_WAIT',2+Math.random()*3);addKillMessage('FINAL SHOWDOWN — WAIT FOR GREEN');}
function resolveFastTap(ent){if(gameState!=='FAST_READY'||winnerId||!ent||!ent.alive)return;winnerId=ent.id;winnerName=ent.name;const other=aliveEntities().find(e=>e.id!==ent.id);if(other)ent.angle=Math.atan2(other.y-ent.y,other.x-ent.x);fastShooterId=ent.id;fastLoserId=other?.id||null;fireProgress=0;setState('FAST_SHOOT',1.05);showdownBtn.style.display='none';addKillMessage(`${ent.name} FIRES FIRST!`);}
function finishMatch(winner){winnerId=winner?.id||null;winnerName=winner?.name||'';setState('GAME_OVER',0);showdownBtn.style.display='none';setOverlayVisible(deathOverlay,false);setOverlayVisible(resultOverlay,true);const local=entities.find(e=>e.id===localPlayerId);const localWon=winner&&winner.id===localPlayerId;$('resultTitle').textContent=winner?(localWon?'CONGRATULATIONS!':`${winner.name} WINS!`):'NO ONE SURVIVED';$('resultMessage').textContent=winner?(localWon?'You survived the arena. Fantastic shot!':`${winner.name} won the match. Better luck next time!`):'It was a draw. No fighter survived the final challenge.';$('resultWinner').textContent=winner?winner.name:'TIE';$('resultKills').textContent=local?local.kills:0;$('resultExtra').textContent=localWon?'🏆 Champion! Your victory fireworks are live.':'Thanks for watching Blind Shot!';if(localWon)addFireworks();gameResultShown=true;updateHud();broadcastSnapshot(true);}
function afterRoundReveal(){roundNumber++;arenaSize=Math.max(400,arenaSize-45);aliveEntities().forEach(keepInArena);if(aliveEntities().length<=2){startFastFinger();return;}if(roundNumber>12){beginTileRound();return;}beginRound();}
function tickAuthority(dt){gameElapsed+=dt;if(gameState==='MENU'||gameState==='GAME_OVER')return;for(const e of entities){if(e.scoutTimer>0)e.scoutTimer=Math.max(0,e.scoutTimer-dt);}
 if(gameState==='STARTING'||gameState==='AIMING'){updateAllMovement(dt,gameState);}
 else if(gameState==='TILE_SURVIVAL'){updateAllMovement(dt,'TILE_SURVIVAL');processTileLocks();}
 if(gameState==='FAST_WAIT'||gameState==='FAST_READY'){/* reactions handled below */}
 if(stateTimer>0)stateTimer=Math.max(0,stateTimer-dt);
 if(gameState==='MATCH_COUNTDOWN'&&stateTimer<=0){if(mode==='host')fillHostBots();beginRound();}
 else if(gameState==='STARTING'&&stateTimer<=0){beginAiming();}
 else if(gameState==='AIMING'&&stateTimer<=0){getShots();setState('EXECUTING',5);addKillMessage('SHOTS LOCKED');}
 else if(gameState==='EXECUTING'&&stateTimer<=0){setState('FIRING',1.55);fireProgress=0;}
 else if(gameState==='FIRING'){fireProgress=Math.min(1,fireProgress+dt/.42);if(stateTimer<=0)resolveShots();}
 else if(gameState==='REVEAL'&&stateTimer<=0){afterRoundReveal();}
 else if(gameState==='TILE_SURVIVAL'&&stateTimer<=0){resolveTileRound();}
 else if(gameState==='FAST_WAIT'&&stateTimer<=0){setState('FAST_READY',4);}
 else if(gameState==='FAST_READY'){
   const aliveBots=aliveEntities().filter(e=>e.isBot);
   if(aliveBots.length&&gameElapsed>=fastBotAt){resolveFastTap(aliveBots[0]);}
 }
 else if(gameState==='FAST_SHOOT'){fireProgress=Math.min(1,fireProgress+dt/.32);if(stateTimer<=0){const loser=entities.find(e=>e.id===fastLoserId);if(loser)loser.alive=false;const win=entities.find(e=>e.id===winnerId);finishMatch(win||null);}}
 updateHud();}

function beginTileRound(){const alive=aliveEntities();if(alive.length<=2){handleLowPlayerCount();return;}tiles=[];alive.forEach(e=>e.tileSafe=false);const tileCount=Math.max(1,alive.length-1);safeTileColor=randomFrom(TILE_COLORS).name;let safeMade=0;for(let i=0;i<tileCount;i++){let colorName;if(i<tileCount){if(safeMade<tileCount){colorName=safeTileColor;safeMade++;}}const colorObj=TILE_COLORS.find(c=>c.name===colorName)||randomFrom(TILE_COLORS);const p=randomPosition(Math.min(arenaSize,660));tiles.push({x:p.x,y:p.y,size:35,color:colorObj.name,fill:colorObj.fill,lockedBy:null,safe:colorObj.name===safeTileColor});}
 
 setState('TILE_SURVIVAL',6);addKillMessage(`STAND ON THE ${safeTileColor} TILE TO SURVIVE`);}
function moveBotToTile(ent,dt){if(ent.tileSafe)return;const tile=tiles.filter(t=>t.safe&&!t.lockedBy);let targetTile=tile.sort((a,b)=>Math.hypot(a.x-ent.x,a.y-ent.y)-Math.hypot(b.x-ent.x,b.y-ent.y))[0];if(!targetTile){updateBot(ent,dt,'TILE_SURVIVAL');return;}const a=Math.atan2(targetTile.y-ent.y,targetTile.x-ent.x),d=Math.hypot(targetTile.x-ent.x,targetTile.y-ent.y);if(d>7){ent.x+=Math.cos(a)*ent.speed*1.15*dt;ent.y+=Math.sin(a)*ent.speed*1.15*dt;ent.moveAnim+=dt*11;ent.angle=a;}keepInArena(ent);}
function processTileLocks(){for(const tile of tiles){if(!tile.safe||tile.lockedBy)continue;const candidate=aliveEntities().filter(e=>!e.tileSafe&&Math.hypot(e.x-tile.x,e.y-tile.y)<tile.size*.62+e.radius).sort((a,b)=>Math.hypot(a.x-tile.x,a.y-tile.y)-Math.hypot(b.x-tile.x,b.y-tile.y))[0];if(candidate){tile.lockedBy=candidate.id;candidate.tileSafe=true;addKillMessage(`${candidate.name} LOCKED A SAFE TILE`);}}}
function resolveTileRound(){const alive=aliveEntities();const survivors=alive.filter(e=>e.tileSafe);const survivorIds=new Set(survivors.map(e=>e.id));for(const e of alive){if(!survivorIds.has(e.id)){e.alive=false;addKillMessage(`${e.name} DID NOT REACH THE ${safeTileColor} TILE`);}}const localEnt=entities.find(e=>e.id===localPlayerId);if(localEnt&&!localEnt.alive&&survivors.length>1)showDeathOverlay();if(survivors.length===0){finishMatch(null);$('resultTitle').textContent='NO ONE SURVIVED';$('resultMessage').textContent='Nobody reached a safe colour tile. It is a tie!';return;}if(survivors.length===1){finishMatch(survivors[0]);return;}if(survivors.length===2){startFastFinger();return;}roundNumber++;arenaSize=Math.max(400,arenaSize-25);beginTileRound();}
function handleLowPlayerCount(){const alive=aliveEntities();if(alive.length===0)finishMatch(null);else if(alive.length===1)finishMatch(alive[0]);else if(alive.length===2)startFastFinger();else beginRound();}

function serializableSnapshot(forceStarted=false){return{type:'snapshot',started:currentScreen==='game'||forceStarted,mode,roomCode,hostId:hostPlayerId,localPlayerId,gameState,stateTimer,roundNumber,arenaSize,gameElapsed,entities:entities.map(e=>({...e})),pendingHits:pendingHits.map(h=>({...h})),shots:shots.map(s=>({...s})),fireProgress,scoutPerk:scoutPerk?{...scoutPerk}:null,tiles:tiles.map(t=>({...t})),safeTileColor,winnerId,winnerName,fastShooterId,fastLoserId};}
function broadcastSnapshot(force=false){if(!isRoomHost||!isAuthority)return;const snap=serializableSnapshot(force);for(const c of remoteConnections.values()){if(c.open&&c._playerId){try{c.send(snap);}catch(err){console.warn('Snapshot send failed',err);}}}}
let clientPrevAlive=null;
function syncSnapshot(msg){if(!msg||!Array.isArray(msg.entities))return;const previous=entities;const previousAlive=new Map(previous.map(e=>[e.id,!!e.alive]));const wasAlive=entities.find(e=>e.id===localPlayerId)?.alive;mode=msg.mode||mode;gameState=msg.gameState||gameState;stateTimer=Number(msg.stateTimer)||0;roundNumber=msg.roundNumber||roundNumber;arenaSize=msg.arenaSize||arenaSize;gameElapsed=msg.gameElapsed||gameElapsed;entities=msg.entities;for(const e of entities){if(previousAlive.get(e.id)===true&&!e.alive){spawnHitBlast(e.x,e.y,e.color||'#fca311');}}pendingHits=msg.pendingHits||[];shots=msg.shots||[];fireProgress=msg.fireProgress||0;scoutPerk=msg.scoutPerk||null;tiles=msg.tiles||[];safeTileColor=msg.safeTileColor||safeTileColor;winnerId=msg.winnerId||null;winnerName=msg.winnerName||'';fastShooterId=msg.fastShooterId||null;fastLoserId=msg.fastLoserId||null;isAuthority=false;isNetworkClient=true;isRoomHost=false;updateHud();const localCanPlayFast=entities.some(e=>e.id===localPlayerId&&e.alive);showdownBtn.style.display=((gameState==='FAST_WAIT'||gameState==='FAST_READY')&&localCanPlayFast)?'block':'none';showdownBtn.disabled=gameState!=='FAST_READY'||!localCanPlayFast;showdownBtn.classList.toggle('green',gameState==='FAST_READY');showdownBtn.classList.toggle('red',gameState!=='FAST_READY');showdownBtn.textContent=gameState==='FAST_READY'?'TAP TO FIRE!':'WAIT…';const ent=entities.find(e=>e.id===localPlayerId);if(wasAlive===true&&ent&&!ent.alive)showDeathOverlay();if(gameState==='GAME_OVER'&&!gameResultShown)renderResultOverlay();}
function handleClientTap(){if(!isNetworkClient||!hostConn||!hostConn.open)return;if(gameState==='FAST_READY'&&!fastTapSent){fastTapSent=true;try{hostConn.send({type:'fastTap'});}catch(_){};showdownBtn.disabled=true;}}
function renderResultOverlay(){const winner=entities.find(e=>e.id===winnerId);const local=entities.find(e=>e.id===localPlayerId);const localWon=winner&&winner.id===localPlayerId;setOverlayVisible(resultOverlay,true);setOverlayVisible(deathOverlay,false);$('resultTitle').textContent=winner?(localWon?'CONGRATULATIONS!':`${winner.name} WINS!`):'NO ONE SURVIVED';$('resultMessage').textContent=winner?(localWon?'You survived the arena. Fantastic shot!':`${winner.name} won the match. Better luck next time!`):'It was a draw. No fighter survived the final challenge.';$('resultWinner').textContent=winner?winner.name:'TIE';$('resultKills').textContent=local?local.kills:0;$('resultExtra').textContent=localWon?'🏆 Champion! Your victory fireworks are live.':'Thanks for watching Blind Shot!';if(localWon)addFireworks();gameResultShown=true;}
function showDeathOverlay(){if(localDeathSeen||isSpectating||gameState==='GAME_OVER')return;localDeathSeen=true;const local=entities.find(e=>e.id===localPlayerId);$('deathKills').textContent=local?local.kills:0;$('deathRound').textContent=roundNumber;$('deathMessage').textContent=`${local?.name||'You'} were eliminated. The match continues — spectate to watch the survivors.`;setOverlayVisible(deathOverlay,true);}

function drawCartoonText(text,x,y,size=24,color='#fff'){ctx.save();ctx.font=`${size}px 'Luckiest Guy',cursive`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=Math.max(3,size*.13);ctx.strokeStyle='#081411';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();}
function drawEntity(ent,showLabel){ctx.save();ctx.translate(ent.x,ent.y);ctx.rotate(ent.angle);const swing=(gameState==='STARTING'||gameState==='AIMING'||gameState==='TILE_SURVIVAL')?Math.sin(ent.moveAnim)*5:0;ctx.fillStyle='#111';ctx.fillRect(-10+swing,-9,7,8);ctx.fillRect(-10-swing,2,7,8);ctx.fillStyle=ent.color;ctx.fillRect(4,-15,10,9);ctx.fillRect(4,6,10,9);ctx.fillStyle='#fff';ctx.fillRect(9,-3,24,7);ctx.fillStyle=ent.color;ctx.fillRect(-ent.radius,-ent.radius,ent.radius*2,ent.radius*2);ctx.fillStyle='#fed7aa';ctx.fillRect(0,-5,13,10);ctx.restore();if(showLabel){ctx.save();ctx.font=`${ent.isLocal?18:16}px 'Luckiest Guy',cursive`;ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#000';ctx.strokeText(ent.name,ent.x,ent.y-29);ctx.fillStyle=ent.isLocal?'#d8fff1':'#fff';ctx.fillText(ent.name,ent.x,ent.y-29);if(ent.kills>0){ctx.font="11px 'Fredoka',sans-serif";ctx.lineWidth=3;ctx.strokeText(`K ${ent.kills}`,ent.x,ent.y-45);ctx.fillText(`K ${ent.kills}`,ent.x,ent.y-45);}ctx.restore();}}
function drawArena(){ctx.clearRect(0,0,800,800);const cx=400,cy=400,r=arenaSize/2;ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();const x0=400-r,y0=400-r,tile=50;for(let rr=0;rr<=arenaSize/tile+1;rr++)for(let cc=0;cc<=arenaSize/tile+1;cc++){ctx.fillStyle=(rr+cc)%2===0?'#1b3a36':'#102825';ctx.fillRect(x0+cc*tile,y0+rr*tile,tile,tile);}if(gameState==='TILE_SURVIVAL'){for(const t of tiles){ctx.save();ctx.translate(t.x,t.y);ctx.fillStyle=t.fill;ctx.strokeStyle=t.lockedBy?'#fff':'#071714';ctx.lineWidth=t.lockedBy?5:3;ctx.shadowColor=t.safe?t.fill:'transparent';ctx.shadowBlur=t.safe?14:0;ctx.fillRect(-t.size/2,-t.size/2,t.size,t.size);ctx.strokeRect(-t.size/2,-t.size/2,t.size,t.size);if(t.lockedBy){ctx.fillStyle='#101714';ctx.font="14px 'Luckiest Guy',cursive";ctx.textAlign='center';ctx.fillText('✓',0,5);}ctx.restore();}}
 if(scoutPerk?.active){ctx.save();ctx.translate(scoutPerk.x,scoutPerk.y);const pulse=1+Math.sin(gameElapsed*7)*.13;ctx.scale(pulse,pulse);ctx.fillStyle='#38d9a9';ctx.strokeStyle='#faffd2';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#06352a';ctx.font="22px 'Luckiest Guy',cursive";ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✦',0,1);ctx.restore();}
 ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=roundNumber>12?'#ffd166':'#38d9a9';ctx.lineWidth=7;ctx.stroke();}
function draw(){if(currentScreen!=='game')return;drawArena();const local=entities.find(e=>e.id===localPlayerId);const scoutActive=!!(local&&local.alive&&local.scoutTimer>0);const allVisible=isSpectating||!local?.alive||['EXECUTING','FIRING','REVEAL','TILE_SURVIVAL','FAST_WAIT','FAST_READY','FAST_SHOOT','GAME_OVER'].includes(gameState);const showEvery=allVisible;
 if(gameState==='EXECUTING'){
   for(const hit of pendingHits){
     const shooter=entities.find(e=>e.id===hit.shooterId&&e.alive),target=entities.find(e=>e.id===hit.targetId&&e.alive);
     if(!shooter||!target)continue;
     ctx.save();ctx.setLineDash([10,8]);ctx.lineWidth=5;ctx.strokeStyle='rgba(255,209,102,.88)';ctx.beginPath();ctx.moveTo(shooter.x,shooter.y);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.setLineDash([]);
     const a=Math.atan2(target.y-shooter.y,target.x-shooter.x),len=16;ctx.translate(target.x,target.y);ctx.rotate(a);ctx.fillStyle='#ffd166';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-len,-len*.58);ctx.lineTo(-len,len*.58);ctx.closePath();ctx.fill();ctx.restore();
     ctx.save();ctx.beginPath();ctx.arc(target.x,target.y,target.radius+9,0,Math.PI*2);ctx.strokeStyle='rgba(255,209,102,.95)';ctx.lineWidth=4;ctx.stroke();ctx.restore();
   }
 }
 for(const ent of entities){if(!ent.alive&&gameState!=='GAME_OVER')continue;const isLocalEntity=ent.id===localPlayerId;const visible=showEvery||isLocalEntity;if(gameState==='AIMING'&&isLocalEntity&&ent.alive){ctx.save();ctx.beginPath();ctx.moveTo(ent.x,ent.y);ctx.lineTo(ent.x+Math.cos(ent.angle)*Math.min(220,arenaSize*.45),ent.y+Math.sin(ent.angle)*Math.min(220,arenaSize*.45));ctx.strokeStyle='rgba(255,107,107,.72)';ctx.lineWidth=3;ctx.stroke();ctx.restore();}if(visible||showEvery)drawEntity(ent,visible||showEvery);else if(scoutActive&&Math.sin(gameElapsed*14)>0)drawEntity(ent,true);}
 
 if((gameState==='FIRING'||gameState==='FAST_SHOOT')&&fireProgress<1){const lines=gameState==='FAST_SHOOT'?[{shooterId:fastShooterId,angle:entities.find(e=>e.id===fastShooterId)?.angle||0}]:shots;for(const s of lines){const ent=entities.find(e=>e.id===s.shooterId);if(!ent)continue;ctx.save();ctx.globalAlpha=gameState==='FAST_SHOOT'?1:Math.max(.15,1-fireProgress*.25);ctx.beginPath();ctx.moveTo(ent.x,ent.y);const length=gameState==='FAST_SHOOT'?1700*Math.min(1,fireProgress):1700*Math.min(1,fireProgress);ctx.lineTo(ent.x+Math.cos(s.angle)*length,ent.y+Math.sin(s.angle)*length);ctx.strokeStyle='#fca311';ctx.lineWidth=gameState==='FAST_SHOOT'?9:6;ctx.stroke();ctx.restore();}}
 drawHitBlasts();
 if(gameState==='MATCH_COUNTDOWN'){drawCartoonText(`MATCH STARTING ${Math.ceil(stateTimer)}`,400,400,32,'#ffd166');}
 else if(gameState==='STARTING'){drawCartoonText(`ROUND ${roundNumber}`,400,Math.max(24,400-arenaSize/2-25),28,'#fff');drawCartoonText(`STARTING: ${Math.ceil(stateTimer)}`,400,Math.min(776,400+arenaSize/2+29),22,'#fff');}
 else if(gameState==='AIMING'){drawCartoonText(`${Math.ceil(stateTimer)}`,400,410,85,'rgba(255,255,255,.55)');}
 else if(gameState==='EXECUTING'){drawCartoonText(`EXECUTING PLAYERS — ${Math.ceil(stateTimer)}s`,400,Math.min(776,400+arenaSize/2+23),25,'#ffd166');}
 else if(gameState==='TILE_SURVIVAL'){drawCartoonText(`STAND ON ${safeTileColor}`,400,Math.max(24,400-arenaSize/2-23),25,'#ffd166');drawCartoonText(`SURVIVE: ${Math.ceil(stateTimer)}`,400,Math.min(776,400+arenaSize/2+25),20,'#fff');}
 else if(gameState==='REVEAL'){drawCartoonText('ROUND REVEAL',400,400,28,'#38d9a9');}
 else if(gameState==='FAST_WAIT'||gameState==='FAST_READY'){drawCartoonText(gameState==='FAST_WAIT'?'WAIT FOR GREEN!':'TAP NOW!',400,Math.max(24,400-arenaSize/2-25),27,gameState==='FAST_WAIT'?'#ff6b6b':'#38d9a9');}
 else if(gameState==='FAST_SHOOT'){drawCartoonText('QUICK DRAW!',400,Math.max(24,400-arenaSize/2-25),27,'#ffd166');}
 else if(gameState==='GAME_OVER'){drawCartoonText(winnerId?(winnerId===localPlayerId?'YOU WIN!':`${winnerName} WINS!`):'NO ONE SURVIVED',400,400,34,'#38d9a9');}
}

function frame(now){const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;try{drawBackground(dt);drawFireworks(dt);updateHitBlasts(dt);if(currentScreen==='game'){if(isAuthority)tickAuthority(dt);else if(isNetworkClient&&gameState!=='GAME_OVER'){if(stateTimer>0)stateTimer=Math.max(0,stateTimer-dt);if(gameState==='FIRING')fireProgress=Math.min(1,fireProgress+dt/.42);}if(isNetworkClient){inputElapsed+=dt;if(inputElapsed>=.05){inputElapsed=0;sendClientInput();}}if(isRoomHost){snapshotElapsed+=dt;if(snapshotElapsed>=.09){snapshotElapsed=0;broadcastSnapshot();}}draw();}}catch(err){console.error('Blind Shot frame recovered from an error:',err);}finally{requestAnimationFrame(frame);}}
function sendClientInput(){if(!hostConn||!hostConn.open||!isNetworkClient||gameState==='GAME_OVER')return;const i=getLocalInput();try{hostConn.send({type:'input',moveX:i.moveX,moveY:i.moveY,angle:i.angle});}catch(_){} }

(function initOwnerSettings(){
 const maintenance=$('maintenanceScreen');
 if(MAINTENANCE_MODE){maintenance.classList.add('active');document.querySelectorAll('button').forEach(b=>{if(!maintenance.contains(b))b.disabled=true;});}
 const otherGamesBtn=$('maintenanceOtherGamesBtn');
 if(otherGamesBtn){otherGamesBtn.addEventListener('click',()=>{if(OTHER_GAMES_URL.trim()){window.location.href=OTHER_GAMES_URL;}else{showToast('Add your games link to OTHER_GAMES_URL in script.js first.');}});}
 const backdrop=$('constructionBackdrop');
 if(SHOW_UNDER_CONSTRUCTION_NOTICE&&!PERMANENTLY_DISABLE_CONSTRUCTION_NOTICE&&!MAINTENANCE_MODE){
   let dismissed=false;
   const hide=()=>{
     if(dismissed)return;dismissed=true;
     backdrop.classList.remove('active');backdrop.classList.add('closing');
     backdrop.setAttribute('aria-hidden','true');
     setTimeout(()=>{backdrop.classList.remove('closing');backdrop.style.display='none';},380);
   };
   requestAnimationFrame(()=>{backdrop.style.display='flex';backdrop.setAttribute('aria-hidden','false');requestAnimationFrame(()=>backdrop.classList.add('active'));});
   const timer=setTimeout(hide,Math.max(1000,UNDER_CONSTRUCTION_NOTICE_DURATION_MS));
   $('closeConstructionNotice').addEventListener('click',()=>{clearTimeout(timer);hide();});
 }
})();
requestAnimationFrame(frame);

showdownBtn.addEventListener('click',e=>{e.preventDefault();if(gameState!=='FAST_READY')return;if(isNetworkClient){handleClientTap();return;}const local=entities.find(e=>e.id===localPlayerId);if(local)resolveFastTap(local);});
showdownBtn.addEventListener('touchstart',e=>{if(gameState==='FAST_READY'){e.preventDefault();if(isNetworkClient)handleClientTap();else{const local=entities.find(p=>p.id===localPlayerId);if(local)resolveFastTap(local);}}},{passive:false});

let touchFastHandled=false;
showdownBtn.addEventListener('touchstart',()=>{touchFastHandled=true;setTimeout(()=>touchFastHandled=false,450)},{passive:true});
showdownBtn.addEventListener('click',e=>{if(touchFastHandled){e.preventDefault();return;}},true);

window.addEventListener('beforeunload',()=>{try{destroyPeer(true);}catch(_){}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&currentScreen==='game'&&isAuthority){  
  }}); 
