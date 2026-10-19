/* Facility mobile movement and stamina balancing.
 * Applied inside game.html after the original gameplay script is loaded.
 * Does not modify keyboard, controller or combat gameplay.
 */
(function () {
  'use strict';
  function install() {
    if(typeof facPlayer!=='function') return false;
    if(window.__facilityMovementBalanceV2) return true;
    const old = facPlayer;
    let body = Function.prototype.toString.call(old);
    const runFlag='(stf>.88&&Math.abs(touchMove.x+padMove.x)<.5)';
    if(!body.includes(runFlag)||!body.includes('dt/5.2')){
      console.warn('Facility movement patch: unsupported gameplay version');
      return false;
    }
    // Walking with the analog joystick never automatically activates sprint.
    // Sprint remains available through Shift, the sprint touch button, or gamepad.
    body=body.replace(runFlag,'false');
    // ~8.0s continuous sprint, shorter recovery delay, faster resting recovery.
    body=body.replace('dt/5.2','dt/8.0')
      .replace('F.staT=1.1','F.staT=.65')
      .replace('ml>.1?.11:.19','ml>.1?.16:.24')
      .replace('pl.sta>.42','pl.sta>.30');
    try {
      const next=eval('('+body+')');
      if(typeof next!=='function')return false;
      facPlayer=next;
      window.__facilityMovementBalanceV2=true;
      console.info('Facility joystick sprint and stamina balance applied');
      return true;
    }catch(error){ console.error('Facility movement patch failed',error);return false; }
  }
  if(!install()) {
    let attempts=0;
    const retry=setInterval(()=>{if(install()||++attempts>=30)clearInterval(retry)},200);
  }
})();
