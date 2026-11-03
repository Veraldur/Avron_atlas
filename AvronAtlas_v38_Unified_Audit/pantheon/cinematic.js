/* Configurable atlas chronicle cinematic. Config lives in PantheonCinematics editor. */
(()=>{
'use strict';
const demoChapters=[
{label:'ПРОЛОГ · НЕБО',title:'Когда небо обрело голос',text:'В те дни, когда над землёй ещё не знали имени грозы, люди поднимали глаза к облакам и видели лишь бесконечную высоту. Но однажды среди неподвижных туч прошёл первый раскат — такой глубокий, что камни ответили ему дрожью. И было сказано: это Аксаар обратил свой взор на мир.'},
{label:'КНИГА ПЕРВАЯ · БУРЯ',title:'Глас сокрушающих небес',text:'Не всякая буря была его гневом и не всякая молния — наказанием. Вихри несли его дыхание; ливень скрывал поступь; свет на мгновение вырывал из мрака то, что должно было оставаться незримым. Так смертные научились различать в раскатах грома не слова, но волю, перед которой не склоняются ни башни, ни вершины.'},
{label:'КНИГА ВТОРАЯ · ПАМЯТЬ',title:'То, что остаётся после грома',text:'Когда гроза уходила за дальний хребет, мир вновь становился тихим. Вода стекала с камней, над полями вставал холодный туман, а в памяти людей ещё долго звучал небесный удар. Потому летописцы оставляли в книгах пустое место перед именем Аксаара: одни силы можно описать — иные надлежит сперва услышать.'}
];
const names=['Старший','Эла','Демина','Иолтар','Немул','Силерэ','Митеон','Аксаар','Терхон','Юна','Тельмир','Гихрезай','Тёмный','Афира','Апофей','Шагнар','Кволь','Анамалсарис','Каллейдоиллюмиллон'];
const roman=n=>{let out='';for(const [v,t] of [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){out+=t;n-=v}return out};
const EFFECTS={storm:'Буря / молнии',spectrum:'Спектр / призма',bloom:'Цветение / споры',dream:'Мир снов',war:'Война / искры',serpent:'Змеи / яд',shadow:'Тени / бездна',celestial:'Звёзды / эфир',none:'Без эффекта'};
const BG_MODES={map:'Только карта',split:'Карта + арт (разделитель)',overlay:'Карта + арт (наложение)',art:'Только арт'};
function defaultVisual(){return {
  mode:'map',
  backgroundArt:'',
  splitPos:58,
  splitFeather:8,
  dividerStyle:'ornate',
  sceneBrightness:86,
  sceneContrast:112,
  sceneSaturation:100,
  mapOpacity:100,
  artOpacity:78,
  artBlur:10,
  artScale:112,
  gradientA:'#0a101b',
  gradientB:'#6d4f94',
  gradientOpacity:38,
  effectHue:0,
  effectSaturation:110,
  effectContrast:110,
  effectBlur:2
}}
const defaultConfig=()=>({id:'akssaar',name:'Летопись бури',godId:8,source:'./assets/avron-map.jpg',map:{x:.5,y:.48,w:.26,h:.25},introMs:4200,zoom:2.4,introLabel:'VIII · АКСААР',introTitle:'Летопись бури',introText:'И разверзлись небеса, и мир услышал имя грома.',effect:'storm',secondaryEffect:'none',effectIntensity:65,typingMs:35,autoAdvance:false,autoDelayMs:1800,accent:'#e2c68d',brand:'АВРОН / ЛЕТОПИСЬ НЕБЕС',ending:'article',published:true,category:'Сказания',sortOrder:0,catalogDescription:'',visual:defaultVisual(),chapters:structuredClone(demoChapters)});
function normalizeConfig(given){
  const base=defaultConfig();
  const config={...base,...(given||{})};
  config.map={...base.map,...(given?.map||{})};
  config.visual={...base.visual,...(given?.visual||{})};
  config.chapters=Array.isArray(config.chapters)&&config.chapters.length?config.chapters:structuredClone(demoChapters);
  config.godId=Math.max(0,Math.round(Number(config.godId)??8));
  config.effect=Object.keys(EFFECTS).includes(config.effect)?config.effect:'storm';
  config.secondaryEffect=Object.keys(EFFECTS).includes(config.secondaryEffect)?config.secondaryEffect:'none';
  config.visual.mode=Object.keys(BG_MODES).includes(config.visual.mode)?config.visual.mode:'map';
  return config;
}
let host=null, config=null,phase='closed',page=0,pos=0,last=0,raf=0,paused=false,speedFactor=1,introTimer=0,endTimer=0,mapAnimation=null;
const $=s=>host?.querySelector(s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||a));
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const artPath=id=>id?window.PantheonGetGods?.().find(g=>g.id===id)?.art||`./pantheon/art/${id}.png`:'';
const markup=()=>`<div class="cin-bg" aria-hidden="true"><div class="cin-map"></div><div class="cin-bg-art"></div><div class="cin-divider"></div><div class="cin-gradient"></div><div class="cin-veil"></div><div class="cin-effect cin-effect-primary"></div><div class="cin-effect cin-effect-secondary"></div><div class="cin-runes">✧ <span>${roman(Math.max(1,(window.PantheonGetGods?.().findIndex(g=>g.id===config.godId)??-1)+1))}</span> ✧</div><div class="cin-flash"></div><div class="cin-rays"></div>${config.godId?`<div class="cin-god"><img src="${artPath(config.godId)}" alt="" decoding="async"></div>`:''}<div class="cin-noise"></div></div><div class="cin-layout"><div class="cin-top"><div class="cin-brand">✦ <span>${esc(config.brand)}</span></div><button type="button" data-action="close" aria-label="Закрыть синематик">✕ <span>Закрыть</span></button></div><div class="cin-intro-copy"><div class="cin-intro-label">${esc(config.introLabel||roman(config.godId))}</div><h2>${esc(config.introTitle||config.name)}</h2><p>${esc(config.introText||'')}</p></div><div class="cin-writing"><div class="cin-eyebrow" id="cinLabel"></div><div class="cin-rule"><span></span></div><h1 id="cinTitle"></h1><p id="cinText" aria-live="off"></p><div class="cin-caret" aria-hidden="true">✦</div></div><div class="cin-bottom"><div class="cin-status"><span id="cinCounter"></span><div class="cin-progress" aria-hidden="true"><i id="cinProgress"></i></div><span id="cinHint">${esc(config.name)}</span></div><div class="cin-controls"><button type="button" data-action="pause">Ⅱ Пауза</button><button type="button" data-action="speed">Темп ×1</button><button type="button" data-action="next" class="cin-primary">Пропустить вступление →</button></div></div></div>`;
function stopTimers(){cancelAnimationFrame(raf);clearTimeout(introTimer);clearTimeout(endTimer);mapAnimation?.cancel();mapAnimation=null}
function cleanup(){stopTimers();host?.remove();host=null;phase='closed';document.body.classList.remove('cinematic-open')}
function applyVisuals(){
  host.dataset.effect=config.effect;
  host.dataset.secondary=config.secondaryEffect;
  host.dataset.bgmode=config.visual.mode;
  host.dataset.divider=config.visual.dividerStyle||'ornate';
  host.style.setProperty('--effect-opacity',String(clamp(config.effectIntensity,0,100)/100));
  host.style.setProperty('--gold',config.accent||'#e2c68d');
  host.style.setProperty('--split-pos',`${clamp(config.visual.splitPos,10,90)}%`);
  host.style.setProperty('--split-feather',`${clamp(config.visual.splitFeather,0,20)}vw`);
  host.style.setProperty('--scene-brightness',String(clamp(config.visual.sceneBrightness,40,180)/100));
  host.style.setProperty('--scene-contrast',String(clamp(config.visual.sceneContrast,40,220)/100));
  host.style.setProperty('--scene-saturation',String(clamp(config.visual.sceneSaturation,0,220)/100));
  host.style.setProperty('--map-opacity',String(clamp(config.visual.mapOpacity,0,100)/100));
  host.style.setProperty('--art-opacity',String(clamp(config.visual.artOpacity,0,100)/100));
  host.style.setProperty('--art-blur',`${clamp(config.visual.artBlur,0,40)}px`);
  host.style.setProperty('--art-scale',String(clamp(config.visual.artScale,100,170)/100));
  host.style.setProperty('--gradient-a',config.visual.gradientA||'#0a101b');
  host.style.setProperty('--gradient-b',config.visual.gradientB||'#6d4f94');
  host.style.setProperty('--gradient-opacity',String(clamp(config.visual.gradientOpacity,0,100)/100));
  host.style.setProperty('--effect-hue',`${clamp(config.visual.effectHue,0,360)}deg`);
  host.style.setProperty('--effect-saturation',String(clamp(config.visual.effectSaturation,0,250)/100));
  host.style.setProperty('--effect-contrast',String(clamp(config.visual.effectContrast,0,250)/100));
  host.style.setProperty('--effect-blur',`${clamp(config.visual.effectBlur,0,18)}px`);
}
function start(input){
  cleanup();
  config=normalizeConfig(input&&typeof input==='object'?input:window.PantheonCinematics?.getActive?.());
  host=document.createElement('section');
  host.id='pantheonCinematic';host.className='cinematic cin-stage-map';
  host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label',config.name);host.innerHTML=markup();document.body.appendChild(host);document.body.classList.add('cinematic-open');
  applyVisuals();
  phase='intro';page=0;pos=0;paused=false;speedFactor=1;
  host.addEventListener('click',click);host.addEventListener('keydown',key);host.tabIndex=-1;host.focus();
  const map=$('.cin-map');
  const art=$('.cin-bg-art');
  map.style.backgroundImage=`url(${JSON.stringify(config.source||'./assets/avron-map.jpg')})`;
  art.style.backgroundImage=`url(${JSON.stringify(config.visual.backgroundArt||artPath(config.godId))})`;
  map.style.animation='none';
  if(config.crop&&window.AvronFrame){host.dataset.preciseFrame='true';window.AvronFrame.mount(map,config.source||'./assets/avron-map.jpg',config.crop,{motion:config.motion||'slow',duration:config.duration||config.introMs/1000});
    if(config.artCrop){window.AvronFrame.mount(art,config.visual.backgroundArt||artPath(config.godId),config.artCrop,{motion:'still',autoplay:false});}
    introTimer=setTimeout(()=>{if(host&&phase==='intro')reveal()},clamp(config.introMs,300,20000));return;
  }
  let x=clamp(config.map.x,0,1),y=clamp(config.map.y,0,1);
  map.style.transformOrigin=`${x*100}% ${y*100}%`;
  const zoom=clamp(config.zoom,1,14);
  mapAnimation=map.animate([{transform:'scale(1.01) rotate(-1deg)',filter:'sepia(.45) brightness(.48) contrast(1.15)'},{transform:`scale(${zoom}) rotate(.5deg)`,filter:'sepia(.4) brightness(.27) contrast(1.2)'}],{duration:clamp(config.introMs,300,20000),easing:'cubic-bezier(.16,.74,.3,1)',fill:'forwards'});
  introTimer=setTimeout(()=>{if(host&&phase==='intro')reveal()},clamp(config.introMs,300,20000));
}
function reveal(){if(!host)return;clearTimeout(introTimer);phase='reading';host.classList.remove('cin-stage-map');host.classList.add('cin-stage-story');const intro=$('.cin-intro-copy');if(intro){setTimeout(()=>{if(intro&&host?.contains(intro))intro.style.display='none';},820)}showPage(0)}
function showPage(index){if(!host)return;cancelAnimationFrame(raf);clearTimeout(endTimer);page=index;pos=0;last=0;paused=false;phase='reading';host.classList.remove('cin-finished');const c=config.chapters[page];$('#cinLabel').textContent=c.label||'';$('#cinTitle').textContent=c.title||'';$('#cinText').textContent='';$('#cinCounter').textContent=`${String(page+1).padStart(2,'0')} / ${String(config.chapters.length).padStart(2,'0')}`;$('#cinProgress').style.width='0%';$('button[data-action="pause"]').textContent='Ⅱ Пауза';$('button[data-action="speed"]').textContent=`Темп ×${speedFactor}`;$('button[data-action="next"]').textContent='Показать весь текст →';host.classList.remove('cin-writing-ready');requestAnimationFrame(()=>{if(host){host.classList.add('cin-writing-ready');raf=requestAnimationFrame(tick)}})}
function tick(t){if(!host||phase!=='reading'||paused)return;if(!last)last=t;const c=config.chapters[page];const text=String(c.text||'');const delay=clamp(config.typingMs,5,150)/speedFactor;const delta=t-last;const take=Math.max(0,Math.floor(delta/delay));if(take){pos=Math.min(text.length,pos+take);$('#cinText').textContent=text.slice(0,pos);$('#cinProgress').style.width=`${text.length?pos/text.length*100:100}%`;last=t-(delta%delay)}if(pos>=text.length){finishPage();return}raf=requestAnimationFrame(tick)}
function finishPage(){if(!host)return;phase='page-end';$('#cinText').textContent=config.chapters[page].text||'';$('#cinProgress').style.width='100%';$('button[data-action="next"]').textContent=page===config.chapters.length-1?'Завершить летопись →':'Следующая страница →';host.classList.add('cin-finished');if(config.autoAdvance){endTimer=setTimeout(()=>{if(host&&phase==='page-end')next()},clamp(config.autoDelayMs,100,30000))}}
function next(){if(!host)return;if(phase==='intro'){reveal();return}if(phase==='reading'){cancelAnimationFrame(raf);finishPage();return}clearTimeout(endTimer);if(page<config.chapters.length-1)showPage(page+1);else finish()}
function finish(){const godId=config.godId;const ending=config.ending;cleanup();if(ending==='article'){const screen=document.getElementById('pantheonScreen');if(screen?.hidden)document.getElementById('pantheonNav')?.click();window.PantheonOpenGod?.(godId)}}
function pause(){if(phase!=='reading'||!host)return;paused=!paused;$('button[data-action="pause"]').textContent=paused?'▶ Продолжить':'Ⅱ Пауза';if(paused)cancelAnimationFrame(raf);else{last=0;raf=requestAnimationFrame(tick)}}
function accelerate(){speedFactor=speedFactor===1?2:speedFactor===2?3:1;$('button[data-action="speed"]').textContent=`Темп ×${speedFactor}`}
function click(e){const control=e.target.closest('[data-action]');if(!control)return;const a=control.dataset.action;if(a==='close')cleanup();if(a==='next')next();if(a==='pause')pause();if(a==='speed')accelerate()}
function key(e){if(e.key==='Escape'){e.stopPropagation();cleanup()}else if((e.code==='Space'||e.key==='Enter')&&e.target.tagName!=='BUTTON'){e.preventDefault();next()}}
document.addEventListener('keydown',e=>{if(host&&e.key==='Escape'){e.stopImmediatePropagation();cleanup()}},true);
window.PantheonStartCinematic=start;
window.PantheonCinematicDefaults=defaultConfig;
window.PantheonNormalizeCinematic=normalizeConfig;
window.PantheonGodNames=names;
window.PantheonEffectNames=EFFECTS;
window.PantheonBackgroundModes=BG_MODES;
window.PantheonRoman=roman;
})();
