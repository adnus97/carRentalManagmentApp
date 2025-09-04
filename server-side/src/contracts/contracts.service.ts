// src/contracts/contracts.service.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { RentsService } from '../rents/rents.service';
import { OrganizationService } from 'src/organization/organization.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly rentsService: RentsService,
    private readonly organizationService: OrganizationService,
  ) {}

  async generateContractPDF(rentId: string): Promise<Buffer> {
    const { data: contract } = await this.rentsService.getRentContract(rentId);

    // Fetch organization data using orgId from contract
    let organizationName = 'Société de Location'; // Generic fallback
    try {
      if (contract.orgId) {
        const org = await this.organizationService.findOne(contract.orgId);
        organizationName = org[0]?.name || 'Société de Location';
      }
    } catch (error) {
      console.warn('Could not fetch organization name:', error);
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header - Use organization name
        doc.fontSize(20).text(organizationName, 50, 50);
        doc.fontSize(12).text('Contrat de Location', 400, 50);

        // Contract details box - Use rentContractId instead of id
        doc.rect(50, 80, 500, 40).stroke();
        doc
          .fontSize(12)
          .text(`Loc: ${contract.rentContractId || contract.id}`, 60, 90);
        doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 60, 105);

        // Customer section (LOCATAIRE)
        let yPosition = 140;
        doc.fontSize(14).fillColor('#4472C4').text('LOCATAIRE', 50, yPosition);

        yPosition += 30;
        doc.fontSize(10).fillColor('black');
        doc.text('Conducteur Principal:', 50, yPosition);
        doc.text(
          `${contract.customerFirstName} ${contract.customerLastName}`,
          180,
          yPosition,
        );

        yPosition += 15;
        doc.text('CIN:', 50, yPosition);
        doc.text(`${contract.customerCIN || ''}`, 180, yPosition);

        yPosition += 15;
        doc.text('Téléphone:', 50, yPosition);
        doc.text(`${contract.customerPhone || ''}`, 180, yPosition);

        // Vehicle section (VÉHICULE)
        yPosition += 40;
        doc.fontSize(14).fillColor('#4472C4').text('VÉHICULE', 50, yPosition);

        yPosition += 30;
        doc.fontSize(10).fillColor('black');
        doc.text('Livraison véhicule:', 50, yPosition);
        doc.text(`${contract.carMake} ${contract.carModel}`, 180, yPosition);

        yPosition += 15;
        doc.text('Année:', 50, yPosition);
        doc.text(`${contract.carYear}`, 180, yPosition);

        yPosition += 15;
        doc.text('Immatriculation:', 50, yPosition);
        doc.text(`${contract.carPlate}`, 180, yPosition);

        yPosition += 15;
        doc.text('Couleur:', 50, yPosition);
        doc.text(`${contract.carColor || 'N/A'}`, 180, yPosition);

        yPosition += 15;
        doc.text('Kilométrage départ:', 50, yPosition);
        doc.text(`${contract.carMileage || 0} km`, 180, yPosition);

        // Rental period section
        yPosition += 30;
        doc.text('Date et heure de réception:', 50, yPosition);
        doc.text(
          `${new Date(contract.startDate).toLocaleDateString('fr-FR')}`,
          250,
          yPosition,
        );

        yPosition += 15;
        doc.text('Lieu de réception:', 50, yPosition);
        doc.text(organizationName, 250, yPosition);

        yPosition += 15;
        doc.text('Date et heure prévue de retour:', 50, yPosition);
        const endDate = contract.returnedAt || contract.expectedEndDate;
        doc.text(
          `${new Date(endDate).toLocaleDateString('fr-FR')}`,
          250,
          yPosition,
        );

        // Billing section (FACTURATION)
        yPosition += 40;
        doc
          .fontSize(14)
          .fillColor('#4472C4')
          .text('FACTURATION', 50, yPosition);

        yPosition += 30;
        doc.fontSize(10).fillColor('black');
        doc.text('Prix par jour TTC:', 50, yPosition);
        doc.text(`${contract.pricePerDay} DH`, 450, yPosition);

        yPosition += 15;
        doc.text('Dépôt:', 50, yPosition);
        doc.text(`${contract.deposit || 0} DH`, 450, yPosition);

        yPosition += 15;
        doc.text('Garantie:', 50, yPosition);
        doc.text(`${contract.guarantee || 0} DH`, 450, yPosition);

        yPosition += 15;
        doc.text('Prix TOTAL TTC:', 50, yPosition);
        doc.text(`${contract.totalPrice || 0} DH`, 450, yPosition);

        // Terms and conditions
        yPosition += 40;
        doc
          .fontSize(8)
          .text(
            'Conditions générales: Le locataire reconnaît avoir pris connaissance des conditions générales...',
            50,
            yPosition,
            { width: 500, align: 'justify' },
          );

        // Signatures - Use organization name
        yPosition += 60;
        doc.text('Lu et approuvé', 50, yPosition);
        doc.text('Signature du Locataire', 300, yPosition);

        yPosition += 40;
        doc.text(organizationName, 50, yPosition);
        doc.text('_________________', 300, yPosition);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

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
        --primary: #065f46; /* Dark green */
        --secondary: #f3f4f6;
        --text-dark: #000000;
        --text-light: #333333;
      }
      * { box-sizing: border-box; }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        margin: 0;
        padding: 0;
        background: white;
        color: var(--text-dark);
        font-size: 13px;
      }
      .page {
        width: 210mm;
        margin: auto;
        padding: 20mm;
        background: white;
        position: relative;
      }
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 3px solid var(--primary);
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
        color: var(--primary);
        margin: 0;
      }
      header .title {
        font-size: 18px;
        font-weight: bold;
        color: var(--text-dark); /* ✅ ensure visible */
      }
      .info-bar {
        display: flex;
        justify-content: space-between;
        background: var(--secondary);
        padding: 8px 12px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 14px;
        color: var(--text-dark); /* ✅ ensure visible */
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
        background: var(--primary);
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
        color: var(--text-dark); /* ✅ darker */
        min-width: 150px;
      }
      .field span {
        font-weight: 600;
        color: var(--text-dark);
        background: #fff;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1px solid #999; /* ✅ darker border */
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
        color: #000; /* ✅ black */
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
        color: var(--primary);
        text-align: right;
        margin-top: 6px;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
        color: #000; /* ✅ ensure visible */
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
        background: var(--primary);
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
        .actions { display: none; } /* ✅ hide print button in print */
      }
    </style>
  </head>
  <body>
    <div class="page">
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
}
