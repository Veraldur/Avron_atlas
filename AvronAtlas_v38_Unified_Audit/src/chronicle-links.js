/* Chronicle ↔ Timeline: one event reference, derived date and optional standalone date. */
(()=>{'use strict';
function world(){return (typeof S!=='undefined'?S.world:window.S?.world)||{};}
function events(){return world().timeline?.events||[];}
function campaigns(){return world().timeline?.campaigns||[];}
function resolve(scene){
 const ref=scene?.timelineRef||{};
 const event=events().find(e=>e.id===ref.eventId);
 const camp=campaigns().find(c=>c.id===(event?.campaignId||ref.campaignId));
 const route=camp?.routes?.find(r=>r.id===ref.routeId)||camp?.routes?.[0];
 const variant=event?.routeDefaults?.find(v=>v.routeId===route?.id);
 const year=event?(variant?.year??event.year):ref.year;
 const monthId=event?.monthId||ref.monthId;
 const day=event?.day||ref.day;
 const cal=world().timeline?.calendars?.find(c=>c.id===camp?.calendarId);
 const era=world().timeline?.eras?.find(e=>e.id===camp?.eraId);
 const month=cal?.months?.find(m=>m.id===monthId);
 const label=year==null?'Без даты':[day,month?.name,year,era?.short].filter(x=>x!=null&&x!=='').join(' ');
 return {ref,event,camp,route,year,monthId,day,label};
}
function forEvent(id,routeId){return (world().chronicles||[]).filter(c=>c.timelineRef?.eventId===id&&(!c.timelineRef.routeId||!routeId||c.timelineRef.routeId===routeId));}
function forYear(year,campaignId){return (world().chronicles||[]).filter(c=>{const r=resolve(c);return Number(r.year)===Number(year)&&(!campaignId||r.camp?.id===campaignId);});}
function link(scene,eventId,routeId){scene.timelineRef={...(scene.timelineRef||{}),eventId:eventId||'',routeId:routeId||''};window.dispatchEvent(new Event('avron-archive-changed'));}
window.AvronChronicleLinks={resolve,forEvent,forYear,link};
})();
