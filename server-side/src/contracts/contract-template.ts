// src/contracts/contract-template-clean.ts
export type ContractView = {
  rentContractId?: string | number;
  org?: { name?: string; logo?: string; address?: string; phone?: string };
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
};

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

  const startLabel = toFR(view.dates?.start);
  let endLabel = 'Ouvert';
  if (view.dates?.end) endLabel = toFR(view.dates.end);

  let duree = '........';
  if (view.dates?.start && view.dates?.end) {
    const s = new Date(view.dates.start).getTime();
    const e = new Date(view.dates.end).getTime();
    if (!isNaN(s) && !isNaN(e)) {
      const diffDays = Math.max(1, Math.ceil((e - s) / 86400000));
      duree = `${diffDays} jour(s)`;
    }
  }

  const reste =
    typeof view.prices?.total === 'number' &&
    typeof view.prices?.deposit === 'number'
      ? Math.max(0, view.prices.total - view.prices.deposit)
      : 0;

  const CONDITIONS = `
  <div class="article">
    <p>Le présent contrat est établi et prend effet à la date indiquée au verso.
    Il engage l’agence, ci‑après « le Loueur », et la personne physique ou
    morale signataire, ci‑après « le Locataire ».</p>
  </div>
  <div class="article"><h4>Article 1 — Utilisation du véhicule</h4>
    <ul>
      <li>Conduite par le Locataire et/ou conducteurs nommés, permis valide.</li>
      <li>Usage personnel uniquement; interdits: compétitions, transport rémunéré,
      surcharge, frontières non autorisées, toute infraction au Code de la route.</li>
      <li>Nombre de passagers ≤ carte grise.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 2 — Annulation et pneumatiques</h4>
    <ul>
      <li>Pas de remboursement en cas d’annulation pour motif personnel.</li>
      <li>Carburant non remboursable.</li>
      <li>Pneus, jantes, enjoliveurs à la charge du Locataire (y compris vol).</li>
      <li>Stationnement dans parkings gardés lorsque possible.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 3 — Carburant et niveaux</h4>
    <ul>
      <li>Carburant à la charge du Locataire.</li>
      <li>Vérifier huile et liquide de refroidissement.</li>
      <li>Nettoyage courant à la charge du Locataire.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 4 — Entretien et réparations</h4>
    <ul>
      <li>Usure mécanique normale: à la charge du Loueur.</li>
      <li>Réparations suite à négligence/mauvaise utilisation/accident: Locataire.</li>
      <li>Accident/panne immobilisante: prévenir immédiatement le Loueur.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 5 — Assurance et sinistres</h4>
    <ul>
      <li>Garanties: RC obligatoire (tiers/passagers), vol et incendie (hors objets/effets).</li>
      <li>À charge du Locataire: immobilisation et rapatriement du véhicule.</li>
      <li>Déclaration sous 48h à la police/gendarmerie et au Loueur; constat amiable si possible.</li>
      <li>Franchise selon recto en cas d’accident responsable ou sans tiers identifié.</li>
      <li>Exclus: pneus, jantes, enjoliveurs, vitrages, accessoires, objets transportés.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 6 — Permis, responsabilité</h4>
    <ul>
      <li>Permis valide requis (ancienneté minimale si exigée par le Loueur).</li>
      <li>Responsabilité du Locataire si conduite sans permis valide ou infos fausses.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 7 — Caution, durée, prolongation</h4>
    <ul>
      <li>Restitution à la date/heure prévues.</li>
      <li>Prolongation: accord préalable du Loueur.</li>
      <li>Toute journée commencée est due.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 8 — Pièces à fournir en cas d’accident</h4>
    <ul>
      <li>PV police/gendarmerie ou constat amiable; photos des lieux/dégâts.</li>
      <li>Papiers du véhicule adverse (carte grise, assurance, permis), le cas échéant.</li>
    </ul>
  </div>
  <div class="article"><h4>Article 9 — Amendes</h4>
    <p>Le Locataire est seul responsable des amendes et contraventions durant la location.</p>
  </div>
  <div class="article"><h4>Article 10 — Compétence judiciaire</h4>
    <p>Tribunal de commerce de Casablanca (ou juridiction locale stipulée au recto).</p>
  </div>
  <div class="article"><h4>Article 11 — Kilométrage</h4>
    <ul>
      <li>Forfait 200 km/jour inclus sauf mention contraire.</li>
      <li>Au‑delà: facturation au tarif indiqué au recto.</li>
    </ul>
  </div>
  <div class="article"><h4>Conditions d’annulation</h4>
    <ul>
      <li>≤ 48 h: sans frais.</li>
      <li>≤ 24 h: 50 % du montant total.</li>
      <li>No‑show / départ anticipé: 50 % du montant total.</li>
    </ul>
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
  :root{
    --ink:#0f172a; --muted:#475569; --line:#cbd5e1; --chip:#f8fafc; --band:#111827;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{height:100%;font-family:Inter,Segoe UI,Arial,sans-serif;color:var(--ink);font-size:11.5px;background:#f5f7fb}
  .sheet{width:210mm;margin:0 auto;background:#fff}
  .page{width:210mm;height:281mm;padding:9mm;page-break-after:always;position:relative}

  .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:5mm}
  .brand{display:flex;align-items:center;gap:4mm}
  .brand img{height:36px;width:auto;border-radius:6px}
  .org h1{font-size:13px}
  .org small{display:block;font-size:10px;color:var(--muted)}
  .title{font-weight:800;letter-spacing:.4px;font-size:15px;text-align:center;flex:1}
  .nr{border:1px solid var(--ink);padding:1.6mm 3mm;border-radius:4mm;font-weight:800;background:#fff}

  .band{background:var(--band);color:#fff;font-weight:800;padding:1.6mm 3mm;border-radius:3mm;margin:3mm 0 2mm}
  .card{border:1px solid var(--line);border-radius:3mm;background:#fff;padding:3mm}
  .row{display:grid;grid-template-columns:32mm 1fr;gap:2mm;align-items:center;margin:1.6mm 0}
  .label{font-weight:700}
  .inp{border:1px solid var(--line);background:var(--chip);padding:1mm 1.6mm;border-radius:2mm;font-weight:600}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm}

  .totals{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
  .totals .row{grid-template-columns:24mm 1fr;margin:1.2mm 0}

  .checklist{border:1px solid var(--line);border-radius:3mm;background:#fff;padding:3mm}
  .check-title{font-weight:800;text-align:center;margin-bottom:2mm}
  .fuelGrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm;align-items:center}
  .gauge{border:1.4px solid var(--ink);border-bottom-left-radius:36mm;border-bottom-right-radius:36mm;border-top:none;height:18mm;position:relative}
  .gauge:after{content:"";position:absolute;left:50%;bottom:0;width:1.4px;height:16mm;background:var(--ink);transform:translateX(-50%) rotate(18deg);transform-origin:bottom center}
  .glevel{display:flex;justify-content:space-between;font-size:9.5px;font-weight:700;margin-top:1mm}
  .sketch{border:1px dashed var(--line);border-radius:2mm;height:36mm;background:#fafafa;display:flex;align-items:center;justify-content:center;font-size:10px}

  .signs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm;margin-top:3mm}
  .sign{border:1px solid var(--line);border-radius:12mm;padding:2.4mm;text-align:center;background:#fff;font-weight:700}

  .footer{margin-top:3mm;font-size:9.8px;text-align:center;color:var(--muted)}
  .wm{position:absolute;inset:auto 0 8mm 0;text-align:center;opacity:.06;font-weight:900;font-size:40px;letter-spacing:2px}

  .cond-title{font-weight:900;font-size:15px;text-align:center;margin-bottom:4mm}
  .article{margin-bottom:3mm}
  .article h4{font-size:12px;margin-bottom:1mm}
  .article p,.article li{font-size:11px;line-height:1.34}
  .article ul{padding-left:4mm;display:grid;row-gap:.6mm}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff}
    @page{size:A4;margin:9mm}
  }
</style>
</head>
<body>
<div class="sheet">

  <!-- PAGE 1: All operational info -->
  <section class="page">
    <div class="header">
      <div class="brand">
        ${orgLogo ? `<img src="${orgLogo}" alt="logo" />` : ''}
        <div class="org">
          <h1>${orgName || ''}</h1>
          <small>${f(orgAddress, 40)} • ${f(orgPhone, 14)}</small>
        </div>
      </div>
      <div class="title">CONTRAT DE LOCATION</div>
      <div class="nr">Nr ${f(view.rentContractId, 6)}</div>
    </div>

    <div class="card" style="margin-bottom:3mm">
      <div class="grid-3">
        <small>Respectez le code de la route</small>
        <small style="text-align:center">7j/7 Ouvert</small>
        <small style="text-align:right">Lieu de retour: ${f(orgName, 16)}</small>
      </div>
    </div>

    <div class="band">LOCATAIRE</div>
    <div class="card">
      <div class="grid-2">
        <div class="row"><div class="label">Nom / Prénom</div><div class="inp">${f(view.customer?.firstName)} ${f(view.customer?.lastName)}</div></div>
        <div class="row"><div class="label">Téléphone</div><div class="inp">${f(view.customer?.phone)}</div></div>
        <div class="row"><div class="label">CIN (Passeport)</div><div class="inp">${f(view.customer?.cin || view.customer?.passport)}</div></div>
        <div class="row"><div class="label">Permis N°</div><div class="inp">${f(view.customer?.driverLicense)}</div></div>
        <div class="row" style="grid-column:1 / span 2"><div class="label">Adresse</div><div class="inp">${f(view.customer?.address, 46)}</div></div>
      </div>
    </div>

    <div class="band">2ème CONDUCTEUR</div>
    <div class="card">
      <div class="grid-2">
        <div class="row"><div class="label">Nom</div><div class="inp">${f(view.secondDriver?.lastName)}</div></div>
        <div class="row"><div class="label">Prénom</div><div class="inp">${f(view.secondDriver?.firstName)}</div></div>
        <div class="row"><div class="label">CIN (Passeport)</div><div class="inp">${f(view.secondDriver?.cin || view.secondDriver?.passport)}</div></div>
        <div class="row"><div class="label">Permis N°</div><div class="inp">${f(view.secondDriver?.driverLicense)}</div></div>
        <div class="row" style="grid-column:1 / span 2"><div class="label">Adresse</div><div class="inp">${f(view.secondDriver?.address, 46)}</div></div>
      </div>
    </div>

    <div class="band">INFORMATIONS SUR VÉHICULE</div>
    <div class="card">
      <div class="grid-2">
        <div class="row"><div class="label">Marque / Modèle</div><div class="inp">${f(view.car?.make)} ${f(view.car?.model)}</div></div>
        <div class="row"><div class="label">Immatriculation</div><div class="inp">${f(view.car?.plate)}</div></div>

        <div class="row"><div class="label">Année</div><div class="inp">${f(view.car?.year)}</div></div>
        <div class="row"><div class="label">Couleur</div><div class="inp">${f(view.car?.color)}</div></div>

        <div class="row"><div class="label">Carburant</div><div class="inp">${f(view.car?.fuel)}</div></div>
        <div class="row"><div class="label">Kilométrage départ</div><div class="inp">${f(view.car?.mileage)} km</div></div>

        <div class="row"><div class="label">Date de réception</div><div class="inp">${startLabel}</div></div>
        <div class="row"><div class="label">Date retour</div><div class="inp">${endLabel}</div></div>

        <div class="row"><div class="label">Prolongation (1)</div><div class="inp">${dots(18)}</div></div>
        <div class="row"><div class="label">Heure</div><div class="inp">${dots(8)}</div></div>

        <div class="row"><div class="label">Prolongation (2)</div><div class="inp">${dots(18)}</div></div>
        <div class="row"><div class="label">Heure</div><div class="inp">${dots(8)}</div></div>
      </div>
    </div>

    <div class="band">SYNTHÈSE & CHECKLIST</div>
    <div class="grid-2">
      <div class="card">
        <div class="totals">
          <div class="row"><div class="label">Total</div><div class="inp">${money(view.prices?.total)}</div></div>
          <div class="row"><div class="label">Avance</div><div class="inp">${money(view.prices?.deposit)}</div></div>
          <div class="row"><div class="label">Reste</div><div class="inp">${money(reste)}</div></div>
          <div class="row"><div class="label">Franchise</div><div class="inp">${dots(12)}</div></div>
          <div class="row"><div class="label">Livré par</div><div class="inp">${dots(18)}</div></div>
          <div class="row"><div class="label">Intermédiaire</div><div class="inp">${dots(18)}</div></div>
          <div class="row"><div class="label">Durée</div><div class="inp">${duree}</div></div>
        </div>
      </div>

      <div class="checklist">
        <div class="check-title">État du Véhicule</div>
        <div class="fuelGrid">
          <div>
            <div style="font-weight:700;margin-bottom:2mm">AVANT CARBURANT</div>
            <div class="gauge"></div>
            <div class="glevel"><span>1/4</span><span>1/2</span><span>3/4</span></div>
          </div>
          <div class="sketch">Vue Haut / Côtés (schéma)</div>
          <div>
            <div style="font-weight:700;margin-bottom:2mm">APRÈS CARBURANT</div>
            <div class="gauge"></div>
            <div class="glevel"><span>1/4</span><span>1/2</span><span>3/4</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="signs">
      <div class="sign">Signature et cachet d'agent</div>
      <div class="sign">Signature du locataire</div>
      <div class="sign">Signature 2ème conducteur</div>
    </div>

    <div class="footer">
      Siège Social: ${f(orgAddress, 50)} • ${f(orgPhone, 14)}
    </div>

    <div class="wm">${orgName || ''}</div>
  </section>

  <!-- PAGE 2: Only Conditions générales -->
  <section class="page">
    <div class="cond-title">Conditions générales de location</div>
    ${CONDITIONS}
  </section>
</div>
</body>
</html>
  `;
}
