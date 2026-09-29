import { routes } from './app.routes';
import { authGuard } from './auth/guards/auth-guard';

describe('application routes', () => {
  it('keeps sign-in public and protects metrics by role', () => {
    const signIn = routes.find(route => route.path === 'sign-in');
    const metrics = routes.find(route => route.path === 'metrics');
    expect(signIn?.canActivate).toBeDefined();
    expect(metrics?.canActivate).toContain(authGuard);
    expect(metrics?.data?.['expectedRoles']).toEqual(['COORDINATOR', 'ADMIN']);
  });
});
