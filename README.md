# pump-launcher

Standalone Pump.fun autonomous launcher/indexer foundation.

## Current behavior

- Subscribes to the official Pump program through Yellowstone gRPC.
- Decodes live `CreateEvent` payloads from the Pump IDL.
- Fetches source metadata.
- Persists source coins and raw event records into Supabase.
- Detects the official `$PUMP` quote mint:
  `pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn`
- Uses the maximum creator fee setting for custom `$PUMP` pairs: `300` bps = `3%`.
- Explicitly sets `holderReward: false`, so creator fees route to the creator wallet, not holders.
- Queues eligible `$PUMP`-paired source coins in `pump_redeployments`.
- Uses idempotent database upserts so reconnects do not duplicate work.
- Keeps transaction submission disabled until a dedicated deployer signer is intentionally configured.

## Run

```bash
npm install
PUMP_LAUNCHER_ENV=/root/.hermes/credentials/pump-launcher.env npm run smoke
PUMP_LAUNCHER_ENV=/root/.hermes/credentials/pump-launcher.env npm start
```

To build an unsigned `create_v2` instruction for the oldest eligible queue item, configure only the public deployer address and run:

```bash
DEPLOYER_PUBLIC_KEY=<public-address> PUMP_LAUNCHER_ENV=/root/.hermes/credentials/pump-launcher.env npm run prepare:redeploy
```

This prepares the instruction and marks the queue item `building`; it does not sign, fund, buy, or broadcast unless the guarded mainnet flags are explicitly set. The realtime-only age gate ignores queued jobs older than 120 seconds, preventing historical backlog launches.

The environment file is root-only and is never committed. The database schema is in `supabase/schema.sql`.

## Important boundary

The worker currently observes and queues. It does not sign or broadcast redeployment transactions. A dedicated deployer wallet, transaction builder, simulation gate, and explicit launch policy must be configured before enabling automatic broadcasts.
