// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "Web3_Contracts/AbstractCallback.sol";


contract Vault is AbstractCallback   {

    mapping(address=>uint256) public available_Tokens_Intrst;
    mapping(address => uint256) private Userbalances;
    mapping(address=>uint256)private UserEndDate;
    address public owner;

    event Deposit(address indexed user, uint256 amount, address token, uint256 TokenIntr, uint256 endTime);
    event Withdraw(address indexed user, uint256 amount);
    event SweepToBridge(uint256 amount);

    constructor(address token1,uint256 intrst1,address token2,uint256 intrst2,address _callback_sender) AbstractCallback(_callback_sender) payable {
        owner = msg.sender;
        available_Tokens_Intrst[token1]=intrst1;
        available_Tokens_Intrst[token2]=intrst2;
    }

    receive() external payable {
        
    }

    function deposit(address tokenSelected,uint256 timeduration) public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        Userbalances[msg.sender] += msg.value;
        UserEndDate[msg.sender]=block.timestamp+timeduration;
        emit Deposit(msg.sender, Userbalances[msg.sender], tokenSelected, available_Tokens_Intrst[tokenSelected], UserEndDate[msg.sender]);
    }

    function withdrawUpdate(address /*sender*/,address payable userAddress) external {
        require(block.timestamp <= UserEndDate[userAddress], "Withdrawal period not reached");
        uint256 balance = Userbalances[userAddress];
        require(balance > 0, "Insufficient balance");
        Userbalances[userAddress] = 0;
        (bool success, ) = userAddress.call{value: balance}("");
        require(success, "Transfer failed");   
        emit Withdraw(userAddress, balance);
}

    function getBalance() public view returns (uint256) {
        return Userbalances[msg.sender];
    }
    function getExpiryDate() public view returns (uint256) {
        return UserEndDate[msg.sender];
    }

}
