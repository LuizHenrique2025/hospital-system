import { Controller, MessageEvent, Sse } from '@nestjs/common';
import { interval, map, Observable } from 'rxjs';

import { Public } from '../auth/decorators/public.decorator';

@Controller('realtime')
export class RealtimeController {
  @Public()
  @Sse('queue')
  queueEvents(): Observable<MessageEvent> {
    return interval(30000).pipe(
      map(() => ({
        data: {
          at: new Date().toISOString(),
          scope: 'appointments',
          type: 'queue-refresh',
        },
      })),
    );
  }
}
