/* Mounts an original, DOM-based login experience over the legacy artwork shell. */
(function(){
  'use strict';
  function mount(){
    var root=document.querySelector('.login-screen');
    if(!root || root.dataset.cfMounted==='1') return !!root;
    root.dataset.cfMounted='1';
    root.innerHTML=`
      <div class="blob one"></div><div class="blob two"></div><div class="blob three"></div>
      <span class="spark s1">✦</span><span class="spark s2">✧</span><span class="spark s3">✦</span><span class="spark s4">✧</span>
      <div class="cf-shell">
        <section class="cf-hero" aria-label="Gurukulam AI welcome">
          <div class="cf-brand"><div class="cf-mark">🪔</div><div><b>Gurukulam AI</b><span>Learn · Explore · Grow</span></div></div>
          <span class="cf-kicker">🌱 A HAPPY PLACE TO LEARN</span>
          <h1>Every lesson can become an <em>adventure.</em></h1>
          <p>A warm, playful learning world where curious children can ask questions, discover ideas and learn with a friendly AI teacher.</p>
          <div class="cf-adventure" aria-hidden="true">
            <div class="cf-sun"></div><div class="cf-hill h1"></div><div class="cf-hill h2"></div>
            <div class="cf-tree">🌳</div><div class="cf-bubble">Ready? 🚀</div>
            <div class="cf-kid a">🧒🏽</div><div class="cf-kid b">👧🏽</div><div class="cf-trail">⭐ · 📚 · 🔭 · 🧩</div>
          </div>
        </section>
        <section class="cf-card" aria-label="Parent sign in">
          <div class="cf-card-top"><div class="cf-welcome-icon">📚</div><span class="cf-parent">PARENT SIGN-IN</span></div>
          <h2>Let’s start the adventure!</h2>
          <p class="sub">Sign in securely to open your child’s personalised Gurukulam learning space.</p>
          <button class="cf-google" type="button" aria-label="Continue with Google"><span class="cf-g">G</span><span>Continue with Google</span></button>
          <div class="cf-divider"><span>safe learning starts here</span></div>
          <div class="cf-features">
            <div class="cf-feature"><div class="ico">🛡️</div><div><b>Parent controlled</b><span>You stay in charge</span></div></div>
            <div class="cf-feature"><div class="ico">🧠</div><div><b>Personalised</b><span>Learning that adapts</span></div></div>
            <div class="cf-feature"><div class="ico">✨</div><div><b>Joyful</b><span>Made for curious minds</span></div></div>
          </div>
          <div class="cf-safety">🔒 Secure · Child-friendly · Ad-free learning space</div>
          <div class="cf-message" role="status" hidden></div>
          <div class="tiny">By continuing, you open a protected learning space for your child.</div>
          <div class="cf-footer"><b>Gurukulam AI</b> · Learn with curiosity, grow with confidence.</div>
        </section>
      </div>`;
    var button=root.querySelector('.cf-google');
    var msg=root.querySelector('.cf-message');
    button.addEventListener('click',function(){
      if(window.google && window.google.accounts && window.google.accounts.id){
        msg.hidden=true;
        window.google.accounts.id.prompt();
      }else{
        msg.textContent='Google sign-in is still loading. Please try again in a moment.';
        msg.hidden=false;
      }
    });
    return true;
  }
  var attempts=0;
  var timer=setInterval(function(){
    attempts++;
    if(mount() || attempts>100) clearInterval(timer);
  },100);
  mount();
})();
