export default function LoadingSpinner({ size = 'default' }) {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className="flex justify-center items-center p-8">
      <div className={`animate-spin rounded-full border-[3px] border-[rgba(23,50,41,0.14)] border-t-[hsl(var(--primary))] ${sizeClasses[size]}`}></div>
    </div>
  );
}
