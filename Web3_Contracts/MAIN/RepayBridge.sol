// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "Web3_Contracts/IReactive.sol";
import "Web3_Contracts/AbstractReactive.sol";
import "Web3_Contracts/ISystemContract.sol";

contract RepayBridge is IReactive, AbstractReactive {
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

    // Topic for the LoanRepaid event
    uint256 private constant LOAN_REPAID_EVENT_TOPIC = 
        0xc200a1f31dd659e356e0f112c82558e25f49f7b0f84438691cd96f5cb3558823; // keccak256("LoanRepaid(address,uint256)")

    uint256 public originChainId;
    uint256 public destinationChainId;
    uint64 private constant GAS_LIMIT = 1000000;
    address public loanManagerContract;
    address public vaultContract;
    uint256 public counter;

    constructor(
        address _service,
        address _loanManagerContract,
        address _vaultContract,
        uint256 _originChainId,
        uint256 _destinationChainId
    ) {
        originChainId = _originChainId;
        destinationChainId = _destinationChainId;
        loanManagerContract = _loanManagerContract;
        vaultContract = _vaultContract;
        service = ISystemContract(payable(_service));

        // Subscribe to LoanRepaid events from the LoanManager contract
        bytes memory payload = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            _originChainId,
            _loanManagerContract,
            LOAN_REPAID_EVENT_TOPIC,
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
        require(_contract == loanManagerContract, "Invalid contract");
        require(topic_0 == LOAN_REPAID_EVENT_TOPIC, "Invalid event");

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

        // Get the user address from the indexed parameter (topic_1)
        address payable user = payable(address(uint160(topic_1)));

        // Prepare the withdrawUpdate call
        bytes memory payload = abi.encodeWithSignature(
            "withdrawUpdate(address,address)",
            address(0), // sender (will be replaced by ReactVM)
            user        // user address
        );

        // Emit callback to trigger withdrawUpdate on the destination chain
        emit Callback(
            destinationChainId,
            vaultContract,
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