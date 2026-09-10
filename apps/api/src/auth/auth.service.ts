import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { PrismaService } from '../database/prisma.service';
import { BootstrapDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcryptjs';
import { RedisRateLimiter } from '../common/security/redis-rate-limiter';

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly redis: Redis | null;
  private readonly loginLimiter: RedisRateLimiter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {
    const url = process.env.REDIS_URL;
    if (url) {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
    } else {
      this.redis = null;
    }
    this.loginLimiter = new RedisRateLimiter(this.redis, 10, 15 * 60 * 1000, 'rl:login:');
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
    }
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async bootstrap(dto: BootstrapDto) {
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
    return this.issue(user, tenant);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const tenantSlug = dto.tenantSlug?.trim().toLowerCase() || '';
    const rateKey = `${tenantSlug || 'any'}:${email.toLowerCase()}`;

    if (!(await this.loginLimiter.try(rateKey))) {
      throw new HttpException(
        'Muitas tentativas de login. Aguarde alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let user:
      | (Awaited<ReturnType<typeof this.prisma.user.findFirst>> & {
          tenant?: { id: string; slug: string; name: string };
        })
      | null = null;

    if (tenantSlug) {
      user = await this.prisma.user.findFirst({
        where: { email, active: true, tenant: { slug: tenantSlug } },
        include: { tenant: { select: { id: true, slug: true, name: true } } },
      });
    } else {
      const matches = await this.prisma.user.findMany({
        where: { email, active: true },
        include: { tenant: { select: { id: true, slug: true, name: true } } },
        take: 8,
      });
      if (matches.length > 1) {
        const slugs = matches.map((m) => m.tenant.slug).join(', ');
        throw new ConflictException(
          `E-mail existe em mais de um workspace. Informe o tenantSlug (${slugs}).`,
        );
      }
      user = matches[0] || null;
    }

    if (!user?.passwordHash || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issue(user, user.tenant);
  }

  private issue(
    user: {
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: string;
    },
    tenant?: { slug: string; name: string } | null,
  ) {
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        tenantSlug: tenant?.slug,
      },
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
        tenantSlug: tenant?.slug || null,
        tenantName: tenant?.name || null,
      },
    };
  }
}
