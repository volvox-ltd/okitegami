'use client';
import React from 'react';

export default function IconUserLetter({ className = "w-10 h-10" }: { className?: string }) {
  const filterId = "user-letter-shadow";

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1411.76 1443.94" 
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* 地図上でアイコンを強調するための安定した影フィルタ */}
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="20" dy="20" stdDeviation="15" floodOpacity="0.2"/>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        {/* 背景・フタ裏 (#387631) */}
        <polygon fill="#387631" points="1185.87 341.65 1185.87 97.82 843.3 97.82 705.88 0 568.46 97.82 225.89 97.82 225.89 341.65 0 502.44 0 1443.94 1411.76 1443.94 1411.76 502.44 1185.87 341.65"/>
        {/* 手紙の中身 (#fef8f8) */}
        <polygon fill="#fef8f8" points="1185.87 621.22 851.99 796.79 705.88 693.47 562.62 816.75 225.89 628.63 225.89 97.82 1185.87 97.82 1185.87 621.22"/>
        {/* 左フラップ (#245c33) */}
        <polygon fill="#245c33" points="0 502.44 0 1443.94 572.9 884.5 0 502.44"/>
        {/* 右フラップ (#245c33) */}
        <polygon fill="#245c33" points="838.86 884.5 1411.76 1443.94 1411.76 502.44 838.86 884.5"/>
        {/* 下フラップ (#1a4529) */}
        <polygon fill="#1a4529" points="705.88 754.65 572.9 884.5 0 1443.94 1411.76 1443.94 838.86 884.5 705.88 754.65"/>
        {/* 影・ディテール (#143428) */}
        <polygon fill="#143428" points="0 502.44 572.9 884.5 705.88 754.65 838.86 884.5 1411.76 502.44 851.99 796.79 705.88 693.47 562.62 816.75 0 502.44"/>
      </g>
    </svg>
  );
}