'use client';

import { useEffect } from 'react';
import './landing.css';

const rawHTML = `<div class="progress" id="prog" aria-hidden="true"></div>

<!-- Marca Abita.ai — lockup e isotipo, extraídos del manual oficial -->
<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>
<symbol id="abita-logo" viewBox="123.98 1129 722.1 121.6">
<path fill="currentColor" d="M325.262 1130.9L283.805 1248.8H309.315L318.005 1223.78H358.952L367.347 1248.8H393.034L351.577 1130.9H325.272H325.262ZM351.45 1201.79H325.262L338.459 1163.4L351.45 1201.79Z"/>
<path fill="currentColor" d="M469.389 1165.67C462.78 1161.69 455.249 1159.68 447.02 1159.68C440.157 1159.68 433.931 1161.1 428.501 1163.93C426.822 1164.79 425.241 1165.77 423.768 1166.85V1129.11H400.595V1248.79H423.022V1242.91C424.691 1244.22 426.498 1245.37 428.462 1246.35C434.01 1249.16 440.255 1250.58 447.02 1250.58C455.376 1250.58 462.937 1248.53 469.487 1244.49C476.017 1240.48 481.25 1234.98 485.04 1228.14C488.831 1221.3 490.755 1213.53 490.755 1205.05C490.755 1196.57 488.831 1188.79 485.04 1181.96C481.23 1175.1 475.958 1169.61 469.379 1165.67L469.389 1165.67ZM434.334 1184.64C437.613 1182.63 441.178 1181.66 445.223 1181.66C449.269 1181.66 453.108 1182.65 456.378 1184.69C459.687 1186.77 462.191 1189.48 464.047 1192.96C465.893 1196.43 466.826 1200.5 466.826 1205.06C466.826 1209.62 465.883 1213.76 464.037 1217.32C462.181 1220.9 459.687 1223.61 456.398 1225.62C450.005 1229.54 441.05 1229.74 434.334 1225.62C431.044 1223.61 428.521 1220.89 426.616 1217.3C424.721 1213.73 423.759 1209.61 423.759 1205.06C423.759 1200.51 424.711 1196.53 426.616 1192.96C428.521 1189.39 431.044 1186.66 434.334 1184.64Z"/>
<path fill="currentColor" d="M573.158 1227.25C571.764 1226.53 570.801 1225.53 570.193 1224.22C569.495 1222.69 569.132 1220.73 569.132 1218.4V1183.17H587.563V1161.49H569.132V1142.9H545.959L545.89 1161.49H531.574V1183.17H545.969V1219.16C545.969 1228.65 548.639 1236.2 553.903 1241.58C559.185 1246.97 566.589 1249.7 575.917 1249.7C577.321 1249.7 578.932 1249.6 580.788 1249.38C582.506 1249.18 584.067 1248.98 585.491 1248.78L588.181 1248.4V1227.67L581.868 1228.34C577.645 1228.76 575.102 1228.27 573.168 1227.25H573.158Z"/>
<path fill="currentColor" d="M653.322 1163.59C643.611 1158.9 630.188 1158.37 619.24 1162.42C614.32 1164.28 609.99 1166.91 606.376 1170.25C602.704 1173.66 599.945 1177.62 598.177 1182.03L597.107 1184.71L616.903 1194.49L618.189 1191.43C619.564 1188.16 621.626 1185.63 624.493 1183.66C627.331 1181.71 630.551 1180.76 634.342 1180.76C638.515 1180.76 641.726 1181.76 644.161 1183.83C646.449 1185.77 647.558 1188.16 647.558 1191.13V1191.57L624.414 1195.39C617.747 1196.45 612.16 1198.3 607.8 1200.89C603.293 1203.55 599.886 1206.93 597.677 1210.88C595.467 1214.85 594.358 1219.34 594.358 1224.25C594.358 1229.54 595.693 1234.24 598.325 1238.24C600.927 1242.22 604.619 1245.33 609.303 1247.47C613.849 1249.54 619.141 1250.59 625.062 1250.59C629.893 1250.59 634.42 1249.88 638.505 1248.47C642.109 1247.25 645.398 1245.53 648.314 1243.35V1248.79H670.742V1191.12C670.742 1184.93 669.19 1179.39 666.117 1174.66C663.073 1169.96 658.772 1166.22 653.312 1163.57L653.322 1163.59ZM647.558 1211.96C647.558 1215.53 646.743 1218.67 645.054 1221.55C643.375 1224.45 641.087 1226.7 638.093 1228.45C635.147 1230.16 631.661 1231.02 627.753 1231.02C624.778 1231.02 622.47 1230.31 620.683 1228.81C619.053 1227.46 618.287 1225.81 618.287 1223.64C618.287 1221.47 619.024 1219.55 620.516 1218.05C622.136 1216.43 624.905 1215.26 628.715 1214.57L647.558 1211.4V1211.95V1211.96Z"/>
<path fill="#FF4D00" d="M715.252 1223.07H691.774V1248.8H715.252V1223.07Z"/>
<path fill="currentColor" d="M791.94 1163.59C782.229 1158.9 768.806 1158.37 757.858 1162.42C752.938 1164.28 748.608 1166.91 744.995 1170.25C741.322 1173.66 738.563 1177.62 736.796 1182.03L735.725 1184.71L755.521 1194.49L756.807 1191.43C758.182 1188.16 760.244 1185.63 763.111 1183.66C765.949 1181.71 769.169 1180.76 772.96 1180.76C777.133 1180.76 780.344 1181.76 782.779 1183.83C785.067 1185.77 786.176 1188.16 786.176 1191.13V1191.57L763.032 1195.39C756.365 1196.45 750.778 1198.3 746.418 1200.89C741.911 1203.55 738.504 1206.93 736.295 1210.88C734.085 1214.85 732.976 1219.34 732.976 1224.25C732.976 1229.54 734.311 1234.24 736.943 1238.24C739.545 1242.22 743.237 1245.33 747.921 1247.47C752.467 1249.54 757.76 1250.59 763.681 1250.59C768.512 1250.59 773.038 1249.88 777.123 1248.47C780.727 1247.25 784.016 1245.53 786.932 1243.35V1248.79H809.36V1191.12C809.36 1184.93 807.808 1179.39 804.735 1174.66C801.691 1169.96 797.39 1166.22 791.931 1163.57L791.94 1163.59ZM786.186 1211.96C786.186 1215.53 785.371 1218.67 783.682 1221.55C782.003 1224.45 779.715 1226.7 776.721 1228.45C773.775 1230.16 770.289 1231.02 766.381 1231.02C763.406 1231.02 761.098 1230.31 759.311 1228.81C757.681 1227.46 756.915 1225.81 756.915 1223.64C756.915 1221.47 757.652 1219.55 759.144 1218.05C760.764 1216.43 763.533 1215.26 767.343 1214.57L786.186 1211.4V1211.95V1211.96Z"/>
<path fill="currentColor" d="M846.074 1161.48H822.9V1248.8H846.074V1161.48Z"/>
<path fill="currentColor" d="M846.074 1129H822.9V1154.74H846.074V1129Z"/>
<path fill="currentColor" d="M522.746 1129.08H499.573V1154.8H522.746V1129.08Z"/>
<path fill="currentColor" d="M522.746 1161.54H499.573V1248.86H522.746V1161.54Z"/>
<path fill="currentColor" d="M227.482 1189.07L227.118 1188.39C225.213 1184.75 220.864 1183.12 220.687 1183.05C220.068 1182.84 219.067 1182.56 217.8 1182.46C217.525 1182.43 217.231 1182.42 216.897 1182.42C216.563 1182.42 216.239 1182.43 215.915 1182.45H215.767L197.396 1182.4H175.43L185.613 1162.97L194.941 1145.19L203.366 1129.04H175.086L167.28 1143.99L151.265 1174.51H151.304L143.645 1189.12C141.819 1192.81 141.868 1197.02 143.783 1200.66C145.688 1204.29 149.105 1206.71 153.15 1207.31C153.661 1207.38 154.201 1207.43 154.81 1207.43H155.418L179.682 1207.4L208.815 1207.49L218.193 1225.37L228.199 1244.43C228.199 1244.43 229.102 1246.12 230.565 1248.89H258.825L235.318 1204.07C233.442 1200.52 230.565 1195.05 227.462 1189.06L227.482 1189.07Z"/>
<path fill="currentColor" d="M160.633 1227.71C160.633 1225.12 159.376 1222.73 157.333 1221.44L147.455 1215.17C144.323 1213.19 140.317 1213.19 137.184 1215.17L127.306 1221.44C125.264 1222.73 124.007 1225.12 124.007 1227.71V1242.57C123.977 1243.22 124.007 1244.71 124.891 1246.19C125.362 1246.97 125.882 1247.44 126.088 1247.62C127.63 1248.92 129.466 1248.92 130.114 1248.89C134.17 1248.71 137.174 1248.89 141.338 1248.84C141.495 1248.84 142.143 1248.84 143.429 1248.84C148.879 1248.82 151.599 1248.84 152.316 1248.84C152.915 1248.84 154.024 1248.84 154.604 1248.84C154.849 1248.84 158.05 1248.86 159.739 1246.19C160.672 1244.71 160.662 1243.18 160.623 1242.57V1227.71H160.633Z"/>
</symbol>
<symbol id="abita-mark" viewBox="894.02 80 377.93 336.06">
<path fill="currentColor" d="M1184.09 248.293L1183.07 246.366C1177.73 236.181 1165.53 231.612 1165.04 231.419C1163.3 230.814 1160.5 230.043 1156.95 229.74C1156.17 229.658 1155.35 229.63 1154.41 229.63C1153.48 229.63 1152.57 229.658 1151.66 229.713H1151.25L1099.75 229.575H1038.17L1066.72 175.129L1092.87 125.28L1116.48 80H1037.21L1015.33 121.922L970.43 207.472H970.541L949.07 248.43C943.951 258.752 944.088 270.561 949.456 280.773C954.796 290.958 964.375 297.729 975.716 299.408C977.147 299.601 978.661 299.738 980.367 299.738H982.074L1050.09 299.656L1131.76 299.904L1158.05 350.028L1186.1 403.483C1186.1 403.483 1188.63 408.218 1192.73 415.98H1271.95L1206.05 290.325C1200.79 280.388 1192.73 265.056 1184.03 248.265L1184.09 248.293Z"/>
<path fill="currentColor" d="M996.69 356.607C996.69 349.34 993.167 342.651 987.442 339.018L959.751 321.456C950.97 315.896 939.739 315.896 930.959 321.456L903.268 339.018C897.543 342.651 894.019 349.34 894.019 356.607V398.253C893.936 400.07 894.019 404.254 896.496 408.41C897.818 410.585 899.276 411.906 899.854 412.401C904.176 416.062 909.324 416.062 911.14 415.98C922.508 415.457 930.931 415.98 942.602 415.842C943.042 415.842 944.859 415.842 948.465 415.842C963.742 415.787 971.367 415.842 973.376 415.842C975.055 415.842 978.165 415.842 979.789 415.842C980.478 415.842 989.451 415.897 994.185 408.41C996.8 404.254 996.773 399.96 996.663 398.253V356.607H996.69Z"/>
</symbol>
</defs></svg>

<!-- ============ NAV ============ -->
<header class="nav" id="nav">
  <div class="wrap nav__in">
    <a class="logo" href="/" aria-label="Abita.ai — inicio"><svg viewBox="0 0 722.1 121.6" role="img" aria-label="Abita.ai"><title>Abita.ai</title><use href="#abita-logo"/></svg></a>
    <nav class="nav__links" aria-label="Principal">
      <a href="#como">Cómo funciona</a>
      <a href="#capacidades">Qué hace</a>
      <a href="#diferencia">La diferencia</a>
      <a href="#precios">Precios</a>
    </nav>
    <div style="display:flex; gap:12px; align-items:center;">
      <a class="btn nav__login" style="background:transparent; color:inherit; box-shadow:none; padding:0 12px; font-weight:500;" href="/login">Iniciar sesión</a>
      <a class="btn btn--primary nav__cta" href="#precios" data-cta>Probar gratis</a>
    </div>
  </div>
</header>

<!-- ============ HERO ============ -->
<section class="hero">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="hero__glow" aria-hidden="true"></div>
  <div class="wrap hero__grid">
    <div>
      <span class="badge badge--dark"><span class="dot-live"></span>Conexión oficial con WhatsApp Business API</span>
      <h1 class="h1" style="margin-top:22px">El mensaje que no<br>contestaste anoche<br>era una venta<span class="h1__dot">.</span></h1>
      <p class="lead">Abita responde tu WhatsApp con inteligencia artificial: contesta preguntas, toma pedidos y agenda citas. Todo el día, todos los días.</p>
      <div class="btn-row">
        <a class="btn btn--primary" href="#precios" data-cta>Probalo 14 días gratis</a>
        <a class="btn btn--ghost-dark" href="#conversacion">Ver cómo responde</a>
      </div>
      <p class="micro">Sin tarjeta. Conectás tu número en 30 minutos.</p>
    </div>

    <div class="stage stage--solo" id="stage">
     <div class="stage__in">

      <div class="float f4 float--msg float--msg-l"><div class="float__i float__i--tile">
        <span class="tile__ic"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.6a12 12 0 0116 0"/><path d="M5 10a8 8 0 0110 0"/><path d="M8 13.4a3.4 3.4 0 014 0"/><circle cx="10" cy="16.6" r="1" fill="currentColor" stroke="none"/></svg></span>
        <span>Conexión<br>oficial</span>
      </div></div>

      <div class="float f1 float--msg float--msg-r"><div class="float__i">
        <span class="float__ic"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v4M13 2v4"/></svg></span>
        <b>Cita agendada</b>
        <span>Jueves 3:30 p.m.</span>
      </div></div>

      <!-- el mensaje sin responder: ahora es el ancla de la escena -->
      <div class="float f0"><div class="float__i float__i--chat">
        <div class="chat__hd">
          <span class="chat__av">K</span>
          <span class="chat__who"><b>Karla M.</b><span>últ. vez hace 9 horas</span></span>
        </div>
        <p class="chat__msg">Buenas noches, ¿cuánto cuesta una limpieza dental?<time>9:52 p.m.</time></p>
        <p class="chat__unread"><span class="dot-live"></span>Sin responder · 10 h 14 min</p>
      </div></div>

      <div class="float f2 float--msg float--msg-r"><div class="float__i">
        <div class="float__row">
          <div><b>Respuesta automática</b><span>Activa · 24/7</span></div>
          <span class="switch" aria-hidden="true"></span>
        </div>
      </div></div>

      <div class="float f3 float--msg float--msg-l"><div class="float__i">
        <span class="float__ic float__ic--warn"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12.5a3.5 3.5 0 003.5-3.5V5a3.5 3.5 0 10-7 0v4a3.5 3.5 0 003.5 3.5z"/><path d="M4.5 9a5.5 5.5 0 0011 0M10 15v3"/></svg></span>
        <b>Te paso esta conversación</b>
        <span>Reclamo detectado</span>
      </div></div>


     </div>
    </div>
  </div>
</section>

<!-- ============ FRANJA DE HECHOS ============ -->
<div class="facts">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap facts__row">
    <span class="fact"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>Conexión oficial de Meta</span>
    <span class="fact"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>Tu número queda a tu nombre</span>
    <span class="fact"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>Listo en 30 minutos</span>
    <span class="fact"><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>Soporte en tu horario</span>
  </div>
</div>

<!-- ============ EL PROBLEMA ============ -->
<section class="sec sec--beige" id="problema">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="reveal">
      <p class="eyebrow eyebrow--light">Lo que pasa hoy</p>
      <h2 class="h2">No es que no te escriban.<br>Es que no alcanzás a contestar.</h2>
    </div>

    <div class="scenes">
      <article class="scene glass reveal">
        <span class="scene__time">9:14 p.m. · Martes</span>
        <p class="scene__quote">«¿Todavía están abiertos?»</p>
        <p class="scene__after">Nadie contesta hasta mañana. Mañana ya comió en otro lado.</p>
      </article>
      <article class="scene glass reveal">
        <span class="scene__time">11:30 a.m. · Sábado</span>
        <p class="scene__quote">Tres personas preguntan el mismo precio.</p>
        <p class="scene__after">Estás atendiendo el mostrador. Contestás dos. La tercera no vuelve a escribir.</p>
      </article>
      <article class="scene glass reveal">
        <span class="scene__time">7:02 a.m. · Lunes</span>
        <p class="scene__quote">14 mensajes de anoche.</p>
        <p class="scene__after">Cuatro eran pedidos. Ninguno sigue esperando.</p>
      </article>
    </div>

    <p class="closer glass tick reveal"><span class="closer__t">Contratar a alguien solo para contestar cuesta más de <span>\$400 al mes</span> y se va a las 6 de la tarde.</span></p>
  </div>
</section>

<!-- ============ LA CONVERSACIÓN · showpiece ============ -->
<section class="thread" id="conversacion" aria-label="Demostración: una conversación respondida por Abita">
  <div class="mark-clip"><svg class="bg-mark bg-mark--pinned" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg></div>
  <div class="thread__track" id="track">
    <div class="thread__pin">
      <div class="wrap thread__grid">

        <div class="thread__copy">
          <p class="eyebrow eyebrow--dark">La misma noche, con Abita</p>
          <h2 class="h2">Mientras bajás,<br>Abita ya contestó.</h2>
          <p>Es el mismo mensaje que quedó sin responder allá arriba. Nadie de tu equipo está despierto. Nadie tuvo que hacer nada.</p>
          <div class="clock">
            <span class="clock__n tnum" id="clockN">0s</span>
            <span class="clock__l">desde que entró el mensaje</span>
          </div>
          <p class="thread__hint" style="text-align:left;margin-top:22px">Elegí tu rubro y mirá la conversación que te tocaría a vos.</p>
        </div>

        <div class="thread__stage">
          <div class="tabs" role="tablist" aria-label="Elegir rubro">
            <button class="tab" role="tab" type="button" data-k="clinica" aria-selected="true">Clínica</button>
            <button class="tab" role="tab" type="button" data-k="restaurante" aria-selected="false">Restaurante</button>
            <button class="tab" role="tab" type="button" data-k="inmobiliaria" aria-selected="false">Inmobiliaria</button>
            <button class="tab" role="tab" type="button" data-k="academia" aria-selected="false">Academia</button>
          </div>

          <div class="monitor thread__phone">
            <div class="monitor__panel">
              <div class="monitor__cam" aria-hidden="true"></div>
              <div class="monitor__screen">
              <div class="laptop__bar" aria-hidden="true">
                <span>Abita · Bandeja</span>
                <span id="lClock">9:52 p.m.</span>
              </div>
              <div class="inbox">
                <aside class="inbox__side" aria-hidden="true">
                  <div class="inbox__head">Bandeja</div>
                  <ul class="inbox__list">
                    <li class="inbox__it inbox__it--on"><span class="inbox__av" id="sAv">K</span><span class="inbox__tx"><b id="sName">Karla M.</b><span id="sPrev">¿Cuánto cuesta una limpieza?</span></span></li>
                    <li class="inbox__it"><span class="inbox__av">M</span><span class="inbox__tx"><b>Mario Cruz</b><span>Confirmado, muchas gracias</span></span><span class="inbox__n">2</span></li>
                    <li class="inbox__it"><span class="inbox__av">S</span><span class="inbox__tx"><b>Sofía Ramírez</b><span>¿Atienden el sábado?</span></span></li>
                    <li class="inbox__it"><span class="inbox__av">A</span><span class="inbox__tx"><b>Andrea Melgar</b><span>¿Me pueden llamar mañana?</span></span><span class="inbox__n">1</span></li>
                    <li class="inbox__it"><span class="inbox__av">W</span><span class="inbox__tx"><b>Wilber Cañas</b><span>Perfecto, ahí llego</span></span></li>
                    <li class="inbox__it"><span class="inbox__av">G</span><span class="inbox__tx"><b>Gabriela Rivas</b><span>¡Gracias! 🙌</span></span></li>
                    <li class="inbox__it"><span class="inbox__av">E</span><span class="inbox__tx"><b>Ernesto Portillo</b><span>¿Aceptan tarjeta?</span></span></li>
                  </ul>
                  <div class="inbox__by"><span class="dot-live"></span>3 agentes conectados</div>
                </aside>
                <section class="inbox__chat">
                  <div class="phone__bar">
                    <div class="phone__av" id="tAv">K</div>
                    <div>
                      <div class="phone__name" id="tName">Karla M.</div>
                      <div class="phone__sub" id="typing">en línea</div>
                    </div>
                  </div>
                  <div class="thread__body" id="threadBody" aria-live="polite"></div>
                </section>
              </div>
            </div>
            </div>
            <div class="monitor__neck" aria-hidden="true"></div>
            <div class="monitor__foot" aria-hidden="true"></div>
          </div>

          <p class="thread__hint" id="tFoot">Consulta nocturna · La clínica cerró a las 6:00 p.m.</p>
        </div>

        <div class="thread__mobile-copy">
          <div class="clock" style="margin-top:0">
            <span class="clock__n tnum" id="clockM">0s</span>
            <span class="clock__l">desde que entró el mensaje</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</section>

<!-- ============ CÓMO FUNCIONA ============ -->
<section class="sec sec--white" id="como">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="reveal">
      <p class="eyebrow eyebrow--light">En 30 minutos</p>
      <h2 class="h2">Tres pasos. Ninguno necesita<br>que sepás de tecnología.</h2>
    </div>

    <div class="steps">
      <article class="step glass reveal"><span class="step__n"></span>
        <h3 class="h3">Conectás tu WhatsApp</h3>
        <p>Le das permiso desde el registro oficial de WhatsApp. No instalás nada, no compartís contraseñas. <strong>Tu número y tu cuenta quedan a tu nombre</strong>, no al nuestro. Si algún día te vas, te los llevás.</p>
      </article>
      <article class="step glass reveal"><span class="step__n"></span>
        <h3 class="h3">Le enseñás tu negocio</h3>
        <p>Le pasás tu menú, tus precios, tus horarios, tus servicios. Abita contesta con esa información. <strong>No inventa lo que no le diste.</strong></p>
      </article>
      <article class="step glass reveal"><span class="step__n"></span>
        <h3 class="h3">Lo probás antes de soltarlo</h3>
        <p>Escribile vos desde el simulador. Preguntale lo que te preguntan tus clientes, ajustá lo que no te guste. <strong>Cuando estés conforme, lo activás.</strong></p>
      </article>
    </div>
  </div>
</section>

<!-- ============ CAPACIDADES ============ -->
<section class="sec sec--beige" id="capacidades">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="reveal">
      <p class="eyebrow eyebrow--light">Capacidades</p>
      <h2 class="h2">Contesta como contestarías vos<br>un buen día.</h2>
    </div>

    <div class="caps">
      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 12a2 2 0 01-2 2H7l-4 3V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></div>
        <div>
          <h3>Responde lo de siempre</h3>
          <p>Precios, horarios, ubicación, formas de pago, si hay parqueo. Las mismas 20 preguntas que contestás todos los días.</p>
        </div>
      </article>

      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h2l2 10h9l2-7H5"/><circle cx="8" cy="16.5" r="1.3"/><circle cx="15" cy="16.5" r="1.3"/></svg></div>
        <div>
          <h3>Toma pedidos</h3>
          <p>Muestra el menú, arma la orden, confirma la dirección y te la pasa lista para despachar.</p>
        </div>
      </article>

      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14M7 2v4M13 2v4"/></svg></div>
        <div>
          <h3>Agenda citas</h3>
          <p>Consulta tu disponibilidad, aparta el espacio y manda el recordatorio el día anterior.</p>
        </div>
      </article>

      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h14M5 10h10M8 15h4"/></svg></div>
        <div>
          <h3>Califica leads</h3>
          <p>Configura puntajes según las respuestas. Así tus vendedores se enfocan en cerrar las ventas solo con los clientes que realmente están interesados.</p>
        </div>
      </article>

      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5.5L13 2z"/><path d="M13 2v4h4"/></svg></div>
        <div>
          <h3>Envía cualquier archivo</h3>
          <p>Puede compartir catálogos, imágenes, PDF y cualquier tipo de archivo sin problemas.</p>
        </div>
      </article>

      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M17 10a7 7 0 0 1-14 0"/><path d="M10 17v2"/><path d="M8 19h4"/></svg></div>
        <div>
          <h3>Entiende notas de voz</h3>
          <p>Puede escuchar y entender audios enviados por tus clientes como si fueran texto normal.</p>
        </div>
      </article>

      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="10" cy="5" rx="8" ry="3"/><path d="M2 5v10c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M2 10c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg></div>
        <div>
          <h3>Lee bases de datos</h3>
          <p>Puede consultar el estado de algún pedido en tu sistema para que no tengas que ir a corroborar a mano.</p>
        </div>
      </article>

      <article class="cap glass reveal">
        <div class="cap__ico"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.8-2.8L3 18l5.4-5.4A2 2 0 0 1 10 12h0"></path></svg></div>
        <div>
          <h3>Sabe cuándo callarse</h3>
          <p>Si la conversación se sale de lo que maneja —un reclamo, una negociación, algo delicado— te la pasa a vos y se hace a un lado. No improvisa, no inventa un precio, no promete lo que no puede cumplir.</p>
        </div>
      </article>
    </div>
  </div>
</section>

<!-- ============ DIFERENCIADORES ============ -->
<section class="sec sec--black" id="diferencia">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="reveal">
      <p class="eyebrow eyebrow--dark">La diferencia</p>
      <h2 class="h2" style="color:var(--white)">La mayoría de los «bots de WhatsApp»<br>te van a costar el número.</h2>
    </div>

    <div class="diffs">
      <article class="diff diff--wide glass glass--dark reveal" data-open="false">
              <button class="acc-hd" type="button" aria-expanded="false" aria-controls="dbd1">
                <span><span class="diff__n">01 · CONEXIÓN</span><h3>Oficial, no un atajo que te cuesta el número</h3></span>
              </button>
              <div class="acc-bd" id="dbd1"><div><p>Muchos proveedores conectan tu WhatsApp con librerías no oficiales. Funcionan, hasta que Meta detecta la conexión y bloquea el número. Ahí perdés tu número, tus conversaciones y tus clientes. <em>Abita se conecta por la API oficial de WhatsApp Business: la conexión que Meta autoriza.</em></p></div></div>
            </article>

      <article class="diff glass glass--dark reveal" data-open="false">
              <button class="acc-hd" type="button" aria-expanded="false" aria-controls="dbd2">
                <span><span class="diff__n">02 · INTELIGENCIA</span><h3>IA de verdad, no un árbol de opciones</h3></span>
              </button>
              <div class="acc-bd" id="dbd2"><div><p>«Marque 1 para horarios, 2 para precios» no es inteligencia artificial. Abita usa Claude, de Anthropic: <em>entiende lo que le escriben</em> aunque venga con faltas de ortografía, audios mal dictados o tres preguntas en un solo mensaje.</p></div></div>
            </article>

      <article class="diff glass glass--dark reveal" data-open="false">
              <button class="acc-hd" type="button" aria-expanded="false" aria-controls="dbd3">
                <span><span class="diff__n">03 · PROPIEDAD</span><h3>El número es tuyo</h3></span>
              </button>
              <div class="acc-bd" id="dbd3"><div><p>La cuenta de WhatsApp Business queda registrada a nombre de tu empresa, no a nombre de Abita. <em>Es tuya desde el día uno</em> — y sigue siéndolo si un día decidís irte.</p></div></div>
            </article>

      <article class="diff glass glass--dark reveal" data-open="false">
              <button class="acc-hd" type="button" aria-expanded="false" aria-controls="dbd4">
                <span><span class="diff__n">04 · EQUIPO</span><h3>Varios atienden desde un solo lugar</h3></span>
              </button>
              <div class="acc-bd" id="dbd4"><div><p>Tu equipo trabaja desde una bandeja compartida. Todos ven la misma conversación, <em>nadie contesta dos veces</em> y nada se pierde cuando alguien sale de vacaciones.</p></div></div>
            </article>

      <article class="diff glass glass--dark reveal" data-open="false">
              <button class="acc-hd" type="button" aria-expanded="false" aria-controls="dbd5">
                <span><span class="diff__n">05 · GLOBAL</span><h3>En cualquier idioma y horario</h3></span>
              </button>
              <div class="acc-bd" id="dbd5"><div><p>El bot responde al instante en <em>cualquier idioma y a cualquier hora</em>, sin importar en qué país o zona horaria se encuentren tus clientes.</p></div></div>
            </article>
    </div>
  </div>
</section>

<!-- ============ RUBROS ============ -->
<section class="sec sec--white" id="rubros">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="reveal">
      <p class="eyebrow eyebrow--light">Casos</p>
      <h2 class="h2">Lo mismo, pero con<br>las preguntas de tu negocio.</h2>
    </div>

    <div class="nichos">
      <article class="nicho glass reveal" data-open="false"><button class="acc-hd" type="button" aria-expanded="false" aria-controls="nbd1"><span><h3>Restaurantes con delivery</h3></span></button><div class="acc-bd" id="nbd1"><div><p>Toma el pedido, confirma la dirección y avisa cuándo sale el motorista. A las 11 de la noche también.</p></div></div></article>
      <article class="nicho glass reveal" data-open="false"><button class="acc-hd" type="button" aria-expanded="false" aria-controls="nbd2"><span><h3>Clínicas y consultorios</h3></span></button><div class="acc-bd" id="nbd2"><div><p>Agenda, reagenda y recuerda la cita. Filtra lo que sí necesita hablar con el doctor.</p></div></div></article>
      <article class="nicho glass reveal" data-open="false"><button class="acc-hd" type="button" aria-expanded="false" aria-controls="nbd3"><span><h3>Inmobiliarias</h3></span></button><div class="acc-bd" id="nbd3"><div><p>Pregunta zona, presupuesto y cuándo se quiere mudar. Te pasa solo los que van en serio.</p></div></div></article>
      <article class="nicho glass reveal" data-open="false"><button class="acc-hd" type="button" aria-expanded="false" aria-controls="nbd4"><span><h3>E-commerce en Instagram</h3></span></button><div class="acc-bd" id="nbd4"><div><p>Contesta tallas, colores y disponibilidad. Cierra la venta sin que alguien esté pegado al teléfono.</p></div></div></article>
      <article class="nicho glass reveal" data-open="false"><button class="acc-hd" type="button" aria-expanded="false" aria-controls="nbd5"><span><h3>Profesionales independientes</h3></span></button><div class="acc-bd" id="nbd5"><div><p>Explica cómo trabajás, cuánto cobrás y agenda la primera sesión mientras vos estás en sesión.</p></div></div></article>
      <article class="nicho glass reveal" data-open="false"><button class="acc-hd" type="button" aria-expanded="false" aria-controls="nbd6"><span><h3>Academias y escuelas</h3></span></button><div class="acc-bd" id="nbd6"><div><p>Responde horarios, cupos, mensualidad y requisitos. En época de matrícula, sola.</p></div></div></article>
    </div>
  </div>
</section>

<!-- ============ PRECIOS ============ -->
<section class="sec sec--beige" id="precios">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="reveal">
      <p class="eyebrow eyebrow--light">Planes</p>
      <h2 class="h2">Menos que un empleado.<br>Y no se va a las 6.</h2>
      <p class="lead muted-light" style="margin-top:16px">14 días gratis. Sin tarjeta. Cancelás cuando querás.</p>
    </div>

    <div class="plans">
      <article class="plan glass reveal">
        <span class="plan__slot" aria-hidden="true"></span>
        <div class="plan__name">Lite</div>
        <div class="plan__price"><span class="plan__amt">\$35.0</span><span class="plan__per">/mes</span></div>
        <ul>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span><b>250</b> mensajes al mes</span></li>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span>Simulador</span></li>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span>Soporte técnico</span></li>
        </ul>
        <a class="btn btn--ghost-light" href="#precios" data-cta>Empezar gratis</a>
      </article>

      <article class="plan plan--feat glass glass--dark reveal">
        <span class="badge badge--dark" style="align-self:flex-start">El más elegido</span>
        <div class="plan__name">Starter</div>
        <div class="plan__price"><span class="plan__amt">\$50.0</span><span class="plan__per">/mes</span></div>
        <ul>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span><b>500</b> mensajes al mes</span></li>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span>Simulador</span></li>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span>Soporte técnico</span></li>
        </ul>
        <a class="btn btn--primary" href="#precios" data-cta>Empezar gratis</a>
      </article>

      <article class="plan glass reveal">
        <span class="plan__slot" aria-hidden="true"></span>
        <div class="plan__name">Growth</div>
        <div class="plan__price"><span class="plan__amt">\$80.0</span><span class="plan__per">/mes</span></div>
        <ul>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span><b>1,000</b> mensajes al mes</span></li>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span>Simulador</span></li>
          <li><svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg><span>Soporte técnico</span></li>
        </ul>
        <a class="btn btn--ghost-light" href="#precios" data-cta>Empezar gratis</a>
      </article>
    </div>

    <p class="small muted-light reveal" style="margin-top:26px">El límite aplica a mensajes enviados por el bot o por campañas (plantillas). Los mensajes enviados manualmente no cuentan en este límite.</p>
  </div>
</section>

<!-- ============ FAQ ============ -->
<section class="sec sec--white" id="faq">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="reveal">
      <p class="eyebrow eyebrow--light">Preguntas</p>
      <h2 class="h2">Lo que nos preguntan<br>antes de decidirse.</h2>
    </div>

    <div class="faq glass reveal">
      <details>
        <summary>¿Mis clientes se van a dar cuenta de que no soy yo?</summary>
        <p>Abita se presenta con el nombre de tu negocio y habla con tu tono. Podés decidir si aclara que es un asistente o no. Lo que sí: no finge ser una persona específica de tu equipo.</p>
      </details>
      <details>
        <summary>¿Qué pasa si no sabe responder algo?</summary>
        <p>Te pasa la conversación y te avisa. Preferimos que diga «dejame confirmarte eso» a que invente un precio que no existe. Y lo mejor: vos le enseñás cómo contestar, y la próxima vez que alguien pregunte lo mismo, ya sabe.</p>
      </details>
      <details>
        <summary>¿Tengo que cambiar mi número?</summary>
        <p>No. Se conecta el número que ya usás, y la cuenta queda registrada a nombre de tu empresa.</p>
      </details>
      <details>
        <summary>¿Necesito saber de tecnología?</summary>
        <p>No. La configuración es un formulario y una conversación. Si te trabás, te acompañamos por WhatsApp.</p>
      </details>
      <details>
        <summary>¿Y si quiero contestar yo?</summary>
        <p>Entrás a la bandeja y tomás la conversación cuando querás. Abita se hace a un lado hasta que vos la soltés.</p>
      </details>
      <details>
        <summary>¿Puedo cancelar?</summary>
        <p>Cuando querás, desde tu cuenta. No hay contrato de permanencia ni penalidad.</p>
      </details>
      <details>
        <summary>¿Qué pasa con mis conversaciones si me voy?</summary>
        <p>Son tuyas. El número y la cuenta de WhatsApp están a tu nombre, así que se quedan con vos.</p>
      </details>
    </div>
  </div>
</section>

<!-- ============ CTA FINAL ============ -->
<section class="sec sec--black final">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap reveal">
    <h2 class="h2">Ahora mismo alguien<br>te está escribiendo.</h2>
    <p class="lead">La conversación de arriba se cerró en menos de un minuto, pasadas las diez de la noche. Nadie de tu equipo estaba despierto.</p>
    <div class="btn-row">
      <a class="btn btn--primary" href="#precios" data-cta>Empezar los 14 días gratis</a>
    </div>
    <p class="micro">Sin tarjeta. Sin contrato. Conectás tu número en 30 minutos.</p>

    <div class="trust__grid">
      <article class="trust__it glass glass--dark">
        <span class="trust__ico trust__ico--wa"><svg viewBox="0 0 720 720" role="img" aria-label="WhatsApp"><path fill="#fff" d="M360,0C161.18,0,0,161.18,0,360c0,65.41,17.45,126.75,47.94,179.61L0,720l187.02-44.21c51.34,28.18,110.28,44.21,172.98,44.21,198.82,0,360-161.18,360-360S558.82,0,360,0ZM360,655.52c-60.17,0-116.13-17.98-162.82-48.87l-110.49,28.14,30.99-105.61c-33.53-47.93-53.2-106.26-53.2-169.19,0-163.21,132.31-295.52,295.52-295.52s295.52,132.31,295.52,295.52-132.31,295.52-295.52,295.52Z"/><path fill="#fff" d="M444.35,407.52l87.1,41.06c4,1.88,6.56,5.94,6.2,10.34-.94,11.46-5.54,34.43-26.13,55.02-58.12,58.12-162.49-7.64-166.74-10.18-25.67-13.79-50.06-32.24-73.19-55.36s-41.58-47.52-55.37-73.19c-2.55-4.24-68.31-108.61-10.18-166.74,20.59-20.59,43.56-25.19,55.02-26.13,4.41-.36,8.46,2.2,10.34,6.2l41.07,87.1c1.94,4.12,1.09,9.02-2.13,12.24l-30.61,30.61c-6.62,6.62-8.56,16.93-4,25.11,11.17,20.03,26.19,39.32,43.59,57.07,17.75,17.4,37.04,32.43,57.07,43.59,8.18,4.56,18.48,2.62,25.11-4l30.61-30.61c3.22-3.22,8.12-4.08,12.24-2.13Z"/></svg></span>
        <b>WhatsApp Business API</b>
        <span>La conexión oficial · tu número queda a tu nombre</span>
      </article>
      <article class="trust__it glass glass--dark">
        <span class="trust__ico"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.2v15.6M3.2 6.1l13.6 7.8M16.8 6.1L3.2 13.9"/></svg></span>
        <b>Powered by Claude</b>
        <span>La IA de Anthropic que entiende y responde</span>
      </article>
    </div>
  </div>
</section>


<!-- ============ CAPTURA DE LEAD ============ -->
<div class="lm" id="lm" data-open="false" role="dialog" aria-modal="true" aria-labelledby="lm-t" aria-hidden="true">
  <div class="lm__scrim" data-lm-close></div>
  <div class="lm__panel">
    <button class="lm__x" type="button" data-lm-close aria-label="Cerrar">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>
    </button>

    <form class="lm__form" id="lm-form" novalidate onsubmit="(function(e){e.preventDefault();e.stopImmediatePropagation();var nom=document.getElementById('lm-nom').value.trim();var neg=document.getElementById('lm-neg').value.trim();var rub=document.getElementById('lm-rub').value.trim();var conv=parseInt(document.getElementById('lm-conv').value)||0;var mprom=parseInt(document.getElementById('lm-mprom').value)||0;if(!nom||!neg||!rub||!conv||!mprom){document.getElementById('lm-err').textContent='Por favor completá todos los campos.';return;}document.getElementById('lm-err').textContent='';var total=conv*mprom;var msg='Hola, te saluda '+nom+', mi negocio es '+neg+' ('+rub+') y envio aproximadamente '+total+' mensajes al día';var url='https://wa.me/50376003378?text='+encodeURIComponent(msg);var waLink=document.getElementById('lm-wa');if(waLink)waLink.href=url;var form=document.getElementById('lm-form');var done=document.querySelector('.lm__done');if(form)form.style.display='none';if(done)done.removeAttribute('hidden');window.open(url,'_blank');})(event)">
      <h3 id="lm-t">Empezá tus 14 días gratis</h3>
      <p class="lm__sub">Sin tarjeta, sin contrato.</p>

      <div class="lm__grid">
        <div class="f f--wide">
          <label for="lm-nom">Tu nombre</label>
          <input id="lm-nom" name="nombre" type="text" autocomplete="name" placeholder="Gabriel" required>
        </div>
        <div class="f f--wide">
          <label for="lm-neg">Nombre de tu negocio</label>
          <input id="lm-neg" name="negocio" type="text" autocomplete="organization" placeholder="Clínica Dental Sonrisa" required>
        </div>

        <div class="f f--wide">
          <label for="lm-rub">Rubro</label>
          <input id="lm-rub" name="rubro" type="text" placeholder="Ej: Clínica dental, tienda de ropa, restaurante…" required>
        </div>

        <div class="f" style="position:relative">
          <label for="lm-conv">Conversaciones al día</label>
          <span style="display:block;font-size:11.5px;color:var(--gray);margin-bottom:6px;line-height:1.3">Número aproximado de clientes que te escriben por día</span>
          <input id="lm-conv" name="conversaciones" type="number" min="1" placeholder="30" required>
        </div>
        <div class="f" style="position:relative">
          <label for="lm-mprom">Mensajes por conversación</label>
          <span style="display:block;font-size:11.5px;color:var(--gray);margin-bottom:6px;line-height:1.3">Promedio de mensajes que tu envias en cada conversación</span>
          <input id="lm-mprom" name="mensajes_promedio" type="number" min="1" placeholder="5" required>
        </div>
      </div>

      <p class="lm__err" id="lm-err" role="alert"></p>
      <button class="btn btn--primary" type="submit">Seguir por WhatsApp</button>
      <p class="lm__legal">Seguimos la conversación por WhatsApp. Nada de correo basura.</p>
    </form>

    <div class="lm__done" aria-live="polite">
      <span class="lm__tick" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5.2 5.2L20 7"/></svg>
      </span>
      <h3>Listo, te abrimos WhatsApp</h3>
      <p class="lm__sub" style="margin-bottom:0">Si no se abrió solo, <a href="#" id="lm-wa" rel="noopener">tocá acá para escribirnos</a>.</p>
    </div>
  </div>
</div>

<!-- ============ FOOTER ============ -->
<footer class="foot">
  <svg class="bg-mark" viewBox="0 0 377.93 336.06" aria-hidden="true"><use href="#abita-mark"/></svg>
  <div class="wrap">
    <div class="foot__grid">
      <div>
        <a class="logo logo--sm" href="/" aria-label="Abita.ai — inicio"><svg viewBox="0 0 722.1 121.6" role="img" aria-label="Abita.ai"><title>Abita.ai</title><use href="#abita-logo"/></svg></a>
        <p class="small" style="margin-top:14px;max-width:30ch">Tu WhatsApp contesta, aunque vos estés durmiendo.</p>
      </div>
      <div>
        <h4>Producto</h4>
        <ul>
          <li><a href="#como">Cómo funciona</a></li>
          <li><a href="#capacidades">Qué hace</a></li>
          <li><a href="#diferencia">La diferencia</a></li>
          <li><a href="#precios">Precios</a></li>
        </ul>
      </div>
      <div>
        <h4>Empresa</h4>
        <ul>
          <li><a href="#faq">Preguntas</a></li>
          <li><a href="#precios" data-link="contacto">Contacto</a></li>
        </ul>
      </div>
      <div>
        <h4>Legal</h4>
        <ul>
          <li><a href="#precios" data-link="terminos">Términos</a></li>
          <li><a href="#precios" data-link="privacidad">Privacidad</a></li>
        </ul>
      </div>
    </div>
    <p class="foot__legal">
      Abita.ai — San Salvador, El Salvador.<br>
      WhatsApp y Meta son marcas de Meta Platforms, Inc. Claude es una marca de Anthropic.
    </p>
  </div>
</footer>`;

export function LandingClient() {
  useEffect(() => {
    // Add js class to html root
    document.documentElement.classList.add('js');
    // Force scroll to top on mount
    window.scrollTo({ top: 0, behavior: 'instant' });

    const configScript = document.createElement('script');
    configScript.src = '/assets/config.js';
    configScript.async = false;
    document.body.appendChild(configScript);

    const appScript = document.createElement('script');
    appScript.src = '/assets/app.js';
    appScript.async = false;
    document.body.appendChild(appScript);

    return () => {
      document.documentElement.classList.remove('js');
      if (document.body.contains(configScript)) document.body.removeChild(configScript);
      if (document.body.contains(appScript)) document.body.removeChild(appScript);
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: rawHTML }} />;
}
