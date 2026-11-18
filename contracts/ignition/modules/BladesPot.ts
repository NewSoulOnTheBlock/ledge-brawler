// The pot of pro mode (contracts/BladesPot.sol), for the $BLADES token at `token`, owned by `owner` (a safe, not a
// hot key), refereed by `referee` (the site's key: REFEREE_KEY in apps/app/server), each entry costing `fee` base units.
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BladesPot", (m) => {
  const pot = m.contract("BladesPot", [m.getParameter("token"), m.getParameter("owner"), m.getParameter("referee"), m.getParameter("fee")]);
  return { pot };
});
