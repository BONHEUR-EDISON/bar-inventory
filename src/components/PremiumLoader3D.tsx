// src/components/PremiumLoader3D.tsx
import React from "react";
import { createPortal } from "react-dom";
import "./PremiumLoader3D.css";

interface PremiumLoader3DProps {
  loading: boolean;
}

export default function PremiumLoader3D({ loading }: PremiumLoader3DProps) {
  if (!loading) return null;

  return createPortal(
    <div className="loader3d-overlay">
      <div className="loader3d-container">
        <div className="loader3d-spinner">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <p className="loader3d-text">Chargement…</p>
      </div>
    </div>,
    document.body
  );
}