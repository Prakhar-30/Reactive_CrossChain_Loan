// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AbstractCallback.sol";

interface IDynamicPriceERC20 is IERC20 {
    function mintPrice() external view returns (uint256);
    function mint(uint256 amount) external;
}

contract BridgeMinter is AbstractCallback {
    struct UserInfo {
        uint256 lockedAmount;
        uint256 interestRate;
        uint256 mintedTokens;
    }

    mapping(address => UserInfo) public userInfo;

    event TokensMinted(address indexed userAddress,address indexed tokenAddress, uint256 indexed lockedamount, uint256 duration, uint256 endTime, uint256 interest);


    constructor(address _callback_sender) AbstractCallback(_callback_sender) payable {}

    function mintTokens(address /*sender*/,address user, address tokenAddress, uint256 lockedAmount, uint256 interestRate, uint256 endTime) external {
        require(user != address(0), "Invalid user address");
        require(tokenAddress != address(0), "Invalid token address");
        require(lockedAmount > 0, "Locked amount must be greater than 0");

        IDynamicPriceERC20 token = IDynamicPriceERC20(tokenAddress);
        uint256 mintPrice = token.mintPrice();
        require(mintPrice > 0, "Invalid mint price");

        uint256 tokensToMint = (lockedAmount * (10**18)) / mintPrice;

        token.mint(tokensToMint);
        token.transfer(user, tokensToMint);

        userInfo[user] = UserInfo({
            lockedAmount: lockedAmount,
            interestRate: interestRate,
            mintedTokens: tokensToMint
        });

        emit TokensMinted(user, tokenAddress, lockedAmount, endTime-block.timestamp, endTime, interestRate );
    }

    receive() external payable {}
}