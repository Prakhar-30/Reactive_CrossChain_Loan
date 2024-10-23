// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "lib/openzeppelin-contracts/contracts/utils/math/Math.sol";
import "Web3_Contracts/AbstractCallback.sol";


interface DynamicPriceERC20 is IERC20 {
    function mintPrice() external view returns (uint256);
}

contract LoanManager is AbstractCallback  {
    using Math for uint256;

    struct UserDetails {
        address userAddress;
        address tokenAddress;
        uint256 ethDeposited;
        uint256 interestRate;
        uint256 duration;
        uint256 endTime;
        bool isActive;
    }

    mapping(address => UserDetails) public userDetails;
    
    event DetailsUpdated(
        address indexed user,
        address tokenAddress,
        uint256 ethDeposited,
        uint256 interestRate,
        uint256 duration,
        uint256 endTime
    );
    event LoanRepaid(address indexed user, uint256 amount);

    constructor(address _callback_sender) AbstractCallback(_callback_sender) payable {}


    function updateDetails(
        address /*sender*/,
        address _user,
        address _tokenAddress,
        uint256 _ethDeposited,
        uint256 _interestRate,
        uint256 _duration,
        uint256 _endTime
    ) external {
        require(_ethDeposited > 0, "Amount must be greater than 0");
        require(_interestRate > 0, "Interest rate must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_endTime > block.timestamp, "End time must be in future");

        userDetails[_user] = UserDetails({
            userAddress: _user,
            tokenAddress: _tokenAddress,
            ethDeposited: _ethDeposited,
            interestRate: _interestRate,
            duration: _duration,
            endTime: _endTime,
            isActive: true
        });

        emit DetailsUpdated(
            _user,
            _tokenAddress,
            _ethDeposited,
            _interestRate,
            _duration,
            _endTime
        );
    }

    function calculateCurrentRepayAmount() public view returns (uint256) {
        UserDetails memory details = userDetails[msg.sender];
        require(details.isActive, "No active loan found");
        
        DynamicPriceERC20 token = DynamicPriceERC20(details.tokenAddress);
        uint256 mintPrice = token.mintPrice();
        
        // Calculate P = ethDeposited / mintPrice * 10**18
        uint256 P = (details.ethDeposited * 1e18) / mintPrice;
        
        // Calculate A = P[1 + RT/100]
        // We multiply by 1e18 for precision and divide later
        uint256 RT = (details.interestRate * details.duration);
        uint256 interest = (P * RT) / 100;
        uint256 A = P + interest;
        
        return A;
    }

    function repay() external {
        UserDetails storage details = userDetails[msg.sender];
        require(details.isActive, "No active loan found");
        require(block.timestamp <= details.endTime, "Loan period has expired");

        uint256 repayAmount = calculateCurrentRepayAmount();
        DynamicPriceERC20 token = DynamicPriceERC20(details.tokenAddress);

        // Transfer tokens from user to this contract
        require(
            token.transferFrom(msg.sender, address(this), repayAmount),
            "Token transfer failed"
        );

        // Mark loan as inactive
        details.isActive = false;

        emit LoanRepaid(msg.sender, repayAmount);
    }

    // View function to check if a loan is active
    function isLoanActive(address user) external view returns (bool) {
        return userDetails[user].isActive;
    }

    // View function to get loan details
    function getLoanDetails(address user) external view returns (
        address tokenAddress,
        uint256 ethDeposited,
        uint256 interestRate,
        uint256 duration,
        uint256 endTime,
        bool isActive
    ) {
        UserDetails memory details = userDetails[user];
        return (
            details.tokenAddress,
            details.ethDeposited,
            details.interestRate,
            details.duration,
            details.endTime,
            details.isActive
        );
    }
    receive() external payable {}
}