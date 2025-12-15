// components/BookIcon.tsx

export default function BookIcon({ className = "" }: { className?: string }) {
  /* PNG画像を表示するだけのコンポーネントにします */
  return (
    <img 
      src="./book-icon.png" 
      alt="本" 
      className={className} 
      style={{ objectFit: 'contain' }}
    />
  );
}