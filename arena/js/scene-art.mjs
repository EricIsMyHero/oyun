import { ARENAS } from './map.mjs';
import { projectPoint, transformWorld } from './projection.mjs';
import { RULES, clamp } from './rules.mjs';

const url=name=>new URL(`../assets/${name}`,import.meta.url).href;
export const STRUCTURES=url('sprites/arena-structures.webp');
export const LAVA_SURFACE=url('materials/molten-lava.webp');
// The source coordinates are measured at the centers of the painted stone
// rings, not the front edge of the court or the bottom of a sprite.
export function guidePoint(map,point,width=1536,height=1024) {
  if(map.projection==='portrait')return {x:(point.y+2)/(map.height+4)*width,y:(map.width+2-point.x)/(map.width+4)*height};
  const scale=1536/75;
  return {x:40.96+(point.x+point.y)*scale,y:588.8+(point.y-point.x)*scale*.5};
}
function anchor(map,source,world,width,height) {
  const p=guidePoint(map,world,width,height);return [...source,p.x,p.y];
}
function landmarks(id,sources,width,height) {
  const map=ARENAS[id],points=[...map.bases,...(map.nodes.length?map.nodes:[map.center])];
  return sources.map((source,i)=>anchor(map,source,points[i],width,height));
}
export const PAINTED_BRIDGES=Object.freeze([
  {lane:0,ends:[{x:23.5,y:4},{x:28,y:4}],source:[[590,367],[682,312]],walkway:[[562,357],[615,385],[702,326],[659,300]]},
  {lane:2,ends:[{x:16,y:24},{x:19.5,y:24}],source:[[846,687],[928,651]],walkway:[[827,673],[861,708],[950,667],[910,637]]},
]);
export const SCENES=Object.freeze({
  verdant:{url:url('maps/verdant-basin.webp?v=50'),width:1536,height:1024,
    anchors:[...landmarks('verdant',[[332,722],[1145,302],[528,392],[760,505],[982,636]],1536,1024),
      [240,605,327.68,609.28],[265,515,348.16,517.12],[780,265,778.24,302.08],
      ...PAINTED_BRIDGES.flatMap(bridge=>bridge.source.map((source,i)=>anchor(ARENAS.verdant,source,bridge.ends[i],1536,1024)))]},
  waterfall:{url:url('maps/cascade-hollow.webp'),width:1024,height:1536,
    anchors:landmarks('waterfall',[[512,1274],[512,254],[352,771]],1024,1536)},
  lava:{url:url('maps/ember-rift.webp'),width:1024,height:1536,
    anchors:landmarks('lava',[[512,1322],[512,196],[512,776]],1024,1536)},
  swamp:{url:url('maps/hollowfen.webp'),width:1024,height:1536,
    anchors:[...landmarks('swamp',[[244,1317],[750,198],[492,766]],1024,1536),
      anchor(ARENAS.swamp,[819,1330],ARENAS.swamp.portals[0],1024,1536),anchor(ARENAS.swamp,[180,220],ARENAS.swamp.portals[1],1024,1536)]},
  prison:{url:url('maps/ironveil-prison.webp'),width:1024,height:1536,
    anchors:[...landmarks('prison',[[512,1313],[512,202],[174,751],[850,751]],1024,1536),anchor(ARENAS.prison,[512,749],ARENAS.prison.center,1024,1536),
      ...[[343,829],[680,829],[343,707],[680,707]].map((p,i)=>anchor(ARENAS.prison,p,ARENAS.prison.gates[i+1],1024,1536))]},
});

// Local atlas-cell pixels, measured by fitting the stone base's lower ellipse.
// A sprite's bottom is its front rim, not the center of its ground footprint.
export const STRUCTURE_FRAMES=Object.freeze({
  blue:{column:0,row:0,ground:{x:313,y:441.2},glow:{x:313,y:140}},
  red:{column:1,row:0,ground:{x:313,y:442.75},glow:{x:313,y:140}},
  pump:{column:0,row:1,ground:{x:314,y:485.66},glow:{x:314,y:100}},
  shrine:{column:1,row:1,ground:{x:311,y:451.61},glow:{x:313,y:195}},
});
export function structurePlacement(map,view,kind,point,side,atlasSize=1254) {
  const castle=kind==='castle',frame=castle?STRUCTURE_FRAMES[side===0?'blue':'red']:STRUCTURE_FRAMES[map.theme==='waterfall'?'shrine':'pump'];
  const cell=atlasSize/2,k=cell/627,inset=3*k,source={x:frame.column*cell+inset,y:frame.row*cell+inset,width:cell-6*k,height:cell-(castle?24:6)*k};
  const size=view.scale*(castle?(map.theme==='waterfall'?4.7:6):map.theme==='waterfall'?2.7:3.6),scale=size/source.width,p=projectPoint(view,point);
  const rect={x:p.x-(frame.ground.x-3)*k*scale,y:p.y-(frame.ground.y-3)*k*scale,width:size,height:source.height*scale};
  const glow={x:rect.x+(frame.glow.x-3)*k*scale,y:rect.y+(frame.glow.y-3)*k*scale};
  return {frame,source,rect,glow,size,ground:p};
}

// A small registration mesh puts painted pads precisely under simulation
// anchors. Only the cached terrain uses this; no combat positions are warped.
const cross=(a,b,c)=>(b.sx-a.sx)*(c.sy-a.sy)-(b.sy-a.sy)*(c.sx-a.sx);
function circumcircle(a,b,c,p) {
  const ax=a.sx-p.sx,ay=a.sy-p.sy,bx=b.sx-p.sx,by=b.sy-p.sy,cx=c.sx-p.sx,cy=c.sy-p.sy;
  const det=(ax*ax+ay*ay)*(bx*cy-by*cx)-(bx*bx+by*by)*(ax*cy-ay*cx)+(cx*cx+cy*cy)*(ax*by-ay*bx);
  return cross(a,b,c)>0?det>1e-7:det< -1e-7;
}
const meshes=new WeakMap();
export function registrationMesh(scene) {
  if(meshes.has(scene))return meshes.get(scene);
  const {width:w,height:h}=scene;
  const points=[[0,0,0,0],[w,0,w,0],[w,h,w,h],[0,h,0,h],...scene.anchors].map(([sx,sy,tx,ty])=>({sx,sy,tx,ty}));
  const count=points.length,extent=Math.max(w,h)*10;
  points.push({sx:-extent,sy:-extent},{sx:extent*3,sy:-extent},{sx:-extent,sy:extent*3});
  let triangles=[[count,count+1,count+2]];
  for(let i=0;i<count;i++){
    const bad=triangles.filter(t=>circumcircle(...t.map(j=>points[j]),points[i])),edges=new Map();
    for(const t of bad)for(let k=0;k<3;k++){
      const a=t[k],b=t[(k+1)%3],key=[a,b].sort((x,y)=>x-y).join(':');
      if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);
    }
    triangles=triangles.filter(t=>!bad.includes(t));
    for(const [a,b]of edges.values())if(Math.abs(cross(points[a],points[b],points[i]))>1e-7)triangles.push([a,b,i]);
  }
  const mesh=triangles.filter(t=>t.every(i=>i<count)).map(t=>t.map(i=>points[i]));
  meshes.set(scene,mesh);return mesh;
}
export function scenePoint(map,view,scene,x,y) {
  if(map.projection==='portrait'){
    return projectPoint(view,{x:map.width+2-y/scene.height*(map.width+4),y:-2+x/scene.width*(map.height+4)});
  }
  const scale=1536/(43+28+4),ox=40.96,oy=588.8;
  return {x:view.ox+(x-ox)/scale*view.scale,y:view.oy+(y-oy)/scale*view.scale};
}
function drawTriangle(ctx,image,source,target) {
  const [a,b,c]=source,[p,q,r]=target,det=(b.sx-a.sx)*(c.sy-a.sy)-(c.sx-a.sx)*(b.sy-a.sy);
  if(Math.abs(det)<1e-8)return;
  const m11=((q.x-p.x)*(c.sy-a.sy)-(r.x-p.x)*(b.sy-a.sy))/det;
  const m12=((q.y-p.y)*(c.sy-a.sy)-(r.y-p.y)*(b.sy-a.sy))/det;
  const m21=((r.x-p.x)*(b.sx-a.sx)-(q.x-p.x)*(c.sx-a.sx))/det;
  const m22=((r.y-p.y)*(b.sx-a.sx)-(q.y-p.y)*(c.sx-a.sx))/det;
  ctx.save();ctx.beginPath();
  const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
  target.forEach((v,i)=>{const length=Math.hypot(v.x-center.x,v.y-center.y)||1,x=v.x+(v.x-center.x)/length*.45,y=v.y+(v.y-center.y)/length*.45;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.clip();
  ctx.transform(m11,m12,m21,m22,p.x-m11*a.sx-m21*a.sy,p.y-m12*a.sx-m22*a.sy);ctx.drawImage(image,0,0);ctx.restore();
}
export function paintScene(renderer) {
  const scene=SCENES[renderer.map.id],image=renderer.image(scene.url);if(!image)return false;
  const ctx=renderer.background.getContext('2d'),view=renderer.view;
  ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.fillStyle='#10212b';ctx.fillRect(0,0,view.width,view.height);ctx.imageSmoothingQuality='high';
  for(const triangle of registrationMesh(scene))drawTriangle(ctx,image,triangle,triangle.map(p=>scenePoint(renderer.map,view,scene,p.tx,p.ty)));
  return true;
}
function ring(renderer,ctx,point,radius,color,progress=1) {
  ctx.save();transformWorld(ctx,renderer.view);ctx.beginPath();ctx.arc(point.x,point.y,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(progress,.001,1));ctx.strokeStyle=color;ctx.lineWidth=.045;ctx.stroke();ctx.restore();
}
export function paintStructure(renderer,ctx,kind,entity,side,time) {
  const image=renderer.image(STRUCTURES);if(!image)return false;
  const s=renderer.view.scale,point=kind==='castle'?renderer.map.bases[side]:entity,castle=kind==='castle';
  const {source,rect,glow,size,ground:p}=structurePlacement(renderer.map,renderer.view,kind,point,side,image.naturalWidth);
  const color=side===0?'#69d6ff':side===1?'#ff8068':'#89f4ed',destroyed=castle&&entity?.hp<=0;
  ring(renderer,ctx,point,castle?renderer.map.castleRadius+.14:1.25,color+'72');
  ctx.save();ctx.imageSmoothingQuality='high';
  if(destroyed){ctx.filter='grayscale(1) brightness(.35)';ctx.globalAlpha=.8;}
  ctx.drawImage(image,source.x,source.y,source.width,source.height,rect.x,rect.y,rect.width,rect.height);ctx.restore();
  // Ownership light follows the crystal; both it and the labels share the
  // sprite placement instead of separate bottom-of-image offsets.
  const radius=size*(castle ? .18 : .22),pulse=.7+Math.sin(time*2.4+point.x)*.12;
  if(!destroyed){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=pulse*.33;
    const light=ctx.createRadialGradient(glow.x,glow.y,0,glow.x,glow.y,radius);light.addColorStop(0,color);light.addColorStop(1,color+'00');ctx.fillStyle=light;ctx.fillRect(glow.x-radius,glow.y-radius,radius*2,radius*2);ctx.restore();
  }
  if(castle){
    const hp=entity?.hp??RULES.castleHealth,max=entity?.maxHp??RULES.castleHealth,labelY=renderer.camera.active?rect.y-s*.35:Math.max(rect.y-s*.35,16+s*.35),width=clamp(s*4.6,64,116);
    ctx.save();ctx.textAlign='center';ctx.font=`600 ${clamp(s*.35,9,12)}px system-ui,sans-serif`;ctx.fillStyle='#e9eadb';ctx.shadowColor='#07121d';ctx.shadowBlur=5;
    ctx.fillText(side?'CRIMSON CROWN':'AZURE CORE',p.x,labelY-s*.35);renderer.healthBar(ctx,p.x,labelY,width,hp/max,color,5);ctx.fillText(String(Math.ceil(Math.max(0,hp))),p.x,labelY+16);ctx.restore();
    if(destroyed){ctx.save();ctx.globalAlpha=.4;ctx.fillStyle='#17202e';ctx.beginPath();ctx.ellipse(p.x,p.y-size*.1,size*.35,size*.09,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  }else{
    if(entity.capturing!=null&&entity.progress>0)ring(renderer,ctx,point,1.38,entity.capturing===0?'#a8e8ff':'#ffc09e',entity.progress/RULES.captureTime);
    ctx.save();ctx.textAlign='center';ctx.font=`600 ${clamp(s*.28,8,11)}px system-ui,sans-serif`;ctx.fillStyle='#e1f5ec';ctx.shadowColor='#102525';ctx.shadowBlur=5;
    ctx.fillText(side===0?'+2% BLUE':side===1?'+2% RED':'CAPTURE',p.x,rect.y+rect.height+s*.28);ctx.restore();
  }
  return true;
}

// A muted extension of the same painting frames portrait previews on wide
// screens. It is decorative only; active battles still use the fogged world.
export function paintPreviewBackdrop(renderer,ctx,view) {
  if(renderer.camera.active||renderer.map.projection!=='portrait')return;
  const scene=SCENES[renderer.map.id],image=renderer.image(scene.url);if(!image)return;
  const width=Math.ceil(view.width/3),height=Math.ceil(view.height/3),key=`${renderer.map.id}:${width}:${height}`;
  if(renderer.backdropKey!==key){
    const canvas=renderer.backdrop||document.createElement('canvas');canvas.width=width;canvas.height=height;
    const c=canvas.getContext('2d'),scale=Math.max(width/image.width,height/image.height);c.filter='blur(9px) brightness(.32) saturate(.65)';
    c.drawImage(image,(width-image.width*scale)/2,(height-image.height*scale)/2,image.width*scale,image.height*scale);
    renderer.backdrop=canvas;renderer.backdropKey=key;
  }
  ctx.drawImage(renderer.backdrop,0,0,view.width,view.height);
}
