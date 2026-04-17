import React from 'react';

export const NotebookGraphic = ({ className = "w-24 h-24" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Pages / Back cover edge */}
    <rect x="25" y="15" width="58" height="70" rx="8" fill="#FFFBEB" />
    <rect x="25" y="15" width="54" height="70" rx="8" fill="#FEF3C7" />
    
    {/* Main Cover */}
    <rect x="20" y="12" width="55" height="76" rx="8" fill="var(--accent-primary)" />
    
    {/* Cover Highlight (Left edge) */}
    <rect x="20" y="12" width="8" height="76" rx="4" fill="rgba(255,255,255,0.15)" />
    
    {/* Cover Lines */}
    <rect x="42" y="42" width="22" height="4" rx="2" fill="rgba(0,0,0,0.25)" />
    <rect x="42" y="54" width="16" height="4" rx="2" fill="rgba(0,0,0,0.25)" />
    
    {/* Binding Rings */}
    <rect x="14" y="24" width="12" height="6" rx="3" fill="#FCD34D" shadow="0 2px 4px rgba(0,0,0,0.2)" />
    <rect x="14" y="36" width="12" height="6" rx="3" fill="#FCD34D" />
    <rect x="14" y="48" width="12" height="6" rx="3" fill="#FCD34D" />
    <rect x="14" y="60" width="12" height="6" rx="3" fill="#FCD34D" />
    <rect x="14" y="72" width="12" height="6" rx="3" fill="#FCD34D" />
  </svg>
);

export const VaultGraphic = ({ className = "w-24 h-24" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Box Back */}
    <path d="M20 30 L80 30 L80 80 L20 80 Z" fill="var(--bg-card)" />
    {/* Papers inside */}
    <rect x="30" y="20" width="30" height="40" rx="2" fill="#FEF3C7" transform="rotate(-10 45 40)" />
    <rect x="40" y="25" width="30" height="40" rx="2" fill="#FFFBEB" transform="rotate(5 55 45)" />
    {/* Box Front */}
    <path d="M15 45 L85 45 L80 85 L20 85 Z" fill="var(--accent-primary)" opacity="0.9" />
    <path d="M15 45 L85 45 L80 55 L20 55 Z" fill="rgba(255,255,255,0.15)" />
    <rect x="40" y="60" width="20" height="6" rx="3" fill="rgba(0,0,0,0.2)" />
  </svg>
);

export const ShelfGraphic = ({ className = "w-24 h-24" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Books */}
    <rect x="25" y="30" width="12" height="45" rx="2" fill="var(--accent-hover)" />
    <rect x="40" y="20" width="14" height="55" rx="2" fill="var(--accent-primary)" />
    <rect x="57" y="35" width="10" height="40" rx="2" fill="var(--bg-card)" />
    <rect x="70" y="45" width="40" height="12" rx="2" fill="#FCD34D" transform="rotate(-60 70 45)" />
    
    {/* Shelf Base */}
    <rect x="10" y="75" width="80" height="6" rx="3" fill="var(--text-muted)" opacity="0.5" />
    <rect x="15" y="81" width="70" height="4" rx="2" fill="var(--text-muted)" opacity="0.2" />
  </svg>
);
