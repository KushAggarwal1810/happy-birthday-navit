'use strict';

(() => {
  const dialog=$('#filmDialog');
  const shots=[
    {id:0,chapter:'01 / BEFORE YOU COULD REMEMBER',title:'Once upon a very little you.',line:'You probably don’t remember this day. My heart never forgot it.'},
    {id:14,chapter:'02 / THE FIRST LITTLE SUNSHINE',title:'And then, the world had your laugh.',line:'No grand occasion. Just you, making an ordinary day worth keeping.'},
    {id:10,chapter:'03 / BLESSINGS, IN A LITTLE YELLOW OUTFIT',title:'Our very own little Kanha.',line:'So much love, tucked into the smallest chapters.'},
    {id:5,chapter:'04 / SMALL SHOES, BIG WORLD',title:'A panda hat. An entire personality.',line:'The adventures got bigger. You made every one of them your own.'},
    {id:17,chapter:'05 / IF HAPPINESS HAD A PHOTOGRAPH',title:'This laugh. Please keep this laugh.',line:'Somewhere in every grown-up you become, save a little room for him.'},
    {id:24,chapter:'06 / THE WORLD AT YOUR LITTLE FEET',title:'Go on. There’s a world waiting.',line:'For muddy shoes, curious questions, and all your wonderful little ideas.'},
    {id:8,chapter:'07 / LITTLE FAN, BIG FEELINGS',title:'You kept finding reasons to smile.',line:'May life keep giving you more of them. More than you can count.'},
    {id:31,chapter:'08 / OUR FRIENDLY NEIGHBOURHOOD LEGEND',title:'You never needed a cape.',line:'You were already someone’s whole world.'},
    {id:1,chapter:'09 / THE PART THAT NEVER CHANGES',title:'You grew up a little. We stayed us.',line:'Chacha on paper. Bhai by heart. In every single chapter.'}
  ];
  const frameDuration=6500;
  let index=0,playing=false,elapsed=0,raf=0,lastTime=0,priorTrack='memories',priorManual=false;
  function renderPlay(){
    $('#filmPlay').textContent=playing?'Pause film Ⅱ':index===shots.length-1&&elapsed>=frameDuration?'Replay film ↺':'Play film ▷';
    $('#filmPlay').setAttribute('aria-pressed',String(playing));
    dialog.classList.toggle('film-playing',playing&&!window.navitMotionPaused);
  }
  function choose(next){
    index=Math.max(0,Math.min(shots.length-1,next));elapsed=0;
    const shot=shots[index],memory=memories.find(m=>m.id===shot.id);
    $('#filmPhoto').src=memory.src;$('#filmPhoto').alt=memory.alt;
    $('#filmBackground').style.backgroundImage=`url("${memory.src}")`;
    $('#filmTitle').textContent=shot.title;$('#filmLine').textContent=shot.line;
    $('#filmChapter').textContent=shot.chapter;
    const counter=String(index+1).padStart(2,'0')+' / '+String(shots.length).padStart(2,'0');
    $('#filmCounter').textContent=counter;$('#filmTime').textContent=counter;
    $('#filmScrubber').value=String(index);$('#filmScrubber').setAttribute('aria-valuetext',`Memory ${index+1}: ${shot.title}`);
    $('#filmScrubber').style.setProperty('--range',`${index/(shots.length-1)*100}%`);
    $('#filmPrevious').disabled=index===0;$('#filmNext').disabled=index===shots.length-1;
    $('#filmProgress').style.transform='scaleX(0)';
    $('#filmStage').classList.remove('new-shot');void $('#filmStage').offsetWidth;$('#filmStage').classList.add('new-shot');
    $('#filmHint').textContent='Pause any time. Drag the timeline to keep a favourite moment.';
    // Fetch only the next frame ahead, while keeping all the original photos unchanged.
    const nextShot=shots[index+1];if(nextShot){const preload=new Image();preload.src=memories.find(m=>m.id===nextShot.id).src;}
    renderPlay();
  }
  function stop(){playing=false;cancelAnimationFrame(raf);raf=0;lastTime=0;renderPlay();}
  function tick(now){
    raf=0;if(!playing||!dialog.open||document.hidden)return;
    // A slow connection must not make an unseen memory disappear.
    if($('#filmPhoto').complete&&$('#filmPhoto').naturalWidth>0)elapsed+=Math.min(now-lastTime||0,120);
    lastTime=now;
    $('#filmProgress').style.transform=`scaleX(${Math.min(1,elapsed/frameDuration)})`;
    if(elapsed>=frameDuration){
      if(index===shots.length-1){stop();$('#filmHint').textContent='End of this little film. Never the end of our story. ♡';return;}
      choose(index+1);
    }
    raf=requestAnimationFrame(tick);
  }
  function play(){
    if(index===shots.length-1&&elapsed>=frameDuration)choose(0);
    playing=true;lastTime=0;renderPlay();if(!raf)raf=requestAnimationFrame(tick);
  }
  $('#openMemoryFilm').addEventListener('click',()=>{
    const backgroundChapter=[...chapters].reverse().find(el=>el.getBoundingClientRect().top<=innerHeight*.38);
    priorTrack=manualTrack?activeTrack:(backgroundChapter?.dataset.track||activeTrack);priorManual=manualTrack;
    clearTimeout(trackChangeTimer);musicSceneLocked=true;
    switchTrack('memories');
    dialog.showModal();choose(0);
    if(!window.navitMotionPaused)play();else stop();
    $('#closeFilm').focus({preventScroll:true});
  });
  $('#closeFilm').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    stop();musicSceneLocked=false;manualTrack=priorManual;switchTrack(priorTrack);
    $('#openMemoryFilm').focus({preventScroll:true});
  });
  dialog.addEventListener('click',e=>{
    if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();
  });
  $('#filmPlay').addEventListener('click',()=>playing?stop():play());
  $('#filmPrevious').addEventListener('click',()=>{stop();choose(index-1);});
  $('#filmNext').addEventListener('click',()=>{stop();choose(index+1);});
  $('#filmScrubber').addEventListener('input',e=>{stop();choose(Number(e.target.value));});
  $('#filmSound').addEventListener('click',toggleSound);
  dialog.addEventListener('keydown',e=>{
    if(e.target.matches('input,button'))return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stop();choose(index+(e.key==='ArrowRight'?1:-1));}
  });
  window.addEventListener('navit:motion',()=>{if(window.navitMotionPaused&&dialog.open)stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
