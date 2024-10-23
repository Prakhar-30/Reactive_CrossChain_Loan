import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '../theme-context';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import LoanManagerABI from '../ABIs/LoanManagerABI.js';
import ERC20ABI from "../ABIs/ERC20ABI.js"

// Add ERC20 ABI - we only need the functions we'll use


export default function LoanManager() {
  const [userDetails, setUserDetails] = useState(null);
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [repayAmount, setRepayAmount] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasApproval, setHasApproval] = useState(false);
  const { isDark } = useContext(ThemeContext);
  const [txHash, setTxHash] = useState('');

  const contractAddress = '0xC16eF71f3C81E2C4E6008D3b0698199882824D50';

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          const account = accounts[0];
          setAccount(account);

          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const contractInstance = new ethers.Contract(contractAddress, LoanManagerABI, signer);
          setContract(contractInstance);

          window.ethereum.on('accountsChanged', (accounts) => {
            setAccount(accounts[0]);
          });

        } catch (error) {
          console.error('Failed to connect:', error);
          toast.error('Failed to connect to wallet');
        }
      } else {
        toast.error('Please install MetaMask to use this dApp');
      }
    };

    init();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  // Check token approval when user details or repay amount changes
  useEffect(() => {
    const checkApproval = async () => {
      if (!userDetails?.tokenAddress || !account || !repayAmount) return;

      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const tokenContractInstance = new ethers.Contract(userDetails.tokenAddress, ERC20ABI, signer);
        setTokenContract(tokenContractInstance);

        const allowance = await tokenContractInstance.allowance(account, contractAddress);
        const repayAmountBN = ethers.utils.parseEther(repayAmount);
        setHasApproval(allowance.gte(repayAmountBN));
      } catch (error) {
        console.error('Error checking approval:', error);
        setHasApproval(false);
      }
    };

    checkApproval();
  }, [userDetails, account, repayAmount]);

  const fetchRepayAmount = async () => {
    if (!contract || !userDetails?.isActive) return;

    try {
      setIsCalculating(true);
      const amount = await contract.calculateCurrentRepayAmount();
      setRepayAmount(ethers.utils.formatEther(amount));
    } catch (error) {
      console.error('Error calculating repay amount:', error);
      toast.error('Failed to calculate repay amount');
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!contract || !account) return;

      try {
        setIsLoading(true);
        const details = await contract.userDetails(account);
        
        if (details && details.userAddress !== ethers.constants.AddressZero) {
          setUserDetails({
            userAddress: details.userAddress,
            tokenAddress: details.tokenAddress,
            ethDeposited: ethers.utils.formatEther(details.ethDeposited),
            interestRate: details.interestRate.toString(),
            duration: details.duration.toString(),
            endTime: new Date(details.endTime.toNumber() * 1000),
            isActive: details.isActive
          });
          
          // Fetch repay amount when user details are loaded
          if (details.isActive) {
            fetchRepayAmount();
          }
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        toast.error('Failed to fetch loan details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [contract, account]);

  const handleApprove = async () => {
    if (!tokenContract || !repayAmount) return;

    try {
      setIsApproving(true);
      toast.info('Initiating approval transaction...');

      const repayAmountBN = ethers.utils.parseEther(repayAmount);
      const tx = await tokenContract.approve(contractAddress, repayAmountBN);
      toast.info('Approval transaction sent. Waiting for confirmation...');

      await tx.wait();
      toast.success('Token approval successful!');
      setHasApproval(true);
    } catch (error) {
      console.error('Error approving tokens:', error);
      toast.error(error.reason || 'Approval failed. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRepay = async () => {
    if (!contract || !userDetails?.isActive) {
      toast.error('No active loan found');
      return;
    }
  
    try {
      setIsRepaying(true);
      toast.info('Initiating repayment transaction...');
      
      const tx = await contract.repay();
      toast.info('Transaction sent. Waiting for confirmation...');
      
      await tx.wait();
      setTxHash(tx.hash); // Store the transaction hash
      toast.success('Loan repaid successfully!');
      
      // Refresh user details
      const details = await contract.userDetails(account);
      setUserDetails({
        ...userDetails,
        isActive: details.isActive
      });
      setRepayAmount(null);
      
    } catch (error) {
      console.error('Error repaying loan:', error);
      toast.error(error.reason || 'Repayment failed. Please try again.');
    } finally {
      setIsRepaying(false);
    }
  };

  return (
    <div className={`p-6 md:p-8 rounded-xl ${isDark ? 'bg-black bg-opacity-100 border border-slate-200' : 'bg-white bg-opacity-40 border border-black'} backdrop-filter backdrop-blur-xl shadow-xl transition-all duration-300`}>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-300">
      Loan Manager
      </h2>

      {isLoading ? (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200 text-black'}`}>
          <p className="text-center text-black">Loading loan details...</p>
        </div>
      ) : userDetails ? (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`}>
            <h3 className="text-xl font-semibold mb-4">Your Loan Details</h3>
            <div className="space-y-2">
              <p>Amount Deposited: <span className='text-gray-500'> {userDetails.ethDeposited} ETH</span></p>
              <p>Interest Rate: <span className='text-gray-500'>{userDetails.interestRate}%</span></p>
              <p>Duration: <span className='text-gray-500'>{userDetails.duration} seconds</span></p>
              <p>End Time: <span className='text-gray-500'>{userDetails.endTime.toLocaleString()}</span></p>
              <p>Status: <span className='text-gray-500'>{userDetails.isActive ? 'Active' : 'Inactive'}</span></p>
              {userDetails.isActive && (
                <div className="">
                <p className="font-semibold text-lg mt-4 text-gray-500">
                  Current Repay Amount: <span className='text-green-700'>{isCalculating ? 'Calculating...' : repayAmount ? `${repayAmount} Tokens` : 'N/A'}</span> 
                  </p>
                  <p>
                  <button
                    onClick={fetchRepayAmount}
                    disabled={isCalculating}
                    className={`text-sm px-2 py-3 border-spacing-7 rounded-full ${isDark ? 'bg-white text-black hover:bg-slate-400' : 'bg-black text-white hover:bg-slate-400'}`}
                  >
                    ↻ Refresh
                  </button>
                  </p>
                  </div>
              )}
            </div>
          </div>

          {userDetails.isActive && (
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'} space-y-4`}>
              {!hasApproval && (
                <button
                  onClick={handleApprove}
                  disabled={isApproving || !repayAmount}
                  className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                    isDark 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  } border border-blue-400 ${isApproving || !repayAmount ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isApproving ? 'Approving...' : 'Approve Tokens'}
                </button>
              )}
              
              <button
                onClick={handleRepay}
                disabled={isRepaying || !hasApproval || !userDetails.isActive}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
                  isDark 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                } border border-green-400 ${isRepaying || !hasApproval || !userDetails.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRepaying ? 'Processing...' : 'Repay Loan'}
              </button>
              
            </div>
          )}
          {txHash && (
  <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`}>
    <h3 className="font-semibold mb-2">Transaction Links:</h3>
    <div className="space-y-2">
      <a 
        href="https://sepolia.etherscan.io/address/0xba41b18d3B7B7154Ea152dBF7e512A45D7087fb0#internaltx"
        target="_blank"
        rel="noopener noreferrer"
        className={`block px-4 py-2 rounded-lg text-center ${
          isDark 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        } transition-colors duration-300`}
      >
        View on Sepolia Scan
      </a>
      <a 
        href={`https://kopli.reactscan.net/tx/${txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`block px-4 py-2 rounded-lg text-center ${
          isDark 
            ? 'bg-purple-600 hover:bg-purple-700 text-white' 
            : 'bg-purple-500 hover:bg-purple-600 text-white'
        } transition-colors duration-300`}
      >
        View on Kopli
      </a>
    </div>
  </div>
)}
        </div>
      ) : (
        <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <p className="text-center">No active loan found</p>
        </div>
      )}
    </div>
  );
}