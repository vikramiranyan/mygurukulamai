(function(){
  const STYLE_ID='gurukulam-login-master-style';
  const CANVAS_ID='gurukulam-login-master-canvas';
  const apply=()=>{
    const screen=document.querySelector('.login-screen');
    if(!screen)return false;
    if(!document.getElementById(STYLE_ID)){
      const style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent=`
        .login-screen.gurukulam-master{position:relative!important;display:block!important;width:100%!important;min-height:100vh!important;height:auto!important;overflow:auto!important;background:#ead7b8!important;padding:0!important}
        .login-screen.gurukulam-master .login-art{display:none!important}
        .login-master-canvas{position:relative!important;width:100vw!important;aspect-ratio:1536/1024!important;overflow:hidden!important;background:#ead7b8!important}
        .login-master-layer{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;display:block!important;object-fit:fill!important;pointer-events:none!important;user-select:none!important}
        .login-master-left{clip-path:inset(0 42.7083% 19.9219% 0)!important}
        .login-master-right{clip-path:inset(7.7148% 0 7.7148% 57.2917%)!important}
        .login-master-nurturing{clip-path:inset(80.0781% 44.9219% 4.4922% 4.9479%)!important}
        .login-master-footer{clip-path:inset(94.7266% 0 0 0)!important}
        .login-screen.gurukulam-master .login-card{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;z-index:20!important;pointer-events:none!important}
        .login-screen.gurukulam-master .login-card>*{visibility:hidden!important}
        .login-screen.gurukulam-master .login-card .google-btn{visibility:visible!important;position:absolute!important;left:61.1%!important;top:36.8%!important;width:30.5%!important;height:7.0%!important;min-height:0!important;margin:0!important;border:0!important;border-radius:18px!important;background:transparent!important;box-shadow:none!important;color:transparent!important;font-size:0!important;cursor:pointer!important;outline:none!important;pointer-events:auto!important;z-index:30!important}
        .login-screen.gurukulam-master .login-card .google-btn>*{visibility:hidden!important}
        .login-screen.gurukulam-master .login-card .google-btn:hover{transform:none!important;box-shadow:none!important;background:transparent!important}
        .login-screen.gurukulam-master .login-card .login-message{visibility:visible!important;position:absolute!important;left:60%!important;right:4%!important;top:46%!important;margin:0!important;z-index:31!important;color:#263238!important;background:rgba(255,255,255,.94)!important;border-radius:10px!important;padding:8px 10px!important;font-size:12px!important;text-align:center!important;pointer-events:none!important}
        @media(max-width:700px){
          .login-screen.gurukulam-master{min-height:100svh!important}
          .login-master-canvas{width:100vw!important}
          .login-screen.gurukulam-master .login-card .google-btn{left:61.1%!important;top:36.8%!important;width:30.5%!important;height:7%!important}
          .login-screen.gurukulam-master .login-card .login-message{left:58%!important;right:3%!important;top:46%!important;font-size:9px!important;padding:5px!important}
        }
      `;
      document.head.appendChild(style);
    }
    screen.classList.add('gurukulam-master');
    if(!document.getElementById(CANVAS_ID)){
      const canvas=document.createElement('div');
      canvas.id=CANVAS_ID;
      canvas.className='login-master-canvas';
      const layers=[
        ['login-master-left','Gurukulam AI learning scene'],
        ['login-master-right','Gurukulam AI sign-in panel'],
        ['login-master-nurturing','Nurturing Young Minds panel'],
        ['login-master-footer','Gurukulam AI footer']
      ];
      layers.forEach(([cls,alt])=>{
        const img=document.createElement('img');
        img.className='login-master-layer '+cls;
        img.src='./update-001-login.svg';
        img.alt=alt;
        canvas.appendChild(img);
      });
      screen.insertBefore(canvas,screen.firstChild);
    }
    const btn=screen.querySelector('.google-btn');
    if(btn){btn.setAttribute('aria-label','Continue with Google');btn.setAttribute('title','Continue with Google')}
    return true;
  };
  if(!apply()){
    const observer=new MutationObserver(()=>{if(apply())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
