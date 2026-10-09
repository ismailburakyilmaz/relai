const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const core=require('./core.cjs');
const privacy=require('./privacy.cjs');
const port=Number(process.env.PORT||4317),host='127.0.0.1';
const origin=`http://${host}:${port}`;
const staticFiles={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
staticFiles['/privacy-ui.js']=['privacy-ui.js','text/javascript; charset=utf-8'];
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
 const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
 if(req.headers.host!==`${host}:${port}`) return reply(403,{error:'Yalnızca yerel adres kullanılabilir.'});
 if(req.headers.origin&&req.headers.origin!==origin)return reply(403,{error:'Geçersiz istek kaynağı.'});
 if(req.method==='GET'&&staticFiles[req.url]){const [file,type]=staticFiles[req.url];res.writeHead(200,{'Content-Type':type});return res.end(fs.readFileSync(path.join(__dirname,file)));}
 if(req.method!=='POST'||!['/api/inspect','/api/convert','/api/handoff','/api/privacy-scan','/api/privacy-apply'].includes(req.url))return reply(404,{error:'Bulunamadı.'});
 if(req.headers['content-type']!=='application/json')return reply(415,{error:'JSON bekleniyor.'});
 try{
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>24*1024*1024){reply(413,{error:'Dosya çok büyük.'});req.resume();return;}chunks.push(chunk);}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(req.url==='/api/inspect')return reply(200,core.inspect(body.input,body.source));
  if(req.url==='/api/privacy-scan')return reply(200,privacy.scan(body.input,body.custom));
  if(req.url==='/api/privacy-apply'){const masked=privacy.apply(body.input,body.custom,body.selected);return reply(200,{summary:masked.summary,preview:core.inspect(masked.input,body.source)});}
  if(req.url==='/api/convert'){
   const masked=privacy.apply(body.input,body.custom||[],body.selected||[]);
   const result=core.convert(masked.input,body.source,body.target);
   result.report.privacy=masked.summary;
   result.report.comparisonScope='Gizlilik seçimleri uygulanmış kopyanın ortak mesaj modeli ile hedef dosya karşılaştırılır. Bu, ham dosyanın tüm alanlarının korunduğu veya tüm hassas bilgilerin kaldırıldığı anlamına gelmez.';
   return reply(200,result);
  }
  return reply(200,{text:core.handoff(body)});
 }catch(e){reply(400,{error:e instanceof SyntaxError?'İstek okunamadı.':String(e.message||e).slice(0,300)});}
});
server.listen(port,host,()=>console.log(`Relai hazır: ${origin}`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'4317 portu kullanımda. Açık uygulamayı kontrol edin.':e.message);process.exitCode=1;});
