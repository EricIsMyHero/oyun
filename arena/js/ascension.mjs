// Partner membership belongs to the original deck, independent of deployment.
export function resolveDeckCard(byId,id,deck=[],formChoices={}) {
  const base=byId.get(id),partners=base?.raw?.ascension?.partnerIds||[];
  if(base?.choiceRequired){
    const key=formChoices[id],variant=base.typeVariants.find(form=>form.id===`${id}/${key}`&&form.ready);
    return variant?{...variant,id:base.id,rootId:base.id,variantId:variant.id,typeVariants:base.typeVariants,
      ethereal:{key,variantId:variant.id,formNumber:key==='type1'?1:2},choiceRequired:true}:base;
  }
  const active=partners.filter(partner=>deck.includes(partner));
  if(!base?.ascended?.ready||!active.length)return base;
  const form=base.ascended;
  return {...form,id:base.id,rootId:base.id,image:base.image,class:base.class,subclass:base.subclass,
    ascension:{active:true,partners:active,baseMana:base.stats.mana}};
}
