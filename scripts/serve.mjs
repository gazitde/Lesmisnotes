import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    const alias=url.pathname.match(/^\/(he|en)\/(tribute|humor)\/?$/);
    if(alias){url.pathname='/'+alias[1]+'/listening/';url.searchParams.set('category',alias[2]==='tribute'?'together':'humor');res.writeHead(308,{Location:url.pathname+url.search});res.end();return;}
    if(url.pathname.replace(/\/$/,'')==='/api/contact'&&fs.existsSync('api/contact.js'))return await require('../api/contact.js')(req,res);
    let filename=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!filename.startsWith(root+path.sep)&&filename!==root){res.writeHead(403);res.end();return;}
    if(fs.existsSync(filename)&&fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');
    const exists=fs.existsSync(filename)&&fs.statSync(filename).isFile();
    if(!exists)filename=path.join(root,'404.html');
    res.writeHead(exists?200:404,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(filename).pipe(res);
  }catch {res.writeHead(500);res.end('Server error');}
}).listen(Number(process.env.PORT||8765),'0.0.0.0',()=>console.log('Local preview: http://localhost:'+(process.env.PORT||8765)));
