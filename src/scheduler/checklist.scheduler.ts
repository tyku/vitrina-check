import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('checklistScheduler')
export class ChecklistScheduler extends WorkerHost {
  async process(_job: Job): Promise<void> {
    // Placeholder processor: scheduler logic will be added later.
  }
}
