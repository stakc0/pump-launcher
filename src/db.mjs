import {cfg} from './config.mjs';
const headers={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`,Prefer:'resolution=merge-duplicates,return=minimal','content-type':'application/json'};
export async function upsert(table,row,onConflict){const u=`${cfg.supabase}/rest/v1/${table}${onConflict?`?on_conflict=${onConflict}`:''}`;const r=await fetch(u,{method:'POST',headers,body:JSON.stringify(row)});if(!r.ok)throw new Error(`Supabase ${table} ${r.status}: ${await r.text()}`);}
export async function get(table,query){const r=await fetch(`${cfg.supabase}/rest/v1/${table}?${query}`,{headers});if(!r.ok)throw new Error(`Supabase read ${table} ${r.status}`);return r.json();}
export async function cursor(name){const rows=await get('pump_worker_cursors',`worker_name=eq.${encodeURIComponent(name)}&select=*`);return rows[0]||null;}
export async function setCursor(name,row){await upsert('pump_worker_cursors',{worker_name:name,...row,updated_at:new Date().toISOString()},'worker_name');}
