(function(){
  const STYLE_ID='gurukulam-login-layer-style';
  const CANVAS_ID='gurukulam-login-layer-canvas';
  const apply=()=>{
    const screen=document.querySelector('.login-screen');
    if(!screen)return false;
    if(!document.getElementById(STYLE_ID)){
      const style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent=`
        .login-screen.gurukulam-layered{position:relative!important;display:block!important;width:100%!important;min-height:100vh!important;height:auto!important;overflow:auto!important;background:#ead7b8!important;padding:0!important}
        .login-screen.gurukulam-layered .login-art{display:none!important}
        .login-screen.gurukulam-layered .login-card{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;z-index:20!important;pointer-events:none!important}
        .login-screen.gurukulam-layered .login-card>*{visibility:hidden!important}
        .login-screen.gurukulam-layered .login-card .google-btn{visibility:visible!important;position:absolute!important;left:71.7%!important;top:44%!important;width:25.8%!important;height:8.1%!important;min-height:0!important;margin:0!important;border:0!important;border-radius:18px!important;background:transparent!important;box-shadow:none!important;color:transparent!important;font-size:0!important;cursor:pointer!important;outline:none!important;pointer-events:auto!important;z-index:30!important}
        .login-screen.gurukulam-layered .login-card .google-btn>*{visibility:hidden!important}
        .login-screen.gurukulam-layered .login-card .google-btn:hover{transform:none!important;box-shadow:none!important;background:transparent!important}
        .login-screen.gurukulam-layered .login-card .login-message{visibility:visible!important;position:absolute!important;left:67%!important;right:3%!important;top:52%!important;margin:0!important;z-index:31!important;color:#263238!important;background:rgba(255,255,255,.94)!important;border-radius:10px!important;padding:8px 10px!important;font-size:12px!important;text-align:center!important;pointer-events:none!important}
        .login-layer-canvas{position:relative!important;width:100vw!important;aspect-ratio:1536/1024!important;overflow:hidden!important;background:#ead7b8!important}
        .login-layer{position:absolute!important;display:block!important;object-fit:fill!important;pointer-events:none!important;user-select:none!important}
        .login-layer-left{left:0!important;top:0!important;width:57.2917%!important;height:80.0781%!important}
        .login-layer-right{left:62.5651%!important;top:7.7148%!important;width:37.4349%!important;height:84.5703%!important}
        .login-layer-nurturing{left:24.9349%!important;top:80.0781%!important;width:50.1302%!important;height:15.5273%!important}
        .login-layer-footer{left:0!important;top:94.7266%!important;width:100%!important;height:5.2734%!important}
        @media(max-width:700px){
          .login-screen.gurukulam-layered{min-height:100svh!important}
          .login-layer-canvas{width:100vw!important;min-width:0!important}
          .login-screen.gurukulam-layered .login-card .google-btn{left:71.7%!important;top:44%!important;width:25.8%!important;height:8.1%!important}
          .login-screen.gurukulam-layered .login-card .login-message{left:66%!important;right:3%!important;top:52%!important;font-size:9px!important;padding:5px!important}
        }
      `;
      document.head.appendChild(style);
    }
    screen.classList.add('gurukulam-layered');
    if(!document.getElementById(CANVAS_ID)){
      const canvas=document.createElement('div');
      canvas.id=CANVAS_ID;
      canvas.className='login-layer-canvas';
      const layers=[
        ['login-left-layer.svg','login-layer login-layer-left','Gurukulam AI learning scene'],
        ['login-right-layer.svg','login-layer login-layer-right','Gurukulam AI parent sign-in panel'],
        ['login-nurturing-layer.svg','login-layer login-layer-nurturing','Nurturing Young Minds feature panel'],
        ['login-footer-layer.svg','login-layer login-layer-footer','Gurukulam AI footer']
      ];
      layers.forEach(([src,cls,alt])=>{const img=document.createElement('img');img.className=cls;img.src='./'+src;img.alt=alt;canvas.appendChild(img)});
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
