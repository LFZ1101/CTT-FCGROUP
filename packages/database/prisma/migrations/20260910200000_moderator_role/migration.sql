-- Papel MODERATOR para moderação da Base Colaborativa (escopo de rede).

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';
