var $=function(i){return document.getElementById(i)};
function dist(a,b){var r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lng-a.lng)*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)*Math.sin(dn/2);return 12742000*Math.asin(Math.sqrt(x))}
function esc(x){return String(x).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function mins(s){return Math.max(0,Math.round(s/60))}
function minTxt(s){var m=mins(s);return m<1?'1 मिनट से कम':m+' मिनट'}
function dw(sec){return sec<60?sec+' सेकंड':Math.round(sec/60)+' मिनट'}
function clock(sec){return new Date(Date.now()+sec*1000).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true})}
function key(p){return p.lat.toFixed(5)+','+p.lng.toFixed(5)}
function mode(st){if(st.running)return Date.now()-st.ts<40000?'live':'weak';return st.startTs?'paused':'off'}
var MODE_TXT={live:'लाइव',weak:'सिग्नल कमज़ोर',paused:'रुकी हुई',off:'बंद'};
// हर स्टॉपेज का समय = (गाड़ी से उस तक दूरी ÷ गति) + पहले वाले स्टॉपेज पर रुकने का समय
function calc(d){
  var s=d.config.stops,st=d.state,home=d.config.home,cur=st.lat!=null?{lat:st.lat,lng:st.lng}:home;
  var v=Math.max(2,Math.min(12,st.speed>1?st.speed:4)),t=0,etas=[];
  for(var i=0;i<s.length;i++){
    if(i<st.done){etas.push(null);continue}
    if(cur)t+=dist(cur,s[i])*1.3/v;
    etas.push(t);t+=(s[i].sec||30);cur=s[i];
  }
  var back=(cur&&home)?dist(cur,home)*1.3/v:0;
  return{etas:etas,remain:t,home:t+back};
}
function fillFacts(d){
  var c=calc(d),st=d.state,s=d.config.stops,go=!!(st.running&&st.startTs&&s.length);
  $('rem').textContent=go?minTxt(c.remain):'--';$('eta').textContent=go?clock(c.home):'--';
  var el=$('delay');el.className='';
  if(go){var dl=(Date.now()-st.startTs)/1000+c.home-d.config.roundMin*60;
    if(Math.abs(dl)<60)el.textContent='समय पर';else{el.textContent=minTxt(Math.abs(dl))+(dl>0?' देरी':' जल्दी');if(dl>0)el.className='late'}}
  else el.textContent='--';
  return{c:c,go:go};
}
function svg(p,w){return '<svg viewBox="0 0 24 24" width="'+w+'" height="'+w+'" fill="#fff"><path d="'+p+'"/></svg>'}
var BOTTLE='M9 2h6v3l-1 2v1.2c1.8.9 3 2.7 3 4.8v7a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-7c0-2.1 1.2-3.9 3-4.8V7L9 5z',HOUSE='M12 3 2 12h3v8h5v-5h4v5h5v-8h3z';
function div(html,size){return L.divIcon({className:'',html:html,iconSize:[size,size],iconAnchor:[size/2,size/2]})}
function initMap(id){
  var m=L.map(id,{zoomControl:false}).setView([26.92,75.79],12);
  L.control.zoom({position:'bottomright'}).addTo(m);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m);
  return{m:m,g:L.layerGroup().addTo(m),r:L.layerGroup().addTo(m),key:'',seenCar:false};
}
function drawMap(M,d,mineKey){
  var c=d.config,st=d.state,pts=[];M.g.clearLayers();
  if(c.home){L.marker([c.home.lat,c.home.lng],{icon:div('<div class="home">'+svg(HOUSE,18)+'</div>',32)}).addTo(M.g);pts.push([c.home.lat,c.home.lng])}
  c.stops.forEach(function(p,i){
    var k=key(p),cls=(i<st.done?' done':'')+(k===mineKey?' mine':'');
    var mk=L.marker([p.lat,p.lng],{icon:div('<div class="mk'+cls+'">'+(i+1)+'</div>',26)}).addTo(M.g).bindTooltip(p.name,{direction:'top',offset:[0,-14],permanent:k===mineKey});
    pts.push([p.lat,p.lng])});
  var hasCar=st.lat!=null&&(st.running||st.startTs);
  if(hasCar){L.marker([st.lat,st.lng],{icon:div('<div class="car">'+svg(BOTTLE,20)+'</div>',40),zIndexOffset:1000}).addTo(M.g);pts.push([st.lat,st.lng])}
  var wp=[];if(c.home)wp.push(c.home);wp=wp.concat(c.stops);if(c.home&&c.stops.length)wp.push(c.home);
  var rk=JSON.stringify(wp.map(function(p){return[p.lat,p.lng]}));
  if(rk!==M.key){M.key=rk;M.r.clearLayers();
    if(pts.length)M.m.fitBounds(pts,{padding:[44,44],maxZoom:17});
    if(wp.length>1){
      var draw=function(ll){M.r.clearLayers();L.polyline(ll,{color:'#fff',weight:9,opacity:.95}).addTo(M.r);L.polyline(ll,{color:'#1B4BDB',weight:5}).addTo(M.r)};
      draw(wp.map(function(p){return[p.lat,p.lng]}));
      fetch('https://router.project-osrm.org/route/v1/driving/'+wp.map(function(p){return p.lng+','+p.lat}).join(';')+'?overview=full&geometries=geojson')
        .then(function(r){return r.json()}).then(function(j){if(M.key===rk&&j.routes&&j.routes[0])draw(j.routes[0].geometry.coordinates.map(function(q){return[q[1],q[0]]}))}).catch(function(){});
    }
  }
  if(hasCar&&(!M.seenCar||!M.m.getBounds().contains([st.lat,st.lng]))){M.seenCar=true;M.m.fitBounds(pts,{padding:[44,44],maxZoom:17})}
}
function listen(cb){
  var pull=function(){fetch('/api/state').then(function(r){return r.json()}).then(cb).catch(function(){})};
  pull();var es=new EventSource('/api/stream');es.onmessage=function(e){cb(JSON.parse(e.data))};setInterval(pull,15000);
}
