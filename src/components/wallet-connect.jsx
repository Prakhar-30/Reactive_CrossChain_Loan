import React from 'react';
import { ConnectWallet } from "@thirdweb-dev/react";

export default function WalletConnect() {
  return (
    <ConnectWallet 
      theme="dark"
      btnTitle="Connect Wallet"
      modalTitle="Select your wallet"
    />
  );
}