import {spawn} from 'node:child_process';
import {cfg,assertConfig} from './config.mjs';

assertConfig();
if(!cfg.autoDeploy)throw new Error('AUTO_DEPLOY must be true to start the mainnet redeploy loop');
const script=new URL('../scripts/prepare-redeploy.mjs',import.meta.url);
console.log(JSON.stringify({event:'redeploy_loop_starting',mode:'realtime-only',maxQueueAgeSeconds:Number(process.env.MAX_QUEUE_AGE_SECONDS||120),broadcast:'mainnet'}));
let stopping=false;
const stop=()=>{stopping=true};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
while(!stopping){
 await new Promise(resolve=>{
  const child=spawn(process.execPath,[script.pathname],{env:{...process.env,SIMULATE:'true',BROADCAST_MAINNET:'true',CONFIRM_MAINNET:'YES'},stdio:'inherit'});
  child.on('exit',()=>resolve());
  child.on('error',err=>{console.error(JSON.stringify({event:'redeploy_child_error',error:err.message}));resolve()});
 });
 if(!stopping)await new Promise(r=>setTimeout(r,500));
}
console.log(JSON.stringify({event:'redeploy_loop_stopped'}));
