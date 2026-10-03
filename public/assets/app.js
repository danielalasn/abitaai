(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= CAPTURA DE LEAD =================
     Cuatro datos, y el envio termina en WhatsApp con el mensaje ya escrito.
     La copia a la hoja sale con sendBeacon: sobrevive a que el navegador
     se vaya a WhatsApp en el mismo gesto, que es lo que evita que el
     bloqueador de ventanas mate el salto. */
  (function(){
    var lm = document.getElementById('lm');
    if (!lm) return;
    var form   = document.getElementById('lm-form');
    var errBox = document.getElementById('lm-err');
    var waLink = document.getElementById('lm-wa');
    var panel  = lm.querySelector('.lm__panel');
    var lastFocus = null;
    var CFG = window.ABITA_LINKS || {};

    function open(){
      lastFocus = document.activeElement;
      lm.setAttribute('data-open','true');
      lm.setAttribute('aria-hidden','false');
      lm.removeAttribute('data-done');
      document.body.style.overflow = 'hidden';
      var first = form.querySelector('input');
      if (first) setTimeout(function(){ first.focus(); }, 60);
    }
    function close(){
      lm.setAttribute('data-open','false');
      lm.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-cta]'), function(el){
      el.addEventListener('click', function(e){ e.preventDefault(); open(); });
    });
    Array.prototype.forEach.call(lm.querySelectorAll('[data-lm-close]'), function(el){
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function(e){
      if (lm.getAttribute('data-open') !== 'true') return;
      if (e.key === 'Escape'){ close(); return; }
      if (e.key !== 'Tab') return;
      /* el foco no se sale del panel mientras esta abierto */
      var f = panel.querySelectorAll('button, input, select, a[href]');
      var vis = [];
      for (var i=0;i<f.length;i++){ if (f[i].offsetParent !== null) vis.push(f[i]); }
      if (!vis.length) return;
      var first = vis[0], last = vis[vis.length-1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });

    function digits(v){ return (v||'').replace(/\D/g,''); }

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var d = {
        nombre:   form.nombre.value.trim(),
        negocio:  form.negocio.value.trim(),
        telefono: digits(form.telefono.value),
        rubro:    form.rubro.value,
        volumen:  form.volumen.value
      };
      if (!d.nombre || !d.negocio || !d.rubro || !d.volumen){
        errBox.textContent = 'Faltan datos: llená todos los campos.'; return;
      }
      if (d.telefono.length < 8){
        errBox.textContent = 'Revisá el número de WhatsApp.'; form.telefono.focus(); return;
      }
      errBox.textContent = '';

      /* 1 · copia a la hoja, sin bloquear el gesto */
      if (CFG.sheet){
        var payload = JSON.stringify({
          nombre:d.nombre, negocio:d.negocio, telefono:'+503'+d.telefono,
          rubro:d.rubro, volumen:d.volumen,
          origen: location.href, fecha: new Date().toISOString()
        });
        try {
          var sent = false;
          if (navigator.sendBeacon){
            sent = navigator.sendBeacon(CFG.sheet, new Blob([payload], {type:'text/plain;charset=UTF-8'}));
          }
          if (!sent){
            fetch(CFG.sheet, {method:'POST', mode:'no-cors', keepalive:true,
                              headers:{'Content-Type':'text/plain;charset=UTF-8'}, body:payload});
          }
        } catch(_){}
      }

      /* 2 · salto a WhatsApp con el mensaje ya escrito */
      var msg = 'Hola, quiero probar Abita.\n\n'
              + 'Nombre: ' + d.nombre + '\n'
              + 'Negocio: ' + d.negocio + '\n'
              + 'Rubro: ' + d.rubro + '\n'
              + 'Mensajes al día: ' + d.volumen;
      if (CFG.whatsapp){
        var url = 'https://wa.me/' + CFG.whatsapp + '?text=' + encodeURIComponent(msg);
        waLink.setAttribute('href', url);
        waLink.setAttribute('target','_blank');
        var w = window.open(url, '_blank', 'noopener');
        if (!w) waLink.textContent = 'tocá acá para escribirnos';
      } else {
        waLink.removeAttribute('target');
        waLink.textContent = 'configurá el número de WhatsApp en ABITA_LINKS';
      }
      lm.setAttribute('data-done','true');
      form.reset();
    });
  })();

  /* ---- Destinos reales: en cuanto ABITA_LINKS tenga valor, se aplican ---- */
  (function(){
    var L = window.ABITA_LINKS || {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-link]'), function(a){
      var v = L[a.getAttribute('data-link')];
      if (v) a.setAttribute('href', v);
    });
  })();

  /* ---- Barra de progreso + nav pegajoso ---- */
  var prog = document.getElementById('prog');
  var nav  = document.getElementById('nav');
  /* Secciones de fondo claro: sobre ellas la barra se invierte */
  var lightSecs = document.querySelectorAll('.sec--beige, .sec--beige-light, .sec--white');
  /* ===== El isotipo único =====
     Una sola posición de página para la marca, repartida a todas las copias.
     El scroll llega a saltos (una muesca de rueda son ~100px), así que en vez
     de seguirlo al pie, la marca persigue ese objetivo con una interpolación
     por frame: de ahí que baje continua en vez de a escalones. */
  /* El isotipo ahora es CSS puro (position:fixed + clip-path): sin JS. */
  var bgMarks = [];
  var hostTops = [];
  /* Suavizamos SOLO el descenso (la altura en pantalla), nunca el scroll.
     El scroll se aplica exacto: así la marca nunca se arrastra detrás de él. */
  var offTarget = 0, offNow = null, markRaf = null;

  /* Tramo en el que el teléfono queda fijo: ahí la marca se congela con él */
  var pinStart = 0, pinRange = 0, threadTop = 0, threadH = 0;
  var pinnedMark = null;

  function measureHosts(){
    var sy = window.pageYOffset;
    hostTops = bgMarks.map(function(mk){
      return mk.parentNode.getBoundingClientRect().top + sy;
    });
    var tr = document.getElementById('track');
    if (tr){
      pinStart = tr.getBoundingClientRect().top + sy;
      pinRange = Math.max(0, tr.offsetHeight - window.innerHeight);
    }
    var th = document.querySelector('.thread');
    if (th){
      threadTop = th.getBoundingClientRect().top + sy;
      threadH   = th.offsetHeight;
    }
  }
  /* La posición en pantalla que debería tener la marca ahora mismo */
  function computeOffset(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var sc = h.scrollTop;

    /* Descontamos del recorrido el scroll que se consume con el teléfono fijo.
       Durante ese tramo el avance no cambia: la marca se queda quieta en
       pantalla junto con la conversación, y al soltarse el pin sigue
       exactamente donde iba, sin salto ni recuperada. */
    var consumed = Math.min(Math.max(sc - pinStart, 0), pinRange);
    var effMax   = Math.max(1, max - pinRange);
    var p = (sc - consumed) / effMax;
    p = p < 0 ? 0 : (p > 1 ? 1 : p);

    /* desciende del 28% al 72% de la pantalla a lo largo del resto del landing */
    offTarget = window.innerHeight * (0.28 + 0.44 * p);
  }

  /* El scroll entra sin suavizar: la marca queda clavada a la pantalla */
  function applyMark(){
    var sc = document.documentElement.scrollTop;
    var vh = window.innerHeight;
    for (var i = 0; i < bgMarks.length; i++){
      var mk = bgMarks[i], y;
      if (mk === pinnedMark){
        /* Su contenedor va sticky: mientras está pegado arriba, el término de
           scroll desaparece y la posición la sostiene el navegador. Cero lag. */
        var clipTop = threadTop - sc;
        if (clipTop < 0) clipTop = 0;
        var limit = threadTop + threadH - vh - sc;
        if (clipTop > limit) clipTop = limit;
        y = offNow - clipTop;
      } else {
        y = sc + offNow - hostTops[i];
      }
      mk.style.setProperty('--y', y.toFixed(2) + 'px');
    }
  }

  function markLoop(){
    computeOffset();
    if (offNow === null) offNow = offTarget;
    offNow += (offTarget - offNow) * 0.13;
    if (Math.abs(offTarget - offNow) < 0.15) offNow = offTarget;
    applyMark();
    /* seguimos solo mientras el descenso no se asiente */
    markRaf = (offNow === offTarget) ? null : requestAnimationFrame(markLoop);
  }
  function kickMark(){}

  measureHosts();
  if (reduce){
    /* Sin movimiento: la marca queda centrada en su tramo y no se toca más */
    bgMarks.forEach(function(mk){ mk.style.setProperty('--y', (mk.parentNode.offsetHeight / 2) + 'px'); });
  } else {
    kickMark();
  }
  /* El alto de la página cambia con las fuentes y al rotar: hay que remedir */
  window.addEventListener('load', function(){ measureHosts(); if (!reduce) kickMark(); });
  window.addEventListener('resize', function(){ measureHosts(); if (!reduce){ markNow = null; kickMark(); } }, {passive:true});
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ measureHosts(); if (!reduce) kickMark(); });

  /* ---- Showpiece: el hilo que avanza con el scroll ---- */
  var track   = document.getElementById('track');
  var body    = document.getElementById('threadBody');
  var clockN  = document.getElementById('clockN');
  var clockM  = document.getElementById('clockM');
  var typing  = document.getElementById('typing');
  var tAv     = document.getElementById('tAv');
  var tName   = document.getElementById('tName');
  var tFoot   = document.getElementById('tFoot');
  var sAv     = document.getElementById('sAv');
  var sName   = document.getElementById('sName');
  var sPrev   = document.getElementById('sPrev');
  var lClock  = document.getElementById('lClock');

  /* Cuatro rubros. Cada mensaje: [quién, texto, hora, segundos transcurridos] */
  var SETS = {
    clinica: {
      av:'K', name:'Karla M.', clock:'9:52 p.m.',
      foot:'Consulta nocturna · La clínica cerró a las 6:00 p.m.',
      msgs:[
        ['in','Buenas noches, ¿cuánto cuesta una limpieza dental?','9:52 p.m.',0],
        ['out','¡Hola! La limpieza está en $45 e incluye pulido y revisión. ¿Te busco un espacio?','9:52 p.m.',5],
        ['in','Sí, pero solo puedo por la tarde','',14],
        ['out','Tengo jueves 3:30 p.m. o viernes 4:15 p.m. ¿Cuál te sirve?','9:52 p.m.',19],
        ['in','Jueves 3:30','',31],
        ['out','Listo, te aparté el jueves a las 3:30 p.m. con la Dra. Molina. ¿Me confirmás tu nombre completo?','9:53 p.m.',38],
        ['in','Karla Menjívar','',49],
        ['out','Gracias, Karla. Cita confirmada 🦷 Te mando recordatorio el miércoles.','9:53 p.m.',54],
        ['sys','Cita de $45 agendada · 54 segundos · La clínica estaba cerrada',null,54]
      ]
    },
    restaurante: {
      av:'R', name:'Rodrigo A.', clock:'10:52 p.m.',
      foot:'Pedido de última hora · La cocina ya había cerrado pedidos',
      msgs:[
        ['in','buenas! tienen algo pa 8 personas? es el cumple de mi mamá 🎂','10:52 p.m.',0],
        ['out','¡Felicidades a tu mamá! Para 8 el combo Fiesta alcanza bien: 2 pollos enteros, 8 acompañamientos y 8 bebidas, $46.90.','10:52 p.m.',5],
        ['in','va! pero ella no come picante','',14],
        ['out','Anotado: todo sin picante. ¿Le agrego el postre del día? Flan casero, $2.50 cada uno.','10:52 p.m.',19],
        ['in','dale 8','',31],
        ['out','Combo Fiesta sin picante + 8 flanes = $69.40 con envío. ¿A la misma dirección de siempre?','10:53 p.m.',38],
        ['in','sip. y le pueden poner una velita? 🙏','',49],
        ['out','Ya se lo pasé al equipo: va con vela. Sale en 20 min y llega antes de las 11:30 🎉','10:53 p.m.',56],
        ['sys','Pedido de $69.40 confirmado · 56 segundos · La cocina cerró pedidos a las 10 p.m.',null,56]
      ]
    },
    inmobiliaria: {
      av:'D', name:'Daniela R.', clock:'10:15 p.m.',
      foot:'Lead calificado · Presupuesto, forma de pago y fecha de visita',
      msgs:[
        ['in','Vi el apartamento de Santa Elena en Instagram, ¿sigue disponible?','10:15 p.m.',0],
        ['out','¡Hola! Sí, sigue disponible: 2 habitaciones, 92 m², $128,000. ¿Buscás para vivir o para inversión?','10:15 p.m.',6],
        ['in','Para vivir. ¿Aceptan crédito bancario?','',16],
        ['out','Sí. Con 10% de prima la cuota queda alrededor de $890 al mes a 20 años. ¿Te calza ese rango?','10:15 p.m.',23],
        ['in','Sí me sirve. ¿Se puede visitar?','',36],
        ['out','Claro. Tengo sábado 10:00 a.m. o domingo 2:00 p.m. ¿Cuál preferís?','10:16 p.m.',42],
        ['in','Sábado a las 10','',53],
        ['out','Agendado 🏠 Sábado 10:00 a.m. con Ricardo. Te mando la ubicación exacta el viernes.','10:16 p.m.',58],
        ['sys','Visita agendada · 58 segundos · Lead calificado sin que nadie interviniera',null,58]
      ]
    },
    academia: {
      av:'J', name:'Josué P.', clock:'8:38 p.m.',
      foot:'Inscripción en curso · La academia cerró a las 5:00 p.m.',
      msgs:[
        ['in','Buenas, ¿todavía hay cupo para el curso de inglés?','8:38 p.m.',0],
        ['out','¡Hola! Quedan 4 cupos en el grupo de sábados, básico e intermedio. ¿Cuál te interesa?','8:38 p.m.',5],
        ['in','Básico. ¿Cuánto cuesta?','',13],
        ['out','Matrícula $30 y mensualidad $55. Son 4 meses, sábados de 8 a 11 a.m.','8:38 p.m.',18],
        ['in','¿Qué necesito para inscribirme?','',30],
        ['out','Solo tu DUI y la matrícula. Te aparto el cupo 48 horas mientras lo pensás, sin compromiso.','8:39 p.m.',37],
        ['in','Apartámelo porfa','',47],
        ['out','Listo ✏️ Cupo a tu nombre hasta el jueves. Te mando el link de pago.','8:39 p.m.',52],
        ['sys','Cupo apartado · 52 segundos · La academia estaba cerrada',null,52]
      ]
    }
  };

  var current = 'clinica';
  var msgs = [];
  var shown = -1;

  function fmt(s){ return s + 's'; }

  function render(key){
    var set = SETS[key];
    if (!set || !body) return;
    current = key;
    body.innerHTML = '';
    set.msgs.forEach(function(m, i){
      var el = document.createElement('div');
      el.className = 'msg msg--' + m[0];
      el.textContent = m[1];
      if (m[2]){
        var t = document.createElement('time');
        t.textContent = m[2];
        el.appendChild(t);
      }
      el.setAttribute('data-i', i);
      if (!reduce) el.hidden = true;
      body.appendChild(el);
    });
    msgs = Array.prototype.slice.call(body.querySelectorAll('.msg'));
    if (tAv)   tAv.textContent = set.av;
    if (tName) tName.textContent = set.name;
    if (tFoot) tFoot.textContent = set.foot;
    /* la hora del teléfono es la del primer mensaje del rubro */
    if (sAv)   sAv.textContent = set.av;
    if (sName) sName.textContent = set.name;
    if (sPrev) sPrev.textContent = set.msgs[0][1];
    if (lClock) lClock.textContent = set.clock;

    if (reduce){
      msgs.forEach(function(m){ m.classList.add('on'); });
      var last = set.msgs[set.msgs.length - 1][3];
      if (clockN) clockN.textContent = fmt(last);
      if (clockM) clockM.textContent = fmt(last);
    } else {
      shown = -1;      /* el hilo nuevo arranca vacío; quien llama decide
                          si lo llena por scroll (arranque) o reproduciéndolo */
      showN(0);
    }
    if (typeof colorDots === 'function') colorDots(body);
  }

  /* ---- Mostrar los primeros n mensajes ---- */
  function showN(n){
    if (n === shown) return;
    shown = n;
    /* Los que aún no entran se colapsan, para que el hilo quede
       siempre pegado al borde inferior como un chat de verdad. */
    var pending = [];
    for (var i = 0; i < msgs.length; i++){
      if (i < n){
        if (msgs[i].hidden){ msgs[i].hidden = false; pending.push(msgs[i]); }
        else { msgs[i].classList.add('on'); }
      } else {
        msgs[i].classList.remove('on');
        msgs[i].hidden = true;
      }
    }
    if (pending.length){
      requestAnimationFrame(function(){
        pending.forEach(function(el){ el.classList.add('on'); });
      });
    }
    var data = SETS[current].msgs;
    var t = fmt(n === 0 ? 0 : data[Math.min(n - 1, data.length - 1)][3]);
    if (clockN) clockN.textContent = t;
    if (clockM) clockM.textContent = t;
    if (typing){
      var next = msgs[n];
      typing.textContent = (n > 0 && n < msgs.length && next && next.classList.contains('msg--out'))
        ? 'escribiendo…' : 'en línea';
    }
  }

  /* ---- Reproducir la conversación desde cero al cambiar de rubro ----
     Sin esto, si ya bajaste todo el hilo, el rubro nuevo aparecía terminado. */
  var playing = false, playTimer = null, playFrom = 0;
  function stopPlay(){ if (playTimer){ clearTimeout(playTimer); playTimer = null; } playing = false; }
  function play(){
    stopPlay();
    if (reduce || !msgs.length) return;
    playing = true;
    playFrom = document.documentElement.scrollTop;
    var data = SETS[current].msgs, n = 0;
    showN(0);
    (function step(){
      if (!playing) return;
      n++;
      showN(n);
      if (n >= msgs.length){ playing = false; return; }
      /* el ritmo sale de los segundos reales de la conversación, comprimidos */
      var d = (data[n][3] - data[n - 1][3]) * 95;
      playTimer = setTimeout(step, Math.max(430, Math.min(1500, d)));
    })();
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  tabs.forEach(function(btn){
    btn.addEventListener('click', function(){
      if (btn.getAttribute('aria-selected') === 'true') return;
      tabs.forEach(function(b){ b.setAttribute('aria-selected', String(b === btn)); });
      render(btn.getAttribute('data-k'));
      play();
    });
  });

  function paint(){
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')';
    if (nav){
      nav.classList.toggle('is-stuck', h.scrollTop > 60);
      if (lightSecs.length){
        var edge = nav.getBoundingClientRect().bottom - 1, lit = false;
        for (var li=0; li<lightSecs.length; li++){
          var lr = lightSecs[li].getBoundingClientRect();
          if (lr.top <= edge && lr.bottom >= edge){ lit = true; break; }
        }
        nav.classList.toggle('is-light', lit);
      }
    }

    if (!reduce) kickMark();

    if (!reduce && track && msgs.length){
      /* Mientras se reproduce un rubro recién elegido, el scroll no manda.
         Si el usuario scrollea de verdad, corta la reproducción y retoma. */
      if (playing){
        if (Math.abs(h.scrollTop - playFrom) > 40) stopPlay();
      }
      if (!playing){
        var r = track.getBoundingClientRect();
        var span = track.offsetHeight - window.innerHeight;
        var p = span > 0 ? (-r.top) / span : 0;
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        /* Reserva el último 12% para que el cierre respire */
        showN(Math.round(Math.min(p / 0.88, 1) * msgs.length));
      }
    }
    ticking = false;
  }

  var ticking = false;
  function onScroll(){
    if (!ticking){ ticking = true; requestAnimationFrame(paint); }
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  render(current);
  paint();

  /* ---- Acordeones: el clic abre y cierra (táctil y teclado incluidos) ---- */
  Array.prototype.forEach.call(document.querySelectorAll('.acc-hd'), function(btn){
    btn.addEventListener('click', function(){
      var card = btn.closest('[data-open]');
      var open = card.getAttribute('data-open') !== 'true';
      card.setAttribute('data-open', String(open));
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---- Escena 3D: la inclinación sigue al puntero, muy suave ---- */
  var stage = document.getElementById('stage');
  if (stage && !reduce && window.matchMedia('(min-width:720px) and (hover:hover)').matches){
    var inner = stage.querySelector('.stage__in'), sRaf = null, mx = 0, my = 0;
    stage.addEventListener('pointermove', function(e){
      var r = stage.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width  - 0.5;
      my = (e.clientY - r.top)  / r.height - 0.5;
      if (sRaf === null) sRaf = requestAnimationFrame(function(){
        sRaf = null;
        var base = window.innerWidth < 960 ? {y:-15, x:8} : {y:-19, x:9};
        inner.style.setProperty('--ry', (base.y + mx * 12).toFixed(2) + 'deg');
        inner.style.setProperty('--rx', (base.x - my * 9 ).toFixed(2) + 'deg');
      });
    }, {passive:true});
    stage.addEventListener('pointerleave', function(){
      inner.style.removeProperty('--ry');
      inner.style.removeProperty('--rx');
    }, {passive:true});
  }

  /* ---- Reveal al entrar en viewport ---- */
  var items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)){
    Array.prototype.forEach.call(items, function(el){ el.classList.add('on'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          var sibs = Array.prototype.slice.call(e.target.parentNode.children).filter(function(c){
            return c.classList && c.classList.contains('reveal');
          });
          var idx = sibs.indexOf(e.target);
          e.target.style.transitionDelay = (idx > 0 ? Math.min(idx, 5) * 60 : 0) + 'ms';
          e.target.classList.add('on');
          io.unobserve(e.target);
        }
      });
    }, {rootMargin: '0px 0px -12% 0px', threshold: 0.12});
    Array.prototype.forEach.call(items, function(el){ io.observe(el); });
  }

  /* ---- Burbuja + colita en un solo recorte ----
     El path se mide sobre la caja real de cada burbuja y se recalcula
     cuando cambia de tamaño. Si algo falla, queda el respaldo de dos piezas. */
  (function(){
    if (!(CSS && CSS.supports && CSS.supports('clip-path','path("M0 0 L1 1 Z")'))) return;
    var R = 15, TW = 13, TH = 19;

    function pathRight(w,h,r,tw,th){
      var B = w - tw;
      if (h < th + r + 2 || B < r*2 + 4) return null;
      return 'M'+r+' 0'
        + 'L'+(B+tw*0.69).toFixed(2)+' 0'
        + 'C'+(B+tw*0.95).toFixed(2)+' 0 '+(B+tw).toFixed(2)+' '+(th*0.137).toFixed(2)+' '+(B+tw*0.91).toFixed(2)+' '+(th*0.274).toFixed(2)
        + 'L'+B.toFixed(2)+' '+th
        + 'L'+B.toFixed(2)+' '+(h-r).toFixed(2)
        + 'A'+r+' '+r+' 0 0 1 '+(B-r).toFixed(2)+' '+h.toFixed(2)
        + 'L'+r+' '+h.toFixed(2)
        + 'A'+r+' '+r+' 0 0 1 0 '+(h-r).toFixed(2)
        + 'L0 '+r+'A'+r+' '+r+' 0 0 1 '+r+' 0Z';
    }
    function pathLeft(w,h,r,tw,th){
      if (h < th + r + 2 || w - tw < r*2 + 4) return null;
      return 'M'+(tw*0.31).toFixed(2)+' 0'
        + 'L'+(w-r).toFixed(2)+' 0'
        + 'A'+r+' '+r+' 0 0 1 '+w.toFixed(2)+' '+r
        + 'L'+w.toFixed(2)+' '+(h-r).toFixed(2)
        + 'A'+r+' '+r+' 0 0 1 '+(w-r).toFixed(2)+' '+h.toFixed(2)
        + 'L'+(tw+r).toFixed(2)+' '+h.toFixed(2)
        + 'A'+r+' '+r+' 0 0 1 '+tw+' '+(h-r).toFixed(2)
        + 'L'+tw+' '+th
        + 'L'+(tw*0.09).toFixed(2)+' '+(th*0.274).toFixed(2)
        + 'C0 '+(th*0.137).toFixed(2)+' '+(tw*0.05).toFixed(2)+' 0 '+(tw*0.31).toFixed(2)+' 0Z';
    }

    var targets = [];
    Array.prototype.forEach.call(document.querySelectorAll('.float--msg'), function(w){
      var el = w.querySelector('.float__i');
      if (el) targets.push({wrap:w, el:el, side:w.classList.contains('float--msg-r')?'r':'l', r:R, tw:TW, th:TH});
    });
    var cm = document.querySelector('.chat__msg');
    if (cm) targets.push({wrap:null, el:cm, side:'l', r:16, tw:12, th:17});

    function draw(){
      targets.forEach(function(t){
        var b = t.el.getBoundingClientRect();
        var w = t.el.offsetWidth, h = t.el.offsetHeight;
        if (!w || !h) return;
        var d = (t.side === 'r') ? pathRight(w,h,t.r,t.tw,t.th) : pathLeft(w,h,t.r,t.tw,t.th);
        if (!d){ t.el.style.clipPath=''; t.el.classList.remove('tailed');
                 if(t.wrap) t.wrap.classList.remove('is-tailed'); return; }
        t.el.style.clipPath = 'path("'+d+'")';
        t.el.classList.add('tailed');
        if (t.wrap) t.wrap.classList.add('is-tailed');
      });
    }

    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if ('ResizeObserver' in window){
      var ro = new ResizeObserver(function(){ draw(); });
      targets.forEach(function(t){ ro.observe(t.el); });
    } else {
      window.addEventListener('resize', draw, {passive:true});
    }
  })();

  /* ---- Pasos: la línea superior se enciende al entrar ---- */
  var steps = document.querySelectorAll('.step');
  if (!reduce && 'IntersectionObserver' in window){
    var io2 = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('is-on'); io2.unobserve(e.target); }
      });
    }, {threshold: 0.35});
    Array.prototype.forEach.call(steps, function(el){ io2.observe(el); });
  } else {
    Array.prototype.forEach.call(steps, function(el){ el.classList.add('is-on'); });
  }

  /* ---- Colorear todos los puntos ---- */
  function colorDots(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      if (node.nodeValue.indexOf('.') !== -1) {
        var p = node.parentNode;
        if (p && p.tagName !== 'SCRIPT' && p.tagName !== 'STYLE' && p.tagName !== 'NOSCRIPT' && (!p.classList || !p.classList.contains('dot-colored'))) {
          var parts = node.nodeValue.split('.');
          if (parts.length > 1) {
            var frag = document.createDocumentFragment();
            for (var i = 0; i < parts.length; i++) {
              if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
              if (i < parts.length - 1) {
                var span = document.createElement('span');
                span.className = 'dot-colored';
                span.style.color = '#FF4D00';
                span.textContent = '.';
                frag.appendChild(span);
              }
            }
            p.replaceChild(frag, node);
          }
        }
      }
    } else if (node.nodeType === 1) {
      if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'SVG' && (!node.classList || !node.classList.contains('dot-colored'))) {
        var children = Array.prototype.slice.call(node.childNodes);
        for (var j = 0; j < children.length; j++) {
          colorDots(children[j]);
        }
      }
    }
  }
  colorDots(document.body);
})();
