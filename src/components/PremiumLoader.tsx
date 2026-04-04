// src/components/PremiumLoader.tsx
import React from "react";
import { createPortal } from "react-dom";
import "./PremiumLoader.css";

interface PremiumLoaderProps {
  loading: boolean;
}

export default function PremiumLoader({ loading }: PremiumLoaderProps) {
  if (!loading) return null;

  return createPortal(
    <div className="loader-overlay">
      <div className="loader-container">
        <div className="spinner">
          <div></div><div></div><div></div><div></div>
        </div>
        <p className="loader-text">Chargement...</p>
      </div>
    </div>,
    document.body
  );
}