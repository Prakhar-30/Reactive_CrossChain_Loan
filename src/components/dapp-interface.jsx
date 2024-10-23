import React, { useState, useContext } from 'react';
import { ThemeContext } from '../theme-context';
import { toast } from 'react-toastify';
import Vault from './vault';
import LoanManager from './loan-manager';

const CHAIN_IDS = {
  SEPOLIA: '0xaa36a7',  // Sepolia chain ID (11155111 in hex)
  KOPLI: '0x512578'    // Reactive Kopli chain ID (5318008 in hex)
};

const DAppInterface = () => {
  const [activeComponent, setActiveComponent] = useState('vault');
  const { isDark } = useContext(ThemeContext);

  const switchChain = async (chainId) => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to use this dApp!');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added, try to add it
        try {
          const chainConfig = chainId === CHAIN_IDS.KOPLI ? {
            chainId: CHAIN_IDS.KOPLI,
            chainName: 'Reactive Kopli',
            nativeCurrency: {
              name: 'REACT',
              symbol: 'REACT',
              decimals: 18
            },
            rpcUrls: ['https://kopli-rpc.reactive.network/'],
            blockExplorerUrls: []
          } : {
            chainId: CHAIN_IDS.SEPOLIA,
            chainName: 'Sepolia',
            nativeCurrency: {
              name: 'Sepolia ETH',
              symbol: 'SEP',
              decimals: 18
            },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          };

          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfig],
          });
          return true;
        } catch (addError) {
          console.error('Error adding chain:', addError);
          toast.error('Failed to add network to MetaMask');
          return false;
        }
      } else {
        toast.error('Failed to switch network. Please try again.');
      }
      console.error('Error switching chain:', error);
      return false;
    }
  };

  const handleComponentSwitch = async (component) => {
    const chainId = component === 'vault' ? CHAIN_IDS.SEPOLIA : CHAIN_IDS.KOPLI;
    const success = await switchChain(chainId);
    
    if (success) {
      setActiveComponent(component);
      toast.success(`Switched to ${component === 'vault' ? 'Sepolia' : 'Reactive Kopli'} network`);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className=" flex justify-center space-x-0 ">
          <button
            onClick={() => handleComponentSwitch('vault')}
            className={`px-6 py-3 rounded-s-lg font-semibold transition-all duration-300 ${
              activeComponent === 'vault'
                ? isDark
                  ? 'bg-blue-800 text-white border border-t-4 border-l-2 border-white'
                  : 'bg-blue-500 text-white border border-t-4 border-l-2 border-black'
                : isDark
                ? 'bg-black text-gray-300'
                : 'bg-gray-200 text-black'
            }`}
          >
            Vault (Sepolia)
          </button>
          <button
            onClick={() => handleComponentSwitch('loan')}
            className={`px-6 py-3 rounded-r-lg  font-semibold transition-all duration-300 ${
              activeComponent === 'loan'
                ? isDark
                  ? 'bg-blue-800 text-white border border-t-4 border-r-2 border-white'
                  : 'bg-blue-500 text-white border border-t-4 border-r-2 border-black'
                : isDark
                ? 'bg-black text-gray-300'
                : 'bg-gray-200 text-black'
            }`}
          >
            Loan Manager (Kopli)
          </button>
        </div>

        <div className="transition-all duration-300">
          {activeComponent === 'vault' ? <Vault /> : <LoanManager />}
        </div>
      </div>
    </div>
  );
};

export default DAppInterface;