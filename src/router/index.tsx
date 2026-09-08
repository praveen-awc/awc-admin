import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RequireRole } from "@/auth/RequireRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { BlogListPage } from "@/features/blogs/BlogListPage";
import { BlogEditorPage } from "@/features/blogs/BlogEditorPage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/blogs" replace /> },
          { path: "dashboard", element: <DashboardPage /> },

          { path: "blogs", element: <BlogListPage /> },
          { path: "blogs/new", element: <BlogEditorPage /> },
          { path: "blogs/:id/edit", element: <BlogEditorPage /> },

          // Phase 2
          { path: "jobs", element: <ComingSoonPage title="Jobs" phase={2} /> },
          {
            path: "applications",
            element: <ComingSoonPage title="Applications" phase={2} />,
          },

          // Phase 3
          { path: "news", element: <ComingSoonPage title="News & Events" phase={3} /> },
          {
            path: "case-studies",
            element: <ComingSoonPage title="Case Studies" phase={3} />,
          },
          { path: "leads", element: <ComingSoonPage title="Contact Leads" phase={3} /> },

          {
            path: "settings/users",
            element: (
              <RequireRole roles={["admin"]}>
                <ComingSoonPage title="Users" phase={2} />
              </RequireRole>
            ),
          },

          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
