import React, { useContext } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThirdwebProvider } from "@thirdweb-dev/react";
import ThemeToggle from './components/theme-toggle';
import WalletConnect from './components/wallet-connect';
import DAppInterface from './components/dapp-interface';
import { ThemeProvider, ThemeContext } from './theme-context';

// Define supported chains
const sepoliaChain = {
  chainId: 11155111,
  rpc: ["https://rpc.sepolia.org"],
  nativeCurrency: {
    decimals: 18,
    name: "Sepolia ETH",
    symbol: "SEP",
  },
  shortName: "sep",
  slug: "sepolia",
  testnet: true,
  chain: "Sepolia",
  name: "Sepolia Testnet"
};

const kopliChain = {
  chainId: 5318008,
  rpc: ["https://kopli-rpc.reactive.network/"],
  nativeCurrency: {
    decimals: 18,
    name: "REACT",
    symbol: "REACT",
  },
  shortName: "kopli",
  slug: "reactive-kopli",
  testnet: true,
  chain: "Reactive Kopli",
  name: "Reactive Kopli Testnet"
};

function AppContent() {
  const { isDark } = useContext(ThemeContext);

  return (
    <div className={`min-h-screen flex flex-col ${
      isDark ? 'bg-gradient-to-t from-black to-slate-500' : 'bg-gradient-to-t from-blue-200 to-white'
    } text-gray-800 dark:text-white transition-all duration-300`}>
      <header className={`p-6 md:p-8 flex flex-col md:flex-row justify-between items-center ${
        isDark ? 'bg-black border-b-2 shadow-2xl shadow-black' : 'bg-neutral-100 border border-b-2 border-black shadow-2xl shadow-black'
      } bg-opacity-80 backdrop-filter backdrop-blur-lg`}>
        <h1 className={`text-3xl md:text-7xl font-thin ${
          isDark ? 'text-blue-400' : 'text-blue-600'
        } mb-4 md:mb-0`}>
          Reactive LoaNyelo
        </h1>
        <div className="flex items-center space-x-2 md:space-x-2">
          <ThemeToggle />
          <WalletConnect />
        </div>
      </header>

      <main className="flex-grow container mx-auto p-6 md:p-6 flex items-center justify-center ">
        <div className="w-full max-w-3xl">
          <DAppInterface />
        </div>
      </main>

      <footer className={`p-6 md:p-8 ${
        isDark ? 'bg-black border-t-2 border-white' : 'bg-neutral-100 border-t-2 border-black'
      } bg-opacity-100 backdrop-filter backdrop-blur-lg text-center`}>
        <p className={isDark ? 'text-white' : 'text-black'}>
          © 2024 Reactive LoaNyelo. All rights reserved.
        </p>
        <p className="mt-2">
          <a href="#" className="text-blue-500 hover:text-blue-400 transition-colors">
            Terms of Service
          </a>
          {' | '}
          <a href="#" className="text-blue-500 hover:text-blue-400 transition-colors">
            Privacy Policy
          </a>
        </p>
      </footer>

      <ToastContainer
        position="bottom-right"
        theme={isDark ? "dark" : "light"}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThirdwebProvider
      activeChain={sepoliaChain}
      supportedChains={[sepoliaChain, kopliChain]}
      clientId="your-client-id-here"
    >
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ThirdwebProvider>
  );
}