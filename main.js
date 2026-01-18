/* Hotel das Férias – Web Endless (singleplayer) */
(function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const SAVE_KEY='hoteldasferias_web_single_v1';
  const save=(data)=>localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  const load=()=>{try{const j=localStorage.getItem(SAVE_KEY);return j?JSON.parse(j):null}catch(e){return null}};

  const canvas=document.getElementById('game'); const ctx=canvas.getContext('2d');
  function resize(){ canvas.width=innerWidth*devicePixelRatio; canvas.height=innerHeight*devicePixelRatio; canvas.style.width=innerWidth+'px'; canvas.style.height=innerHeight+'px'; }
  addEventListener('resize',resize); resize();

  const hud={ day:document.getElementById('day'), clock:document.getElementById('clock'), energy:document.getElementById('m-energy'), hunger:document.getElementById('m-hunger'), hygiene:document.getElementById('m-hygiene'), fun:document.getElementById('m-fun'), list:document.getElementById('task-list'), hint:document.getElementById('hint') };

  const world={ w:2400,h:1600, zones:[] };
  const player={ x:1200,y:800,r:16,speed:160,runMult:1.6 };
  const cam={x:0,y:0};
  let minute=6*60; let day=1; let missionTimer=5; let needs={ energy:0.8,hunger:0.6,hygiene:0.7,fun:0.5 };
  const missions=[]; let collectibles=[]; let volley=0;

  function addZone(x,y,w,h,color,label,type){ world.zones.push({x,y,w,h,color,label,type}); }
  function buildWorld(){
    world.zones.length=0;
    addZone(1000,700,200,140,'#ffffff','Quarto','room');
    addZone(1040,740,100,60,'#e0f7fa','Banheiro','bath');
    addZone(980,720,80,40,'#ffe0b2','Cama','bed');
    addZone(1400,680,220,160,'#f1f2f6','Café','cafe');
    addZone(1000,980,240,140,'#74b9ff','Piscina','pool');
    addZone(1400,980,220,160,'#ffeaa7','Praia','beach');
    addZone(1200,840,100,60,'#e8eaf6','Recepção','reception');
  }

  function hint(t){ hud.hint.textContent=t; hud.hint.classList.remove('hidden'); setTimeout(()=>hud.hint.classList.add('hidden'),1600); }
  function uiTasks(){ hud.list.innerHTML=''; missions.forEach(m=>{ const li=document.createElement('li'); let p=''; if(m.type==='timer'&&!m.done) p=` (${Math.floor(m.progress||0)}s/${m.seconds||0}s)`; if(m.type==='collect'&&!m.done) p=` (${m.progress||0}/${m.count})`; li.textContent=(m.done?'✅ ':'• ')+m.label+p; hud.list.appendChild(li); }); }

  const missionPool=[
    {id:'pool_time', label:'Brincar na piscina (40s)', type:'timer', seconds:40, area:'pool'},
    {id:'shells', label:'Coletar 5 conchas na praia', type:'collect', count:5, area:'beach'},
    {id:'sandcastle', label:'Construir um castelo de areia', type:'hold', seconds:8, area:'beach'},
    {id:'fruits', label:'Levar 3 frutas ao buffet', type:'repeat', repeats:3, area:'cafe'},
    {id:'lifeguard', label:'Falar com o salva-vidas', type:'interact', area:'pool'}
  ];

  function addMission(){ const m=JSON.parse(JSON.stringify(pick(missionPool))); m.done=false; m.progress=0; missions.push(m); uiTasks(); hint('Nova missão: '+m.label); }
  function inZone(p,z){ return p.x>z.x-z.w/2 && p.x<z.x+z.w/2 && p.y>z.y-z.h/2 && p.y<z.y+z.h/2 }
  function missionArea(area){ return world.zones.find(z=>z.type===area); }

  function missionTick(dt){ missionTimer-=dt; if(missionTimer<=0 && missions.filter(m=>!m.done).length<3){ addMission(); missionTimer=10+Math.random()*20; }
    for(const m of missions){ if(m.done) continue; if(m.type==='timer'){ const z=missionArea(m.area); if(z&&inZone(player,z)){ m.progress+=dt; if(m.progress>=m.seconds){ m.done=true; uiTasks(); hint('Missão concluída: '+m.label+' ✨'); needs.fun=Math.min(1, needs.fun+0.25); } } }
  }

  function doInteract(){ const here=world.zones.filter(z=>inZone(player,z)); if(!here.length) return; const z=here[0];
    if(z.type==='bed'){ day++; startDay(true); return; }
    if(z.type==='cafe'){ needs.hunger=Math.min(1, needs.hunger+0.5); hint('Café da manhã! ☕🥐'); return; }
    if(z.type==='bath'){ needs.hygiene=Math.min(1, needs.hygiene+0.5); hint('Banho refrescante! 🚿'); return; }
    const lifeguard=missions.find(m=>!m.done && m.id==='lifeguard' && z.type==='pool'); if(lifeguard){ lifeguard.done=true; uiTasks(); hint('Missão concluída: '+lifeguard.label+' ✨'); }
    const sand=missions.find(m=>!m.done && m.id==='sandcastle' && z.type==='beach'); if(sand){ let t=0, need=sand.seconds||8; const id=setInterval(()=>{ t+=0.25; hint(`Construindo castelo... ${Math.floor(t)}s/${need}s`); if(t>=need){ clearInterval(id); sand.done=true; uiTasks(); hint('Missão concluída: '+sand.label+' ✨'); } },250); }
  }

  const keys={}; addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true; if(e.key.toLowerCase()==='e') doInteract();}); addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  const stick=document.getElementById('stick'); const stickDot=document.getElementById('stick-dot'); let stickCenter=null, stickVec={x:0,y:0};
  stick.addEventListener('touchstart',e=>{const t=e.touches[0];const r=stick.getBoundingClientRect();stickCenter={x:r.left+r.width/2,y:r.top+r.height/2};e.preventDefault()},{passive:false});
  stick.addEventListener('touchmove',e=>{const t=e.touches[0];if(!stickCenter)return;const dx=t.clientX-stickCenter.x;const dy=t.clientY-stickCenter.y;const max=Math.min(stick.clientWidth,stick.clientHeight)*0.35;const sx=Math.max(-1,Math.min(1,dx/max));const sy=Math.max(-1,Math.min(1,dy/max));stickVec={x:sx,y:sy};stickDot.style.transform=`translate(${sx*max}px, ${sy*max}px)`;e.preventDefault()},{passive:false});
  stick.addEventListener('touchend',()=>{stickVec={x:0,y:0};stickDot.style.transform='translate(0,0)'});
  document.getElementById('btn-interact').onclick=()=>doInteract();
  document.getElementById('btn-run').addEventListener('touchstart',()=>keys['shift']=true);
  document.getElementById('btn-run').addEventListener('touchend',()=>keys['shift']=false);

  function startDay(reset){ if(reset){ player.x=1200; player.y=800; } minute=6*60; collectibles=[]; missions.length=0; missionTimer=5; save({day,needs}); }
  function newGame(){ day=1; needs={energy:0.8,hunger:0.6,hygiene:0.7,fun:0.5}; buildWorld(); startDay(true); }
  function continueGame(){ const s=load(); buildWorld(); if(s){ day=s.day||1; needs=s.needs||needs; } startDay(true); }

  const menu={ root:document.getElementById('menu'), start:document.getElementById('menu-start'), cont:document.getElementById('menu-continue'), audio:document.getElementById('menu-audio') };
  const pause={ root:document.getElementById('pause'), resume:document.getElementById('pause-resume'), restart:document.getElementById('pause-restart'), exit:document.getElementById('pause-exit') };
  const btnAudio=document.getElementById('btn-audio'); const btnPause=document.getElementById('btn-pause');

  let audioEnabled=true; let musicInt=null;
  function sfx(f=440,t=0.08,type='sine',g=0.07){ if(!audioEnabled) return; const a=new (window.AudioContext||window.webkitAudioContext)(); const o=a.createOscillator(); const m=a.createGain(); o.type=type; o.frequency.value=f; m.gain.value=g; o.connect(m); m.connect(a.destination); o.start(); o.stop(a.currentTime+t); }
  function startMusic(){ if(!audioEnabled||musicInt) return; const notes=[261.63,293.66,329.63,392.0]; musicInt=setInterval(()=>{ const n=pick(notes); sfx(n,0.14,'sine',0.02); setTimeout(()=>sfx(n*1.5,0.07,'triangle',0.015),140); },600); }
  function stopMusic(){ if(musicInt){ clearInterval(musicInt); musicInt=null; } }

  btnAudio.onclick=()=>{ audioEnabled=!audioEnabled; (audioEnabled?startMusic:stopMusic)(); btnAudio.textContent = audioEnabled ? '🔊' : '🔈'; menu.audio.textContent = 'Áudio: '+(audioEnabled?'Ligado':'Desligado'); };
  btnPause.onclick=()=>{ pause.root.classList.toggle('hidden'); };
  menu.audio.onclick=()=>btnAudio.onclick();
  menu.start.onclick=()=>{ newGame(); menu.root.classList.add('hidden'); startMusic(); };
  menu.cont.onclick=()=>{ continueGame(); menu.root.classList.add('hidden'); startMusic(); };
  pause.resume.onclick=()=>{ pause.root.classList.add('hidden'); };
  pause.restart.onclick=()=>startDay(true);
  pause.exit.onclick=()=>{ menu.root.classList.remove('hidden'); stopMusic(); };

  let last=performance.now();
  function loop(now){ requestAnimationFrame(loop); const dt=(now-last)/1000; last=now;
    minute += dt*12; if(minute>=22*60){ day++; startDay(true); hint('Novo dia começou! 🌞'); }
    needs.energy=Math.max(0, needs.energy - dt*0.01*(keys['shift']?2:1));
    needs.hunger=Math.max(0, needs.hunger - dt*0.005);
    needs.hygiene=Math.max(0, needs.hygiene - dt*0.004);
    needs.fun=Math.max(0, needs.fun - dt*0.003);

    let mx=(keys['d']||keys['arrowright']?1:0) - (keys['a']||keys['arrowleft']?1:0) + (stickVec.x||0);
    let my=(keys['s']||keys['arrowdown']?1:0) - (keys['w']||keys['arrowup']?1:0) + (stickVec.y||0);
    const len=Math.hypot(mx,my); if(len>1){mx/=len; my/=len}
    const speed = player.speed*(keys['shift']?player.runMult:1)*(0.5 + needs.energy*0.5);
    player.x = Math.max(80, Math.min(world.w-80, player.x + mx*speed*dt));
    player.y = Math.max(80, Math.min(world.h-80, player.y + my*speed*dt));

    missionTick(dt);

    // draw
    hud.clock.textContent = `${String(Math.floor(minute/60)%24).padStart(2,'0')}:${String(Math.floor(minute%60)).padStart(2,'0')}`;
    hud.day.textContent = 'Dia '+day;
    hud.energy.style.width=(needs.energy*100)+'%';
    hud.hunger.style.width=(needs.hunger*100)+'%';
    hud.hygiene.style.width=(needs.hygiene*100)+'%';
    hud.fun.style.width=(needs.fun*100)+'%';

    const dpr=devicePixelRatio; const viewW=canvas.width/dpr, viewH=canvas.height/dpr;
    cam.x = Math.max(0, Math.min(world.w - viewW, player.x - viewW/2));
    cam.y = Math.max(0, Math.min(world.h - viewH, player.y - viewH/2));

    ctx.setTransform(dpr,0,0,dpr,-cam.x*dpr,-cam.y*dpr);
    ctx.fillStyle='#9fd6ff'; ctx.fillRect(cam.x,cam.y,viewW,viewH);

    for(const z of world.zones){ ctx.fillStyle=z.color; ctx.fillRect(z.x-z.w/2, z.y-z.h/2, z.w, z.h); ctx.fillStyle='rgba(0,0,0,.5)'; ctx.font='14px sans-serif'; ctx.fillText(z.label, z.x-z.w/2+6, z.y-z.h/2+18); }
    ctx.fillStyle='#2ecc71'; ctx.beginPath(); ctx.arc(player.x,player.y,player.r,0,Math.PI*2); ctx.fill();
  }

  const s=load(); if(!s){ document.getElementById('menu-continue').disabled=true; document.getElementById('menu-continue').classList.add('secondary'); }
  requestAnimationFrame(loop);
})();
