import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('ping trả về status ok', () => {
    expect(new AppController().ping()).toEqual({
      status: 'ok',
      service: 'hiveshelf-api',
    });
  });
});
