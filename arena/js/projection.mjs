// Presentation transforms only. Combat coordinates and distances stay in tiles.
const ISOMETRIC=Object.freeze({a:1,b:-.5,c:1,d:.5});
export const crossScaleFor=map=>(map.width+4)/(map.height+4)*2/3;
export const basisFor=map=>map.projection==='portrait'?{a:0,b:-1,c:crossScaleFor(map),d:0}:ISOMETRIC;
export function projectPoint(view,point,z=0) {
  const {a,b,c,d}=view.basis||ISOMETRIC,s=view.scale;
  return {x:view.ox+(a*point.x+c*point.y)*s,y:view.oy+(b*point.x+d*point.y-z)*s};
}
export function projectDirection(view,direction) {
  const {a,b,c,d}=view.basis||ISOMETRIC,x=a*direction.x+c*direction.y,y=b*direction.x+d*direction.y,length=Math.hypot(x,y)||1;
  return {x:x/length,y:y/length};
}
export function unprojectPoint(view,x,y) {
  const {a,b,c,d}=view.basis||ISOMETRIC,det=a*d-b*c;
  const px=(x-view.ox)/view.scale,py=(y-view.oy)/view.scale;
  return {x:(d*px-c*py)/det,y:(a*py-b*px)/det};
}
export function transformWorld(ctx,view) {
  const {a,b,c,d}=view.basis||ISOMETRIC,s=view.scale;
  ctx.transform(a*s,b*s,c*s,d*s,view.ox,view.oy);
}
export function framedView(map,width,height,scale,center={x:map.width/2,y:map.height/2}) {
  const basis=basisFor(map),{a,b,c,d}=basis;
  return {width,height,scale,basis,ox:width/2-(a*center.x+c*center.y)*scale,oy:height/2-(b*center.x+d*center.y)*scale};
}
export function atlasView(map,scale,dpr=1) {
  const portrait=map.projection==='portrait';
  const width=Math.ceil((portrait?(map.height+4)*crossScaleFor(map):map.width+map.height+4)*scale);
  const height=Math.ceil((portrait?map.width+4:(map.width+map.height)*.5+6)*scale);
  return {...framedView(map,width,height,scale),dpr};
}
