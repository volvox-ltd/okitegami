type Props = {
  className?: string;
};

export default function IconMyPage({ className = "w-6 h-6" }: Props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 606 677.97" 
      className={className}
      fill="currentColor"
    >
      <path d="M302.99,333.33c92.05,0,166.67-74.62,166.67-166.67S395.04,0,302.99,0s-166.67,74.62-166.67,166.67,74.62,166.67,166.67,166.67Z"/>
      <path d="M303,376.67C136,376.67,0,503.21,0,659.14c0,10.55,7.33,18.83,16.67,18.83h572.67c9.33,0,16.67-8.29,16.67-18.83,0-155.92-136-282.47-303-282.47Z"/>
    </svg>
  );
}