import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session } = useSession();

  // Wenn keine Session vorhanden, zurück zum Login
  if (!session || !session.company) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
