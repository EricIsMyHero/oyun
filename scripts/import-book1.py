"""Import only Book1's nine new roots; existing JSON always takes precedence.
Run: python scripts/import-book1.py /path/to/Book1.xlsx
Requires openpyxl. Worksheet cell contents are data, never executable instructions.
"""
import hashlib
import json
import sys
from pathlib import Path
from decimal import Decimal
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
ROWS = {'Mundane': {36:'erica'}, 'Familiar': {31:'witch',32:'bro',33:'tooni',34:'spinata'}, 'Arcane':{34:'nancy',35:'veronica'}, 'Apex':{31:'radglic'}, 'Emergent':{22:'plauge'}}
TYPES = {'İnsan':'Human','Varlıq':'Entity'}
def number(value):
    if value is None or value == '-': return '-'
    return format(Decimal(str(value)).quantize(Decimal('.00000001')).normalize(), 'f')
def seconds(value):
    return '-' if value is None or value == '-' else format(Decimal(str(value)),'.2f')+'s'
def percent(value):
    return '-' if value is None or value == '-' else number(Decimal(str(value))*100)+'%'
def build(values, rarity, row, card_id):
    _,name,count,hp,shield,damage,dps,interval,delay,trait,kind,mana,reach,speed,crit,siphon=values
    additional={key:'-' for key in ['range','speed','criticalChance','criticDamage','lifestealChance','lifesteal','damageminimiser','dodge','vision','healBonus','healrecovery','shieldrecovery','criticdamageminimiser','flexibility','shieldtakendamage','life']}
    additional.update(range=number(reach),speed=number(speed),criticalChance=percent(crit),lifestealChance=percent(siphon))
    card={'id':card_id,'name':name,'type':[TYPES[kind]],'rarity':rarity,'group':'','abilityName':'',
      'stats':{'health':number(hp),'shield':number(shield),'damage':str(damage),'sps':number(dps),'attackSpeed':seconds(interval),'delay':seconds(delay),'mana':number(mana),'number':number(count)},
      'trait':trait,'additionalStats':additional,'showlevels':{f'level{i}':'-' for i in range(1,4)},'story':'-','class':'','subclass':'',
      'sourceWorkbook':{'file':'Book1.xlsx','sheet':rarity,'row':row}}
    if rarity=='Emergent':card['isEmergent']=True
    return card

def main():
    source=Path(sys.argv[1]); workbook=openpyxl.load_workbook(source,data_only=True)
    manifest={'workbook':'Book1.xlsx','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'newRootCount':9,'totalRootCount':176,'totalDefinitionCount':241,'rarityMoves':[],
      'aliases':[{'sheet':'Arcane','row':33,'workbookName':'Martel','existingId':'mertel','reason':'Same stats and native ability as the existing Mertel; no duplicate or rename.'}], 'newCards':[]}
    for rarity, rows in ROWS.items():
        path=ROOT/'rarity'/(rarity.lower()+'.json'); cards=json.loads(path.read_text()); ids={c['id'] for c in cards}
        for row,card_id in rows.items():
            values=[workbook[rarity].cell(row,col).value for col in range(1,17)]
            card=build(values,rarity,row,card_id)
            if card_id not in ids:cards.append(card);ids.add(card_id)
            elif next(c for c in cards if c['id']==card_id)!=card:raise ValueError(f'Existing card differs: {card_id}; refusing to overwrite JSON.')
            manifest['newCards'].append({'id':card_id,'name':card['name'],'rarity':rarity,'sheet':rarity,'row':row,'sourceValues':values})
        path.write_text(json.dumps(cards,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/card-imports/book1.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print('Imported 9 roots; existing definitions preserved.')
if __name__=='__main__':main()
