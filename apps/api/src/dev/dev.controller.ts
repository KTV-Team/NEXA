import { Controller, Get } from '@nestjs/common';
import type { DevDemoData } from '@nexa/types';
import { DevDemoService } from './dev-demo.service';

@Controller('dev')
export class DevController {
  constructor(private readonly demo: DevDemoService) {}

  @Get('demo')
  async getDemo(): Promise<DevDemoData> {
    return this.demo.getDemo();
  }
}
