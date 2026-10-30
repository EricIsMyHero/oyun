import { MAP, closestRoute, courtyardFor, isCourtyard, isDeployable, distance, projectSegment } from './map.mjs';
import { RULES, clamp, num } from './rules.mjs';
import { visibilitySources, isPointVisible, isEntityVisible } from './vision.mjs';

const TEAM = ['#69d6ff', '#ff8068'];
const TEAL = '#89f4ed';
const terrainPoint=({x,y})=>({x:x*MAP.width/32,y:y*MAP.height/22});
const RIVER = [{x:11,y:-1},{x:11.8,y:3},{x:10.8,y:5.5},{x:13,y:8},{x:17,y:9},{x:17.5,y:12},{x:19,y:15},{x:20.6,y:19},{x:21.5,y:23}].map(terrainPoint);
const SHORE = [{x:-.2,y:7},{x:.7,y:2.7},{x:6,y:-.1},{x:14,y:-.65},{x:25,y:-.1},{x:30.8,y:1.5},{x:32.5,y:7},{x:32.2,y:16.7},{x:27.3,y:21.4},{x:20,y:22.2},{x:8,y:22.5},{x:.8,y:19.3},{x:-.6,y:13}].map(terrainPoint);

function seeded(seed=719) {
  return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
}
function polygon(ctx, points, fill, stroke, width=1) {
  if (!points.length) return;
  ctx.beginPath(); ctx.moveTo(points[0].x,points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x,p.y);
  ctx.closePath();
  if(fill) { ctx.fillStyle=fill; ctx.fill(); }
  if(stroke) { ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke(); }
}
function roundRect(ctx,x,y,w,h,r=4) {
  if (ctx.roundRect) { ctx.beginPath();ctx.roundRect(x,y,w,h,r); }
  else { ctx.beginPath();ctx.rect(x,y,w,h); }
}
function ellipse(ctx,x,y,rx,ry,fill,stroke=null,width=1) {
  ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);
  if(fill) {ctx.fillStyle=fill;ctx.fill();}
  if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function pathLength(points) {
  let length=0;
  for(let i=1;i<points.length;i++)length+=distance(points[i-1],points[i]);
  return length;
}
function pathPoint(points, position) {
  let along=position;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],length=distance(a,b);
    if(along<=length) {
      const t=length?along/length:0;
      return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,dx:(b.x-a.x)/(length||1),dy:(b.y-a.y)/(length||1)};
    }
    along-=length;
  }
  return {...points.at(-1),dx:0,dy:1};
}
function riverDistance(p) {
  return Math.min(...RIVER.slice(1).map((b,i)=>projectSegment(p,RIVER[i],b).distance));
}
function nearCourtyard(p,margin=0) {
  return MAP.bases.some((_,side)=>{
    const b=courtyardFor(side);
    return p.x>=b.minX-margin&&p.x<=b.maxX+margin&&p.y>=b.minY-margin&&p.y<=b.maxY+margin;
  });
}
function segmentCrossing(a,b,c,d) {
  const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y;
  const denominator=rx*sy-ry*sx;
  if(Math.abs(denominator)<1e-8)return null;
  const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/denominator;
  const u=((c.x-a.x)*ry-(c.y-a.y)*rx)/denominator;
  return t>=0&&t<=1&&u>=0&&u<=1?{x:a.x+t*rx,y:a.y+t*ry,angle:Math.atan2(ry,rx)}:null;
}

/** Original illustrated isometric arena. All simulation geometry remains in tiles. */
export class ArenaRenderer {
  constructor(canvas) {
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{alpha:false});
    this.background=document.createElement('canvas');
    this.fog=document.createElement('canvas');
    this.fogKey=null;
    this.images=new Map();
    this.shotTimes=new Map();
    this.deploymentPreview=null;
    this.view={scale:1,ox:0,oy:0,width:1,height:1,dpr:1};
    this.lastState=null;
    this.lastUI={};
    this.destroyed=false;
    this.resize=this.resize.bind(this);
    this.resize();
    if(typeof ResizeObserver!=='undefined') {
      this.observer=new ResizeObserver(this.resize);
      this.observer.observe(canvas);
    }
    globalThis.addEventListener?.('resize',this.resize);
  }

  resize() {
    if(this.destroyed)return;
    const rect=this.canvas.getBoundingClientRect();
    const width=Math.max(1,Math.round(rect.width||this.canvas.clientWidth||960));
    const height=Math.max(1,Math.round(rect.height||this.canvas.clientHeight||600));
    const dpr=Math.min(2,globalThis.devicePixelRatio||1);
    if(this.view.width===width&&this.view.height===height&&this.view.dpr===dpr)return;
    // Fit the complete island, including the larger forest rim and cliff faces.
    const totalExtent=MAP.width+MAP.height;
    const worldWidth=totalExtent+4;
    const scale=Math.min(width/worldWidth,height/(totalExtent*.5+6));
    this.view={width,height,dpr,scale,ox:width/2-totalExtent*.5*scale,oy:height/2+(MAP.width-MAP.height)*.25*scale};
    this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
    this.background.width=this.canvas.width;this.background.height=this.canvas.height;
    this.fog.width=this.canvas.width;this.fog.height=this.canvas.height;this.fogKey=null;
    this.deploymentPreview=null;
    this.makeBackground();
  }

  /** Canvas-local CSS pixels. Use canvas rect offsets for page coordinates. */
  screenAt(x,y,z=0) {
    if(typeof x==='object') { z=y||0;y=x.y;x=x.x; }
    const {scale:s,ox,oy}=this.view;
    return {x:ox+(x+y)*s,y:oy+(y-x)*s*.5-z*s};
  }

  worldAt(clientX,clientY) {
    const rect=this.canvas.getBoundingClientRect();
    const {scale:s,ox,oy}=this.view;
    const a=(clientX-rect.left-ox)/s;
    const b=(clientY-rect.top-oy)/(s*.5);
    return {x:(a-b)*.5,y:(a+b)*.5};
  }

  destroy() {
    this.destroyed=true;
    this.observer?.disconnect();
    globalThis.removeEventListener?.('resize',this.resize);
    for(const img of this.images.values()){img.onload=null;img.onerror=null;}
    this.images.clear();this.shotTimes.clear();
    this.fog.width=1;this.fog.height=1;this.fogKey=null;
  }

  world(ctx,callback) {
    const {ox,oy,scale:s}=this.view;
    ctx.save();ctx.transform(s,-s*.5,s,s*.5,ox,oy);callback(ctx);ctx.restore();
  }

  worldLine(ctx,points,width,color,dash=null) {
    this.world(ctx,c=>{
      c.beginPath();c.moveTo(points[0].x,points[0].y);
      for(const p of points.slice(1))c.lineTo(p.x,p.y);
      c.lineCap='round';c.lineJoin='round';c.lineWidth=width;c.strokeStyle=color;
      if(dash)c.setLineDash(dash);
      c.stroke();
    });
  }

  image(url) {
    if(!url)return null;
    if(!this.images.has(url)) {
      const image=new Image();image.decoding='async';
      image.onload=()=>{image.loaded=true;};image.onerror=()=>{image.failed=true;};
      image.src=url;this.images.set(url,image);
    }
    const image=this.images.get(url);
    return image.loaded&&image.naturalWidth?image:null;
  }

  makeBackground() {
    const ctx=this.background.getContext('2d');
    const {width:w,height:h,scale:s,dpr}=this.view;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const night=ctx.createLinearGradient(0,0,w,h);
    night.addColorStop(0,'#101f28');night.addColorStop(.5,'#1a3433');night.addColorStop(1,'#0a171f');
    ctx.fillStyle=night;ctx.fillRect(0,0,w,h);
    // A deep, soft forest surrounds the raised arena rather than a bare canvas.
    const glow=ctx.createRadialGradient(w*.47,h*.47,s*5,w*.5,h*.5,s*29);
    glow.addColorStop(0,'#4c755650');glow.addColorStop(1,'#10242300');
    ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    const random=seeded();
    for(let i=0;i<100;i++) {
      const p={x:random()*w,y:random()*h};
      ellipse(ctx,p.x,p.y,s*(.2+random()*.8),s*(.1+random()*.25),'#4b675417');
    }
    const shore=SHORE.map(p=>this.screenAt(p));
    ctx.save();ctx.shadowColor='#020a10';ctx.shadowBlur=s*2;ctx.shadowOffsetY=s*1.3;
    polygon(ctx,shore.map(p=>({x:p.x,y:p.y+s*2.2})),'#0b161c');ctx.restore();
    // Chipped cliff faces, with separate lit and shaded rock slabs.
    for(let i=0;i<shore.length;i++) {
      const a=shore[i],b=shore[(i+1)%shore.length],drop=s*(1.4+random()*1.5);
      polygon(ctx,[a,b,{x:b.x-s*.13,y:b.y+drop},{x:a.x+s*.2,y:a.y+drop+s*.4}],i%3===0?'#48555b':i%2?'#35464a':'#3e4c51','#24383b',s*.09);
      for(let j=0;j<3;j++) {
        const t=.15+j*.27,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
        ctx.beginPath();ctx.moveTo(p.x,p.y+s*.1);ctx.lineTo(p.x+s*(random()-.5)*.6,p.y+drop*.55);ctx.lineTo(p.x+s*.1,p.y+drop*.93);
        ctx.strokeStyle='#1d3238';ctx.lineWidth=s*.07;ctx.stroke();
      }
    }
    const grass=ctx.createLinearGradient(w*.2,h*.2,w*.8,h*.85);
    grass.addColorStop(0,'#597242');grass.addColorStop(.46,'#71824b');grass.addColorStop(1,'#345b3b');
    polygon(ctx,shore,grass,'#233e31',s*.22);
    ctx.save();polygon(ctx,shore);ctx.clip();
    for(let i=0;i<1800;i++) {
      const p=this.screenAt(random()*(MAP.width+1),random()*(MAP.height+1));
      const r=s*(.02+random()*.1);
      ellipse(ctx,p.x,p.y,r,r*.5,i%3?'#c3ca7e19':'#142e2920');
    }
    // Moss shelves give the cliff edge a soft, hand-painted lip.
    for(let i=0;i<shore.length;i++) {
      const a=shore[i],b=shore[(i+1)%shore.length];
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
      ctx.strokeStyle='#8a9a593f';ctx.lineWidth=s*.32;ctx.stroke();
    }
    ctx.save();ctx.beginPath();ctx.rect(-w,-h,w*3,h*3);
    for(let side=0;side<2;side++) {
      const b=courtyardFor(side);
      const points=[this.screenAt(b.minX,b.minY),this.screenAt(b.maxX,b.minY),this.screenAt(b.maxX,b.maxY),this.screenAt(b.minX,b.maxY)];
      ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();
    }
    ctx.clip('evenodd');
    this.worldLine(ctx,RIVER,1.8,'#1c4a51');
    this.worldLine(ctx,RIVER,1.5,'#3a8e9c');
    this.worldLine(ctx,RIVER,1.05,'#4cadb8');
    this.worldLine(ctx,RIVER.map(p=>({x:p.x+.25,y:p.y-.13})),.28,'#8bd5d35f');
    ctx.restore();
    const waterLength=pathLength(RIVER);
    for(let d=.3;d<waterLength;d+=.65) {
      const p=pathPoint(RIVER,d);
      if(nearCourtyard(p,.35))continue;
      const a=this.screenAt(p.x-.25,p.y-.09),b=this.screenAt(p.x+.2,p.y+.13);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=s*.035;ctx.strokeStyle='#d7f7e982';ctx.stroke();
    }
    // Castle courts are playable paving, with their exact asymmetric clearances.
    for(let side=0;side<2;side++)this.courtyard(ctx,side);
    // Three paved routes share one consistent logical road footprint.
    for(const route of MAP.routes) {
      this.worldLine(ctx,route,MAP.roadWidth+.42,'#344b32');
      this.worldLine(ctx,route,MAP.roadWidth+.16,'#8b8056');
      this.worldLine(ctx,route,MAP.roadWidth,'#b4a474');
      this.worldLine(ctx,route,MAP.roadWidth-.3,'#c3b27e');
      const length=pathLength(route);
      for(let d=.2;d<length;d+=.42) {
        const p=pathPoint(route,d),offset=(random()-.5)*1.6;
        const px=p.x-p.dy*offset,py=p.y+p.dx*offset;
        const size=.12+random()*.18;
        const stone=[{x:px-size,y:py-size*.65},{x:px+size*.85,y:py-size*.5},{x:px+size,y:py+size*.65},{x:px-size*.8,y:py+size*.8}].map(v=>this.screenAt(v));
        polygon(ctx,stone,['#c7c4a2','#aaad93','#d2c7a1','#989c87'][Math.floor(random()*4)],'#787f673e',s*.025);
      }
    }
    // Find crossings from the current road geometry, including the central S.
    const crossings=[];
    for(const route of MAP.routes)for(let i=1;i<route.length;i++)for(let j=1;j<RIVER.length;j++) {
      const p=segmentCrossing(route[i-1],route[i],RIVER[j-1],RIVER[j]);
      if(p&&!nearCourtyard(p,.4)&&!crossings.some(b=>distance(p,b)<1.7))crossings.push(p);
    }
    for(const p of crossings)this.bridge(ctx,p,p.angle);
    const trees=[];
    for(let x=.25;x<MAP.width;x+=.95)for(let y=.1;y<MAP.height+.2;y+=1.05) {
      const p={x:x+(random()-.5)*.8,y:y+(random()-.5)*.85};
      if(closestRoute(p).distance<2.05||riverDistance(p)<1.35||nearCourtyard(p,.85)||MAP.nodes.some(b=>distance(p,b)<2.1))continue;
      if(random()<.21)continue;
      const top=this.screenAt(p);
      trees.push({...p,screen:top,height:s*(1.7+random()*1.6),tone:random(),lean:(random()-.5)*s*.2});
    }
    trees.sort((a,b)=>a.screen.y-b.screen.y);
    for(const tree of trees)this.tree(ctx,tree.screen.x,tree.screen.y,tree.height,tree.tone,tree.lean);
    // Boulders, tufts and wildflowers soften the ends of the roads.
    for(let i=0;i<170;i++) {
      const p={x:random()*MAP.width,y:random()*MAP.height},rd=closestRoute(p).distance;
      if(rd<1.3||rd>2.1||nearCourtyard(p,.4)||riverDistance(p)<.9)continue;
      const q=this.screenAt(p),r=s*(.1+random()*.22);
      if(i%3===0)this.rock(ctx,q.x,q.y,r);
      else {
        for(let t=-1;t<=1;t++) {
          ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+t*r*.55,q.y-r*(.6+random()));
          ctx.strokeStyle=i%7===0?'#d3b970':'#90a762';ctx.lineWidth=Math.max(.7,s*.04);ctx.stroke();
        }
      }
    }
    ctx.restore();
    // Weathered outer stones trace the route's arena boundary.
    for(const originalEdge of [[{x:2.1,y:4.2},{x:8.2,y:1.4},{x:24,y:1.35},{x:29.7,y:4.4}],[{x:2.1,y:17.7},{x:8.3,y:20.7},{x:24.2,y:20.7},{x:30,y:17.6}]]) {
      const edge=originalEdge.map(terrainPoint);
      const length=pathLength(edge);
      for(let d=0;d<length;d+=.75) {
        const p=pathPoint(edge,d);
        this.block(ctx,p.x-.26,p.y-.2,.52,.4,.35,'#899582','#596b62','#a8af91');
      }
    }
    // A restrained vignette holds the landscape together without hiding roads.
    const vignette=ctx.createRadialGradient(w*.5,h*.47,s*(MAP.width+MAP.height)*.24,w*.5,h*.5,s*(MAP.width+MAP.height)*.6);
    vignette.addColorStop(0,'#07131c00');vignette.addColorStop(1,'#06131c88');
    ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
  }

  courtyard(ctx,side) {
    const b=courtyardFor(side),base=MAP.bases[side],random=seeded(730+side);
    this.world(ctx,c=>{
      c.fillStyle='#6b7d6b';c.fillRect(b.minX-.08,b.minY-.08,b.maxX-b.minX+.16,b.maxY-b.minY+.16);
      c.fillStyle='#aeb095';c.fillRect(b.minX,b.minY,b.maxX-b.minX,b.maxY-b.minY);
      c.save();c.beginPath();c.rect(b.minX+.08,b.minY+.08,b.maxX-b.minX-.16,b.maxY-b.minY-.16);c.clip();
      let row=0;
      for(let y=b.minY;y<b.maxY;y+=.38,row++)for(let x=b.minX-.5+(row%2)*.32;x<b.maxX;x+=.65) {
        c.fillStyle=['#b9baa0','#b2b59b','#c0bea3','#a3ad94'][Math.floor(random()*4)];
        c.fillRect(x+.025,y+.025,.6,.33);
      }
      c.restore();c.strokeStyle=side===0?'#6ba3ac99':'#ba8b7899';c.lineWidth=.06;
      c.strokeRect(b.minX+.12,b.minY+.12,b.maxX-b.minX-.24,b.maxY-b.minY-.24);
      // The inlaid approach is flat paving, not an obstacle in the deployment court.
      const direction=side===0?1:-1,front=base.x+direction*((MAP.castleRadius||1.05)+1.4);
      c.beginPath();c.moveTo(front+direction*.26,base.y);c.lineTo(front-direction*.2,base.y-.23);c.lineTo(front-direction*.2,base.y+.23);c.closePath();
      c.fillStyle=side===0?'#5f92945c':'#b17b655c';c.fill();
    });
  }

  bridge(ctx,p,angle=0) {
    const s=this.view.scale;
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    const at=(x,y,z=0)=>this.screenAt(p.x+x*cosine-y*sine,p.y+x*sine+y*cosine,z);
    const block=(x,y,w,d,h,left,right,top)=>{
      const points=[at(x,y),at(x+w,y),at(x+w,y+d),at(x,y+d)];
      const raised=[at(x,y,h),at(x+w,y,h),at(x+w,y+d,h),at(x,y+d,h)];
      const faces=points.map((point,i)=>({i,y:(point.y+points[(i+1)%4].y)/2})).sort((a,b)=>a.y-b.y);
      for(const face of faces) {
        const i=face.i,j=(i+1)%4;
        polygon(ctx,[points[i],points[j],raised[j],raised[i]],i%2?left:right,'#3c5a51',s*.045);
      }
      polygon(ctx,raised,top,'#65796b',s*.035);
    };
    for(let k=-2;k<=2;k++)block(k*.4-.18,-.95,.36,1.9,.12,'#9ba897','#6c817b','#bdc2a5');
    for(const side of [-1,1]) {
      for(let k=-2;k<=2;k++)block(k*.4-.16,side*1.06-.12,.32,.24,.42,'#a5ac96','#74877a','#d3ceb0');
      const a=at(-.95,side*1.05,.45),b=at(.95,side*1.05,.45);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle='#d0ceb2';ctx.lineWidth=s*.11;ctx.stroke();
    }
  }

  tree(ctx,x,y,height,tone,lean=0) {
    const w=height*.57;
    ellipse(ctx,x+height*.1,y+height*.02,w*.67,height*.105,'#102c2870');
    ctx.fillStyle='#664d35';ctx.fillRect(x-w*.07,y-height*.39,w*.14,height*.43);
    const colors=tone<.25?['#163e32','#235c40','#387447']:tone<.7?['#1c4d38','#2f6740','#4a7a48']:['#264c37','#3c6841','#62834b'];
    for(let layer=0;layer<3;layer++) {
      const top=y-height*(1-layer*.23),bottom=y-height*(.38-layer*.15),width=w*(.58+layer*.22);
      const jagged=[{x:x+lean,y:top},{x:x-width*.23+lean,y:top+(bottom-top)*.38},{x:x-width*.2,y:top+(bottom-top)*.34},{x:x-width*.42,y:top+(bottom-top)*.71},{x:x-width*.36,y:top+(bottom-top)*.67},{x:x-width*.57,y:bottom},{x:x-width*.14,y:bottom-height*.025},{x:x,y:bottom+height*.025},{x:x+width*.21,y:bottom-height*.025},{x:x+width*.56,y:bottom-height*.035},{x:x+width*.35,y:top+(bottom-top)*.64},{x:x+width*.41,y:top+(bottom-top)*.67},{x:x+width*.19,y:top+(bottom-top)*.3}];
      polygon(ctx,jagged,colors[layer],'#18392b',Math.max(.6,height*.016));
      ctx.beginPath();ctx.moveTo(x+lean,top+height*.08);ctx.lineTo(x-width*.25,top+(bottom-top)*.76);
      ctx.strokeStyle='#a9b87228';ctx.lineWidth=height*.025;ctx.stroke();
    }
  }

  rock(ctx,x,y,size) {
    polygon(ctx,[{x:x-size,y},{x:x-size*.7,y:y-size*.8},{x:x+size*.3,y:y-size},{x:x+size,y:y-size*.2},{x:x+size*.6,y:y+size*.3}], '#67776b','#425a51',Math.max(.6,size*.1));
    polygon(ctx,[{x:x-size*.7,y:y-size*.8},{x:x+size*.3,y:y-size},{x:x+size*.1,y:y-size*.17},{x:x-size,y}], '#8b9480');
  }

  block(ctx,x,y,w,d,h,left='#89958b',right='#667c75',top='#b9bba4',z=0) {
    const a=this.screenAt(x,y,z),b=this.screenAt(x+w,y,z),c=this.screenAt(x+w,y+d,z),e=this.screenAt(x,y+d,z);
    const ah=this.screenAt(x,y,z+h),bh=this.screenAt(x+w,y,z+h),ch=this.screenAt(x+w,y+d,z+h),eh=this.screenAt(x,y+d,z+h);
    const border='#2c4840';const line=Math.max(.55,this.view.scale*.055);
    polygon(ctx,[a,e,eh,ah],left,border,line);polygon(ctx,[e,c,ch,eh],right,border,line);
    polygon(ctx,[ah,bh,ch,eh],top,border,line);
  }

  roof(ctx,x,y,w,d,z,height,color) {
    const corners=[this.screenAt(x,y,z),this.screenAt(x+w,y,z),this.screenAt(x+w,y+d,z),this.screenAt(x,y+d,z)];
    const tip=this.screenAt(x+w/2,y+d/2,z+height);
    polygon(ctx,[corners[0],corners[1],tip],color[0],'#223b42',this.view.scale*.05);
    polygon(ctx,[corners[1],corners[2],tip],color[1],'#223b42',this.view.scale*.05);
    polygon(ctx,[corners[2],corners[3],tip],color[2],'#223b42',this.view.scale*.05);
    polygon(ctx,[corners[3],corners[0],tip],color[0],'#223b42',this.view.scale*.05);
  }

  crystal(ctx,x,y,height,color,time=0) {
    const width=height*.37;
    ctx.save();ctx.shadowColor=color;ctx.shadowBlur=height*.38;
    polygon(ctx,[{x,y:y-height},{x:x+width,y:y-height*.52},{x,y},{x:x-width,y:y-height*.52}],color,'#d0ffff',Math.max(.6,height*.035));
    ctx.shadowBlur=0;
    polygon(ctx,[{x,y:y-height},{x,y:y-height*.49},{x:x-width,y:y-height*.52}],'#efffffad');
    polygon(ctx,[{x,y:y-height*.49},{x:x+width,y:y-height*.52},{x,y}],'#13485781');
    ctx.beginPath();ctx.moveTo(x,y-height);ctx.lineTo(x,y);ctx.strokeStyle='#d7ffff99';ctx.lineWidth=height*.025;ctx.stroke();
    const twinkle=(Math.sin(time*2.1)+1)*.5;
    ellipse(ctx,x-width*.27,y-height*.65,height*.06,height*.04,`rgba(240,255,250,${.45+twinkle*.4})`);
    ctx.restore();
  }

  castle(ctx,castle,side,time) {
    const base=MAP.bases[side],s=this.view.scale,p=this.screenAt(base);
    const blue=side===0,color=TEAM[side];
    const artScale=(MAP.castleRadius||1.05)/1.8;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(artScale,artScale);ctx.translate(-p.x,-p.y);
    ellipse(ctx,p.x+s*.18,p.y+s*.25,s*3.15,s*1.25,'#142b2b5c');
    this.block(ctx,base.x-1.8,base.y-1.7,3.6,3.4,.28,'#7b8981','#526e69','#b5b9a0');
    this.block(ctx,base.x-1.55,base.y-1.5,3.1,.3,.86,'#8c998d','#6b8178','#c1c4a9',.28);
    this.block(ctx,base.x-1.55,base.y-1.5,.3,3.05,.86,'#8c998d','#6b8178','#c1c4a9',.28);
    this.block(ctx,base.x+1.25,base.y-1.5,.3,3.05,.86,'#8c998d','#6b8178','#c1c4a9',.28);
    this.block(ctx,base.x-1.55,base.y+1.25,3.1,.3,.86,'#8c998d','#6b8178','#c1c4a9',.28);
    // Dark portcullis, framed in warm cut stone.
    const gate=this.screenAt(base.x-.2,base.y+1.58);
    ctx.save();ctx.translate(gate.x,gate.y-s*.33);ctx.transform(1,-.5,0,1,0,0);
    ctx.fillStyle='#2d4544';roundRect(ctx,-s*.31,-s*.73,s*.62,s*.78,s*.22);ctx.fill();
    ctx.strokeStyle='#b0b79e';ctx.lineWidth=s*.11;ctx.stroke();
    for(let k=-1;k<=1;k++){ctx.fillStyle='#769190';ctx.fillRect(k*s*.13-s*.015,-s*.58,s*.035,s*.61);}
    ctx.restore();
    // The keep's colored roof and central crystal read instantly as a team base.
    this.block(ctx,base.x-.7,base.y-.8,1.4,1.35,1.9,blue?'#8fb3b7':'#bca68b',blue?'#5e8c99':'#9a786b','#c4c7a9',.28);
    this.roof(ctx,base.x-.88,base.y-.98,1.75,1.73,2.18,.87,blue?['#3597c1','#1b638c','#70c7d9']:['#d15d48','#91433e','#e8916d']);
    const crystal=this.screenAt(base.x+.25,base.y+.25,3.38);
    // Battlement towers and colored pennants.
    const towers=[[-1.5,-1.5],[1.03,-1.5],[-1.5,1.03],[1.03,1.03]].sort((a,b)=>(a[1]-a[0])-(b[1]-b[0]));
    for(const [dx,dy] of towers) {
      const x=base.x+dx,y=base.y+dy;
      this.block(ctx,x,y,.65,.65,1.65,'#9da89a','#738b81','#d1d0ae',.28);
      this.block(ctx,x-.08,y-.08,.82,.82,.2,'#798e84','#55776e',blue?'#61abc4':'#ca7d65',1.93);
      for(const a of [0,.48])for(const b of [0,.48])this.block(ctx,x+a-.05,y+b-.05,.26,.26,.29,'#bec3a6','#85998b','#d7d5b6',2.13);
      const slit=this.screenAt(x+.1,y+.66,1.14);
      ctx.fillStyle='#3a5853';ctx.fillRect(slit.x-s*.05,slit.y-s*.23,s*.09,s*.31);
    }
    const halo=ctx.createRadialGradient(crystal.x,crystal.y-s*.4,0,crystal.x,crystal.y-s*.4,s*2.2);
    halo.addColorStop(0,blue?'#5fdcff45':'#ff876c35');halo.addColorStop(1,'#82eaff00');
    ctx.fillStyle=halo;ctx.fillRect(crystal.x-s*2.3,crystal.y-s*2.6,s*4.6,s*4.6);
    this.crystal(ctx,crystal.x,crystal.y,s*1.37,color,time);
    for(const offset of [{x:-1.6,y:.2},{x:1.5,y:-.65}]) {
      const flag=this.screenAt(base.x+offset.x,base.y+offset.y,1.1);
      ctx.strokeStyle='#c9c6a3';ctx.lineWidth=s*.085;ctx.beginPath();ctx.moveTo(flag.x,flag.y);ctx.lineTo(flag.x,flag.y-s*1.55);ctx.stroke();
      const wave=Math.sin(time*2.5+side)*s*.06;
      polygon(ctx,[{x:flag.x,y:flag.y-s*1.5},{x:flag.x+s*.77,y:flag.y-s*1.32+wave},{x:flag.x+s*.72,y:flag.y-s*.83+wave},{x:flag.x,y:flag.y-s*1.01}],blue?'#388dc2':'#c84f49','#273f3e',s*.045);
    }
    this.torch(ctx,base.x-1.55,base.y+1.7,time);
    this.torch(ctx,base.x+1.7,base.y+.95,time+1.5);
    ctx.restore();
    const hp=castle?.hp??RULES.castleHealth,max=castle?.maxHp??RULES.castleHealth;
    const labelY=p.y-s*5.32*artScale,width=clamp(s*4.8,64,106);
    ctx.save();ctx.textAlign='center';ctx.font=`600 ${clamp(s*.5,9,12)}px system-ui,sans-serif`;
    ctx.letterSpacing='1px';ctx.fillStyle='#e6ead3';ctx.shadowColor='#0b252a';ctx.shadowBlur=6;
    ctx.fillText(blue?'AZURE CORE':'CRIMSON CROWN',p.x,labelY-s*.37);ctx.shadowBlur=0;
    this.healthBar(ctx,p.x,labelY,width,clamp(hp/max,0,1),color,5);
    ctx.font=`600 ${clamp(s*.48,9,12)}px system-ui,sans-serif`;ctx.fillStyle='#f4f3dc';
    ctx.fillText(`${Math.ceil(Math.max(0,hp))}`,p.x,labelY+16);ctx.restore();
  }

  torch(ctx,x,y,time) {
    const p=this.screenAt(x,y),s=this.view.scale;
    this.block(ctx,x-.13,y-.13,.26,.26,.8,'#89917a','#5b7569','#c5b795');
    const flameY=p.y-s*.95,flicker=1+Math.sin(time*10+x)*.15;
    const glow=ctx.createRadialGradient(p.x,flameY,0,p.x,flameY,s*.8);
    glow.addColorStop(0,'#ffc56f45');glow.addColorStop(1,'#ff9e2700');ctx.fillStyle=glow;ctx.fillRect(p.x-s,flameY-s,s*2,s*2);
    polygon(ctx,[{x:p.x,y:flameY-s*.42*flicker},{x:p.x+s*.17,y:flameY-s*.07},{x:p.x+s*.1,y:flameY+s*.09},{x:p.x-s*.12,y:flameY+s*.07},{x:p.x-s*.17,y:flameY-s*.14}], '#ffba45');
    ellipse(ctx,p.x,flameY-s*.04,s*.07,s*.16,'#fff3b0');
  }

  node(ctx,node,time) {
    const s=this.view.scale,p=this.screenAt(node),owner=node.owner;
    const color=owner===0?TEAM[0]:owner===1?TEAM[1]:TEAL;
    ellipse(ctx,p.x,p.y+s*.16,s*1.2,s*.53,'#193d3f66');
    ellipse(ctx,p.x,p.y,s*1.16,s*.53,'#768c80','#314e4a',s*.085);
    ellipse(ctx,p.x,p.y-s*.09,s*.98,s*.41,'#a8b7a0','#4c7370',s*.07);
    const pulse=.7+Math.sin(time*2.4+node.x)*.3;
    ctx.save();ctx.globalAlpha=.35+pulse*.25;ctx.shadowBlur=s*.55;ctx.shadowColor=color;
    ellipse(ctx,p.x,p.y-s*.08,s*.91,s*.36,null,color,s*.075);ctx.restore();
    for(const d of [-1,1]) {
      ctx.beginPath();ctx.moveTo(p.x+d*s*.38,p.y-s*.3);ctx.quadraticCurveTo(p.x+d*s*.95,p.y-s*.4,p.x+d*s*.97,p.y+s*.27);
      ctx.strokeStyle='#314e52';ctx.lineWidth=s*.2;ctx.stroke();ctx.strokeStyle='#9eafa4';ctx.lineWidth=s*.11;ctx.stroke();
      ellipse(ctx,p.x+d*s*.97,p.y+s*.27,s*.19,s*.085,'#8a9d91','#345b58',s*.045);
    }
    const cylinderY=p.y-s*.33;
    ctx.fillStyle='#406975';ctx.fillRect(p.x-s*.43,cylinderY-s*.96,s*.86,s*.96);
    ellipse(ctx,p.x,cylinderY,s*.43,s*.15,'#6aa6aa','#31545c',s*.06);
    const fluid=ctx.createLinearGradient(p.x-s*.35,0,p.x+s*.35,0);
    fluid.addColorStop(0,'#145c77');fluid.addColorStop(.44,color);fluid.addColorStop(1,'#286879');
    ctx.fillStyle=fluid;ctx.fillRect(p.x-s*.34,cylinderY-s*.88,s*.68,s*.83);
    ctx.strokeStyle='#d2ffff91';ctx.lineWidth=s*.04;ctx.beginPath();ctx.moveTo(p.x-s*.19,cylinderY-s*.78);ctx.lineTo(p.x-s*.19,cylinderY-s*.15);ctx.stroke();
    for(let i=0;i<4;i++) {
      const cycle=(time*.35+i*.27)%1;
      ellipse(ctx,p.x+Math.sin(i*2.3)*s*.21,cylinderY-s*(.12+cycle*.68),s*.045,s*.055,'#e0fff8a0');
    }
    ellipse(ctx,p.x,cylinderY-s*.94,s*.49,s*.19,'#a7bcb1','#456970',s*.07);
    ellipse(ctx,p.x,cylinderY-s*1.02,s*.34,s*.12,color);
    const crystalY=cylinderY-s*1.1-Math.sin(time*2+node.y)*s*.045;
    this.crystal(ctx,p.x,crystalY,s*.91,color,time);
    // A fine orbit and drifting motes distinguish ownership from decoration.
    for(let i=0;i<6;i++) {
      const angle=time*.6+i*Math.PI/3;
      const x=p.x+Math.cos(angle)*s*.85,y=p.y-s*.9+Math.sin(angle)*s*.35;
      ellipse(ctx,x,y,s*.035,s*.035,color);
    }
    const progress=clamp((node.progress||0)/RULES.captureTime,0,1);
    if(progress>0) {
      ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.45);ctx.beginPath();ctx.arc(0,0,s*1.27,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);
      ctx.strokeStyle=TEAM[node.capturing]||color;ctx.lineWidth=s*.12;ctx.stroke();ctx.restore();
    }
    ctx.save();ctx.textAlign='center';ctx.font=`600 ${clamp(s*.45,8,10)}px system-ui,sans-serif`;
    ctx.fillStyle='#e5ead4';ctx.shadowColor='#143537';ctx.shadowBlur=4;
    const text=owner===0?'+2% BLUE':owner===1?'+2% RED':'CAPTURE';
    ctx.fillText(text,p.x,p.y+s*.98);ctx.restore();
  }

  healthBar(ctx,x,y,width,fraction,color,height=3) {
    ctx.fillStyle='#10252a';roundRect(ctx,x-width/2-1,y-1,width+2,height+2,2);ctx.fill();
    ctx.fillStyle='#384c49';ctx.fillRect(x-width/2,y,width,height);
    ctx.fillStyle=color;ctx.fillRect(x-width/2,y,width*clamp(fraction,0,1),height);
    ctx.fillStyle='#efffed6b';ctx.fillRect(x-width/2,y,width*clamp(fraction,0,1),1);
  }

  unit(ctx,u,state,ui,ghost=false) {
    const s=this.view.scale,side=u.side??0,color=TEAM[side];
    const movement=u.def?.combat?.movementType||u.def?.raw?.combatStats?.movementType||'ground';
    const time=state?.time||0,p=this.screenAt(u),selected=ui.selectedUnitId===u.id&&!ghost;
    const size=clamp(s*.86,12,24)*(u.isBuilding?1.2:1);
    const phase=String(u.id||'').split('').reduce((sum,c)=>sum+c.charCodeAt(0),0);
    const floating=movement==='flying'?s*(.77+Math.sin(time*4+phase)*.06):movement==='hovering'?s*(.19+Math.sin(time*3+u.x)*.05):0;
    const py=p.y-floating,bodyY=py-size*.57;
    const shot=this.shotTimes.get(u.id);
    if(!shot||shot.shots!==u.shots)this.shotTimes.set(u.id,{shots:u.shots,time});
    const attackTime=this.shotTimes.get(u.id)?.time??-99;
    const attacking=time-attackTime<.18&&u.shots>0;
    const statuses=(u.statuses||[]).filter(st=>(st.until??Infinity)>time);
    const hidden=statuses.some(st=>['invisible','invisibility','stealth'].includes(st.kind));
    ctx.save();ctx.globalAlpha=ghost ? .58 : hidden ? .48 : 1;
    ellipse(ctx,p.x,p.y+s*.07,size*.57,size*.2,'#142c2b66');
    if(selected) {
      ellipse(ctx,p.x,p.y+s*.03,size*.75,size*.29,null,'#f4d27c',2);
      const range=num(u.stats?.range)/1000;
      if(range>0)this.world(ctx,c=>{c.beginPath();c.arc(u.x,u.y,range,0,Math.PI*2);c.strokeStyle='#e4cc7a55';c.lineWidth=.035;c.setLineDash([.12,.13]);c.stroke();});
    }
    if(movement==='flying') {
      const flap=Math.sin(time*8+u.x)*size*.2;
      polygon(ctx,[{x:p.x-size*.25,y:bodyY},{x:p.x-size*.95,y:bodyY-size*.38+flap},{x:p.x-size*.75,y:bodyY+size*.22},{x:p.x,y:bodyY+size*.1}],side===0?'#8fbad1':'#c79d98','#30474a',1);
      polygon(ctx,[{x:p.x+size*.25,y:bodyY},{x:p.x+size*.95,y:bodyY-size*.38-flap},{x:p.x+size*.75,y:bodyY+size*.22},{x:p.x,y:bodyY+size*.1}],side===0?'#b3d5dc':'#d5b3a0','#30474a',1);
    }
    if(u.isBuilding) {
      this.block(ctx,u.x-.4,u.y-.4,.8,.8,.65,'#a9b5a1','#718e85','#d0ccb0');
      this.roof(ctx,u.x-.5,u.y-.5,1,1,.65,.4,side===0?['#317da1','#24566e','#6db2bd']:['#b6544f','#7c423e','#c68766']);
    } else {
      // Tiny armored bodies and visible blades give portrait units physical presence.
      polygon(ctx,[{x:p.x-size*.36,y:bodyY+size*.07},{x:p.x+size*.31,y:bodyY+size*.03},{x:p.x+size*.46,y:py-size*.03},{x:p.x-size*.48,y:py}],side===0?'#355d79':'#864e48','#263f44',1);
      ctx.strokeStyle='#d5c59c';ctx.lineWidth=Math.max(1,size*.1);
      const dir=side===0?1:-1;
      ctx.beginPath();ctx.moveTo(p.x+dir*size*.34,py-size*.22);ctx.lineTo(p.x+dir*size*(attacking ? .98 : .65),py-size*(attacking ? .66 : .85));ctx.stroke();
      ctx.strokeStyle='#283f44';ctx.lineWidth=size*.15;ctx.beginPath();ctx.moveTo(p.x-size*.17,py-size*.08);ctx.lineTo(p.x-size*.2,py+size*.1);ctx.moveTo(p.x+size*.15,py-size*.08);ctx.lineTo(p.x+size*.2,py+size*.07);ctx.stroke();
    }
    const headY=bodyY-size*.2;
    ctx.save();
    const frame=[{x:p.x,y:headY-size*.55},{x:p.x+size*.48,y:headY-size*.24},{x:p.x+size*.42,y:headY+size*.34},{x:p.x,y:headY+size*.52},{x:p.x-size*.42,y:headY+size*.34},{x:p.x-size*.48,y:headY-size*.24}];
    polygon(ctx,frame,'#243b40',color,Math.max(1.2,size*.075));
    ctx.save();polygon(ctx,frame);ctx.clip();
    const image=this.image(u.def?.image||u.image);
    if(image) {
      const crop=Math.min(image.naturalWidth,image.naturalHeight*.7);
      ctx.drawImage(image,(image.naturalWidth-crop)/2,Math.max(0,image.naturalHeight*.11),crop,crop,p.x-size*.51,headY-size*.57,size*1.02,size*1.08);
      const shade=ctx.createLinearGradient(0,headY-size*.5,0,headY+size*.5);shade.addColorStop(0,'#12323900');shade.addColorStop(1,'#10242a70');ctx.fillStyle=shade;ctx.fillRect(p.x-size*.6,headY-size*.6,size*1.2,size*1.2);
    } else {
      const gradient=ctx.createLinearGradient(p.x-size*.4,headY-size*.4,p.x+size*.4,headY+size*.4);
      gradient.addColorStop(0,side===0?'#659998':'#c18870');gradient.addColorStop(1,'#233b41');
      ctx.fillStyle=gradient;ctx.fillRect(p.x-size*.5,headY-size*.6,size,size*1.2);
      // A helmet silhouette is the intentional offline artwork fallback.
      ellipse(ctx,p.x,headY-size*.06,size*.22,size*.29,'#c9d0b4');
      ctx.fillStyle='#3c595c';ctx.fillRect(p.x-size*.23,headY-size*.12,size*.46,size*.09);
      ctx.fillStyle=color;ctx.fillRect(p.x-size*.15,headY-size*.085,size*.08,size*.035);ctx.fillRect(p.x+size*.06,headY-size*.085,size*.08,size*.035);
    }
    ctx.restore();polygon(ctx,frame,null,selected?'#ffe0a1':color,Math.max(1,size*.06));ctx.restore();
    if(movement==='hovering') {
      ctx.save();ctx.globalAlpha=.4;ellipse(ctx,p.x,p.y,size*.5,size*.17,null,color,1);ctx.restore();
    }
    if(!ghost) {
      const barY=headY-size*.78;
      this.healthBar(ctx,p.x,barY,size*1.16,u.hp/(u.maxHp||1),side===0?'#a0df8e':'#fa9b80',3);
      if(u.maxShield>0&&u.shield>0)this.healthBar(ctx,p.x,barY-4,size*1.16,u.shield/u.maxShield,'#83ccf4',2);
      const statusColors={poison:'#b5df78',burn:'#ffb875',bleed:'#ef8692',slow:'#94d6ec',stun:'#ffdf89',silence:'#d9b0fa',blind:'#d0aecf',root:'#b2d98b',prison:'#a3b4fa',curse:'#e69cd6'};
      statuses.slice(0,3).forEach((st,i)=>{
        const c=statusColors[st.kind]||'#d9d9c0';
        ctx.fillStyle='#1c353c';roundRect(ctx,p.x-size*.55+i*7,barY-13,6,6,1);ctx.fill();
        ctx.fillStyle=c;ctx.fillRect(p.x-size*.55+1+i*7,barY-12,4,4);
      });
      if(selected) {
        ctx.textAlign='center';ctx.font='600 10px system-ui,sans-serif';ctx.shadowColor='#102c32';ctx.shadowBlur=4;ctx.fillStyle='#fff0c9';
        ctx.fillText(u.def?.name||'Unit',p.x,py+17);ctx.shadowBlur=0;
      }
    }
    ctx.restore();
  }

  projectile(ctx,b,state) {
    if(!Number.isFinite(b.x)||!Number.isFinite(b.y))return;
    const p=this.screenAt(b),s=this.view.scale;
    const previous=this.screenAt(Number.isFinite(b.prevX)?b.prevX:b.x-(b.dx||0)*.04,Number.isFinite(b.prevY)?b.prevY:b.y-(b.dy||0)*.04);
    const color=b.color||TEAM[b.side]||'#f6dab0';
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=color;ctx.lineWidth=clamp((b.width||.2)*s*.4,1.4,5);
    ctx.shadowColor=color;ctx.shadowBlur=7;ctx.beginPath();ctx.moveTo(previous.x,previous.y-s*.6);ctx.lineTo(p.x,p.y-s*.6);ctx.stroke();
    ellipse(ctx,p.x,p.y-s*.6,2.2,1.6,'#efffef');ctx.restore();
  }

  effect(ctx,e,time) {
    if(!Number.isFinite(e.x)||!Number.isFinite(e.y))return;
    const p=this.screenAt(e),s=this.view.scale;
    const duration=Math.max(.1,(e.until??time+.5)-(e.born??time));
    const progress=clamp((time-(e.born??time))/duration,0,1),alpha=1-progress;
    const color=e.color||({heal:'#a2e7a2',shield:'#8edcff',death:'#f8c99b',capture:'#9bf5ed',explosion:'#ffc279',slash:'#fff2c2',spell:'#ccadff',spawn:'#b8edfa'}[e.type]||'#ffe8c0');
    ctx.save();ctx.globalAlpha=alpha;
    if(['explosion','spell','capture','spawn','death'].includes(e.type)) {
      const radius=(e.radius||.7)*s*(.3+progress);
      ellipse(ctx,p.x,p.y,radius,radius*.5,progress<.2?color+'44':null,color,Math.max(1,s*.07)*(1-progress));
      for(let i=0;i<8;i++) {
        const angle=i*Math.PI/4+(Number(e.id)||0),length=radius*(.4+progress*.8);
        const x=p.x+Math.cos(angle)*length,y=p.y+Math.sin(angle)*length*.5-s*progress*.35;
        ellipse(ctx,x,y,Math.max(.6,s*.05*(1-progress)),Math.max(.6,s*.05*(1-progress)),color);
      }
    } else if(e.type==='slash') {
      ctx.beginPath();ctx.ellipse(p.x,p.y-s*.2,s*(e.radius||.65),s*.32,0,-Math.PI*.9,-Math.PI*.9+Math.PI*1.35);
      ctx.lineWidth=s*.09;ctx.strokeStyle=color;ctx.stroke();
    } else if(e.type==='shield') {
      ellipse(ctx,p.x,p.y-s*.6,s*.55,s*.77,null,color,s*.06);
    } else if(e.type==='heal') {
      ctx.fillStyle=color;ctx.fillRect(p.x-s*.06,p.y-s*(1.1+progress*.4),s*.12,s*.45);ctx.fillRect(p.x-s*.22,p.y-s*(.94+progress*.4),s*.44,s*.12);
    } else {
      const r=s*.18*(1+progress);
      polygon(ctx,[{x:p.x,y:p.y-s*.6-r},{x:p.x+r*.3,y:p.y-s*.6-r*.3},{x:p.x+r,y:p.y-s*.6},{x:p.x+r*.2,y:p.y-s*.6+r*.2},{x:p.x,y:p.y-s*.6+r},{x:p.x-r*.3,y:p.y-s*.6+r*.2},{x:p.x-r,y:p.y-s*.6}],color);
    }
    if(e.amount&&Number.isFinite(e.amount)) {
      ctx.font=`700 ${clamp(s*.65,10,16)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.strokeStyle='#193038';ctx.lineWidth=3;
      const text=`${e.type==='heal'?'+':''}${Math.round(e.amount)}`;
      ctx.strokeText(text,p.x,p.y-s*(1.15+progress*.7));ctx.fillText(text,p.x,p.y-s*(1.15+progress*.7));
    }
    ctx.restore();
  }

  placement(ctx,state,ui) {
    if(!ui.selectedCard&&!ui.spellSelected)return;
    const s=this.view.scale;
    const building=ui.selectedCard?.kind==='building'||String(ui.selectedCard?.raw?.type||'').toLowerCase()==='building';
    if(!ui.spellSelected||building) {
      const side=ui.side===1?1:0,base=MAP.bases[side];
      const viewerSide=ui.viewerSide===1?1:0;
      const buildings=(state?.units||[]).filter(u=>u.isBuilding&&u.alive!==false&&isEntityVisible(state,viewerSide,u,this.sightSources));
      const key=`${side}:`+buildings.map(b=>`${b.id}:${b.x}:${b.y}:${b.radius||.45}`).join('|');
      if(this.deploymentPreview?.key!==key) {
        // Reuse the actual placement predicate. This mask cannot accidentally
        // advertise the old half-map roads or a court blocked by a building.
        const path=new Path2D(),step=.2,radius=RULES.castleRange;
        const minX=Math.max(1,base.x-radius),maxX=Math.min(MAP.width-1,base.x+radius);
        const minY=Math.max(1,base.y-radius),maxY=Math.min(MAP.height-1,base.y+radius);
        for(let x=minX;x<maxX;x+=step)for(let y=minY;y<maxY;y+=step) {
          const w=Math.min(step,maxX-x),h=Math.min(step,maxY-y);
          if(!isDeployable({x:x+w/2,y:y+h/2},side,buildings))continue;
          if(![[x,y],[x+w,y],[x+w,y+h],[x,y+h]].every(([px,py])=>isDeployable({x:px,y:py},side,buildings)))continue;
          path.rect(x,y,w,h);
        }
        this.deploymentPreview={key,path};
      }
      this.world(ctx,c=>{
        c.fillStyle=side===0?'#8ce3ed35':'#f3a68f35';c.fill(this.deploymentPreview.path);
        c.beginPath();c.arc(base.x,base.y,RULES.castleRange,0,Math.PI*2);
        c.lineWidth=.035;c.strokeStyle=side===0?'#a5d9de85':'#e5ad9985';c.setLineDash([.16,.18]);c.stroke();
      });
    }
    const p=ui.placement;
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    const point=this.screenAt(p),color=p.valid?'#b2edb6':'#f3ae82';
    const card=ui.selectedCard;
    let radius=ui.spellSelected?num(card?.raw?.stats?.range)/1000:num(card?.stats?.range)/1000;
    if(card?.range?.radius)radius=card.range.radius;
    if(radius>0&&radius<20) this.world(ctx,c=>{
      c.beginPath();c.arc(p.x,p.y,radius,0,Math.PI*2);c.fillStyle=p.valid?'#c1f2c81b':'#e6a78618';c.fill();c.lineWidth=.035;c.strokeStyle=p.valid?'#c5f3cc99':'#f2ac8c99';c.setLineDash([.13,.13]);c.stroke();
    });
    ellipse(ctx,point.x,point.y,s*.67,s*.3,color+'24',color,1.5);
    if(!ui.spellSelected&&card)this.unit(ctx,{id:'ghost',x:p.x,y:p.y,side:0,def:card,stats:card.stats,shots:0,statuses:[]},state,{},true);
    else {
      ctx.beginPath();ctx.moveTo(point.x-s*.4,point.y);ctx.lineTo(point.x+s*.4,point.y);ctx.moveTo(point.x,point.y-s*.2);ctx.lineTo(point.x,point.y+s*.2);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.stroke();
    }
  }

  applyFog(state,side,sources) {
    if(!state)return;
    const {width,height,dpr}=this.view;
    const key=`${side}:`+sources.map(source=>`${source.x},${source.y},${source.radius}`).join('|');
    if(key!==this.fogKey) {
      const ctx=this.fog.getContext('2d');
      ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.fillStyle='#020507';ctx.fillRect(0,0,this.fog.width,this.fog.height);
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalCompositeOperation='destination-out';
      this.world(ctx,c=>{
        for(const source of sources) {
          // The soft falloff is strictly inside the visibility radius: no blur
          // is allowed to expose terrain or combat effects beyond the boundary.
          const clearEdge=Math.max(0,1-.65/source.radius);
          const gradient=c.createRadialGradient(source.x,source.y,0,source.x,source.y,source.radius);
          gradient.addColorStop(0,'#000');gradient.addColorStop(clearEdge,'#000');
          gradient.addColorStop(1,'#0000');
          c.beginPath();c.arc(source.x,source.y,source.radius,0,Math.PI*2);c.fillStyle=gradient;c.fill();
        }
      });
      this.fogKey=key;
    }
    // Composite after every world layer, including labels and effects whose
    // visible centers could otherwise leak geometry into unseen terrain.
    this.ctx.save();this.ctx.setTransform(1,0,0,1,0,0);
    this.ctx.drawImage(this.fog,0,0);this.ctx.restore();
  }

  draw(state=null,ui={}) {
    if(this.destroyed)return;
    this.lastState=state;this.lastUI=ui;
    const ctx=this.ctx,{width:w,height:h,dpr,scale:s}=this.view;
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(this.background,0,0);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const time=state?.time??((globalThis.performance?.now?.()||0)/1000);
    const viewerSide=ui.viewerSide===1?1:0;
    const sources=state?visibilitySources(state,viewerSide):[];
    this.sightSources=sources;
    const pointVisible=p=>!state||isPointVisible(state,viewerSide,p,sources);
    const entityVisible=entity=>!state||isEntityVisible(state,viewerSide,entity,sources);
    // Slow river glints and fireflies make an idle preview feel alive.
    for(let i=0;i<12;i++) {
      const p=pathPoint(RIVER,((time*.3+i*2.3)%pathLength(RIVER))),q=this.screenAt(p);
      if(MAP.bases.some((_,side)=>isCourtyard(p,side)))continue;
      if(!pointVisible(p))continue;
      ellipse(ctx,q.x,q.y,s*.045,s*.025,'#c3fff6a0');
    }
    this.placement(ctx,state,ui);
    const nodes=state?.nodes?.length?state.nodes:MAP.nodes.map(n=>({...n,owner:null,progress:0}));
    const sprites=[];
    for(let side=0;side<2;side++) {
      const castle=state?.castles?.find(c=>c.side===side);
      if(!state||castle&&entityVisible(castle))sprites.push({kind:'castle',side,value:castle,y:this.screenAt(MAP.bases[side]).y});
    }
    for(const node of nodes)if(pointVisible(node))sprites.push({kind:'node',value:node,y:this.screenAt(node).y});
    for(const unit of state?.units||[])if(unit.alive!==false&&unit.hp>0&&entityVisible(unit))sprites.push({kind:'unit',value:unit,y:this.screenAt(unit).y});
    sprites.sort((a,b)=>a.y-b.y);
    for(const sprite of sprites) {
      if(sprite.kind==='castle')this.castle(ctx,sprite.value,sprite.side,time);
      else if(sprite.kind==='node')this.node(ctx,sprite.value,time);
      else this.unit(ctx,sprite.value,state,ui);
    }
    for(const b of state?.projectiles||[])if(pointVisible(b))this.projectile(ctx,b,state);
    for(const e of state?.effects||[])if(pointVisible(e))this.effect(ctx,e,time);
    for(let i=0;i<13;i++) {
      const px=4+((i*7.37)%(MAP.width-8)),py=1+((i*4.61)%(MAP.height-3)),p=this.screenAt(px,py);
      if(!pointVisible({x:px,y:py}))continue;
      const alpha=.15+(Math.sin(time*.8+i*1.7)+1)*.15;
      ctx.globalAlpha=alpha;ellipse(ctx,p.x+Math.sin(time*.5+i)*s*.35,p.y-s*(.4+Math.cos(time*.4+i)*.15),1.2,1.2,'#a9ffd4');
    }
    ctx.globalAlpha=1;
    if(this.shotTimes.size>400) {
      const alive=new Set((state?.units||[]).map(u=>u.id));
      for(const id of this.shotTimes.keys())if(!alive.has(id))this.shotTimes.delete(id);
    }
    // Delicate edge lines keep the artwork integrated with its surrounding HUD.
    const border=ctx.createLinearGradient(0,0,w,0);border.addColorStop(0,'#a8d6c000');border.addColorStop(.5,'#adddc425');border.addColorStop(1,'#a8d6c000');
    ctx.strokeStyle=border;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w*.08,h-1);ctx.lineTo(w*.92,h-1);ctx.stroke();
    this.applyFog(state,viewerSide,sources);
  }
}
