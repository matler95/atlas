import { createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

// Actual page components
import LoginPage from '@/routes/auth/login'
import RegisterPage from '@/routes/auth/register'
import OnboardingPage from '@/routes/onboarding/index'
import WorkoutBuilderPage from '@/routes/onboarding/workout-builder'
import DashboardPage from '@/routes/app/dashboard'
import PlanPage from '@/routes/app/plan'
import ProgressPage from '@/routes/app/progress'
import LibraryPage from '@/routes/app/library'
import ProfilePage from '@/routes/app/profile'
import WorkoutPage from '@/routes/app/workout/$sessionId'

const RootComponent = () => {
  return <Outlet />
}

const rootRoute = createRootRoute({
  component: RootComponent,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: LoginPage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (user) throw redirect({ to: '/app/dashboard' })
  },
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/register',
  component: RegisterPage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (user) throw redirect({ to: '/app/dashboard' })
  },
})

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  component: OnboardingPage,
  beforeLoad: () => {
    // Allow access without auth (account created during onboarding)
  },
})

const workoutBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding/workout-builder',
  component: WorkoutBuilderPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/dashboard',
  component: DashboardPage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/auth/login' })
  },
})

const planRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/plan',
  component: PlanPage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/auth/login' })
  },
})

const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/progress',
  component: ProgressPage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/auth/login' })
  },
})

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/library',
  component: LibraryPage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/auth/login' })
  },
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/profile',
  component: ProfilePage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/auth/login' })
  },
})

const workoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/workout/$sessionId',
  component: WorkoutPage,
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/auth/login' })
  },
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { user } = useAuthStore.getState()
    throw redirect({ to: user ? '/app/dashboard' : '/auth/login' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  onboardingRoute,
  workoutBuilderRoute,
  dashboardRoute,
  planRoute,
  progressRoute,
  libraryRoute,
  profileRoute,
  workoutRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}