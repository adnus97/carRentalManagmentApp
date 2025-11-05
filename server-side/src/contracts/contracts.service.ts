import { Injectable } from '@nestjs/common';
import { RentsService } from '../rents/rents.service';
import { OrganizationService } from 'src/organization/organization.service';
import { buildCleanContractHTML, ContractView } from './contract-template';
import HTMLtoDOCX from 'html-to-docx';
import puppeteer from 'puppeteer';

@Injectable()
export class ContractsService {
  constructor(
    private readonly rentsService: RentsService,
    private readonly organizationService: OrganizationService,
  ) {}

  async getContractHTML(rentId: string): Promise<string> {
    const { data: c } = await this.rentsService.getRentContract(rentId);

    // Fetch org with normalized file URLs (logo included)
    let org: any = {};
    try {
      if (c.orgId) {
        // This returns { ...org, imageFile: { id, url, isPublic, ... } , ... }
        org = await this.organizationService.findOneWithFiles(c.orgId);
      }
    } catch {
      // swallow and continue with empty org
    }

    // Prefer the resolved file URL if available; fallback to any existing absolute URL
    const logoUrl: string | undefined =
      org?.imageFile?.url || org?.image || undefined;

    const view: ContractView = {
      rentContractId: c.rentContractId,
      org: {
        name: org?.name,
        logo: logoUrl, // will be <img src="..."> in template
        address: org?.address, // used in header + "Siège Social"
        phone: org?.phone,
      },
      customer: {
        firstName: c.customerFirstName,
        lastName: c.customerLastName,
        phone: c.customerPhone,
        cin: c.customerCIN,
        passport: c.customerPassport,
        driverLicense: c.customerDriverLicense,
      },
      // Optional second driver fields: keep if present, otherwise template shows dotted placeholders

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

    // html-to-docx options: tune if needed
    const options = {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      // margins are already defined in your HTML via @page; html-to-docx
      // will respect most of the structure.
    } as any;

    const buffer = await HTMLtoDOCX(html, null, options);
    return Buffer.from(buffer);
  }
}
