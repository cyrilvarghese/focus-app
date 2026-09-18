/**
 * Offset to add to the client clock to get server time, assuming the server stamped its time
 * halfway through the round trip. Server now ≈ Date.now() + offset.
 */
export function clockOffset(sentMs: number, serverMs: number, receivedMs: number): number {
  return serverMs - (sentMs + receivedMs) / 2;
}
