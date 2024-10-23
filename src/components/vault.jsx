import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '../theme-context';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import VaultABI from '../ABIs/VaultABI.js';

export default function Vault() {
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [endDate, setEndDate] = useState('');
  const [balance, setBalance] = useState('0');
  const [expiryDate, setExpiryDate] = useState(null);
  const [contract, setContract] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isDark } = useContext(ThemeContext);
  const [txHash, setTxHash] = useState('');
  const contractAddress = '0xba41b18d3B7B7154Ea152dBF7e512A45D7087fb0';

  const tokens = [
    { address: '0x4281432DB5dE7315C31cb2A20Db2cDE756f3e188', name: 'Ivan', rate: 5 },
    { address: '0x4275E2A55D3330CBb5e58ec94f2d7D930bd6229C', name: 'Contastine', rate: 10 }
  ];

  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const contract = new ethers.Contract(contractAddress, VaultABI, signer);
          setContract(contract);
          updateBalance(contract);
          updateExpiryDate(contract);
        } catch (error) {
          console.error('Failed to connect:', error);
          toast.error('Failed to connect to wallet. Please try again.');
        }
      } else {
        toast.error('Please install MetaMask to use this dApp!');
      }
    };

    initContract();
  }, []);

  const updateBalance = async (contract) => {
    try {
      const balance = await contract.getBalance();
      setBalance(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast.error('Failed to fetch balance. Please try again.');
    }
  };

  const updateExpiryDate = async (contract) => {
    try {
      const expiryTimestamp = await contract.getExpiryDate();
      setExpiryDate(new Date(expiryTimestamp.toNumber() * 1000));
    } catch (error) {
      console.error('Error fetching expiry date:', error);
      toast.error('Failed to fetch expiry date. Please try again.');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!contract) {
      toast.error('Please connect your wallet first.');
      return;
    }

    try {
      setIsLoading(true);
      const token = tokens.find(t => t.name === selectedToken);
      if (!token) {
        toast.error('Please select a token.');
        return;
      }

      const amountWei = ethers.utils.parseEther(depositAmount);
      const endDateTime = new Date(endDate).getTime() / 1000; // Convert to Unix timestamp
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDuration = endDateTime - currentTime;

      if (timeDuration <= 0) {
        toast.error('End date must be in the future.');
        return;
      }

      toast.info('Initiating deposit transaction...');
      
      const tx = await contract.deposit(token.address, timeDuration, { value: amountWei });

      toast.info('Transaction sent. Waiting for confirmation...');
      await tx.wait();
      setTxHash(tx.hash); // Store the transaction hash
      toast.success('Deposit successful!');
      updateBalance(contract);
      updateExpiryDate(contract);
    } catch (error) {
      console.error('Error depositing:', error);
      toast.error('Deposit failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-6 md:p-8 rounded-3xl ${isDark ? 'bg-black bg-opacity-100 border border-slate-200' : 'bg-white bg-opacity-40 border border-black'} backdrop-filter backdrop-blur-xl shadow-xl transition-all duration-300`}>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-pink-300">Vault</h2>
      <form onSubmit={handleDeposit} className="space-y-6">
        <div>
          <label className={`block mb-2 text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'} font-medium`}>Deposit Amount (ETH)</label>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className={`w-full p-3 rounded-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-800'} focus:ring-2 focus:ring-purple-500 transition-all duration-300`}
            required
          />
        </div>
        <div>
          <label className={`block mb-2 text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'} font-medium`}>Select Token for Loan</label>
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value)}
            className={`w-full p-3 rounded-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-800'} focus:ring-2 focus:ring-purple-500 transition-all duration-300`}
            required
          >
            <option value="">Select a token</option>
            {tokens.map((token) => (
              <option key={token.name} value={token.name}>
                {token.name} (Interest: {token.rate}%)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={`block mb-2 text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'} font-medium`}>End Date</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`w-full p-3 rounded-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-300 text-gray-800'} focus:ring-2 focus:ring-purple-500 transition-all duration-300`}
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 ${
            isDark ? 'bg-black text-white hover:bg-blue-400 border border-slate-200'  : 'bg-white text-black hover:bg-blue-600 border border-gray-600'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Processing...' : 'Deposit'}
        </button>
        {txHash && (
  <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`}>
    <h3 className="font-semibold mb-2">Transaction Links:</h3>
    <div className="space-y-2">
      <a 
        href={`https://sepolia.etherscan.io/tx/${txHash}`}
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
        href="https://kopli.reactscan.net/rvms/0x49abe186a9b24f73e34ccae3d179299440c352ac"
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
      </form>
      <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-300 text-black'}`}>
        <p className="text-lg">Current Balance: {balance} ETH</p>
        {expiryDate && (
          <p className="text-lg">Expiry Date: {expiryDate.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}