import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { RequireRole } from "@/auth/RequireRole";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { BlogListPage } from "@/features/blogs/BlogListPage";
import { BlogEditorPage } from "@/features/blogs/BlogEditorPage";
import { NewsListPage } from "@/features/news/NewsListPage";
import { NewsEditorPage } from "@/features/news/NewsEditorPage";
import { CaseStudyListPage } from "@/features/casestudies/CaseStudyListPage";
import { CaseStudyEditorPage } from "@/features/casestudies/CaseStudyEditorPage";
import { JobListPage } from "@/features/jobs/JobListPage";
import { JobEditorPage } from "@/features/jobs/JobEditorPage";
import { ApplicationListPage } from "@/features/applications/ApplicationListPage";
import { LeadListPage } from "@/features/leads/LeadListPage";
import { UserListPage } from "@/features/users/UserListPage";
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
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },

          // Content
          { path: "blogs", element: <BlogListPage /> },
          { path: "blogs/new", element: <BlogEditorPage /> },
          { path: "blogs/:id/edit", element: <BlogEditorPage /> },

          { path: "news", element: <NewsListPage /> },
          { path: "news/new", element: <NewsEditorPage /> },
          { path: "news/:id/edit", element: <NewsEditorPage /> },

          { path: "case-studies", element: <CaseStudyListPage /> },
          { path: "case-studies/new", element: <CaseStudyEditorPage /> },
          { path: "case-studies/:id/edit", element: <CaseStudyEditorPage /> },

          // Recruitment
          { path: "jobs", element: <JobListPage /> },
          { path: "jobs/new", element: <JobEditorPage /> },
          { path: "jobs/:id/edit", element: <JobEditorPage /> },
          { path: "applications", element: <ApplicationListPage /> },

          // Inbox
          { path: "leads", element: <LeadListPage /> },

          // Account management. RequireRole is UX only -- the API enforces it.
          {
            path: "settings/users",
            element: (
              <RequireRole roles={["admin"]}>
                <UserListPage />
              </RequireRole>
            ),
          },

          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
