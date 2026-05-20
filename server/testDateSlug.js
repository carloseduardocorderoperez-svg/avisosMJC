function normalizeMonthName(s){
  if(!s) return s;
  const map={'á':'a','é':'e','í':'i','ó':'o','ú':'u','Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','ñ':'n','Ñ':'N'};
  return s.replace(/[áéíóúÁÉÍÓÚñÑ]/g,c=>map[c]||c).toLowerCase();
}

function dateToSlug(s){
  if(!s) return null;
  const t=String(s).trim();
  const isoMatch=t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(isoMatch) return `${isoMatch[3]}${normalizeMonthName((new Date(isoMatch[1], parseInt(isoMatch[2],10)-1, isoMatch[3])).toLocaleString('es-ES',{month:'long'}))}${isoMatch[1]}`;

  const dm=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if(dm){
    const day=String(parseInt(dm[1],10));
    const month=parseInt(dm[2],10)-1;
    const year=dm[3].length===2?2000+parseInt(dm[3],10):parseInt(dm[3],10);
    const monthName=normalizeMonthName(new Date(year, month,1).toLocaleString('es-ES',{month:'long'}));
    return `${day}${monthName}${year}`;
  }

  const textMatch=t.match(/(\d{1,2})\s*(?:de)?\s*([A-Za-záéíóúñÑ]+)\s*(?:de)?\s*(\d{2,4})?/i);
  if(textMatch){
    const day=String(parseInt(textMatch[1],10));
    const monthName=normalizeMonthName(textMatch[2]);
    const year=textMatch[3]? (textMatch[3].length===2?2000+parseInt(textMatch[3],10):parseInt(textMatch[3],10)):(new Date().getFullYear());
    return `${day}${monthName}${year}`;
  }

  return null;
}

const examples = [
  'martes 19 de mayo',
  '19/05/2026',
  '2026-05-19',
  '1 mayo 2026',
  '19 de mayo de 2026',
  '19 mayo',
];

examples.forEach(e => console.log(e, '->', dateToSlug(e)));
