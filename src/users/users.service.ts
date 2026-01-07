import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
