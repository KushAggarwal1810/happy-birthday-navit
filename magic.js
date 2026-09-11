'use strict';

(() => {
  const cover = document.querySelector('#coverPhoto');
  const portrait = document.querySelector('#crystalPortrait');
  const canvas = document.querySelector('#crystalCanvas');
  const ctx = canvas.getContext('2d');
  const finale = document.querySelector('#finale');
  const sky = document.querySelector('#finaleCanvas');
  const skyCtx = sky.getContext('2d');
  const confettiCanvas = document.querySelector('#celebrationCanvas');
  const confettiCtx = confettiCanvas.getContext('2d');
  if (!ctx || !skyCtx || !confettiCtx) return;
  let w=0,h=0,fw=0,fh=0,vw=innerWidth,vh=innerHeight;
  let tiles=[], particles=[], lights=[], coverVisible=false, finaleVisible=false;
  let assemblyTime=0, assembled=false, portraitLoaded=false, frame=0,last=0,clock=0,energy=0;
  let pointer={x:-999,y:-999},pointerActive=false,portraitDirty=true;
  const birthdayLocked=()=>document.body.classList.contains('birthday-locked')||window.navitVortexActive;
  const revealDelay=450,emissionDuration=12500;
  const palette=['#ecc28a','#d7e3c0','#a9d3c5','#92b4c7','#fff2c9'];
  const stars=Array.from({length:95},(_,i)=>({x:Math.random(),y:Math.random(),r:.5+Math.random()*1.2,phase:Math.random()*6.28,i}));
  function surface(target,context,width,height){
    const dpr=Math.min(devicePixelRatio||1,2);
    target.width=Math.round(width*dpr);target.height=Math.round(height*dpr);
    context.setTransform(dpr,0,0,dpr,0,0);
  }
  const settledCanvas=document.createElement('canvas');
  const settledCtx=settledCanvas.getContext('2d');
  let settledCount=0,trail=[];
  const lightReading=document.querySelector('#lightReading');
  function makeTiles(){
    const columns=innerWidth<761?60:96;
    const rows=Math.round(columns*h/w);
    const tw=w/columns,th=h/rows,sw=cover.naturalWidth/columns,sh=cover.naturalHeight/rows;
    settledCanvas.width=Math.ceil(w);settledCanvas.height=Math.ceil(h);
    const sampler=document.createElement('canvas');sampler.width=columns;sampler.height=rows;
    const sampleCtx=sampler.getContext('2d');let pixels;
    try{sampleCtx.drawImage(cover,0,0,columns,rows);pixels=sampleCtx.getImageData(0,0,columns,rows).data;}catch(_){}
    tiles=[];settledCount=0;
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      const tx=(x+.5)*tw,ty=(y+.5)*th,at=(y*columns+x)*4;
      const color=pixels?'rgb('+pixels[at]+','+pixels[at+1]+','+pixels[at+2]+')':'#f5d29a';
      tiles.push({sx:x*sw,sy:y*sh,sw,sh,tw,th,tx,ty,color,order:y+Math.random()*5,cx:w*.5+(Math.random()-.5)*w*.55,travel:1400+Math.hypot(tx-w*.5,ty-h)/Math.max(w,h)*800,done:false});
    }
    tiles.sort((a,b)=>a.order-b.order);
    tiles.forEach((tile,i)=>{tile.launch=revealDelay+i/tiles.length*emissionDuration;});
    portraitDirty=true;
    if(assembled)settledCtx.drawImage(cover,0,0,w,h);
  }
  function resize(){
    const nextW=portrait.clientWidth,nextH=portrait.clientHeight;
    if(nextW&&nextH&&(w!==nextW||h!==nextH)){
      w=nextW;h=nextH;surface(canvas,ctx,w,h);
      if(portraitLoaded)makeTiles();
    }
    fw=finale.clientWidth;fh=finale.clientHeight;
    surface(sky,skyCtx,fw,fh);
    vw=innerWidth;vh=innerHeight;surface(confettiCanvas,confettiCtx,vw,vh);
    portraitDirty=true;
    if(window.navitMotionPaused)drawStill();else wake();
  }
  function photonPosition(tile,t){
    const q=1-t;
    return {x:q*q*w*.5+2*q*t*tile.cx+t*t*tile.tx,y:q*q*(h-5)+2*q*t*h*.4+t*t*tile.ty};
  }
  function drawPortrait(dt,elapsed){
    if(!portraitLoaded||!w||!h)return;
    ctx.clearRect(0,0,w,h);
    if(window.navitMotionPaused){ctx.drawImage(cover,0,0,w,h);assembled=true;portrait.dataset.state='assembled';portraitDirty=false;return;}
    if(assembled){
      ctx.drawImage(cover,0,0,w,h);
      for(const spark of trail){
        spark.life-=dt*.0012;
        const r=2+spark.life*3;
        ctx.strokeStyle='rgba(255,229,167,'+Math.max(0,spark.life*.8)+')';ctx.lineWidth=.8;
        ctx.beginPath();ctx.moveTo(spark.x-r,spark.y);ctx.lineTo(spark.x+r,spark.y);ctx.moveTo(spark.x,spark.y-r);ctx.lineTo(spark.x,spark.y+r);ctx.stroke();
      }
      trail=trail.filter(s=>s.life>0);
      portraitDirty=trail.length>0;
      return;
    }
    assemblyTime+=elapsed;
    const flying=[];
    for(const tile of tiles){
      if(tile.done||assemblyTime<tile.launch)continue;
      const p=(assemblyTime-tile.launch)/tile.travel;
      if(p>=1){
        settledCtx.drawImage(cover,tile.sx,tile.sy,tile.sw,tile.sh,tile.tx-tile.tw/2,tile.ty-tile.th/2,tile.tw+.25,tile.th+.25);
        tile.done=true;settledCount++;
      }else flying.push({tile,p});
    }
    ctx.fillStyle='#0e1d24';ctx.fillRect(0,0,w,h);
    ctx.drawImage(settledCanvas,0,0,w,h);
    // A single point-source projects a soft cone; every travelling pixel starts here.
    const scanY=Math.min(h,Math.max(0,(assemblyTime-revealDelay-1400)/emissionDuration*h));
    const beam=ctx.createLinearGradient(w*.5,h,w*.5,Math.min(scanY,h-1));
    beam.addColorStop(0,'rgba(242,210,148,.11)');beam.addColorStop(1,'rgba(184,217,217,0)');
    ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(w*.5,h-5);ctx.lineTo(0,scanY);ctx.lineTo(w,scanY);ctx.closePath();ctx.fill();
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<flying.length;i++){
      const {tile,p}=flying[i],pos=photonPosition(tile,p),tail=photonPosition(tile,Math.max(0,p-.055));
      ctx.strokeStyle='rgba(224,216,176,'+(.08+Math.sin(p*Math.PI)*.14)+')';ctx.lineWidth=.65;
      ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(pos.x,pos.y);ctx.stroke();
      ctx.fillStyle=p>.8?tile.color:'#f3d8a0';
      const size=p>.83?Math.max(1.5,tile.tw*.7):1.4;
      ctx.globalAlpha=.48+Math.sin(p*Math.PI)*.5;ctx.fillRect(pos.x-size/2,pos.y-size/2,size,size);
      ctx.globalAlpha=1;
      if(i%55===0){ctx.strokeStyle='rgba(205,224,218,.045)';ctx.beginPath();ctx.moveTo(w*.5,h-5);ctx.quadraticCurveTo(tile.cx,h*.4,pos.x,pos.y);ctx.stroke();}
    }
    const glow=ctx.createRadialGradient(w*.5,h-5,1,w*.5,h-5,34);
    glow.addColorStop(0,'rgba(255,249,223,.95)');glow.addColorStop(.16,'rgba(248,214,151,.7)');glow.addColorStop(1,'rgba(240,193,114,0)');
    ctx.fillStyle=glow;ctx.fillRect(w*.5-35,h-40,70,50);ctx.fillStyle='#fff8e5';ctx.beginPath();ctx.arc(w*.5,h-5,3,0,6.28);ctx.fill();ctx.restore();
    const progress=Math.round(settledCount/tiles.length*100);
    if(lightReading)lightReading.textContent='LIGHT → MEMORY · '+String(progress).padStart(2,'0')+'%';
    portrait.dataset.pixels=String(settledCount);
    if(settledCount===tiles.length){
      assembled=true;portrait.dataset.state='assembled';portraitDirty=false;
      ctx.drawImage(cover,0,0,w,h);
      if(lightReading)lightReading.textContent=tiles.length.toLocaleString()+' PIXELS. ONE FOREVER MEMORY.';
    }else portraitDirty=true;
  }
  function initPortrait(){
    if(!cover.naturalWidth||portraitLoaded)return;
    portraitLoaded=true;resize();makeTiles();portrait.classList.add('canvas-ready');
    portrait.dataset.state=assembled?'assembled':'assembling';
    drawPortrait(0,0);
    if(window.navitMotionPaused)drawStill();else wake();
  }
  cover.addEventListener('load',initPortrait);
  cover.addEventListener('error',()=>portrait.classList.remove('canvas-ready'));
  if(cover.complete&&cover.naturalWidth)initPortrait();
  window.addEventListener('navit:vortexclose',()=>{last=0;wake();});
  window.addEventListener('navit:unlock',()=>{
    assemblyTime=0;assembled=false;portraitDirty=true;trail=[];last=0;
    portrait.dataset.state='assembling';portrait.dataset.pixels='0';
    if(portraitLoaded){resize();makeTiles();drawPortrait(0,0);}
    if(window.navitMotionPaused)drawStill();else wake();
  });
  document.querySelector('#replayCrystals').addEventListener('click',()=>{
    if(window.navitMotionPaused){toast('Animations are paused. Your memory is already here, in full.');return;}
    assemblyTime=0;assembled=false;portraitDirty=true;trail=[];last=0;portrait.dataset.state='assembling';portrait.dataset.pixels='0';
    if(portraitLoaded){makeTiles();drawPortrait(0,0);}
    wake();
  });
  canvas.addEventListener('pointermove',e=>{
    if(window.navitMotionPaused)return;
    const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)*w/r.width,y:(e.clientY-r.top)*h/r.height};pointerActive=true;trail.push({x:pointer.x,y:pointer.y,life:1});trail=trail.slice(-22);portraitDirty=true;wake();
  },{passive:true});
  function releasePointer(){pointer={x:-999,y:-999};pointerActive=false;portraitDirty=true;wake();}
  canvas.addEventListener('pointerleave',releasePointer);
  canvas.addEventListener('pointerup',releasePointer);
  canvas.addEventListener('pointercancel',releasePointer);
  function drawSky(dt){
    skyCtx.clearRect(0,0,fw,fh);
    energy*=.985;
    const radius=Math.min(fw*.39,350),cx=fw*.5,cy=fh*.47;
    skyCtx.save();skyCtx.strokeStyle='#c4b58820';skyCtx.lineWidth=.7;
    for(let ring=0;ring<3;ring++){
      skyCtx.beginPath();skyCtx.ellipse(cx,cy,radius+ring*42,(radius+ring*42)*.65,ring*.52+clock*.000015,0,Math.PI*2);skyCtx.stroke();
    }
    for(const star of stars){
      const x=star.x*fw,y=star.y*fh;
      const a=.17+(Math.sin(clock*.0006+star.phase)+1)*.16;
      skyCtx.fillStyle=`rgba(226,208,160,${a})`;skyCtx.beginPath();skyCtx.arc(x,y,star.r,0,6.28);skyCtx.fill();
      if(star.i%13===0){skyCtx.beginPath();skyCtx.moveTo(x-5,y);skyCtx.lineTo(x+5,y);skyCtx.moveTo(x,y-5);skyCtx.lineTo(x,y+5);skyCtx.stroke();}
    }
    for(const light of lights){
      light.life-=dt*.0003;light.x+=light.vx*dt/16.67;light.y+=light.vy*dt/16.67;light.vx*=.985;light.vy*=.985;
      skyCtx.globalAlpha=Math.max(0,light.life);skyCtx.fillStyle=light.color;skyCtx.beginPath();skyCtx.arc(light.x,light.y,light.size,0,6.28);skyCtx.fill();
    }
    lights=lights.filter(p=>p.life>0);skyCtx.restore();
  }
  function drawConfetti(dt){
    confettiCtx.clearRect(0,0,vw,vh);
    for(const p of particles){
      p.life-=dt*.00025;p.x+=p.vx*dt/16.67;p.y+=p.vy*dt/16.67;p.vy+=.026*dt/16.67;p.rotation+=.014*dt/16.67;p.vx*=.995;
      confettiCtx.save();confettiCtx.translate(p.x,p.y);confettiCtx.rotate(p.rotation);confettiCtx.globalAlpha=Math.max(0,Math.min(1,p.life));confettiCtx.fillStyle=p.color;
      if(p.star){confettiCtx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?p.size*.3:p.size;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?confettiCtx.lineTo(x,y):confettiCtx.moveTo(x,y);}confettiCtx.closePath();confettiCtx.fill();}
      else confettiCtx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
      confettiCtx.restore();
    }
    particles=particles.filter(p=>p.life>0&&p.y<vh+50);
  }
  window.navitBurst=(x,y,amount=70)=>{
    if(window.navitMotionPaused)return;
    for(let i=0;i<amount;i++){
      const angle=Math.random()*Math.PI*2,speed=1+Math.random()*4;
      particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1.5,life:1,size:2+Math.random()*5,rotation:angle,color:palette[i%palette.length],star:i%3===0});
    }
    particles=particles.slice(-260);wake();
  };
  window.navitFinale=()=>{
    if(window.navitMotionPaused)return;
    energy=Math.min(energy+1,3);
    for(let b=0;b<3;b++){
      const x=fw*(.2+b*.3),y=fh*(.18+Math.random()*.38);
      for(let i=0;i<55;i++){const angle=i/55*Math.PI*2,speed=1+Math.random()*2.8;lights.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:1,size:1+Math.random()*2,color:palette[(i+b)%palette.length]});}
    }
    lights=lights.slice(-330);wake();
  };
  function drawStill(){
    if(portraitLoaded&&w){ctx.clearRect(0,0,w,h);ctx.drawImage(cover,0,0,w,h);portrait.dataset.state='assembled';assembled=true;}
    trail=[];if(lightReading)lightReading.textContent='ONE LIGHT. ONE FOREVER MEMORY.';
    particles=[];lights=[];confettiCtx.clearRect(0,0,vw,vh);drawSky(0);
  }
  function tick(now){
    frame=0;
    if(document.hidden||window.navitMotionPaused||birthdayLocked()){last=0;return;}
    // A fresh frame starts at zero, never at the page's age. Clamp long stalls too:
    // time spent at the password, in another tab or offscreen must not skip pixels.
    const elapsed=last?Math.min(now-last,80):0;
    const dt=Math.min(elapsed,45);
    if(last&&now-last<30){frame=requestAnimationFrame(tick);return;}
    last=now;clock+=dt;
    if(coverVisible&&portraitDirty)drawPortrait(dt,elapsed);
    if(finaleVisible)drawSky(dt);
    if(particles.length)drawConfetti(dt);else confettiCtx.clearRect(0,0,vw,vh);
    if((coverVisible&&portraitDirty)||finaleVisible||particles.length)frame=requestAnimationFrame(tick);
    else last=0;
  }
  function wake(){if(!frame&&!document.hidden&&!window.navitMotionPaused&&!birthdayLocked())frame=requestAnimationFrame(tick);}
  if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
      for(const e of entries){
        if(e.target===portrait){
          // On phones, wait until most of the photo is actually on screen.
          coverVisible=e.isIntersecting&&e.intersectionRatio>=.65;
          if(!coverVisible)last=0;
        }else finaleVisible=e.isIntersecting;
      }
      wake();
    },{threshold:[0,.65]});observer.observe(portrait);observer.observe(finale);
  }else{coverVisible=true;finaleVisible=true;}
  window.addEventListener('resize',resize);
  new ResizeObserver(()=>{const nh=finale.clientHeight;if(nh!==fh)resize();}).observe(finale);
  window.addEventListener('navit:motion',()=>{
    if(window.navitMotionPaused){cancelAnimationFrame(frame);frame=0;last=0;drawStill();}
    else{last=0;portraitDirty=true;wake();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else wake();});
  resize();
})();
