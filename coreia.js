/* COREIA CHECKOUT SELECTOR — VERSÃO DEFINITIVA v4 */
(function(){
  if(window.__coreia_selector_running) return;
  window.__coreia_selector_running = true;

  var STORAGE_KEY = 'coreia_hora_obrigatoria';
  var PICKER_ID = 'coreia-inline-selector';
  var ERR_ID = 'coreia-inline-erro';

  /* Janelas inteligentes */
  var STEP = 30;
  var MIN_DELAY = 90;
  var MARGIN = 15;

  var LUNCH_ACTIVE = [10,30, 15,00];
  var LUNCH_SLOTS  = [11,30, 14,30];

  var NIGHT_ACTIVE = [17,00, 23,00];
  var NIGHT_SLOTS  = [17,00, 23,00];

  function pad(n){return n<10?'0'+n:''+n;}
  function tAt(h,m){var d=new Date(); d.setHours(h,m,0,0); return d;}
  function addM(d,m){return new Date(d.getTime()+m*60000);}
  function inW(now, w){return now>=tAt(w[0],w[1]) && now<=tAt(w[2],w[3]);}

  function genSlots(range){
    var a=[], cur=tAt(range[0],range[1]), end=tAt(range[2],range[3]);
    for(;cur<=end;cur=addM(cur,STEP)) a.push(new Date(cur.getTime()));
    return a;
  }

  function getSlots(){
    var now=new Date(), slots=[], min=addM(now,MIN_DELAY), endDay=tAt(23,59);

    if(inW(now, LUNCH_ACTIVE)) slots=slots.concat(genSlots(LUNCH_SLOTS));
    if(inW(now, NIGHT_ACTIVE)) slots=slots.concat(genSlots(NIGHT_SLOTS));

    slots = slots.filter(function(dt){
      if(dt>endDay) return false;
      if(dt>=min) return true;
      var diff = Math.ceil((min - dt)/60000);
      return diff <= MARGIN;
    });

    slots.sort(function(a,b){return a-b;});

    var out=[], last=null;
    slots.forEach(function(d){
      var s=pad(d.getHours())+':'+pad(d.getMinutes());
      if(s!==last){ out.push(s); last=s; }
    });

    return out;
  }

  /* --- ENCONTRAR O BLOCO “Observação da compra” DE FORMA FO***NG À PROVA DE YAMPI --- */
  function findObsBlock(){
    var labels = document.querySelectorAll('label');
    for(var i=0;i<labels.length;i++){
      var t = (labels[i].innerText||'').trim().toLowerCase();
      if(t.startsWith("observação") || t.startsWith("observacao")){
        return labels[i].closest(".order-note");
      }
    }
    return null;
  }

  function findTextarea(){
    var b = findObsBlock();
    if(!b) return null;
    return b.querySelector("textarea");
  }

  /* --- RENDER DO PICKER --- */
  function injectPicker(){
    var textarea = findTextarea();
    if(!textarea) return false;

    var old = document.getElementById(PICKER_ID);
    if(old) old.remove();

    var slots = getSlots();
    var html = "<div id='"+PICKER_ID+"' style='margin:14px 0;max-width:420px'>";
    html += "<div style='font-weight:700;margin-bottom:6px;color:#7a1a1a'>Escolha o horário de entrega *</div>";

    if(!slots.length){
      html += "<div style='font-size:14px;color:#444;margin-bottom:6px'>Nenhum horário disponível hoje.</div>";
      html += "<div id='"+ERR_ID+"' style='display:none;color:#d00;font-size:12px'>Selecione um horário para continuar.</div>";
      html += "</div>";
      textarea.insertAdjacentHTML('afterend', html);
      return true;
    }

    html += "<div id='coreia-inline-btns' style='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px'>";
    slots.forEach(function(s){
      html += "<button data-slot='"+s+"' style='padding:6px 10px;border-radius:8px;border:1px solid #7a1a1a;background:#7a1a1a;color:#fff;font-size:13px;font-weight:600;cursor:pointer'>"+s+"</button>";
    });
    html += "</div>";
    html += "<div id='"+ERR_ID+"' style='display:none;color:#d00;font-size:12px'>Selecione um horário para continuar.</div>";
    html += "</div>";

    textarea.insertAdjacentHTML('afterend', html);

    /* Binds */
    var btns = document.querySelectorAll("#coreia-inline-btns button");
    btns.forEach(function(b){
      b.addEventListener("click", function(){
        btns.forEach(x=>{x.style.opacity="0.45"; x.style.transform='none';});
        this.style.opacity="1";
        this.style.transform="scale(1.05)";

        var val = this.getAttribute("data-slot");
        localStorage.setItem(STORAGE_KEY, val);
        textarea.value = "Entregar às "+val;
        textarea.dispatchEvent(new Event("input", {bubbles:true}));
      });
    });

    return true;
  }

  /* --- BLOQUEIO DO SUBMIT --- */
  function attachBlocker(){
    var btn = document.querySelector(".btn-finalize, button[data-testid='buy-now-pix'], button[type='submit']");
    if(!btn) return;

    if(btn.__coreia_blocked) return;
    btn.__coreia_blocked = true;

    btn.addEventListener("click", function(e){
      var val = localStorage.getItem(STORAGE_KEY);
      if(!val){
        e.preventDefault();
        var err = document.getElementById(ERR_ID);
        if(err) err.style.display="block";
        var sel = document.getElementById(PICKER_ID);
        if(sel) sel.scrollIntoView({behavior:"smooth",block:"center"});
      }
    }, true);
  }

  /* --- WATCHDOG (Yampi destrói DOM e recria) --- */
  function watchdog(){
    var mo = new MutationObserver(function(){
      var textarea = findTextarea();
      if(!textarea) return;
      if(!document.getElementById(PICKER_ID)) injectPicker();
      attachBlocker();
    });

    mo.observe(document.body, {childList:true, subtree:true});
  }

  /* --- LOOP DE INICIALIZAÇÃO --- */
  function start(){
    var ok = injectPicker();
    if(ok) attachBlocker();
    watchdog();
  }

  /* delay para security.js parar de quebrar o DOM */
  var attempts = 0;
  var int = setInterval(function(){
    attempts++;
    var t = findTextarea();
    if(t){
      clearInterval(int);
      start();
    }
    if(attempts>50) clearInterval(int);
  }, 200);
})();
