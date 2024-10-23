// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./IReactive.sol";
import "./AbstractReactive.sol";
import "./ISystemContract.sol";

contract LoanBridge is IReactive, AbstractReactive {
    event Event(
        uint256 indexed chain_id,
        address indexed _contract,
        uint256 indexed topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes data,
        uint256 counter
    );

    // Topic for the TokensMinted event from BridgeMinter contract
    uint256 private constant TOKENS_MINTED_EVENT_TOPIC = 
        0x5d512dc1dbec76ae4ac4bee5d37b9e0db1ef805eb2a543dfbb87b2e7e2158ea4; // keccak256("TokensMinted(address,address,uint256,uint256,uint256,uint256)")

    uint256 public originChainId;
    uint256 public destinationChainId;
    uint64 private constant GAS_LIMIT = 1000000;
    address public bridgeMinterContract;
    address public loanManagerContract;
    uint256 public counter;

    constructor(
        address _service,
        address _bridgeMinterContract,
        address _loanManagerContract,
        uint256 _originChainId,
        uint256 _destinationChainId
    ) {
        originChainId = _originChainId;
        destinationChainId = _destinationChainId;
        bridgeMinterContract = _bridgeMinterContract;
        loanManagerContract = _loanManagerContract;
        service = ISystemContract(payable(_service));

        // Subscribe to TokensMinted events from the BridgeMinter contract
        bytes memory payload = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            _originChainId,
            _bridgeMinterContract,
            TOKENS_MINTED_EVENT_TOPIC,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        (bool subscription_result, ) = address(service).call(payload);
        vm = !subscription_result;
    }

    receive() external payable {}

    function react(
        uint256 chain_id,
        address _contract,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3,
        bytes calldata data,
        uint256 /* block_number */,
        uint256 /* op_code */
    ) external vmOnly {
        require(chain_id == originChainId, "Invalid chain ID");
        require(_contract == bridgeMinterContract, "Invalid contract");
        require(topic_0 == TOKENS_MINTED_EVENT_TOPIC, "Invalid event");

        emit Event(
            chain_id,
            _contract,
            topic_0,
            topic_1,
            topic_2,
            topic_3,
            data,
            ++counter
        );

        // Decode the TokensMinted event data
        // Event: TokensMinted(address indexed userAddress, address indexed tokenAddress, uint256 indexed lockedamount, uint256 duration, uint256 endTime, uint256 interest)
        
        // Get indexed parameters from topics
        address userAddress = address(uint160(topic_1));
        address tokenAddress = address(uint160(topic_2));
        uint256 lockedAmount = uint256(topic_3);
        
        // Decode non-indexed parameters from data
        (uint256 duration, uint256 endTime, uint256 interest) = abi.decode(
            data,
            (uint256, uint256, uint256)
        );

        // Prepare the updateDetails call
        bytes memory payload = abi.encodeWithSignature(
            "updateDetails(address,address,address,uint256,uint256,uint256,uint256)",
            address(0), // sender (will be replaced by ReactVM)
            userAddress,
            tokenAddress,
            lockedAmount,
            interest,
            duration,
            endTime
        );

        // Emit callback to trigger updateDetails on the destination chain
        emit Callback(
            destinationChainId,
            loanManagerContract,
            GAS_LIMIT,
            payload
        );
    }

    // Methods for testing environment

    function pretendVm() external {
        vm = true;
    }

    function resetCounter() external {
        counter = 0;
    }

    function subscribe(
        uint256 _chainId,
        address _contract,
        uint256 topic_0
    ) external {
        service.subscribe(
            _chainId,
            _contract,
            topic_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    function unsubscribe(
        uint256 _chainId,
        address _contract,
        uint256 topic_0
    ) external {
        service.unsubscribe(
            _chainId,
            _contract,
            topic_0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }
}