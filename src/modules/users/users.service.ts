import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { PaginationDto, PaginatedResponseDto } from './dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

type AuthUser = Pick<User, 'id' | 'username' | 'email' | 'password' | 'role'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
      },
    });
  }

  async findByUsername(username: string): Promise<AuthUser | null> {
    return this.prisma.user.findUnique({
      where: { username: this.normalizeUsername(username) },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
      },
    });
  }

  async findAuthUserByUsername(username: string): Promise<AuthUser | null> {
    return this.findByUsername(username);
  }

  async findAll(
    pagination?: PaginationDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: this.safeUserSelect(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<UserResponseDto | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect(),
    });
  }

  async createUser(data: {
    name: string;
    username: string;
    email: string;
    password: string;
    role: Role;
  }): Promise<UserResponseDto> {
    const username = this.normalizeUsername(data.username);
    const existingUsername = await this.findByUsername(username);

    if (existingUsername) {
      throw new ConflictException('Login ja esta em uso');
    }

    const existingUser = await this.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException('Email ja esta em uso');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        ...data,
        username,
        password: hashedPassword,
      },
      select: this.safeUserSelect(),
    });
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await this.findByEmail(data.email);

      if (existingUser) {
        throw new ConflictException('Email ja esta em uso');
      }
    }

    if (data.username) {
      const username = this.normalizeUsername(data.username);

      if (username !== user.username) {
        const existingUsername = await this.findByUsername(username);

        if (existingUsername) {
          throw new ConflictException('Login ja esta em uso');
        }
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      ...data,
      username: data.username
        ? this.normalizeUsername(data.username)
        : data.username,
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.safeUserSelect(),
    });
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  private safeUserSelect(): Prisma.UserSelect {
    return {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    };
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }
}
