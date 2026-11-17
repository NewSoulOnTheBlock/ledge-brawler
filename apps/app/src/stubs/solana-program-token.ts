// Stub: @solana-program/token has version mismatches with @solana/kit pulled by Privy.
// These no-ops satisfy the bundler. We don't execute Solana transactions.
export const findAssociatedTokenPda = (..._: unknown[]) => Promise.resolve([null, 0]);
export const getCreateAssociatedTokenIdempotentInstruction = (..._: unknown[]) => ({});
export const getTransferInstruction = (..._: unknown[]) => ({});
export const TOKEN_PROGRAM_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as const;
