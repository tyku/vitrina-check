import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsRepository } from './checklists.repository';
import { ChecklistsService } from './checklists.service';
import { Checklist, ChecklistSchema } from './schemas/checklist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Checklist.name, schema: ChecklistSchema },
    ]),
  ],
  controllers: [ChecklistsController],
  providers: [ChecklistsService, ChecklistsRepository],
  exports: [ChecklistsService, ChecklistsRepository],
})
export class ChecklistsModule {}
