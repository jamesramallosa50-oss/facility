/* Menu entry points preserve the room parameters through both game loaders. */
function launchFacility(mode,room){
  const q=new URLSearchParams({v:'proximity-r4-20261022'});
  if(mode){q.set('coop',mode);q.set('room',room);q.set('name',document.getElementById('survivor-name').value.trim().slice(0,18)||'Survivor');}
  document.getElementById('coop-menu').close();
  const menu=document.getElementById('menu'),frame=document.getElementById('game');menu.style.display='none';frame.style.display='block';frame.src='game.html?'+q;frame.focus();
}
(function(){
  const dialog=document.getElementById('coop-menu'),code=document.getElementById('room-code'),feedback=document.getElementById('coop-feedback');
  document.getElementById('coop').onclick=()=>{dialog.showModal();};
  document.getElementById('coop-close').onclick=()=>dialog.close();
  document.getElementById('host-room').onclick=()=>{
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
    launchFacility('host',[...bytes].map(n=>alphabet[n%alphabet.length]).join(''));
  };
  document.getElementById('join-room').onsubmit=e=>{
    e.preventDefault();const room=code.value.toUpperCase().replace(/\s/g,'');
    if(!/^[A-Z2-9]{6}$/.test(room)){feedback.textContent='Enter the six-character code shown in your host’s game.';code.focus();return;}
    launchFacility('join',room);
  };
  const invite=new URLSearchParams(location.search).get('room');if(invite){code.value=invite.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6);dialog.showModal();}
})();
