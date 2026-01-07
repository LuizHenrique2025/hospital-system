import { Controller, Post, Body, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

class CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: Role;
}

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('create')
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Get()
  getAllUsers() {
    return this.usersService['prisma'].user.findMany();
  }
}
