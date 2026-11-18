// A chain of one's own for tests (apps/app/test, the site's pot against the real contracts): Hardhat's simulated
// network in this process, with TestBlades and BladesPot deployed on it, reached over HTTP JSON-RPC as Robinhood Chain
// is, so that the code under test talks to it as it would talk to the real one.
import { createServer } from "node:http";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { type Address, type Hex, toHex } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import config from "./hardhat.config.ts";

/** The accounts of Hardhat's simulated network, each with its private key: 0 owns the pot, 1 is its referee. */
const MNEMONIC = "test test test test test test test test test test test junk";
export const keyOf = (index: number): Hex => toHex(mnemonicToAccount(MNEMONIC, { addressIndex: index }).getHdKey().privateKey!);

export interface LocalChain {
  url: string; chainId: number;
  token: Address; pot: Address;
  /** Gives `to` some of the stand-in for $BLADES. */
  mint(to: Address, amount: bigint): Promise<void>;
  close(): Promise<void>;
}

/** A fresh chain with the pot deployed for a fee of `fee` base units, its referee the account `keyOf(1)`. */
export async function localChain(fee: bigint): Promise<LocalChain> {
  const hre = await createHardhatRuntimeEnvironment(config, {}, import.meta.dirname);
  await hre.tasks.getTask("build").run({ quiet: true });
  const { viem, provider } = await hre.network.create();
  const [owner, referee] = await viem.getWalletClients();
  const token = await viem.deployContract("TestBlades");
  const pot = await viem.deployContract("BladesPot", [token.address, owner.account.address, referee.account.address, fee]);
  const chainId = await (await viem.getPublicClient()).getChainId();
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const ask = JSON.parse(body) as { id: number; method: string; params?: unknown[] };
      const answer = (out: object) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id: ask.id, ...out }));
      provider.request({ method: ask.method, params: ask.params ?? [] }).then(
        (result: unknown) => answer({ result }),
        (error: { code?: number; message?: string; data?: unknown }) => answer({ error: { code: error.code ?? -32603, message: error.message ?? "internal error", data: error.data } }),
      );
    });
  });
  await new Promise<void>((done) => server.listen(0, done));
  const address = server.address();
  return {
    url: `http://localhost:${typeof address === "object" && address ? address.port : 0}`, chainId,
    token: token.address, pot: pot.address,
    mint: async (to, amount) => { await token.write.mint([to, amount]); },
    close: () => new Promise((done) => server.close(() => done())),
  };
}
