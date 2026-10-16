"use client";
import {useEffect} from 'react';
import {Localized} from '@/app/i18n/locale-provider';
export function GenerationArrival({batch,count}:{batch:string;count:number}){
 useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});},[batch]);
 return <Localized><p className="generation-ready" role="status">{count===3?'✓ Three new journeys are ready. Open a card to see its map.':'Your new journeys are ready. Open a card to explore.'}</p></Localized>;
}
