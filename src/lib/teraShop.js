export function shopPrice(value){
 const amount=typeof value==='number'?value:typeof value==='string'&&value.trim()?Number(value):NaN;
 return Number.isFinite(amount)&&amount>0?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(amount):'Valor a consultar';
}
export function shopCatalog(rows){return Array.isArray(rows)?rows.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()&&p.available!==false&&p.in_stock!==false):[];}
export function shopCategories(rows){return [...new Set(rows.map(p=>p.category).filter(c=>typeof c==='string'&&c.trim()))].sort((a,b)=>a.localeCompare(b,'pt-BR'));}
export function shopFilter(rows,category,search){const term=search.trim().toLocaleLowerCase('pt-BR');return rows.filter(p=>(!category||p.category===category)&&(!term||[p.name,p.description].filter(v=>typeof v==='string').join(' ').toLocaleLowerCase('pt-BR').includes(term)));}
// The old placeholder telephone must never receive customer requests.
export function shopWhatsApp(number,product){
 const digits=String(number||'').replace(/\D/g,'');
 if(!/^[1-9][0-9]{7,14}$/.test(digits)||digits==='5567999999999')return null;
 const message=product?`Olá! Gostaria de comprar ${product.name} (${shopPrice(product.price)}) na TeraShop. Podem confirmar disponibilidade, pagamento e entrega?`:'Olá! Gostaria de saber mais sobre os produtos da TeraShop.';
 return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
