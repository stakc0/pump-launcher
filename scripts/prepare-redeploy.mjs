import {Connection,Keypair,PublicKey,Transaction} from '@solana/web3.js';
import {OnlinePumpSdk,PUMP_SDK} from '@pump-fun/pump-sdk';
import BN from 'bn.js';
import {cfg,assertConfig} from '../src/config.mjs';
import {get,upsert} from '../src/db.mjs';

assertConfig();
const deployer=process.env.DEPLOYER_PUBLIC_KEY;
if(!deployer)throw new Error('DEPLOYER_PUBLIC_KEY is required; no private key is read by this script');
const user=new PublicKey(deployer);
const rows=await get('pump_redeployments','status=eq.queued&quote_mint=eq.'+encodeURIComponent(cfg.quoteMint)+'&select=*&order=created_at.asc&limit=1');
if(!rows[0]){console.log(JSON.stringify({event:'nothing_queued'}));process.exit(0);}
const job=rows[0];
const source=(await get('pump_source_coins','source_mint=eq.'+encodeURIComponent(job.source_mint)+'&select=*'))[0];
if(!source)throw new Error(`source coin missing: ${job.source_mint}`);
const metadata=source.metadata||{};
const connection=new Connection(cfg.rpc,'confirmed');
const sdk=new OnlinePumpSdk(connection);
const quote=new PublicKey(cfg.quoteMint);
const resolved=await sdk.resolveQuoteMint(quote);
const replica=Keypair.generate();
const feeBps=Number(process.env.CREATOR_FEE_BPS||300);if(!Number.isInteger(feeBps)||feeBps<0||feeBps>300)throw new Error('CREATOR_FEE_BPS must be an integer from 0 through 300');
const ix=await PUMP_SDK.createV2Instruction({
  mint:replica.publicKey,
  name:source.name||metadata.name||'Unnamed',
  symbol:source.ticker||metadata.symbol||'COIN',
  uri:source.metadata_uri||metadata.uri||'',
  creator:user,
  user,
  mayhemMode:false,
  cashback:false,
  quoteMint:quote,
  quoteTokenProgram:resolved.quoteTokenProgram,
  creatorFeeBps:new BN(feeBps),
  // Explicitly disabled: all creator fees go to the creator wallet only.
  holderReward:false,
  pumpQuote:resolved.pumpQuote,
});
const tx=new Transaction().add(ix);const latest=await connection.getLatestBlockhash();tx.recentBlockhash=latest.blockhash;tx.feePayer=user;
await upsert('pump_redeployments',{source_mint:job.source_mint,replica_mint:replica.publicKey.toBase58(),creator_wallet:user.toBase58(),quote_mint:cfg.quoteMint,status:'building',attempts:Number(job.attempts||0)+1,updated_at:new Date().toISOString()},'source_mint');
console.log(JSON.stringify({event:'redeploy_prepared',sourceMint:job.source_mint,replicaMint:replica.publicKey.toBase58(),quoteMint:cfg.quoteMint,creator:user.toBase58(),creatorFeeBps:feeBps,holderReward:false,feeRecipient:user.toBase58(),recentBlockhash:tx.recentBlockhash||null,instruction:{programId:ix.programId.toBase58(),keys:ix.keys.map(k=>({pubkey:k.pubkey.toBase58(),isSigner:k.isSigner,isWritable:k.isWritable})),dataBase64:ix.data.toString('base64')}}));
