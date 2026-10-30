import { RULES } from './rules.mjs';

// Team sight is independent of the authored card Vision combat statistic.
// Fog has no explored-memory layer: losing the last source hides the area again.
export const VISION = Object.freeze({ card:8, pump:4, castle:RULES.castleRange });

const validSide = side => side === 0 || side === 1;
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
const living = entity => entity && entity.alive !== false && (entity.hp == null || entity.hp > 0);
const concealed = (entity,time) => (entity.statuses || []).some(status =>
  ['invisible','untargetable','imprisonment'].includes(status.kind) && status.until > time);

export function visibilitySources(state,side) {
  if (!state || !validSide(side)) return [];
  const sources=[];
  for (const castle of state.castles || []) {
    if (castle.side === side && living(castle) && finitePoint(castle)) sources.push({x:castle.x,y:castle.y,radius:VISION.castle});
  }
  for (const unit of state.units || []) {
    if (unit.side === side && living(unit) && finitePoint(unit)) sources.push({x:unit.x,y:unit.y,radius:VISION.card});
  }
  for (const node of state.nodes || []) {
    if (node.owner === side && finitePoint(node)) sources.push({x:node.x,y:node.y,radius:VISION.pump});
  }
  return sources;
}

export function isPointVisible(state,side,point,sources=null) {
  if (!finitePoint(point)) return false;
  return (sources || visibilitySources(state,side)).some(source =>
    Math.hypot(point.x-source.x,point.y-source.y) <= source.radius + 1e-9);
}

export function isEntityVisible(state,side,entity,sources=null) {
  if (!state || !validSide(side) || !finitePoint(entity) || !living(entity)) return false;
  if (entity.side === side) return true;
  return !concealed(entity,state.time || 0) && isPointVisible(state,side,entity,sources);
}
