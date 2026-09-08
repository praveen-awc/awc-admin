import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/router";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  </QueryClientProvider>
);

export default App;
