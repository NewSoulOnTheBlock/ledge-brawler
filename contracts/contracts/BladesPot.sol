// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title The pot of Five Blades' pro mode, on Robinhood Chain.
/// @notice Holds the entry fees of paid Survival runs and Versus matches, and pays each pot out once, to one of its
/// own entrants, when the game's referee (the site, on the arena server's word: spec/app/bout.md) says who won it.
/// A fee goes into a pot and nowhere else but to that pot's winner or back to whoever paid it: neither the referee nor
/// the owner can send one anywhere else, and a player whose pot is never paid out takes their fee back themselves.
/// @dev A pot is named by the site: keccak256("versus", match id) or keccak256("survival", UTC day) (apps/app/server/api/_pro.js).
contract BladesPot is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// One paid entry: who paid it, how much reached the pot, which pot, when, and whether it has been given back.
    struct Entry {
        address player;
        uint96 amount;
        bytes32 pot;
        uint64 at;
        bool refunded;
    }

    /// One pot: every fee in it not given back, how many entries that is, and whether it has been paid out.
    struct Pot {
        uint128 total;
        uint32 entries;
        bool settled;
    }

    /// How long after entering a player may take back a fee whose pot has not been paid out.
    uint256 public constant RECLAIM_AFTER = 7 days;

    /// The token fees are paid in: $BLADES.
    IERC20 public immutable token;
    /// Who seats players and pays pots out: the site's key.
    address public referee;
    /// What an entry costs, in the token's base units.
    uint256 public fee;
    /// Every fee held for a pot not yet paid out: what the contract owes.
    uint256 public outstanding;
    /// The number the next entry is given.
    uint256 public nextEntry = 1;

    mapping(uint256 entry => Entry) public entries;
    mapping(bytes32 pot => Pot) public pots;

    event Entered(uint256 indexed entry, address indexed player, bytes32 indexed pot, uint256 amount);
    event Settled(bytes32 indexed pot, uint256 indexed entry, address indexed winner, uint256 amount);
    event Refunded(uint256 indexed entry, address indexed player, uint256 amount);
    event RefereeChanged(address referee);
    event FeeChanged(uint256 fee);
    event Swept(address to, uint256 amount);

    error NotReferee();
    error ZeroAddress();
    error ZeroFee();
    error UnknownEntry(uint256 entry);
    error NotInPot(uint256 entry, bytes32 pot);
    error AlreadyRefunded(uint256 entry);
    error PotSettled(bytes32 pot);
    error NotYours(uint256 entry);
    error TooEarly(uint256 at);

    modifier onlyReferee() {
        if (msg.sender != referee) revert NotReferee();
        _;
    }

    constructor(IERC20 token_, address owner_, address referee_, uint256 fee_) Ownable(owner_) {
        if (address(token_) == address(0) || referee_ == address(0)) revert ZeroAddress();
        if (fee_ == 0) revert ZeroFee();
        token = token_;
        referee = referee_;
        fee = fee_;
    }

    /// @notice Seats `player` in `pot`, taking the fee from them: with their EIP-2612 permit for it (`deadline` not 0),
    /// signed without gas, or an allowance they gave the pot already. The referee sends it, and pays its gas.
    /// @return id The entry's number.
    function enter(address player, bytes32 pot, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
        onlyReferee
        nonReentrant
        returns (uint256 id)
    {
        Pot storage p = pots[pot];
        if (p.settled) revert PotSettled(pot);
        if (deadline != 0) {
            // A permit someone has already used leaves the allowance it gave, which is enough; any other failure
            // leaves none, and the transfer fails.
            try IERC20Permit(address(token)).permit(player, address(this), fee, deadline, v, r, s) {} catch {}
        }
        // What reached the pot, for a token that takes a fee of its own as it moves.
        uint256 before = token.balanceOf(address(this));
        token.safeTransferFrom(player, address(this), fee);
        uint96 amount = SafeCast.toUint96(token.balanceOf(address(this)) - before);
        id = nextEntry++;
        entries[id] = Entry(player, amount, pot, uint64(block.timestamp), false);
        p.total += amount;
        p.entries += 1;
        outstanding += amount;
        emit Entered(id, player, pot, amount);
    }

    /// @notice Pays `pot` out, once, to the player of `entry`, which must be in it: every fee in it not given back.
    function settle(bytes32 pot, uint256 entry) external onlyReferee nonReentrant {
        Pot storage p = pots[pot];
        Entry storage e = entries[entry];
        if (p.settled) revert PotSettled(pot);
        if (e.player == address(0) || e.pot != pot) revert NotInPot(entry, pot);
        if (e.refunded) revert AlreadyRefunded(entry);
        uint256 amount = p.total;
        p.settled = true;
        p.total = 0;
        outstanding -= amount;
        token.safeTransfer(e.player, amount);
        emit Settled(pot, entry, e.player, amount);
    }

    /// @notice Gives an entry's fee back to whoever paid it, while its pot has not been paid out: a match nobody else
    /// joined, or one the operator calls off.
    function refund(uint256 entry) external onlyReferee nonReentrant {
        _refund(entry);
    }

    /// @notice A player takes back their own fee, if its pot has not been paid out `RECLAIM_AFTER` they entered:
    /// a fee cannot be kept by the game going away.
    function reclaim(uint256 entry) external nonReentrant {
        Entry storage e = entries[entry];
        if (e.player != msg.sender) revert NotYours(entry);
        if (block.timestamp < e.at + RECLAIM_AFTER) revert TooEarly(e.at + RECLAIM_AFTER);
        _refund(entry);
    }

    function _refund(uint256 entry) private {
        Entry storage e = entries[entry];
        if (e.player == address(0)) revert UnknownEntry(entry);
        if (e.refunded) revert AlreadyRefunded(entry);
        Pot storage p = pots[e.pot];
        if (p.settled) revert PotSettled(e.pot);
        e.refunded = true;
        p.total -= e.amount;
        p.entries -= 1;
        outstanding -= e.amount;
        token.safeTransfer(e.player, e.amount);
        emit Refunded(entry, e.player, e.amount);
    }

    /// @notice A new referee: the site's key, replaced if it is lost or leaked.
    function setReferee(address referee_) external onlyOwner {
        if (referee_ == address(0)) revert ZeroAddress();
        referee = referee_;
        emit RefereeChanged(referee_);
    }

    /// @notice What an entry costs from now on.
    function setFee(uint256 fee_) external onlyOwner {
        if (fee_ == 0) revert ZeroFee();
        SafeCast.toUint96(fee_);
        fee = fee_;
        emit FeeChanged(fee_);
    }

    /// @notice Tokens sent here by mistake, beyond every fee held for a pot, to `to`: never a fee.
    function sweep(address to) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        uint256 extra = token.balanceOf(address(this)) - outstanding;
        token.safeTransfer(to, extra);
        emit Swept(to, extra);
    }
}
