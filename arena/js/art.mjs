// Resolution-independent scenery. All vegetation is painted into the terrain
// atlas once; animation and simulation never rebuild these drawing paths.
const path=(ctx,points)=>{ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();};
const oval=(ctx,x,y,rx,ry,fill)=>{ctx.beginPath();ctx.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();};
const randomFor=seed=>()=>{seed=(Math.imul(seed|0,1664525)+1013904223)>>>0;return seed/4294967296;};

export function paintTree(ctx,x,y,height,tone,lean=0) {
  const random=randomFor(Math.round(x*29+y*71+height*53)),width=height*.45;
  const shadow=ctx.createRadialGradient(x+width*.26,y+height*.025,1,x+width*.26,y+height*.025,width*.9);
  shadow.addColorStop(0,'#061b18a3');shadow.addColorStop(1,'#10291b00');
  oval(ctx,x+width*.23,y+height*.04,width*.95,height*.18,shadow);
  const trunk=ctx.createLinearGradient(x-width*.1,0,x+width*.1,0);
  trunk.addColorStop(0,'#302e21');trunk.addColorStop(.35,'#8c7250');trunk.addColorStop(1,'#433e2a');
  path(ctx,[[x-width*.09,y],[x-width*.055+lean,y-height*.58],[x+width*.055+lean,y-height*.58],[x+width*.105,y]]);
  ctx.fillStyle=trunk;ctx.fill();
  for(let k=0;k<4;k++){
    path(ctx,[[x,y-height*.09],[x+(k-1.5)*width*.16,y+height*.015],[x+(k-1.5)*width*.08,y-height*.025]]);ctx.fillStyle='#514c30';ctx.fill();
  }
  const cool=tone<.48;
  if(tone>.88){
    // Broadleaf trees break up the silhouettes of the evergreen forest.
    for(let layer=0;layer<3;layer++)for(let i=0;i<8;i++){
      const angle=i*Math.PI/4+layer*.6,radius=width*(.5-layer*.1),cx=x+Math.cos(angle)*radius+lean,cy=y-height*(.48+layer*.17)+Math.sin(angle)*radius*.44;
      const r=width*(.35+random()*.12),leaf=ctx.createRadialGradient(cx-r*.3,cy-r*.55,0,cx,cy,r);
      leaf.addColorStop(0,layer===2?'#a7b15f':'#7e9950');leaf.addColorStop(.45,'#4f783c');leaf.addColorStop(1,'#234e32');
      oval(ctx,cx,cy,r,r*.77,leaf);
    }
  }else{
    for(let tier=5;tier>=0;tier--){
      const tip=y-height*(1-tier*.12),bottom=y-height*(.47-tier*.063),spread=width*(.3+tier*.14),cx=x+lean*(1-tier*.12);
      const points=[[cx,tip]];
      for(let k=0;k<6;k++){
        const t=(k+1)/6,edge=cx-spread*t*(.82+random()*.15);
        points.push([edge,tip+(bottom-tip)*t],[edge+spread*.095,tip+(bottom-tip)*t-height*.018]);
      }
      points.push([cx-spread*.62,bottom+height*.035],[cx,bottom+height*.055],[cx+spread*.65,bottom+height*.025]);
      for(let k=5;k>=0;k--){const t=(k+1)/6;points.push([cx+spread*t*(.84+random()*.12),tip+(bottom-tip)*t],[cx+spread*(t-.14),tip+(bottom-tip)*t-height*.022]);}
      path(ctx,points);
      const canopy=ctx.createLinearGradient(cx-spread,tip,cx+spread*.65,bottom);
      canopy.addColorStop(0,cool?'#7ba16a':'#9ca264');canopy.addColorStop(.28,cool?'#467c52':'#638449');canopy.addColorStop(.65,cool?'#285e43':'#3d6a3e');canopy.addColorStop(1,'#173f32');
      ctx.fillStyle=canopy;ctx.fill();
      ctx.save();ctx.clip();
      path(ctx,[[cx,tip],[cx+spread*1.2,bottom],[cx+spread*.05,bottom+height*.07],[cx-spread*.07,tip+height*.2]]);ctx.fillStyle='#123a2e45';ctx.fill();
      for(let k=0;k<18;k++){
        const t=.25+random()*.7,branch=spread*t,px=cx+(random()-.58)*branch*1.8,py=tip+(bottom-tip)*t;
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-branch*.12,py+height*.025);
        ctx.strokeStyle=k%3?'#b0c38633':'#092f2b32';ctx.lineWidth=Math.max(.45,height*.008);ctx.stroke();
      }
      ctx.restore();
      ctx.beginPath();ctx.moveTo(cx,tip+height*.012);ctx.lineTo(cx-spread*.22,tip+(bottom-tip)*.44);
      ctx.strokeStyle='#d4dda56e';ctx.lineWidth=Math.max(.5,height*.009);ctx.stroke();
    }
  }
  for(let i=0;i<5;i++){
    const px=x+(random()-.5)*width*.6,py=y+(random()-.5)*height*.07;
    oval(ctx,px,py,width*.11,height*.025,i%2?'#668448':'#7c9553');
  }
}

export function paintRock(ctx,x,y,size) {
  oval(ctx,x+size*.15,y+size*.18,size*1.15,size*.4,'#10281e50');
  path(ctx,[[x-size,y],[x-size*.78,y-size*.65],[x-size*.25,y-size],[x+size*.55,y-size*.86],[x+size,y-size*.2],[x+size*.65,y+size*.3],[x-size*.32,y+size*.25]]);
  const material=ctx.createLinearGradient(x-size,y-size,x+size,y+size*.3);
  material.addColorStop(0,'#bac3ab');material.addColorStop(.4,'#8c9d8b');material.addColorStop(1,'#425c56');ctx.fillStyle=material;ctx.fill();
  path(ctx,[[x-size*.78,y-size*.65],[x-size*.25,y-size],[x+size*.55,y-size*.86],[x+size*.2,y-size*.25],[x-size*.35,y-size*.19]]);ctx.fillStyle='#c7c8a665';ctx.fill();
  path(ctx,[[x+size*.2,y-size*.25],[x+size*.55,y-size*.86],[x+size,y-size*.2],[x+size*.65,y+size*.3]]);ctx.fillStyle='#3e5b5966';ctx.fill();
  ctx.beginPath();ctx.moveTo(x-size*.25,y-size*.82);ctx.lineTo(x-size*.17,y-size*.39);ctx.lineTo(x-size*.45,y-size*.12);ctx.strokeStyle='#40584b80';ctx.lineWidth=Math.max(.5,size*.055);ctx.stroke();
  oval(ctx,x-size*.45,y-size*.1,size*.4,size*.13,'#6a894b');oval(ctx,x-size*.5,y-size*.16,size*.23,size*.07,'#a2ad68');
}

export function paintFern(ctx,x,y,size,tone=0) {
  ctx.lineCap='round';
  for(let i=-2;i<=2;i++){
    const dx=i*size*.28,dy=-size*(.7+Math.cos(i)*.2);
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+dx*.4,y-size*.6,x+dx,y+dy);
    ctx.strokeStyle=tone>.75?'#a5b964':'#759e57';ctx.lineWidth=Math.max(.5,size*.06);ctx.stroke();
    for(let k=1;k<5;k++){
      const t=k/5,px=x+dx*t,py=y+dy*t;
      path(ctx,[[px,py],[px-size*.17*(1-t),py-size*.12],[px,py+size*.08],[px+size*.16*(1-t),py-size*.1]]);
      ctx.fillStyle=k%2?'#82a85e':'#547d47';ctx.fill();
    }
  }
}
