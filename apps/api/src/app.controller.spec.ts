import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  it('ping trả về status ok', () => {
    expect(new AppController().ping()).toEqual({
      status: 'ok',
      service: 'hiveshelf-api',
    });
  });
});
