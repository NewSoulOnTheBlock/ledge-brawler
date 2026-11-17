// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title A stand-in for $BLADES, for tests and Robinhood Chain Testnet only.
/// @notice $BLADES itself is launched elsewhere, and BladesPot is deployed with its address. This one has EIP-2612
/// permits, as a player's gasless entry needs, and anyone may mint some of it, as a test network's faucet would.
contract TestBlades is ERC20, ERC20Permit {
    constructor() ERC20("Test Blades", "tBLADES") ERC20Permit("Test Blades") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
