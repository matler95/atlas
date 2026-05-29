import { createRouter, createRoute, createRootRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

// Placeholder route components (will be replaced with actual pages in later steps)
const RootComponent = () => {
  return <Outlet />
}

const LoginPage = () => <div>Login Page</div>
const RegisterPage = () => <div>Register Page</div>
const OnboardingPage = () => <div>Onboarding Page</div>
const DashboardPage = () => <div>Dashboard Page</div>
const PlanPage = () => <div>Plan Page</div>
const ProgressPage = () => <div>Progress Page</div>
const LibraryPage = () => <div>Library Page</div>
const ProfilePage = () => <div>Profile Page</div>
const WorkoutPage = () => <div>Workout Page</div>

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
    const { user } = useAuthStore.getState()
    if (!user) throw redirect({ to: '/auth/login' })
  },
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