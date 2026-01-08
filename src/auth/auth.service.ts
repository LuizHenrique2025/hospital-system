import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { hash, compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(name: string, email: string, password: string, role: Role) {
    try {
      const hashedPassword = await hash(password, 10);
      return this.usersService.createUser({
        name,
        email,

        password: hashedPassword,
        role,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error('Erro ao registrar usuário');
    }
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new Error('Usuário não encontrado');

    const valid = await compare(password, user.password);
    if (!valid) throw new Error('Senha incorreta');

    const payload = { sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    return { access_token: accessToken };
  }
}
