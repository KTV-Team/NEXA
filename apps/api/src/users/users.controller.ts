import { Controller, Get, Param, Patch, Body, HttpCode, HttpStatus } from '@nestjs/common';
import type { User, PaginatedResponse, UpdateUserDto } from '@nexa/types';

// Stub in-memory data — replace with a real database service
const USERS: User[] = [
  {
    id: '1',
    email: 'alice@example.com',
    name: 'Alice',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'bob@example.com',
    name: 'Bob',
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

@Controller('users')
export class UsersController {
  @Get()
  findAll(): PaginatedResponse<User> {
    return {
      data: USERS,
      meta: {
        page: 1,
        limit: 20,
        total: USERS.length,
        totalPages: 1,
      },
    };
  }

  @Get('me')
  getMe(): User {
    // In production, extract user from JWT / request context
    return USERS[0]!;
  }

  @Get(':id')
  findOne(@Param('id') id: string): User {
    const user = USERS.find((u) => u.id === id);
    if (!user) throw new Error(`User ${id} not found`);
    return user;
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  updateMe(@Body() dto: UpdateUserDto): User {
    const user = USERS[0]!;
    if (dto.name) user.name = dto.name;
    if (dto.avatarUrl) user.avatarUrl = dto.avatarUrl;
    user.updatedAt = new Date().toISOString();
    return user;
  }
}
