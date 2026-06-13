import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UploadsController, multerErrorFilter } from './uploads.controller';

@Module({
  controllers: [UploadsController],
})
export class UploadsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Attach multer error handler middleware so oversized / wrong-field
    // uploads return 400 JSON instead of crashing with a 500
    consumer.apply(multerErrorFilter).forRoutes(UploadsController);
  }
}
