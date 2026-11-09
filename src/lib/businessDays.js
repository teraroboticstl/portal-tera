const DAY=86400000;
export const REGIONAL_TIME_ZONE='America/Campo_Grande';

function civilDay(value,timeZone) {
  if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year,month,day]=value.split('-').map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?date.getTime()/DAY:NaN;
  }
  const date=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(date.getTime()))return NaN;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=type=>Number(parts.find(p=>p.type===type).value);
  return Date.UTC(get('year'),get('month')-1,get('day'))/DAY;
}
const weekday=day=>new Date(day*DAY).getUTCDay();
const working=day=>weekday(day)!==0&&weekday(day)!==6;

// Available preparation days: include today if eligible; exclude event day.
// Calendar dates are evaluated in Três Lagoas, independent of the viewer's zone.
export function remainingBusinessDays(targetDate,{now=new Date(),timeZone=REGIONAL_TIME_ZONE,excludedDates=[]}={}) {
  const start=civilDay(now,timeZone),end=civilDay(targetDate,timeZone);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 0;
  const weeks=Math.floor((end-start)/7);
  let count=weeks*5;
  for(let day=start+weeks*7;day<end;day++)if(working(day))count++;
  const excluded=new Set(excludedDates.filter(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)).map(d=>civilDay(d,timeZone)));
  for(const day of excluded)if(day>=start&&day<end&&working(day))count--;
  return count;
}
