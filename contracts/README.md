# Contracts: Five Blades on Robinhood Chain

Pro mode's money lives here: the entry fees of paid Survival runs and Versus matches, and every pot paid out of
them. The site ([`apps/app/server/api/_pro.js`](../apps/app/server/api/_pro.js)) is the pot's **referee**. It seats
players and says who won, always on the arena server's word ([`spec/app/bout.md`](../spec/app/bout.md)).

[Robinhood Chain](https://docs.robinhood.com/chain/) is an Arbitrum Orbit chain, and gas is paid in ETH.

| | Mainnet | Testnet |
|---|---|---|
| Chain id | 4663 | 46630 |
| Public RPC (rate limited) | `https://rpc.mainnet.chain.robinhood.com` | `https://rpc.testnet.chain.robinhood.com` |
| Alchemy | `https://robinhood-mainnet.g.alchemy.com/v2/<key>` | `https://robinhood-testnet.g.alchemy.com/v2/<key>` |
| Explorer | [Blockscout](https://robinhoodchain.blockscout.com), [Etherscan](https://robin.etherscan.io) | [Blockscout](https://explorer.testnet.chain.robinhood.com) |
| ETH | [bridge](https://docs.robinhood.com/chain/bridging) | [faucet](https://faucet.testnet.chain.robinhood.com) |

## What is here

- **`contracts/BladesPot.sol`**: the pot. $BLADES itself is launched elsewhere; the pot is deployed with its address.
  - `enter(player, pot, deadline, v, r, s)`: the referee seats a player. The player's fee goes into the pot,
    paid by their EIP-2612 permit for exactly the fee, or by an allowance they gave the pot. The referee sends the
    transaction and pays its gas, so a player paying by permit needs no ETH.
  - `settle(pot, entry)`: pays the whole pot, once, to the player of `entry`. That entry must be in the same pot.
  - `refund(entry)`: the referee gives an unpaid pot's entry back to whoever paid it.
  - `reclaim(entry)`: the player takes their own fee back, seven days after entering, if its pot was never paid out.
    If the site goes away, no fee is stuck.
  - The owner (a safe, not a hot key) can change the referee and the fee. It can `sweep` tokens sent to the contract
    by mistake, but never a fee held for a pot.
  - Pots are named by the site: `keccak256("<site>:versus:<match id>")` and `keccak256("<site>:survival:<UTC day
    number>")`. `<site>` is a random id that the site's database makes once. A reset database, or a preview sharing
    the contract, never opens a pot that was already used.
- **`contracts/test/TestBlades.sol`**: a stand-in for $BLADES, for tests and the testnet only. It has permits, and
  anyone may mint it.
- **`test/pot.test.ts`**: the pot on Hardhat's simulated network. **`testing.ts`**: a chain of a test's own, with
  both contracts deployed and reached over JSON-RPC. The site's pot journey in
  [`apps/app/test/app.test.ts`](../apps/app/test/app.test.ts) runs on it.

What a leaked referee key can and cannot do:

- **Can:** settle an open pot to an entrant the attacker controls, and spend allowances that players left standing
  (permits leave none).
- **Cannot:** send any fee outside the pots, or pay a pot twice.

If the referee key leaks, the owner calls `setReferee` to replace it.

## Build, test, deploy

Run these from this folder: `pnpm test` (it builds first), then `npx hardhat ignition deploy …`.

Keys never go in the code. Hardhat reads `DEPLOYER_PRIVATE_KEY` and `ETHERSCAN_API_KEY` from its keystore
(`npx hardhat keystore set DEPLOYER_PRIVATE_KEY`) or from the environment. Set `ROBINHOOD_RPC_URL` or
`ROBINHOOD_TESTNET_RPC_URL` to use a provider's RPC instead of the public one.

**Testnet.** This deploys a TestBlades and a pot that takes it, both owned and refereed by the deployer:

```sh
npx hardhat ignition deploy ignition/modules/Testnet.ts --network robinhoodTestnet --verify
```

**Sepolia.** The same module, deployed with `--network sepolia`. The pot here was tried end to end with the site's
own `_pro.js`: two Versus entries, the whole pot paid to the arena's winner, a lone seat refunded, and a day's
Survival pot paid to its best run. The players held no ETH; the referee paid every gas. Source verified on
Blockscout and Sourcify.

| | Sepolia (11155111) |
|---|---|
| TestBlades | [`0xc0EaDc34afE8980D0f91442d8A6c660Cc58f8B40`](https://eth-sepolia.blockscout.com/address/0xc0EaDc34afE8980D0f91442d8A6c660Cc58f8B40) |
| BladesPot (fee 50,000) | [`0xb9B4D8fF699bf90303Fc385983A78Da13aD1aC17`](https://eth-sepolia.blockscout.com/address/0xb9B4D8fF699bf90303Fc385983A78Da13aD1aC17) |
| Owner and referee | `0x9D1236f89C5f680B6d380612F2b4f210F668Bb1a` |

**Mainnet.** Once $BLADES is launched:

1. Copy `ignition/parameters/robinhood.example.json` to `robinhood.json`.
2. Fill in the token's address, the owner (a safe), the referee (the address of the site's `REFEREE_KEY`), and the
   fee in base units.
3. Deploy, and send the referee some ETH for gas:

```sh
npx hardhat ignition deploy ignition/modules/BladesPot.ts --network robinhood --parameters ignition/parameters/robinhood.json --verify
```

## The site

Set these on the Vercel project. Pro mode stays closed until the first three are set.

| Variable | Value |
|---|---|
| `BLADES_TOKEN` | the $BLADES token's address |
| `BLADES_POT` | the pot's address |
| `REFEREE_KEY` | the referee's private key; the account needs ETH for gas |
| `CHAIN_ID` | `4663` (the default); `46630` for the testnet, `11155111` for Sepolia |
| `CHAIN_RPC` | the RPC, such as Alchemy's |
| `PRO_SIGNING_KEY`, `DATABASE_URL` | as before |

For a test build of the game, set `VITE_CHAIN_ID` to the same id as `CHAIN_ID`.

The schema in [`apps/app/server/pro.sql`](../apps/app/server/pro.sql) is additive. Run it again against the
database before deploying.
