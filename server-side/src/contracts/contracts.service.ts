import { Inject, Injectable } from '@nestjs/common';
import { RentsService } from '../rents/rents.service';
import { OrganizationService } from 'src/organization/organization.service';
import { buildCleanContractHTML, ContractView } from './contract-template';
import HTMLtoDOCX from 'html-to-docx';
import puppeteer from 'puppeteer';

@Injectable()
export class ContractsService {
  constructor(
    @Inject(RentsService) private readonly rentsService: RentsService, // ✅ Add @Inject()
    @Inject(OrganizationService)
    private readonly organizationService: OrganizationService, // ✅ Add @Inject()
  ) {
    console.log('🔧 ContractsService constructor called');
    console.log('🔧 RentsService injected:', !!this.rentsService);
    console.log('🔧 OrganizationService injected:', !!this.organizationService);
  }

  async getContractHTML(rentId: string): Promise<string> {
    const { data: c } = await this.rentsService.getRentContract(rentId);
    console.log('Generating contract', c);
    let org: any = {};
    try {
      if (c.orgId) {
        org = await this.organizationService.findOneWithFiles(c.orgId);
      }
    } catch {}

    const logoUrl: string | undefined =
      org?.imageFile?.url || org?.image || undefined;

    // Build a base URL that Puppeteer and the browser can resolve
    const BASE =
      process.env.PUBLIC_BASE_URL?.replace(/\/$/, '') ||
      `http://localhost:${process.env.PORT || 3000}`;

    const gaugeUrl = `${BASE}/contract-assets/gauge.png`;
    const carTopUrl = `${BASE}/contract-assets/car-top.png`;

    const view: ContractView = {
      rentContractId: c.rentContractId,
      org: {
        name: org?.name,
        logo: logoUrl,
        address: org?.address,
        phone: org?.phone,
        cnss: org?.cnssNumber || '',
        ice: org?.iceNumber || '',
        rc: org?.rcNumber || '',
      },
      customer: {
        firstName: c.customerFirstName,
        lastName: c.customerLastName,
        phone: c.customerPhone,
        address: c.customerAddress,
        cin: c.customerCIN,
        passport: c.customerPassport,
        driverLicense: c.driverLicense,
      },
      car: {
        make: c.carMake,
        model: c.carModel,
        plate: c.carPlate,
        year: c.carYear,
        color: c.carColor,
        fuel: c.carFuelType,
        mileage: c.carMileage,
      },
      dates: {
        start: c.startDate,
        end: c.returnedAt || c.expectedEndDate || null,
      },
      prices: {
        total: c.totalPrice,
        deposit: c.deposit,
      },
      etat: {
        gaugeUrl,
        carTopUrl,
      },
    };

    return buildCleanContractHTML(view);
  }

  async generateContractPDF(rentId: string): Promise<Buffer> {
    const html = await this.getContractHTML(rentId);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
      });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        pageRanges: '1-2',
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async generateContractDOCX(rentId: string): Promise<Buffer> {
    const html = await this.getContractHTML(rentId);
    const options = {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    } as any;

    const buffer = await HTMLtoDOCX(html, null, options);
    return Buffer.from(buffer);
  }
}
