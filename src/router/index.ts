import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'leagues',
          name: 'leagues',
          component: () => import('@/views/superadmin/LeaguesView.vue'),
          meta: { requiresRole: 'super_admin' },
        },
        {
          path: 'leagues/:id',
          name: 'league-detail',
          component: () => import('@/views/superadmin/LeagueDetailView.vue'),
          meta: { requiresRole: 'super_admin' },
        },
        {
          path: 'my-league',
          name: 'my-league',
          component: () => import('@/views/admin/MyLeagueView.vue'),
          meta: { requiresRole: 'admin' },
        },
        {
          path: 'my-league/seasons/:seasonId',
          name: 'admin-season-detail',
          component: () => import('@/views/admin/SeasonDetailView.vue'),
          meta: { requiresRole: 'admin' },
        },
        {
          path: 'my-league/seasons/:seasonId/categories/:categoryId',
          component: () => import('@/views/admin/CategoryDetailView.vue'),
          meta: { requiresRole: 'admin' },
          children: [
            {
              path: '',
              name: 'admin-category-detail',
              redirect: { name: 'admin-category-overview' },
            },
            {
              path: 'overview',
              name: 'admin-category-overview',
              component: () => import('@/views/admin/CategoryOverviewView.vue'),
            },
            {
              path: 'teams',
              name: 'admin-category-teams',
              component: () => import('@/views/admin/CategoryTeamsView.vue'),
            },
            {
              path: 'games',
              name: 'admin-category-games',
              component: () => import('@/views/admin/CategoryGamesView.vue'),
            },
            {
              path: 'calendar',
              name: 'admin-category-calendar',
              component: () => import('@/views/admin/CategoryCalendarView.vue'),
            },
            {
              path: 'standings',
              name: 'admin-category-standings',
              component: () => import('@/views/admin/CategoryStandingsView.vue'),
            },
            {
              path: 'stats',
              name: 'admin-category-stats',
              component: () => import('@/views/admin/CategoryStatsView.vue'),
            },
            {
              path: 'player-stats',
              name: 'admin-category-player-stats',
              component: () => import('@/views/admin/CategoryPlayerStatsView.vue'),
            },
            {
              path: 'leaders',
              name: 'admin-category-leaders',
              component: () => import('@/views/admin/CategoryLeadersView.vue'),
            },
            {
              path: 'payments',
              name: 'admin-category-payments',
              component: () => import('@/views/admin/CategoryPaymentsView.vue'),
            },
            {
              path: 'teams/:teamId/players',
              name: 'admin-team-players',
              component: () => import('@/views/admin/TeamPlayersView.vue'),
            },
            {
              path: 'playoffs',
              component: () => import('@/views/admin/PlayoffsView.vue'),
              children: [
                {
                  path: '',
                  name: 'admin-category-playoffs',
                  redirect: { name: 'admin-category-playoffs-setup' },
                },
                {
                  path: 'setup',
                  name: 'admin-category-playoffs-setup',
                  component: () => import('@/views/admin/PlayoffSetupView.vue'),
                },
                {
                  path: 'bracket',
                  name: 'admin-category-playoffs-bracket',
                  component: () => import('@/views/admin/PlayoffBracketView.vue'),
                },
                {
                  path: 'games',
                  name: 'admin-category-playoffs-games',
                  component: () => import('@/views/admin/PlayoffGamesView.vue'),
                },
                {
                  path: 'standings',
                  name: 'admin-category-playoffs-standings',
                  component: () => import('@/views/admin/PlayoffStandingsView.vue'),
                },
                {
                  path: 'stats',
                  name: 'admin-category-playoffs-stats',
                  component: () => import('@/views/admin/PlayoffStatsView.vue'),
                },
                {
                  path: 'leaders',
                  name: 'admin-category-playoffs-leaders',
                  component: () => import('@/views/admin/PlayoffLeadersView.vue'),
                },
              ],
            },
          ],
        },
        {
          path: 'my-teams',
          name: 'manager-teams',
          component: () => import('@/views/manager/ManagerTeamsView.vue'),
          meta: { requiresRole: 'manager' },
        },
        {
          path: 'my-teams/:teamId',
          name: 'manager-team-dashboard',
          component: () => import('@/views/manager/ManagerTeamDashboard.vue'),
          meta: { requiresRole: 'manager' },
        },
        {
          path: 'my-teams/:teamId/games',
          name: 'manager-team-games',
          component: () => import('@/views/manager/ManagerGamesView.vue'),
          meta: { requiresRole: 'manager' },
        },
        {
          path: 'my-teams/:teamId/standings',
          name: 'manager-team-standings',
          component: () => import('@/views/manager/ManagerStandingsView.vue'),
          meta: { requiresRole: 'manager' },
        },
        {
          path: 'my-teams/:teamId/stats',
          name: 'manager-team-stats',
          component: () => import('@/views/manager/ManagerStatsView.vue'),
          meta: { requiresRole: 'manager' },
        },
        {
          path: 'my-teams/:teamId/roster',
          name: 'manager-team-roster',
          component: () => import('@/views/manager/ManagerRosterView.vue'),
          meta: { requiresRole: 'manager' },
        },
        {
          path: 'my-teams/:teamId/payments',
          name: 'manager-team-payments',
          component: () => import('@/views/manager/ManagerPaymentsView.vue'),
          meta: { requiresRole: 'manager' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login' })
  } else if (to.meta.requiresGuest && auth.isAuthenticated) {
    next({ name: 'dashboard' })
  } else if (to.meta.requiresRole && auth.user?.role !== to.meta.requiresRole) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
