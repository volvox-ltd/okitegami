type Props = {
  className?: string;
};

export default function IconAbout({ className = "w-6 h-6" }: Props) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 115 151" 
      className={className}
      fill="currentColor"
    >
      <path d="M10,117s-7-17.07,0-25.04l4,2.04s-7-10,3-17c0,0,3-15,16-24,0,0-2,4-2,10,0,0,6-27,54-50,0,0-1,1-2,3,0,0,9-9,32-16,0,0-28,23-40,30l9-3s-24.42,26-32.21,31.5l15.21-9.5s-8,11-16,24-15,18-15,18c0,0,4-2,10-7,0,0-16,20-24,26l8-5s-8,10-16,15c0,0-9,25-14,31,0,0,21-74,55-109,0,0-33,33-45,75Z"/>
    </svg>
  );
}