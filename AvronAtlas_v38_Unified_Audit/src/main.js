'use strict';
/* Запуск: мир берётся из автосохранения браузера, иначе — демо */
(async()=>{const saved=await window.AvronPersistence?.restore?.();useWorld(sanitize(saved || restoreWorld() || window.AvronDefaultWorld || demoWorld()));
// Восстанавливаем встроенные изображения карты после перезапуска редактора.
S.world.maps.forEach(m => { if (typeof m.src === 'string' && m.src.startsWith('data:image/')) S.uploads[m.id] = m.src; });
wireStatic();
renderAll();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0d1417',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  render: { antialias: true, pixelArt: false, roundPixels: false },
  input: { keyboard: false, mouse: { preventDefaultWheel: true } },
  disableContextMenu: true,
  scene: [WorldScene]
});

})().catch(err=>{console.error("Ошибка запуска Avron:",err);alert("Не удалось запустить мир: "+err.message)});
