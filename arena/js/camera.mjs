import { MAP } from './map.mjs';
import { clamp } from './rules.mjs';

export const CAMERA = Object.freeze({ minZoom:.5, maxZoom:1.6, zoomSteps:Object.freeze([.5,.6,.7,.75,.8,.9,1,1.2,1.4,1.6]), desktopSpan:32, mobileSpan:18 });

/** Camera coordinates are presentation only; simulation positions stay in tiles. */
export class ArenaCamera {
  constructor(width=960,height=600) {
    this.width=width;this.height=height;this.active=false;this.zoom=1;
    this.center={x:MAP.width/2,y:MAP.height/2};
  }
  resize(width,height) {this.width=Math.max(1,width);this.height=Math.max(1,height);}
  setActive(active) {
    this.active=!!active;this.zoom=1;
    if(this.active)this.home();
    else {this.zoom=1;this.center={x:MAP.width/2,y:MAP.height/2};}
  }
  get baseScale() {
    const span=this.width<600?CAMERA.mobileSpan:CAMERA.desktopSpan;
    return Math.max(this.width/span,this.height/22);
  }
  get view() {
    const extent=MAP.width+MAP.height;
    const scale=this.active?this.baseScale*this.zoom:Math.min(this.width/(extent+4),this.height/(extent*.5+6));
    return {width:this.width,height:this.height,scale,
      ox:this.width/2-(this.center.x+this.center.y)*scale,
      oy:this.height/2-(this.center.y-this.center.x)*scale*.5};
  }
  focus(point) {
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    this.center={x:clamp(point.x,0,MAP.width),y:clamp(point.y,0,MAP.height)};
  }
  home(side=0) {
    const base=MAP.bases[side===1?1:0];
    this.focus({x:base.x+(side===1?-4:4),y:base.y});
  }
  worldAt(x,y) {
    const {scale,ox,oy}=this.view,a=(x-ox)/scale,b=(y-oy)/(scale*.5);
    return {x:(a-b)*.5,y:(a+b)*.5};
  }
  panBy(dx,dy) {
    if(!this.active||!Number.isFinite(dx)||!Number.isFinite(dy))return;
    const s=this.view.scale;
    this.focus({x:this.center.x-(dx/s-dy/(s*.5))*.5,y:this.center.y-(dx/s+dy/(s*.5))*.5});
  }
  setZoom(zoom,anchor={x:this.width/2,y:this.height/2}) {
    if(!this.active||!Number.isFinite(zoom)||zoom<=0)return;
    const before=this.worldAt(anchor.x,anchor.y);
    this.zoom=clamp(zoom,CAMERA.minZoom,CAMERA.maxZoom);
    const after=this.worldAt(anchor.x,anchor.y);
    this.focus({x:this.center.x+before.x-after.x,y:this.center.y+before.y-after.y});
  }
  zoomBy(factor,anchor) {
    if(!Number.isFinite(factor)||factor<=0)return;
    this.setZoom(this.zoom*factor,anchor);
  }
  zoomStep(direction,anchor) {
    if(!Number.isFinite(direction)||direction===0)return;
    const steps=direction>0?CAMERA.zoomSteps:[...CAMERA.zoomSteps].reverse();
    const next=steps.find(zoom=>direction>0?zoom>this.zoom+1e-9:zoom<this.zoom-1e-9);
    if(next!=null)this.setZoom(next,anchor);
  }
}
