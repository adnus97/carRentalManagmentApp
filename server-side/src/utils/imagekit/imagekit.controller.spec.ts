import { Test, TestingModule } from '@nestjs/testing';
import { ImageKitController } from './imagekit.controller';
import { ImageKitService } from './imagekit.service';

describe('ImagekitController', () => {
  let controller: ImageKitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageKitController],
      providers: [ImageKitService],
    }).compile();

    controller = module.get<ImageKitController>(ImageKitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
