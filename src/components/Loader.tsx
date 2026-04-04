// src/components/Loader.tsx
import { ClipLoader } from 'react-spinners';

interface LoaderProps {
  loading?: boolean;
  size?: number;
  color?: string;
}

export default function Loader({ loading = true, size = 50, color = '#4f46e5' }: LoaderProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      zIndex: 9999,
    }}>
      <ClipLoader color={color} size={size} loading={loading} />
    </div>
  );
}