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
import { TrashPage } from "@/features/trash/TrashPage";
import { ActivityListPage } from "@/features/activity/ActivityListPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <ProtectedRoute />,
    // Catches anything thrown before the layout mounts (the auth check, say).
    // Renders bare, but the alternative is React Router's developer screen.
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: "/",
        element: <AdminLayout />,
        children: [
          /*
           * The errorElement sits on a pathless child route, not on the
           * layout route itself: an errorElement replaces the element it is
           * declared on, so declaring it here keeps AdminLayout mounted and
           * renders the error inside its <Outlet />. The sidebar and header
           * survive, and the user can navigate away rather than being
           * stranded on a dead screen with only a reload to escape it.
           */
          {
            errorElement: <RouteErrorPage />,
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

              // The audit trail names every user and everything they did, so
              // it is admin-only. The notification bell, which shows the same
              // feed unfiltered, stays open to editors.
              {
                path: "activity",
                element: (
                  <RequireRole roles={["admin"]}>
                    <ActivityListPage />
                  </RequireRole>
                ),
              },

              // Restoring and permanent deletion are admin-only, enforced on
              // the API as well.
              {
                path: "trash",
                element: (
                  <RequireRole roles={["admin"]}>
                    <TrashPage />
                  </RequireRole>
                ),
              },

              // Everyone signed in can change their own password, whatever
              // their role, so this one is deliberately not role-gated.
              { path: "settings/password", element: <ChangePasswordPage /> },

              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);
