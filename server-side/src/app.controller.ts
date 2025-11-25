import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { I18n, I18nContext } from 'nestjs-i18n';
import { join } from 'path';

@Controller('debug')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('i18n')
  async i18n(@I18n() i18n: I18nContext) {
    console.log('I18n path:', join(__dirname, '/i18n/'));

    try {
      const en = await i18n.t('common.notifications.common.days', {
        lang: 'fr',
      });
      return { en };
    } catch (error) {
      console.error('Translation error:', error);
      return { error: error.message };
    }
  }
}
