// src/contracts/contracts.service.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { RentsService } from '../rents/rents.service';
import { OrganizationService } from 'src/organization/organization.service';
import puppeteer from 'puppeteer';

@Injectable()
export class ContractsService {
  constructor(
    private readonly rentsService: RentsService,
    private readonly organizationService: OrganizationService,
  ) {}

  async getContractHTML(rentId: string): Promise<string> {
    const { data: contract } = await this.rentsService.getRentContract(rentId);

    let organizationName = '';
    let organizationLogo = '';
    try {
      if (contract.orgId) {
        const org = await this.organizationService.findOne(contract.orgId);
        organizationName = org[0]?.name || '';
        organizationLogo = org[0]?.image || '';
      }
    } catch (error) {
      console.warn('Could not fetch organization name/logo:', error);
    }

    // ✅ Calculate difference in days
    const start = new Date(contract.startDate);
    const end = new Date(contract.returnedAt || contract.expectedEndDate);

    let duree = '';
    if (end.getFullYear() === 9999) {
      duree = 'Contrat Ouvert';
    } else {
      const diffDays = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      );
      duree = `${diffDays} jour(s)`;
    }

    return `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Contrat de Location - ${contract.rentContractId}</title>
    <style>
      :root {
        --primarycol: #065f46; /* Dark green */
        --secondarycol: #f3f4f6;
        --text-dark: #000000;
        --text-light: #333333;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        height: 100%;
        background: #ffffff !important;
        color: var(--text-dark);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 13px;
      }
      .page {
        width: 210mm;
        margin: auto;
        padding: 20mm;
        background: #ffffff;
        position: relative;
        overflow: hidden;
      }

      /* ✅ Watermark */
      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 70px;
        font-weight: bold;
        color: rgba(0, 0, 0, 0.05); /* faint */
        white-space: nowrap;
        pointer-events: none;
        z-index: 0;
        text-align: center;
      }
      .watermark img {
        opacity: 0.05;
        max-width: 400px;
        height: auto;
      }

      header, .info-bar, .grid, .signatures, .actions {
        position: relative;
        z-index: 1; /* ✅ content above watermark */
      }

      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 3px solid var(--primarycol);
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .org-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .org-info img {
        height: 50px;
        width: auto;
        object-fit: contain;
      }
      header h1 {
        font-size: 20px;
        color: var(--primarycol);
        margin: 0;
      }
      header .title {
        font-size: 18px;
        font-weight: bold;
        color: var(--text-dark);
      }
      .info-bar {
        display: flex;
        justify-content: space-between;
        background: var(--secondarycol);
        padding: 8px 12px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 14px;
        color: var(--text-dark);
        font-weight: bold;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      section {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
      }
      section h2 {
        background: var(--primarycol);
        color: white;
        padding: 6px 10px;
        font-size: 14px;
        margin: 0;
      }
      .section-content {
        padding: 10px 12px;
      }
      .field {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #e5e7eb;
      }
      .field:last-child { border-bottom: none; }
      .field label {
        font-weight: 600;
        color: var(--text-dark);
        min-width: 150px;
      }
      .field span {
        font-weight: 600;
        color: var(--text-dark);
        background: #fff;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1px solid #999;
        min-width: 100px;
        text-align: center;
      }
      .doc-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 8px;
      }
      .doc-box {
        border: 1px solid #999;
        border-radius: 6px;
        padding: 6px;
        background: #fff;
        text-align: center;
      }
      .doc-box label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #000;
        margin-bottom: 3px;
      }
      .doc-box span {
        font-weight: bold;
        font-size: 13px;
        color: #000;
      }
      .total {
        font-size: 14px;
        font-weight: bold;
        color: var(--primarycol);
        text-align: right;
        margin-top: 6px;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
        color: #000;
        font-weight: bold;
      }
      .signature-box {
        width: 45%;
        text-align: center;
        border-top: 2px solid #000;
        padding-top: 6px;
        font-size: 12px;
      }
      .actions {
        display: flex;
        justify-content: center;
        margin-top: 30px;
      }
      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        font-weight: 600;
        background: var(--primarycol);
        color: white;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: A4;
          margin: 15mm;
        }
        .actions { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <!-- ✅ Watermark -->
      <div class="watermark">
        ${
          organizationLogo
            ? `<img src="${organizationLogo}" alt="Logo">`
            : organizationName || 'ORGANISATION'
        }
      </div>

      <header>
        <div class="org-info">
          ${organizationLogo ? `<img src="${organizationLogo}" alt="Logo">` : ''}
          <h1>${organizationName || ''}</h1>
        </div>
        <div class="title">Contrat de Location</div>
      </header>

      <div class="info-bar">
        <div>Contrat: ${contract.rentContractId}</div>
        <div>Date: ${new Date().toLocaleDateString('fr-FR')}</div>
      </div>

      <div class="grid">
        <section>
          <h2>Locataire</h2>
          <div class="section-content">
            <div class="field"><label>Conducteur Principal:</label><span>${contract.customerFirstName} ${contract.customerLastName}</span></div>
            <div class="field"><label>Téléphone:</label><span>${contract.customerPhone || '...............'}</span></div>
            <div class="doc-grid">
              <div class="doc-box"><label>CIN</label><span>${contract.customerCIN || '...............'}</span></div>
              <div class="doc-box"><label>Passeport</label><span>${contract.customerPassport || '...............'}</span></div>
              <div class="doc-box"><label>Permis</label><span>${contract.customerDriverLicense || '...............'}</span></div>
            </div>
          </div>
        </section>

        <section>
          <h2>Véhicule</h2>
          <div class="section-content">
            <div class="field"><label>Modèle:</label><span>${contract.carMake} ${contract.carModel}</span></div>
            <div class="field"><label>Année:</label><span>${contract.carYear}</span></div>
            <div class="field"><label>Immatriculation:</label><span>${contract.carPlate}</span></div>
            <div class="field"><label>Couleur:</label><span>${contract.carColor || '...............'}</span></div>
            <div class="field"><label>Kilométrage départ:</label><span>${contract.carMileage || 0} km</span></div>
            <div class="field"><label>Carburant:</label><span>${contract.carFuelType || '...............'}</span></div>
          </div>
        </section>

        <section>
          <h2>Période</h2>
          <div class="section-content">
            <div class="field"><label>Date de réception:</label><span>${new Date(contract.startDate).toLocaleDateString('fr-FR')}</span></div>
            <div class="field"><label>Date prévue de retour:</label><span>${end.getFullYear() === 9999 ? 'Ouvert' : end.toLocaleDateString('fr-FR')}</span></div>
            <div class="field"><label>Durée:</label><span>${duree}</span></div>
            <div class="field"><label>Lieu de réception:</label><span>${organizationName || ''}</span></div>
          </div>
        </section>

        <section>
          <h2>Facturation</h2>
          <div class="section-content">
            <div class="field"><label>Prix par jour TTC:</label><span>${contract.pricePerDay} DH</span></div>
            <div class="field"><label>Dépôt:</label><span>${contract.deposit || 0} DH</span></div>
            <div class="field"><label>Garantie:</label><span>${contract.guarantee || 0} DH</span></div>
            <div class="total">Total TTC: ${contract.totalPrice || 0} DH</div>
          </div>
        </section>
      </div>

      <div class="signatures">
        <div class="signature-box">Lu et approuvé<br/>${organizationName || ''}</div>
        <div class="signature-box">Signature du Locataire</div>
      </div>

      <!-- ✅ Print button -->
      <div class="actions">
        <button class="btn" onclick="window.print()">🖨️ Imprimer le Contrat</button>
      </div>
    </div>
  </body>
  </html>
  `;
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

      // Optional: ensure images (e.g., organizationLogo) load if they’re remote
      // await page.waitForNetworkIdle({ idleTime: 300 });

      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
