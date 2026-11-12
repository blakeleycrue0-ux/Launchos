import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/app.css';
import { ConfigErrorScreen } from './app/ConfigErrorScreen';
import { envStatus } from './lib/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
    mutations: { retry: 0 },
  },
});

const root = createRoot(document.getElementById('root')!);

if (!envStatus.ok) {
  root.render(
    <StrictMode>
      <ConfigErrorScreen missing={envStatus.missing} />
    </StrictMode>,
  );
} else {
  // Import dinámico: el router y AuthProvider requieren un cliente Supabase válido.
  void Promise.all([import('./app/router'), import('./features/auth/AuthProvider')]).then(([{ router }, { AuthProvider }]) => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </StrictMode>,
    );
  });
}
