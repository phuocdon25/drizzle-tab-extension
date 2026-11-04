import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=process.cwd();
const server=createServer(async(req,res)=>{try {const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname); if(!path.startsWith(root+'/')) throw Error(); const body=await readFile(path);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const child=spawn('npx',['-y','chrome-devtools-mcp@latest','--isolated','--headless','--no-usage-statistics'],{stdio:['pipe','pipe','inherit']});
const timeout=setTimeout(()=>{console.error('Browser test timed out');child.kill();server.close();process.exit(1);},60000);
let seq=0,buffer=''; const pending=new Map();
child.stdout.on('data',chunk=>{buffer+=chunk;let index;while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index);buffer=buffer.slice(index+1);try{const msg=JSON.parse(line);const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}catch{}}});
function rpc(method,params){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
async function call(name,args={}){const result=await rpc('tools/call',{name,arguments:name==='new_page'?args:{pageId:2,...args}});if(result.isError)throw Error(JSON.stringify(result));return result;}
try {
 await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'drizzle-test',version:'1.0'}});
 child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 console.log(JSON.stringify(await call('new_page',{url:`http://127.0.0.1:${server.address().port}/newtab.html`})));
 console.log(JSON.stringify(await call('evaluate_script',{function:`async () => {
 const {state,setTodos}=await import('./js/state.js');
 await setTodos(['A','B','C','D'].map((title,i)=>({id:title,title,createdAt:i,done:false,hidden:false,priority:'medium',deadline:null})));
 document.querySelectorAll('#todo-filters button')[3].click();
 return [...document.querySelectorAll('.todo-title')].map(el=>el.textContent);
 }`})));
 await call('evaluate_script', {function: `() => {
   if (document.querySelector('.todo-drag')) throw Error('Sorting must be off initially');
   document.getElementById('todo-reorder-toggle').click();
   if (document.querySelectorAll('.todo-drag').length !== 4) throw Error('Sorting did not enable');
 }`});
 // Resolve handles from the accessibility tree and perform a native drag.
 const snapshot=JSON.stringify(await call('take_snapshot'));
 const lines=JSON.parse(snapshot).content.filter(x=>x.type==='text').map(x=>x.text).join('\n').split('\n');
 const handles=lines.filter(line=>line.includes('button')&&line.includes('Drag to reorder'));
 
 const uid=line=>line.match(/uid=([^\s]+)/)[1];
 if(handles.length!==4)throw Error('Expected four drag handles');
 console.log(JSON.stringify(await call('drag',{from_uid:uid(handles[2]),to_uid:uid(handles[0])})));
 const check=async(expected)=>{const result=await call('evaluate_script',{function:`() => {const actual=[...document.querySelectorAll('.todo-title')].map(el=>el.textContent);if(JSON.stringify(actual)!==${JSON.stringify(JSON.stringify(expected))})throw Error(JSON.stringify(actual));return actual;}`});console.log('PASS',JSON.stringify(result));};
 await check(['C','A','B','D']);
 await call('navigate_page',{type:'reload'});
 await call('evaluate_script',{function:`()=>document.querySelectorAll('#todo-filters button')[3].click()`});
 await check(['C','A','B','D']);
 await call('evaluate_script',{function:`()=>{
   if (document.querySelector('.todo-drag')) throw Error('Reload should exit sorting');
   document.getElementById('todo-reorder-toggle').click();
   document.querySelector('[data-id="C"] .todo-drag').focus();
 }`});
 await call('press_key',{key:'ArrowDown'});
 await check(['A','C','B','D']);
 for (const sorting of [true, false]) {
 if (!sorting) await call('evaluate_script', {function: `() => {
   document.getElementById('todo-reorder-toggle').click();
   if (document.querySelector('.todo-drag')) throw Error('Sorting handles should be removed');
   if (document.getElementById('todo-reorder-toggle').getAttribute('aria-pressed') !== 'false') throw Error('Toggle state is incorrect');
 }`});
 for (const width of [1920, 1280, 800, 390]) {
   await call('resize_page', { width, height: 1000 });
   console.log('LAYOUT', JSON.stringify(await call('evaluate_script', { function: `() => {
     const rows = [...document.querySelectorAll('.todo-item')];
     for (const row of rows) {
       const rect = selector => row.querySelector(selector)?.getBoundingClientRect();
       const handle = rect('.todo-drag'), check = rect('.check'), main = rect('.todo-main'), actions = rect('.todo-actions');
       const bounds = row.getBoundingClientRect();
       const center = rect => rect.top + rect.height / 2;
       for (const control of [handle, check, actions].filter(Boolean)) {
         if (Math.abs(center(control) - center(main)) > 2) throw Error('Todo controls are not vertically centered');
       }
       if (main.width < 50 || main.left < check.right || actions.right > bounds.right)
         throw Error('Todo columns overlap or overflow');
       if (bounds.height > 110) throw Error('Short todo row is unexpectedly tall');
     }
     return { width: innerWidth, rowHeight: rows[0].getBoundingClientRect().height };
   }` })));
 }
 }
 await check(['A','C','B','D']);
 await call('resize_page', { width: 1920, height: 1080 });
 await call('take_screenshot', { filePath: '/tmp/drizzle-todo-layout.png' });
 console.log('CONSOLE',JSON.stringify(await call('list_console_messages',{types:['error']})));
 console.log('BROWSER TESTS PASSED');
}finally{clearTimeout(timeout);child.kill();server.close();}
