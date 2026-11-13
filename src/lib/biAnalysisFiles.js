export const BI_FILE_LIMIT=4*1024*1024;
export const BI_FILE_TYPES={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',csv:'text/csv',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pbix:'application/octet-stream'};
export function biFileType(name){return typeof name==='string'?BI_FILE_TYPES[name.split('.').pop()?.toLowerCase()]:undefined;}
export function validateBiFile(file){
 const type=biFileType(file?.name);
 if(!type)throw Error('Use PDF, PNG, JPG, WebP, CSV, XLSX ou PBIX.');
 if(!file.size||file.size>BI_FILE_LIMIT)throw Error('Selecione um arquivo de até 4 MB. Para arquivos maiores, exporte uma versão reduzida em PDF, imagem ou CSV.');
 return type;
}
