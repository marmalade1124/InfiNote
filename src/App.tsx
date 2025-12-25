import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Minimap } from './components/Minimap';
import { useCanvasStore } from './store/canvasStore';
import { useAuthStore } from './store/authStore';

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

// Wrapper for Canvas to include UI
const CanvasPage = () => {
    const { id } = useParams();
    const { loadBoard, resetCanvas } = useCanvasStore();

    useEffect(() => {
        if (id) {
            // Always fetch fresh data to ensure we have the latest
            loadBoard(id); 
            // If it fails, loadBoard handles the error state
        } else {
            resetCanvas();
        }
    }, [id, loadBoard, resetCanvas]);

    return (
        <div className="h-screen w-full flex flex-col overflow-hidden bg-background-dark text-white font-display">
          <Header boardId={id} />
          <main className="relative flex-1 overflow-hidden group/canvas">
            <Sidebar />
            <InfiniteCanvas />
            <Minimap />
          </main>
        </div>
    );
};

// Protected Route Wrapper
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    const { session, isLoading } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-background-dark text-white">Loading...</div>;
    }

    if (!session) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
};

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
      initialize();
  }, [initialize]);

  const { setStatus } = useCanvasStore();

  useEffect(() => {
      const handleOnline = () => {
          console.log("Browser Online");
          // Optionally trigger reconnect logic if needed
          setStatus('connecting');
          // Re-connection usually handled by Supabase client auto-reconnect, 
          // but updating UI status immediately is good.
      };
      
      const handleOffline = () => {
          console.log("Browser Offline");
          setStatus('disconnected');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, [setStatus]);

  return (
    <Router>
        <Routes>
            <Route path="/" element={<Login />} />
            <Route 
                path="/dashboard" 
                element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                } 
            />
            <Route 
                path="/editor/:id" 
                element={
                    <RequireAuth>
                        <CanvasPage />
                    </RequireAuth>
                } 
            />
        </Routes>
    </Router>
  );
}

export default App;
