import { Controller, Get, Post, Put, Delete, UseGuards, Req, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getUsers({ search, sortBy, sortOrder });
  }

  @Post('users')
  createUser(@Body() body: any) {
    return this.adminService.createUser(body);
  }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const currentUserId = req.user?.id || req.user?.userId;
    return this.adminService.updateUser(id, body, currentUserId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Req() req: any) {
    const currentUserId = req.user?.id || req.user?.userId;
    return this.adminService.deleteUser(id, currentUserId);
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('estimates')
  getEstimates(
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.getEstimates({ search, sortBy, sortOrder });
  }
}
