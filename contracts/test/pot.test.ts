// spec/app/bout.md, "Story: Fight for the pot"; spec/app/index.md, "Story: Fight the waves"
// BladesPot, on a stand-in for $BLADES (TestBlades), on Hardhat's simulated network: entries paid by permit or allowance, a pot paid once to
// one of its own entrants, refunds, a player's own way back, and what neither the referee nor the owner can do.
import { network } from "hardhat";
import { type Address, type WalletClient, keccak256, parseSignature, parseUnits, stringToHex, zeroAddress } from "viem";
import { expect, it } from "vitest";

const FEE = parseUnits("50000", 18);
const pot = (kind: "versus" | "survival", n: number) => keccak256(stringToHex(`${kind}:${n}`));

async function deployed() {
  const { viem, networkHelpers } = await network.create();
  const [owner, referee, ada, bo, cy, stranger] = await viem.getWalletClients();
  const token = await viem.deployContract("TestBlades");
  const blades = await viem.deployContract("BladesPot", [token.address, owner.account.address, referee.account.address, FEE]);
  for (const p of [ada, bo, cy, stranger]) await token.write.mint([p.account.address, FEE * 10n]);
  const chainId = await (await viem.getPublicClient()).getChainId();
  /** The permit `player` signs, without gas, for the pot to take one fee. */
  async function permit(player: WalletClient & { account: { address: Address } }, value = FEE, deadline = 2n ** 40n) {
    const nonce = await token.read.nonces([player.account.address]);
    const signature = await player.signTypedData({
      account: player.account,
      domain: { name: "Test Blades", version: "1", chainId, verifyingContract: token.address },
      types: { Permit: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
      primaryType: "Permit",
      message: { owner: player.account.address, spender: blades.address, value, nonce, deadline },
    });
    const { v, r, s } = parseSignature(signature);
    return [deadline, Number(v), r, s] as const;
  }
  const asReferee = { account: referee.account };
  const balance = (who: { account: { address: Address } }) => token.read.balanceOf([who.account.address]);
  return { viem, networkHelpers, owner, referee, ada, bo, cy, stranger, token, blades, permit, asReferee, balance };
}

it("seats a player who signed a permit, the referee paying the gas, and pays the pot once to one of its entrants", async () => {
  const { blades, token, ada, bo, cy, stranger, permit, asReferee, balance, viem } = await deployed();
  const match = pot("versus", 7);
  const [before, adaEth] = [await balance(ada), await (await viem.getPublicClient()).getBalance({ address: ada.account.address })];
  await blades.write.enter([ada.account.address, match, ...(await permit(ada))], asReferee);
  await blades.write.enter([bo.account.address, match, ...(await permit(bo))], asReferee);
  // The fee is taken, and nothing else: the player spent no gas.
  expect([before - (await balance(ada)), await (await viem.getPublicClient()).getBalance({ address: ada.account.address })]).toEqual([FEE, adaEth]);
  expect(await blades.read.pots([match])).toEqual([2n * FEE, 2, false]);
  expect((await blades.read.entries([1n]))[0].toLowerCase()).toBe(ada.account.address.toLowerCase());
  expect(await blades.read.outstanding()).toBe(2n * FEE);
  // Only an entrant of that pot can be paid it: not a stranger's entry from another pot.
  await blades.write.enter([cy.account.address, pot("versus", 8), ...(await permit(cy))], asReferee);
  await expect(blades.write.settle([match, 3n], asReferee)).rejects.toThrow(/NotInPot/);
  await expect(blades.write.settle([match, 99n], asReferee)).rejects.toThrow(/NotInPot/);
  // Nobody but the referee pays a pot out.
  await expect(blades.write.settle([match, 2n], { account: stranger.account })).rejects.toThrow(/NotReferee/);
  const boBefore = await balance(bo);
  await blades.write.settle([match, 2n], asReferee);
  expect(await balance(bo)).toBe(boBefore + 2n * FEE);
  // Once: not again, and none of its fees back after.
  await expect(blades.write.settle([match, 1n], asReferee)).rejects.toThrow(/PotSettled/);
  await expect(blades.write.refund([1n], asReferee)).rejects.toThrow(/PotSettled/);
  await expect(blades.write.enter([stranger.account.address, match, ...(await permit(stranger))], asReferee)).rejects.toThrow(/PotSettled/);
  expect([await blades.read.outstanding(), await token.read.balanceOf([blades.address])]).toEqual([FEE, FEE]);
});

it("takes a fee by an allowance given before, or by a permit someone else already used, and nothing without either", async () => {
  const { blades, token, ada, bo, cy, permit, asReferee, balance } = await deployed();
  const day = pot("survival", 20_410);
  await token.write.approve([blades.address, FEE], { account: ada.account });
  await blades.write.enter([ada.account.address, day, 0n, 0, `0x${"0".repeat(64)}`, `0x${"0".repeat(64)}`], asReferee);
  // A permit used by someone else first still leaves its allowance: the entry goes through.
  const signed = await permit(bo);
  await token.write.permit([bo.account.address, blades.address, FEE, ...signed], { account: cy.account });
  await blades.write.enter([bo.account.address, day, ...signed], asReferee);
  // A permit for less than the fee, or none at all, takes nothing.
  const before = await balance(cy);
  await expect(blades.write.enter([cy.account.address, day, ...(await permit(cy, FEE - 1n))], asReferee)).rejects.toThrow();
  await expect(blades.write.enter([cy.account.address, day, 0n, 0, `0x${"0".repeat(64)}`, `0x${"0".repeat(64)}`], asReferee)).rejects.toThrow();
  expect([await balance(cy), await blades.read.pots([day])]).toEqual([before, [2n * FEE, 2, false]]);
});

it("gives a fee back while its pot is unpaid; a player takes their own back after a week; a refunded entry cannot win", async () => {
  const { blades, ada, bo, stranger, permit, asReferee, balance, networkHelpers } = await deployed();
  const match = pot("versus", 9);
  await blades.write.enter([ada.account.address, match, ...(await permit(ada))], asReferee);
  await blades.write.enter([bo.account.address, match, ...(await permit(bo))], asReferee);
  const adaBefore = await balance(ada);
  await blades.write.refund([1n], asReferee);
  expect([await balance(ada), await blades.read.pots([match])]).toEqual([adaBefore + FEE, [FEE, 1, false]]);
  await expect(blades.write.refund([1n], asReferee)).rejects.toThrow(/AlreadyRefunded/);
  await expect(blades.write.settle([match, 1n], asReferee)).rejects.toThrow(/AlreadyRefunded/);
  // The game gone, Bo's fee is not lost: Bo takes it back after a week, and nobody else can.
  await expect(blades.write.reclaim([2n], { account: bo.account })).rejects.toThrow(/TooEarly/);
  await networkHelpers.time.increase(7 * 24 * 3600);
  await expect(blades.write.reclaim([2n], { account: stranger.account })).rejects.toThrow(/NotYours/);
  const boBefore = await balance(bo);
  await blades.write.reclaim([2n], { account: bo.account });
  expect([await balance(bo), await blades.read.outstanding()]).toEqual([boBefore + FEE, 0n]);
});

it("lets the owner change the referee and the fee, and sweep only what is not a fee", async () => {
  const { blades, token, owner, referee, ada, bo, stranger, permit, asReferee } = await deployed();
  await blades.write.enter([ada.account.address, pot("versus", 1), ...(await permit(ada))], asReferee);
  await expect(blades.write.setReferee([stranger.account.address], { account: stranger.account })).rejects.toThrow(/OwnableUnauthorizedAccount/);
  await expect(blades.write.setReferee([zeroAddress])).rejects.toThrow(/ZeroAddress/);
  // A leaked referee key is replaced, and the old one can do nothing.
  await blades.write.setReferee([bo.account.address]);
  await expect(blades.write.refund([1n], { account: referee.account })).rejects.toThrow(/NotReferee/);
  await expect(blades.write.setFee([0n])).rejects.toThrow(/ZeroFee/);
  await blades.write.setFee([FEE * 2n]);
  expect(await blades.read.fee()).toBe(FEE * 2n);
  // Tokens sent here by mistake can be taken out; the fee held for a pot cannot.
  await token.write.transfer([blades.address, 123n], { account: stranger.account });
  const before = await token.read.balanceOf([owner.account.address]);
  await blades.write.sweep([owner.account.address]);
  expect([await token.read.balanceOf([owner.account.address]) - before, await token.read.balanceOf([blades.address])]).toEqual([123n, FEE]);
  await blades.write.sweep([owner.account.address]);
  expect(await token.read.balanceOf([blades.address])).toBe(FEE);
});
