// A test network only (Robinhood Chain Testnet, Sepolia): a stand-in for $BLADES (contracts/test/TestBlades.sol) and a
// pot taking it, owned and refereed by `referee` (the site's REFEREE_KEY on its test build), each entry costing `fee` base units.
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Testnet", (m) => {
  const token = m.contract("TestBlades");
  const referee = m.getParameter("referee", m.getAccount(0));
  const pot = m.contract("BladesPot", [token, referee, referee, m.getParameter("fee", 50_000n * 10n ** 18n)]);
  return { token, pot };
});
