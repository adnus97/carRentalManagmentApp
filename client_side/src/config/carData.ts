// carData.ts - Car makes and models database

export interface CarMake {
  icon: string;
  models: string[];
}

export const carMakesAndModels: Record<string, CarMake> = {
  ABARTH: {
    icon: 'abarth.png',
    models: ['500', '595', '695'],
  },
  'ALFA-ROMEO': {
    icon: 'alfaRomeo.png',
    models: ['Giulia', 'Stelvio', 'Tonale', 'Giulietta', '4C', 'MITO'],
  },
  ALPINE: {
    icon: 'alpine.png',
    models: ['A110'],
  },
  'ASTON-MARTIN': {
    icon: 'AstonMartin.png',
    models: ['DB11', 'DBX', 'Vantage', 'DBS'],
  },
  AUDI: {
    icon: 'audi.png',
    models: [
      'A1',
      'A3',
      'A4',
      'A5',
      'A6',
      'A7',
      'A8',
      'Q3',
      'Q5',
      'Q7',
      'Q8',
      'RS3',
      'TT',
    ],
  },
  BAIC: {
    icon: 'baic.png',
    models: ['U5 PLUS', 'X7', 'X35', 'X55'],
  },
  BENTLEY: {
    icon: 'bently.png',
    models: ['Bentayga', 'Continental', 'Flying Spur', 'Mulsanne'],
  },
  BMW: {
    icon: 'bmw.png',
    models: [
      '1 Series',
      '2 Series',
      '3 Series',
      '4 Series',
      '5 Series',
      '7 Series',
      'X1',
      'X2',
      'X3',
      'X5',
      'X7',
      'XM',
      'Z4',
    ],
  },
  BYD: {
    icon: 'byd.png',
    models: [
      'Atto 3',
      'Han',
      'Tang',
      'Seal',
      'Seagull',
      'Sealion 7',
      ' SEAL U',
      'T3',
    ],
  },
  CHANGAN: {
    icon: 'changan.png',
    models: ['CS35', 'CS55', 'Alsfin', 'Uni-k'],
  },
  CHERY: {
    icon: 'cherry.png',
    models: ['EQ1', 'Tiggo 2 Pro', 'Tiggo 4 Pro', 'Tiggo 7 Pro', 'Tiggo 8 Pro'],
  },
  CHEVROLET: {
    icon: 'chevy.png',
    models: ['CAPTIVA', 'CRUZE', 'ORLANDO', 'SPARK', 'TRAX'],
  },
  CITROEN: {
    icon: 'citroen.png',
    models: [
      'AMI',
      'BERLINGO',
      'C-ELYSEE',
      'C1',
      'C3',
      'C4',
      'C4 XC5',
      'JUMPER',
      'JUMPY',
      'NEMO',
      'SPACETOURER',
    ],
  },
  CUPRA: {
    icon: 'cupra.png',
    models: ['Formentor', 'Leon', 'Ateca', 'TERRAMAR'],
  },
  DACIA: {
    icon: 'dacia.png',
    models: [
      'Bigster',
      'Dokker',
      'Duster',
      'Jogger',
      'Lodgy',
      'Logan',
      'Sandero',
      'Spring',
    ],
  },
  DEEPAL: {
    icon: 'deepal.png',
    models: ['S05', 'S07'],
  },
  DFSK: {
    icon: 'dfsk.png',
    models: [
      'C31',
      'C35',
      'E5',
      'GLORY 500',
      'GLORY 580',
      'GLORY IX5',
      'K01H',
      'K01L',
      'K01S',
      'K05',
      'SUPER CAB',
    ],
  },
  DONGFENG: {
    icon: 'dongfeng.png',
    models: ['BOX', 'HUGE', 'MAGE', 'SHINE', 'SHINE MAX'],
  },
  DS: {
    icon: 'DS.png',
    models: ['DS3', 'DS4', 'DS7'],
  },
  FERRARI: {
    icon: 'ferrari.png',
    models: [
      '488',
      '812 SUPERFAST',
      '296 F8 SPIDER',
      'F8 TRIBUTO',
      'GTC4LUSSO',
    ],
  },
  FIAT: {
    icon: 'fiat.png',
    models: [
      '500',
      '500C',
      '500L',
      '500X',
      '600',
      '600E',
      'Doblo',
      'Fiorino',
      'Fullback',
      'Punto',
      'Talento',
      'Tipo',
      'Tipo hatchback',
      'Topolino',
    ],
  },
  FORD: {
    icon: 'ford.png',
    models: [
      'C-MAX',
      'CHâSSIS CABINE',
      'ECOSPORT',
      'EXPLORER',
      'F-250',
      'FIESTA',
      'FOCUS',
      'FUSION',
      'KA',
      'KUGA',
      'MUSTANG',
      'RANGER',
      'TERRITORY',
      'TOURNEO CONNECT',
      'TRANSIT',
    ],
  },
  FOTON: {
    icon: 'foton.png',
    models: ['TM'],
  },
  GAZ: {
    icon: 'gaz.png',
    models: ['NEXT'],
  },
  GEELY: {
    icon: 'geely.png',
    models: ['Cityray', 'Coolray', 'Emgrand', 'EX5', 'Geometry CGX3 Pro'],
  },
  GWM: {
    icon: 'gwm.png',
    models: [
      'HAVAL H6',
      'HAVAL JOLION',
      'ORA 03',
      'POER',
      'TANK 300',
      'TANK 500',
      'WEY 03',
      'WEY 05',
    ],
  },
  HONDA: {
    icon: 'honda.png',
    models: ['ACCORD', 'CIVIC', 'CR-V', 'HR-V', 'JAZZ'],
  },
  HYUNDAI: {
    icon: 'hyundai.png',
    models: [
      'ACCENT',
      'BAYON',
      'CRETA',
      'ELANTRA',
      'H350',
      'I10',
      'I20',
      'I30',
      'I40',
      'IONIQ',
      'IONIQ 5',
      'IONIQ 6',
      'KONA',
      'SANTA FE',
      'SONATA',
      'STARIA',
      'TUCSON',
    ],
  },
  ISUZU: {
    icon: 'isuzu.png',
    models: ['D-Max'],
  },
  JAC: {
    icon: 'jac.png',
    models: ['E30X'],
  },
  JAECOO: {
    icon: 'jeacoo.png',
    models: ['J7'],
  },
  JAGUAR: {
    icon: 'jaguare.png',
    models: ['E-PACE', 'F-PACE', 'I-PACE', 'I-PACE', 'XE', 'XF', 'XJ'],
  },
  JEEP: {
    icon: 'jeep.png',
    models: [
      'AVENGER',
      'CHEROKEE',
      'COMPASS',
      'GRAND CHEROKEE',
      'RENEGADE',
      'WRANGLER',
    ],
  },
  JETOUR: {
    icon: 'jetour.png',
    models: ['T2'],
  },
  KIA: {
    icon: 'kia.png',
    models: [
      'CARENS',
      'CARNIVAL',
      'CEED',
      'CERATO',
      'EV3',
      'EV5',
      'EV6',
      'EV9',
      'K2500',
      'K5',
      'NIRO',
      'OPTIMA',
      'PICANTO',
      'PV5',
      'RIO',
      'SELTOS',
      'SONET',
      'SORENTO',
      'SOUL',
      'SPORTAGE',
      'STINGER',
    ],
  },
  'LAND-ROVER': {
    icon: 'landRover.png',
    models: [
      'DEFENDER',
      'DISCOVERY',
      'RANGE ROVER',
      'RANGE ROVER EVOQUE',
      'RANGE ROVER SPORT',
      'RANGE ROVER VELAR',
      'RANGE ROVER VOGUE',
    ],
  },
  LEAPMOTOR: {
    icon: 'leapMotors.png',
    models: ['C10', 'T03'],
  },
  LEXUS: {
    icon: 'lexus.png',
    models: ['ES', 'IS', 'LX', 'NX', 'RX 350H', 'UX'],
  },
  'LYNK-CO': {
    icon: 'lynkco.png',
    models: ['01', '02', '06', '08'],
  },
  MAHINDRA: {
    icon: 'mahindra.png',
    models: ['KUV 100', 'SCORPIO', 'XUV 300', 'XUV 500'],
  },
  MASERATI: {
    icon: 'mazerati.png',
    models: [
      'GHIBLI',
      'GRANCABRIO',
      'GRANTURISMO',
      'GRECALE',
      'LEVANTE',
      'MC20',
      'QUATTROPORTE',
    ],
  },
  MAZDA: {
    icon: 'mazda.png',
    models: ['CX-3', 'CX-5', '6'],
  },
  'MERCEDES-BENZ': {
    icon: 'mercedes.png',
    models: [
      'CLASSE A',
      'CLASSE B',
      'CLASSE C',
      'CLASSE CLA',
      'CLASSE CLS',
      'CLASSE E',
      'CLASSE G',
      'CLASSE GLA',
      'CLASSE GLC',
      'CLASSE GLE',
      'CLASSE GLS',
      'CLASSE S',
      'CLASSE SLC',
      'EQB',
      'EQA',
      'EQS',
      'EQE',
      'VITO',
    ],
  },
  MG: {
    icon: 'mg.png',
    models: ['HS', 'Marvel R', 'MG 3', 'MG4', 'MG5', 'ZS'],
  },
  MINI: {
    icon: 'mini.png',
    models: ['ACEMAN', 'CABRIO', 'CLUBMAN', 'COOPER', 'COUNTRYMAN', 'HATCH'],
  },
  MITSUBISHI: {
    icon: 'mitsubichi.png',
    models: ['L200', 'OUTLANDER', 'PAJERO'],
  },
  'NEO-MOTORS': {
    icon: 'neoMotors.png',
    models: ['BVM'],
  },
  NISSAN: {
    icon: 'nissan.png',
    models: [
      'EVALIA',
      'JUKE',
      'MAGNITE',
      'MICRA',
      'NAVARA',
      'NOTE',
      'QASHQAI',
      'X-TRAIL',
    ],
  },
  OMODA: {
    icon: 'omoda.png',
    models: ['3', 'C5', 'E5'],
  },
  OPEL: {
    icon: 'opel.png',
    models: [
      'ADAM',
      'ASTRA',
      'COMBO',
      'CORSA',
      'CROSSLAND',
      'FRONTERA',
      'GRANDLAND',
      'INSIGNIA',
      'MOKKA',
      'MOVANO',
      'ROCKS-E',
      'VIVARO',
    ],
  },
  PEUGEOT: {
    icon: 'peugeot.png',
    models: [
      '108',
      '2008',
      '208',
      '3008',
      '308',
      '4008',
      '408',
      '5008',
      '508',
      'BIPPER',
      'BOXER',
      'EXPERT',
      'LANDTREK',
      'PARTNER',
      'PICK UP',
      'RCZ',
      'RIFTER',
      'TRAVELLER',
    ],
  },
  PORSCHE: {
    icon: 'porsche.png',
    models: [
      '718 BOXSTER',
      '718 CAYMAN',
      '911',
      'BOXSTER',
      'CAYENNE',
      'CAYMAN',
      'MACAN',
      'PANAMERA',
      'TAYCAN',
    ],
  },
  RENAULT: {
    icon: 'renault.png',
    models: [
      'ARKANA',
      'AUSTRAL',
      'CAPTUR',
      'CLIO',
      'EXPRESS',
      'FLUENCE',
      'KADJAR',
      'KANGOO',
      'KARDIAN',
      'KOLEOS',
      'MASTER',
      'MEGANE',
      'TALISMAN',
      'TRAFIC',
    ],
  },
  SEAT: {
    icon: 'seat.png',
    models: ['ALTEA', 'ARONA', 'ATECA', 'IBIZA', 'LEON', 'MII', 'TARRACO'],
  },
  SERES: {
    icon: 'seres.png',
    models: ['3', '5'],
  },
  SKODA: {
    icon: 'skoda.png',
    models: [
      'FABIA',
      'KAMIQ',
      'KAROQ',
      'KODIAQ',
      'OCTAVIA',
      'RAPID',
      'SCALA',
      'SUPERB',
      'YETI',
    ],
  },
  SOUEAST: {
    icon: 'soueast.png',
    models: ['S06', 'S07', 'S09'],
  },
  SSANGYONG: {
    icon: 'ssangyong.png',
    models: ['KORANDO', 'REXTON', 'STAVIC', 'TIVOLI', 'XLV'],
  },
  SUZUKI: {
    icon: 'suzuki.png',
    models: [
      'BALENO',
      'GRAND VITARA',
      'IGNIS',
      'JIMNY',
      'S-CROSS',
      'SWIFT',
      'VITARA',
    ],
  },
  TATA: {
    icon: 'tata.png',
    models: ['SUPER ACE', 'XENON'],
  },
  TOYOTA: {
    icon: 'toyota.png',
    models: [
      'AURIS',
      'AVENSIS',
      'C-HR',
      'COROLLA',
      'COROLLA X SUV',
      'FORTUNER',
      'HILUX',
      'LAND CRUISER',
      'PRIUS',
      'RAV-4',
      'YARIS',
    ],
  },
  VOLKSWAGEN: {
    icon: 'volkswagen.png',
    models: [
      'AMAROK',
      'ARTEON',
      'CADDY',
      'CARAVELLE',
      'COCCINELLE',
      'CRAFTER',
      'GOLF 8',
      'JETTA',
      'PASSAT',
      'POLO',
      'T-CROSS',
      'T-ROC',
      'TAIGO',
      'TIGUAN',
      'TOUAREG',
      'TOURAN',
      'TRANSPORTER',
    ],
  },
  VOLVO: {
    icon: 'volvo.png',
    models: ['C40', 'EX30', 'S60', 'S90', 'V40', 'V90', 'XC40', 'XC60', 'XC90'],
  },
  XPENG: {
    icon: 'xpeng.png',
    models: ['G6', 'G9'],
  },
  ZEEKR: {
    icon: 'zeekr.png',
    models: ['001', 'X'],
  },
};

// Helper function to get the logo path for a car make
export const getCarLogoPath = (make: string): string => {
  const carMake = carMakesAndModels[make];
  if (carMake && carMake.icon) {
    return `/carLogos/${carMake.icon}`;
  }
  // Fallback
  return `/carLogos/${make.toLowerCase()}.png`;
};

// Get all car makes as an array
export const getAllCarMakes = (): string[] => {
  return Object.keys(carMakesAndModels);
};

// Get models for a specific make
export const getModelsForMake = (make: string): string[] => {
  const carMake = carMakesAndModels[make];
  return carMake ? carMake.models : [];
};
