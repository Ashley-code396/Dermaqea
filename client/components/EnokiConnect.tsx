"use client";

import React from "react";
import { ConnectButton } from "@mysten/dapp-kit";

// Small wrapper that renders the dapp-kit ConnectButton.
// The ConnectButton will show available wallets (including Enoki social providers when registered).
export default function EnokiConnect() {
  return (
    <div className="mt-4 flex justify-center">
      <ConnectButton />
    </div>
  );
}
