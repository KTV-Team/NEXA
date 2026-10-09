import { Injectable } from '@nestjs/common';
import type { QueryRunner } from 'typeorm';

@Injectable()
export class RecipientPolicyService {
  async isEligible(queryRunner: QueryRunner, senderId: string, recipientId: string): Promise<boolean> {
    if (senderId === recipientId) return true;
    const [low, high] = [senderId, recipientId].sort();
    const rows = await queryRunner.query(
      'SELECT 1 FROM friendships WHERE low_user_id=$1 AND high_user_id=$2 AND removed_at IS NULL',
      [low, high],
    );
    return rows.length > 0;
  }
}
