/* Export every root, form and partner upgrade using the live shared formula. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../js/core/passive-power.js';
import '../js/core/card-power.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),rows=[];
function walk(card,key){const details=globalThis.ClashCardPower.breakdown(card);rows.push({key,name:card.name,rarity:card.rarity,powerScore:details.score,...details});for(let i=0;i<(card.forms||[]).length;i++)walk(card.forms[i],key+'/forms/'+i);for(const field of['type1','type2','upgradedsecondForm'])if(card[field])walk(card[field],key+'/'+field);}
for(const file of fs.readdirSync(path.join(root,'rarity')).filter(f=>f.endsWith('.json')).sort())for(const card of JSON.parse(fs.readFileSync(path.join(root,'rarity',file))))walk(card,card.id||card.name);
rows.sort((a,b)=>b.powerScore-a.powerScore||a.key.localeCompare(b.key));rows.forEach((row,i)=>row.rank=i+1);
fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output/cards-with-power.json'),JSON.stringify(rows,null,2)+'\n');
console.log(`${rows.length} entries exported. Power range: ${rows.at(-1).score}–${rows[0].score} / 1000. Pending passive reviews: ${rows.filter(c=>!c.passive.reviewed).length}.`);
