/* Unified entry points — source records remain in world JSON. */
(()=>{'use strict';
function pantheon(){const w=window.S?.world;if(!w)return;const sh=(w.showcases||[]).find(s=>s.sectionId==='pantheon')||(w.showcases||[]).find(s=>/пантеон/i.test(s.name));if(sh)window.AvronShowcase?.open(sh.id,window.S.mode==='edit');else window.AvronShowcase?.open();}
// Capture legacy Pantheon navigation before its independent visual engine opens.
document.addEventListener('click',e=>{const nav=e.target.closest('#pantheonNav');if(nav){e.preventDefault();e.stopImmediatePropagation();pantheon();}},true);
// Map and old UI can load before slots; the canonical showcase is reusable everywhere.
window.AvronUnifiedHalls={openPantheon:pantheon};
// Ensure map popup stage is mounted after it actually enters the document.
const obs=new MutationObserver(records=>{for(const r of records)for(const node of r.addedNodes){if(node.nodeType!==1)continue;const found=node.matches?.('.map-popup')?[node]:[...(node.querySelectorAll?.('.map-popup')||[])];for(const p of found){const id=p.dataset.entityId;const entity=window.S?.world?.entities?.find(x=>x.id===id);if(entity?.popup?.kind==='scene')requestAnimationFrame(()=>{if(p.isConnected)window.AvronSceneBridge?.mount(id,p)})}}});
obs.observe(document.body,{childList:true,subtree:true});
})();
