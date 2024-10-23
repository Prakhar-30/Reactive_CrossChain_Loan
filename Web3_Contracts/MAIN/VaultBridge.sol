// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "Web3_Contracts/IReactive.sol";
import "Web3_Contracts/AbstractReactive.sol";
import "Web3_Contracts/ISystemContract.sol";

contract VaultBridge is IReactive, AbstractReactive {
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

    // Topic for the Deposit event from Vault contract
    uint256 private constant DEPOSIT_EVENT_TOPIC = 
        0x6a7b4b4de67d42edc5a43dd8bb598338e29e72e277cef089c6ad4ffe3aa61060; // keccak256("Deposit(address,uint256,address,uint256,uint256)")

    uint256 public originChainId;
    uint256 public destinationChainId;
    uint64 private constant GAS_LIMIT = 1000000;
    address public vaultContract;
    address public bridgeMinterContract;
    uint256 public counter;

    constructor(
        address _service,
        address _vaultContract,
        address _bridgeMinterContract,
        uint256 _originChainId,
        uint256 _destinationChainId
    ) {
        originChainId = _originChainId;
        destinationChainId = _destinationChainId;
        vaultContract = _vaultContract;
        bridgeMinterContract = _bridgeMinterContract;
        service = ISystemContract(payable(_service));

        // Subscribe to Deposit events from the Vault contract
        bytes memory payload = abi.encodeWithSignature(
            "subscribe(uint256,address,uint256,uint256,uint256,uint256)",
            _originChainId,
            _vaultContract,
            DEPOSIT_EVENT_TOPIC,
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
        require(_contract == vaultContract, "Invalid contract");
        require(topic_0 == DEPOSIT_EVENT_TOPIC, "Invalid event");

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

        // Decode the Deposit event data
        // Event: Deposit(address indexed user, uint256 amount, address token, uint256 TokenIntr, uint256 endTime)
        (
            uint256 amount,
            address tokenAddress,
            uint256 tokenInterest,
            uint256 endTime
        ) = abi.decode(data, (uint256, address, uint256, uint256));
        
        // Get the user address from the indexed parameter (topic_1)
        address user = address(uint160(topic_1));

        // Prepare the mintTokens call
        bytes memory payload = abi.encodeWithSignature(
            "mintTokens(address,address,address,uint256,uint256,uint256)",
            address(0), // sender (will be replaced by ReactVM)
            user,       // user address
            tokenAddress, // token address
            amount,     // locked amount
            tokenInterest, // interest rate
            endTime    // end time
        );

        // Emit callback to trigger mintTokens on the destination chain
        emit Callback(
            destinationChainId,
            bridgeMinterContract,
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