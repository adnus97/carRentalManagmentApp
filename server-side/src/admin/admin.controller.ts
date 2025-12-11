// // src/admin/admin.controller.ts - ULTRA MINIMAL (no service injection)
// import { Controller, Get } from '@nestjs/common';
// import { Auth } from 'src/auth/auth.guard';
// import { SuperAdmin } from 'src/auth/super-admin.guard';

// @Auth()
// @SuperAdmin()
// @Controller('admin')
// export class AdminController {
//   constructor() {
//     console.log('🔧 AdminController constructor called - NO DEPENDENCIES');
//   }

//   @Get('test')
//   test() {
//     console.log('🧪 Admin test endpoint hit!');
//     return { message: 'Admin controller works!', timestamp: new Date() };
//   }

//   @Get('stats')
//   getDashboardStats() {
//     console.log('📊 Admin stats endpoint hit!');
//     return {
//       users: { totalUsers: 5, activeSubscriptions: 3 },
//       subscriptions: { expiringSoon: 1 },
//       revenue: { totalRevenue: 4500 },
//     };
//   }

//   @Get('users')
//   getAllUsers() {
//     console.log('👥 Admin users endpoint hit!');
//     return {
//       data: [{ id: '1', name: 'Test User', email: 'test@example.com' }],
//       total: 1,
//       page: 1,
//       limit: 10,
//     };
//   }
// }
