import { test, expect } from '@playwright/test';

test.describe('Public app flows', () => {
  test('landing page loads and routes to auth', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Property Management')).toBeVisible();
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('auth page toggles between sign in and sign up', async ({ page }) => {
    await page.goto('/#/auth');
    await expect(page.getByLabel('Email')).toBeVisible();
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByLabel('Full Name')).toBeVisible();
    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('StrongPass1!');
    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
  });
});

test.describe('Authenticated key flows', () => {
  test('tenant dashboard renders payment, announcements, and maintenance from fixture data', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__NILAYAM_E2E__ = {
        auth: {
          session: { access_token: 'test-token', user: { id: 'tenant-1', email: 'tenant@example.com' } },
          user: { id: 'tenant-1', email: 'tenant@example.com' },
          profile: { id: 'tenant-1', role: 'tenant', full_name: 'Test Tenant' }
        },
        data: {
          tenantDashboard: {
            tenancyDetails: {
              building_name: 'Lakeview Residency',
              house_number: 'A-102',
              house_id: 'house-1',
              lease_end_date: '2026-12-31',
              rent_amount: 25000,
              cctv_url: null
            },
            nextPayment: {
              id: 'payment-1',
              due_date: '2026-04-05T00:00:00.000Z',
              amount: 25000
            },
            recentAnnouncements: [
              { id: 'ann-1', created_at: '2026-03-20T00:00:00.000Z', title: 'Water Supply', message: 'Maintenance on Sunday.' }
            ],
            openMaintenanceRequests: [
              { id: 'mr-1', description: 'Kitchen tap leak', status: 'open', created_at: '2026-03-19T00:00:00.000Z' }
            ],
            landlordPaymentDetails: {},
            chargeLedger: [
              {
                id: 'ledger-1',
                tenant_id: 'tenant-1',
                house_id: 'house-1',
                category: 'rent',
                label: 'Monthly Rent',
                billing_month: '2026-03',
                amount: 25000,
                due_date: '2026-03-05',
                status: 'due',
                source: 'payment'
              }
            ],
            agreement: {
              tenant_id: 'tenant-1',
              house_id: 'house-1',
              agreement_type: 'residential_rental',
              status: 'active',
              agreement_start_date: '2025-04-01',
              agreement_end_date: '2026-12-31',
              renewal_notice_days: 30,
              vacate_notice_date: null,
              vacate_reason: null,
              notice_period_days: 30,
              stamp_duty_status: 'pending',
              registration_status: 'pending',
              last_updated_at: '2026-03-20T00:00:00.000Z'
            },
            reminders: []
          }
        }
      };
    });

    await page.goto('/#/tenant-dashboard');
    await expect(page.getByRole('heading', { name: /namaste, test!/i })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Lakeview Residency' })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: '₹25,000' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Water Supply' })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Kitchen tap leak' })).toBeVisible();
  });

  test('owner routes render without hitting the global error boundary', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__NILAYAM_E2E__ = {
        auth: {
          session: { access_token: 'test-token', user: { id: 'owner-1', email: 'owner@example.com' } },
          user: { id: 'owner-1', email: 'owner@example.com' },
          profile: { id: 'owner-1', role: 'owner', full_name: 'Owner One' }
        },
        data: {
          dashboard: {
            dashboardSummary: {
              totalProperties: 2,
              totalUnits: 4,
              occupancyRate: 50,
              totalRevenue: 52000,
              outstandingPayments: 12000,
              maintenanceRequests: 1
            },
            financialData: [
              { month: 'Jan', income: 45000, expenses: 12000 },
              { month: 'Feb', income: 47000, expenses: 11500 },
              { month: 'Mar', income: 52000, expenses: 13000 }
            ],
            occupancyData: [
              { name: 'Occupied', value: 2 },
              { name: 'Vacant', value: 2 }
            ]
          }
        },
        api: {
          maintenanceRequests: [
            {
              id: 'm1',
              description: 'Open plumbing issue',
              status: 'open',
              created_at: '2026-03-19T00:00:00.000Z',
              building_name: 'Palm Heights',
              house_number: '101'
            }
          ]
        }
      };
    });

    const ownerRoutes = [
      '/dashboard',
      '/properties',
      '/tenants',
      '/financials',
      '/maintenance',
      '/announcements',
      '/marketplace',
      '/profile',
      '/community',
      '/ai-hub',
      '/reports',
      '/services'
    ];

    for (const route of ownerRoutes) {
        await test.step(`visit ${route}`, async () => {
          await page.goto(`/#${route}`);
          await expect.soft(page.locator('main')).toBeVisible();
          await expect.soft(page.getByRole('link', { name: 'Nilayam', exact: true })).toBeVisible();
          await expect.soft(page.getByText('Something went wrong')).toHaveCount(0);
        });
      }
    });

  test('owner maintenance page filters maintenance requests', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__NILAYAM_E2E__ = {
        auth: {
          session: { access_token: 'test-token', user: { id: 'owner-1', email: 'owner@example.com' } },
          user: { id: 'owner-1', email: 'owner@example.com' },
          profile: { id: 'owner-1', role: 'owner', full_name: 'Owner One' }
        },
        api: {
          maintenanceRequests: [
            {
              id: 'm1',
              description: 'Open plumbing issue',
              status: 'open',
              created_at: '2026-03-19T00:00:00.000Z',
              building_name: 'Palm Heights',
              house_number: '101'
            },
            {
              id: 'm2',
              description: 'Resolved AC issue',
              status: 'closed',
              created_at: '2026-03-18T00:00:00.000Z',
              building_name: 'Palm Heights',
              house_number: '202'
            }
          ]
        }
      };
    });

    await page.goto('/#/maintenance');
    await expect(page.getByRole('heading', { name: /maintenance requests/i })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Open plumbing issue' })).toBeVisible();
    await page.getByRole('button', { name: /closed/i }).click();
    await expect(page.locator('p').filter({ hasText: 'Resolved AC issue' })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Open plumbing issue' })).not.toBeVisible();
  });

  test('mobile nav uses effective tenant role fallback', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      (window as any).__NILAYAM_E2E__ = {
        auth: {
          session: {
            access_token: 'test-token',
            user: {
              id: 'tenant-2',
              email: 'tenant2@example.com',
              user_metadata: { role: 'tenant' }
            }
          },
          user: {
            id: 'tenant-2',
            email: 'tenant2@example.com',
            user_metadata: { role: 'tenant' }
          },
          profile: {
            id: 'tenant-2',
            role: null,
            full_name: 'Tenant Mobile'
          }
        },
        data: {
          tenantDashboard: {
            tenancyDetails: {
              building_name: 'Palm Residency',
              house_number: 'B-201',
              house_id: 'house-2',
              lease_end_date: '2026-12-31',
              rent_amount: 18000,
              cctv_url: null
            },
            nextPayment: null,
            recentAnnouncements: [],
            openMaintenanceRequests: [],
            landlordPaymentDetails: {}
          }
        }
      };
    });

    await page.goto('/#/tenant-dashboard');
    await expect(page.locator('a[href="#/tenant-maintenance"]')).toHaveCount(2);
    await expect(page.locator('a[href="#/marketplace"]')).toHaveCount(2);
    await expect(page.locator('a[href="#/properties"]')).toHaveCount(0);
    await context.close();
  });
});
