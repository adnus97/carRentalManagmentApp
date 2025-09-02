// src/contracts/contracts.service.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { RentsService } from '../rents/rents.service';

@Injectable()
export class ContractsService {
  constructor(private readonly rentsService: RentsService) {}

  async generateContractPDF(rentId: string): Promise<Buffer> {
    const { data: contract } = await this.rentsService.getRentContract(rentId);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('MIFA CAR', 50, 50);
        doc.fontSize(12).text('Contrat de Location', 400, 50);

        // Contract details box
        doc.rect(50, 80, 500, 40).stroke();
        doc.fontSize(12).text(`Loc: ${contract.id}`, 60, 90);
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
        doc.text(`${contract.customerIdCard || ''}`, 180, yPosition);

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
        doc.text('MIFA CAR', 250, yPosition);

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

        // Signatures
        yPosition += 60;
        doc.text('Lu et approuvé', 50, yPosition);
        doc.text('Signature du Locataire', 300, yPosition);

        yPosition += 40;
        doc.text('MIFA CAR', 50, yPosition);
        doc.text('_________________', 300, yPosition);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async getContractHTML(rentId: string): Promise<string> {
    const { data: contract } = await this.rentsService.getRentContract(rentId);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Contrat de Location - ${contract.id}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #4472C4; padding-bottom: 10px; }
            .company-name { font-size: 24px; font-weight: bold; color: #4472C4; }
            .contract-title { font-size: 18px; color: #4472C4; }
            .contract-info { border: 1px solid #ccc; padding: 10px; margin: 20px 0; background: #f9f9f9; }
            .section { margin: 20px 0; }
            .section-title { background: #4472C4; color: white; padding: 8px; font-weight: bold; }
            .field-row { display: flex; margin: 5px 0; }
            .field-label { width: 200px; font-weight: bold; }
            .field-value { flex: 1; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .signature-box { text-align: center; width: 200px; }
            @media print { 
                body { margin: 0; } 
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-name">MIFA CAR</div>
            <div class="contract-title">Contrat de Location</div>
        </div>
        
        <div class="contract-info">
            <strong>Loc:</strong> ${contract.id} &nbsp;&nbsp;&nbsp;
            <strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}
        </div>

        <div class="section">
            <div class="section-title">LOCATAIRE</div>
            <div class="field-row">
                <div class="field-label">Conducteur Principal:</div>
                <div class="field-value">${contract.customerFirstName} ${contract.customerLastName}</div>
            </div>        
            <div class="field-row">
                <div class="field-label">CIN:</div>
                <div class="field-value">${contract.customerIdCard || ''}</div>
            </div>
            <div class="field-row">
                <div class="field-label">Téléphone:</div>
                <div class="field-value">${contract.customerPhone || ''}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">VÉHICULE</div>
            <div class="field-row">
                <div class="field-label">Livraison véhicule:</div>
                <div class="field-value">${contract.carMake} ${contract.carModel}</div>
            </div>
            <div class="field-row">
                <div class="field-label">Année:</div>
                <div class="field-value">${contract.carYear}</div>
            </div>
            <div class="field-row">
                <div class="field-label">Immatriculation:</div>
                <div class="field-value">${contract.carPlate}</div>
            </div>
            <div class="field-row">
                <div class="field-label">Couleur:</div>
                <div class="field-value">${contract.carColor || 'N/A'}</div>
            </div>
            <div class="field-row">
                <div class="field-label">Kilométrage départ:</div>
                <div class="field-value">${contract.carMileage || 0} km</div>
            </div>
            <div class="field-row">
                <div class="field-label">Date de réception:</div>
                <div class="field-value">${new Date(contract.startDate).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="field-row">
                <div class="field-label">Date prévue de retour:</div>
                <div class="field-value">${new Date(contract.returnedAt || contract.expectedEndDate).toLocaleDateString('fr-FR')}</div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">FACTURATION</div>
            <div class="field-row">
                <div class="field-label">Prix par jour TTC:</div>
                <div class="field-value">${contract.pricePerDay} DH</div>
            </div>
            <div class="field-row">
                <div class="field-label">Dépôt:</div>
                <div class="field-value">${contract.deposit || 0} DH</div>
            </div>
            <div class="field-row">
                <div class="field-label">Garantie:</div>
                <div class="field-value">${contract.guarantee || 0} DH</div>
            </div>
            <div class="field-row">
                <div class="field-label"><strong>Prix TOTAL TTC:</strong></div>
                <div class="field-value"><strong>${contract.totalPrice || 0} DH</strong></div>
            </div>
        </div>

        <div class="signatures">
            <div class="signature-box">
                <p>Lu et approuvé</p>
                <br><br>
                <p>MIFA CAR</p>
            </div>
            <div class="signature-box">
                <p>Signature du Locataire</p>
                <br><br>
                <p>_________________</p>
            </div>
        </div>

        <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4472C4; color: white; border: none; cursor: pointer;">
                Imprimer
            </button>
        </div>
    </body>
    </html>
    `;
  }
}
