export default function LoadingSpinner({ size = 'default' }) {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className="flex justify-center items-center p-8">
      <div className={`animate-spin rounded-full border-b-2 border-[#344E41] ${sizeClasses[size]}`}></div>
    </div>
  );
}
