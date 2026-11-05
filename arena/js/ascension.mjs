// Partner membership belongs to the original deck, independent of deployment.
export function resolveDeckCard(byId,id,deck=[]) {
  const base=byId.get(id),partners=base?.raw?.ascension?.partnerIds||[];
  const active=partners.filter(partner=>deck.includes(partner));
  if(!base?.ascended?.ready||!active.length)return base;
  const form=base.ascended;
  return {...form,id:base.id,rootId:base.id,image:base.image,class:base.class,subclass:base.subclass,
    ascension:{active:true,partners:active,baseMana:base.stats.mana}};
}
