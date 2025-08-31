import type { Station, Track } from '@/types';

export const stations: Station[] = [
  // Mainline: Delhi area
  { id: 'NDLS', name: 'New Delhi', position: { x: 350, y: 400 } },
  { id: 'DLI', name: 'Old Delhi', position: { x: 380, y: 370 } },
  { id: 'GZB', name: 'Ghaziabad', position: { x: 450, y: 380 } },
  { id: 'PWL', name: 'Palwal', position: { x: 380, y: 500 } },

  // Mainline: Delhi -> Prayagraj
  { id: 'ALJN', name: 'Aligarh', position: { x: 550, y: 420 } },
  { id: 'TDL', name: 'Tundla', position: { x: 680, y: 480 } },
  { id: 'ETW', name: 'Etawah', position: { x: 830, y: 500 } },
  { id: 'CNB', name: 'Kanpur Central', position: { x: 1000, y: 520 } },

  // Agra Loop from Tundla
  { id: 'AGC', name: 'Agra Cantt', position: { x: 650, y: 550 } },
  { id: 'MTJ', name: 'Mathura', position: { x: 550, y: 530 } },

  // Ghaziabad -> North line
  { id: 'MTC', name: 'Meerut City', position: { x: 480, y: 300 } },
  { id: 'MOZ', name: 'Muzaffarnagar', position: { x: 510, y: 220 } },
  { id: 'SRE', name: 'Saharanpur', position: { x: 550, y: 150 } },

  // Aligarh -> Bareilly line
  { id: 'CH', name: 'Chandausi', position: { x: 650, y: 350 } },
  { id: 'BE', name: 'Bareilly', position: { x: 780, y: 320 } },
  
  // Delhi -> Rohtak line
  { id: 'ROK', name: 'Rohtak', position: { x: 250, y: 350 } },
  { id: 'JIND', name: 'Jind', position: { x: 150, y: 320 } },

  // ***** NEW COMPLEX SECTION: Kanpur & Prayagraj (Spaced out) *****

  // Kanpur Area Complexity
  { id: 'PNKD', name: 'Panki Dham', position: { x: 940, y: 600 } },
  { id: 'BZM', name: 'Bhimsen', position: { x: 900, y: 640 } },
  { id: 'GOY', name: 'Govindpuri', position: { x: 980, y: 480 } },

  // Kanpur -> Lucknow Line
  { id: 'ON', name: 'Unnao', position: { x: 1080, y: 480 } },
  { id: 'LKO', name: 'Lucknow', position: { x: 1180, y: 450 } },

  // Mainline continuation from Kanpur
  { id: 'FTP', name: 'Fatehpur', position: { x: 1150, y: 560 } },

  // Prayagraj Area Complexity
  { id: 'SFG', name: 'Subedarganj', position: { x: 1300, y: 570 } },
  { id: 'PRYJ', name: 'Prayagraj Jn', position: { x: 1350, y: 580 } },
  { id: 'NYN', name: 'Naini', position: { x: 1380, y: 620 } },
  { id: 'PCOI', name: 'Prayagraj Chheoki', position: { x: 1420, y: 650 } },

  // Prayagraj -> Varanasi Line
  { id: 'PRG', name: 'Prayag Jn', position: { x: 1380, y: 550 } },
  { id: 'JNH', name: 'Janghai Jn', position: { x: 1480, y: 530 } },
  { id: 'BSB', name: 'Varanasi', position: { x: 1580, y: 510 } },
];

const offsetPoints = (points: {x:number, y:number}[], dx: number, dy: number) => points.map(p => ({ x: p.x + dx, y: p.y + dy }));

const getStationPos = (id: string): { x: number; y: number } => {
  const station = stations.find(s => s.id === id);
  if (!station) {
    throw new Error(`Station with ID "${id}" not found.`);
  }
  return station.position;
};

export const tracks: Track[] = [
  // T1: Mainline Delhi <-> Kanpur (double track)
  { id: 'T1-A', points: [getStationPos('NDLS'), getStationPos('GZB'), getStationPos('ALJN'), getStationPos('TDL'), getStationPos('ETW'), getStationPos('GOY'), getStationPos('CNB')] },
  { id: 'T1-B', points: offsetPoints([getStationPos('NDLS'), getStationPos('GZB'), getStationPos('ALJN'), getStationPos('TDL'), getStationPos('ETW'), getStationPos('GOY'), getStationPos('CNB')], 0, 8) },

  // T2: Agra Loop (double track)
  { id: 'T2-A', points: [getStationPos('PWL'), getStationPos('MTJ'), getStationPos('AGC'), getStationPos('TDL')] },
  { id: 'T2-B', points: offsetPoints([getStationPos('PWL'), getStationPos('MTJ'), getStationPos('AGC'), getStationPos('TDL')], 8, 0) },
  
  // T3: Delhi -> Palwal (double track)
  { id: 'T3-A', points: [getStationPos('NDLS'), getStationPos('PWL')] },
  { id: 'T3-B', points: offsetPoints([getStationPos('NDLS'), getStationPos('PWL')], 8, 0) },

  // T4: Ghaziabad -> Saharanpur (double track)
  { id: 'T4-A', points: [getStationPos('GZB'), getStationPos('MTC'), getStationPos('MOZ'), getStationPos('SRE')] },
  { id: 'T4-B', points: offsetPoints([getStationPos('GZB'), getStationPos('MTC'), getStationPos('MOZ'), getStationPos('SRE')], 8, 0) },

  // T5: Aligarh -> Bareilly (double track)
  { id: 'T5-A', points: [getStationPos('ALJN'), getStationPos('CH'), getStationPos('BE')] },
  { id: 'T5-B', points: offsetPoints([getStationPos('ALJN'), getStationPos('CH'), getStationPos('BE')], 0, 8) },

  // T6: Old Delhi Connection
  { id: 'T6-A', points: [getStationPos('DLI'), getStationPos('GZB')] },
  { id: 'T6-B', points: offsetPoints([getStationPos('DLI'), getStationPos('GZB')], 0, 8) },

  // T7: Delhi -> Rohtak (double track)
  { id: 'T7-A', points: [getStationPos('DLI'), getStationPos('ROK'), getStationPos('JIND')] },
  { id: 'T7-B', points: offsetPoints([getStationPos('DLI'), getStationPos('ROK'), getStationPos('JIND')], 0, 8) },

  // ***** NEW COMPLEX TRACKS *****

  // T8: Kanpur Loop/Bypass (double track)
  { id: 'T8-A', points: [getStationPos('ETW'), getStationPos('BZM'), getStationPos('PNKD'), getStationPos('FTP')] },
  { id: 'T8-B', points: offsetPoints([getStationPos('ETW'), getStationPos('BZM'), getStationPos('PNKD'), getStationPos('FTP')], 0, 8) },
  { id: 'T8-C', points: [getStationPos('GOY'), getStationPos('BZM')] }, // Connecting Govindpuri to loop
  { id: 'T8-D', points: offsetPoints([getStationPos('GOY'), getStationPos('BZM')], 0, 8) },


  // T9: Kanpur -> Lucknow (double track)
  { id: 'T9-A', points: [getStationPos('CNB'), getStationPos('ON'), getStationPos('LKO')] },
  { id: 'T9-B', points: offsetPoints([getStationPos('CNB'), getStationPos('ON'), getStationPos('LKO')], 8, 0) },

  // T10: Mainline Kanpur -> Prayagraj (double track)
  { id: 'T10-A', points: [getStationPos('CNB'), getStationPos('FTP'), getStationPos('SFG'), getStationPos('PRYJ')] },
  { id: 'T10-B', points: offsetPoints([getStationPos('CNB'), getStationPos('FTP'), getStationPos('SFG'), getStationPos('PRYJ')], 0, 8) },

  // T11: Prayagraj Area Connections (double track)
  { id: 'T11-A', points: [getStationPos('SFG'), getStationPos('NYN'), getStationPos('PCOI')] },
  { id: 'T11-B', points: offsetPoints([getStationPos('SFG'), getStationPos('NYN'), getStationPos('PCOI')], 8, 0) },
  { id: 'T11-C', points: [getStationPos('PRYJ'), getStationPos('NYN')] },
  { id: 'T11-D', points: offsetPoints([getStationPos('PRYJ'), getStationPos('NYN')], 8, 0) },

  // T12: Prayagraj -> Varanasi (double track)
  { id: 'T12-A', points: [getStationPos('PRYJ'), getStationPos('PRG'), getStationPos('JNH'), getStationPos('BSB')] },
  { id: 'T12-B', points: offsetPoints([getStationPos('PRYJ'), getStationPos('PRG'), getStationPos('JNH'), getStationPos('BSB')], 0, 8) },
  
  // T13: Dedicated Freight Corridor (DFC) - Partial, parallel tracks
  { id: 'T13-A-DFC', points: offsetPoints([getStationPos('TDL'), getStationPos('ETW'), getStationPos('GOY')], 0, -16) }, // Offset from main line
  { id: 'T13-B-DFC', points: offsetPoints([getStationPos('TDL'), getStationPos('ETW'), getStationPos('GOY')], 0, -8) },
];
