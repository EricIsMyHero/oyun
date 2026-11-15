import { MAP } from './map.mjs';
import { framedView, unprojectPoint, crossScaleFor } from './projection.mjs';
import { clamp } from './rules.mjs';

export const CAMERA = Object.freeze({ minZoom:.5, maxZoom:1.6, zoomSteps:Object.freeze([.5,.6,.7,.75,.8,.9,1,1.2,1.4,1.6]), desktopSpan:32, mobileSpan:18 });

/** Camera coordinates are presentation only; simulation positions stay in tiles. */
export class ArenaCamera {
  constructor(width=960,height=600,map=MAP) {
    this.map=map;this.width=width;this.height=height;this.active=false;this.zoom=1;
    this.center={x:this.map.width/2,y:this.map.height/2};
  }
  setMap(map) {this.map=map;this.setActive(this.active);}
  resize(width,height) {this.width=Math.max(1,width);this.height=Math.max(1,height);}
  setActive(active) {
    this.active=!!active;this.zoom=1;
    if(this.active)this.home();
    else {this.zoom=1;this.center={x:this.map.width/2,y:this.map.height/2};}
  }
  get baseScale() {
    const span=this.width<600?CAMERA.mobileSpan:CAMERA.desktopSpan;
    return this.map.projection==='portrait'?Math.max(this.width/(Math.min(span,this.map.height+2)*crossScaleFor(this.map)),this.height/18):Math.max(this.width/span,this.height/22);
  }
  get view() {
    const extent=this.map.width+this.map.height,portrait=this.map.projection==='portrait';
    const scale=this.active?this.baseScale*this.zoom:portrait?Math.min(this.width/((this.map.height+4)*crossScaleFor(this.map)),this.height/(this.map.width+4)):Math.min(this.width/(extent+4),this.height/(extent*.5+6));
    return framedView(this.map,this.width,this.height,scale,this.center);
  }

  focus(point) {
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return;
    this.center={x:clamp(point.x,0,this.map.width),y:clamp(point.y,0,this.map.height)};
  }
  home(side=0) {
    const base=this.map.bases[side===1?1:0];
    this.focus({x:base.x+(side===1?-4:4),y:base.y});
  }
  worldAt(x,y) {
    return unprojectPoint(this.view,x,y);
  }
  panBy(dx,dy) {
    if(!this.active||!Number.isFinite(dx)||!Number.isFinite(dy))return;
    const before=this.worldAt(0,0),after=this.worldAt(dx,dy);
    this.focus({x:this.center.x+before.x-after.x,y:this.center.y+before.y-after.y});
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
