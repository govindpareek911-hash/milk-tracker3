// दूध डिलीवरी ट्रैकर - बिना किसी extra package के चलता है (सिर्फ Node.js चाहिए)
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3000, PASS=process.env.ADMIN_PASS||'1234';
const DB=path.join(__dirname,'data.json');
let data={config:{stops:[],home:null,roundMin:60},state:{running:false,done:0,startTs:0,lat:null,lng:null,ts:0,speed:0}};
try{data=JSON.parse(fs.readFileSync(DB,'utf8'))}catch(e){}
const save=()=>fs.writeFile(DB,JSON.stringify(data),()=>{});
const clients=new Set();
const push=()=>{const m='data: '+JSON.stringify(data)+'\n\n';clients.forEach(r=>r.write(m))};
setInterval(()=>clients.forEach(r=>r.write(': ping\n\n')),25000);
const dist=(a,b)=>{const r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lng-a.lng)*r,x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)**2;return 12742000*Math.asin(Math.sqrt(x))};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css'};
const num=v=>typeof v==='number'&&isFinite(v);
const pt=p=>p&&num(p.lat)&&num(p.lng)?{lat:p.lat,lng:p.lng}:null;

http.createServer((req,res)=>{
  const url=req.url.split('?')[0];
  if(req.method==='GET'&&url==='/api/state'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify(data))}
  if(req.method==='GET'&&url==='/api/stream'){
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','connection':'keep-alive'});
    res.write('retry: 3000\ndata: '+JSON.stringify(data)+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;
  }
  if(req.method==='POST'&&url.startsWith('/api/')){
    if(req.headers['x-admin-pass']!==PASS){res.writeHead(401);return res.end('{"error":"password"}')}
    let body='';req.on('data',c=>{body+=c;if(body.length>1e6)req.destroy()});
    req.on('end',()=>{
      let b={};try{b=JSON.parse(body||'{}')}catch(e){}
      const s=data.state,c=data.config;
      if(url==='/api/check'){}
      else if(url==='/api/start'){if(!s.running){if(!s.startTs||s.done>=c.stops.length)Object.assign(s,{done:0,startTs:Date.now()});s.running=true;s.ts=Date.now()}}  // बंद करके दोबारा ऑन करने पर राउंड वहीं से चलता है
      else if(url==='/api/stop'){s.running=false}
      else if(url==='/api/reset'){Object.assign(s,{running:false,done:0,startTs:0,lat:null,lng:null,ts:0,speed:0})}
      else if(url==='/api/location'&&s.running&&num(b.lat)&&num(b.lng)){
        s.lat=b.lat;s.lng=b.lng;s.ts=Date.now();s.speed=num(b.speed)&&b.speed>=0?Math.round(b.speed*10)/10:s.speed;
        while(s.done<c.stops.length&&dist(s,c.stops[s.done])<35)s.done++;   // स्टॉपेज के 35 मीटर के अंदर आते ही ✓
      }
      else if(url==='/api/config'){
        c.home=pt(b.home);
        c.stops=(Array.isArray(b.stops)?b.stops:[]).slice(0,200).map(p=>({...pt(p),name:String(p.name||'').slice(0,60),sec:Math.max(5,Math.min(1800,+p.sec||30))})).filter(p=>p.lat!=null);
        c.roundMin=Math.max(5,Math.min(600,+b.roundMin||60));
        if(s.done>c.stops.length)s.done=c.stops.length;
      }
      save();push();res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true}));
    });return;
  }
  const f=path.join(__dirname,'public',url==='/'?'index.html':url==='/admin'?'admin.html':url);
  if(!f.startsWith(path.join(__dirname,'public'))){res.writeHead(403);return res.end()}
  fs.readFile(f,(e,buf)=>{if(e){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});res.end(buf)});
}).listen(PORT,()=>console.log('चालू: http://localhost:'+PORT+'  | admin: /admin | पासवर्ड: '+PASS));
