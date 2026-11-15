import { projectPoint, transformWorld } from './projection.mjs';
import { SCENES, LAVA_SURFACE } from './scene-art.mjs';
// Cached, tile-aligned arena artwork; animated hazards are painted separately.
const polygon=(ctx,points,fill,stroke=null,width=1)=>{
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
};
const ellipse=(ctx,p,rx,ry,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);ctx.fill();};
const seeded=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rectPoints=(rect)=>[{x:rect.minX,y:rect.minY},{x:rect.maxX,y:rect.minY},{x:rect.maxX,y:rect.maxY},{x:rect.minX,y:rect.maxY}];
function paving(r,ctx,route,random,lava) {
  const s=r.view.scale;
  r.worldLine(ctx,route,r.map.roadWidth+.55,lava?'#20242d':'#233f45');
  r.worldLine(ctx,route,r.map.roadWidth+.24,lava?'#6f5d57':'#747e74');
  r.worldLine(ctx,route,r.map.roadWidth,lava?'#4c4647':'#88918a');
  for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i],length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
    for(let d=.25;d<length;d+=.55)for(let row=-1;row<=1;row++){
      const offset=row*.61,at=(u,v)=>r.screenAt(a.x+dx*(d+u)-dy*(offset+v),a.y+dy*(d+u)+dx*(offset+v));
      polygon(ctx,[at(-.23,-.26),at(.24,-.23),at(.22,.25),at(-.22,.23)],lava?['#605658','#70625e','#595259'][Math.floor(random()*3)]:['#9fa797','#adb3a2','#8f9e95'][Math.floor(random()*3)],lava?'#302e38':'#4a6669',s*.024);
    }
  }
}
function river(r,ctx,strong=false) {
  const width=r.map.waterWidth;
  r.worldLine(ctx,r.river,width+.45,'#243f50');
  r.worldLine(ctx,r.river,width+.16,'#64999e');
  r.worldLine(ctx,r.river,width,strong?'#388eae':'#286c83');
  r.worldLine(ctx,r.river,width*.64,strong?'#75dded':'#51b0bb');
  r.worldLine(ctx,r.river,width*.27,strong?'#d3ffff':'#93d4d2');
}
export function paintBiome(r) {
  const {map,view}=r,ctx=r.background.getContext('2d'),{width:w,height:h,scale:s,dpr}=view,lava=map.theme==='lava',random=seeded(lava?731:319);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sky=ctx.createLinearGradient(0,0,w,h);sky.addColorStop(0,lava?'#211c2b':'#102b3c');sky.addColorStop(1,lava?'#0c1421':'#091d2b');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  const shore=r.shore.map(p=>r.screenAt(p));
  for(let depth=2.5;depth>0;depth-=.4)polygon(ctx,shore.map(p=>({x:p.x,y:p.y+s*depth})),depth>1.5?'#172331':lava?'#3e3640':'#3c535f','#172737',s*.09);
  const earth=ctx.createLinearGradient(0,h*.15,w,h*.85);earth.addColorStop(0,lava?'#51434c':'#385a60');earth.addColorStop(.5,lava?'#6c5351':'#547565');earth.addColorStop(1,lava?'#302e3e':'#233e4c');
  polygon(ctx,shore,earth,lava?'#746269':'#68817b',s*.13);
  ctx.save();polygon(ctx,shore);ctx.clip();
  // Fine terrain grain and clustered mineral patches, kept off the roads.
  for(let i=0;i<1300;i++){
    const p=r.screenAt(random()*map.width,random()*map.height);
    ellipse(ctx,p,s*(.025+random()*.08),s*.03,i%3===0?(lava?'#f2b78518':'#b4dfb425'):'#06182630');
  }
  for(const route of map.routes)paving(r,ctx,route,random,lava);
  if(lava){
    const basin=rectPoints(map.plaza).map(p=>r.screenAt(p));
    polygon(ctx,basin,'#252938','#847076',s*.15);
    const inset={minX:map.plaza.minX+.18,maxX:map.plaza.maxX-.18,minY:map.plaza.minY+.18,maxY:map.plaza.maxY-.18};
    polygon(ctx,rectPoints(inset).map(p=>r.screenAt(p)),'#383443','#111f30',s*.09);
    // Channels feed the depressed central basin from both volcanic sides.
    for(const side of [-1,1]){
      const path=[{x:map.center.x+side*3,y:side<0?-.8:map.height+.8},{x:map.center.x+side*2,y:map.center.y+side*5},{x:map.center.x,y:map.center.y+side*2.5}];
      r.worldLine(ctx,path,1.3,'#211e2b');r.worldLine(ctx,path,.82,'#ae3b28');r.worldLine(ctx,path,.4,'#f78937');r.worldLine(ctx,path,.09,'#ffdd80');
    }
    const center=r.screenAt(map.center);
    for(const radius of [1.35,1.05,.7]){ctx.beginPath();ctx.ellipse(center.x,center.y,s*radius,s*radius*.5,0,0,Math.PI*2);ctx.strokeStyle=radius===1.05?'#bc9da6':'#706077';ctx.lineWidth=s*.04;ctx.stroke();}
    for(let x=map.plaza.minX+.3;x<map.plaza.maxX;x+=.65)r.block(ctx,x,map.plaza.minY-.17,.45,.25,.16,'#72646a','#403a48','#988081');
    for(let x=map.plaza.minX+.3;x<map.plaza.maxX;x+=.65)r.block(ctx,x,map.plaza.maxY-.08,.45,.25,.16,'#72646a','#403a48','#988081');
  }else river(r,ctx);
  for(let side=0;side<2;side++)r.courtyard(ctx,side);
  const props=[];
  for(let x=.5;x<map.width;x+=1.05)for(let y=.4;y<map.height;y+=1.1){
    const p={x:x+(random()-.5)*.6,y:y+(random()-.5)*.6},rd=r.closestRoute(p).distance;
    if(rd<1.9||r.nearCourtyard(p,.7)||map.nodes.some(n=>Math.hypot(p.x-n.x,p.y-n.y)<1.7))continue;
    if(lava&&p.x>map.plaza.minX-1&&p.x<map.plaza.maxX+1)continue;
    if(!lava&&r.riverDistance(p)<map.waterWidth/2+.55)continue;
    if(random()>.72)continue;
    props.push({p,tree:random()>(lava ? .65:.22),tone:random(),size:random()});
  }
  props.sort((a,b)=>r.screenAt(a.p).y-r.screenAt(b.p).y);
  for(const item of props){const p=r.screenAt(item.p);if(item.tree)r.tree(ctx,p.x,p.y,s*(1.5+item.size*1.7),item.tone,0);else r.rock(ctx,p.x,p.y,s*(.25+item.size*.6));}
  // Rune stones and braziers mark each route's approach to the objective.
  for(const route of map.routes)for(const fraction of [.27,.73]){
    const a=route[0],b=route.at(-1),x=a.x+(b.x-a.x)*fraction,y=route[1].y;
    for(const dy of [-1.5,1.5]){
      const p=r.screenAt(x,y+dy);r.rock(ctx,p.x,p.y,s*.3);
      ellipse(ctx,{x:p.x,y:p.y-s*.22},s*.075,s*.12,lava?'#ffb65d':'#7fe9e2');
    }
  }
  ctx.restore();
  if(!lava){
    // Water pours over the island's cliff, rather than ending at a hard edge.
    const lip=r.screenAt(19.55,21.25),fallWidth=s*1.8,drop=s*2.5;
    const curtain=ctx.createLinearGradient(lip.x,lip.y,lip.x,lip.y+drop);
    curtain.addColorStop(0,'#a4eeed');curtain.addColorStop(.25,'#53b8cf');curtain.addColorStop(.8,'#358ba699');curtain.addColorStop(1,'#8fdfed00');
    polygon(ctx,[{x:lip.x-fallWidth*.5,y:lip.y-s*.18},{x:lip.x+fallWidth*.5,y:lip.y+s*.18},{x:lip.x+fallWidth*.42,y:lip.y+drop},{x:lip.x-fallWidth*.42,y:lip.y+drop}],curtain);
    for(let i=0;i<14;i++){
      const x=lip.x-fallWidth*.46+i*fallWidth/15;
      ctx.beginPath();ctx.moveTo(x,lip.y+(i/14-.5)*s*.3);ctx.lineTo(x+s*.03,lip.y+drop*(.55+(i%4)*.1));ctx.strokeStyle='#cbffff80';ctx.lineWidth=s*.025;ctx.stroke();
    }
    const mist=ctx.createRadialGradient(lip.x,lip.y+drop*.8,0,lip.x,lip.y+drop*.8,s*1.5);mist.addColorStop(0,'#b3e8ef5c');mist.addColorStop(1,'#89ddec00');ellipse(ctx,{x:lip.x,y:lip.y+drop*.8},s*1.6,s*.8,mist);
  }else{
    // A volcanic vent gives the rift a distinct silhouette and a light source.
    const p=r.screenAt(17,1.2),height=s*2.5;
    polygon(ctx,[{x:p.x-s*1.5,y:p.y+s*.4},{x:p.x-s*.5,y:p.y-height},{x:p.x+s*.45,y:p.y-height*.95},{x:p.x+s*1.4,y:p.y+s*.5}],'#34313f','#191e2b',s*.06);
    polygon(ctx,[{x:p.x-s*.5,y:p.y-height},{x:p.x-s*.05,y:p.y-height*.25},{x:p.x+s*.7,y:p.y+s*.2},{x:p.x+s*.1,y:p.y-height*.45},{x:p.x+s*.45,y:p.y-height*.95}],'#e85d32');
    ellipse(ctx,{x:p.x,y:p.y-height},s*.49,s*.16,'#ffc06b');
    const heat=ctx.createRadialGradient(p.x,p.y-height,0,p.x,p.y-height,s*1.8);heat.addColorStop(0,'#ff8e483a');heat.addColorStop(1,'#ff8e4800');ellipse(ctx,{x:p.x,y:p.y-height},s*1.8,s*1.8,heat);
  }
  const shade=ctx.createRadialGradient(w*.5,h*.5,s*6,w*.5,h*.5,s*(map.width+map.height)*.65);shade.addColorStop(0,'#07142000');shade.addColorStop(1,'#030e2380');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
}

// This layer is drawn beneath the exact same fog mask as the units and terrain.
// The minimap uses its own projection but the same arena state.
export function paintEnvironment(r,ctx,state,view) {
  if(r.map.theme==='forest')return;
  const {scale:s,ox,oy}=view,project=p=>projectPoint(view,p);
  const time=state?.time||0,arena=state?.arena;
  ctx.save();
  if(r.map.theme==='waterfall'){
    const strong=arena?.surge,river=r.river,painted=!!r.image(SCENES[r.map.id].url);
    // Small curved highlights follow the actual ford, with stronger foam in a surge.
    for(let i=1;i<river.length;i++){
      const a=river[i-1],b=river[i],length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
      for(let d=(time*(strong?1.5:.7))%.45;d<length;d+=strong ? .45 : .7){
        const offset=Math.sin(d*8+i*3)*r.map.waterWidth*.28,p={x:a.x+dx*d-dy*offset,y:a.y+dy*d+dx*offset};
        const start=project(p),middle=project({x:p.x+dx*.14-dy*.04,y:p.y+dy*.14+dx*.04}),end=project({x:p.x+dx*.29,y:p.y+dy*.29});
        ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo(middle.x,middle.y,end.x,end.y);ctx.strokeStyle=strong?'#e5ffff9c':'#c1eee055';ctx.lineWidth=Math.max(.5,s*(strong ? .028:.014));ctx.globalAlpha=painted ? .7 : 1;ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
  }else{
    const points=rectPoints(r.map.plaza).map(project),active=arena?.lavaActive;
    if(active){
      // A molten surface with drifting crust, branching hot seams and bubbles.
      // Its exact world rectangle is also the engine's 5 × 5 damage footprint.
      ctx.save();transformWorld(ctx,view);const basin=r.map.plaza;
      ctx.beginPath();ctx.rect(basin.minX,basin.minY,5,5);ctx.clip();
      const material=r.image(LAVA_SURFACE);
      if(material){
        r.lavaPatterns||=new WeakMap();let pattern=r.lavaPatterns.get(ctx);
        if(!pattern){pattern=ctx.createPattern(material,'repeat');r.lavaPatterns.set(ctx,pattern);}
        pattern.setTransform(new DOMMatrix([5/material.naturalWidth,0,0,5/material.naturalHeight,basin.minX+Math.sin(time*.18)*.06,basin.minY+time*.008]));
        ctx.fillStyle=pattern;ctx.fillRect(basin.minX,basin.minY,5,5);
      }else{
      const base=ctx.createLinearGradient(basin.minX,basin.minY,basin.maxX,basin.maxY);base.addColorStop(0,'#9b301e');base.addColorStop(.45,'#e56621');base.addColorStop(1,'#a83721');ctx.fillStyle=base;ctx.fillRect(basin.minX,basin.minY,5,5);
      for(let i=0;i<12;i++){
        const x=basin.minX+((i*1.731)%5),y=basin.minY+((i*2.371)%5),radius=.5+(Math.sin(time*.8+i)+1)*.28;
        const light=ctx.createRadialGradient(x,y,0,x,y,radius);light.addColorStop(0,'#ffd170b8');light.addColorStop(.5,'#ff862988');light.addColorStop(1,'#e8702000');ctx.fillStyle=light;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
      }
      for(let i=0;i<27;i++){
        const x=basin.minX+(i*1.717)%5+Math.sin(time*.3+i)*.06,y=basin.minY+(i*2.393)%5+Math.cos(time*.2+i)*.04,radius=.22+(i%4)*.055;
        ctx.beginPath();for(let k=0;k<6;k++){const angle=k*Math.PI/3,rx=x+Math.cos(angle)*radius*(.8+(k%2)*.3),ry=y+Math.sin(angle)*radius;k?ctx.lineTo(rx,ry):ctx.moveTo(rx,ry);}ctx.closePath();ctx.fillStyle=i%3===0?'#4c2828':'#612b24';ctx.fill();ctx.strokeStyle='#ff9c3a80';ctx.lineWidth=.025;ctx.stroke();
      }
      }
      for(let i=0;i<9;i++){
        const x=basin.minX+(i*1.613)%5,y=basin.minY+(i*2.213)%5,cycle=(time*.55+i*.37)%1,radius=.035+Math.sin(cycle*Math.PI)*.065;
        ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.strokeStyle=`rgba(255,224,149,${Math.sin(cycle*Math.PI)*.8})`;ctx.lineWidth=.025;ctx.stroke();
      }
      ctx.strokeStyle='#ffb25a';ctx.lineWidth=.06;ctx.strokeRect(basin.minX+.04,basin.minY+.04,4.92,4.92);ctx.restore();
    }else if(arena&&arena.nextPhaseAt-time<=5){
      ctx.globalAlpha=.2+Math.sin(time*5)*.1;polygon(ctx,points,'#ff7335','#ffbe78',Math.max(1,s*.04));ctx.globalAlpha=1;
    }
    if(!arena||arena.orb?.available){
      const p=project(r.map.center),bob=Math.sin(time*2)*s*.08;
      const glow=ctx.createRadialGradient(p.x,p.y-s*.7,0,p.x,p.y-s*.7,s*1.05);glow.addColorStop(0,'#85acff8a');glow.addColorStop(.45,'#9b7bff3d');glow.addColorStop(1,'#7ba8ff00');
      ellipse(ctx,{x:p.x,y:p.y-s*.7},s*1.05,s*1.05,glow);
      ellipse(ctx,p,s*.55,s*.24,'#161a354f');
      const at={x:p.x,y:p.y-s*.8+bob};
      const fill=ctx.createRadialGradient(at.x-s*.1,at.y-s*.15,s*.01,at.x,at.y,s*.38);fill.addColorStop(0,'#ecffff');fill.addColorStop(.3,'#77dafa');fill.addColorStop(.7,'#6d6dde');fill.addColorStop(1,'#ba8dff');
      ellipse(ctx,at,s*.35,s*.35,fill);ctx.beginPath();ctx.ellipse(at.x,at.y,s*.48,s*.17,Math.sin(time)*.5,0,Math.PI*2);ctx.strokeStyle='#95f1ff';ctx.lineWidth=Math.max(1,s*.035);ctx.stroke();
      for(let i=0;i<5;i++){const angle=time+i*Math.PI*.4;ellipse(ctx,{x:at.x+Math.cos(angle)*s*.6,y:at.y+Math.sin(angle)*s*.35},s*.035,s*.035,'#cef7ff');}
    }
  }
  ctx.restore();
}
