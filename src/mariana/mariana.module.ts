import { Module, Global } from '@nestjs/common';
import { MarianaService } from './mariana.service';

@Global()
@Module({
  providers: [MarianaService],
  exports: [MarianaService],
})
export class MarianaModule {}
