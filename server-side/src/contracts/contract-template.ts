export type ContractView = {
  rentContractId?: string | number;
  org?: {
    name?: string;
    logo?: string;
    address?: string;
    phone?: string;
    cnss?: string;
    ice?: string;
    rc?: string;
  };
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    cin?: string;
    passport?: string;
    driverLicense?: string;
    address?: string;
  };
  secondDriver?: {
    firstName?: string;
    lastName?: string;
    cin?: string;
    passport?: string;
    driverLicense?: string;
    address?: string;
  };
  car?: {
    make?: string;
    model?: string;
    plate?: string;
    year?: string | number;
    color?: string;
    fuel?: string;
    mileage?: number;
  };
  dates?: { start?: string | Date; end?: string | Date | null };
  prices?: { total?: number; deposit?: number };
  etat?: {
    gaugeUrl?: string;
    carTopUrl?: string;
  };
};

// Helper functions (kept exactly as in your logic)
const dots = (n = 15) => '.'.repeat(n);
const f = (v?: string | number, len = 14) =>
  v === undefined || v === null || v === '' ? dots(len) : String(v);
const money = (v?: number) =>
  typeof v === 'number' ? `${v.toLocaleString()} DH` : `0 DH`;
const toFR = (d?: string | Date) => {
  if (!d) return dots(10);
  const date = new Date(d);
  return isNaN(date.getTime()) ? dots(10) : date.toLocaleDateString('fr-FR');
};

export function buildCleanContractHTML(view: ContractView) {
  const orgName = view.org?.name || '';
  const orgLogo = view.org?.logo || '';
  const orgAddress = view.org?.address || '';
  const orgPhone = view.org?.phone || '';

  let dureeLabel = '........';
  if (view.dates?.start && view.dates?.end) {
    const s = new Date(view.dates.start).getTime();
    const e = new Date(view.dates.end).getTime();
    if (!isNaN(s) && !isNaN(e)) {
      const diffDays = Math.max(1, Math.ceil((e - s) / 86400000));
      dureeLabel = `${diffDays} jour(s)`;
    }
  }

  // --- SECOND PAGE CONTENT (UNTOUCHED) ---
  const CONDITIONS = `
  <div class="terms-wrapper">
    <div class="preamble">
      <strong>PRÉAMBULE:</strong> Le présent contrat a été établi et prend date comme indiqué au verso. 
      Il engage l'agence qui sera appelée <em>le loueur</em> et la personne, société ou compagnie par qui est signé ce contrat, 
      qui sera dénommée <em>le locataire</em>.
    </div>

    <div class="terms-columns">
      <div class="term-block">
        <h5>ARTICLE 1 : UTILISATION DE LA VOITURE</h5>
        <p>Le locataire s'engage à ne pas laisser conduire la voiture par d'autres personnes que lui-même ou celles agréées par le loueur et dont il se porte garant, et à n'utiliser le véhicule que pour ses besoins personnels. Il est interdit de participer à toute compétition quelle qu'elle soit et d'utiliser le véhicule à des fins illicites ou pour des transports de marchandises ; le locataire s'engage à ne pas solliciter directement des documents douaniers. Il est interdit au locataire de surcharger le véhicule loué en transportant un nombre de passagers supérieur à celui porté sur le contrat, sous peine d'être déchu de l'assurance.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 2 : PAS D'ANNULATION</h5>
        <p>Pas de remboursement en cas de problèmes personnels ni pour l'essence. Tout ce qui est pneumatique est à la charge du client ; les voitures doivent être garées dans les parkings payants avec gardiens. Le vol de pneu de secours est à la charge du CLIENT. Le procès-verbal d'excès de vitesse est à la charge du client.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 3 : ESSENCE ET HUILE</h5>
        <p>L'essence est à la charge du client. Le locataire doit vérifier en permanence les niveaux d'huile et d'eau, et vérifier les niveaux de la boîte de vitesse et du pont arrière tous les 1000 km. Il justifiera les dépenses correspondantes (qui lui seront remboursées) sous peine d'avoir à payer une indemnité pour usure anormale.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 4 : ENTRETIEN ET RÉPARATION</h5>
        <p>L'usure mécanique normale est à la charge du loueur. Toutes les réparations provenant soit d'une usure anormale, soit d'une négligence de la part du locataire ou d'une cause accidentelle, seront à sa charge et exécutées par nos soins. Dans le cas où le véhicule serait immobilisé en dehors de la région, les réparations, qu'elles soient dues à l'usure normale ou à une cause accidentelle, ne seront exécutées qu'après accord télégraphique du loueur ou par l'agent régional de la marque du véhicule. Elles devront faire l'objet d'une facture acquittée. En aucun cas et en aucune circonstance, le locataire ne pourra réclamer des dommages et intérêts, soit par retard de la remise de la voiture, ou annulation de la location, soit pour immobilisation dans le cas de réparations nécessaires par l'usure normale et effectuées au cours de la location. La responsabilité du loueur ne pourra jamais être invoquée, même en cas d'accidents de personnes ou de choses ayant résulté de vices ou de défauts de construction ou de réparations antérieures.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 5 : ASSURANCE</h5>
        <p>Le locataire est garanti pour les risques suivants :</p>
        <ul>
          <li>Pour une somme illimitée pour les accidents qu'il peut causer aux tiers, y compris those transportés à titre gracieux.</li>
          <li>Contre le vol et l'incendie du véhicule loué, à l'exclusion des vêtements et de tous les objets transportés.</li>
        </ul>
        <p>Les frais de rapatriement et d'immobilisation restent toujours à la charge du locataire, quelle que soit la formule d'assurance contractée.</p>
        <p>Le locataire s'engage à déclarer au loueur, dans les 48 heures, et immédiatement aux autorités de police, tout accident, vol ou incendie même partiel sous peine d'être déchu du bénéfice de l'assurance. Sa déclaration devra obligatoirement mentionner les circonstances, la date, le lieu et l'heure, le numéro ou le nom de l'agent, le nom et l'adresse des témoins ainsi que le numéro de la voiture adverse. S'il y a lieu, il joindra à cette déclaration tout rapport de police, de gendarmerie ou constat d'huissier s'il en a été établi. Il ne devra en aucun cas discuter la responsabilité ni traiter ou transiger avec les tiers relativement à l'accident. Il paiera une indemnité de chômage de la voiture pendant toute la durée d'immobilisation provenant d'usure anormale ou d'accident.</p>
        <p>La voiture n'est assurée que pour la durée de la location. Le loueur décline toute responsabilité for les accidents que le locataire aurait pu causer et dont il devra faire son affaire personnelle. Enfin, il n'y a pas d'assurance pour tout conducteur non muni d'un permis en état de validité ou d'un permis datant de moins de 1 an. Le loueur décline toute responsabilité pour les accidents routiers ou dégâts à la voiture que le locataire pourrait causer pendant la période de location si le locataire a délibérément fourni au loueur des informations fausses concernant son identité, son adresse ou la validité de son permis de conduire.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 6 : LOCATION - CAUTION - PROLONGATION</h5>
        <p>Le prix de location, ainsi que la caution, sont déterminés par les tarifs en vigueur et payables d'avance. La caution ne pourra servir en aucun cas au loueur à faire parvenir le montant de la location en cours, sous peine de refus de prolongation de location. Afin d'éviter toute contestation et pour le cas où le locataire voudrait conserver la voiture pour un temps supérieur à celui indiqué sur le contrat, il devra obtenir l'accord du loueur sous peine de s'exposer à des poursuites pour détournement de voiture ou abus de confiance. La journée de location compte de 10 heures à 24 heures et toute journée commencée est due en entier.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 7 : JURIDICTION</h5>
        <p>De convention expresse, en cas de litige, le tribunal compétent sera le tribunal de commerce de Casablanca.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 8 : PIÈCES À FOURNIR EN CAS D'ACCIDENT</h5>
        <ul>
          <li>Procès-verbal de la police ou de la gendarmerie royale ou le représentant de la justice. S'il s'agit de constat amiable, le constat bien rempli.</li>
          <li>Photos de tous les papiers (la carte grise, assurance et permis de conduire...) de la partie adverse.</li>
          <li>Photos de la carte verte si le véhicule est non dédouané ou étranger.</li>
        </ul>
      </div>

      <div class="term-block">
        <h5>ARTICLE 9 : RESPONSABILITÉ</h5>
        <p>Le locataire demeure seul responsable des vols des pièces automobiles, amendes, contraventions et procès-verbaux établis contre lui.</p>
      </div>

      <div class="term-block">
        <h5>ARTICLE 10 : COMPÉTENCE</h5>
        <p>De convention expresse et en cas de contestation quelconque, le tribunal de Marrakech sera seul compétent, les frais de timbres et d'enregistrement restant à la charge du locataire.</p>
      </div>
      
      <div class="term-block">
        <h5>ARTICLE 11 : KILOMÉTRAGE</h5>
        <p>Le kilométrage limité est de 200 km par jour. Si le conducteur dépasse cette exigence, il paie un dirham par kilomètre.</p>
      </div>

      <div class="term-block cancellation-box">
        <h5>CONDITIONS D'ANNULATION</h5>
        <ul>
          <li><strong>Jusqu'à 48h avant l'arrivée :</strong> sans frais.</li>
          <li><strong>Jusqu'à 24h avant l'arrivée :</strong> 30% du montant total.</li>
          <li><strong>No Show ou départ anticipé :</strong> 50% du montant.</li>
        </ul>
      </div>
    </div>
  </div>
  `;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Contrat ${f(view.rentContractId)}</title>
  <style>
    :root {
      --primary: #0f172a;
      --secondary: #334155;
      --accent: #0f172a;
      --border: #cbd5e1;
      --light-bg: #f8fafc;
      --alert-bg: #fef2f2;
      --alert-text: #b91c1c;
      --white: #ffffff;
      --font-stack: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    html, body {
      height: 100%;
      font-family: var(--font-stack);
      color: var(--primary);
      font-size: 11px;
      background: #fff;
    }

    .sheet {
      width: 210mm;
      margin: 0 auto;
      background: var(--white);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 10mm;
      page-break-after: always;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .row { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
    .col { display: flex; flex-direction: column; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
    .w-full { width: 100%; }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6mm;
      border-bottom: 2px solid var(--primary);
      padding-bottom: 4mm;
    }
    .brand { display: flex; align-items: center; gap: 4mm; }
    .brand img { height: 45px; width: auto; max-width: 100px; object-fit: contain; }
    .org-details h1 { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
    .org-details p { font-size: 10px; color: var(--secondary); line-height: 1.3; }
    
    .contract-meta { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 900; letter-spacing: 1px; color: var(--primary); }
    .contract-id { 
      background: var(--primary); 
      color: var(--white); 
      padding: 2px 8px; 
      border-radius: 4px; 
      font-weight: 700; 
      font-size: 12px;
      display: inline-block;
      margin-top: 4px;
    }

    .alert-box {
      border: 1px solid var(--alert-text);
      background: var(--alert-bg);
      color: var(--alert-text);
      padding: 3mm;
      border-radius: 4px;
      text-align: center;
      margin-bottom: 5mm;
    }
    .alert-title { font-weight: 800; font-size: 11px; text-transform: uppercase; margin-bottom: 2px; }
    .alert-text { font-size: 9px; font-weight: 600; line-height: 1.2; }

    .status-bar {
      display: flex;
      justify-content: space-between;
      background: var(--light-bg);
      border: 1px solid var(--border);
      padding: 2mm 4mm;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
      margin-bottom: 5mm;
      color: var(--secondary);
    }

    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--secondary);
      border-bottom: 1px solid var(--border);
      padding-bottom: 2px;
      margin-bottom: 3mm;
      margin-top: 1mm;
    }

    .field-group { 
      margin-bottom: 6px; /* Added small margin between lines */
      display: flex; 
      align-items: center; 
    }
    .label { 
      width: 26mm; 
      flex-shrink: 0; 
      font-size: 9px; 
      font-weight: 700; 
      color: var(--secondary);
      text-transform: uppercase;
    }
    .value { 
      flex-grow: 1; 
      border-bottom: 1px solid var(--border); 
      padding: 1px 0 1px 4px; 
      font-weight: 600; 
      font-size: 10.5px; 
      min-height: 16px;
      color: var(--primary);
    }
    .value.box {
      border: 1px solid var(--border);
      border-radius: 3px;
      background: var(--light-bg);
      padding: 2px 6px;
    }
  .value.plate {
    unicode-bidi: plaintext;
    text-align: center;
  }
    .vehicle-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 8mm;
      row-gap: 2px;
    }
    
    .bottom-layout {
      display: grid;
      grid-template-columns: 40% 60%;
      gap: 6mm;
      margin-top: 2mm;
    }
    
    .finance-card {
      background: var(--light-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 3mm;
    }
    .finance-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      align-items: center;
    }
    .finance-row.total {
      margin-top: 2mm;
      border-top: 1px dashed var(--border);
      padding-top: 2mm;
      font-weight: 800;
    }
    
    .etat-container {
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2mm;
    }
    .etat-headers {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      font-weight: 800;
      color: var(--secondary);
      margin-bottom: 2mm;
      padding: 0 10mm;
    }
    .etat-visuals {
      display: flex;
      flex-direction: column;
      gap: 3mm;
    }
    .etat-row {
      display: flex;
      justify-content: space-between;
      gap: 4mm;
    }
    .etat-box {
      flex: 1;
      height: 22mm;
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .etat-box img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }

    .footer-section {
      margin-top: auto;
      padding-top: 2mm;
    }
    .terms-ack {
      font-size: 9px;
      text-align: center;
      margin-bottom: 3mm;
      font-weight: 600;
      font-style: italic;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4mm;
      margin-bottom: 4mm;
    }
    .sig-box {
      border: 1px solid var(--primary);
      height: 25mm;
      border-radius: 4px;
      position: relative;
    }
    .sig-label {
      background: var(--primary);
      color: var(--white);
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 0;
      text-align: center;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
    }

    .legal-footer {
      text-align: center;
      font-size: 9px;
      color: #64748b;
      border-top: 1px solid var(--border);
      padding-top: 2mm;
    }

    .cond-title {
      font-weight: 900;
      font-size: 17px;
      text-align: center;
      margin-bottom: 5mm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 3px solid var(--primary);
      padding-bottom: 2mm;
    }
    .terms-wrapper { font-size: 7.8px; line-height: 1.35; color: #334155; text-align: justify; }
    .terms-columns { column-count: 3; column-gap: 5mm; column-rule: 1px solid #e2e8f0; width: 100%; }
    .term-block { margin-bottom: 3mm; break-inside: avoid; }
    .term-block h5 { font-size: 8.5px; font-weight: 800; color: #0f172a; margin-bottom: 1mm; text-transform: uppercase; }
    .term-block p { margin-bottom: 1mm; }
    .term-block ul { padding-left: 3mm; margin-bottom: 1mm; }
    .term-block li { margin-bottom: 0.5mm; list-style-type: disc; }
    .cancellation-box { border: 1px solid var(--primary); border-radius: 2mm; padding: 2mm; background-color: #f8fafc; break-inside: avoid; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
      .sheet { box-shadow: none; margin: 0; width: 100%; }
      .page { margin: 0; border: none; padding: 5mm; height: auto; page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="sheet">

    <section class="page">
      
      <div class="header">
        <div class="brand">
          ${orgLogo ? `<img src="${orgLogo}" alt="logo" />` : ''}
          <div class="org-details">
            <h1>${orgName || 'AGENCE DE LOCATION'}</h1>
            <p>${f(orgAddress, 50)}</p>
            <p>Tél: ${f(orgPhone, 14)}</p>
          </div>
        </div>
        <div class="contract-meta">
          <div class="doc-title">CONTRAT DE LOCATION</div>
          <div class="contract-id">N° ${f(view.rentContractId, 6)}</div>
        </div>
      </div>

      <div class="alert-box">
        <div class="alert-title">⚠️ Information Importante / Important Notice</div>
        <div class="alert-text">
          Tout procès verbal pour infraction du code de la route daté de la période de location sera supporté par le locataire.
          Vos coordonnées seront communiquées aux autorités compétentes.
        </div>
      </div>

      <div class="status-bar">
        <span>✅ Agence Ouverte 7j/7</span>
        <span>📞 Assistance 24h/24</span>
        <span>📍 Retour: ${f(orgName, 20)}</span>
      </div>

      <div class="grid-2">
        <div>
          <div class="section-title">Conducteur Principal (Locataire)</div>
          <div class="field-group"><div class="label">Nom/Prénom</div><div class="value box">${f(view.customer?.firstName)} ${f(view.customer?.lastName)}</div></div>
          <div class="field-group"><div class="label">Téléphone</div><div class="value">${f(view.customer?.phone)}</div></div>
          <div class="field-group"><div class="label">CIN/Pass</div><div class="value">${view.customer?.cin || view.customer?.passport || dots(15)}</div></div>
          <div class="field-group"><div class="label">Permis N°</div><div class="value">${f(view.customer?.driverLicense)}</div></div>
          <div class="field-group"><div class="label">Adresse</div><div class="value" style="font-size:9px">${f(view.customer?.address, 40)}</div></div>
        </div>

        <div>
          <div class="section-title">Deuxième Conducteur</div>
          <div class="field-group"><div class="label">Nom/Prénom</div><div class="value box">${f(view.secondDriver?.firstName)} ${f(view.secondDriver?.lastName)}</div></div>
          <div class="field-group"><div class="label">Téléphone</div><div class="value">${dots(14)}</div></div>
          <div class="field-group"><div class="label">CIN/Pass</div><div class="value">${view.secondDriver?.cin || view.secondDriver?.passport || dots(15)}</div></div>
          <div class="field-group"><div class="label">Permis N°</div><div class="value">${f(view.secondDriver?.driverLicense)}</div></div>
          <div class="field-group"><div class="label">Adresse</div><div class="value" style="font-size:9px">${f(view.secondDriver?.address, 40)}</div></div>
        </div>
      </div>

      <div style="margin-top: 4mm;">
        <div class="section-title">Informations du Véhicule</div>
        <div class="vehicle-grid">
          <div class="field-group"><div class="label">Marque / Modèle</div><div class="value box">${f(view.car?.make)} ${f(view.car?.model)}</div></div>
         <div class="field-group">
  <div class="label">Immatriculation</div>
  <div class="value box" style="text-align:center; font-size: 12px; letter-spacing: 2px;">
    ${
      view.car?.plate
        ? view.car.plate
            .split('-')
            .map(
              (part: string) =>
                `<span style="display: inline-block; direction: ltr; unicode-bidi: isolate;">${part}</span>`,
            )
            .join(' | ')
        : dots(15)
    }
  </div>
</div>
          <div class="field-group"><div class="label">Année</div><div class="value">${f(view.car?.year)}</div></div>
          <div class="field-group"><div class="label">Couleur</div><div class="value">${f(view.car?.color)}</div></div>
          
          <div class="field-group"><div class="label">Carburant</div><div class="value">${f(view.car?.fuel)}</div></div>
          <div class="field-group"><div class="label">Kilométrage départ</div><div class="value">${f(view.car?.mileage)} KM</div></div>
          
          <div class="field-group"><div class="label">Date de réception</div><div class="value">${toFR(view.dates?.start)}</div></div>
          <div class="field-group"><div class="label">Date retour</div><div class="value">${view.dates?.end ? toFR(view.dates?.end) : 'OUVERT'}</div></div>
          
          <div class="field-group"><div class="label">Prolongation (1)</div><div class="value">${dots(15)}</div></div>
          <div class="field-group"><div class="label">Prolongation (2)</div><div class="value">${dots(15)}</div></div>
        </div>
      </div>

      <div class="bottom-layout">
        <div class="finance-card">
          <div class="finance-row"><span class="label">Total</span> <span>${money(view.prices?.total)}</span></div>
          <div class="finance-row"><span class="label">Avance</span> <span>${money(view.prices?.deposit)}</span></div>
          <div class="finance-row"><span class="label">Reste</span> <span>${money(Math.max(0, (view.prices?.total || 0) - (view.prices?.deposit || 0)))}</span></div>
          <div class="finance-row"><span class="label">Franchise</span> <span>${dots(12)}</span></div>
          
          <div class="finance-row total" style="margin-top:4mm">
            <span class="label">DURÉE</span>
            <span>${dureeLabel}</span>
          </div>
          <div class="finance-row"><span class="label">Livé par</span> <span>${dots(15)}</span></div>
        </div>

        <div class="etat-container">
          <div class="etat-headers">
            <span>AVANT</span>
            <span>APRÈS</span>
          </div>
          <div class="etat-visuals">
            <div class="etat-row">
              <div class="etat-box"><img src="${view.etat?.gaugeUrl || ''}" alt="Jauge D" /></div>
              <div class="etat-box"><img src="${view.etat?.gaugeUrl || ''}" alt="Jauge R" /></div>
            </div>
            <div class="etat-row">
              <div class="etat-box"><img src="${view.etat?.carTopUrl || ''}" alt="Car D" /></div>
              <div class="etat-box"><img src="${view.etat?.carTopUrl || ''}" alt="Car R" /></div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-section">
        <div class="terms-ack">
          * Je reconnais avoir pris connaissance des conditions générales de location au verso et j'accepte de m'y conformer.
        </div>
        
        <div class="signatures-grid">
          <div class="sig-box"><div class="sig-label">Agence (Cachet)</div></div>
          <div class="sig-box"><div class="sig-label">Client (Lu et approuvé)</div></div>
          <div class="sig-box"><div class="sig-label">2ème Conducteur</div></div>
        </div>

        <div class="legal-footer">
          <strong>Siège:</strong> ${f(orgAddress, 40)} &bull; 
          <strong>ICE:</strong> ${f(view.org?.ice, 12)} &bull; 
          <strong>RC:</strong> ${f(view.org?.rc, 10)} &bull; 
          <strong>CNSS:</strong> ${f(view.org?.cnss, 10)}
        </div>
      </div>
      
    </section>

    <section class="page">
      <div class="cond-title">Conditions Générales de Location</div>
      ${CONDITIONS}
    </section>

  </div>
</body>
</html>
  `;
}
