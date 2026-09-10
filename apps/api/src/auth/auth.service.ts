import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { BootstrapDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcryptjs';
import { MemoryRateLimiter } from '../common/security/memory-rate-limiter';

@Injectable()
export class AuthService {
  private readonly loginLimiter = new MemoryRateLimiter(10, 15 * 60 * 1000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async bootstrap(dto: BootstrapDto) {
    if (await this.prisma.user.findFirst({ where: { email: dto.email } })) {
      throw new BadRequestException('E-mail já cadastrado.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    let slug = this.slugify(dto.tenantName) || 'escritorio';
    if (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${slug}-${Date.now().toString().slice(-5)}`;
    }
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.tenantName,
        slug,
        users: {
          create: { name: dto.name, email: dto.email, passwordHash, role: 'OWNER' },
        },
      },
      include: { users: true },
    });
    const user = tenant.users[0];
    return this.issue(user);
  }

  async login(dto: LoginDto) {
    const key = `login:${dto.email.trim().toLowerCase()}`;
    if (!this.loginLimiter.try(key)) {
      throw new HttpException(
        'Muitas tentativas de login. Aguarde alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, active: true },
      include: { tenant: true },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issue(user);
  }

  private issue(user: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: string;
  }) {
    const accessToken = this.jwt.sign(
      { sub: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      { expiresIn: '12h' },
    );
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
