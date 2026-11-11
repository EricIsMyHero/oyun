/* Restore only role labels explicitly superseded by the user-requested audit.
   Historical snapshots continue protecting every other field unchanged. */
const audit=require('../data/card-role-audit.json');
const records=new Map(audit.records.map(row=>[row.key,row]));
function restoreHistoricalRoles(card,key=card.id){
 const out=structuredClone(card);
 function visit(c,path){const row=records.get(path);if(!row)throw Error('Missing audited role history: '+path);for(const field of['class','subclass']){if(Object.hasOwn(row.before,field))c[field]=row.before[field];else delete c[field];}for(let i=0;i<(c.forms||[]).length;i++)visit(c.forms[i],path+'/forms/'+i);for(const field of['type1','type2','upgradedsecondForm'])if(c[field])visit(c[field],path+'/'+field);}
 visit(out,key);return out;
}
module.exports={restoreHistoricalRoles};
