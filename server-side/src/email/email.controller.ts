import { Body, Controller, Inject, Post } from '@nestjs/common';
import { EmailService } from './email.service';
import { sendEmailDto } from './dto/email.dto';

@Controller('email')
export class EmailController {
  constructor(
    @Inject(EmailService) private readonly emailService: EmailService, // ✅ Add @Inject()
  ) {
    console.log('🔧 EmailController constructor called');
    console.log('🔧 EmailService injected:', !!this.emailService);
  }
  @Post('send')
  async sendMail(@Body() dto: sendEmailDto) {
    await this.emailService.sendEmail(dto);
    return { message: 'Email sent succesfully' };
  }
}
