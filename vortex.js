'use strict';

(() => {
  const dialog=$('#vortexDialog'),canvas=$('#vortexCanvas'),frame=$('#vortexPhotoFrame');
  const gather=$('#vortexGather'),pause=$('#vortexPause'),replay=$('#vortexReplay');
  const progress=$('#vortexProgress'),fill=progress.querySelector('i');
  const warpButton=$('#vortexWarp'),catchButton=$('#vortexCatch'),photo=$('#vortexPhoto');
  let renderer=null,loading=null,raf=0,last=0,time=0,elapsed=0,paused=false;
  let phase='closed',yaw=-.55,pitch=.18,drag=null,opener=null,oldMusicLock=false,openVersion=0;
  let warp=0,warpWanted=false,velocity={x:0,y:0},pointer={x:0,y:0,strength:0},pointerWanted=0,catchIndex=0;
  let contextLost=false;
  let slowFrames=0;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const running=()=>dialog.open&&!paused&&!document.hidden&&!window.navitMotionPaused&&!['complete','loading','memory'].includes(phase);
  const words={
    explore:['01 / ALL THE LITTLE MOMENTS','A universe <em>made of us.</em>','Every laugh. Every little adventure. Every version of you.','Drag the light. Turn the memories. Take your time.'],
    gathering:['02 / FINDING THEIR WAY HOME','Every little <em>moment…</em>','A thousand little pieces. One very special little bhai.','Watch your little universe find its way to you.'],
    monogram:['03 / THE CENTRE OF THIS UNIVERSE','…has always led <em>to you.</em>','N. For Navit. For a whole lifetime of being loved.','Some people make your world bigger just by being in it.'],
    forming:['04 / WHERE OUR STORY BEGAN','Before all <em>the adventures…</em>','Before the big laughs. Before the little superhero.','There was this moment. And there was you.'],
    complete:['05 / OUR VERY FIRST CHAPTER','You fit <em>in my arms.</em>','And changed my whole world.','Chacha by relation. Your bhai, for every chapter ahead.']
  };
  function setPhase(next){
    if(phase===next)return;
    phase=next;dialog.dataset.phase=next;
    if(words[next]){
      const [chapter,title,description,status]=words[next];
      $('#vortexChapter').textContent=chapter;$('#vortexTitle').innerHTML=title;
      $('#vortexDescription').textContent=description;$('#vortexStatus').textContent=status;
    }
    const complete=next==='complete',explore=next==='explore',memory=next==='memory';
    gather.disabled=!complete&&!explore&&!memory;
    gather.innerHTML=complete?'Back to my birthday story <span aria-hidden="true">↗</span>':explore||memory?'Bring our first memory back <span aria-hidden="true">↗</span>':'Gathering your memories…';
    pause.disabled=complete||memory||next==='loading';replay.hidden=!complete;
    warpButton.disabled=!explore;catchButton.disabled=!explore&&!memory;
    catchButton.textContent=memory?'↶ Release this memory':'✧ Catch a memory';
    replay.disabled=window.navitMotionPaused||dialog.dataset.quality==='fallback';
    canvas.tabIndex=complete||memory?-1:0;
    frame.setAttribute('aria-hidden',String(!complete&&!memory));
    $('#vortexReadout').textContent=complete?'OUR FIRST MEMORY / KEPT FOREVER':explore?`${renderer?renderer.count.toLocaleString():''} POINTS OF LIGHT / DRAG TO TURN`:'RECONSTRUCTING A LITTLE PIECE OF OUR STORY';
    if(complete){
      frame.style.opacity='1';setProgress(100);pause.textContent='Pause Ⅱ';pause.setAttribute('aria-pressed','false');
      $('#vortexHint').textContent='Your original light-pixel cover is waiting exactly where you left it.';
    }
  }
  function setProgress(value){const v=Math.round(value);fill.style.transform=`scaleX(${v/100})`;progress.setAttribute('aria-valuenow',String(v));}
  function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
  function wake(){if(!raf&&renderer&&running())raf=requestAnimationFrame(tick);}
  function state(){return {time,gather:phase==='explore'||phase==='memory'?0:clamp(elapsed/4.5,0,1),reveal:clamp((elapsed-6)/7.5,0,1),yaw,pitch,warp,pointer};}
  function tick(now){
    raf=0;if(!running())return;
    const frameDuration=last?now-last:0,dt=Math.min(frameDuration/1000,.08);last=now;
    slowFrames=frameDuration>80?slowFrames+1:Math.max(0,slowFrames-1);
    if(slowFrames>=8){
      slowFrames=0;
      try{if(renderer.reduceDetail())dialog.dataset.detail='balanced';}
      catch(_){fallback('A gentler little memory for this device. Your story is still here.');return;}
    }
    warp+=((warpWanted&&phase==='explore'?1:0)-warp)*(1-Math.exp(-dt*2.2));
    pointer.strength+=(pointerWanted-pointer.strength)*(1-Math.exp(-dt*5));
    time+=dt*(1+warp*3.2);
    if(!drag&&phase==='explore'){
      yaw=clamp(yaw+velocity.x*dt,-1.05,1.05);pitch=clamp(pitch+velocity.y*dt,-.6,.6);
      velocity.x*=Math.exp(-dt*3.5);velocity.y*=Math.exp(-dt*3.5);
    }
    if(phase!=='explore'){
      elapsed+=dt;
      if(elapsed>=14.4)setPhase('complete');
      else if(elapsed>=6)setPhase('forming');
      else if(elapsed>=4.5)setPhase('monogram');
      setProgress(clamp(elapsed/14.4*100,0,100));
      frame.style.opacity=String(clamp((elapsed-13.25)/.9,0,1));
    }
    renderer.draw(state());dialog.dataset.time=time.toFixed(2);dialog.dataset.yaw=yaw.toFixed(2);dialog.dataset.warp=warp.toFixed(2);
    wake();
  }
  function fitStatic(){
    const r=canvas.getBoundingClientRect(),a=photo.naturalWidth&&photo.naturalHeight?photo.naturalWidth/photo.naturalHeight:1280/958;
    const w=Math.min(r.width*.78,r.height*.68*a);
    frame.style.width=`${w}px`;frame.style.height=`${w/a}px`;
  }
  function fallback(reason){
    stop();setWarp(false);restorePhoto();dialog.dataset.quality='fallback';fitStatic();setPhase('complete');
    $('#vortexStatus').textContent=reason;
    $('#vortexReadout').textContent='A GENTLER LITTLE MEMORY';
    $('#vortexHint').textContent='Your photos, music and full birthday story are all still here.';
  }
  function reset(){
    stop();time=0;elapsed=0;yaw=-.55;pitch=.18;paused=false;drag=null;warp=0;setWarp(false);
    velocity={x:0,y:0};pointer={x:0,y:0,strength:0};pointerWanted=0;restorePhoto();
    frame.style.opacity='0';setProgress(0);pause.textContent='Pause Ⅱ';pause.setAttribute('aria-pressed','false');
    $('#vortexHint').textContent='Drag to orbit · Tap a photo · Bend time to fly closer.';
    setPhase('explore');renderer.resize();renderer.draw(state());wake();
  }
  async function open(){
    if(dialog.open||document.body.classList.contains('birthday-locked'))return;
    const version=++openVersion;
    opener=document.activeElement;
    oldMusicLock=musicSceneLocked;musicSceneLocked=true;window.navitVortexActive=true;
    dialog.dataset.quality='webgl';phase='closed';paused=false;time=0;elapsed=0;frame.style.opacity='0';restorePhoto();
    setPhase('loading');setProgress(0);
    $('#vortexChapter').textContent='A LITTLE UNIVERSE, JUST FOR YOU';$('#vortexTitle').innerHTML='Gathering <em>the starlight…</em>';
    $('#vortexDescription').textContent='Your memories are on their way.';$('#vortexStatus').textContent='One tiny moment. You can go back at any time.';
    dialog.showModal();$('#vortexTitle').focus({preventScroll:true});renderSound();
    if(window.navitMotionPaused){fallback('A quiet little memory, with motion turned off.');return;}
    try{
      if(contextLost)throw new Error('Graphics paused.');
      if(!renderer){
        if(!loading)loading=window.createNavitVortexRenderer(canvas,frame).then(value=>{renderer=value;return value;}).finally(()=>{loading=null;});
        await loading;
      }
      if(!dialog.open||version!==openVersion)return;
      dialog.dataset.particles=String(renderer.count);reset();
    }catch(error){
      if(dialog.open&&version===openVersion)fallback('The universe is taking a quiet form on this device. This memory is still yours.');
      console.info('Memory vortex: using the still-photo version.',error.message);
    }
  }
  function close(){
    if(!dialog.open)return;
    ++openVersion;stop();phase='closed';dialog.dataset.phase='closed';
    setWarp(false);window.navitVortexActive=false;musicSceneLocked=oldMusicLock;
    dialog.close();opener?.focus({preventScroll:true});
    window.dispatchEvent(new Event('navit:vortexclose'));updateScroll();
    if(!manualTrack&&!musicSceneLocked)switchTrack(sceneTrack);
  }
  function restorePhoto(){photo.src='assets/photos/memory-00.jpeg';photo.alt='Navit as a newborn in his chacha’s arms';}
  function setWarp(enabled){
    warpWanted=enabled;warpButton.setAttribute('aria-pressed',String(enabled));warpButton.textContent=enabled?'◎ Return to slow time':'◎ Bend time';
    dialog.dataset.flight=String(enabled);
    if(phase==='explore')$('#vortexStatus').textContent=enabled?'A little closer to the moments that made us.':'Drag the light. Turn the memories. Take your time.';
  }
  function catchMemory(id){
    if(phase!=='explore')return;
    const memory=window.NAVIT_MEMORIES.find(m=>m.id===id);if(!memory)return;
    stop();setPhase('memory');photo.src=memory.src;photo.alt=memory.alt;frame.style.opacity='1';fitStatic();
    $('#vortexChapter').textContent='A LITTLE MOMENT, HELD STILL';$('#vortexTitle').textContent=memory.title;
    $('#vortexDescription').textContent='You caught this one. Take all the time you need.';
    $('#vortexStatus').textContent=memory.caption;$('#vortexReadout').textContent=`MEMORY ${String(id+1).padStart(2,'0')} / HELD CLOSE`;
    $('#vortexHint').textContent='Release this memory to return to the universe · Escape works too.';
    catchButton.focus({preventScroll:true});
  }
  function releaseMemory(){
    if(phase!=='memory')return;
    frame.style.opacity='0';restorePhoto();setPhase('explore');renderer.resize();renderer.draw(state());
    $('#vortexHint').textContent='Drag to orbit · Tap a photo · Bend time to fly closer.';wake();
  }
  photo.addEventListener('load',()=>{if(dialog.open&&(phase==='memory'||dialog.dataset.quality==='fallback'))fitStatic();});
  warpButton.addEventListener('click',()=>{if(phase==='explore'){setWarp(!warpWanted);wake();}});
  catchButton.addEventListener('click',()=>{
    if(phase==='memory'){releaseMemory();return;}
    const ids=renderer?.memoryIds||[];
    if(ids.length)catchMemory(ids[catchIndex++%ids.length]);
  });
  $('#openMemoryVortex').addEventListener('click',()=>open());
  $('#skipVortex').addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();if(phase==='memory')releaseMemory();else close();});
  gather.addEventListener('click',()=>{
    if(phase==='complete'){close();return;}
    if(phase==='memory')releaseMemory();
    if(phase!=='explore')return;
    elapsed=0;setWarp(false);pointerWanted=0;setPhase('gathering');wake();
  });
  replay.addEventListener('click',()=>{if(renderer&&!window.navitMotionPaused){reset();gather.focus({preventScroll:true});}});
  pause.addEventListener('click',()=>{
    paused=!paused;pause.textContent=paused?'Resume ▷':'Pause Ⅱ';pause.setAttribute('aria-pressed',String(paused));
    if(paused)stop();else wake();
  });
  $('#vortexSound').addEventListener('click',toggleSound);
  canvas.addEventListener('pointerdown',event=>{
    if(phase!=='explore'||!event.isPrimary)return;
    drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,id:event.pointerId};
    velocity={x:0,y:0};canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(phase==='explore'){
      const r=canvas.getBoundingClientRect();pointer.x=(event.clientX-r.left)/r.width*2-1;pointer.y=1-(event.clientY-r.top)/r.height*2;pointerWanted=1;
    }
    if(!drag||event.pointerId!==drag.id||phase!=='explore')return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>8)drag.moved=true;
    velocity={x:clamp(dx*.09,-1.8,1.8),y:clamp(dy*.09,-1,1)};
    yaw=clamp(yaw+dx*.004,-1.05,1.05);pitch=clamp(pitch+dy*.004,-.6,.6);
    drag.x=event.clientX;drag.y=event.clientY;dialog.dataset.yaw=yaw.toFixed(2);
    if(paused)renderer?.draw(state());
  });
  canvas.addEventListener('pointerup',event=>{
    const tapped=drag&&!drag.moved;drag=null;pointerWanted=0;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(tapped){const r=canvas.getBoundingClientRect(),id=renderer?.pick(event.clientX-r.left,event.clientY-r.top);if(id!==undefined)catchMemory(id);}
  });
  for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;pointerWanted=0;});
  canvas.addEventListener('pointerleave',()=>{if(!drag)pointerWanted=0;});
  canvas.addEventListener('keydown',event=>{
    if(phase!=='explore'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();yaw=clamp(yaw+(event.key==='ArrowLeft'?-.1:event.key==='ArrowRight'?.1:0),-1.05,1.05);
    pitch=clamp(pitch+(event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0),-.6,.6);
    dialog.dataset.yaw=yaw.toFixed(2);if(paused)renderer?.draw(state());
  });
  const resize=()=>{
    if(!dialog.open)return;
    if(dialog.dataset.quality==='fallback'||phase==='memory')fitStatic();
    else if(renderer)try{renderer.resize();renderer.draw(state());}catch(_){fallback('The animation is resting. Your birthday story is still here.');}
  };
  new ResizeObserver(resize).observe($('#vortexStage'));
  window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else wake();});
  window.addEventListener('navit:motion',()=>{
    if(dialog.open&&window.navitMotionPaused)fallback('A quiet little memory, with motion turned off.');
  });
  // The original light-source cover owns unlocking. This is an optional extra only.
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();contextLost=true;stop();
    if(dialog.open)fallback('The animation is resting. Our first memory is right here.');
  });
  canvas.addEventListener('webglcontextrestored',()=>{renderer?.destroy();renderer=null;contextLost=false;});
})();
