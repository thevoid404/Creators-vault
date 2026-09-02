import { Module } from '@nestjs/common';
import { AssetRelationshipsController, RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';

@Module({
  controllers: [RelationshipsController, AssetRelationshipsController],
  providers: [RelationshipsService],
  exports: [RelationshipsService],
})
export class RelationshipsModule {}
