import { useId } from 'react';

type Props = {
  className?: string;
  hasLetters?: boolean; // 手紙が入っているかどうかのフラグ
};

export default function IconPost({ className = "w-6 h-6", hasLetters = false }: Props) {
  const clipId = useId(); // マーカーごとに一意のIDを生成（表示崩れ防止）

  // === ユーザーの投函がある場合 (手紙入りポスト) ===
  if (hasLetters) {
    return (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 1041.91 1753.08"
        className={className}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <style>{`
            .cls-1{fill:none;}
            .cls-2{fill:#51160c;}
            .cls-3,.cls-4,.cls-5{fill:#cc4636;}
            .cls-6{fill:#efe3d3;}
            .cls-6,.cls-4,.cls-5,.cls-7{mix-blend-mode:multiply;}
            .cls-8,.cls-9{fill:#ed4934;}
            .cls-8,.cls-10{mix-blend-mode:screen;}
            .cls-11{fill:#190000;}
            .cls-12{isolation:isolate;}
            .cls-13{fill:#590f00;}
            .cls-4{opacity:.4;}
            .cls-14{fill:#fff7ee;font-family:AGaramondPro-Bold, 'Adobe Garamond Pro';font-size:200px;font-weight:700;letter-spacing:.2em;}
            .cls-15,.cls-10{fill:#642219;}
            .cls-7{fill:#d6cdc6;}
            .cls-17{fill:#eee3db;}
          `}</style>
          <clipPath id={clipId}>
            <rect className="cls-1" x="150.75" y="216.79" width="796.68" height="433.26"/>
          </clipPath>
        </defs>
        <g className="cls-12">
          <g id="Layer_1" data-name="Layer 1">
            <g>
              <g>
                <g>
                  <path className="cls-3" d="M520.95,0C233.24,0,0,211.46,0,472.34v1280.73h1041.91V472.34C1041.91,211.46,808.67,0,520.95,0Z"/>
                  <path className="cls-13" d="M520.95,33.76C246.76,33.76,24.48,235.31,24.48,483.9v1220.55h992.93V483.9c0-248.6-222.27-450.14-496.46-450.14Z"/>
                  <path className="cls-3" d="M520.95,48.63C249.21,48.63,28.9,247.08,28.9,491.9v1201.91h984.1V491.9c0-244.82-220.31-443.27-492.05-443.27Z"/>
                  <path className="cls-4" d="M913.73,945.02c-101.5,92.35-223.81,162.01-352.7,208.4-59.54,21.45-120.37,39.15-183.75,43.86-55.43,4.12-111.54.17-165.57-13.16-65.9-16.27-128.06-45.42-182.82-85.04v594.73h984.1v-864.32c-28.87,41.86-61.36,81.03-99.27,115.53Z"/>
                  <g>
                    <rect className="cls-2" x="150.75" y="583.97" width="740.39" height="66.07"/>
                    <rect className="cls-11" x="150.75" y="617.01" width="740.39" height="33.04"/>
                  </g>
                </g>
                <rect className="cls-9" x="150.75" y="517.9" width="740.39" height="66.07"/>
                <rect className="cls-8" x="150.75" y="572.3" width="740.39" height="9.19"/>
                <text className="cls-14" transform="translate(206.94 389.59)"><tspan x="0" y="0">POST</tspan></text>
                <g>
                  <path className="cls-15" d="M520.95,897.6c-38.06,0-69.03-30.95-69.03-69.01s30.96-69,69.03-69,69.01,30.94,69.01,69-30.95,69.01-69.01,69.01ZM520.95,768.14c-33.36,0-60.45,27.11-60.45,60.45s27.09,60.45,60.45,60.45,60.45-27.13,60.45-60.45-27.11-60.45-60.45-60.45Z"/>
                  <path className="cls-15" d="M527.13,855.95c0,3.4-2.78,6.18-6.18,6.18h0c-3.42,0-6.18-2.78-6.18-6.18v-52.88c0-3.42,2.76-6.17,6.18-6.17h0c3.41,0,6.18,2.75,6.18,6.17v52.88Z"/>
                </g>
                <path className="cls-15" d="M891.14,1606.93H150.75c-2.35,0-4.26-1.91-4.26-4.27v-880.22c0-2.36,1.92-4.28,4.26-4.28h740.39c2.37,0,4.28,1.92,4.28,4.28v880.22c0,2.35-1.91,4.27-4.28,4.27ZM155.05,1598.37h731.8v-871.66H155.05v871.66Z"/>
                <path className="cls-10" d="M887.56,1606.93H154.33c-2.35,0-4.25-1.88-4.25-4.24v-871.74c0-2.35,1.9-4.25,4.25-4.25h733.23c2.35,0,4.25,1.9,4.25,4.25v871.74c0,2.35-1.9,4.24-4.25,4.24ZM158.57,1598.47h724.78v-863.28H158.57v863.28Z"/>
              </g>
              <g style={{ clipPath: `url(#${clipId})` }}>
                <path className="cls-5" d="M699.4,234.71l-34.22,28.82c17.63-15.38,27.95-24.47,27.95-24.47l-409.84,345.08c5.9-4.63,11.92-9.4,18.02-14.24l-24.34,20.5,231.27,274.68,422.43-355.67-231.27-274.69Z"/>
                <g>
                  <g>
                    <polygon className="cls-17" points="905.94 504.66 483.51 860.32 252.22 585.64 674.67 229.97 905.94 504.66"/>
                    <polygon className="cls-7" points="905.94 504.66 483.51 860.32 252.22 585.64 606.22 575.15 674.67 229.97 905.94 504.66"/>
                  </g>
                  <g>
                    <polygon className="cls-17" points="905.94 504.66 483.51 860.32 252.22 585.64 618.43 589.64 674.67 229.97 905.94 504.66"/>
                    <path className="cls-6" d="M483.73,855.71l134.7-266.07s-83.22,176.45-134.7,266.07Z"/>
                    <path className="cls-6" d="M903.09,504.04l-282.61,84.83s186.43-50.27,282.61-84.83Z"/>
                  </g>
                  <path className="cls-6" d="M258.56,579.39l409.84-345.08s-245.46,216.02-409.84,345.08Z"/>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    );
  }

  // === ユーザーの投函がない場合 (空のポスト) ===
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 1041.91 1753.08"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <style>{`
          .cls-1{fill:#51160c;}
          .cls-2,.cls-3{fill:#cc4636;}
          .cls-4,.cls-5{fill:#ed4934;}
          .cls-4,.cls-6{mix-blend-mode:screen;}
          .cls-7{fill:#190000;}
          .cls-8{isolation:isolate;}
          .cls-9{fill:#590f00;}
          .cls-3{mix-blend-mode:multiply;opacity:.4;}
          .cls-10{fill:#fff7ee;font-family:AGaramondPro-Bold, 'Adobe Garamond Pro';font-size:200px;font-weight:700;letter-spacing:.2em;}
          .cls-11,.cls-6{fill:#642219;}
        `}</style>
      </defs>
      <g className="cls-8">
        <g id="Layer_1_copy" data-name="Layer 1">
          <g>
            <g>
              <path className="cls-2" d="M520.95,0C233.24,0,0,211.46,0,472.34v1280.73h1041.91V472.34C1041.91,211.46,808.67,0,520.95,0Z"/>
              <path className="cls-9" d="M520.95,33.76C246.76,33.76,24.48,235.31,24.48,483.9v1220.55h992.93V483.9c0-248.6-222.27-450.14-496.46-450.14Z"/>
              <path className="cls-2" d="M520.95,48.63C249.21,48.63,28.9,247.08,28.9,491.9v1201.91h984.1V491.9c0-244.82-220.31-443.27-492.05-443.27Z"/>
              <path className="cls-3" d="M913.73,945.02c-101.5,92.35-223.81,162.01-352.7,208.4-59.54,21.45-120.37,39.15-183.75,43.86-55.43,4.12-111.54.17-165.57-13.16-65.9-16.27-128.06-45.42-182.82-85.04v594.73h984.1v-864.32c-28.87,41.86-61.36,81.03-99.27,115.53Z"/>
              <g>
                <rect className="cls-1" x="150.75" y="583.97" width="740.39" height="66.07"/>
                <rect className="cls-7" x="150.75" y="617.01" width="740.39" height="33.04"/>
              </g>
            </g>
            <rect className="cls-5" x="150.75" y="517.9" width="740.39" height="66.07"/>
            <rect className="cls-4" x="150.75" y="572.3" width="740.39" height="9.19"/>
            <text className="cls-10" transform="translate(206.94 389.59)"><tspan x="0" y="0">POST</tspan></text>
            <g>
              <path className="cls-11" d="M520.95,897.6c-38.06,0-69.03-30.95-69.03-69.01s30.96-69,69.03-69,69.01,30.94,69.01,69-30.95,69.01-69.01,69.01ZM520.95,768.14c-33.36,0-60.45,27.11-60.45,60.45s27.09,60.45,60.45,60.45,60.45-27.13,60.45-60.45-27.11-60.45-60.45-60.45Z"/>
              <path className="cls-11" d="M527.13,855.95c0,3.4-2.78,6.18-6.18,6.18h0c-3.42,0-6.18-2.78-6.18-6.18v-52.88c0-3.42,2.76-6.17,6.18-6.17h0c3.41,0,6.18,2.75,6.18,6.17v52.88Z"/>
            </g>
            <path className="cls-11" d="M891.14,1606.93H150.75c-2.35,0-4.26-1.91-4.26-4.27v-880.22c0-2.36,1.92-4.28,4.26-4.28h740.39c2.37,0,4.28,1.92,4.28,4.28v880.22c0,2.35-1.91,4.27-4.28,4.27ZM155.05,1598.37h731.8v-871.66H155.05v871.66Z"/>
            <path className="cls-6" d="M887.56,1606.93H154.33c-2.35,0-4.25-1.88-4.25-4.24v-871.74c0-2.35,1.9-4.25,4.25-4.25h733.23c2.35,0,4.25,1.9,4.25,4.25v871.74c0,2.35-1.9,4.24-4.25,4.24ZM158.57,1598.47h724.78v-863.28H158.57v863.28Z"/>
          </g>
        </g>
      </g>
    </svg>
  );
}