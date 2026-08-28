(function(){
  const STYLE_ID='update001-exact-style';
  const apply=()=>{
    const screen=document.querySelector('.login-screen');
    if(!screen)return false;
    screen.classList.add('update001-exact');
    if(document.getElementById(STYLE_ID))return true;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .login-screen.update001-exact{position:relative!important;display:block!important;min-height:100vh!important;width:100vw!important;height:100vh!important;overflow:hidden!important;background:#f7ead0 url('./update-001-login.svg') center center/100% 100% no-repeat!important;padding:0!important}
      .login-screen.update001-exact .login-art{display:none!important}
      .login-screen.update001-exact .login-card{position:absolute!important;z-index:5!important;right:4.6%!important;top:17.2%!important;width:38.2%!important;height:64.8%!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
      .login-screen.update001-exact .login-card>*{visibility:hidden!important}
      .login-screen.update001-exact .login-card .google-btn{visibility:visible!important;position:absolute!important;left:8.5%!important;top:43.5%!important;width:83%!important;height:15%!important;margin:0!important;border:0!important;border-radius:18px!important;background:transparent!important;box-shadow:none!important;color:transparent!important;font-size:0!important;cursor:pointer!important;outline:none!important}
      .login-screen.update001-exact .login-card .google-btn>*{visibility:hidden!important}
      .login-screen.update001-exact .login-card .google-btn:hover{transform:none!important;box-shadow:none!important;background:transparent!important}
      .login-screen.update001-exact .login-card .login-message{visibility:visible!important;position:absolute!important;left:8%!important;right:8%!important;bottom:2%!important;margin:0!important;z-index:10!important;color:#263238!important;background:rgba(255,255,255,.92)!important;border-radius:10px!important;padding:8px 10px!important;font-size:12px!important;text-align:center!important}
      @media(max-width:900px){.login-screen.update001-exact{background-size:cover!important}.login-screen.update001-exact .login-card{right:5%!important;top:13%!important;width:90%!important;height:74%!important}.login-screen.update001-exact .login-card .google-btn{left:8%!important;top:48%!important;width:84%!important;height:13%!important}}
    `;
    document.head.appendChild(style);
    const btn=screen.querySelector('.google-btn');
    if(btn){btn.setAttribute('aria-label','Continue with Google');btn.setAttribute('title','Continue with Google')}
    return true;
  };
  if(!apply()){
    const observer=new MutationObserver(()=>{if(apply())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
