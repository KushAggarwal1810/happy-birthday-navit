'use strict';

(() => {
  const template=document.querySelector('#teddySquadTemplate');
  document.querySelectorAll('[data-teddy-duo]').forEach(slot=>slot.append(template.content.cloneNode(true)));
  const button=document.querySelector('#squadCheer');
  const message=document.querySelector('#squadMessage');
  const cheers=[
    'Superpower no. 1: making your bhai ridiculously proud. ♡',
    'Cape nahi chahiye. Woh wali badi si smile kaafi hai, birthday boy!',
    'Growing up? Allowed. Outgrowing your bhai? Bilkul nahi. ♡',
    'Every hero needs a team. Teri team mein main hamesha hoon.'
  ];
  let cheer=0,timer;
  button.addEventListener('click',()=>{
    message.hidden=false;
    message.textContent=cheers[cheer++ % cheers.length];
    clearTimeout(timer);
    button.classList.remove('cheering');
    if(!window.navitMotionPaused){
      void button.offsetWidth;
      button.classList.add('cheering');
      const r=button.getBoundingClientRect();
      window.navitBurst?.(r.left+r.width*.35,r.top+r.height*.4,28);
      timer=setTimeout(()=>button.classList.remove('cheering'),1600);
    }
  });
})();
