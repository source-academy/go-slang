import { beforeEach } from 'vitest'

// runCodeSyncMT blocks the Node.js event loop for the entire test duration.
// birpc starts a 60s timer when onTaskUpdate is called. When the event loop
// is finally free, Node.js processes timers before IPC messages, so the
// timeout fires before the ACK arrives. Yielding here lets pending IPC ACKs
// drain and clears those timers before each synchronous test run.
beforeEach(async () => {
  await new Promise<void>((resolve) => setImmediate(resolve))
})
