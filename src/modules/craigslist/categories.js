/**
 * Craigslist categories and subcategories
 */

export const categories = {
  community: {
    name: 'Community',
    code: 'ccc',
    subcategories: {
      activities: { name: 'Activities', code: 'act' },
      artists: { name: 'Artists', code: 'ats' },
      childcare: { name: 'Childcare', code: 'kid' },
      classes: { name: 'Classes', code: 'cls' },
      events: { name: 'Events', code: 'eve' },
      general: { name: 'General', code: 'com' },
      groups: { name: 'Groups', code: 'grp' },
      localNews: { name: 'Local News', code: 'vnn' },
      lostFound: { name: 'Lost & Found', code: 'laf' },
      musicians: { name: 'Musicians', code: 'muc' },
      pets: { name: 'Pets', code: 'pet' },
      politics: { name: 'Politics', code: 'pol' },
      rideshare: { name: 'Rideshare', code: 'rid' },
      volunteers: { name: 'Volunteers', code: 'vol' }
    }
  },
  housing: {
    name: 'Housing',
    code: 'hhh',
    subcategories: {
      apts: { name: 'Apartments / Housing', code: 'apa' },
      housingSwap: { name: 'Housing Swap', code: 'swp' },
      housingWanted: { name: 'Housing Wanted', code: 'hsw' },
      officeCommercial: { name: 'Office / Commercial', code: 'off' },
      parking: { name: 'Parking / Storage', code: 'prk' },
      realEstate: { name: 'Real Estate', code: 'rea' },
      rooms: { name: 'Rooms / Shared', code: 'roo' },
      roomWanted: { name: 'Room Wanted', code: 'sha' },
      sublets: { name: 'Sublets / Temporary', code: 'sub' },
      vacation: { name: 'Vacation Rentals', code: 'vac' }
    }
  },
  jobs: {
    name: 'Jobs',
    code: 'jjj',
    subcategories: {
      accounting: { name: 'Accounting/Finance', code: 'acc' },
      admin: { name: 'Admin / Office', code: 'ofc' },
      arch: { name: 'Architect / Engineer', code: 'egr' },
      art: { name: 'Art / Media / Design', code: 'med' },
      biotech: { name: 'Biotech / Science', code: 'sci' },
      business: { name: 'Business / Mgmt', code: 'bus' },
      customerService: { name: 'Customer Service', code: 'csr' },
      education: { name: 'Education', code: 'edu' },
      food: { name: 'Food / Bev / Hosp', code: 'fbh' },
      general: { name: 'General Labor', code: 'lab' },
      government: { name: 'Government', code: 'gov' },
      healthcare: { name: 'Healthcare', code: 'hea' },
      humanResources: { name: 'Human Resources', code: 'hum' },
      legal: { name: 'Legal / Paralegal', code: 'lgl' },
      manufacturing: { name: 'Manufacturing', code: 'mnu' },
      marketing: { name: 'Marketing / PR / Ad', code: 'mar' },
      nonprofit: { name: 'Nonprofit Sector', code: 'npo' },
      realEstate: { name: 'Real Estate', code: 'rej' },
      retail: { name: 'Retail / Wholesale', code: 'ret' },
      sales: { name: 'Sales / Biz Dev', code: 'sls' },
      salon: { name: 'Salon / Spa / Fitness', code: 'spa' },
      security: { name: 'Security', code: 'sec' },
      skilled: { name: 'Skilled Trade / Craft', code: 'trd' },
      software: { name: 'Software / QA / DBA', code: 'sof' },
      systems: { name: 'Systems / Network', code: 'sad' },
      technical: { name: 'Technical Support', code: 'tch' },
      transport: { name: 'Transport', code: 'trp' },
      tv: { name: 'TV / Film / Video', code: 'tfr' },
      web: { name: 'Web / Info Design', code: 'web' },
      writing: { name: 'Writing / Editing', code: 'wri' },
      etc: { name: 'Et cetera', code: 'etc' }
    }
  },
  services: {
    name: 'Services',
    code: 'bbb',
    subcategories: {
      automotive: { name: 'Automotive', code: 'ats' },
      beauty: { name: 'Beauty', code: 'bts' },
      cell: { name: 'Cell/Mobile', code: 'cms' },
      computer: { name: 'Computer', code: 'cps' },
      creative: { name: 'Creative', code: 'crs' },
      cycle: { name: 'Cycle', code: 'cys' },
      event: { name: 'Event', code: 'evs' },
      farm: { name: 'Farm+Garden', code: 'fgs' },
      financial: { name: 'Financial', code: 'fns' },
      health: { name: 'Health/Well', code: 'hws' },
      household: { name: 'Household', code: 'hss' },
      labor: { name: 'Labor/Move', code: 'lbs' },
      legal: { name: 'Legal', code: 'lgs' },
      lessons: { name: 'Lessons', code: 'lss' },
      marine: { name: 'Marine', code: 'mas' },
      pet: { name: 'Pet', code: 'pas' },
      real: { name: 'Real Estate', code: 'rts' },
      skilled: { name: 'Skilled Trade', code: 'sks' },
      smallBiz: { name: 'Sm Biz Ads', code: 'biz' },
      therapeutic: { name: 'Therapeutic', code: 'thp' },
      travel: { name: 'Travel/Vac', code: 'trv' },
      write: { name: 'Write/Ed/Tran', code: 'wet' }
    }
  },
  forSale: {
    name: 'For Sale',
    code: 'sss',
    subcategories: {
      antiques: { name: 'Antiques', code: 'ata' },
      appliances: { name: 'Appliances', code: 'ppa' },
      artsAndCrafts: { name: 'Arts & Crafts', code: 'ara' },
      autoparts: { name: 'Auto Parts', code: 'pta' },
      babyAndKid: { name: 'Baby & Kid', code: 'baa' },
      barter: { name: 'Barter', code: 'bar' },
      beauty: { name: 'Beauty & Health', code: 'haa' },
      bikes: { name: 'Bikes', code: 'bia' },
      boats: { name: 'Boats', code: 'boo' },
      books: { name: 'Books', code: 'bka' },
      business: { name: 'Business', code: 'bfa' },
      cars: { name: 'Cars & Trucks', code: 'cta' },
      cdsDvdsVhs: { name: 'CDs/DVDs/VHS', code: 'ema' },
      cellPhones: { name: 'Cell Phones', code: 'moa' },
      clothes: { name: 'Clothes & Acc', code: 'cla' },
      collectibles: { name: 'Collectibles', code: 'cba' },
      computers: { name: 'Computers', code: 'sya' },
      electronics: { name: 'Electronics', code: 'ela' },
      farm: { name: 'Farm & Garden', code: 'gra' },
      free: { name: 'Free', code: 'zip' },
      furniture: { name: 'Furniture', code: 'fua' },
      garage: { name: 'Garage Sale', code: 'gms' },
      general: { name: 'General', code: 'foa' },
      heavy: { name: 'Heavy Equipment', code: 'hva' },
      household: { name: 'Household', code: 'hsa' },
      jewelry: { name: 'Jewelry', code: 'jwa' },
      materials: { name: 'Materials', code: 'maa' },
      motorcycles: { name: 'Motorcycles', code: 'mca' },
      music: { name: 'Musical Instruments', code: 'msa' },
      photo: { name: 'Photo & Video', code: 'pha' },
      rvs: { name: 'RVs', code: 'rva' },
      sporting: { name: 'Sporting', code: 'sga' },
      tickets: { name: 'Tickets', code: 'tia' },
      tools: { name: 'Tools', code: 'tla' },
      toys: { name: 'Toys & Games', code: 'taa' },
      trailers: { name: 'Trailers', code: 'tra' },
      videoGaming: { name: 'Video Gaming', code: 'vga' },
      wanted: { name: 'Wanted', code: 'waa' }
    }
  },
  discussion: {
    name: 'Discussion Forums',
    code: 'fff',
    subcategories: {
      apple: { name: 'Apple', code: 'app' },
      arts: { name: 'Arts', code: 'art' },
      atheist: { name: 'Atheist', code: 'ath' },
      autos: { name: 'Autos', code: 'aut' },
      beauty: { name: 'Beauty', code: 'bea' },
      bikes: { name: 'Bikes', code: 'bik' },
      celebs: { name: 'Celebs', code: 'cel' },
      comp: { name: 'Computer', code: 'com' },
      cosmos: { name: 'Cosmos', code: 'cos' },
      diet: { name: 'Diet', code: 'die' },
      divorce: { name: 'Divorce', code: 'div' },
      dying: { name: 'Dying', code: 'dyi' },
      eco: { name: 'Eco', code: 'eco' },
      feedback: { name: 'Feedback', code: 'fee' },
      film: { name: 'Film', code: 'fil' },
      fixit: { name: 'Fixit', code: 'fix' },
      food: { name: 'Food', code: 'foo' },
      frugal: { name: 'Frugal', code: 'fru' },
      gaming: { name: 'Gaming', code: 'gam' },
      garden: { name: 'Garden', code: 'gar' },
      haiku: { name: 'Haiku', code: 'hai' },
      health: { name: 'Health', code: 'hea' },
      help: { name: 'Help', code: 'hel' },
      history: { name: 'History', code: 'his' },
      housing: { name: 'Housing', code: 'hou' },
      jobs: { name: 'Jobs', code: 'job' },
      jokes: { name: 'Jokes', code: 'jok' },
      legal: { name: 'Legal', code: 'leg' },
      linux: { name: 'Linux', code: 'lin' },
      manners: { name: 'Manners', code: 'man' },
      marriage: { name: 'Marriage', code: 'mar' },
      money: { name: 'Money', code: 'mon' },
      music: { name: 'Music', code: 'mus' },
      open: { name: 'Open', code: 'ope' },
      outdoor: { name: 'Outdoor', code: 'out' },
      parent: { name: 'Parent', code: 'par' },
      pets: { name: 'Pets', code: 'pet' },
      philos: { name: 'Philos', code: 'phi' },
      photo: { name: 'Photo', code: 'pho' },
      politics: { name: 'Politics', code: 'pol' },
      psych: { name: 'Psychology', code: 'psy' },
      recover: { name: 'Recover', code: 'rec' },
      religion: { name: 'Religion', code: 'rel' },
      rofo: { name: 'ROFO', code: 'rof' },
      science: { name: 'Science', code: 'sci' },
      spirit: { name: 'Spirit', code: 'spi' },
      sports: { name: 'Sports', code: 'spo' },
      super: { name: 'Super', code: 'sup' },
      tax: { name: 'Tax', code: 'tax' },
      travel: { name: 'Travel', code: 'tra' },
      tv: { name: 'TV', code: 'tel' },
      vegan: { name: 'Vegan', code: 'veg' },
      words: { name: 'Words', code: 'wor' },
      writing: { name: 'Writing', code: 'wri' }
    }
  },
  gigs: {
    name: 'Gigs',
    code: 'ggg',
    subcategories: {
      computer: { name: 'Computer', code: 'cpg' },
      creative: { name: 'Creative', code: 'crg' },
      crew: { name: 'Crew', code: 'cwg' },
      domestic: { name: 'Domestic', code: 'dmg' },
      event: { name: 'Event', code: 'evg' },
      labor: { name: 'Labor', code: 'lbg' },
      talent: { name: 'Talent', code: 'tlg' },
      writing: { name: 'Writing', code: 'wrg' }
    }
  },
  resumes: {
    name: 'Resumes',
    code: 'rrr',
    subcategories: {}
  }
};

// Flat list of all categories with their codes
export const allCategories = Object.entries(categories).reduce((acc, [key, category]) => {
  // Add main category
  acc[key] = { name: category.name, code: category.code };
  
  // Add all subcategories
  Object.entries(category.subcategories).forEach(([subKey, subCategory]) => {
    acc[`${key}_${subKey}`] = { name: `${category.name} - ${subCategory.name}`, code: subCategory.code };
  });
  
  return acc;
}, {});

export default categories;