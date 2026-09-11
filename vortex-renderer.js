'use strict';

// Dependency-free WebGL: photo-coloured particles, perspective ribbons and memories.
(() => {
  const TAU = Math.PI * 2;
  const FRUSTUM = 16 * Math.tan(Math.PI / 8);
  const loadImage = src => new Promise((resolve, reject) => {
    const img = new Image();
    const timer=setTimeout(()=>reject(new Error('A memory took too long to load.')),15000);
    img.onload = () => {clearTimeout(timer);resolve(img);};
    img.onerror = () => {clearTimeout(timer);reject(new Error('A memory could not load.'));};
    img.src = src;
  });
  const spatial = `
    uniform float uAspect, uFit, uTime, uGather, uYaw, uPitch, uWarp;
    uniform vec3 uPointer;
    vec3 turn(vec3 p) {
      p.z += 3.0;
      p.xz = mat2(cos(uYaw), -sin(uYaw), sin(uYaw), cos(uYaw)) * p.xz;
      p.yz = mat2(cos(uPitch), -sin(uPitch), sin(uPitch), cos(uPitch)) * p.yz;
      p.z -= 3.0;
      p.xy *= uFit;
      return p;
    }
    vec3 funnel(float t, float angle) {
      float r = 0.15 + pow(1.0-t, 1.1) * 2.85;
      r += sin(t*22.0-uTime*1.3)*(0.035+uWarp*0.07);
      float a = angle + t * 13.1947 + uTime * 0.19;
      return turn(vec3(cos(a)*r, sin(a)*r, 0.6-t*9.5));
    }
    vec4 project(vec3 p) {
      float d = 8.0-p.z-uWarp*1.7;
      float lens = 2.41421356/(1.0+uWarp*0.22);
      return vec4(p.x*lens/uAspect, p.y*lens, d*1.004-0.2004, d);
    }
  `;
  const pointVertex = `
    precision highp float;
    attribute vec4 aSeed;
    attribute vec3 aN, aColor;
    attribute vec2 aUV;
    uniform float uReveal, uDpr, uTile, uMaxPoint;
    uniform vec2 uPhoto;
    varying vec3 vColor;
    varying float vAlpha, vSquare;
    ${spatial}
    void main() {
      float t = fract(aSeed.y + uTime*0.028);
      vec3 p = funnel(t, aSeed.x*6.283185);
      vec2 hand=vec2(uPointer.x*uAspect,uPointer.y)*3.3;
      vec2 delta=hand-p.xy;
      float gravity=exp(-dot(delta,delta)*0.6)*uPointer.z*(1.0-uGather);
      p.xy += (delta*0.22+vec2(-delta.y,delta.x)*0.42)*gravity;
      float g = smoothstep(aSeed.w*0.18, 1.0, uGather);
      vec3 letter = aN;
      letter.xy *= uFit;
      letter.z += sin(uTime*0.7+aSeed.x*6.28)*0.05;
      p = mix(p, letter, g);
      float r = smoothstep(aSeed.y*0.25, 1.0, uReveal);
      vec3 photo = vec3((aUV.x-0.5)*uPhoto.x, (0.5-aUV.y)*uPhoto.y, 0.0);
      p = mix(p, photo, r);
      p.xy += vec2(sin(aSeed.x*6.28+r*3.14), cos(aSeed.x*6.28+r*3.14))*sin(r*3.14159)*0.65*uFit;
      p.z += sin(r*3.14159)*(aSeed.z-0.5)*2.5;
      gl_Position = project(p);
      float dotSize = (1.7+aSeed.z*3.0+gravity*2.0)*uDpr*8.0/(8.0-p.z);
      gl_PointSize = clamp(mix(dotSize, uTile, r), 1.0, uMaxPoint);
      vec3 gold = mix(vec3(0.37,0.71,0.76),vec3(1.0,0.74,0.37),aSeed.z);
      vColor = mix(gold+gravity*vec3(0.3,0.2,0.08), aColor, smoothstep(0.12,0.92,r));
      vAlpha = mix(0.42+aSeed.z*0.4, 1.0, r);
      vSquare = smoothstep(0.72,1.0,r);
    }
  `;
  const pointFragment = `
    precision mediump float;
    varying vec3 vColor;
    varying float vAlpha, vSquare;
    void main() {
      float d=length(gl_PointCoord-0.5)*2.0;
      float glow=pow(max(0.0,1.0-d),1.6);
      float alpha=mix(glow,vAlpha,vSquare);
      if(alpha<0.008) discard;
      gl_FragColor=vec4(vColor, alpha*vAlpha);
    }
  `;
  const lineVertex = `
    precision highp float;
    attribute vec2 aLine;
    varying float vFade;
    ${spatial}
    void main(){gl_Position=project(funnel(aLine.x,aLine.y));vFade=(1.0-uGather)*(0.1+0.3*(1.0-aLine.x));}
  `;
  const lineFragment = `precision mediump float;varying float vFade;void main(){gl_FragColor=vec4(0.7,0.59,0.36,vFade);}`;
  const meshVertex = `
    precision highp float;
    attribute vec2 aMesh;
    varying vec2 vGrid;
    varying float vDepth, vPulse;
    ${spatial}
    void main(){
      vec3 p=funnel(aMesh.x,aMesh.y);
      gl_Position=project(p);
      vGrid=vec2(aMesh.x*32.0,aMesh.y*4.4563);
      vDepth=aMesh.x;
      vPulse=pow(0.5+0.5*sin(aMesh.x*19.0-uTime*1.3),8.0);
    }
  `;
  const meshFragment = `
    precision mediump float;
    uniform highp float uGather, uWarp;
    varying vec2 vGrid;
    varying float vDepth, vPulse;
    void main(){
      vec2 edge=min(fract(vGrid),1.0-fract(vGrid));
      float wire=1.0-smoothstep(0.012,0.055,min(edge.x,edge.y));
      vec3 color=mix(vec3(0.94,0.63,0.29),vec3(0.20,0.75,0.81),vDepth);
      float alpha=(0.017+wire*0.14+vPulse*(0.07+uWarp*0.08))*(1.0-uGather);
      gl_FragColor=vec4(color,alpha);
    }
  `;
  const starVertex = `
    precision highp float;
    attribute vec4 aStar;
    varying float vAlpha;
    ${spatial}
    void main(){
      float z=3.0-fract(aStar.z+uTime*0.019)*32.0;
      vec3 p=vec3((aStar.x-0.5)*19.0,(aStar.y-0.5)*12.0,z-aStar.w*(0.12+uWarp*2.4));
      gl_Position=project(p);
      vAlpha=(0.10+uWarp*0.35)*(1.0-uGather)*(1.0-aStar.w*0.8);
    }
  `;
  const starFragment=`precision mediump float;varying float vAlpha;void main(){gl_FragColor=vec4(0.59,0.83,0.91,vAlpha);}`;
  const postVertex=`attribute vec2 aCorner;varying vec2 vUV;void main(){vUV=aCorner+0.5;gl_Position=vec4(aCorner*2.0,0.0,1.0);}`;
  const postFragment=`
    precision mediump float;
    uniform sampler2D uScene;
    uniform vec2 uTexel;
    uniform float uWarp, uGather;
    varying vec2 vUV;
    void main(){
      vec2 delta=vUV-0.5;
      vec2 uv=vUV+delta*dot(delta,delta)*uWarp*0.045;
      vec4 base=texture2D(uScene,uv);
      vec2 fringe=delta*uWarp*0.006;
      base.r=texture2D(uScene,uv+fringe).r;
      base.b=texture2D(uScene,uv-fringe).b;
      vec4 haze=(texture2D(uScene,uv+vec2(uTexel.x*3.0,0.0))+texture2D(uScene,uv-vec2(uTexel.x*3.0,0.0))
        +texture2D(uScene,uv+vec2(0.0,uTexel.y*3.0))+texture2D(uScene,uv-vec2(0.0,uTexel.y*3.0)))*0.25;
      float glow=0.22*(1.0-uGather);
      gl_FragColor=vec4(base.rgb+haze.rgb*glow,max(base.a,haze.a*glow));
    }
  `;
  const cardVertex = `
    precision highp float;
    attribute vec2 aCorner;
    uniform vec3 uCentre;
    uniform vec2 uSize;
    uniform float uAngle, uTilt;
    varying vec2 vUV;
    ${spatial}
    void main(){
      vec2 xy=aCorner*uSize;
      xy=mat2(cos(uAngle),-sin(uAngle),sin(uAngle),cos(uAngle))*xy;
      gl_Position=project(uCentre+vec3(xy.x*cos(uTilt),xy.y,xy.x*sin(uTilt)));
      vUV=vec2(aCorner.x+0.5,0.5-aCorner.y);
    }
  `;
  const cardFragment = `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform float uOpacity;
    varying vec2 vUV;
    void main(){
      vec2 uv=(vUV-0.025)/0.95;
      float inside=step(0.0,uv.x)*step(0.0,uv.y)*step(uv.x,1.0)*step(uv.y,1.0);
      vec3 rgb=mix(vec3(0.91,0.87,0.77),texture2D(uTexture,uv).rgb,inside);
      gl_FragColor=vec4(rgb,uOpacity);
    }
  `;

  window.createNavitVortexRenderer = async (canvas, frame) => {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL is unavailable.');
    const programs = [], buffers = [], textures = [], framebuffers=[];
    const cleanup = () => {
      buffers.forEach(b => gl.deleteBuffer(b));
      textures.forEach(t => gl.deleteTexture(t));
      programs.forEach(p => gl.deleteProgram(p));
      framebuffers.forEach(f => gl.deleteFramebuffer(f));
    };
    function program(vs, fs) {
      const p = gl.createProgram();
      for (const [type, source] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const message = gl.getShaderInfoLog(shader);
          gl.deleteShader(shader); gl.deleteProgram(p); throw new Error(message);
        }
        gl.attachShader(p, shader); gl.deleteShader(shader);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { const message=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw new Error(message); }
      programs.push(p);
      return { id: p, uniforms: new Map() };
    }
    const uniform = (p, name) => {
      if (!p.uniforms.has(name)) p.uniforms.set(name, gl.getUniformLocation(p.id, name));
      return p.uniforms.get(name);
    };
    function buffer(values) {
      const b = gl.createBuffer(); buffers.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);
      return b;
    }
    function attribute(p, name, b, size) {
      const loc=gl.getAttribLocation(p.id,name);
      gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);
    }
    try {
      const [cover, ...pictures] = await Promise.all([
        loadImage('assets/photos/memory-00.jpeg'),
        ...[1,10,14,17,24,31,5,18].map(id => loadImage(`assets/photos/memory-${String(id).padStart(2,'0')}.jpeg`).then(img=>({img,id})).catch(()=>null))
      ]);
      if (gl.isContextLost()) throw new Error('Graphics context was interrupted.');
      const phone = matchMedia('(max-width: 760px)').matches;
      const cols = phone ? 72 : 112;
      const photoAspect = cover.naturalWidth/cover.naturalHeight;
      const rows = Math.round(cols/photoAspect);
      const sample=document.createElement('canvas'); sample.width=cols;sample.height=rows;
      const ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(cover,0,0,cols,rows);
      const pixels=ctx.getImageData(0,0,cols,rows).data;
      const mask=document.createElement('canvas');mask.width=240;mask.height=240;
      const m=mask.getContext('2d',{willReadFrequently:true});m.fillStyle='#fff';m.font='bold 225px Georgia';m.textAlign='center';m.textBaseline='middle';m.fillText('N',120,133);
      const letter=m.getImageData(0,0,240,240).data, targets=[];
      for(let y=0;y<240;y+=2)for(let x=0;x<240;x+=2)if(letter[(y*240+x)*4+3]>180)targets.push([(x-120)/55,(120-y)/55]);
      const seeds=[], positions=[], colors=[], uvs=[];
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const i=y*cols+x, target=targets[Math.floor(Math.random()*targets.length)];
        seeds.push(Math.random(),Math.random(),Math.random(),Math.random());
        positions.push(target[0],target[1],(Math.random()-.5)*.2);
        colors.push(pixels[i*4]/255,pixels[i*4+1]/255,pixels[i*4+2]/255);
        uvs.push((x+.5)/cols,(y+.5)/rows);
      }
      const points=program(pointVertex,pointFragment), lines=program(lineVertex,lineFragment), cards=program(cardVertex,cardFragment);
      const mesh=program(meshVertex,meshFragment),stars=program(starVertex,starFragment),post=program(postVertex,postFragment);
      const seedBuffer=buffer(seeds), nBuffer=buffer(positions), colorBuffer=buffer(colors), uvBuffer=buffer(uvs);
      const ribs=[];
      for(let rib=0;rib<12;rib++)for(let j=0;j<96;j++)ribs.push(j/96,rib*TAU/12,(j+1)/96,rib*TAU/12);
      const lineBuffer=buffer(ribs), quad=buffer([-.5,-.5,.5,-.5,-.5,.5,-.5,.5,.5,-.5,.5,.5]);
      const skin=[];
      const longitudinal=phone?48:72,radial=48;
      for(let i=0;i<longitudinal;i++)for(let j=0;j<radial;j++){
        const t=i/longitudinal,t1=(i+1)/longitudinal,a=j/radial*TAU,a1=(j+1)/radial*TAU;
        skin.push(t,a,t1,a,t,a1,t,a1,t1,a,t1,a1);
      }
      const meshBuffer=buffer(skin),starData=[];
      for(let i=0;i<(phone?100:220);i++){const x=Math.random(),y=Math.random(),z=Math.random();starData.push(x,y,z,0,x,y,z,1);}
      const starBuffer=buffer(starData);
      const sceneTexture=gl.createTexture();textures.push(sceneTexture);gl.bindTexture(gl.TEXTURE_2D,sceneTexture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const scene=gl.createFramebuffer();framebuffers.push(scene);
      const memories=pictures.filter(Boolean).map(({img,id},i)=>{
        const tex=gl.createTexture();textures.push(tex);gl.bindTexture(gl.TEXTURE_2D,tex);
        const s=document.createElement('canvas'), ratio=Math.min(1,384/Math.max(img.naturalWidth,img.naturalHeight));
        s.width=Math.round(img.naturalWidth*ratio);s.height=Math.round(img.naturalHeight*ratio);
        s.getContext('2d').drawImage(img,0,0,s.width,s.height);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,s);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        return {tex,aspect:img.naturalWidth/img.naturalHeight,index:i,id};
      });
      let width=1,height=1,aspect=1,dpr=1,photoH=1,photoW=1,renderScale=1;
      function resize(){
        const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);aspect=width/height;
        dpr=Math.min(window.devicePixelRatio||1,phone?1.5:2)*renderScale;
        canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
        gl.viewport(0,0,canvas.width,canvas.height);
        gl.bindTexture(gl.TEXTURE_2D,sceneTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,canvas.width,canvas.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.bindFramebuffer(gl.FRAMEBUFFER,scene);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,sceneTexture,0);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('The glow buffer is unavailable.');
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        photoH=Math.min(4.55,FRUSTUM*aspect*.78/photoAspect);photoW=photoH*photoAspect;
        frame.style.width=`${photoW/FRUSTUM*height}px`;frame.style.height=`${photoH/FRUSTUM*height}px`;
      }
      function common(p,s){
        gl.useProgram(p.id);
        for(let i=0;i<4;i++)gl.disableVertexAttribArray(i);
        for(const [name,value] of Object.entries({uAspect:aspect,uFit:Math.min(.9,aspect*.73),uTime:s.time,uGather:s.gather,uYaw:s.yaw,uPitch:s.pitch,uWarp:s.warp*(1-s.gather)}))gl.uniform1f(uniform(p,name),value);
        gl.uniform3f(uniform(p,'uPointer'),s.pointer.x,s.pointer.y,s.pointer.strength);
      }
      function memoryPosition(t,angle,s){
        const r=.15+Math.pow(1-t,1.1)*2.85+Math.sin(t*22-s.time*1.3)*(.035+s.warp*(1-s.gather)*.07),a=angle+t*13.1947+s.time*.19,fit=Math.min(.9,aspect*.73);
        let x=Math.cos(a)*r,y=Math.sin(a)*r,z=.6-t*9.5+3;
        [x,z]=[Math.cos(s.yaw)*x+Math.sin(s.yaw)*z,-Math.sin(s.yaw)*x+Math.cos(s.yaw)*z];
        [y,z]=[Math.cos(s.pitch)*y+Math.sin(s.pitch)*z,-Math.sin(s.pitch)*y+Math.cos(s.pitch)*z];
        return [x*fit,y*fit,z-3];
      }
      const maxPoint=gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
      let cardBounds=[];
      function draw(s){
        if(gl.isContextLost())return;
        gl.bindFramebuffer(gl.FRAMEBUFFER,scene);
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
        if(s.gather<.995){
          common(stars,s);attribute(stars,'aStar',starBuffer,4);gl.drawArrays(gl.LINES,0,starData.length/4);
          common(mesh,s);attribute(mesh,'aMesh',meshBuffer,2);gl.drawArrays(gl.TRIANGLES,0,skin.length/2);
          common(lines,s);attribute(lines,'aLine',lineBuffer,2);gl.drawArrays(gl.LINES,0,ribs.length/2);
        }
        common(points,s);
        attribute(points,'aSeed',seedBuffer,4);attribute(points,'aN',nBuffer,3);attribute(points,'aColor',colorBuffer,3);attribute(points,'aUV',uvBuffer,2);
        gl.uniform1f(uniform(points,'uReveal'),s.reveal);gl.uniform1f(uniform(points,'uDpr'),dpr);
        gl.uniform1f(uniform(points,'uTile'),photoW/FRUSTUM*height/cols*dpr+.6);gl.uniform1f(uniform(points,'uMaxPoint'),maxPoint);
        gl.uniform2f(uniform(points,'uPhoto'),photoW,photoH);
        if(s.reveal>.15)gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.POINTS,0,cols*rows);
        cardBounds=[];
        if(s.gather<.98){
          gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);common(cards,s);attribute(cards,'aCorner',quad,2);
          const ordered=memories.map(mem=>{
            const t=.07+(mem.index/memories.length)*.75;
            return {...mem,centre:memoryPosition(t,mem.index*2.399,s)};
          }).sort((a,b)=>a.centre[2]-b.centre[2]);
          for(const mem of ordered){
            const shrink=1-s.gather*.88, fit=Math.min(.9,aspect*.73);
            gl.uniform3f(uniform(cards,'uCentre'),mem.centre[0]*shrink,mem.centre[1]*shrink,mem.centre[2]);
            const h=1.16*shrink*fit;
            gl.uniform2f(uniform(cards,'uSize'),h*mem.aspect,h);
            gl.uniform1f(uniform(cards,'uAngle'),Math.sin(s.time*.15+mem.index)*.13);
            gl.uniform1f(uniform(cards,'uTilt'),Math.sin(s.time*.21+mem.index)*.32);
            gl.uniform1f(uniform(cards,'uOpacity'),(1-s.gather)*.94);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mem.tex);gl.uniform1i(uniform(cards,'uTexture'),0);
            gl.drawArrays(gl.TRIANGLES,0,6);
            const warp=s.warp*(1-s.gather),depth=8-mem.centre[2]-warp*1.7,lens=2.41421356/(1+warp*.22);
            const x=(mem.centre[0]*shrink*lens/aspect/depth*.5+.5)*width,y=(.5-mem.centre[1]*shrink*lens/depth*.5)*height;
            cardBounds.push({id:mem.id,x,y,w:Math.max(30,h*mem.aspect*lens/depth*.5*height),h:Math.max(30,h*lens/depth*.5*height)});
          }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.BLEND);common(post,s);attribute(post,'aCorner',quad,2);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,sceneTexture);gl.uniform1i(uniform(post,'uScene'),0);
        gl.uniform2f(uniform(post,'uTexel'),1/canvas.width,1/canvas.height);gl.drawArrays(gl.TRIANGLES,0,6);
      }
      resize();
      const pick=(x,y)=>[...cardBounds].reverse().find(b=>Math.abs(x-b.x)<b.w*.62&&Math.abs(y-b.y)<b.h*.62)?.id;
      const reduceDetail=()=>{if(renderScale<1)return false;renderScale=.72;resize();return true;};
      return {draw,resize,pick,reduceDetail,destroy:cleanup,count:cols*rows,memoryIds:memories.map(m=>m.id)};
    } catch(error){cleanup();throw error;}
  };
})();
